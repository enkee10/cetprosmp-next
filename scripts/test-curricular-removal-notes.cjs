const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

const transpile = source => ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
class HttpsError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

let response, queries;
const dataConnect = { executeGraphql: async (source, options) => {
  queries.push({ source, variables: options.variables });
  if (source.includes('query CurricularRemovalUnit')) {
    return { data: { competenciaUnidadDidactica: response.relation } };
  }
  return { data: response };
} };
const backend = { exports: {} };
new Function('module', 'exports', 'require', transpile(fs.readFileSync(
  'functions/src/modules/academico/curricularRemoval.ts', 'utf8',
)))(backend, backend.exports, name => {
  if (name === 'firebase-functions/v1') return { https: { HttpsError } };
  if (name === '../core/dataConnectCore.js') return { dataConnect };
  throw Error(`Unexpected import: ${name}`);
});

// Exercise the real UI action with controlled callable responses and confirmation choices.
const source = ts.createSourceFile('view.tsx', fs.readFileSync(
  'src/components/intranet/academico/EstructuraAcademicaMasterDetail.tsx', 'utf8',
), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let action;
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(source) === 'runStructureAction') {
    action = node.initializer.arguments[0].getText(source);
  }
  ts.forEachChild(node, visit);
}
visit(source);
assert(action, 'The UI removal action must exist');

// Exercise the actual callable dispatcher too: a preview must never reach a mutation.
const handlers = ts.createSourceFile('handlers.ts', fs.readFileSync(
  'functions/src/modules/academico/handlers.ts', 'utf8',
), ts.ScriptTarget.Latest, true);
let detachAction;
function findDetach(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(handlers) === 'detachEstructuraAcademicaItem') {
    detachAction = node.initializer.arguments[0].getText(handlers);
  }
  ts.forEachChild(node, findDetach);
}
findDetach(handlers);
assert(detachAction);
let permissionChecks = 0, previewCalls = 0, mutationCalls = 0;
const detach = new Function('requirePermission', 'parseEstructuraActionEntity', 'countCurricularRemovalNotes', 'dataConnect', 'https', 'console',
  transpile(`const handler = ${detachAction};`) + '\nreturn handler;')(
  async () => { permissionChecks++; }, entity => entity,
  (...args) => { previewCalls++; return backend.exports.countCurricularRemovalNotes(...args); },
  { executeGraphql: async () => { mutationCalls++; throw Error('A preview must not execute the deletion path'); } },
  { HttpsError }, { error() {} },
);
async function runUi({ confirm = true, failure, protectedItem = false, entity = 'indicadorCapacidad' } = {}) {
  const calls = [], messages = [], loading = [], errors = [], removals = [], pending = [];
  const dependencies = {
    auth: { currentUser: null }, functions: {}, planCatalog: [], modulos: [],
    curricularRemovalIsProtected: () => protectedItem,
    setActionLoading: value => loading.push(value),
    structureActionRef: { current: false },
    setPendingStructureAction: value => pending.push(value),
    setError: value => errors.push(value),
    httpsCallable: (_functions, name) => async payload => {
      calls.push({ name, payload });
      assert.equal(payload.previewOnly, undefined, 'Deletion must not request a preview');
      if (failure) throw failure;
      return { data: { id: 7 } };
    },
    window: { confirm: message => { messages.push(message); return confirm; } },
    setModulos: update => update([]),
    applyAcademicRemoval: (current, payload) => { removals.push(payload); return current; },
    console: { error() {} },
  };
  const compiled = transpile(`const action = ${action};`);
  const execute = new Function(...Object.keys(dependencies), `${compiled}\nreturn action;`)(...Object.values(dependencies));
  const idFields = { unidadDidactica: 'relacionId', capacidadTerminal: 'capacidadTerminalId', indicadorCapacidad: 'indicadorCapacidadId' };
  await execute('detachEstructuraAcademicaItem', { entity, [idFields[entity]]: 7 });
  assert.deepEqual(loading, protectedItem ? [] : [true, false], 'Loading must finish on success, cancel and error');
  if (!protectedItem) assert.equal(pending.at(-1), null, 'Every exit clears the card loading indicator');
  return { calls, messages, errors, removals, pending };
}

