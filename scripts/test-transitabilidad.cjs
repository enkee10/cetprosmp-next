const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { nombreConTransitabilidad, permiteTransitabilidad, asignarNumerosTransitabilidad } = require('../functions/lib/modules/core/transitabilidad.js');
const { buildGrupoModuloNombreRelacional } = require('../functions/lib/modules/core/grupoModuloNombre.js');

assert.equal(nombreConTransitabilidad('Panadería', false), 'Panadería');
assert.equal(nombreConTransitabilidad('Panadería', null), 'Panadería');
assert.equal(nombreConTransitabilidad('Panadería', true), 'Panadería (Trans.)');
assert.equal(nombreConTransitabilidad('Panadería (TRANS.) (Trans.)', true), 'Panadería (Trans.)');
assert.equal(nombreConTransitabilidad('Panadería (TRANS. 1) (Trans.)', true, 2), 'Panadería (Trans. 2)');
const first = {moduloId:10,instancia:1,transitabilidad:true};
assert.equal(asignarNumerosTransitabilidad([first])[0].numeroTransitabilidad, null);
const numbered = asignarNumerosTransitabilidad([first, {...first,instancia:2}]);
assert.deepEqual(numbered.map(item=>item.numeroTransitabilidad), [1,2]);
assert.equal(asignarNumerosTransitabilidad([numbered[1]])[0].numeroTransitabilidad, 2, 'Removing the first instance never renumbers the second');
assert.deepEqual(asignarNumerosTransitabilidad([{...first,instancia:3},...numbered],numbered).map(item=>item.numeroTransitabilidad), [3,1,2], 'New instances receive the next number without changing existing numbers');
assert.deepEqual(asignarNumerosTransitabilidad([first,{...first,moduloId:25}]).map(item=>item.numeroTransitabilidad), [null,null], 'Different modules stay unnumbered');
assert.equal(permiteTransitabilidad('Programa de estudio (alineado al CNOF - Auxiliar Técnico / Técnico)'), true);
assert.equal(permiteTransitabilidad('Opción ocupacional (nivel auxiliar técnico)'), false);
const context = { turno: { nombre: 'Mañana' }, horario: { nombre: 'Lun - Vie' }, personal: { displayName: 'Dora Gonzalo Bravo', user: { username: 'Dora Gonzalo Bravo', apellidoPaterno: 'Gonzalo' } } };
assert.equal(buildGrupoModuloNombreRelacional(context, { titulo: 'Panadería' }, '(grupo A)', true), 'Panadería (grupo A) (Trans.) [Mañana] Lun - Vie (Dora Gonzalo)');

// Exercise the production document formatters, with no database or storage access.
const filename = path.resolve('functions/lib/modules/reportes/handlers.js');
const loaded = new Module(filename, module);
loaded.filename = filename;
loaded.paths = Module._nodeModulePaths(path.dirname(filename));
const originalRequire = loaded.require.bind(loaded);
loaded.require = name => name === '../core/dataConnectCore.js'
  ? { dataConnect: { executeGraphql: async () => { throw Error('Unexpected database request'); } } }
  : originalRequire(name);
loaded._compile(fs.readFileSync(filename, 'utf8') + '\nexports.testHelpers = { getModuloDocumentName, fillInstitutionHeader, buildCertificateTokens, REPORTE_DETALLE_QUERY };', filename);
const helpers = loaded.exports.testHelpers;
const fixture = {
  grupoModulo: { id: 1, transitabilidad: true, grupo: { ...context, turno: { nombre: 'Noche extendida' }, semestre: { titulo: '2026-2' } }, modulo: { titulo: 'Acondicionamiento y elaboración de productos de Panadería y Pastelería' } },
  semestre: { titulo: '2026-2', fechaCertificado: '2026-11-17T17:00:00Z' }, opcionOcupacional: false,
  unidades: [], capacidades: [], promediosUnidad: [], estudiantes: [],
};
const expected = fixture.grupoModulo.modulo.titulo.toLocaleUpperCase('es-PE') + ' (Trans.)';
assert.equal(helpers.getModuloDocumentName(fixture.grupoModulo, true), expected);
for (const [mode, cell, turnoCell] of [['nomina', 'F12', 'AD13'], ['acta', 'AO6', 'AO10']]) {
  const updates = [];
  helpers.fillInstitutionHeader(updates, 'Hoja', fixture, mode);
  assert.equal(updates.find(update => update.range.endsWith(`!${cell}`))?.values[0][0], expected, `${mode} contains the marker in its module cell`);
  assert.equal(updates.find(update => update.range.endsWith(`!${turnoCell}`))?.values[0][0], 'NOCHE');
}
const opcionUpdates = [];
const legacyShift = { ...fixture.grupoModulo.grupo, turno: null, turnoNombre: 'Noche ampliada' };
helpers.fillInstitutionHeader(opcionUpdates, 'Hoja', { ...fixture, opcionOcupacional: true, grupoModulo: { ...fixture.grupoModulo, grupo: legacyShift } }, 'acta');
assert.equal(opcionUpdates.find(update => update.range.endsWith('!AF13'))?.values[0][0], 'Noche');
const tokens = helpers.buildCertificateTokens(fixture, { matriculaId: 1 }, '', 'TEST');
assert.equal(tokens['[NOMBRE MODULO]'], expected);
assert.equal(tokens['[turno]'], 'Noche');
assert.equal(tokens['[TURNO]'], 'NOCHE');
for (const numero of [1,2]) {
  fixture.grupoModulo.numeroTransitabilidad = numero;
  const numberedName = expected.replace('(Trans.)', `(Trans. ${numero})`);
  for (const [mode, cell] of [['nomina','F12'],['acta','AO6']]) {
    const updates=[];
    helpers.fillInstitutionHeader(updates,'Hoja',fixture,mode);
    assert.equal(updates.find(update=>update.range.endsWith(`!${cell}`))?.values[0][0],numberedName);
  }
  assert.equal(helpers.buildCertificateTokens(fixture,{matriculaId:1},'','TEST')['[NOMBRE MODULO]'],numberedName);
}
assert(helpers.REPORTE_DETALLE_QUERY.includes('transitabilidad'), 'The document data query includes the mode');
fixture.grupoModulo.transitabilidad = false;
assert.equal(helpers.getModuloDocumentName(fixture.grupoModulo, true), fixture.grupoModulo.modulo.titulo.toLocaleUpperCase('es-PE'));
assert(!fixture.grupoModulo.modulo.titulo.includes('(Trans.)'), 'The catalog title stays unchanged');
console.log('Correcto: listas, sufijos por instancia, nóminas, actas y certificados distinguen transitabilidad sin modificar títulos regulares.');
