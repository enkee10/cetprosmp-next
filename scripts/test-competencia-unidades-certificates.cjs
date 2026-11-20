const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
process.env.GOOGLE_CLOUD_PROJECT = 'cetprosmp-2026';
const filename = path.resolve(__dirname, '../functions/lib/modules/reportes/handlers.js');
const loaded = new Module(filename, module);
loaded.filename = filename;
loaded.paths = Module._nodeModulePaths(path.dirname(filename));
loaded._compile(fs.readFileSync(filename, 'utf8') + '\nexports.testHelpers = { buildCertificateTokens, buildCertificateUnitRows, certificateTechnicalCompetencyText, certificadoFileName };', filename);
const { buildCertificateTokens, buildCertificateUnitRows, certificateTechnicalCompetencyText, certificadoFileName } = loaded.exports.testHelpers;
const { fillCertificateWord, combineCertificateWordDocuments } = require('../functions/lib/modules/reportes/certificateWord.js');
const JSZip = require('../functions/node_modules/jszip');
const { DOMParser } = require('../functions/node_modules/@xmldom/xmldom');
const sharp = require('../functions/node_modules/sharp');

const WORD_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const DRAWING_NS = 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing';
const GRAPHIC_NS = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const parse = (xml) => new DOMParser().parseFromString(xml, 'application/xml');
const nodes = (element, tag, ns = WORD_NS) => Array.from(element.getElementsByTagNameNS(ns, tag));
const text = (element) => nodes(element, 't').map((part) => part.textContent).join('');

async function readDocument(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  return {
    zip,
    doc: parse(await zip.file('word/document.xml').async('string')),
  };
}

const sampleTokens = {
  '[APELLIDO PATERNO APELLIDO MATERNO, Nombres]': 'Pérez & Díaz, Ana',
  '[codigo inscripcion]': '001-2026',
  '[NOMBRE MODULO]': 'Fabricación de estructuras',
  '[carrera]': 'Mecánica de Producción',
  '[CARRERA]': 'MECÁNICA DE PRODUCCIÓN',
  '[INICIO MODULO]': '10 agosto',
  '[FIN MODULO]': '17 de diciembre de 2026',
  '[CREDITOS MODULO]': 12,
  '[HORAS MODULO]': 288,
  '[fecha actual larga]': '23 de diciembre del 2026',
  '[director]': 'Carmen Victoria',
  '[creditos EFSRT]': 6,
  '[horas EFSRT]': 192,
  '[nota EFSRT]': 17,
};

