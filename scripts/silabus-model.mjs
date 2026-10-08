export const text = value => String(value ?? '').replace(/\s+/g, ' ').trim();
export const normalize = value => text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export function cleanName(value) {
  let result = text(value), previous;
  do {
    previous = result;
    result = result.replace(/^[\s\u2022\u25cf\u25aa*\-\u2013\u2014]+/, '')
      .replace(/^(?:\d+(?:\.\d+)*\s*[.)\-:]\s*|\d+\s*\.\s*-\s*)/, '')
      .replace(/^(?:(?:UC|CE|C|I|UD|S|ACT)\s*\d+(?:\.\d+)*\s*[:.\-]?\s*)+/i, '')
      .replace(/^(?:sesi[o\u00f3]n(?:\s+de\s+aprendizaje)?|actividad(?:\s+de\s+aprendizaje)?|nombre(?:\s+de\s+la\s+sesi[o\u00f3]n)?|t[i\u00ed]tulo|unidad\s+did[a\u00e1]ctica|capacidad|indicador)\s*(?:(?:n[.\u00b0\u00ba]?\s*)?\d+\s*)?[:.\-]\s*/i, '')
      .replace(/^[\p{L}]+\s*:\s*/u, '').trim();
  } while (result !== previous);
  return result;
}

export function splitItems(value) {
  const source = String(value ?? '').replace(/\r\n?/g, '\n').trim();
  if (!source) return [];
  const marked = source.split(/(?:^|\n|\s+)[\u2022\u25cf\u25aa*\-\u2013\u2014]\s+/).filter(v => v.trim());
  return (marked.length > 1 ? marked : source.split('\n'))
    .map(v => text(v).replace(/^[\u2022\u25cf\u25aa*\-\u2013\u2014]\s*/, '')).filter(Boolean);
}

export function similarity(a, b) {
  a = normalize(cleanName(a)); b = normalize(cleanName(b));
  if (!a || !b) return 0;
  if (a === b) return 1;
  const aa = new Set(a.split(' ')), bb = new Set(b.split(' '));
  const overlap = [...aa].filter(v => bb.has(v)).length;
  const token = 2 * overlap / (aa.size + bb.size);
  let prior = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) next[j] = Math.min(next[j - 1] + 1, prior[j] + 1, prior[j - 1] + (a[i - 1] !== b[j - 1]));
    prior = next;
  }
  return token * .55 + (1 - prior[b.length] / Math.max(a.length, b.length)) * .45;
}

export function matchRecord(source, candidates, field, position, threshold = .68) {
  const ranked = candidates.map(record => ({ record, score: similarity(source, record[field]) })).sort((a, b) => b.score - a.score);
  const best = ranked[0];
  if (best && best.score >= threshold && (!ranked[1] || best.score - ranked[1].score > .07)) {
    return { id: best.record.id, method: best.score === 1 ? 'exact' : 'similarity', score: best.score };
  }
  if (position != null && candidates[position]) return { id: candidates[position].id, method: 'position', score: best?.score ?? 0 };
  return { id: null, method: 'unresolved', score: best?.score ?? 0, candidate: best?.record.id };
}

const pad = value => String(value).padStart(2, '0');
export const addDays = (day, count) => new Date(Date.parse(`${day}T12:00:00Z`) + count * 86400000).toISOString().slice(0, 10);
export const weekday = day => new Date(`${day}T12:00:00Z`).getUTCDay();
export function validDate(year, month, day) {
  const result = `${year}-${pad(month)}-${pad(day)}`;
  return /^\d{4}-\d{2}-\d{2}$/.test(result) && Number.isFinite(Date.parse(result))
    && new Date(`${result}T12:00:00Z`).toISOString().startsWith(result) ? result : null;
}

export function dateCandidates(value, year = 2026) {
  if (value instanceof Date) return [validDate(year, value.getUTCMonth() + 1, value.getUTCDate())].filter(Boolean);
  if (typeof value === 'number') return dateCandidates(new Date(Date.UTC(1899, 11, 30) + Math.round(value) * 86400000), year);
  const raw = text(value).replace(/\s*([/.\-])\s*/g, '$1').replace(/\/{2,}/g, '/');
  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,3})(?:T.*)?$/);
  const local = raw.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2}|\d{4})$/);
  const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const named = normalize(raw).match(/^(\d{1,2}) (?:de )?([a-z]+)(?: (?:de )?\d{2,4})?$/);
  if (named) return [validDate(year, months.indexOf(named[2].replace('setiembre', 'septiembre')) + 1, Number(named[1]))].filter(Boolean);
  if (!iso && !local) return [];
  const month = Number(iso ? iso[2] : local[2]), day = iso ? iso[3] : local[1];
  const exact = validDate(year, month, Number(day));
  if (exact) return [exact];
  if (day.length === 3) return [...new Set([...day].map((_, i) => validDate(year, month, Number(day.slice(0, i) + day.slice(i + 1)))).filter(Boolean))];
  return [];
}

