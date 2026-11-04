const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

function load(file, imports = {}) {
  const mod = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  new Function('module', 'exports', 'require', code)(mod, mod.exports, name => {
    if (name in imports) return imports[name];
    throw Error(`Unexpected import ${name}`);
  });
  return mod.exports;
}

const { defaultAppSettings, normalizeSettings } = load('src/lib/appSettings.ts');
const stored = new Map();
let permission = true;
let writes = 0;
const settingKey = 'programacionCurricular.mostrarContenidoEnCuadroEmergente';
const colorSettingKey = 'programacionCurricular.usarOtroColorCompetenciasEmpleabilidad';
const handlers = load('functions/src/modules/settings/handlers.ts', {
  'firebase-functions/v1': { https: { onCall: handler => handler, HttpsError: class extends Error {} } },
  '../core/docenteSemester.js': {},
  '../../dataconnectOperations.js': { INSERT_APP_SETTING_MUTATION: 'insert', UPDATE_APP_SETTING_MUTATION: 'update' },
  '../core/dataConnectCore.js': { dataConnect: { executeGraphql: async (source, { variables } = {}) => {
    if (source.includes('ListAppSettingsManual')) return { data: { appSettings: [...stored.values()], semestres: [] } };
    if (source.includes('GetAppSettingByKeyManual')) return { data: { appSettings: stored.has(variables.settingKey) ? [stored.get(variables.settingKey)] : [] } };
    if (source === 'insert') {
      writes++;
      const row = { id: stored.size + 1, ...variables.data };
      stored.set(row.settingKey, row);
      return { data: { appSetting_insert: { id: row.id } } };
    }
    if (source === 'update') {
      writes++;
      const row = [...stored.values()].find(item => item.id === variables.id);
      stored.set(row.settingKey, { ...row, ...variables.data });
      return { data: { appSetting_update: { id: row.id } } };
    }
    throw Error(`Unexpected query ${source}`);
  } } },
  '../core/permissions.js': {
    requireAuthenticated: () => {},
    requirePermission: async (_, entity, action) => {
      assert.equal(entity, 'settings'); assert.equal(action, 'edit');
      if (!permission) throw Error('permission-denied');
    },
  },
  '../planes/visibilityPolicy.js': { HIDE_OCCUPATIONAL_CURRICULUM_KEY: 'general.poderOcultarProgramacionOpcionesOcupacionales' },
});

(async () => {
  const resourcesKey = 'programacionCurricular.mostrarRecursosEnSesiones';
  assert.equal(defaultAppSettings.programacionCurricular.mostrarRecursosEnSesiones, false);
  for (const value of [undefined, null, {}]) assert.equal(normalizeSettings(value).programacionCurricular.mostrarRecursosEnSesiones, false);
  assert.equal(defaultAppSettings.programacionCurricular.mostrarContenidoEnCuadroEmergente, true);
  assert.equal(defaultAppSettings.programacionCurricular.usarOtroColorCompetenciasEmpleabilidad, true);
  for (const value of [undefined, null, {}]) assert.equal(normalizeSettings(value).programacionCurricular.mostrarContenidoEnCuadroEmergente, true, 'Legacy settings enable the preview by default');
  for (const value of [undefined, null, {}]) assert.equal(normalizeSettings(value).programacionCurricular.usarOtroColorCompetenciasEmpleabilidad, true, 'Legacy settings enable the employability color by default');
  let result = await handlers.getAppSettings(undefined, {});
  assert.equal(result.settings.programacionCurricular.mostrarContenidoEnCuadroEmergente, true, 'The backend defaults to enabled without a stored row');
  assert.equal(result.settings.programacionCurricular.usarOtroColorCompetenciasEmpleabilidad, true);
  assert.equal(result.settings.programacionCurricular.mostrarRecursosEnSesiones, false);

  for (const enabled of [false, true, false]) {
    const colorEnabled = !enabled;
    const input = { ...defaultAppSettings, programacionCurricular: { mostrarContenidoEnCuadroEmergente: enabled, usarOtroColorCompetenciasEmpleabilidad: colorEnabled, mostrarRecursosEnSesiones: enabled } };
    result = await handlers.saveAppSettings(input, {});
    assert.equal(result.settings.programacionCurricular.mostrarContenidoEnCuadroEmergente, enabled);
    assert.equal(result.settings.programacionCurricular.usarOtroColorCompetenciasEmpleabilidad, colorEnabled);
    assert.equal(result.settings.programacionCurricular.mostrarRecursosEnSesiones, enabled);
    assert.equal(stored.get(resourcesKey).boolValue, enabled);
    assert.equal(stored.get(resourcesKey).label, 'Mostrar recursos en sesiones');
    assert.equal(stored.get(colorSettingKey).boolValue, colorEnabled);
    assert.equal(stored.get(colorSettingKey).section, 'programacionCurricular');
    assert.equal(stored.get(colorSettingKey).label, 'Usar otro color para competencias de empleabilidad');
    assert.equal(stored.get(settingKey).boolValue, enabled);
    assert.equal(stored.get(settingKey).section, 'programacionCurricular');
    assert.equal(stored.get(settingKey).label, 'Mostrar contenido en cuadro emergente al hacer clic');
    const reloaded = await handlers.getAppSettings(undefined, {});
    assert.equal(normalizeSettings(reloaded.settings).programacionCurricular.mostrarContenidoEnCuadroEmergente, enabled, 'The saved value survives fetching and client normalization');
    assert.equal(normalizeSettings(reloaded.settings).programacionCurricular.usarOtroColorCompetenciasEmpleabilidad, colorEnabled, 'Both independent options survive saving and reloading');
    assert.equal(normalizeSettings(reloaded.settings).programacionCurricular.mostrarRecursosEnSesiones, enabled, 'Resource visibility survives saving and reloading independently');
  }
  permission = false;
  const before = writes;
  await assert.rejects(() => handlers.saveAppSettings(defaultAppSettings, {}), /permission-denied/);
  assert.equal(writes, before, 'Users without edit permission cannot change the setting');
  permission = true;
  const { programacionCurricular: ignored, ...legacySettings } = defaultAppSettings;
  result = await handlers.saveAppSettings(legacySettings, {});
  assert.equal(result.settings.programacionCurricular.mostrarContenidoEnCuadroEmergente, true, 'Legacy clients use the enabled default');
  assert.equal(result.settings.programacionCurricular.usarOtroColorCompetenciasEmpleabilidad, true);
  assert.equal(result.settings.programacionCurricular.mostrarRecursosEnSesiones, false);
  console.log('Passed: preview and employability color enabled and session resources hidden by default, independent save/reload, legacy settings and edit permission checks.');
})().catch(error => { console.error(error); process.exitCode = 1; });
