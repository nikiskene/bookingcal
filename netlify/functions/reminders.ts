import { DateTime } from 'luxon';
import { calendarEmail, graphFetch, sendMail } from './_shared/graph';
import { loadConfig } from './_shared/storage';
import { parseBookingMeta } from './_shared/manage';

const esc=(value:string)=>value.replace(/[&<>"']/g,(c)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]!));

function prettyDate(iso:string,timeZone:string){return new Intl.DateTimeFormat('en',{timeZone,weekday:'long',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit',timeZoneName:'short'}).format(new Date(iso))}

export default async () => {
  const config=await loadConfig();
  const now=DateTime.utc();
  const from=now.plus({minutes:40});
  const to=now.plus({hours:25,minutes:15});
  const query=new URLSearchParams({startDateTime:from.toISO()!,endDateTime:to.toISO()!,'$select':'id,subject,start,end,categories,body,onlineMeeting,isCancelled'});
  const data=await graphFetch<{value:any[]}>(`/users/${encodeURIComponent(calendarEmail())}/calendarView?${query.toString()}`,{headers:{Prefer:'outlook.timezone="UTC"'}});
  for(const event of data.value||[]){
    if(event.isCancelled||!Array.isArray(event.categories)||!event.categories.includes('BookingCal'))continue;
    const meta=parseBookingMeta(event.body?.content||'');
    if(!meta?.customerEmail)continue;
    const start=DateTime.fromISO(event.start?.dateTime,{zone:event.start?.timeZone||'UTC'}).toUTC();
    const minutes=start.diff(now,'minutes').minutes;
    const windows=[{tag:'BookingCal:24hSent',label:'tomorrow',min:1430,max:1450},{tag:'BookingCal:1hSent',label:'in about an hour',min:50,max:70}];
    for(const window of windows){
      if(minutes<window.min||minutes>window.max||event.categories.includes(window.tag))continue;
      const meetingUrl=meta.meetingMethod==='zoom'?config.settings.zoomUrl:(event.onlineMeeting?.joinUrl||config.settings.teamsFallbackUrl);
      const when=prettyDate(start.toISO()!,meta.viewerTimezone||'UTC');
      const manageUrl=meta.manageUrl||`${(process.env.URL||'https://nikiskenecal.netlify.app').replace(/\/$/,'')}/manage/${meta.manageToken}`;
      const manageHtml=manageUrl?`<p>Plans changed? <a href="${esc(manageUrl)}">Reschedule or cancel your meeting</a>.</p>`:'';
      const html=`<p>Hi ${esc(meta.customerName)},</p><p>A quick reminder: your meeting with Niki is ${window.label}.</p><p><strong>${esc(when)}</strong><br>${esc(meta.purpose)}</p><p><a href="${esc(meetingUrl)}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px">Join meeting</a></p>${manageHtml}<p>See you soon.</p>`;
      await sendMail(meta.customerEmail,'Reminder: your meeting with Niki',html);
      const categories=[...event.categories,window.tag];
      await graphFetch(`/users/${encodeURIComponent(calendarEmail())}/events/${encodeURIComponent(event.id)}`,{method:'PATCH',body:JSON.stringify({categories})});
      event.categories=categories;
    }
  }
  return new Response('ok');
};

export const config={schedule:'*/15 * * * *'};
