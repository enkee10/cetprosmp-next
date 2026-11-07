/** Shared by the browser and Functions. Never depend on the machine's time zone. */
export const APP_LOCALE = 'es-PE';
export const APP_TIME_ZONE = 'America/Lima';
export const APP_UTC_OFFSET = '-05:00';
export const DAY_MS = 86400000;

const dayPattern = /^(\d{4})-(\d{2})-(\d{2})(?:$|T|\s)/;
const legacyCalendarTimestamp = /^\d{4}-\d{2}-\d{2}T00:00:00(?:\.0+)?(?:Z|\+00:00)$/i;

/** Academic dates and birthdays retain their selected day, including old UTC-midnight values. */
export function getDateOnlyParts(value: string | null | undefined) {
  const match = dayPattern.exec(String(value ?? '').trim());
  if (!match) return null;
  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return { year, month, day };
}

export function toDateOnlyInputValue(value: string | null | undefined): string {
  const raw = String(value ?? '').trim();
  if (!getDateOnlyParts(raw)) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw) || legacyCalendarTimestamp.test(raw)) return raw.slice(0, 10);
  return dayInAppTimeZone(raw);
}

/** Native date-picker adapter only; this Date does not represent a real instant. */
export function getDateOnlyLocalDate(value: string | null | undefined) {
  const parts = getDateOnlyParts(toDateOnlyInputValue(value));
  return parts ? new Date(parts.year, parts.month - 1, parts.day) : null;
}

/** Offset-free form values are Peru wall time. Explicit offsets already identify an instant. */
export function appTimestampIso(value: string | null | undefined): string | null {
  const raw = String(value ?? '').trim();
  if (!getDateOnlyParts(raw)) return null;
  let source = raw;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) source = `${raw}T00:00:00${APP_UTC_OFFSET}`;
  else {
    if (!/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})?$/i.test(raw)) return null;
    if (!/(?:Z|[+-]\d{2}:\d{2})$/i.test(raw)) source += APP_UTC_OFFSET;
  }
  const date = new Date(source);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

const instantDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
});
const instantTime = new Intl.DateTimeFormat('en-GB', {
  timeZone: APP_TIME_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

export function dayInAppTimeZone(value: string | Date = new Date()): string {
  const date = value instanceof Date ? value : new Date(appTimestampIso(value) ?? NaN);
  return Number.isFinite(date.getTime()) ? instantDay.format(date) : '';
}

export function toDateTimeLocalInputValue(value: string | null | undefined): string {
  const iso = appTimestampIso(value);
  if (!iso) return '';
  const date = new Date(iso);
  return `${instantDay.format(date)}T${instantTime.format(date)}`;
}

export function formatDateOnly(value: string | null | undefined, options?: Intl.DateTimeFormatOptions): string {
  const raw = String(value ?? '').trim();
  const calendarOnly = /^\d{4}-\d{2}-\d{2}$/.test(raw) || legacyCalendarTimestamp.test(raw);
  const iso = appTimestampIso(calendarOnly ? toDateOnlyInputValue(raw) : raw);
  if (!iso) return '';
  return new Intl.DateTimeFormat(APP_LOCALE, { ...options, timeZone: APP_TIME_ZONE }).format(new Date(iso));
}

export function formatDateTimeInAppTimeZone(value: string | null | undefined, options?: Intl.DateTimeFormatOptions): string {
  const iso = appTimestampIso(value);
  if (!iso) return value ?? '';
  const explicit = options && Object.keys(options).some(key => key !== 'timeZone');
  return new Intl.DateTimeFormat(APP_LOCALE, {
    ...(explicit ? {} : { dateStyle: 'short', timeStyle: 'short' }), ...options, timeZone: APP_TIME_ZONE,
  }).format(new Date(iso));
}

/** Date portion of a real instant (registrations/publications), including UTC midnight. */
export function formatInstantDateInAppTimeZone(value: string | null | undefined, options?: Intl.DateTimeFormatOptions): string {
  const iso = appTimestampIso(value);
  return iso ? new Intl.DateTimeFormat(APP_LOCALE, { ...options, timeZone: APP_TIME_ZONE }).format(new Date(iso)) : '';
}

/** Midnight in Peru for a calendar date, not midnight in the host's time zone. */
export function dateOnlyTimestamp(value: string | null | undefined): number | null {
  const iso = appTimestampIso(toDateOnlyInputValue(value));
  return iso ? Date.parse(iso) : null;
}

export function calendarDayEndExclusive(value: string | null | undefined): number | null {
  const start = dateOnlyTimestamp(value);
  return start === null ? null : start + DAY_MS;
}

export function isCalendarPeriodActive(period: { inicio?: string | null; fin?: string | null }, now = new Date()): boolean {
  const start = dateOnlyTimestamp(period.inicio), end = calendarDayEndExclusive(period.fin);
  return (start === null || now.getTime() >= start) && (end === null || now.getTime() < end);
}

export function isCalendarPeriodFinished(fin: string | null | undefined, now = new Date()): boolean {
  const end = calendarDayEndExclusive(fin);
  return end !== null && now.getTime() >= end;
}

export function ageInAppTimeZone(birth: string | null | undefined, now = new Date()): number | null {
  const born = getDateOnlyParts(birth), today = getDateOnlyParts(dayInAppTimeZone(now));
  if (!born || !today) return null;
  const birthdayPassed = today.month > born.month || (today.month === born.month && today.day >= born.day);
  const age = today.year - born.year - (birthdayPassed ? 0 : 1);
  return age >= 0 ? age : null;
}

/** Legacy turnos used 1970-01-01THH:mmZ as a clock value. New values use a distinct reference date. */
export function toTimeOnlyInputValue(value: string | null | undefined, includeSeconds = false): string {
  if (!value) return '';
  let time: string;
  if (/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) time = value;
  else if (/^1970-01-01T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/i.test(value)) time = value.slice(11, 16);
  else time = toDateTimeLocalInputValue(value).slice(11, 16);
  if (!time || !includeSeconds) return time;
  const seconds = /T\d{2}:\d{2}:([0-5]\d(?:\.\d+)?)/.exec(value)?.[1] ?? '00';
  return `${time}:${seconds}`;
}

export function timeOnlyTimestamp(value: string | null | undefined): string | null {
  const time = toTimeOnlyInputValue(value, true);
  return time ? appTimestampIso(`2000-01-01T${time}`) : null;
}
