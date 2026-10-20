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
  const names = new Set(['docenteMenuCache', 'docenteMenuRequests', 'formatPeriodoMenu', 'normalizeMenuText',
    'getSemestreTitle', 'getSemestreKey', 'getDocenteMenuPairKey', 'buildDocenteMatriculaPath',
    'buildDocenteRegistroItems', 'buildDocenteMatriculaItems', 'buildDocenteEstructuraItem',
    'loadDocenteMenuData', 'buildDocenteSemestreItems', 'buildDocenteRegistrosItems']);
  const code = source.statements.filter((node) =>
    ts.isFunctionDeclaration(node) ? names.has(node.name?.text) : ts.isVariableStatement(node)
      && node.declarationList.declarations.some((item) => names.has(item.name.getText(source))))
    .map((node) => node.getText(source)).join('\n');
  let calls = 0;
  let semesterTitle = '2026-2';
  const args = [];
  const { loadMenu, menuItems } = vm.runInNewContext(ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React },
  }).outputText + '\n({loadMenu:loadDocenteMenuData,menuItems:buildDocenteRegistrosItems})', {
    Map, Set, Promise, URLSearchParams, React: { createElement: () => null },
    functions: {}, AssignmentIcon: 'list', FactCheckIcon: 'notes', AccountTreeIcon: 'structure',
    docenteMenuModuloName, docenteMenuPeriodo, curricularTitle: (title) => title,
    loadDocenteModulos: async (input) => {
      calls += 1; args.push(input);
      return { semestreTitulo: semesterTitle, modulos: [{ id: 20, moduloId: 2,
        nombre: 'Carpintería (oct-dic) [Noche] Lun, Mie, @Vie (Richard Ramos)', docenteNombre: 'Richard Ramos',
        grupo: { semestre: { id: 4, titulo: semesterTitle } } }] };
    },
  });
  const options = { key: 'teacher-a|4', uid: 'teacher-a', semestreId: 4, canViewRegistroAuxiliar: true, canViewMatriculas: true, canViewEstructuraAcademica: true };
  const [first, otherConsumer] = await Promise.all([loadMenu(options), loadMenu(options)]);
  assert.equal(calls, 1, 'Desktop/mobile menu consumers share one request for lists and notes');
  assert.equal(first, otherConsumer);
  const titles = Array.from(menuItems(first), (item) => item.title);
  assert.deepEqual(titles, ['Programación Curricular 26-2',
    'Lista Carpintería (oct-dic) Lun, Mie, @Vie 26-2', 'Notas Carpintería (oct-dic) Lun, Mie, @Vie 26-2']);
  await loadMenu(options); assert.equal(calls, 1, 'Menu navigation uses the session cache');
  semesterTitle = '2027-1';
  const changed = await loadMenu({ ...options, key: 'teacher-a|5' });
  assert.equal(calls, 2, 'A new current semester reloads the menu');
  assert.ok(Array.from(menuItems(changed)).some((item) => item.title.startsWith('Lista ') && item.title.endsWith('27-1')));
  const onlyLists = await loadMenu({ ...options, key: 'teacher-a|5|list-only', canViewRegistroAuxiliar: false, canViewEstructuraAcademica: false });
  assert.equal(menuItems(onlyLists).length, 1);
  assert.equal(args[2].notas, false);
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
  'Carpintería (oct-dic) Lun, Mie, @Vie');
  assert.equal(docenteMenuModuloName({ id: 1, moduloId: 2, nombre: 'Grupo personalizado (oct-dic)' }), 'Grupo personalizado (oct-dic)');
  assert.equal(docenteMenuModuloName({ id: 1, moduloId: 2,
    nombre: 'Carpintería (oct-dic) [Noche] Lun, Mie, @Vie (Nombre anterior)', docenteNombre: 'Richard Ramos' }),
  'Carpintería (oct-dic) Lun, Mie, @Vie');
  assert.equal(docenteMenuPeriodo('2026-2'), '26-2');
  assert.equal(docenteMenuPeriodo('2027-1'), '27-1');
  await testMenu();
  console.log('Passed: shared configuration, request deduplication, unchanged values, semester updates, logout/race protection, one-call menu, cache invalidation, and labels.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
