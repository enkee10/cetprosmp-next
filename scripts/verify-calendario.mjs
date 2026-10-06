import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
process.env.GOOGLE_CLOUD_PROJECT = 'cetprosmp-2026';
process.env.DATA_CONNECT_EMULATOR_HOST = '127.0.0.1:9399';
process.env.FIREBASE_DATA_CONNECT_EMULATOR_HOST = '127.0.0.1:9399';
const { dataConnect } = await import('../functions/lib/modules/core/dataConnectCore.js');
const handlers = await import('../functions/lib/modules/calendarios/agenda.js');
const events = await import('../functions/lib/modules/calendarios/handlers.js');
const context = { auth: { uid: 'calendar-verification', token: { level: 600, roleId: 600 } } };
await assert.rejects(() => handlers.getCalendarioAgenda.run({ inicio: '2026-01-01', fin: '2027-01-01' }, {}), error => error.code === 'unauthenticated');
const agenda = await handlers.getCalendarioAgenda.run({ inicio: '2026-01-01T05:00:00Z', fin: '2027-01-01T05:00:00Z' }, context);
const holidayCalendar = agenda.calendarios.find(row => row.titulo === 'Calendario general — Feriados Perú 2026');
assert.ok(holidayCalendar);
assert.equal(agenda.eventos.filter(row => row.calendarioId === holidayCalendar.id && row.tipoEvento === 'feriado').length, 16);
assert.ok(agenda.eventos.filter(row => row.tipoEvento === 'feriado').every(row => row.todoElDia && !row.computaHoras));
const scratch = await dataConnect.executeGraphql('mutation ScratchCalendar($titulo:String!) { calendario_insert(data:{titulo:$titulo,activo:true}) }',
  { variables: { titulo: `Verificación calendario ${randomUUID()}` } });
