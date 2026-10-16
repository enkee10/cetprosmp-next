const assert = require('node:assert/strict');
const weekday = date => new Date(`${date}T12:00:00Z`).getUTCDay();

function scheduleDay(date, days, semesterStart, semesterTitle, first) {
  const wd = weekday(date);
  if (!days.includes(wd)) return false;
  const key = [...days].sort().join(',');
  if (wd !== 5 || !['1,3,5', '2,4,5'].includes(key)) return true;
  const anchor = Date.parse(`${semesterStart.slice(0, 10)}T12:00:00Z`);
  const firstFriday = anchor + ((5 - weekday(semesterStart.slice(0, 10)) + 7) % 7) * 86400000;
  const index = Math.round((Date.parse(`${date}T12:00:00Z`) - firstFriday) / 604800000);
  const parity = first === 'primer' ? 0 : first === 'segundo' ? 1
    : String(semesterTitle).trim().endsWith('1') ? Number(key !== '1,3,5') : Number(key !== '2,4,5');
  return ((index % 2) + 2) % 2 === parity;
}

/** Preserve phase totals; recover removed dates equally on eligible dates, to the second. */
function rebalanceSlots(input, allowed, fromDate = '') {
  const slots = input.filter(s => allowed(s.date)).map(s => ({ ...s }));
  const removed = input.filter(s => !allowed(s.date));
  const extensions = [];
  for (const phase of new Set(removed.map(s => s.phase))) {
    const seconds = Math.round(removed.filter(s => s.phase === phase).reduce((n, s) => n + s.minutes * 60, 0));
    let pool = slots.filter(s => s.phase === phase && s.date >= fromDate);
    if (!pool.length) pool = slots.filter(s => s.phase === phase);
    assert(pool.length, `No hay jornadas válidas para recuperar la fase ${phase}.`);
    // One allocation per day, even when a day has multiple curriculum segments.
    const dates = [...new Set(pool.map(s => s.date))].sort();
    dates.forEach((date, i) => {
      const extraSeconds = Math.floor(seconds / dates.length) + Number(i < seconds % dates.length);
      const slot = pool.filter(s => s.date === date).sort((a, b) => b.offset - a.offset)[0];
      slot.minutes += extraSeconds / 60;
      extensions.push({ date, phase, extraSeconds });
    });
  }
  // Keep curriculum and practice consecutive on mixed days, with no overlap.
  for (const date of new Set(slots.map(s => s.date))) {
    const day = slots.filter(s => s.date === date).sort((a, b) => a.offset - b.offset);
    let offset = day[0].offset;
    for (const slot of day) { slot.offset = offset; offset += slot.minutes; }
  }
  return { slots: slots.sort((a, b) => a.date.localeCompare(b.date) || a.offset - b.offset), removed, extensions };
}

module.exports = { scheduleDay, rebalanceSlots };
