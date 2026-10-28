import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

for (const key of ['DATA_CONNECT_EMULATOR_HOST', 'FIREBASE_DATA_CONNECT_EMULATOR_HOST', 'FIREBASE_AUTH_EMULATOR_HOST']) assert(!process.env[key], `Quite ${key} para verificar produccion.`);
process.env.GOOGLE_CLOUD_PROJECT = 'cetprosmp-2026';
const academic = await import('../functions/lib/modules/academico/handlers.js');
const { getRegistroAuxiliar } = await import('../functions/lib/modules/registro-auxiliar/handlers.js');
const { dataConnect } = await import('../functions/lib/modules/core/dataConnectCore.js');
const context = { auth: { uid: 'independent-units-readonly-verification', token: { level: 600, roleId: 600 } } };
const directory = path.resolve('backups/independent-units-remote-20261027');
const marker = JSON.parse(fs.readFileSync(path.join(directory, 'data-migration-committed.json'), 'utf8'));
assert.equal(marker.project, 'cetprosmp-2026');
const before = JSON.parse(fs.readFileSync(path.join(directory, marker.backup), 'utf8')).data;
const report = JSON.parse(fs.readFileSync(path.join(directory, marker.report), 'utf8'));
const [listing, capacities, indicators, learnings, structure] = await Promise.all([
  academic.listUnidadesDidacticas.run({}, context), academic.listCapacidadesTerminales.run({}, context),
  academic.listIndicadoresCapacidad.run({}, context), academic.listAprendizajes.run({}, context), academic.listEstructuraAcademica.run({}, context),
]);
assert.equal(listing.unidadesDidacticas.length, report.countsAfter.unidades_didacticas);
assert.equal(capacities.capacidadesTerminales.length, report.countsAfter.capacidades_terminales);
assert.equal(indicators.indicadoresCapacidad.length, report.countsAfter.indicadores_capacidad);
assert.equal(learnings.aprendizajes.length, report.countsAfter.aprendizajes);
assert(listing.unidadesDidacticas.every(unit => !Object.hasOwn(unit, 'comun') && unit.competenciaIds.length <= 1));
assert(structure.modulos.length > 0);
for (const module of structure.modulos) for (const unit of module.unidadesDidacticas) {
  assert(!Object.hasOwn(unit, 'comun'));
  for (const capacity of unit.capacidadesTerminales) assert.deepEqual(capacity.competencias.map(c => c.id), [unit.competenciaId]);
}
const competencies = new Map(before.competencias.map(c => [c.id, c]));
const groups = before.grupo_modulos.filter(g => report.units.some(unit => unit.curricularModuleIds.includes(g.modulo_id)));
let verifiedGroups = 0;
const pending = [...groups];
async function verifyGroups() {
  while (pending.length) {
    const group = pending.shift();
    const relations = before.competencia_unidades_didacticas.filter(row => competencies.get(row.competencia_id).modulo_id === group.modulo_id);
    const registro = await getRegistroAuxiliar.run({ grupoModuloId: group.id }, context);
    const expectedIds = relations.map(row => report.mapping.unidades_didacticas[row.unidad_didactica_id]?.[group.modulo_id] ?? row.unidad_didactica_id);
    assert.deepEqual(registro.estructura.map(unit => unit.id).sort((a,b) => a-b), expectedIds.sort((a,b) => a-b));
    for (const unit of registro.estructura) {
      const original = relations.find(row => (report.mapping.unidades_didacticas[row.unidad_didactica_id]?.[group.modulo_id] ?? row.unidad_didactica_id) === unit.id);
      const originalCapacities = before.capacidades_terminales.filter(row => row.unidad_didactica_id === original.unidad_didactica_id);
      assert.equal(unit.capacidadesTerminales.length, originalCapacities.length);
      for (const capacity of unit.capacidadesTerminales) {
        const originalCapacity = originalCapacities.find(row => (report.mapping.capacidades_terminales[row.id]?.[group.modulo_id] ?? row.id) === capacity.id);
        assert(originalCapacity);
        assert.equal(capacity.descripcion, originalCapacity.descripcion);
        assert.equal(capacity.indicadoresCapacidad.length, before.indicadores_capacidad.filter(row => row.capacidad_terminal_id === originalCapacity.id).length);
      }
    }
    verifiedGroups++;
    if (verifiedGroups % 10 === 0) console.log(JSON.stringify({ verifiedGroups, total: groups.length }));
  }
}
await Promise.all([verifyGroups(), verifyGroups(), verifyGroups()]);
let schemaPropertyRemoved = false;
if (process.argv.includes('--final')) {
  await assert.rejects(() => dataConnect.executeGraphql('query RemovedUnitProperty { unidadesDidacticas(limit:1) { id comun } }'), error => /comun/i.test(error.message));
  schemaPropertyRemoved = true;
}
const result = { source: 'remote', project: 'cetprosmp-2026', writes: 0, verifiedGroups, units: listing.unidadesDidacticas.length,
  capacities: capacities.capacidadesTerminales.length, indicators: indicators.indicadoresCapacidad.length,
  learnings: learnings.aprendizajes.length, modules: structure.modulos.length, schemaPropertyRemoved, verifiedAt: new Date().toISOString() };
fs.writeFileSync(path.join(directory, process.argv.includes('--final') ? 'application-verification-final.json' : 'application-verification-transition.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));
