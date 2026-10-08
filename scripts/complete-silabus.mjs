import fs from 'node:fs';
import assert from 'node:assert/strict';
import { query, save, stateQuery, readExcel, buildPlan, loadImported, validatePlan, applyPlan } from './import-silabus.mjs';
import { missingStructure, structureMutation, assertPreserved } from './silabus-structure.mjs';

const production = process.argv.includes('--production');
const suffix = production ? 'remote' : 'local';
const read = name => JSON.parse(fs.readFileSync(new URL(`../tmp/silabus/${name}`, import.meta.url), 'utf8'));
const original = read(`before-${suffix}.json`).state;
const rows = await readExcel();
const state = await query(stateQuery), imported = await loadImported();
const context = await query(`query CompletionContext {
  competencias(limit:10000) {id nombre tipo moduloId}
  modulos(limit:10000) {id horas}
}`);
const backupName = `before-completion-${suffix}.json`;
if (!fs.existsSync(new URL(`../tmp/silabus/${backupName}`, import.meta.url))) save(backupName, { capturedAt: new Date().toISOString(), state, imported, context });
const backup = read(backupName);
const basePlan = buildPlan(rows, state, original);
const structure = missingStructure(rows, basePlan.mappings, state, context, [38, 13]);
const preview = buildPlan(rows, structure.state, original);
assert.equal(preview.issues.length, 0, 'La estructura completa todavia deja casos pendientes');
validatePlan(preview, structure.state);
const planned = new Map(preview.sessions.map(v => [v.claveImportacion, v]));
for (const activity of imported.actividads.filter(v => v.claveImportacion?.startsWith('silabus:2026-2:'))) {
  assert.ok(planned.has(activity.claveImportacion), `Asociacion de sesion existente cambiaria: ${activity.id}`);
}
save(`completion-preview-${suffix}.json`, { totals: preview.totals, additions: structure.additions });
console.log(JSON.stringify({ preview: preview.totals, additions: Object.fromEntries([...new Set(structure.additions.map(v => v.table))].map(key => [key, structure.additions.filter(v => v.table === key).length])) }));
if (!process.argv.includes('--apply')) process.exit(0);

const createdPath = new URL(`../tmp/silabus/completion-created-${suffix}.json`, import.meta.url);
const created = fs.existsSync(createdPath) ? read(`completion-created-${suffix}.json`) : [];
for (const moduloId of [38, 13]) {
  const additions = structure.additions.filter(v => v.moduloId === moduloId);
  if (!additions.length) continue;
  const mutation = structureMutation(additions);
  const result = await query(mutation.source, mutation.variables);
  const ids = new Map([...mutation.aliases].map(([virtualId, alias]) => [virtualId, result[alias].id]));
  created.push(...additions.map(v => ({ ...v, record: Object.fromEntries(Object.entries(v.record).map(([key, value]) => [key, (key === 'id' || key.endsWith('Id')) && ids.has(value) ? ids.get(value) : value])) })));
  save(`completion-created-${suffix}.json`, created);
  console.log(`Estructura agregada al modulo ${moduloId}: ${additions.length} registros`);
}
const afterStructure = await query(stateQuery);
assertPreserved(state, afterStructure, ['modulos', 'planModulos', 'unidadesDidacticas', 'capacidadesTerminales', 'indicadoresCapacidad', 'competenciaUnidadesDidacticas', 'aprendizajes']);
const complete = buildPlan(rows, afterStructure, original);
assert.equal(complete.issues.length, 0);
const keys = new Set(complete.sessions.map(v => v.claveImportacion));
for (const activity of imported.actividads.filter(v => v.claveImportacion?.startsWith('silabus:2026-2:'))) assert.ok(keys.has(activity.claveImportacion));
for (const schedule of complete.schedules) for (const block of schedule.sessions) {
  const session = complete.sessions.find(v => v.row === block.row);
  const activity = imported.actividads.find(v => v.claveImportacion === session.claveImportacion);
  const existing = imported.grupoModuloActividades.find(v => v.grupoModuloId === schedule.grupoModuloId && v.actividadId === activity?.id && v.segmento === block.segmento);
  if (existing) {
    assert.equal(Date.parse(existing.inicio), Date.parse(block.inicio));
    assert.equal(Date.parse(existing.fin), Date.parse(block.fin));
  }
}
save(`preview-${suffix}.json`, complete);
await applyPlan(complete, afterStructure);
const finalState = await query(stateQuery), finalImported = await loadImported();
assertPreserved(backup.state, finalState, ['modulos', 'planModulos', 'unidadesDidacticas', 'capacidadesTerminales', 'indicadoresCapacidad', 'competenciaUnidadesDidacticas', 'aprendizajes']);
assertPreserved(backup.imported, finalImported);
const report = read(`result-${suffix}.json`);
report.structureAdded = Object.fromEntries(['unidadesDidacticas', 'capacidadesTerminales', 'indicadoresCapacidad', 'competenciaUnidadesDidacticas'].map(key => [key, finalState[key].length - backup.state[key].length]));
save(`result-${suffix}.json`, report);
console.log(JSON.stringify({ completed: report.totals, structureAdded: report.structureAdded, previousSessionsUnchanged: true }));
