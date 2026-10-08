import assert from 'node:assert/strict';
process.env.DATA_CONNECT_EMULATOR_HOST = '127.0.0.1:9399';
process.env.GOOGLE_CLOUD_PROJECT = 'cetprosmp-2026';
const { dataConnect: dc } = await import('../functions/lib/modules/core/dataConnectCore.js');
const { saveActividadLists, parseActividadList } = await import('../functions/lib/modules/academico/actividadLists.js');
const { getActividad, createOrUpdateActividad, deleteActividad } = await import('../functions/lib/modules/academico/handlers.js');
const { getGrupoModulo } = await import('../functions/lib/modules/grupo-modulos/handlers.js');
const query = async (source, variables) => (await dc.executeGraphql(source, { variables })).data;
const context = { auth: { uid: 'silabus-local-test', token: { level: 600, roleId: 600 } } };
const fixture = await query(`mutation SilabusFixture @transaction {
  m:modulo_insert(data:{titulo:"Silabus test"})
  u:unidadDidactica_insert(data:{nombre:"Silabus test"})
  c:capacidadTerminal_insert(data:{unidadDidacticaId_expr:"response.u.id"})
  i:indicadorCapacidad_insert(data:{capacidadTerminalId_expr:"response.c.id"})
  a:aprendizaje_insert(data:{indicadorCapacidadId_expr:"response.i.id",descripcion:null})
  semester:semestre_insert(data:{titulo:"Silabus test",inicio:"2026-08-10T05:00:00Z",fin:"2026-12-23T05:00:00Z"})
  horario:horario_insert(data:{nombre:"Silabus test",diasSemana:"1,2,3,4,5"})
  turno:turno_insert(data:{nombre:"Silabus test",horaInicio:"1970-01-01T08:30:00Z",horaFin:"1970-01-01T13:00:00Z"})
  group:grupo_insert(data:{semestreId_expr:"response.semester.id",horarioId_expr:"response.horario.id",turnoId_expr:"response.turno.id"})
  gm:grupoModulo_insert(data:{grupoId_expr:"response.group.id",moduloId_expr:"response.m.id",instancia:1})
}`);
try {
  const payload = { nombre: 'Preparando el taller', aprendizajeId: fixture.a.id, moduloId: fixture.m.id, duracion: 6 };
  const id = await saveActividadLists(payload, null, ['Primer contenido', 'Texto; con punto y coma'], ['Material A', 'Material B']);
  let result = (await getActividad.run({ id }, context)).actividad;
  assert.deepEqual(result.contenidos.map(v => v.texto), ['Primer contenido', 'Texto; con punto y coma']);
  assert.deepEqual(result.materiales.map(v => v.texto), ['Material A', 'Material B']);
  const contentIds = result.contenidos.map(v => v.id);
  await createOrUpdateActividad.run({ id, ...payload, materiales: ['Material B', 'Material C'] }, context);
  result = (await getActividad.run({ id }, context)).actividad;
  assert.deepEqual(result.contenidos.map(v => v.id), contentIds, 'Omitted lists must stay intact');
  assert.deepEqual(result.materiales.map(v => v.texto), ['Material B', 'Material C']);
  await assert.rejects(() => saveActividadLists({ ...payload, aprendizajeId: -100000 }, id, [], []));
  result = (await getActividad.run({ id }, context)).actividad;
  assert.equal(result.contenidos.length, 2, 'Failed transaction must preserve both lists');
  await createOrUpdateActividad.run({ id, ...payload, contenidos: [] }, context);
  result = (await getActividad.run({ id }, context)).actividad;
  assert.deepEqual(result.contenidos, []);
  assert.equal(result.materiales.length, 2);
  assert.throws(() => parseActividadList('A; B', 'materiales'));
  assert.throws(() => parseActividadList([null], 'materiales'));
  const { applyPlan, stateQuery } = await import('./import-silabus.mjs');
  let state = await query(stateQuery);
  const semester = state.semestres.find(v => v.id === fixture.semester.id);
  const plan = { semester, issues: [], corrections: [], totals: { sesiones: 2 },
    sessions: [{ row: 1, nombre: 'Import test A', duracion: 6, indicadorId: fixture.i.id, moduloId: fixture.m.id, unidadDidacticaId: fixture.u.id, numeroSesion: 1, orden: 1,
      aprendizaje: '', claveImportacion: `test:${fixture.m.id}:1`, contenidos: ['Contenido A', 'Contenido B'], materiales: ['Material A'] },
    { row: 2, nombre: 'Import test B', duracion: 3, indicadorId: fixture.i.id, moduloId: fixture.m.id, unidadDidacticaId: fixture.u.id, numeroSesion: 2, orden: 2,
      aprendizaje: 'Aprendizaje de prueba', claveImportacion: `test:${fixture.m.id}:2`, contenidos: ['Contenido C'], materiales: ['Material B'] }],
    schedules: [{ grupoModuloId: fixture.gm.id, horarioId: fixture.horario.id, sessions: [
      { row: 1, segmento: 1, inicio: '2026-08-10T13:30:00.000Z', fin: '2026-08-10T18:00:00.000Z' },
      { row: 2, segmento: 1, inicio: '2026-08-11T13:30:00.000Z', fin: '2026-08-11T15:45:00.000Z' },
    ] }] };
  await applyPlan(plan, state);
  state = await query(stateQuery);
  const beforeRepeat = state.actividads.length;
  await applyPlan(plan, state);
  assert.equal((await query(stateQuery)).actividads.length, beforeRepeat, 'Import must not duplicate sessions');
  const storedEvents = await query(`query TestImportedEvents($gm:Int!) {grupoModuloActividades(where:{grupoModuloId:{eq:$gm}}) {evento {minutosHoraAcademica computaHoras}}}`, { gm: fixture.gm.id });
  assert.equal(storedEvents.grupoModuloActividades.length, 2);
  assert.ok(storedEvents.grupoModuloActividades.every(v => v.evento.minutosHoraAcademica === 45 && v.evento.computaHoras));
  const group = (await getGrupoModulo.run({ id: fixture.gm.id }, context)).grupoModulo;
  assert.equal(group.actividades.length, 2);
  assert.equal(group.actividades[0].actividad.contenidos.length, 2);
  const imported = await query(`query TestActivityKey($key:String!) {actividads(where:{claveImportacion:{eq:$key}}) {id}}`, { key: `test:${fixture.m.id}:1` });
  const event = await query(`query TestSessionEvent($id:Int!) {grupoModuloActividades(where:{actividadId:{eq:$id}}) {eventoId}}`, { id: imported.actividads[0].id });
  await deleteActividad.run({ id: imported.actividads[0].id }, context);
  assert.equal((await query(`query TestRemovedEvent($id:Int!) {evento(id:$id) {id}}`, { id: event.grupoModuloActividades[0].eventoId })).evento, null);
  const remaining = await query(`query TestDeletedActivityEvent($gm:Int!) {grupoModuloActividades(where:{grupoModuloId:{eq:$gm}}) {id}}`, { gm: fixture.gm.id });
  assert.equal(remaining.grupoModuloActividades.length, 1, 'Deleting a session must also remove its scheduled event');
  console.log('Emulador: listas ordenadas, edicion, conservacion, vaciado y rollback verificados.');
} finally {
  await query(`mutation CleanupSilabusFixture($unit:Int!,$modulo:Int!,$semester:Int!,$group:Int!,$horario:Int!,$turno:Int!) @transaction {
    calendario_deleteMany(where:{semestreId:{eq:$semester}})
    grupo_delete(id:$group) semestre_delete(id:$semester)
    unidadDidactica_delete(id:$unit) modulo_delete(id:$modulo) horario_delete(id:$horario) turno_delete(id:$turno)
  }`, { unit: fixture.u.id, modulo: fixture.m.id, semester: fixture.semester.id, group: fixture.group.id, horario: fixture.horario.id, turno: fixture.turno.id });
}
