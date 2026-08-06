import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../api';
import type { BookingAnswer, PublicConfig, Slot } from '../types';

function viewerTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

function dateKey(iso: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(iso));
  const value = (type: string) => parts.find((p) => p.type === type)?.value || '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

function formatDateCard(iso: string, timeZone: string) {
  const d = new Date(iso);
  return {
    weekday: new Intl.DateTimeFormat('en', { timeZone, weekday: 'short' }).format(d),
    day: new Intl.DateTimeFormat('en', { timeZone, day: 'numeric' }).format(d),
    month: new Intl.DateTimeFormat('en', { timeZone, month: 'short' }).format(d),
  };
}

function formatLongDate(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat('en', { timeZone, weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(iso));
}

function formatTime(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat('en', { timeZone, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));
}

export function BookingPage({ slug }: { slug: string }) {
  const tz = useMemo(viewerTimeZone, []);
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [duration, setDuration] = useState<number>(30);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [slot, setSlot] = useState<Slot | null>(null);
  const [purpose, setPurpose] = useState('');
  const [method, setMethod] = useState<'zoom' | 'teams'>('zoom');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [manageUrl, setManageUrl] = useState('');

  useEffect(() => {
    let alive = true;
    api.getPublicConfig(slug).then((data) => {
      if (!alive) return;
      setConfig(data);
      const d = data.template.durations[0] || 30;
      setDuration(d);
      setPurpose(data.template.purposes[0] || 'Other');
      setMethod(data.template.meetingMethods[0] || 'zoom');
    }).catch((e) => setError(e.message)).finally(() => setLoading(false));
    return () => { alive = false; };
  }, [slug]);

  useEffect(() => {
    if (!config) return;
    setSlot(null);
    setSelectedDate('');
    setSlotsLoading(true);
    setError('');
    api.getAvailability(slug, duration)
      .then((r) => {
        setSlots(r.slots);
        if (r.slots[0]) setSelectedDate(dateKey(r.slots[0].startUtc, tz));
      })
      .catch((e) => setError(e.message))
      .finally(() => setSlotsLoading(false));
  }, [config, duration, slug, tz]);

  const dayGroups = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const s of slots) {
      const key = dateKey(s.startUtc, tz);
      const list = map.get(key) || [];
      list.push(s);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [slots, tz]);

  const selectedDaySlots = useMemo(() => dayGroups.find(([key]) => key === selectedDate)?.[1] || [], [dayGroups, selectedDate]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!config || !slot) return;
    setSubmitting(true);
    setError('');
    try {
      const answerList: BookingAnswer[] = config.template.questions.map((q) => ({ questionId: q.id, label: q.label, answer: answers[q.id] || '' }));
      const result = await api.book({ slug, duration, startUtc: slot.startUtc, viewerTimezone: tz, purpose, meetingMethod: method, name, email, message, answers: answerList, website: '' });
      setManageUrl(result.manageUrl || '');
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Booking failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <main className="booking-shell"><div className="booking-card booking-state">Loading…</div></main>;
  if (error && !config) return <main className="booking-shell"><div className="booking-card booking-state"><h1>Booking unavailable</h1><p>{error}</p></div></main>;
  if (!config) return null;
  if (success) return <main className="booking-shell"><section className="booking-card success-card"><div className="success-mark">✓</div><h1>You're booked.</h1><p>A confirmation and calendar invitation are on their way.</p>{manageUrl && <a className="manage-link" href={manageUrl}>Reschedule or cancel</a>}</section></main>;

  const t = config.template;
  return (
    <main className="booking-shell">
      <section className="booking-card booking-public-card">
        <header className="booking-header">
          <div className="eyebrow">NIKI SKENE</div>
          <h1>{t.headline}</h1>
          <p>{t.description}</p>
          <div className="timezone-pill">Your time · {tz.replaceAll('_', ' ')}</div>
        </header>

        <form onSubmit={submit}>
          <section className="booking-step">
            <div className="step-number">1</div>
            <div className="step-content">
              <label className="section-label">How much time?</label>
              <div className="choice-row compact-choices">{t.durations.map((d) => <button key={d} type="button" className={duration === d ? 'choice active' : 'choice'} onClick={() => setDuration(d)}>{d} min</button>)}</div>
            </div>
          </section>

          <section className="booking-step">
            <div className="step-number">2</div>
            <div className="step-content">
              <label className="section-label">Choose a day</label>
              {slotsLoading ? <p className="muted">Checking the calendar…</p> : dayGroups.length ? <div className="date-strip" role="list">{dayGroups.map(([key, daySlots]) => {
                const d = formatDateCard(daySlots[0].startUtc, tz);
                return <button key={key} type="button" className={selectedDate === key ? 'date-card active' : 'date-card'} onClick={() => { setSelectedDate(key); setSlot(null); }}><span>{d.weekday}</span><strong>{d.day}</strong><small>{d.month}</small></button>;
              })}</div> : <p className="muted">No available days found in the current booking window.</p>}
            </div>
          </section>

          {selectedDate && <section className="booking-step">
            <div className="step-number">3</div>
            <div className="step-content">
              <label className="section-label">Choose a time</label>
              {selectedDaySlots[0] && <p className="chosen-day-label">{formatLongDate(selectedDaySlots[0].startUtc, tz)}</p>}
              <div className="time-grid">{selectedDaySlots.map((s) => <button type="button" key={s.startUtc} className={slot?.startUtc === s.startUtc ? 'time-button active' : 'time-button'} onClick={() => setSlot(s)}>{formatTime(s.startUtc, tz)}</button>)}</div>
            </div>
          </section>}

          {slot && <section className="booking-details">
            <div className="booking-summary"><span>{formatLongDate(slot.startUtc, tz)}</span><strong>{formatTime(slot.startUtc, tz)} · {duration} min</strong></div>

            {t.purposes.length > 0 && <div className="field-group"><label>What are we meeting about?</label><div className="selectable-cards">{t.purposes.map((p) => <button type="button" key={p} className={purpose === p ? 'select-card active' : 'select-card'} onClick={() => setPurpose(p)}>{p}</button>)}</div></div>}

            <div className="field-group"><label>Where should we meet?</label><div className="selectable-cards small">{t.meetingMethods.map((m) => <button type="button" key={m} className={method === m ? 'select-card active' : 'select-card'} onClick={() => setMethod(m)}>{m === 'zoom' ? 'Zoom' : 'Microsoft Teams'}</button>)}</div></div>

            <div className="two-col"><div className="field-group"><label>Name</label><input required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} /></div><div className="field-group"><label>Email</label><input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div></div>

            {t.questions.map((q) => <div className="field-group" key={q.id}><label>{q.label}</label><input required={q.required} placeholder={q.placeholder} value={answers[q.id] || ''} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} /></div>)}

            {t.freeTextEnabled && <div className="field-group"><label>{t.freeTextLabel}</label><textarea required={t.freeTextRequired} rows={4} value={message} onChange={(e) => setMessage(e.target.value)} /></div>}

            {error && <div className="error-box">{error}</div>}
            <button className="primary-button booking-submit" disabled={submitting}>{submitting ? 'Booking…' : 'Book meeting'}</button>
          </section>}
        </form>
      </section>
    </main>
  );
}