export function resolveDate(value, { start, end, previous, next } = {}) {
  let candidates = dateCandidates(value);
  if (candidates.length === 1) return candidates[0];
  if (start && end) candidates = candidates.filter(d => d >= start && d <= end);
  if (previous && next && previous <= next) candidates = candidates.filter(d => d >= previous && d <= next);
  return candidates.length === 1 ? candidates[0] : null;
}

export function allowedDay(day, days, semesterStart) {
  const wd = weekday(day);
  if (!days.includes(wd)) return false;
  const key = [...days].sort().join(',');
  if (wd !== 5 || !['1,3,5', '2,4,5'].includes(key)) return true;
  let firstFriday = semesterStart;
  while (weekday(firstFriday) !== 5) firstFriday = addDays(firstFriday, 1);
  const index = Math.round((Date.parse(day) - Date.parse(firstFriday)) / (7 * 86400000));
  return index % 2 === (key === '2,4,5' ? 0 : 1);
}

// Turno timestamps store wall-clock times, as written by TurnoForm, not actual instants.
export const turnoTime = timestamp => timestamp ? new Date(timestamp).toISOString().slice(11, 16) : null;
export const atLima = (day, time) => new Date(`${day}T${time}:00-05:00`).toISOString();

export function groupPeriod(group, semesterStart, semesterEnd) {
  const suffix = normalize(group.sufijo || group.nombre);
  const period = suffix.match(/\b(ago|oct) (oct|dic)\b/);
  const months = { ago: 8, oct: 10, dic: 12 };
  const start = group.inicio?.slice(0, 10) || (period ? validDate(2026, months[period[1]], 1) : semesterStart);
  const end = group.fin?.slice(0, 10) || (period ? new Date(Date.UTC(2026, months[period[2]], 0)).toISOString().slice(0, 10) : semesterEnd);
  return { start: start < semesterStart ? semesterStart : start, end: end > semesterEnd ? semesterEnd : end };
}

export function scheduleSessions(sessions, { start, end, semesterStart, days, horaInicio, horaFin, holidays = new Set(), occupiedMinutes = new Map() }) {
  const minutes = time => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  const capacity = minutes(horaFin) - minutes(horaInicio);
  if (capacity <= 0 || !days.length) throw new Error('Horario o turno incompleto.');
  const available = [];
  for (let day = start; day <= end; day = addDays(day, 1)) if (allowedDay(day, days, semesterStart) && !holidays.has(day)) available.push(day);
  const occupied = new Map(occupiedMinutes), result = [], issues = [];
  let lastDay = start;
  for (const session of sessions) {
    let remaining = session.duracion * 45, segmento = 0;
    const target = session.fecha < start ? start : session.fecha > end ? end : session.fecha;
    const later = sessions.slice(sessions.indexOf(session) + 1);
    const laterMinutes = later.reduce((n, v) => n + v.duracion * 45, 0);
    const laterFullSessions = later.filter(v => v.duracion * 45 === capacity).length;
    const candidates = available.filter(d => d >= lastDay && (occupied.get(d) ?? 0) < capacity
      && (remaining > capacity || capacity - (occupied.get(d) ?? 0) >= remaining)
      && available.filter(v => v >= d).reduce((n, v) => n + capacity - (occupied.get(v) ?? 0), 0) >= remaining + laterMinutes
      && (remaining > capacity || available.filter(v => v >= d && !occupied.get(v)).length - (!occupied.get(d) ? 1 : 0) >= laterFullSessions))
      .sort((a, b) => Math.abs(Date.parse(a) - Date.parse(target)) - Math.abs(Date.parse(b) - Date.parse(target)) || a.localeCompare(b));
    let chosen = candidates[0];
    while (remaining > 0 && chosen) {
      const used = occupied.get(chosen) ?? 0;
      const duration = Math.min(remaining, capacity - used);
      const inicio = new Date(Date.parse(atLima(chosen, horaInicio)) + used * 60000).toISOString();
      const fin = new Date(Date.parse(inicio) + duration * 60000).toISOString();
      result.push({ row: session.row, inicio, fin, segmento: ++segmento, minutos: duration });
      occupied.set(chosen, used + duration); remaining -= duration; lastDay = chosen;
      chosen = available.find(d => d >= lastDay && capacity - (occupied.get(d) ?? 0) >= Math.min(remaining, capacity));
    }
    if (remaining) issues.push({ row: session.row, reason: 'Sin espacio dentro del periodo', minutosPendientes: remaining });
  }
  return { sessions: result, issues };
}
