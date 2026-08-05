import type { DayKey, WeeklyAvailability } from '../types';
import { days } from '../defaults';

export function WeeklyEditor({ value, onChange }: { value: WeeklyAvailability; onChange: (value: WeeklyAvailability) => void }) {
  function patch(day: DayKey, patch: Partial<WeeklyAvailability[DayKey]>) {
    onChange({ ...value, [day]: { ...value[day], ...patch } });
  }
  return <div className="week-editor">{days.map((day) => <div className="week-row" key={day}>
    <label className="day-check"><input type="checkbox" checked={value[day].enabled} onChange={(e) => patch(day, { enabled: e.target.checked })} /><span>{day.slice(0, 3).toUpperCase()}</span></label>
    <input type="time" disabled={!value[day].enabled} value={value[day].start} onChange={(e) => patch(day, { start: e.target.value })} />
    <span>to</span>
    <input type="time" disabled={!value[day].enabled} value={value[day].end} onChange={(e) => patch(day, { end: e.target.value })} />
  </div>)}</div>;
}
