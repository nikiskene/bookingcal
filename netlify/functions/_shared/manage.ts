import { DateTime } from 'luxon';
import { calendarEmail, graphFetch } from './graph';

const META=/BOOKINGCAL_META:([A-Za-z0-9_-]+)/;

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

export async function findManagedEvent(token:string){
  if(!token||token.length<20) return null;
  const from=DateTime.utc().minus({days:2});
  const to=DateTime.utc().plus({days:120});
  let url=`/users/${encodeURIComponent(calendarEmail())}/calendarView?${new URLSearchParams({startDateTime:from.toISO()!,endDateTime:to.toISO()!,'$select':'id,subject,start,end,categories,body,onlineMeeting,isCancelled'}).toString()}`;
  for(let page=0;page<8&&url;page++){
    const data=await graphFetch<{value:any[];'@odata.nextLink'?:string}>(url,{headers:{Prefer:'outlook.timezone="UTC"'}});
    for(const event of data.value||[]){
      if(!Array.isArray(event.categories)||!event.categories.includes('BookingCal'))continue;
      const meta=parseBookingMeta(event.body?.content||'');
      if(meta?.manageToken===token)return {event,meta};
    }
    const next=data['@odata.nextLink'];
    url=next?next.replace('https://graph.microsoft.com/v1.0',''):'';
  }
  return null;
}
