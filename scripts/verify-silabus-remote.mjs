import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { allowedDay, turnoTime } from './silabus-model.mjs';
import { assertPreserved } from './silabus-structure.mjs';

delete process.env.DATA_CONNECT_EMULATOR_HOST;
delete process.env.FIREBASE_DATA_CONNECT_EMULATOR_HOST;
process.env.GOOGLE_CLOUD_PROJECT = 'cetprosmp-2026';
const require = createRequire(new URL('../functions/package.json', import.meta.url));
const { initializeApp } = require('firebase-admin/app');
const { getDataConnect } = require('firebase-admin/data-connect');
const dc = getDataConnect({ serviceId: 'cetprosmp-2026-service', location: 'us-central1' }, initializeApp({ projectId: 'cetprosmp-2026' }));
const query = async (source, variables) => (await dc.executeGraphql(source, { variables })).data;
const report = JSON.parse(fs.readFileSync(new URL('../tmp/silabus/result-remote.json', import.meta.url), 'utf8'));
const preview = JSON.parse(fs.readFileSync(new URL('../tmp/silabus/preview-remote.json', import.meta.url), 'utf8'));
const original = JSON.parse(fs.readFileSync(new URL('../tmp/silabus/before-remote.json', import.meta.url), 'utf8')).state;
const data = await query(`query VerifySilabusRemote {
  actividads(where:{claveImportacion:{startsWith:"silabus:2026-2:"}},limit:5000) {id nombre moduloId numeroSesion orden aprendizajeId duracion fecha claveImportacion
    contenidos:actividadContenidos_on_actividad(limit:200,orderBy:{orden:ASC}) {id orden texto}
    materiales:actividadMateriales_on_actividad(limit:200,orderBy:{orden:ASC}) {id orden texto}}
  aprendizajes(limit:5000) {id descripcion indicadorCapacidadId}
  grupoModuloActividades(limit:10000) {id actividadId grupoModuloId segmento inicio fin eventoId
    evento {id fechaInicio fechaFin minutosHoraAcademica computaHoras semestreId relaciones:eventoRelaciones_on_evento {entidadTipo entidadId}}
    grupoModulo {id moduloId grupo {id semestreId horarioId turnoId}}}
  unidadesDidacticas(limit:5000) {id nombre sigla duracion creditos comun}
  capacidadesTerminales(limit:5000) {id descripcion sigla orden unidadDidacticaId}
  indicadoresCapacidad(limit:5000) {id descripcion sigla orden capacidadTerminalId}
  competencias(limit:10000) {id nombre tipo moduloId}
  competenciaUnidadesDidacticas(limit:10000) {id orden competenciaId unidadDidacticaId competencia {moduloId}}
  horarios(limit:100) {id diasSemana}
  turnos(limit:100) {id horaInicio horaFin}
  eventos(where:{tipoEvento:{eq:"feriado"}},limit:100) {id fechaInicio fechaFin}
}`);
assertPreserved(original, data, ['unidadesDidacticas', 'capacidadesTerminales', 'indicadoresCapacidad']);
const completionPath = new URL('../tmp/silabus/before-completion-remote.json', import.meta.url);
if (fs.existsSync(completionPath)) {
  const completion = JSON.parse(fs.readFileSync(completionPath, 'utf8'));
  assertPreserved(completion.state, data, ['unidadesDidacticas', 'capacidadesTerminales', 'indicadoresCapacidad']);
  for (const [key, records] of Object.entries(completion.imported)) {
    const current = new Map(data[key].map(v => [v.id, v]));
    for (const record of records.filter(v => key !== 'actividads' || v.claveImportacion?.startsWith('silabus:2026-2:'))) {
      assert.deepEqual(Object.fromEntries(Object.keys(record).map(field => [field, current.get(record.id)?.[field]])), record, `Cambio de registro anterior: ${key}/${record.id}`);
    }
  }
  const created = JSON.parse(fs.readFileSync(new URL('../tmp/silabus/completion-created-remote.json', import.meta.url), 'utf8'));
  for (const { table, record } of created) {
    const actual = data[table].find(v => v.id === record.id);
    assert.deepEqual(Object.fromEntries(Object.keys(record).map(field => [field, actual?.[field]])), record, `Estructura nueva incorrecta: ${table}/${record.id}`);
  }
}
assert.equal(data.actividads.length, report.totals.sesiones);
assert.equal(data.actividads.reduce((n, v) => n + v.contenidos.length, 0), report.totals.contenidos);
assert.equal(data.actividads.reduce((n, v) => n + v.materiales.length, 0), report.totals.materiales);
assert.equal(data.grupoModuloActividades.filter(v => data.actividads.some(a => a.id === v.actividadId)).length, report.totals.eventos);
const activities = new Map(data.actividads.map(v => [v.id, v])), template = new Map(preview.sessions.map(v => [v.claveImportacion, v]));
for (const activity of data.actividads) {
  assert.equal(activity.fecha, null);
  const session = template.get(activity.claveImportacion);
  assert.equal(activity.nombre, session.nombre); assert.equal(activity.duracion, session.duracion);
  assert.deepEqual(activity.contenidos.map(v => v.texto), session.contenidos);
  assert.deepEqual(activity.materiales.map(v => v.texto), session.materiales);
  assert.equal(data.aprendizajes.find(v => v.id === activity.aprendizajeId)?.indicadorCapacidadId, session.indicadorId);
}
const minutes = new Map(), intervals = new Map(), holidays = new Set(data.eventos.map(v => v.fechaInicio.slice(0, 10)));
for (const block of data.grupoModuloActividades.filter(v => activities.has(v.actividadId))) {
  const gm = block.grupoModulo, event = block.evento;
  assert.equal(gm.grupo.semestreId, preview.semester.id); assert.equal(gm.moduloId, activities.get(block.actividadId).moduloId);
  assert.ok(event && event.minutosHoraAcademica === 45 && event.computaHoras);
  assert.ok(event.relaciones.some(v => v.entidadTipo === 'grupo_modulo' && v.entidadId === gm.id));
  assert.equal(Date.parse(event.fechaInicio), Date.parse(block.inicio)); assert.equal(Date.parse(event.fechaFin), Date.parse(block.fin));
  const localStart = new Date(Date.parse(block.inicio) - 5 * 3600000).toISOString();
  const localEnd = new Date(Date.parse(block.fin) - 5 * 3600000).toISOString();
  const horario = data.horarios.find(v => v.id === gm.grupo.horarioId), turno = data.turnos.find(v => v.id === gm.grupo.turnoId);
  assert.ok(allowedDay(localStart.slice(0, 10), horario.diasSemana.split(',').map(Number), preview.semester.inicio.slice(0, 10)));
  assert.ok(!holidays.has(localStart.slice(0, 10)));
  assert.equal(localStart.slice(0, 10), localEnd.slice(0, 10));
  assert.ok(localStart.slice(11, 16) >= turnoTime(turno.horaInicio) && localEnd.slice(11, 16) <= turnoTime(turno.horaFin));
  const key = `${block.grupoModuloId}:${block.actividadId}`;
  minutes.set(key, (minutes.get(key) ?? 0) + (Date.parse(block.fin) - Date.parse(block.inicio)) / 60000);
  const groupIntervals = intervals.get(gm.grupo.id) ?? []; groupIntervals.push(block); intervals.set(gm.grupo.id, groupIntervals);
}
for (const [key, duration] of minutes) assert.equal(duration, activities.get(Number(key.split(':')[1])).duracion * 45);
for (const groupIntervals of intervals.values()) {
  groupIntervals.sort((a, b) => Date.parse(a.inicio) - Date.parse(b.inicio));
  for (let i = 1; i < groupIntervals.length; i++) assert.ok(Date.parse(groupIntervals[i].inicio) >= Date.parse(groupIntervals[i - 1].fin));
}
for (const name of ['getActividad', 'createOrUpdateActividad', 'getGrupoModulo']) {
  const response = await fetch(`https://us-central1-cetprosmp-2026.cloudfunctions.net/${name}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: { nombre: 'Verificacion sin guardar', aprendizajeId: 1 } }),
  });
  assert.equal(response.status, 401, `Autenticacion obligatoria: ${name}`);
}
for (const host of ['https://cetprosmp-2026.web.app', 'https://cetprosmp.edu.pe']) {
  const response = await fetch(`${host}/intranet/actividades`); assert.equal(response.status, 200);
}
console.log(JSON.stringify({ production: true, verified: report.totals, aprendizajesVacios: data.aprendizajes.filter(v => !v.descripcion).length,
  preserved: ['unidades', 'capacidades', 'indicadores'], fridayAlternation: true, durationMinutes: 45, conflicts: 0, hosting: true, authentication: true }));