const calendarioId = scratch.data.calendario_insert.id;
try {
  const rules = { titulo: 'Verificación de horas', calendarioId, horasObjetivo: 5, minutosHoraAcademica: 45,
    minutosSesion: 90, fechaInicio: '2026-05-01', fechaFin: '2026-05-15', diasSemana: [1, 2, 3, 4, 5], horaInicio: '08:00', horaFin: '12:00', excluirFeriados: true, evitarCruces: true };
  const preview = await handlers.previewProgramacionHoraria.run(rules, context);
  assert.equal(preview.completa, true);
  assert.equal(preview.sesiones.length, 3);
  assert.equal(preview.omitidos[0].fecha, '2026-05-01');
  assert.deepEqual(preview.sesiones.map(row => row.minutos), [90, 90, 45]);
  const request = { ...rules, clave: randomUUID(), huella: preview.huella };
  const saved = await handlers.createProgramacionHoraria.run(request, context);
  assert.ok(saved.id);
  const repeat = await handlers.createProgramacionHoraria.run(request, context);
  assert.equal(repeat.id, saved.id);
  assert.equal(repeat.existente, true);
  const after = await handlers.getCalendarioAgenda.run({ inicio: '2026-05-01T05:00:00Z', fin: '2026-06-01T05:00:00Z' }, context);
  const generated = after.eventos.filter(row => row.calendarioId === calendarioId);
  assert.equal(generated.length, 3);
  assert.equal(generated.reduce((sum, row) => sum + (Date.parse(row.fechaFin) - Date.parse(row.fechaInicio)) / (60000 * row.minutosHoraAcademica), 0), 5);
  assert.ok(generated.every(row => row.programacionHorariaId === saved.id));
  const stale = { ...rules, clave: randomUUID(), huella: preview.huella };
  await assert.rejects(() => handlers.createProgramacionHoraria.run(stale, context), error => error.code === 'failed-precondition');
  const insufficient = await handlers.previewProgramacionHoraria.run({ ...rules, fechaInicio: '2026-05-01', fechaFin: '2026-05-01' }, context);
  assert.equal(insufficient.completa, false);
  await assert.rejects(() => handlers.createProgramacionHoraria.run({ ...rules, fechaFin: '2026-05-01', clave: randomUUID(), huella: insufficient.huella }, context), error => error.code === 'failed-precondition');
  await events.createOrUpdateEvento.run({ id: generated[0].eventoId, titulo: generated[0].titulo, calendarioId,
    fechaInicio: generated[0].fechaInicio, fechaFin: generated[0].fechaFin, minutosHoraAcademica: 50, computaHoras: false, relaciones: [] }, context);
  const edited = await events.getEvento.run({ id: generated[0].eventoId }, context);
  assert.equal(edited.evento.minutosHoraAcademica, 50);
  assert.equal(edited.evento.computaHoras, false);
  assert.equal(edited.evento.programacionHorariaId, saved.id);
  const groupModule = agenda.grupoModulos[0];
  if (groupModule) {
    const groupRules = { ...rules, titulo: 'Verificación grupo-módulo', grupoModuloId: groupModule.id,
      horasObjetivo: 1, minutosSesion: 45, fechaInicio: '2026-05-11', fechaFin: '2026-05-15', horaInicio: '21:00', horaFin: '23:00' };
    const groupPreview = await handlers.previewProgramacionHoraria.run(groupRules, context);
    assert.equal(groupPreview.completa, true);
    const groupSaved = await handlers.createProgramacionHoraria.run({ ...groupRules, clave: randomUUID(), huella: groupPreview.huella }, context);
    const groupAgenda = await handlers.getCalendarioAgenda.run({ inicio: '2026-05-01T05:00:00Z', fin: '2026-06-01T05:00:00Z' }, context);
    const session = groupAgenda.eventos.find(row => row.programacionHorariaId === groupSaved.id);
    assert.ok(session.grupoModuloIds.includes(groupModule.id));
    assert.ok(session.grupoIds.includes(groupModule.grupoId));
    const clashAcrossCalendars = await handlers.previewProgramacionHoraria.run({ ...groupRules, calendarioId: holidayCalendar.id }, context);
    assert.ok(clashAcrossCalendars.omitidos.some(row => row.motivo === 'Cruce de horario'));
  }
  const recurring = await events.createOrUpdateEvento.run({ titulo: 'Verificación recurrencia', calendarioId, minutosHoraAcademica: 60, computaHoras: true,
    fechaInicio: '2026-01-05T21:00:00-05:00', fechaFin: '2026-01-05T22:00:00-05:00', relaciones: [],
    recurrencia: { activo: true, frecuencia: 'semanal', intervalo: 1, diasSemana: '1', fechaInicio: '2026-01-05T21:00:00-05:00', cantidadOcurrencias: 2 }, generarOcurrencias: true }, context);
  const january = await handlers.getCalendarioAgenda.run({ inicio: '2026-01-01T05:00:00Z', fin: '2026-02-01T05:00:00Z' }, context);
  const recurringSessions = january.eventos.filter(row => row.eventoId === recurring.id);
  assert.equal(recurringSessions.length, 2, 'No duplicar el evento base y sus ocurrencias.');
  assert.ok(recurringSessions.every(row => row.ocurrenciaId));
  await dataConnect.executeGraphql('mutation CancelOccurrence($id:Int!) { eventoOcurrencia_update(id:$id,data:{estado:"cancelado"}) }', { variables: { id: recurringSessions[0].ocurrenciaId } });
  const afterCancellation = await handlers.getCalendarioAgenda.run({ inicio: '2026-01-01T05:00:00Z', fin: '2026-02-01T05:00:00Z' }, context);
  assert.equal(afterCancellation.eventos.find(row => row.id === recurringSessions[0].id).estado, 'cancelado');
  await assert.rejects(() => events.createOrUpdateEvento.run({ titulo: 'Inválido', calendarioId, fechaInicio: '2026-05-05T12:00:00Z', fechaFin: '2026-05-05T11:00:00Z' }, context), error => error.code === 'invalid-argument');
  console.log(JSON.stringify({ feriados: 16, verificado: ['autenticación', 'agenda anual', 'previsualización', 'persistencia transaccional', 'objetivo exacto de horas', 'idempotencia', 'agenda modificada', 'periodo insuficiente', 'edición de horas', 'vínculo a programación', 'grupo-módulo', 'cruces entre calendarios', 'recurrencias sin duplicados', 'cancelación de ocurrencia'] }));
} finally {
  await dataConnect.executeGraphql('mutation CleanupCalendar($id:Int!) { calendario_delete(id:$id) }', { variables: { id: calendarioId } });
}
