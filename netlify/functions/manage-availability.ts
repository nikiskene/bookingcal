import type { Handler } from '@netlify/functions';
import { getAvailableSlots } from './_shared/availability';
import { findManagedEvent } from './_shared/manage';
import { loadConfig } from './_shared/storage';

export const handler:Handler=async(event)=>{
  if(event.httpMethod!=='GET')return {statusCode:405,headers:{'Content-Type':'application/json'},body:JSON.stringify({error:'Method not allowed'})};
  try{
    const token=event.queryStringParameters?.token||'';
    const found=await findManagedEvent(token);
    if(!found)return {statusCode:404,headers:{'Content-Type':'application/json'},body:JSON.stringify({error:'This booking link is invalid or expired.'})};
    const {event:calendarEvent,meta}=found;
    if(calendarEvent.isCancelled)return {statusCode:409,headers:{'Content-Type':'application/json'},body:JSON.stringify({error:'This meeting has already been cancelled.'})};
    const config=await loadConfig({
      url:event.headers['x-bookingcal-db-url']||event.headers['X-Bookingcal-Db-Url'],
      anonKey:event.headers['x-bookingcal-db-key']||event.headers['X-Bookingcal-Db-Key'],
    });
    const template=config.templates.find(t=>t.slug===meta.templateSlug&&t.active);
    if(!template)return {statusCode:404,headers:{'Content-Type':'application/json'},body:JSON.stringify({error:'The original booking link is no longer active.'})};
    const slots=await getAvailableSlots(config,template,meta.duration||30);
    return {statusCode:200,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify({slots})};
  }catch(e){return {statusCode:500,headers:{'Content-Type':'application/json'},body:JSON.stringify({error:e instanceof Error?e.message:'Could not load availability'})};}
};
