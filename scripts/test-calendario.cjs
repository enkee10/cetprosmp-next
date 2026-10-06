const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const { validateRules, distributeHours } = require('../functions/lib/modules/calendarios/scheduling.js');
process.env.GOOGLE_CLOUD_PROJECT = 'cetprosmp-2026';
const { generateEventoOcurrencias } = require('../functions/lib/modules/calendarios/handlers.js');
const source = fs.readFileSync('src/lib/calendar.ts', 'utf8');
const utility = { exports: {} };
new Function('module', 'exports', ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(utility, utility.exports);
const { dayInLima, dayStart, localInputInLima, limaInputToIso, monthDays, visibleDays, countedMinutes, dayEventLayout } = utility.exports;
const rules = validateRules({ titulo: 'Sesiones', calendarioId: 1, horasObjetivo: 2.5, minutosHoraAcademica: 60,
  minutosSesion: 120, fechaInicio: '2026-05-04', fechaFin: '2026-05-10', diasSemana: [1, 2, 3, 4, 5], horaInicio: '08:00', horaFin: '12:00' });
const normal = distributeHours(rules, new Set(), []);
assert.deepEqual(normal.sesiones.map(row => row.minutos), [120, 30]);
assert.equal(normal.horasProgramadas, 2.5);
assert.equal(normal.completa, true);
const holidays = distributeHours({ ...rules, fechaInicio: '2026-05-01', diasSemana: [5], horasObjetivo: 2 }, new Set(['2026-05-01']), []);
assert.equal(dayInLima(holidays.sesiones[0].fechaInicio), '2026-05-08');
assert.equal(holidays.omitidos[0].motivo, 'Feriado');
const clashes = distributeHours(rules, new Set(), [{ inicio: '2026-05-04T08:00:00-05:00', fin: '2026-05-04T09:00:00-05:00' }]);
assert.equal(dayInLima(clashes.sesiones[0].fechaInicio), '2026-05-05');
assert.equal(clashes.omitidos[0].motivo, 'Cruce de horario');
const adjacent = distributeHours(rules, new Set(), [{ inicio: '2026-05-04T07:00:00-05:00', fin: '2026-05-04T08:00:00-05:00' }]);
assert.equal(adjacent.sesiones.length, 2);
assert.equal(adjacent.omitidos.length, 0);
assert.equal(distributeHours({ ...rules, horasObjetivo: 10, fechaFin: rules.fechaInicio }, new Set(), []).horasPendientes, 8);
assert.equal(distributeHours({ ...rules, minutosHoraAcademica: 45, horasObjetivo: 4, minutosSesion: 90 }, new Set(), []).horasProgramadas, 4);
for (const patch of [{ fechaInicio: '2026-02-30' }, { fechaFin: '2026-01-01' }, { minutosSesion: 500 }, { diasSemana: [] }, { minutosHoraAcademica: 0 }, { horasObjetivo: 0.001 }, { calendarioId: -1 }, { grupoModuloId: 'x' }]) {
  assert.throws(() => validateRules({ ...rules, ...patch }));
}
assert.equal(dayInLima('2026-05-05T02:00:00Z'), '2026-05-04');
assert.equal(localInputInLima('2026-05-05T02:00:00Z'), '2026-05-04T21:00');
assert.equal(limaInputToIso('2026-05-04T21:00'), '2026-05-05T02:00:00.000Z');
assert.equal(monthDays('2026-05-01').length, 42);
assert.equal(visibleDays('2026-05-06', 'semana')[0], '2026-05-04');
const event = { id: '1', fechaInicio: '2026-05-04T23:00:00-05:00', fechaFin: '2026-05-05T01:00:00-05:00', computaHoras: true, minutosHoraAcademica: 60 };
assert.equal(countedMinutes(event, dayStart('2026-05-04'), dayStart('2026-05-05')), 60);
assert.equal(countedMinutes({ ...event, estado: 'cancelado' }, 0, Infinity), 0);
assert.equal(countedMinutes({ ...event, tipoEvento: 'feriado' }, 0, Infinity), 0);
assert.equal(countedMinutes({ ...event, todoElDia: true }, 0, Infinity), 0);
assert.equal(countedMinutes({ ...event, computaHoras: false }, 0, Infinity), 0);
const overlap = dayEventLayout([
  { ...event, id: '1', fechaInicio: '2026-05-04T08:00:00-05:00', fechaFin: '2026-05-04T10:00:00-05:00' },
  { ...event, id: '2', fechaInicio: '2026-05-04T09:00:00-05:00', fechaFin: '2026-05-04T11:00:00-05:00' },
  { ...event, id: '3', fechaInicio: '2026-05-04T11:00:00-05:00', fechaFin: '2026-05-04T12:00:00-05:00' },
], '2026-05-04');
assert.deepEqual(overlap.map(row => row.columns), [2, 2, 1]);
const recurring = generateEventoOcurrencias({ calendarioId: 1, fechaInicio: '2026-05-05T02:00:00Z', fechaFin: '2026-05-05T03:00:00Z' },
  { eventoId: 1, frecuencia: 'semanal', diasSemana: '1', fechaInicio: '2026-05-05T02:00:00Z', cantidadOcurrencias: 2 }, 1, new Date().toISOString());
assert.deepEqual(recurring.map(row => dayInLima(row.fechaInicio)), ['2026-05-04', '2026-05-11']);
const legacy = generateEventoOcurrencias({ calendarioId: 1, fechaFin: '2026-05-05T03:00:00Z' },
  { eventoId: 1, frecuencia: 'diaria', fechaInicio: '2026-05-05T02:00:00Z', cantidadOcurrencias: 1 }, 1, new Date().toISOString());
assert.equal(Date.parse(legacy[0].fechaFin) - Date.parse(legacy[0].fechaInicio), 3600000);
console.log('Calendario: distribución exacta, horas académicas, feriados, cruces, límites, zona Lima, recurrencias, suma por periodo y disposición de eventos verificados.');