(async () => {
  const countNotes = backend.exports.countCurricularRemovalNotes;
  for (const [entity, field] of [['unidadDidactica', 'relacionId'], ['capacidadTerminal', 'capacidadTerminalId'], ['indicadorCapacidad', 'indicadorCapacidadId']]) {
    queries = [];
    response = { relation: { unidadDidacticaId: 20 }, target: { id: 7 }, indicators: [{ _count: 2 }], capacities: [{ _count: 0 }], units: [{ _count: 0 }] };
    assert.deepEqual(await detach({ entity, [field]: 7, previewOnly: true }, {}), { notasAsociadas: 2 });
    assert(queries.every(query => query.source.trimStart().startsWith('query ')), 'The preview can only read data');
  }
  assert.equal(permissionChecks, 3);
  assert.equal(previewCalls, 3);
  assert.equal(mutationCalls, 0, 'The callable must return before any deletion');
  for (const [entity, field, expected] of [
    ['unidadDidactica', 'relacionId', 162],
    ['capacidadTerminal', 'capacidadTerminalId', 159],
    ['indicadorCapacidad', 'indicadorCapacidadId', 152],
  ]) {
    queries = [];
    response = { relation: { unidadDidacticaId: 20 }, target: { id: 7 }, indicators: [{ _count: 152 }] };
    if (entity !== 'indicadorCapacidad') response.capacities = [{ _count: 7 }];
    if (entity === 'unidadDidactica') response.units = [{ _count: 3 }];
    assert.deepEqual(await countNotes(entity, { [field]: 7 }), { notasAsociadas: expected });
    const query = queries.at(-1);
    assert.equal(query.variables.id, entity === 'unidadDidactica' ? 20 : 7);
    assert(!query.source.includes('limit:'), 'Counts must not truncate at a row limit');
    assert.equal((query.source.match(/isNull: false/g) || []).length,
      entity === 'unidadDidactica' ? 3 : entity === 'capacidadTerminal' ? 2 : 1,
      'Every counted table excludes empty grades and includes zero');
    assert(query.source.includes(entity === 'unidadDidactica' ? 'unidadDidacticaId: { eq: $id }'
      : entity === 'capacidadTerminal' ? 'capacidadTerminalId: { eq: $id }' : 'indicadorCapacidadId: { eq: $id }'));
  }
  response = { target: { id: 7 }, indicators: [{ _count: 0 }] };
  assert.deepEqual(await countNotes('indicadorCapacidad', { indicadorCapacidadId: 7 }), { notasAsociadas: 0 });
  response = { target: null, indicators: [] };
  await assert.rejects(() => countNotes('indicadorCapacidad', { indicadorCapacidadId: 7 }), error => error.code === 'not-found');
  response = { relation: null };
  await assert.rejects(() => countNotes('unidadDidactica', { relacionId: 7 }), error => error.code === 'not-found');
  queries = [];
  for (const id of [undefined, 0, -1, 1.5, 'bad']) {
    await assert.rejects(() => countNotes('capacidadTerminal', { capacidadTerminalId: id }), error => error.code === 'invalid-argument');
  }
  await assert.rejects(() => countNotes('modulo', {}), error => error.code === 'invalid-argument');
  assert.equal(queries.length, 0, 'Invalid requests must not query data');

  for (const entity of ['unidadDidactica', 'capacidadTerminal', 'indicadorCapacidad']) {
      const result = await runUi({ entity });
      assert.equal(result.calls.length, 1, 'Only the confirmed deletion calls the server');
      assert.equal(result.messages.length, 1, 'Only one confirmation is shown');
      assert.equal(result.messages[0].includes('Advertencia:'), false);
      assert.equal(result.messages[0].includes('notas'), false);
      assert.equal(result.removals.length, 1);
      assert.equal(result.pending[0].kind, 'delete');
      assert.deepEqual(result.pending[0].card, { entity: entity === 'unidadDidactica' ? 'competenciaUnidadDidactica' : entity, id: 7 });
      const protectedResult = await runUi({ entity, protectedItem: true });
      assert.equal(protectedResult.calls.length, 0);
      assert.equal(protectedResult.messages.length, 0);
      assert.deepEqual(protectedResult.pending, []);
  }
  const cancelled = await runUi({ confirm: false });
  assert.equal(cancelled.calls.length, 0);
  assert.equal(cancelled.removals.length, 0, 'Cancel must not delete');
  assert.deepEqual(cancelled.pending, [null], 'Cancel must not show a deleting card');
  for (const options of [{ failure: new Error('Solicitud fallida') }, { failure: new Error('Sin conexión') }]) {
    const failed = await runUi(options);
    assert.equal(failed.calls.length, 1);
    assert.equal(failed.messages.length, 1);
    assert.equal(failed.removals.length, 0, 'Failed requests must not remove the local card');
    assert(failed.errors.at(-1));
    assert.equal(failed.pending[0].kind, 'delete');
  }
  console.log('Correcto: preview histórico de solo lectura, protección local y eliminación con una sola solicitud y confirmación sin conteo.');
})().catch(error => { console.error(error); process.exitCode = 1; });
