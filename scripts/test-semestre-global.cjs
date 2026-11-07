const assert = require('node:assert/strict');
const { buildSync } = require('esbuild');
const { Module } = require('node:module');
const path = require('node:path');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(entry) {
  const output = buildSync({ entryPoints: [entry], bundle: true, write: false, platform: 'node', format: 'cjs' });
  const mod = new Module(path.resolve(entry));
  mod._compile(output.outputFiles[0].text, entry);
  return mod.exports;
}
const { createAppSettingsStore } = load('src/lib/appSettingsStore.ts');
const { defaultAppSettings } = load('src/lib/appSettings.ts');
const { docenteMenuModuloName, docenteMenuPeriodo } = load('src/lib/docenteMenuLabels.ts');
const { createDocenteModulosLoader } = load('src/lib/docenteModulosCache.ts');
const settings = (id) => ({ ...defaultAppSettings, general: { ...defaultAppSettings.general, semestreActualId: id } });
const deferred = () => { let resolve; let reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };

async function testMenu() {
  const file = 'src/hooks/useIntranetMenuSections.tsx';
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const hook = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'useIntranetMenuSections');
  const code = ts.transpileModule(hook.getText(source).replace('export ', ''), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const sections = [{ id: 'registros', items: [
    { id: 'estructura-academica', title: 'Programaci\u00f3n Curricular', path: '/intranet/estructura-academica' },
    { id: 'matriculas', title: 'Matr\u00edculas', path: '/intranet/matriculas' },
    { id: 'registro-auxiliar', title: 'Registro Auxiliar', path: '/intranet/registro-auxiliar' },
  ] }];
  let role = 4;
  const run = vm.runInNewContext(code + '\nuseIntranetMenuSections', {
    useMemo: fn => fn(), useAuth: () => ({user:{role}}), isDocenteRole: value => value === 4 || value === 10,
    useIntranetPermissions: () => ({ filterSections: items => items, loading: false, isSuperUser: false }),
    menuSections: sections,
    loadDocenteModulos: () => { throw Error('The menu must not query modules'); },
  });
  const result = run();
  assert.equal(result.loading, false, 'The menu does not wait for semester or module requests');
  assert.deepEqual(Array.from(result.sections[0].items, x => x.path),
    ['/intranet/estructura-academica-docente', '/intranet/matriculas', '/intranet/registro-auxiliar']);
  assert.equal(result.sections[0].items.length, 3, 'Use the conventional menu, without a link per module');
  role = 3;
  assert.equal(run().sections, sections, 'Other users retain the permission-filtered menu');
}

