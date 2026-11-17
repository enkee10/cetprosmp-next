import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const apply = process.argv.includes('--apply');
delete process.env.DATA_CONNECT_EMULATOR_HOST;
process.env.GCLOUD_PROJECT = 'cetprosmp-2026';
const { dataConnect } = require('../lib/modules/core/dataConnectCore.js');
const { saveTransitabilidadGrupoModulo } = require('../lib/modules/grupos/saveGrupo.js');
const query = `query LilianaTransitabilidadConfiguration {
  grupo(id:211){id nombreDisplay personalId semestreId turnoId horarioId estado archivado}
  grupoModulos(where:{grupoId:{eq:211}},orderBy:{instancia:ASC},limit:10){id grupoId moduloId instancia nombre sufijo transitabilidad numeroTransitabilidad inicio fin calendarioId obligatorio orden}
  grupoModuloUnidadesDidacticas(where:{grupoModulo:{grupoId:{eq:211}}},limit:100){id grupoModuloId unidadDidacticaId orden inicio fin}
  registroAcademicoDocumentos(where:{grupoModulo:{grupoId:{eq:211}}},limit:10){id grupoModuloId tipoDocumento}
  certificadoTituloDocumentos(where:{grupoModulo:{grupoId:{eq:211}}},limit:10){id grupoModuloId tipoDocumento}
  certificados(where:{grupoModulo:{grupoId:{eq:211}}},limit:10){id grupoModuloId}
}`;
const before = (await dataConnect.executeGraphql(query)).data;
assert.equal(before.grupo.personalId, 17);
assert.equal(before.grupo.semestreId, 4);
assert.equal(before.grupo.turnoId, 1);
assert.equal(before.grupo.horarioId, 5);
assert(before.grupoModulos.every(row => row.moduloId === 10 && row.transitabilidad));
assert([1,2].includes(before.grupoModulos.length));
const directory = new URL('../../backups/transitabilidad-20261117/', import.meta.url);
fs.mkdirSync(directory, {recursive:true});
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
fs.writeFileSync(new URL(`liliana-antes-${stamp}.json`, directory), JSON.stringify(before,null,2), {flag:'wx'});
if (before.grupoModulos.length === 1) {
  assert.equal(before.registroAcademicoDocumentos.length + before.certificadoTituloDocumentos.length + before.certificados.length, 0, 'Revisar los documentos antes de numerar la primera instancia.');
  if (apply) {
    const first = before.grupoModulos[0];
    await saveTransitabilidadGrupoModulo(null, {
      grupoId:211, moduloId:10, instancia:1, transitabilidad:true,
      sufijo:null, obligatorio:true, orden:2, inicio:first.inicio, fin:first.fin, calendarioId:first.calendarioId,
    });
  }
}
const after = (await dataConnect.executeGraphql(query)).data;
if (apply || before.grupoModulos.length === 2) {
  assert.equal(after.grupoModulos.length,2);
  assert.equal(after.grupoModulos[0].id,208, 'Se conserva la primera instancia existente.');
  assert.deepEqual(after.grupoModulos.map(row => row.numeroTransitabilidad), [1,2]);
  assert(after.grupoModulos.every(row => row.nombre.includes(`(Trans. ${row.numeroTransitabilidad})`)));
  for (const row of after.grupoModulos) assert.equal(after.grupoModuloUnidadesDidacticas.filter(unit => unit.grupoModuloId === row.id).length,6);
  for (const unit of before.grupoModuloUnidadesDidacticas) assert.deepEqual(after.grupoModuloUnidadesDidacticas.find(row => row.id === unit.id),unit);
  fs.writeFileSync(new URL(`liliana-despues-${stamp}.json`, directory), JSON.stringify(after,null,2), {flag:'wx'});
}
console.log(JSON.stringify({apply,grupo:after.grupo,grupoModulos:after.grupoModulos},null,2));
