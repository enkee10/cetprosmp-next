const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

if (!process.env.PERU_DATE_TEST_CHILD) {
  for (const TZ of ['UTC', 'America/Lima', 'Asia/Tokyo', 'America/Los_Angeles']) {
    const result = spawnSync(process.execPath, [__filename], {
      env: { ...process.env, TZ, PERU_DATE_TEST_CHILD: '1', GCLOUD_PROJECT: 'demo-peru-dates-test' }, encoding: 'utf8',
    });
    assert.equal(result.status, 0, `${TZ}: ${result.stdout}\n${result.stderr}`);
    console.log(`${TZ}: fechas, horas, turnos y cierre semestral correctos.`);
  }
} else {
  const dates = require('../functions/lib/shared/appDateTime.js');
  const mappers = require('../functions/lib/modules/core/userMappers.js');
  const { buildMatriculaSchedule } = require('../functions/lib/modules/core/matriculaSchedule.js');
  const { generateEventoOcurrencias } = require('../functions/lib/modules/calendarios/handlers.js');
  assert.equal(dates.appTimestampIso('2026-12-23'), '2026-12-23T05:00:00.000Z');
  assert.equal(mappers.asNullableTimestamp('2026-12-23T08:30'), '2026-12-23T13:30:00.000Z');
  assert.equal(mappers.asNullableTimestamp('2026-12-23T23:30'), '2026-12-24T04:30:00.000Z');
  assert.equal(dates.toDateTimeLocalInputValue('2026-12-24T04:30:00.000000Z'), '2026-12-23T23:30');
  assert.equal(dates.appTimestampIso('2026-12-23T08:30-05:00'), '2026-12-23T13:30:00.000Z');
  for (const invalid of ['2026-02-30', '2026-12-23T24:00', '2026-12-23T08:61', 'invalid']) {
    assert.equal(dates.appTimestampIso(invalid), null);
  }
  for (const day of ['2026-12-23', '2026-12-23T00:00:00Z', '2026-12-23T00:00:00.000000Z', '2026-12-23T05:00:00.000Z']) {
    assert.equal(dates.formatDateOnly(day), '23/12/2026');
    assert.equal(dates.toDateOnlyInputValue(day), '2026-12-23');
    assert.equal(dates.isCalendarPeriodFinished(day, new Date('2026-12-24T04:59:59.999Z')), false);
    assert.equal(dates.isCalendarPeriodFinished(day, new Date('2026-12-24T05:00:00Z')), true);
  }
  assert.equal(dates.isCalendarPeriodActive({ inicio: '2026-08-10', fin: '2026-12-23' }, new Date('2026-08-10T04:59:59Z')), false);
  assert.equal(dates.isCalendarPeriodActive({ inicio: '2026-08-10', fin: '2026-12-23' }, new Date('2026-12-24T04:59:59Z')), true);
  assert.equal(dates.isCalendarPeriodFinished(null), false);
  assert.equal(dates.toDateOnlyInputValue('2026-12-24T04:59:59.000000Z'), '2026-12-23', 'Existing calendar end-of-day instants retain the Peru date');
  assert.equal(dates.calendarDayEndExclusive('2026-12-24T04:59:59.000000Z'), Date.parse('2026-12-24T05:00:00Z'));
  assert.equal(dates.formatDateOnly('2026-12-24T04:59:59.000000Z'), '23/12/2026');
  assert.equal(dates.dayInAppTimeZone(new Date('2027-01-01T02:00:00Z')), '2026-12-31');
  assert.equal(dates.formatInstantDateInAppTimeZone('2026-12-23T00:00:00.000000Z'), '22/12/2026', 'A real registration instant must not use the legacy date-only convention');
  assert.equal(dates.ageInAppTimeZone('2000-01-01', new Date('2027-01-01T02:00:00Z')), 26);
  const legacyTurno = { horaInicio: '1970-01-01T08:30:00.000000Z', horaFin: '1970-01-01T12:30:00Z' };
  const newTurno = mappers.buildTurnoDataFromInput(legacyTurno);
  assert.equal(dates.toTimeOnlyInputValue(newTurno.horaInicio), '08:30');
  assert.equal(newTurno.horaInicio, '2000-01-01T13:30:00.000Z');
  assert.equal(mappers.buildTurnoDataFromInput(newTurno).horaInicio, newTurno.horaInicio, 'Saving twice must not shift the time');
  for (const turno of [legacyTurno, newTurno]) {
    const schedule = buildMatriculaSchedule({ id: 1, grupoId: 1, moduloId: 1, grupo: {
      id: 1, turno, horario: { diasSemana: '1' }, semestre: { inicio: '2026-05-01', fin: '2026-05-31' },
    } });
    assert.equal(schedule.startMinute, 510);
    const occurrences = generateEventoOcurrencias({ calendarioId: 1, fechaInicio: '2026-05-04T13:30:00Z', fechaFin: '2026-05-04T17:30:00Z' },
      { eventoId: 1, frecuencia: 'semanal', diasSemana: '1', fechaInicio: '2026-05-04T13:30:00Z', cantidadOcurrencias: 2 },
      1, '2026-05-01T00:00:00Z', { diasSemana: '1' }, turno);
    assert.deepEqual(occurrences.map(row => dates.toDateTimeLocalInputValue(row.fechaInicio)), ['2026-05-04T08:30', '2026-05-11T08:30']);
    assert.equal(dates.toDateTimeLocalInputValue(occurrences[0].fechaFin), '2026-05-04T12:30');
  }
}
