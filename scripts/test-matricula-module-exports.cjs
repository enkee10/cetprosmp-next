const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const JSZip = require('../functions/node_modules/jszip');

const compile = source => ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
}).outputText;
function loadModule(file, mocks = {}) {
  const module = { exports: {} };
  vm.runInNewContext(compile(fs.readFileSync(file, 'utf8')), {
    module, exports: module.exports, Buffer, Map, Set, Date,
    require: name => { assert.ok(name in mocks, `Unexpected dependency ${name}`); return mocks[name]; },
  });
  return module.exports;
}
const helper = loadModule('functions/src/modules/core/matriculaModuloRows.ts');
class HttpsError extends Error { constructor(code, message) { super(message); this.code = code; } }
const grupos = Array.from({ length: 6 }, (_, i) => ({
  id: i + 1, nombre: `Manualidades ${i + 1}`, grupoId: Math.floor(i / 2) + 10, moduloId: 20,
  grupo: { id: Math.floor(i / 2) + 10, personalId: i === 5 ? 10 : 9, semestreId: 2, archivado: false },
  modulo: { id: 20, titulo: 'Pintura', orden: 1, planId: 1, carreraId: 1 },
}));
const matriculas = Array.from({ length: 73 }, (_, i) => ({
  id: i + 100, semestreId: 2, archivado: false, recibo: String(i + 1),
  fecha: i < 20 ? '2026-10-16T15:00:00Z' : '2026-10-17T15:00:00Z',
  user: { id: i + 1, dni: String(10000000 + i), tipoDocumento: 'DNI', nombre: `Alumno ${i}`,
    apellidoPaterno: 'Apellido', apellidoMaterno: 'Segundo', fechaNacimiento: '2000-01-01',
    sexo: 'F', correoInstitucional: `alumno${i}@example.test`, celular: '987654321' },
}));
const links = matriculas.flatMap((matricula, i) => [i % 6, ...(i < 20 ? [(i + 1) % 6] : [])].map(index => ({
  id: matricula.id * 10 + index, matriculaId: matricula.id, grupoModuloId: grupos[index].id,
  grupoId: grupos[index].grupoId, moduloId: 20, grupoModulo: grupos[index], matricula,
})));

async function testSheets() {
  const file = 'functions/src/modules/matriculas/googleSheetsSync.ts';
  const ast = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const functions = ['buildDocenteSheetRows', 'writeDocenteMatriculadosSheet', 'exportListaMatriculasGeneralSheet'];
  const declarations = ast.statements.filter(node =>
    (ts.isFunctionDeclaration(node) && functions.includes(node.name?.text)) ||
    (ts.isVariableStatement(node) && node.declarationList.declarations.some(d => d.name.getText(ast) === 'DOCENTE_MATRICULADOS_SHEETS_HEADERS')));
  const apiCalls = [];
  const queryBatchSizes = [];
  let docente = false;
  const sheets = { spreadsheets: {
    values: { clear: async value => apiCalls.push(['clear', value]), update: async value => apiCalls.push(['update', value]) },
    batchUpdate: async value => apiCalls.push(['format', value]),
  } };
  const module = { exports: {} };
  vm.runInNewContext(compile(declarations.map(node => node.getText(ast)).join('\n') +
    '\nmodule.exports.write = writeDocenteMatriculadosSheet;'), {
    module, exports: module.exports, Map, Set,
    buildMatriculaModuloRows: helper.buildMatriculaModuloRows,
    https: { HttpsError }, isSuperUserContext: () => !docente, getRequesterRoleId: () => docente ? 4 : 1,
    isDocenteRole: role => [4, 10].includes(Number(role)),
    LIST_MATRICULAS_BY_IDS_FOR_DOCENTE_SHEET_QUERY: 'matriculas', LIST_GENERAL_SHEET_MODULE_ROWS_QUERY: 'modulos',
    MATRICULAS_GENERAL_LIST_SHEETS_FILE_NAME: 'Lista', DOCENTE_MATRICULADOS_SHEETS_FOLDER_ID: 'folder',
    DOCENTE_MATRICULADOS_SHEETS_TAB_NAME: 'Matriculados',
    dataConnect: { executeGraphql: async (query, { variables }) => {
      if (query === 'matriculas') queryBatchSizes.push(variables.matriculaIds.length);
      return { data: query === 'matriculas'
        ? { matriculas: matriculas.filter(item => variables.matriculaIds.includes(item.id)) }
        : { modulosEstudiantes: links, grupoModulos: grupos, personals: [{ id: 9 }] } };
    } },
    hydrateAvatarMediano: async () => new Map(), ensureSpreadsheetFile: async () => ({ spreadsheetId: 'sheet', spreadsheetUrl: 'https://example.test/sheet' }),
    toNumberOrNull: value => Number(value) || null, asCleanString: value => value || null,
    toUpperName: value => value || '', toTitleName: value => value || '', buildApellidosYNombres: user => user?.nombre || '',
    formatLimaDate: value => value || '', buildAgeFormula: row => `AGE(${row})`, buildHyperlinkFormula: () => '',
    google: { sheets: () => sheets }, getSheetsAuth: () => null, ensureSheetTab: async () => 1,
  });
  const run = ids => module.exports.exportListaMatriculasGeneralSheet(matriculas.map(item => item.id), ids, { auth: { uid: 'teacher' } });
  const all = await run(grupos.map(item => item.id));
  assert.equal(all.rows, 93, 'Sheets preserves every enrollment/group-module pair');
  const update = apiCalls.find(([name]) => name === 'update')[1];
  assert.equal(update.range, 'Matriculados!A1:S94');
  assert.equal(update.requestBody.values[0][18], 'Grupo-Módulo');
  assert.equal(update.requestBody.values[1][18], 'Manualidades 1');
  assert.equal(update.requestBody.values[2][18], 'Manualidades 2');
  assert.equal(update.requestBody.values[1][1], update.requestBody.values[2][1], 'Two module rows retain one original enrollment');
  assert.ok(update.requestBody.values.every(row => row.length === 19));
  assert.equal(update.requestBody.values[93][7], 'AGE(94)', 'Age formulas remain aligned after expanding rows');
  const one = await run([1]);
  assert.equal(one.rows, links.filter(link => link.grupoModuloId === 1).length);
  docente = true;
  const teacher = await run([]);
  assert.equal(teacher.rows, links.filter(link => link.grupoModuloId !== 6).length, 'Teacher export includes only assigned group-modules');
  await assert.rejects(() => run([6]), /No hay matrículas/, 'An unassigned module cannot be exported');
  docente = false;
  const originalLinks = links.length;
  for (let i = matriculas.length; i < 1001; i++) {
    const matricula = { ...matriculas[0], id: i + 100 };
    matriculas.push(matricula);
    links.push({ ...links[0], id: i + 10000, matriculaId: matricula.id, matricula });
  }
  queryBatchSizes.length = 0;
  assert.equal((await run([])).rows, 1021, 'Downloads beyond 1000 enrollments are complete');
  assert.equal(queryBatchSizes.join(','), '1000,1', 'The query limit is handled in batches');
  matriculas.length = 73;
  links.length = originalLinks;
}

