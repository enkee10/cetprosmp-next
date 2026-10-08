import assert from 'node:assert/strict';
import { cleanName, splitItems, dateCandidates, resolveDate, matchRecord, allowedDay, groupPeriod, scheduleSessions } from './silabus-model.mjs';

assert.equal(cleanName('1.- Sesi\u00f3n 3: UC1 C2 I3 Aplicando normas de bioseguridad'), 'Aplicando normas de bioseguridad');
assert.equal(cleanName('C3-I1 Preparando el taller'), 'Preparando el taller');
assert.deepEqual(splitItems('- T\u00e9cnicas de pre-elaboraci\u00f3n\n- Material; conservaci\u00f3n'), ['T\u00e9cnicas de pre-elaboraci\u00f3n', 'Material; conservaci\u00f3n']);
assert.deepEqual(splitItems('- Word - Excel - PowerPoint'), ['Word', 'Excel', 'PowerPoint']);
assert.deepEqual(dateCandidates('13/10//2026'), ['2026-10-13']);
assert.deepEqual(dateCandidates('24-09 -26'), ['2026-09-24']);
assert.deepEqual(dateCandidates('16 de marzo'), ['2026-03-16']);
assert.deepEqual(dateCandidates('2026-09-31'), []);
assert.equal(resolveDate('2026-09-207', { start: '2026-08-24', end: '2026-09-07' }), '2026-09-07');
assert.equal(resolveDate('2026-09-207'), null);
assert.equal(matchRecord('Otro indicador', [{ id: 1, descripcion: 'Prepara herramientas' }, { id: 2, descripcion: 'Realiza el corte' }], 'descripcion', 1).id, 2);
assert.equal(allowedDay('2026-08-14', [2, 4, 5], '2026-08-10'), true);
assert.equal(allowedDay('2026-08-14', [1, 3, 5], '2026-08-10'), false);
assert.equal(allowedDay('2026-08-21', [1, 3, 5], '2026-08-10'), true);
assert.equal(allowedDay('2026-08-21', [2, 4, 5], '2026-08-10'), false);
assert.equal(allowedDay('2026-08-21', [2, 4], '2026-08-10'), false);
assert.deepEqual(groupPeriod({ nombre: 'Pintura (oct-dic) [Manana]' }, '2026-08-10', '2026-12-23'), { start: '2026-10-01', end: '2026-12-23' });
const rules = { start: '2026-08-10', end: '2026-08-28', semesterStart: '2026-08-10', days: [2, 4, 5], horaInicio: '17:45', horaFin: '22:15' };
const sessions = [{ row: 2, fecha: '2026-08-10', duracion: 6 }, { row: 3, fecha: '2026-08-11', duracion: 3 }, { row: 4, fecha: '2026-08-11', duracion: 6 }];
const result = scheduleSessions(sessions, rules);
assert.equal(result.issues.length, 0);
for (const row of sessions) assert.equal(result.sessions.filter(v => v.row === row.row).reduce((n, v) => n + v.minutos, 0), row.duracion * 45);
assert.equal(result.sessions.filter(v => v.row === 4).length, 1, 'A six-hour session should stay within one turn');
for (const block of result.sessions) {
  const local = new Date(Date.parse(block.inicio) - 5 * 3600000).toISOString();
  assert.ok(allowedDay(local.slice(0, 10), rules.days, rules.semesterStart));
  assert.ok(block.fin <= new Date(`${local.slice(0, 10)}T22:15:00-05:00`).toISOString());
}
for (let i = 1; i < result.sessions.length; i++) assert.ok(result.sessions[i].inicio >= result.sessions[i - 1].fin);
const crowded = scheduleSessions(Array.from({ length: 8 }, (_, i) => ({ row: i, fecha: '2026-08-28', duracion: 6 })), rules);
assert.equal(crowded.issues.length, 0, 'Reserve space for later sessions when preferred dates are late');
const holiday = scheduleSessions([{ row: 1, fecha: '2026-08-14', duracion: 6 }], { ...rules, holidays: new Set(['2026-08-14']) });
assert.ok(holiday.sessions.every(v => !v.inicio.startsWith('2026-08-14')));
console.log('Silabus: limpieza, listas, fechas, posiciones, viernes alternos, duraciones y franjas verificados.');
