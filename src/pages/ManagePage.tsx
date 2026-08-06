import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import type { ManagedMeeting } from '../api';
import type { Slot } from '../types';

function viewerTimeZone(){return Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'}
function dateKey(iso:string,timeZone:string){const parts=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(iso));const v=(t:string)=>parts.find(p=>p.type===t)?.value||'';return `${v('year')}-${v('month')}-${v('day')}`}
function cardDate(iso:string,tz:string){const d=new Date(iso);return {weekday:new Intl.DateTimeFormat('en',{timeZone:tz,weekday:'short'}).format(d),day:new Intl.DateTimeFormat('en',{timeZone:tz,day:'numeric'}).format(d),month:new Intl.DateTimeFormat('en',{timeZone:tz,month:'short'}).format(d)}}
function longDate(iso:string,tz:string){return new Intl.DateTimeFormat('en',{timeZone:tz,weekday:'long',month:'long',day:'numeric',year:'numeric'}).format(new Date(iso))}
function time(iso:string,tz:string){return new Intl.DateTimeFormat('en',{timeZone:tz,hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(iso))}

export function ManagePage({token}:{token:string}){
  const tz=useMemo(viewerTimeZone,[]);
  const [meeting,setMeeting]=useState<ManagedMeeting|null>(null);
  const [slots,setSlots]=useState<Slot[]>([]);
  const [selectedDate,setSelectedDate]=useState('');
  const [selectedSlot,setSelectedSlot]=useState<Slot|null>(null);
  const [mode,setMode]=useState<'home'|'reschedule'|'cancel'>('home');
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [done,setDone]=useState('');

  useEffect(()=>{api.getManagedMeeting(token).then(setMeeting).catch(e=>setError(e.message)).finally(()=>setLoading(false))},[token]);
  useEffect(()=>{if(mode!=='reschedule'||!meeting)return;setBusy(true);setError('');api.getManageAvailability(token).then(r=>{setSlots(r.slots);if(r.slots[0])setSelectedDate(dateKey(r.slots[0].startUtc,tz))}).catch(e=>setError(e.message)).finally(()=>setBusy(false))},[mode,meeting,token,tz]);
  const days=useMemo(()=>{const map=new Map<string,Slot[]>();for(const s of slots){const key=dateKey(s.startUtc,tz);map.set(key,[...(map.get(key)||[]),s])}return [...map.entries()]},[slots,tz]);
  const daySlots=days.find(([k])=>k===selectedDate)?.[1]||[];

  async function reschedule(){if(!selectedSlot)return;setBusy(true);setError('');try{const r=await api.reschedule(token,selectedSlot.startUtc);setMeeting(r.meeting);setDone('Your meeting has been rescheduled. Your calendar invitation has been updated.');setMode('home');setSelectedSlot(null)}catch(e){setError(e instanceof Error?e.message:'Could not reschedule')}finally{setBusy(false)}}
  async function cancel(){setBusy(true);setError('');try{await api.cancelMeeting(token);setDone('Your meeting has been cancelled.');setMeeting(m=>m?{...m,cancelled:true}:m);setMode('home')}catch(e){setError(e instanceof Error?e.message:'Could not cancel')}finally{setBusy(false)}}

  if(loading)return <main className="booking-shell"><section className="booking-card manage-card">Loading your booking…</section></main>;
  if(error&&!meeting)return <main className="booking-shell"><section className="booking-card manage-card"><div className="eyebrow">BOOKINGCAL</div><h1>Booking unavailable</h1><p>{error}</p></section></main>;
  if(!meeting)return null;

  return <main className="booking-shell"><section className="booking-card manage-card">
    <header className="booking-header compact-header"><div className="eyebrow">YOUR MEETING WITH NIKI</div><h1>{meeting.cancelled?'Meeting cancelled':'Manage your meeting'}</h1><p>{meeting.purpose}</p></header>
    <div className="meeting-overview"><div><span>Date</span><strong>{longDate(meeting.startUtc,tz)}</strong></div><div><span>Time</span><strong>{time(meeting.startUtc,tz)}</strong></div><div><span>Duration</span><strong>{meeting.duration} min</strong></div></div>
    {done&&<div className="success-note">{done}</div>}
    {error&&<div className="error-box">{error}</div>}
    {!meeting.cancelled&&mode==='home'&&<div className="manage-actions"><button className="primary-button" onClick={()=>setMode('reschedule')}>Choose another time</button><button className="secondary-button danger-outline" onClick={()=>setMode('cancel')}>Cancel meeting</button></div>}
    {mode==='cancel'&&<div className="confirm-panel"><h2>Cancel this meeting?</h2><p>This removes the meeting from the calendar and sends a cancellation.</p><div className="manage-actions horizontal"><button className="secondary-button" onClick={()=>setMode('home')}>Keep meeting</button><button className="primary-button danger-button" disabled={busy} onClick={cancel}>{busy?'Cancelling…':'Yes, cancel meeting'}</button></div></div>}
    {mode==='reschedule'&&<div className="reschedule-panel"><div className="editor-head"><div><div className="eyebrow">RESCHEDULE</div><h2>Choose another day</h2></div><button className="secondary-button" onClick={()=>setMode('home')}>Back</button></div>{busy&&!slots.length?<p className="muted">Checking the calendar…</p>:<><div className="date-strip">{days.map(([key,items])=>{const d=cardDate(items[0].startUtc,tz);return <button type="button" key={key} className={selectedDate===key?'date-card active':'date-card'} onClick={()=>{setSelectedDate(key);setSelectedSlot(null)}}><span>{d.weekday}</span><strong>{d.day}</strong><small>{d.month}</small></button>})}</div>{selectedDate&&<><p className="chosen-day-label">{daySlots[0]?longDate(daySlots[0].startUtc,tz):''}</p><div className="time-grid">{daySlots.map(s=><button type="button" key={s.startUtc} className={selectedSlot?.startUtc===s.startUtc?'time-button active':'time-button'} onClick={()=>setSelectedSlot(s)}>{time(s.startUtc,tz)}</button>)}</div></>}{selectedSlot&&<button className="primary-button reschedule-submit" disabled={busy} onClick={reschedule}>{busy?'Updating…':'Confirm new time'}</button>}</>}</div>}
  </section></main>;
}
