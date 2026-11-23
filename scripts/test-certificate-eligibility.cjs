const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

function load(file, dependencies = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const mod = { exports: {} };
  new Function('module', 'exports', 'require', code)(mod, mod.exports, name => {
    assert(name in dependencies, `Unexpected dependency ${name}`);
    return dependencies[name];
  });
  return mod.exports;
}

async function main() {
  let visibility = null;
  let gradeRows = [];
  let reads = 0;
  const units = [
    { id: 1, capacidadesCertificado: [{ id: 10, indicadoresCertificado: [{ id: 100 }, { id: 101 }] }] },
    { id: 2, capacidadesCertificado: [{ id: 20, indicadoresCertificado: [{ id: 200 }] }] },
  ];
  const api = load('functions/src/modules/reportes/certificateEligibility.ts', {
    '../core/dataConnectCore.js': { dataConnect: { executeGraphql: async source => {
      reads++;
      return { data: source.includes('CertificateUnitStructure') ? {
        direct: [], curricular: units.map(unit => ({ competencia: { moduloId: 5 }, unidadDidacticaId: unit.id })),
      } : { grades: gradeRows, units } };
    } } },
    '../planes/periodSelection.js': { createPeriodVisibilityReader: () => async () => visibility },
  });
  const approved = values => api.hasApprovedCertificateUnits(units, new Map([[100, values[0]], [101, values[1]], [200, values[2]]]));
  assert(approved([13, 13, 13]), '13 is passing in every unit');
  assert(approved([12, 13, 18]), 'Use the same rounding as Registro Auxiliar');
  assert(approved([0, 20, 18]) === false, 'Zero is recorded but can lower a unit average');
  assert(approved([20, 20, 12]) === false, 'A high general average cannot compensate for a failed unit');
  for (const missing of [null, undefined, NaN, Infinity]) assert(!approved([20, missing, 20]), 'Every required indicator needs a finite grade');
  assert(!api.hasApprovedCertificateUnits([], new Map()));
  assert(!api.hasApprovedCertificateUnits([{ id: 1, capacidadesCertificado: [] }], new Map()));
  assert(!api.hasApprovedCertificateUnits([{ id: 1, capacidadesCertificado: [{ id: 10, indicadoresCertificado: [] }] }], new Map()));
  assert(!api.hasApprovedCertificateUnits(units, new Map([[100, 20], [200, 20]]), true), 'Occupational rules also require complete grades');
  assert(api.hasApprovedCertificateUnits(units, new Map([[100, 0], [101, 13], [200, 13]]), true), 'Occupational achievement uses the last indicator');

  const candidates = [11, 12].map(matriculaId => ({ grupoModuloId: 3, moduloId: 5, semestreId: 9, matriculaId, occupational: false }));
  gradeRows = [100, 101, 200].flatMap(indicadorCapacidadId => candidates.map(row => ({ matriculaId: row.matriculaId, indicadorCapacidadId, promedio: 15 })));
  let result = await api.approvedCertificateCandidates(candidates);
  assert.deepEqual([...result], ['3:11', '3:12']);
  assert.equal(reads, 2, 'Structure and grades are read in bulk');
  gradeRows = gradeRows.filter(row => row.matriculaId !== 12 || row.indicadorCapacidadId !== 101);
  result = await api.approvedCertificateCandidates(candidates);
  assert.deepEqual([...result], ['3:11'], 'A missing original grade excludes the student');
  visibility = { unidades: new Set([1, 2]), capacidades: new Set([10, 20]), indicadores: new Set([100, 200]) };
  result = await api.approvedCertificateCandidates(candidates);
  assert.deepEqual([...result], ['3:11', '3:12'], 'Only the effective semester curriculum is required');
  visibility.unidades.clear();
  assert.equal((await api.approvedCertificateCandidates(candidates)).size, 0, 'No effective units means no certificate');

  // Exercise the actual list builder, including students without any EFSRT row.
  const file = 'functions/src/modules/reportes/handlers.ts';
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const builder = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'buildCertificadoTituloRows');
  const code = ts.transpileModule(builder.getText(source), { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  let sinEfsrt = false;
  const group = { id: 3, grupo: { semestreId: 9, semestre: { titulo: '2026-1' } }, modulo: { id: 5 } };
  const student = (id, archived = false) => ({ id, matriculaId: id, grupoModuloId: 3, grupoModulo: group, matricula: { archivado: archived, user: { nombre: `Student ${id}` } } });
  const data = {
    semestres: [{ id: 9 }], certificadoTituloDocumentos: [],
    efsrtPppEstudiantes: [
      { grupoModuloId: 3, moduloEstudianteId: 11, promedioFinal: 13, grupoModulo: group, moduloEstudiante: student(11) },
      { grupoModuloId: 3, moduloEstudianteId: 12, promedioFinal: 12, grupoModulo: group, moduloEstudiante: student(12) },
      { grupoModuloId: 3, moduloEstudianteId: 14, promedioFinal: 18, grupoModulo: group, moduloEstudiante: student(14, true) },
      { grupoModuloId: 3, moduloEstudianteId: 15, promedioFinal: 18, grupoModulo: group, moduloEstudiante: student(15) },
    ],
  };
  const dependencies = {
    getBooleanAppSetting: async () => sinEfsrt,
    CERTIFICATES_WITHOUT_EFSRT_KEY: api.CERTIFICATES_WITHOUT_EFSRT_KEY,
    dataConnect: { executeGraphql: async (_, options) => ({ data: { ...data, modulosEstudiantes: options.variables.sinEfsrt ? [student(11), student(12), student(13), student(14, true), student(15)] : [] } }) },
    CERTIFICADOS_TITULOS_OPTIONS_QUERY: '', getConfiguredSemestreConsultaIds: async () => [9],
    approvedCertificateCandidates: async rows => new Set(rows.filter(row => row.matriculaId !== 15).map(row => `${row.grupoModuloId}:${row.matriculaId}`)),
    usesOpcionOcupacionalRules: () => false, semestreCodigo: () => '261',
    getModuloDocumentName: () => 'Module', certificadoGrupoModuloLabel: () => 'Group',
    certificadoItemKey: item => `${item.grupoModuloId}:${item.moduloEstudianteId}`,
    getUserDisplayName: user => user.nombre, cleanText: value => String(value || ''),
  };
  const build = new Function(...Object.keys(dependencies), `${code}; return buildCertificadoTituloRows;`)(...Object.values(dependencies));
  assert.deepEqual((await build()).estudiantes.map(row => row.moduloEstudianteId), [11]);
  sinEfsrt = true;
  const listing = await build();
  assert.deepEqual(listing.estudiantes.map(row => row.moduloEstudianteId), [11, 12, 13], 'Bypass accepts failed or absent EFSRT; archived and incomplete students stay excluded');
  assert.equal(listing.estudiantes.find(row => row.moduloEstudianteId === 13).promedioFinal, null, 'Never invent an EFSRT grade');
  assert.equal(listing.grupoModulos.length, 1);

  const settings = load('src/lib/appSettings.ts');
  assert.equal(settings.defaultAppSettings.general.mostrarCertificadosSinEfsrt, false);
  assert.equal(settings.normalizeSettings({}).general.mostrarCertificadosSinEfsrt, false);
  assert.equal(settings.normalizeSettings({ general: { mostrarCertificadosSinEfsrt: true } }).general.mostrarCertificadosSinEfsrt, true);
  const stored = new Map();
  const settingHandlers = load('functions/src/modules/settings/handlers.ts', {
    '../reportes/certificateEligibility.js': { CERTIFICATES_WITHOUT_EFSRT_KEY: api.CERTIFICATES_WITHOUT_EFSRT_KEY },
    'firebase-functions/v1': { https: { onCall: handler => handler, HttpsError: Error } },
    '../core/docenteSemester.js': {},
    '../../dataconnectOperations.js': { INSERT_APP_SETTING_MUTATION: 'insert', UPDATE_APP_SETTING_MUTATION: 'update' },
    '../core/dataConnectCore.js': { dataConnect: { executeGraphql: async (query, { variables } = {}) => {
      if (query.includes('ListAppSettingsManual')) return { data: { appSettings: [...stored.values()], semestres: [] } };
      if (query.includes('GetAppSettingByKeyManual')) return { data: { appSettings: stored.has(variables.settingKey) ? [stored.get(variables.settingKey)] : [] } };
      if (query === 'insert') {
        const row = { id: stored.size + 1, ...variables.data }; stored.set(row.settingKey, row);
        return { data: { appSetting_insert: { id: row.id } } };
      }
      if (query === 'update') {
        const row = [...stored.values()].find(item => item.id === variables.id);
        stored.set(row.settingKey, { ...row, ...variables.data }); return { data: { appSetting_update: { id: row.id } } };
      }
      throw Error(`Unexpected query ${query}`);
    } } },
    '../core/permissions.js': { requireAuthenticated: () => {}, requirePermission: async () => {} },
    '../planes/visibilityPolicy.js': { HIDE_OCCUPATIONAL_CURRICULUM_KEY: 'general.poderOcultarProgramacionOpcionesOcupacionales' },
    '../reportes/certificateSequence.js': {}, '../../shared/appDateTime.js': {},
  });
  assert.equal((await settingHandlers.getAppSettings()).settings.general.mostrarCertificadosSinEfsrt, false);
  for (const enabled of [false, true, false]) {
    const saved = await settingHandlers.saveAppSettings({ general: { mostrarCertificadosSinEfsrt: enabled } });
    assert.equal(saved.settings.general.mostrarCertificadosSinEfsrt, enabled);
    assert.equal(stored.get(api.CERTIFICATES_WITHOUT_EFSRT_KEY).boolValue, enabled);
    assert.equal((await settingHandlers.getAppSettings()).settings.general.mostrarCertificadosSinEfsrt, enabled, 'Settings save and reload preserve both values');
  }
  console.log('Certificados: notas completas, todas las unidades aprobadas, selección curricular, ambos modos de EFSRT y opción desactivada por defecto: correctos.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
