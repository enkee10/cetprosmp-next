import assert from 'node:assert/strict';
import fs from 'node:fs';
process.env.GOOGLE_CLOUD_PROJECT = 'cetprosmp-2026';
const { dataConnect } = await import('../functions/lib/modules/core/dataConnectCore.js');
const { getRegistroAuxiliar } = await import('../functions/lib/modules/registro-auxiliar/handlers.js');
const context = { auth: { uid: 'competencias-verification', token: { level: 600, roleId: 600 } } };
const { data: backup } = JSON.parse(fs.readFileSync(new URL('../tmp/competencia-unidades-backup-20261005.json', import.meta.url), 'utf8'));
const grupos = (await dataConnect.executeGraphql(`query VerifyRegistroGroups { grupoModulos(limit:10000) { id moduloId } }`)).data.grupoModulos;
for (const moduloId of [6,17,20,26,37]) {
  const group = grupos.find(g => g.moduloId === moduloId);
  assert.ok(group, `Falta grupo para modulo ${moduloId}`);
  const registro = await getRegistroAuxiliar.run({ grupoModuloId: group.id }, context);
  const units = backup.unidadDidacticaModulos.filter(r => r.moduloId === moduloId).sort((a,b)=>a.orden-b.orden);
  assert.deepEqual(registro.estructura.map(u=>u.id), units.map(u=>u.unidadDidacticaId));
  for (const unit of registro.estructura) {
    assert.equal(unit.capacidadesTerminales.length, backup.capacidadesTerminales.filter(c=>c.unidadDidacticaId===unit.id).length);
    for (const capacidad of unit.capacidadesTerminales) assert.equal(capacidad.indicadoresCapacidad.length, backup.indicadoresCapacidad.filter(i=>i.capacidadTerminalId===capacidad.id).length);
  }
  console.log(`Registro auxiliar verificado: modulo ${moduloId}, ${registro.estructura.length} unidades; capacidades e indicadores conservados.`);
}
await assert.rejects(() => dataConnect.executeGraphql('query RemovedRelations { unidadDidacticaModulos { id } }'));
await assert.rejects(() => dataConnect.executeGraphql('query RemovedRelations { competenciaCapacidades { id } }'));
console.log('Las relaciones antiguas ya no forman parte del esquema remoto.');
