import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const apply = process.argv.includes('--apply');
delete process.env.DATA_CONNECT_EMULATOR_HOST;
process.env.GCLOUD_PROJECT = 'cetprosmp-2026';
const { dataConnect } = require('../lib/modules/core/dataConnectCore.js');
const { saveGrupoWithModulos } = require('../lib/modules/grupos/saveGrupo.js');
const { buildGrupoModuloNombreRelacional } = require('../lib/modules/core/grupoModuloNombre.js');
const { permiteTransitabilidad } = require('../lib/modules/core/transitabilidad.js');
const targets = [{ personalId: 11, modulos: [25] }, { personalId: 21, modulos: [25, 26] }, { personalId: 17, modulos: [10] }];

const { data } = await dataConnect.executeGraphql(`query TransitabilidadCreationCatalog {
  appSettings(where:{settingKey:{eq:"general.semestreActualId"}},limit:2){intValue}
  semestre(id:4){id titulo}
  turno(id:1){id nombre}
  horario(id:5){id nombre diasSemana}
  personals(where:{id:{in:[11,21,17]}},limit:3){id displayName user{username apellidoPaterno}}
  modulos(where:{id:{in:[25,26,10]}},limit:3){id titulo tituloComercial plan{carrera{tipoCarrera{nombre}}}}
  grupoModulos(where:{transitabilidad:{eq:true},grupo:{semestreId:{eq:4}}},limit:100){id grupoId moduloId nombre transitabilidad grupo{personalId turnoId horarioId}}
}`);
assert.equal(data.appSettings[0]?.intValue, 4, 'Revisar el semestre actual antes de crear grupos.');
assert.equal(data.semestre?.titulo, '2026-2');
assert.equal(data.turno?.nombre, 'Mañana');
assert.equal(data.horario?.diasSemana, '1,2,3,4,5');
const created = [];
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupDirectory = new URL('../../backups/transitabilidad-20261117/', import.meta.url);
fs.mkdirSync(backupDirectory, { recursive: true });
fs.writeFileSync(new URL(`catalogo-${stamp}.json`, backupDirectory), JSON.stringify(data, null, 2), { flag: 'wx' });

for (const target of targets) {
  const personal = data.personals.find(row => row.id === target.personalId);
  assert(personal, `Falta docente ${target.personalId}`);
  const selected = target.modulos.map(id => {
    const modulo = data.modulos.find(row => row.id === id);
    assert(permiteTransitabilidad(modulo?.plan?.carrera?.tipoCarrera?.nombre), `El módulo ${id} debe pertenecer a un programa de estudio.`);
    return modulo;
  });
  const existing = data.grupoModulos.filter(row => row.grupo.personalId === target.personalId && target.modulos.includes(row.moduloId));
  if (existing.length) {
    assert.equal(existing.length, target.modulos.length, 'Existen grupos parciales: revisar antes de repetir.');
    assert.equal(new Set(existing.map(row => row.moduloId)).size, target.modulos.length);
    assert(existing.every(row => row.grupo.turnoId === 1 && row.grupo.horarioId === 5 && row.nombre.includes('(Trans.)')));
    created.push(...existing);
    continue;
  }
  const context = { personal, turno: data.turno, horario: data.horario };
  const nombreDisplay = buildGrupoModuloNombreRelacional(context, { titulo: selected.map(row => `${row.titulo} (Trans.)`).join(' / ') });
  console.log(JSON.stringify({ docente: personal.displayName, modulos: selected.map(row => row.titulo), nombreDisplay, apply }));
  if (!apply) continue;
  const now = new Date().toISOString();
  const grupoId = await saveGrupoWithModulos(null, {
    nombreDisplay, personalId: personal.id, semestreId: 4, turnoId: 1, turnoNombre: data.turno.nombre,
    horarioId: 5, estado: 'activo', archivado: false, fechaCreacion: now, fechaActualizacion: now,
  }, selected.map((modulo, index) => ({
    moduloId: modulo.id, instancia: 1, transitabilidad: true, orden: index + 1, obligatorio: true,
    hasSufijo: true, sufijo: null, hasInicio: false, hasFin: false, hasCalendarioId: false, unidadDidacticas: [],
  })));
  const result = await dataConnect.executeGraphql(`query CreatedTransitabilidadGroup($grupoId:Int!) {
    grupoModulos(where:{grupoId:{eq:$grupoId}},limit:10){id grupoId moduloId nombre transitabilidad grupo{personalId turnoId horarioId semestreId estado}}
  }`, { variables: { grupoId } });
  assert.equal(result.data.grupoModulos.length, selected.length);
  assert(result.data.grupoModulos.every(row => row.transitabilidad && row.nombre.includes('(Trans.)') && row.grupo.turnoId === 1 && row.grupo.horarioId === 5));
  created.push(...result.data.grupoModulos);
  fs.writeFileSync(new URL(`creados-${stamp}.json`, backupDirectory), JSON.stringify(created, null, 2));
}
console.log(JSON.stringify({ apply, gruposModulo: created }, null, 2));