async function testAvanza() {
  const registration = loadModule('functions/src/modules/matriculas/avanzaRegistration.ts');
  const data = { datoGenerals: [{ codigoModular: '001' }], carreras: [{ id: 1, nombre: 'Manualidades' }],
    planes: [{ id: 1, carreraId: 1, planEstudio: '2026', periodoVigencia: { titulo: '2026-2' }, anio: 2026 }],
    grupoModulos: grupos, modulosEstudiantes: links };
  const bucket = {
    getFiles: async () => [[{ name: 'AVANZA/AVANZA-Plantillas-Registro-2026/PE-Manualidades.xlsx', getMetadata: async () => [{ generation: '1' }] }]],
    file: () => ({ download: async () => [Buffer.alloc(0)] }),
  };
  const api = loadModule('functions/src/modules/matriculas/avanzaExport.ts', {
    jszip: JSZip, 'firebase-admin/storage': { getStorage: () => ({ bucket: () => bucket }) },
    'firebase-functions/v1': { https: { HttpsError } }, '../core/dataConnectCore.js': { dataConnect: { executeGraphql: async () => ({ data }) } },
    '../core/matriculaModuloRows.js': helper, './avanzaRegistration.js': registration,
    './avanzaTemplate.js': {
      inspectAvanzaTemplate: () => ({ periodo: '2026-2', codigoModular: '001', plan: '2026', carrera: 'MANUALIDADES (AUXILIAR)', modulos: ['Pintura'] }),
      fillAvanzaTemplate: (_original, rows) => Buffer.from(JSON.stringify(rows)),
    },
    './avanzaPhones.js': { needsAvanzaPhoneReplacement: () => false },
  });
  const semester = { id: 2, titulo: '2026-2' };
  const until = '2026-10-17T17:00:00Z';
  const all = await api.createAvanzaExport(semester, grupos.map(item => item.id), { desde: null, hasta: until });
  assert.equal(all.totalRows, 93, 'AVANZA preserves different group-modules of the same academic module/student');
  assert.equal(all.rows, 93);
  const zip = await JSZip.loadAsync(Buffer.from(all.contentBase64, 'base64'));
  const exportedRows = JSON.parse(await zip.file(all.files[0].name).async('string'));
  assert.equal(exportedRows.length, 93);
  assert.equal(exportedRows[0].length, 17, 'The official AVANZA column layout is preserved');
  const one = await api.createAvanzaExport(semester, [1], { desde: null, hasta: until });
  assert.equal(one.rows, links.filter(link => link.grupoModuloId === 1).length);
  const recent = await api.createAvanzaExport(semester, grupos.map(item => item.id), { desde: '2026-10-17T00:00:00Z', hasta: until });
  assert.equal(recent.rows, 53, 'The date cutoff still filters enrollments without merging module rows');
  data.modulosEstudiantes = [...links, links[0]];
  const repeatedLink = await api.createAvanzaExport(semester, grupos.map(item => item.id), { desde: null, hasta: until });
  assert.equal(repeatedLink.rows, 93, 'A repeated database link does not repeat the same group-module enrollment');
}

(async () => {
  await testSheets();
  await testAvanza();
  console.log('Passed: Google Sheets and AVANZA export 93 module rows for 73 enrollments, preserve same-module groups, filters, teacher scope, date cutoffs and column layouts.');
})().catch(error => { console.error(error); process.exitCode = 1; });