(async () => {
  // A hard reload restores the same-day cache immediately and verifies it without blocking readers.
  const persisted = new Map([['docente-a', settings(4)]]);
  let refresh = deferred();
  const cachedStore = createAppSettingsStore(() => refresh.promise, {
    read: (uid) => persisted.get(uid),
    write: (uid, value) => persisted.set(uid, value),
    remove: (uid) => persisted.delete(uid),
  });
  const background = cachedStore.activate('docente-a');
  assert.equal(cachedStore.getSnapshot().loading, false);
  assert.equal(cachedStore.getSnapshot().settings.general.semestreActualId, 4);
  refresh.resolve(settings(5)); await background;
  assert.equal(cachedStore.getSnapshot().settings.general.semestreActualId, 5, 'Server semester changes replace the cached value');
  assert.equal(persisted.get('docente-a').general.semestreActualId, 5);
  await cachedStore.activate(null);
  assert.equal(persisted.has('docente-a'), false, 'Logout removes the persisted cache');
  const corrupt = createAppSettingsStore(async () => settings(6), {
    read: () => { throw Error('Invalid browser storage'); }, write: () => { throw Error('Storage full'); }, remove: () => {},
  });
  await corrupt.activate('docente-c');
  assert.equal(corrupt.getSnapshot().settings.general.semestreActualId, 6);

  let groupCalls = 0;
  let groupResponse = deferred();
  const sharedGroups = createDocenteModulosLoader(async () => { groupCalls += 1; return groupResponse.promise; });
  const groupRequest = { uid: 'docente-a', semestreId: 4, matriculas: true };
  const menuRequest = sharedGroups({ ...groupRequest, notas: true });
  const pageRequest = sharedGroups(groupRequest);
  await Promise.resolve();
  assert.equal(groupCalls, 1, 'Menu and matrícula page share their raw groups request');
  groupResponse.resolve({ semestre: { id: 4 }, modulos: [] });
  assert.equal(await menuRequest, await pageRequest);
  await sharedGroups(groupRequest);
  assert.equal(groupCalls, 1, 'Navigation reuses the raw groups');
  groupResponse = deferred();
  const changedGroups = sharedGroups({ ...groupRequest, semestreId: 5 });
  groupResponse.resolve({ semestre: { id: 5 }, modulos: [] }); await changedGroups;
  assert.equal(groupCalls, 2);
  groupResponse = deferred();
  const otherGroups = sharedGroups({ ...groupRequest, uid: 'docente-b' });
  groupResponse.resolve({ semestre: { id: 4 }, modulos: [] }); await otherGroups;
  assert.equal(groupCalls, 3, 'Teacher groups never cross user boundaries');
  let attempts = 0;
  const retryGroups = createDocenteModulosLoader(async () => {
    if (++attempts === 1) throw Error('Temporary network failure');
    return { semestre: { id: 4 }, modulos: [] };
  });
  await assert.rejects(retryGroups(groupRequest));
  await retryGroups(groupRequest);
  assert.equal(attempts, 2, 'Failed requests can be retried');

  let calls = 0;
  let next = deferred();
  const store = createAppSettingsStore(() => { calls += 1; return next.promise; });
  const first = store.activate('docente-a');
  const concurrent = store.activate('docente-a');
  const reload = store.reload();
  assert.equal(first, concurrent);
  assert.equal(first, reload, 'All consumers share the initial request');
  await Promise.resolve();
  assert.equal(calls, 1);
  next.resolve(settings(4));
  await first;
  assert.equal(store.getSnapshot().settings.general.semestreActualId, 4);
  const original = store.getSnapshot().settings;
  await store.activate('docente-a');
  assert.equal(calls, 1, 'Entering another page does not refetch configuration');
  next = deferred();
  const same = store.reload();
  next.resolve(settings(4)); await same;
  assert.equal(store.getSnapshot().settings, original, 'An unchanged semester/settings retains the shared object');
  let updates = 0;
  const unsubscribe = store.subscribe(() => { updates += 1; });
  store.setSettings(settings(5));
  assert.equal(store.getSnapshot().settings.general.semestreActualId, 5);
  assert.equal(updates, 1);
  unsubscribe();
  next = deferred();
  const stale = store.reload(); await Promise.resolve();
  await store.activate(null);
  next.resolve(settings(4)); await stale;
  assert.equal(store.getSnapshot().uid, null);
  assert.equal(store.getSnapshot().settings.general.semestreActualId, null, 'Logout discards late responses');
  next = deferred();
  const otherUser = store.activate('docente-b'); await Promise.resolve();
  store.setSettings(settings(6));
  next.resolve(settings(4)); await otherUser;
  assert.equal(store.getSnapshot().settings.general.semestreActualId, 6, 'A pending read cannot overwrite a saved change');
  next = deferred();
  const failed = store.reload(); next.reject(new Error('offline')); await failed;
  assert.equal(store.getSnapshot().settings.general.semestreActualId, 6, 'A failed refresh preserves loaded settings');
  assert.equal(store.getSnapshot().loading, false);

  assert.equal(docenteMenuModuloName({ id: 1, moduloId: 2,
    nombre: 'Carpintería (oct-dic) [Noche] Lun, Mie, @Vie (Richard Ramos)', docenteNombre: 'Richard Ramos' }),
  'Carpintería (oct-dic) [Noche] Lun, Mie, @Vie');
  assert.equal(docenteMenuModuloName({ id: 1, moduloId: 2, nombre: 'Grupo personalizado (oct-dic)' }), 'Grupo personalizado (oct-dic)');
  assert.equal(docenteMenuModuloName({ id: 1, moduloId: 2,
    nombre: 'Carpintería (oct-dic) [Noche] Lun, Mie, @Vie (Nombre anterior)', docenteNombre: 'Richard Ramos' }),
  'Carpintería (oct-dic) [Noche] Lun, Mie, @Vie (Nombre anterior)');
  assert.equal(docenteMenuModuloName({ id: 1, moduloId: 2,
    nombre: 'Confección [Noche] (nivel avanzado) (RICHARD RAMOS)', docenteNombre: 'Richard Ramos' }),
  'Confección [Noche] (nivel avanzado)');
  assert.equal(docenteMenuModuloName({ id: 1, moduloId: 2,
    nombre: 'Confección [Noche] (nivel avanzado)', docenteNombre: 'Richard Ramos' }),
  'Confección [Noche] (nivel avanzado)');
  assert.equal(docenteMenuPeriodo('2026-2'), '26-2');
  assert.equal(docenteMenuPeriodo('2027-1'), '27-1');
  await testMenu();
  console.log('Passed: shared configuration, request deduplication, unchanged values, semester updates, logout/race protection, conventional teacher menu without extra queries, and labels.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
