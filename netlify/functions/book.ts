import type { Handler } from '@netlify/functions';
import { DateTime } from 'luxon';
import { randomUUID } from 'node:crypto';
import { getAvailableSlots } from './_shared/availability';
import { calendarEmail, crmBccEmail, graphFetch, sendMail } from './_shared/graph';
import { loadConfig } from './_shared/storage';
import type { BookingAnswer } from './_shared/model';

const esc=(value:string)=>value.replace(/[&<>"']/g,(c)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]!));
const metadata=(value:unknown)=>Buffer.from(JSON.stringify(value)).toString('base64url');
function prettyDate(iso:string,timeZone:string){return new Intl.DateTimeFormat('en',{timeZone,weekday:'long',year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit',timeZoneName:'short'}).format(new Date(iso))}

export const handler: Handler = async (event) => {
  if(event.httpMethod!=='POST') return {statusCode:405,headers:{'Content-Type':'application/json'},body:JSON.stringify({error:'Method not allowed'})};
  try{
    const body=JSON.parse(event.body||'{}') as any;
    if(body.website) return {statusCode:400,headers:{'Content-Type':'application/json'},body:JSON.stringify({error:'Invalid submission'})};
    const slug=String(body.slug||'niki');
    const duration=Number(body.duration);
    const startUtc=String(body.startUtc||'');
    const viewerTimezone=String(body.viewerTimezone||'UTC');
    const purpose=String(body.purpose||'');
    const meetingMethod=String(body.meetingMethod||'');
    const name=String(body.name||'').trim();
    const email=String(body.email||'').trim();
    const message=String(body.message||'').trim();
    const answers=(Array.isArray(body.answers)?body.answers:[]) as BookingAnswer[];
    if(!name||!email||!startUtc||!Number.isFinite(duration)) return {statusCode:400,headers:{'Content-Type':'application/json'},body:JSON.stringify({error:'Please complete the required fields'})};
    if(!/^\S+@\S+\.\S+$/.test(email)) return {statusCode:400,headers:{'Content-Type':'application/json'},body:JSON.stringify({error:'Please enter a valid email address'})};

    const config=await loadConfig({
      url:event.headers['x-bookingcal-db-url']||event.headers['X-Bookingcal-Db-Url'],
      anonKey:event.headers['x-bookingcal-db-key']||event.headers['X-Bookingcal-Db-Key'],
    });
    const template=config.templates.find((t)=>t.slug===slug&&t.active);
    if(!template) return {statusCode:404,headers:{'Content-Type':'application/json'},body:JSON.stringify({error:'Booking link not found'})};
    if(!template.durations.includes(duration)) return {statusCode:400,headers:{'Content-Type':'application/json'},body:JSON.stringify({error:'Invalid duration'})};
    if(!template.purposes.includes(purpose)) return {statusCode:400,headers:{'Content-Type':'application/json'},body:JSON.stringify({error:'Please choose a valid purpose'})};
    if(!template.meetingMethods.includes(meetingMethod as 'zoom'|'teams')) return {statusCode:400,headers:{'Content-Type':'application/json'},body:JSON.stringify({error:'Please choose a meeting method'})};
    for(const q of template.questions){const a=answers.find((x)=>x.questionId===q.id)?.answer?.trim()||'';if(q.required&&!a)return {statusCode:400,headers:{'Content-Type':'application/json'},body:JSON.stringify({error:`Please answer: ${q.label}`})};}
    if(template.freeTextEnabled&&template.freeTextRequired&&!message) return {statusCode:400,headers:{'Content-Type':'application/json'},body:JSON.stringify({error:`Please complete: ${template.freeTextLabel}`})};

    const slots=await getAvailableSlots(config,template,duration);
    const selected=slots.find((s)=>Math.abs(DateTime.fromISO(s.startUtc).toMillis()-DateTime.fromISO(startUtc).toMillis())<1000);
    if(!selected) return {statusCode:409,headers:{'Content-Type':'application/json'},body:JSON.stringify({error:'That time is no longer available. Please choose another slot.'})};

    const start=DateTime.fromISO(selected.startUtc).toUTC();
    const end=start.plus({minutes:duration});
    const zoomUrl=config.settings.zoomUrl||process.env.ZOOM_URL||'https://www.nikiskene.com/meetonline';
    const teamsFallback=config.settings.teamsFallbackUrl||process.env.TEAMS_FALLBACK_URL||'https://www.nikiskene.com/meetonteams';
    const meta={customerName:name,customerEmail:email,viewerTimezone,meetingMethod,purpose,templateSlug:slug};
    const answerHtml=answers.filter((a)=>a.answer?.trim()).map((a)=>`<p><strong>${esc(a.label)}</strong><br>${esc(a.answer)}</p>`).join('');
    const methodText=meetingMethod==='zoom'?`<p><strong>Meeting link:</strong> <a href="${esc(zoomUrl)}">${esc(zoomUrl)}</a></p>`:'<p><strong>Meeting:</strong> Microsoft Teams. The Teams join link is included with this invitation.</p>';
    const bodyHtml=`<p><strong>Booking via BookingCal</strong></p><p><strong>Guest:</strong> ${esc(name)} (${esc(email)})<br><strong>Purpose:</strong> ${esc(purpose)}<br><strong>Duration:</strong> ${duration} minutes</p>${methodText}${answerHtml}${message?`<p><strong>Message</strong><br>${esc(message)}</p>`:''}<!--BOOKINGCAL_META:${metadata(meta)}-->`;
    const eventPayload:any={subject:`${purpose} — ${name}`,body:{contentType:'HTML',content:bodyHtml},start:{dateTime:start.toISO({suppressMilliseconds:true}),timeZone:'UTC'},end:{dateTime:end.toISO({suppressMilliseconds:true}),timeZone:'UTC'},showAs:'busy',categories:['BookingCal'],transactionId:randomUUID(),attendees:[{emailAddress:{address:email,name},type:'required'}]};
    if(meetingMethod==='zoom'){eventPayload.location={displayName:'Zoom',locationUri:zoomUrl};}
    if(meetingMethod==='teams'){eventPayload.isOnlineMeeting=true;eventPayload.onlineMeetingProvider='teamsForBusiness';}
    const created=await graphFetch<any>(`/users/${encodeURIComponent(calendarEmail())}/events`,{method:'POST',headers:{Prefer:'outlook.timezone="UTC"'},body:JSON.stringify(eventPayload)});
    const meetingUrl=meetingMethod==='zoom'?zoomUrl:(created?.onlineMeeting?.joinUrl||teamsFallback);
    const when=prettyDate(selected.startUtc,viewerTimezone);
    const confirmHtml=`<p>Hi ${esc(name)},</p><p>Your meeting with Niki is booked.</p><p><strong>${esc(when)}</strong><br>${duration} minutes · ${meetingMethod==='zoom'?'Zoom':'Microsoft Teams'}</p><p><a href="${esc(meetingUrl)}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px">Join meeting</a></p><p>You will also receive a calendar invitation. Looking forward to seeing you.</p>`;
    await sendMail(email,'Confirmed: your meeting with Niki',confirmHtml,crmBccEmail());
    return {statusCode:200,headers:{'Content-Type':'application/json'},body:JSON.stringify({ok:true,eventId:created.id,meetingUrl})};
  }catch(e){return {statusCode:500,headers:{'Content-Type':'application/json'},body:JSON.stringify({error:e instanceof Error?e.message:'Booking failed'})};}
};
