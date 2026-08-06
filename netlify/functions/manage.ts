import type { Handler } from '@netlify/functions';
import { DateTime } from 'luxon';
import { calendarEmail, graphFetch, sendMail } from './_shared/graph';
import { getAvailableSlots } from './_shared/availability';
import { findManagedEvent } from './_shared/manage';
import { loadConfig } from './_shared/storage';

const esc=(value:string)=>value.replace(/[&<>"']/g,(c)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]!));
function runtimeDb(event:any){return {url:event.headers['x-bookingcal-db-url']||event.headers['X-Bookingcal-Db-Url'],anonKey:event.headers['x-bookingcal-db-key']||event.headers['X-Bookingcal-Db-Key']}}
function meetingShape(found:any){const {event,meta}=found;const start=DateTime.fromISO(event.start.dateTime,{zone:event.start.timeZone||'UTC'}).toUTC();const end=DateTime.fromISO(event.end.dateTime,{zone:event.end.timeZone||'UTC'}).toUTC();return {token:meta.manageToken,eventId:event.id,slug:meta.templateSlug,name:meta.customerName,email:meta.customerEmail,purpose:meta.purpose,meetingMethod:meta.meetingMethod,startUtc:start.toISO()!,endUtc:end.toISO()!,duration:meta.duration||Math.round(end.diff(start,'minutes').minutes),viewerTimezone:meta.viewerTimezone||'UTC',cancelled:Boolean(event.isCancelled)}}
function prettyDate(iso:string,timeZone:string){return new Intl.DateTimeFormat('en',{timeZone,weekday:'long',year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit',timeZoneName:'short'}).format(new Date(iso))}

export const handler:Handler=async(event)=>{
  try{
    if(event.httpMethod==='GET'){
      const token=event.queryStringParameters?.token||'';
      const found=await findManagedEvent(token);
      if(!found)return {statusCode:404,headers:{'Content-Type':'application/json'},body:JSON.stringify({error:'This booking link is invalid or expired.'})};
      return {statusCode:200,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify(meetingShape(found))};
    }
    if(event.httpMethod!=='POST')return {statusCode:405,headers:{'Content-Type':'application/json'},body:JSON.stringify({error:'Method not allowed'})};
    const body=JSON.parse(event.body||'{}') as {action?:string;token?:string;startUtc?:string};
    const found=await findManagedEvent(String(body.token||''));
    if(!found)return {statusCode:404,headers:{'Content-Type':'application/json'},body:JSON.stringify({error:'This booking link is invalid or expired.'})};
    const {event:calendarEvent,meta}=found;
    if(calendarEvent.isCancelled)return {statusCode:409,headers:{'Content-Type':'application/json'},body:JSON.stringify({error:'This meeting has already been cancelled.'})};

    if(body.action==='cancel'){
      await graphFetch(`/users/${encodeURIComponent(calendarEmail())}/events/${encodeURIComponent(calendarEvent.id)}`,{method:'DELETE'});
      await sendMail(meta.customerEmail,'Cancelled: your meeting with Niki',`<p>Hi ${esc(meta.customerName)},</p><p>Your meeting with Niki has been cancelled.</p><p>If you would like to find another time, you can use the original booking link again.</p>`);
      return {statusCode:200,headers:{'Content-Type':'application/json'},body:JSON.stringify({ok:true})};
    }

    if(body.action==='reschedule'){
      const config=await loadConfig(runtimeDb(event));
      const template=config.templates.find(t=>t.slug===meta.templateSlug&&t.active);
      if(!template)return {statusCode:404,headers:{'Content-Type':'application/json'},body:JSON.stringify({error:'The original booking link is no longer active.'})};
      const duration=meta.duration||Math.round(DateTime.fromISO(calendarEvent.end.dateTime).diff(DateTime.fromISO(calendarEvent.start.dateTime),'minutes').minutes);
      const slots=await getAvailableSlots(config,template,duration);
      const selected=slots.find(s=>Math.abs(DateTime.fromISO(s.startUtc).toMillis()-DateTime.fromISO(String(body.startUtc||'')).toMillis())<1000);
      if(!selected)return {statusCode:409,headers:{'Content-Type':'application/json'},body:JSON.stringify({error:'That time is no longer available. Please choose another.'})};
      const start=DateTime.fromISO(selected.startUtc).toUTC();
      const end=start.plus({minutes:duration});
      const updated=await graphFetch<any>(`/users/${encodeURIComponent(calendarEmail())}/events/${encodeURIComponent(calendarEvent.id)}`,{method:'PATCH',body:JSON.stringify({start:{dateTime:start.toISO({suppressMilliseconds:true}),timeZone:'UTC'},end:{dateTime:end.toISO({suppressMilliseconds:true}),timeZone:'UTC'},categories:(calendarEvent.categories||[]).filter((c:string)=>!c.startsWith('BookingCal:'))})});
      const when=prettyDate(selected.startUtc,meta.viewerTimezone||'UTC');
      await sendMail(meta.customerEmail,'Updated: your meeting with Niki',`<p>Hi ${esc(meta.customerName)},</p><p>Your meeting with Niki has been rescheduled.</p><p><strong>${esc(when)}</strong><br>${duration} minutes</p><p>Your calendar invitation has been updated as well.</p>`);
      return {statusCode:200,headers:{'Content-Type':'application/json'},body:JSON.stringify({ok:true,meeting:meetingShape({event:updated,meta})})};
    }
    return {statusCode:400,headers:{'Content-Type':'application/json'},body:JSON.stringify({error:'Unknown action'})};
  }catch(e){return {statusCode:500,headers:{'Content-Type':'application/json'},body:JSON.stringify({error:e instanceof Error?e.message:'Could not manage booking'})};}
};
