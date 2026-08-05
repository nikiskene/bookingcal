import { DateTime, Interval } from 'luxon';
import { calendarEmail, graphFetch } from './graph';
import type { AppConfig, BookingTemplate, DayKey, WeeklyAvailability } from './model';

export type Slot={startUtc:string;endUtc:string};
type ScheduleItem={status:string;start:{dateTime:string;timeZone:string};end:{dateTime:string;timeZone:string}};

function templateNumber(value:number|null|undefined,fallback:number){return value===null||value===undefined?fallback:value}
function scheduleFor(template:BookingTemplate,config:AppConfig):WeeklyAvailability{return template.availabilityMode==='custom'?template.customAvailability:config.settings.globalAvailability}
function dayKey(dt:DateTime):DayKey{return ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'][dt.weekday-1] as DayKey}
function combine(date:DateTime,time:string,zone:string){const [hour,minute]=time.split(':').map(Number);return DateTime.fromObject({year:date.year,month:date.month,day:date.day,hour,minute},{zone})}
function isBusy(status:string){return status.toLowerCase()!=='free'}

export async function getAvailableSlots(config:AppConfig,template:BookingTemplate,duration:number):Promise<Slot[]> {
  const zone=config.settings.timezone||'Europe/Vienna';
  const horizon=Math.min(60,Math.max(1,templateNumber(template.horizonDays,config.settings.horizonDays)));
  const minNotice=Math.max(0,templateNumber(template.minNoticeHours,config.settings.minNoticeHours));
  const before=Math.max(0,templateNumber(template.bufferBeforeMin,config.settings.bufferBeforeMin));
  const after=Math.max(0,templateNumber(template.bufferAfterMin,config.settings.bufferAfterMin));
  const now=DateTime.now().setZone(zone);
  const earliest=now.plus({hours:minNotice});
  const rangeStart=now.startOf('day');
  const rangeEnd=now.plus({days:horizon}).endOf('day');
  const data=await graphFetch<{value:Array<{scheduleItems:ScheduleItem[]}>}>(`/users/${encodeURIComponent(calendarEmail())}/calendar/getSchedule`,{
    method:'POST',
    headers:{Prefer:'outlook.timezone="UTC"'},
    body:JSON.stringify({
      schedules:[calendarEmail()],
      startTime:{dateTime:rangeStart.toUTC().toFormat("yyyy-MM-dd'T'HH:mm:ss"),timeZone:'UTC'},
      endTime:{dateTime:rangeEnd.toUTC().toFormat("yyyy-MM-dd'T'HH:mm:ss"),timeZone:'UTC'},
      availabilityViewInterval:15
    })
  });
  const busy=(data.value?.[0]?.scheduleItems||[]).filter((x)=>isBusy(x.status)).map((x)=>{
    const s=DateTime.fromISO(x.start.dateTime,{zone:'UTC'});
    const e=DateTime.fromISO(x.end.dateTime,{zone:'UTC'});
    return Interval.fromDateTimes(s,e);
  });
  const schedule=scheduleFor(template,config);
  const slots:Slot[]=[];
  for(let offset=0;offset<=horizon;offset++){
    const day=rangeStart.plus({days:offset});
    const rule=schedule[dayKey(day)];
    if(!rule?.enabled) continue;
    const windowStart=combine(day,rule.start,zone);
    const windowEnd=combine(day,rule.end,zone);
    for(let candidate=windowStart;candidate.plus({minutes:duration})<=windowEnd;candidate=candidate.plus({minutes:15})){
      const end=candidate.plus({minutes:duration});
      if(candidate<earliest) continue;
      const guardedStart=candidate.minus({minutes:before}).toUTC();
      const guardedEnd=end.plus({minutes:after}).toUTC();
      if(candidate.minus({minutes:before})<windowStart||end.plus({minutes:after})>windowEnd) continue;
      const guarded=Interval.fromDateTimes(guardedStart,guardedEnd);
      if(busy.some((b)=>b.overlaps(guarded))) continue;
      slots.push({startUtc:candidate.toUTC().toISO()!,endUtc:end.toUTC().toISO()!});
    }
  }
  return slots;
}
