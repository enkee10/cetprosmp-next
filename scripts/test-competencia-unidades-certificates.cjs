const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
process.env.GOOGLE_CLOUD_PROJECT = 'cetprosmp-2026';
const filename = path.resolve(__dirname, '../functions/lib/modules/reportes/handlers.js');
const loaded = new Module(filename, module);
loaded.filename = filename;
loaded.paths = Module._nodeModulePaths(path.dirname(filename));
loaded._compile(fs.readFileSync(filename, 'utf8') + '\nexports.testHelpers = { buildCertificateUnitRows, applyCertificatePlanEstudiosUpdates, certificateTechnicalCompetencyText };', filename);
const { buildCertificateUnitRows, applyCertificatePlanEstudiosUpdates, certificateTechnicalCompetencyText } = loaded.exports.testHelpers;
const XLSX = require('../tmp/oo-xlsx-reader/node_modules/xlsx');

async function main() {
  const data = {
    grupoModulo: { modulo: { competencias: [{ nombre: 'Tecnica', tipo: 'TECNICA' }] } },
    unidades: [1,2,3,4,5].map((id) => ({ id, nombre: `Unidad ${id}`, competencia: { nombre: id < 4 ? 'Tecnica' : `Empleabilidad ${id}` } })),
    capacidades: [{ id: 1, descripcion: 'Capacidad conservada', unidadDidacticaId: 4 }],
    promediosUnidad: [{ matriculaId: 9, unidadDidacticaId: 4, promedio: 18 }],
  };
  const rows = buildCertificateUnitRows(data, { matriculaId: 9 });
  assert.deepEqual(rows.map(r => r.competencia), ['Tecnica','Tecnica','Tecnica','Empleabilidad 4','Empleabilidad 5']);
  assert.ok(rows[3].capacidades.includes('Capacidad conservada'));
  assert.equal(Number(rows[3].nota), 18);
  const numbered = buildCertificateUnitRows({ ...data,
    unidades: data.unidades.map(unit => ({ ...unit, competencia: { ...unit.competencia, id: unit.id < 4 ? 11 : 22 } })),
    capacidades: [
      ...data.capacidades,
      { id: 2, descripcion: 'Otra capacidad', unidadDidacticaId: 4 },
    ],
  }, { matriculaId: 9 }, {
    competencias: new Map([[11, 'UC3'], [22, 'CE2']]),
    capacidades: new Map([[1, 'C4'], [2, 'C5']]),
  });
  assert.equal(numbered[0].competencia, 'UC3 Tecnica');
  assert.equal(numbered[3].competencia, 'CE2 Empleabilidad 4');
  assert.equal(numbered[3].capacidades, 'CE2 C4 Capacidad conservada\n\nCE2 C5 Otra capacidad');
  assert(!numbered[3].capacidades.includes('•'), 'Curricular codes replace capacity bullets');
  assert.equal(certificateTechnicalCompetencyText({
    grupoModulo: { modulo: { competencias: [{ id: 1, nombre: 'Tecnica original', tipo: 'TECNICA' }] } },
    unidades: [
      { id: 1, competencia: { id: 1, nombre: 'Tecnica original', tipo: 'TECNICA' } },
      { id: 2, competencia: { id: 2, nombre: 'Tecnica continuada', tipo: 'TECNICA' } },
      { id: 3, competencia: { id: 2, nombre: 'Tecnica continuada', tipo: 'TECNICA' } },
    ],
  }), 'Tecnica original\n\nTecnica continuada');
  const sheet = XLSX.utils.aoa_to_sheet(Array.from({length:50}, () => Array(9).fill('')));
  sheet['!merges'] = [XLSX.utils.decode_range('A39:A42')];
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Certificado');
  const input = XLSX.write(book, { type: 'buffer', bookType: 'xlsx' });
  const output = await applyCertificatePlanEstudiosUpdates(input, {}, rows, '');
  const result = XLSX.read(output, { type: 'buffer' }).Sheets.Certificado;
  assert.equal(result.A39.v, 'Tecnica');
  assert.equal(result.A42.v, 'Empleabilidad 4');
  assert.equal(result.A43.v, 'Empleabilidad 5');
  const merges = result['!merges'].map(XLSX.utils.encode_range);
  assert.ok(merges.includes('A39:A41'));
  assert.ok(!merges.includes('A39:A44'));
  console.log('Certificado Excel: agrupacion por competencia, capacidades y nota verificadas.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
