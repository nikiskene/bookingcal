import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import type { BookingAnswer, PublicConfig, Slot } from '../types';

function viewerTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

function formatDay(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat('en', { timeZone, weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(iso));
}

function formatTime(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat('en', { timeZone, hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

export function BookingPage({ slug }: { slug: string }) {
  const tz = useMemo(viewerTimeZone, []);
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [duration, setDuration] = useState<number>(30);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [purpose, setPurpose] = useState('');
  const [method, setMethod] = useState<'zoom' | 'teams'>('zoom');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

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
    api.getAvailability(slug, duration).then((r) => setSlots(r.slots)).catch((e) => setError(e.message));
  }, [config, duration, slug]);

  const grouped = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const s of slots) {
      const key = formatDay(s.startUtc, tz);
      const list = map.get(key) || [];
      list.push(s);
      map.set(key, list);
    }
    return [...map.entries()].slice(0, 12);
  }, [slots, tz]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!config || !slot) return;
    setSubmitting(true);
    setError('');
    try {
      const answerList: BookingAnswer[] = config.template.questions.map((q) => ({ questionId: q.id, label: q.label, answer: answers[q.id] || '' }));
      await api.book({ slug, duration, startUtc: slot.startUtc, viewerTimezone: tz, purpose, meetingMethod: method, name, email, message, answers: answerList, website: '' });
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Booking failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <main className="booking-shell"><div className="booking-card">Loading…</div></main>;
  if (error && !config) return <main className="booking-shell"><div className="booking-card"><h1>Booking unavailable</h1><p>{error}</p></div></main>;
  if (!config) return null;
  if (success) return <main className="booking-shell"><section className="booking-card success-card"><div className="success-mark">✓</div><h1>You're booked.</h1><p>A confirmation and calendar invitation are on their way.</p></section></main>;

  const t = config.template;
  return (
    <main className="booking-shell">
      <section className="booking-card">
        <header className="booking-header">
          <div className="eyebrow">NIKI SKENE</div>
          <h1>{t.headline}</h1>
          <p>{t.description}</p>
          <div className="timezone-pill">Times shown in {tz.replaceAll('_', ' ')}</div>
        </header>

        <form onSubmit={submit}>
          <div className="section-block">
            <label className="section-label">Duration</label>
            <div className="choice-row">{t.durations.map((d) => <button key={d} type="button" className={duration === d ? 'choice active' : 'choice'} onClick={() => setDuration(d)}>{d} min</button>)}</div>
          </div>

          <div className="section-block">
            <label className="section-label">Choose a time</label>
            <div className="days-grid">
              {grouped.map(([day, daySlots]) => <div className="day-column" key={day}><div className="day-title">{day}</div>{daySlots.slice(0, 8).map((s) => <button type="button" key={s.startUtc} className={slot?.startUtc === s.startUtc ? 'time-button active' : 'time-button'} onClick={() => setSlot(s)}>{formatTime(s.startUtc, tz)}</button>)}</div>)}
            </div>
            {!slots.length && <p className="muted">No available times found in the current booking window.</p>}
          </div>

          {slot && <div className="details-panel">
            <div className="selected-time">{formatDay(slot.startUtc, tz)} · {formatTime(slot.startUtc, tz)} · {duration} min</div>

            {t.purposes.length > 0 && <div className="field-group"><label>What are we meeting about?</label><div className="radio-grid">{t.purposes.map((p) => <label key={p} className="radio-card"><input required type="radio" name="purpose" checked={purpose === p} onChange={() => setPurpose(p)} /> <span>{p}</span></label>)}</div></div>}

            <div className="field-group"><label>Where should we meet?</label><div className="radio-grid">{t.meetingMethods.map((m) => <label key={m} className="radio-card"><input required type="radio" name="method" checked={method === m} onChange={() => setMethod(m)} /> <span>{m === 'zoom' ? 'Zoom' : 'Microsoft Teams'}</span></label>)}</div></div>

            <div className="two-col"><div className="field-group"><label>Name</label><input required value={name} onChange={(e) => setName(e.target.value)} /></div><div className="field-group"><label>Email</label><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div></div>

            {t.questions.map((q) => <div className="field-group" key={q.id}><label>{q.label}</label><input required={q.required} placeholder={q.placeholder} value={answers[q.id] || ''} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} /></div>)}

            {t.freeTextEnabled && <div className="field-group"><label>{t.freeTextLabel}</label><textarea required={t.freeTextRequired} rows={4} value={message} onChange={(e) => setMessage(e.target.value)} /></div>}

            {error && <div className="error-box">{error}</div>}
            <button className="primary-button" disabled={submitting}>{submitting ? 'Booking…' : 'Book meeting'}</button>
          </div>}
        </form>
      </section>
    </main>
  );
}