async function main() {
  const studentGrades = [12, 14, 16, 18, 19];
  const data = {
    grupoModulo: { modulo: { creditosEfsrt: 6, duracionEfsrt: 192, competencias: [{ nombre: 'Tecnica', tipo: 'TECNICA' }] } },
    unidades: [1,2,3,4,5].map((id) => ({ id, nombre: `Unidad ${id}`, creditos: id, duracion: id * 24, competencia: { nombre: id < 4 ? 'Tecnica' : `Empleabilidad ${id}` } })),
    capacidades: [{ id: 1, descripcion: 'Capacidad conservada', unidadDidacticaId: 4 }],
    promediosUnidad: studentGrades.map((promedio, index) => ({
      promedio, matriculaId: 9, unidadDidacticaId: index + 1,
    })),
  };
  const student = { matriculaId: 9, matricula: { user: { nombre: 'Ana', apellidoPaterno: 'Pérez' } } };
  const rows = buildCertificateUnitRows(data, student);
  assert.deepEqual(rows.map(r => r.competencia), ['Tecnica','Tecnica','Tecnica','Empleabilidad 4','Empleabilidad 5']);
  assert.ok(rows[3].capacidades.includes('Capacidad conservada'));
  assert.deepEqual(rows.map(r => r.nota), studentGrades);
  assert.throws(
    () => buildCertificateUnitRows({ ...data, promediosUnidad: data.promediosUnidad.slice(0, 2) }, student),
    { code: 'failed-precondition', message: /Ana para las unidades 3\. UNIDAD 3, 4\. UNIDAD 4, 5\. UNIDAD 5/ },
  );
  assert.throws(() => buildCertificateUnitRows({ ...data, unidades: [] }, student), { code: 'failed-precondition' });
  assert.equal(buildCertificateUnitRows({
    ...data, promediosUnidad: data.promediosUnidad.map((row, index) => index === 0 ? { ...row, promedio: 0 } : row),
  }, student)[0].nota, 0);
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
  const template = fs.readFileSync(path.resolve(__dirname, '../functions/assets/reportes/certificados-plan-estudio.docx'));
  assert.equal(certificadoFileName({
    semestre: { titulo: '2026-2' }, grupoModulo: { nombre: 'Diseño / Producción' },
  }, {
    matriculaId: 9, matricula: { user: { apellidoPaterno: 'Pérez', apellidoMaterno: 'Díaz', nombre: 'ana' } },
  }), '26-2 Diseño Producción - PÉREZ DÍAZ, Ana');
  const datesData = {
    ...data,
    grupoModulo: {
      ...data.grupoModulo,
      inicio: '2026-08-11T03:00:00Z',
      fin: '2026-12-18T03:00:00Z',
    },
    semestre: { fin: '2026-12-23T00:00:00.000Z', fechaCertificado: null },
  };
  const generatedTokens = buildCertificateTokens(datesData, student, '001-2026', 17.2);
  assert.equal(generatedTokens['[INICIO MODULO]'], sampleTokens['[INICIO MODULO]']);
  assert.equal(generatedTokens['[FIN MODULO]'], sampleTokens['[FIN MODULO]']);
  assert.equal(generatedTokens['[fecha actual larga]'], sampleTokens['[fecha actual larga]']);
  for (const key of ['[creditos EFSRT]', '[horas EFSRT]', '[nota EFSRT]']) {
    assert.equal(generatedTokens[key], sampleTokens[key]);
  }
  const manualDateTokens = buildCertificateTokens({
    ...datesData,
    semestre: { ...datesData.semestre, fechaCertificado: '2026-12-28' },
  }, student, '001-2026', 17);
  assert.equal(manualDateTokens['[fecha actual larga]'], '28 de diciembre del 2026');
  const noIssueDate = buildCertificateTokens({
    ...datesData,
    semestre: { fin: null, fechaCertificado: null },
  }, student, '001-2026', 17);
  assert.equal(noIssueDate['[fecha actual larga]'], '');
  const png = (background) => sharp({create: {width: 190, height: 224, channels: 4, background}}).png().toBuffer();
  const [firstAvatar, secondAvatar] = await Promise.all([png('#cc0000'), png('#0000cc')]);
  const first = await fillCertificateWord(template, { ...sampleTokens,
    '[creditos EFSRT]': generatedTokens['[creditos EFSRT]'],
    '[horas EFSRT]': generatedTokens['[horas EFSRT]'],
    '[nota EFSRT]': generatedTokens['[nota EFSRT]'],
  }, numbered, firstAvatar);
  const denseRows = numbered.map((row, index) => ({
    ...row,
    nota: 19,
    capacidades: Array.from({length: 4}, (_, capacity) =>
      `Capacidad ${index + 1}.${capacity + 1} para verificar el ajuste al contenido con una descripción extensa y sus criterios de evaluación.`,
    ).join('\n\n'),
  }));
  const second = await fillCertificateWord(template, {
    ...sampleTokens,
    '[APELLIDO PATERNO APELLIDO MATERNO, Nombres]': 'Flores Ríos, Luis',
    '[nota EFSRT]': 20,
    '[fecha actual larga]': manualDateTokens['[fecha actual larga]'],
  }, denseRows, secondAvatar);
  const { doc } = await readDocument(first);
  const tables = nodes(doc, 'tbl');
  const unitRows = nodes(tables[4], 'tr');
  const rowValues = unitRows.map((row) => nodes(row, 'tc').map(text));
  assert.equal(unitRows.length, 7);
  assert.deepEqual(rowValues[1].slice(0,4), ['UC3 Tecnica', 'UNIDAD 1', '1', '24']);
  assert.deepEqual(rowValues[4], [
    'CE2 Empleabilidad 4', 'UNIDAD 4', '4', '96',
    'CE2 C4 Capacidad conservadaCE2 C5 Otra capacidad', '18',
  ]);
  assert.deepEqual(rowValues.slice(1, 6).map(row => row.at(-1)), studentGrades.map(String));
  assert.match(rowValues[6][0], /Experiencias Formativas/);
  assert.deepEqual(rowValues[6].slice(1), ['6', '192', '', '17']);
  assert.deepEqual(unitRows.slice(1, 6).map((row) => nodes(row, 'vMerge')[0]?.getAttributeNS(WORD_NS, 'val')),
    ['restart', 'continue', 'continue', undefined, undefined]);
  for (const [key, value] of Object.entries(sampleTokens)) {
    if (key !== '[CARRERA]') assert.ok(text(doc.documentElement).includes(String(value)), key);
  }
  assert.doesNotMatch(text(doc.documentElement), /\[[^\]]+\]/);
  assert.equal(nodes(doc, 'br').filter((br) => br.getAttributeNS(WORD_NS, 'type') === 'page').length, 1);

  const { doc: denseDoc } = await readDocument(second);
  assert.ok(Number(nodes(nodes(denseDoc, 'tbl')[4], 'sz')[0].getAttributeNS(WORD_NS, 'val')) < 18);
  assert.match(text(denseDoc.documentElement), /Capacidad 5\.4/);

  const withoutAvatar = await fillCertificateWord(template, { ...sampleTokens, '[nota EFSRT]': null }, []);
  const { zip: noAvatarZip, doc: noAvatarDoc } = await readDocument(withoutAvatar);
  const blankRows = nodes(nodes(noAvatarDoc, 'tbl')[4], 'tr');
  assert.equal(blankRows.length, 5);
  assert.deepEqual(nodes(blankRows[1], 'tc').map(text), Array(6).fill(''));
  assert.equal(text(nodes(blankRows.at(-1), 'tc').at(-1)), '');
  assert.equal(noAvatarZip.file('word/media/certificate-avatar.png'), null);

  const batch = await combineCertificateWordDocuments([second, first]);
  const { zip, doc: combined } = await readDocument(batch);
  const combinedText = text(combined.documentElement);
  assert.ok(combinedText.indexOf('Flores Ríos, Luis') < combinedText.indexOf('Pérez & Díaz, Ana'));
  assert.equal(nodes(combined, 'sectPr').length, 2);
  const drawingIds = nodes(combined, 'docPr', DRAWING_NS).map((drawing) => drawing.getAttribute('id'));
  assert.equal(new Set(drawingIds).size, drawingIds.length);
  const embeddedImages = nodes(combined, 'blip', GRAPHIC_NS).map((image) => image.getAttributeNS(REL_NS, 'embed'));
  assert.ok(embeddedImages.includes('rIdCertificateAvatar'));
  assert.ok(embeddedImages.includes('rIdCertificateAvatar1'));
  assert.deepEqual(await zip.file('word/media/certificate-avatar.png').async('nodebuffer'), secondAvatar);
  assert.deepEqual(await zip.file('word/media/certificate-avatar-1.png').async('nodebuffer'), firstAvatar);
  assert.equal(await combineCertificateWordDocuments([first]), first);
  if (process.argv[2]) {
    fs.mkdirSync(process.argv[2], {recursive: true});
    for (const [name, content] of Object.entries({ first, second, batch, withoutAvatar })) {
      fs.writeFileSync(path.join(process.argv[2], `${name}.docx`), content);
    }
  }
  console.log('Certificado Word: campos, inserción y ajuste de filas, fusiones, notas, fotos y orden del lote verificados.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
