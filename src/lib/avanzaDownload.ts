import { APP_TIME_ZONE } from '@/lib/dateOnly';

export const AVANZA_INITIAL_DOWNLOAD = '2026-10-13T03:00:00.000Z'; // 12/10/2026, 10:00 PM in Peru.
export type AvanzaMeridiem = 'AM' | 'PM';

export function avanzaSplitDateTime(iso: string) {
  const wall = avanzaDateTimeInput(iso);
  const [date, time] = wall.split('T');
  const hour = Number(time?.slice(0, 2));
  return {
    date: date ? date.split('-').reverse().join('/') : '',
    time: time ? `${String(hour % 12 || 12).padStart(2, '0')}:${time.slice(3, 5)}` : '12:00',
    meridiem: (hour >= 12 ? 'PM' : 'AM') as AvanzaMeridiem,
  };
}

export function avanzaDateTextToIso(date: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date);
  if (!match) return null;
  const value = `${match[3]}-${match[2]}-${match[1]}`;
  return avanzaInputToIso(`${value}T12:00`) ? value : null;
}

export function avanzaTimeTextTo24(time: string, meridiem: AvanzaMeridiem): string | null {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return null;
  const hour = Number(match[1]), minute = Number(match[2]);
  if (hour < 1 || hour > 12 || minute > 59) return null;
  return `${String(hour % 12 + (meridiem === 'PM' ? 12 : 0)).padStart(2, '0')}:${match[2]}`;
}

export function avanzaSplitInputToIso(date: string, time: string, meridiem: AvanzaMeridiem, reference?: string | null): string | null {
  const isoDate = avanzaDateTextToIso(date), isoTime = avanzaTimeTextTo24(time, meridiem);
  if (!isoDate || !isoTime) return null;
  if (reference) {
    const previous = avanzaSplitDateTime(reference);
    if (date === previous.date && time === previous.time && meridiem === previous.meridiem) return reference;
  }
  return avanzaInputToIso(`${isoDate}T${isoTime}`);
}

export function avanzaDownloadHistoryKey(userId: string, semesterId: string, groupIds: string[]) {
  const groups = [...new Set(groupIds)].sort((a, b) => Number(a) - Number(b));
  return `avanza-registro:last-download:v1:${encodeURIComponent(userId)}:${semesterId}:${groups.join(',') || 'todos'}`;
}

export function avanzaDateTimeInput(iso: string): string {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: string) => parts.find(part => part.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`;
}

export function avanzaInputToIso(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value)) return null;
  // Peru uses UTC-05:00 throughout the year, independent of the device timezone.
  const date = new Date(`${value.length === 16 ? value + ':00' : value}-05:00`);
  if (!Number.isFinite(date.getTime()) || avanzaDateTimeInput(date.toISOString()) !== (value.length === 16 ? value + ':00' : value)) return null;
  return date.toISOString();
}
