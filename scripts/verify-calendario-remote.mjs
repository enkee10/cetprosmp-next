import assert from 'node:assert/strict';
process.env.GOOGLE_CLOUD_PROJECT = 'cetprosmp-2026';
delete process.env.DATA_CONNECT_EMULATOR_HOST;
delete process.env.FIREBASE_DATA_CONNECT_EMULATOR_HOST;
const { getCalendarioAgenda, previewProgramacionHoraria } = await import('../functions/lib/modules/calendarios/agenda.js');
const context = { auth: { uid: 'calendar-readonly-verification', token: { level: 600, roleId: 600 } } };
const result = await getCalendarioAgenda.run({ inicio: '2026-01-01T05:00:00Z', fin: '2027-01-01T05:00:00Z' }, context);
const calendar = result.calendarios.find(row => row.titulo === 'Calendario general — Feriados Perú 2026');
assert.ok(calendar);
const holidays = result.eventos.filter(row => row.calendarioId === calendar.id && row.tipoEvento === 'feriado');
assert.equal(holidays.length, 16);
assert.ok(holidays.every(row => row.todoElDia && !row.computaHoras));
const preview = await previewProgramacionHoraria.run({ titulo: 'Verificación sin guardar', calendarioId: calendar.id,
  horasObjetivo: 5, minutosHoraAcademica: 60, minutosSesion: 60, fechaInicio: '2026-10-05', fechaFin: '2026-10-20',
  diasSemana: [1, 2, 3, 4, 5], horaInicio: '08:00', horaFin: '12:00', excluirFeriados: true, evitarCruces: true }, context);
assert.equal(preview.completa, true);
assert.equal(preview.horasProgramadas, 5);
assert.ok(preview.omitidos.some(row => row.fecha === '2026-10-08' && row.motivo === 'Feriado'));
if (process.argv.includes('--http')) {
  for (const name of ['getCalendarioAgenda', 'previewProgramacionHoraria', 'createProgramacionHoraria']) {
    const response = await fetch(`https://us-central1-cetprosmp-2026.cloudfunctions.net/${name}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: {} }),
    });
    assert.equal(response.status, 401, `${name}: accesible al cliente con autenticación obligatoria`);
    assert.equal((await response.json()).error.status, 'UNAUTHENTICATED');
  }
}
if (process.argv.includes('--hosting')) {
  for (const host of ['https://cetprosmp-2026.web.app', 'https://cetprosmp.edu.pe']) {
    const response = await fetch(`${host}/intranet/calendario`);
    assert.equal(response.status, 200, `${host}: ruta de Calendario publicada`);
    assert.ok((await response.text()).includes('calendario'), `${host}: contiene la ruta del módulo`);
  }
}
console.log(JSON.stringify({ destino: 'produccion', calendarioId: calendar.id, feriados: holidays.length,
  previsualizacion: '5 horas exactas y exclusión del feriado del 8 de octubre', escrituras: 0,
  funcionesHTTP: process.argv.includes('--http'), hosting: process.argv.includes('--hosting') }));
