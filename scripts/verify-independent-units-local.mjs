import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

process.env.DATA_CONNECT_EMULATOR_HOST = '127.0.0.1:9399';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
process.env.GOOGLE_CLOUD_PROJECT = 'cetprosmp-2026';
const academic = await import('../functions/lib/modules/academico/handlers.js');
const { getRegistroAuxiliar } = await import('../functions/lib/modules/registro-auxiliar/handlers.js');
const { validateUnidadCompetencias } = await import('../functions/lib/modules/competencias/service.js');
const { dataConnect } = await import('../functions/lib/modules/core/dataConnectCore.js');
const context = { auth: { uid: 'independent-units-local-verification', token: { level: 600, roleId: 600 } } };
const root = path.resolve('backups/independent-units-local');
const directory = fs.readdirSync(root).sort().reverse().find(name => {
  const reportPath = path.join(root, name, 'report.json');
  if (!fs.existsSync(reportPath)) return false;
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  return report.committed !== false && report.units.length > 0;
});
assert(directory, 'Se necesita el respaldo de la migracion local.');
const before = JSON.parse(fs.readFileSync(path.join(root, directory, 'before.json'), 'utf8'));
const report = JSON.parse(fs.readFileSync(path.join(root, directory, 'report.json'), 'utf8'));
const listing = await academic.listUnidadesDidacticas.run({}, context);
assert.equal(listing.unidadesDidacticas.length, report.countsAfter.unidades_didacticas);
assert.equal((await academic.listCapacidadesTerminales.run({}, context)).capacidadesTerminales.length, report.countsAfter.capacidades_terminales);
assert.equal((await academic.listIndicadoresCapacidad.run({}, context)).indicadoresCapacidad.length, report.countsAfter.indicadores_capacidad);
assert.equal((await academic.listAprendizajes.run({}, context)).aprendizajes.length, report.countsAfter.aprendizajes);
assert(listing.unidadesDidacticas.every(unit => !Object.hasOwn(unit, 'comun') && unit.competenciaIds.length <= 1));
const structure = await academic.listEstructuraAcademica.run({}, context);
assert(!Object.hasOwn(structure, 'opciones'));
for (const module of structure.modulos) for (const unit of module.unidadesDidacticas) assert(!Object.hasOwn(unit, 'comun'));
const capacities = new Map(before.capacidades_terminales.map(row => [row.id, row]));
let verifiedGroups = 0;
for (const group of before.grupo_modulos) {
  if (!report.units.some(unit => unit.curricularModuleIds.includes(group.modulo_id))) continue;
  const relations = before.competencia_unidades_didacticas.filter(row => before.competencias.find(c => c.id === row.competencia_id).modulo_id === group.modulo_id);
  const registro = await getRegistroAuxiliar.run({ grupoModuloId: group.id }, context);
  const expectedIds = relations.map(row => report.mapping.unidades_didacticas[row.unidad_didactica_id]?.[group.modulo_id] ?? row.unidad_didactica_id);
  assert.deepEqual(registro.estructura.map(unit => unit.id).sort((a,b)=>a-b), expectedIds.sort((a,b)=>a-b));
  for (const unit of registro.estructura) {
    const oldRelation = relations.find(row => (report.mapping.unidades_didacticas[row.unidad_didactica_id]?.[group.modulo_id] ?? row.unidad_didactica_id) === unit.id);
    const oldCapacities = [...capacities.values()].filter(row => row.unidad_didactica_id === oldRelation.unidad_didactica_id);
    assert.equal(unit.capacidadesTerminales.length, oldCapacities.length);
    for (const capacity of unit.capacidadesTerminales) {
      const original = oldCapacities.find(row => (report.mapping.capacidades_terminales[row.id]?.[group.modulo_id] ?? row.id) === capacity.id);
      assert(original);
      assert.equal(capacity.descripcion, original.descripcion);
      assert.equal(capacity.indicadoresCapacidad.length, before.indicadores_capacidad.filter(row => row.capacidad_terminal_id === original.id).length);
    }
  }
  verifiedGroups++;
}
const item = report.units.find(unit => unit.curricularModuleIds.length > 1);
const [moduleA, moduleB] = item.curricularModuleIds;
const unitA = report.mapping.unidades_didacticas[item.originalId][moduleA];
const unitB = report.mapping.unidades_didacticas[item.originalId][moduleB];
const originalA = (await academic.getUnidadDidactica.run({ id: unitA }, context)).unidadDidactica;
const originalB = (await academic.getUnidadDidactica.run({ id: unitB }, context)).unidadDidactica;
await assert.rejects(() => validateUnidadCompetencias(unitA, [originalA.competenciaId, originalB.competenciaId]), /una sola competencia/);
await assert.rejects(() => validateUnidadCompetencias(unitA, [originalB.competenciaId]), /otro modulo/);
try {
  await academic.updateEstructuraAcademicaCell.run({ entity: 'unidadDidactica', id: unitA, field: 'nombre', value: `${originalA.nombre} (prueba local)` }, context);
  assert.equal((await academic.getUnidadDidactica.run({ id: unitB }, context)).unidadDidactica.nombre, originalB.nombre);
} finally {
  await academic.updateEstructuraAcademicaCell.run({ entity: 'unidadDidactica', id: unitA, field: 'nombre', value: originalA.nombre }, context);
}
await assert.rejects(() => dataConnect.executeGraphql('query RemovedUnitProperty { unidadesDidacticas { id comun } }'));
console.log(JSON.stringify({ environment: 'local', verifiedGroups, units: listing.unidadesDidacticas.length, propertyRemoved: true, editsIndependent: true, crossModuleReuseRejected: true }));
