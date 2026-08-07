import { DateTime } from 'luxon';
import { calendarEmail, graphFetch } from './graph';

const META=/BOOKINGCAL_META:([A-Za-z0-9_-]+)/;
const TOKEN_PREFIX='BookingCalToken:';
const SLUG_PREFIX='BookingCalSlug:';

export type BookingMeta={
  customerName:string;
  customerEmail:string;
  viewerTimezone:string;
  meetingMethod:'zoom'|'teams';
  purpose:string;
  templateSlug:string;
  manageToken:string;
  manageUrl?:string;
  duration:number;
};

export function encodeBookingMeta(meta:BookingMeta){
  return Buffer.from(JSON.stringify(meta)).toString('base64url');
}

export function parseBookingMeta(html:string):BookingMeta|null{
  try{
    const match=html.match(META);
    if(!match)return null;
    const meta=JSON.parse(Buffer.from(match[1],'base64url').toString('utf8')) as BookingMeta;
    return meta?.manageToken?meta:null;
  }catch{return null}
}

function fallbackMeta(event:any, token:string):BookingMeta|null{
  const categories=Array.isArray(event.categories)?event.categories:[];
  const slug=String(categories.find((c:string)=>c.startsWith(SLUG_PREFIX))||'').slice(SLUG_PREFIX.length)||'bookniki';
  const attendee=Array.isArray(event.attendees)?event.attendees[0]?.emailAddress:null;
  const start=DateTime.fromISO(event.start?.dateTime||'',{zone:event.start?.timeZone||'UTC'}).toUTC();
  const end=DateTime.fromISO(event.end?.dateTime||'',{zone:event.end?.timeZone||'UTC'}).toUTC();
  if(!attendee?.address||!start.isValid||!end.isValid)return null;
  const subject=String(event.subject||'');
  const dash=subject.indexOf(' — ');
  const purpose=dash>=0?subject.slice(0,dash):subject||'Meeting';
  const name=attendee.name||(dash>=0?subject.slice(dash+3):'Guest');
  const meetingMethod:'zoom'|'teams'=event.onlineMeeting?.joinUrl?'teams':'zoom';
  return {
    customerName:name,
    customerEmail:attendee.address,
    viewerTimezone:'UTC',
    meetingMethod,
    purpose,
    templateSlug:slug,
    manageToken:token,
    duration:Math.max(1,Math.round(end.diff(start,'minutes').minutes)),
  };
}

function bodyContainsToken(html:string,token:string){
  return html.includes(`/manage/${token}`)||html.includes(encodeURIComponent(`/manage/${token}`));
}

export async function findManagedEvent(token:string){
  if(!token||token.length<20)return null;
  const from=DateTime.utc().minus({days:2});
  const to=DateTime.utc().plus({days:120});
  let url=`/users/${encodeURIComponent(calendarEmail())}/calendarView?${new URLSearchParams({startDateTime:from.toISO()!,endDateTime:to.toISO()!,'$select':'id,subject,start,end,categories,body,onlineMeeting,isCancelled,attendees'}).toString()}`;
  for(let page=0;page<8&&url;page++){
    const data=await graphFetch<{value:any[];'@odata.nextLink'?:string}>(url,{headers:{Prefer:'outlook.timezone="UTC"'}});
    for(const event of data.value||[]){
      const categories=Array.isArray(event.categories)?event.categories:[];
      if(!categories.includes('BookingCal'))continue;
      const html=String(event.body?.content||'');
      const categoryToken=String(categories.find((c:string)=>c.startsWith(TOKEN_PREFIX))||'').slice(TOKEN_PREFIX.length);
      const parsed=parseBookingMeta(html);
      if(parsed?.manageToken===token)return {event,meta:parsed};
      if(categoryToken===token||bodyContainsToken(html,token)){
        const meta=parsed||fallbackMeta(event,token);
        if(meta)return {event,meta};
      }
    }
    const next=data['@odata.nextLink'];
    url=next?next.replace('https://graph.microsoft.com/v1.0',''):'';
  }
  return null;
}
