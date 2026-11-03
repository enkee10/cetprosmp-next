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
async function runUi({ count = 0, confirm = true, failure, entity = 'indicadorCapacidad' } = {}) {
  const calls = [], messages = [], loading = [], errors = [], removals = [], pending = [];
  const dependencies = {
    auth: { currentUser: null }, functions: {}, planCatalog: [],
    setActionLoading: value => loading.push(value),
    structureActionRef: { current: false },
    setPendingStructureAction: value => pending.push(value),
    setError: value => errors.push(value),
    httpsCallable: (_functions, name) => async payload => {
      calls.push({ name, payload });
      if (payload.previewOnly) {
        if (failure) throw failure;
        return { data: { notasAsociadas: count } };
      }
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
  assert.deepEqual(loading, [true, false], 'Loading must finish on success, cancel and error');
  assert.equal(pending.at(-1), null, 'Every exit clears the card loading indicator');
  return { calls, messages, errors, removals, pending };
}

(async () => {
  const countNotes = backend.exports.countCurricularRemovalNotes;
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
    for (const count of [0, 1, 162]) {
      const result = await runUi({ entity, count });
      assert.equal(result.calls.length, 2, 'Preview precedes deletion');
      assert.equal(result.calls[0].payload.previewOnly, true);
      assert.equal(result.calls[1].payload.previewOnly, undefined);
      assert.equal(result.messages.length, 1, 'Only one confirmation is shown');
      assert.equal(result.messages[0].includes('Advertencia:'), count > 0);
      assert.equal(result.messages[0].includes('notas'), count > 0);
      if (count > 0) assert(result.messages[0].includes(`${count} notas asociadas`));
      assert.equal(result.removals.length, 1);
      assert.equal(result.pending[0].kind, 'delete');
      assert.deepEqual(result.pending[0].card, { entity: entity === 'unidadDidactica' ? 'competenciaUnidadDidactica' : entity, id: 7 });
    }
  }
  const cancelled = await runUi({ count: 5, confirm: false });
  assert.equal(cancelled.calls.length, 1);
  assert.equal(cancelled.removals.length, 0, 'Cancel must not delete');
  assert.deepEqual(cancelled.pending, [null], 'Cancel must not show a deleting card');
  for (const options of [{ failure: new Error('Consulta fallida') }, { count: -1 }, { count: undefined, failure: new Error('Sin conexión') }]) {
    const failed = await runUi(options);
    assert.equal(failed.calls.length, 1);
    assert.equal(failed.messages.length, 0);
    assert.equal(failed.removals.length, 0, 'Failed previews must not delete');
    assert(failed.errors.at(-1));
    assert.deepEqual(failed.pending, [null], 'Failed grade checks must not show a deleting card');
  }
  console.log('Correcto: conteo de notas y promedios, dependientes, confirmación con/sin notas, cancelación y errores.');
})().catch(error => { console.error(error); process.exitCode = 1; });
