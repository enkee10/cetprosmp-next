const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const compile = source => ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
class HttpsError extends Error { constructor(code, message) { super(message); this.code = code; } }
function extract(file, names) {
  const ast = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  return ast.statements.filter(node => (ts.isFunctionDeclaration(node) && names.includes(node.name?.text))
    || (ts.isVariableStatement(node) && node.declarationList.declarations.some(d => names.includes(d.name.getText(ast)))))
    .map(node => node.getText(ast)).join('\n');
}
const groups = new Map([[1, { id: 1, grupoId: 10, moduloId: 20 }], [2, { id: 2, grupoId: 10, moduloId: 21 }],
  [3, { id: 3, grupoId: 10, moduloId: 20 }]]);
let links, parents, grades, writes;
const reset = () => {
  parents = new Set([50, 51]);
  links = new Map([[101, { id: 101, matriculaId: 50, grupoModuloId: 1, grupoId: 10, moduloId: 20, matricula: { userId: 7 } }],
    [102, { id: 102, matriculaId: 50, grupoModuloId: 2, grupoId: 10, moduloId: 21, matricula: { userId: 7 } }],
    [103, { id: 103, matriculaId: 51, grupoModuloId: 1, grupoId: 10, moduloId: 20, matricula: { userId: 8 } }]]);
  grades = new Map([[101, 13], [102, 18], [103, 17]]);
  writes = [];
};
const coreModule = { exports: {} };
vm.runInNewContext(compile(fs.readFileSync('functions/src/modules/core/matriculaModuloDeletion.ts', 'utf8')), {
  exports: coreModule.exports, module: coreModule,
  require: name => name === 'firebase-functions/v1' ? { https: { HttpsError } } : { dataConnect: { executeGraphql: async (query, { variables: v }) => {
    if (query.includes('query MatriculaModuloDeleteContext')) return { data: { grupoModulo: groups.get(v.grupoModuloId), moduloEstudiante: links.get(v.moduloEstudianteId) } };
    // Mock the SQL Connect transaction at its boundary; assert its exact target IDs.
    const target = links.get(v.moduloEstudianteId);
    assert.equal(target.matriculaId, v.matriculaId);
    writes.push({ ...v });
    links.delete(v.moduloEstudianteId);
    grades.delete(v.moduloEstudianteId);
    const empty = ![...links.values()].some(link => link.matriculaId === v.matriculaId);
    if (empty) parents.delete(v.matriculaId);
    return { data: { matricula_deleteMany: Number(empty) } };
  } } },
});
const { deleteMatriculaModulo } = coreModule.exports;

async function testDeletionHandlers() {
  const module = { exports: {} };
  const accesses = [];
  vm.runInNewContext(compile(extract('functions/src/modules/matriculas/handlers.ts', ['deleteMatricula']) + '\n'
    + extract('functions/src/modules/registro-auxiliar/handlers.ts', ['retireRegistroAuxiliarMatricula'])), {
    module, exports: module.exports, console, https: { HttpsError, onCall: fn => fn },
    toNumber: (value, fallback) => Number(value) || fallback,
    requirePermission: async (_ctx, area, action) => accesses.push(`${area}:${action}`),
    ensureRegistroAuxiliarAccess: async (_ctx, group, action) => accesses.push(`registro:${group}:${action}`),
    deleteMatriculaModulo, syncMatriculasCurrentSemesterSheetBestEffort: async () => {},
  });
  reset();
  const result = await module.exports.deleteMatricula({ id: 50, grupoModuloId: 1, moduloEstudianteId: 101 }, {});
  assert.equal(result.matriculaDeleted, false);
  assert.ok(!links.has(101));
  assert.ok(links.has(102) && parents.has(50), 'Removing A preserves the parent enrollment and B');
  assert.equal(grades.get(102), 18, 'B retains its grades');
  assert.ok(links.has(103) && parents.has(51), 'Another student in A is unchanged');
  assert.equal(grades.get(103), 17);
  await assert.rejects(() => module.exports.deleteMatricula({ id: 50 }, {}), error => error.code === 'invalid-argument',
    'Older clients cannot accidentally delete an entire enrollment');
  assert.equal(writes.length, 1);
  const last = await module.exports.retireRegistroAuxiliarMatricula({ grupoModuloId: 2, moduloEstudianteId: 102 }, {});
  assert.equal(last.matriculaDeleted, true, 'Removing the last module cleans up the empty parent');
  assert.ok(!parents.has(50) && parents.has(51));
  assert.ok(accesses.includes('registro:2:delete'), 'Registry deletion checks access to the selected module');
  reset();
  await assert.rejects(() => deleteMatriculaModulo(3, 101, 50), error => error.code === 'failed-precondition',
    'Two instances of the same group and module are not interchangeable');
  await assert.rejects(() => deleteMatriculaModulo(1, 101, 999), error => error.code === 'failed-precondition');
  await assert.rejects(() => deleteMatriculaModulo(1, 999, 50), error => error.code === 'not-found');
  assert.equal(writes.length, 0, 'Mismatched/stale IDs never reach a mutation');
  await module.exports.retireRegistroAuxiliarMatricula({ grupoModuloId: 1, moduloEstudianteId: 101 }, {});
  assert.ok(links.has(102) && links.has(103), 'Registry removal also affects only the selected inscription');
}

async function testEditingAfterRemoval() {
  const module = { exports: {} };
  const surviving = { id: 102, grupoModuloId: 2, grupoId: 10, moduloId: 21, promedio: 18 };
  let persisted = [surviving], replacements = 0, scheduleIds;
  let mapping = { grupoId: 10, moduloGrupos: [{ grupoModuloId: 1, grupoId: 10, moduloId: 20 }, surviving] };
  const source = extract('functions/src/modules/matriculas/handlers.ts', [
    'updateMatriculaFormulario', 'hasGrupoModuloSelectionChanged', 'sortModuloChangeItems', 'getModuloChangeKey',
  ]);
  vm.runInNewContext(compile(source), {
    module, exports: module.exports, console, https: { HttpsError, onCall: fn => fn },
    toNumber: (value, fallback) => Number(value) || fallback, requirePermission: async () => {},
    normalizeDocumentType: value => value, normalizeDocumentNumber: value => value, normalizeMatriculaRecibo: value => value,
    getMatriculaById: async () => ({ id: 50, grupoId: 10, semestreId: 2, userId: 7, user: { id: 7 }, modulosEstudiantes: persisted }),
    resolveWorkspaceEmailForMatriculaUser: () => null, getMatriculaWorkspaceGroups: async () => [],
    findStudentUserByDocument: async () => ({ id: 7 }), isStudentMatriculaUser: () => true,
    saveUserForMatricula: async () => ({ userId: 7 }), getGrupoModuloMapping: async () => mapping,
    ensureNoMatriculaDuplicates: async () => {},
    ensureNoMatriculaScheduleConflicts: async ({ selections }) => { scheduleIds = selections.map(item => item.grupoModuloId); },
    isDocenteMatriculaRequester: () => false, buildMatriculaDataFromInput: value => value,
    dataConnect: { executeGraphql: async () => ({ data: { matricula_update: { id: 50 } } }) },
    UPDATE_MATRICULA_MUTATION: 'update', getIdFromKeyOutput: value => value.id,
    getRequesterDataConnectUserId: async () => 1, recordMatriculaModuloChanges: async () => {},
    replaceModuloEstudiantesForMatricula: async (_id, items) => { replacements++; persisted = items; },
    syncMatriculaWorkspaceGroupChange: async () => null,
    enqueueMatriculaAvatarExtractionFromExistingProcessed: async () => {}, syncMatriculasCurrentSemesterSheetBestEffort: async () => {},
  });
  const input = { id: 50, tipoDocumento: 'DNI', dni: '12345678', semestreId: 2, grupoId: 10, recibo: '1', procesarImagenesDni: false };
  await module.exports.updateMatriculaFormulario(input, {});
  assert.equal(replacements, 0, 'Saving the same group does not recreate deleted A or replace surviving B');
  assert.strictEqual(persisted[0], surviving);
  assert.equal(persisted[0].promedio, 18);
  assert.equal(scheduleIds.join(','), '2', 'Schedule checks include only the surviving modules');
  mapping = { grupoId: 30, moduloGrupos: [{ grupoModuloId: 4, grupoId: 30, moduloId: 22 }, { grupoModuloId: 5, grupoId: 30, moduloId: 23 }] };
  await module.exports.updateMatriculaFormulario({ ...input, grupoId: 30 }, {});
  assert.equal(replacements, 1, 'Changing the group replaces all remaining old module links');
  assert.equal(persisted.map(item => item.grupoModuloId).join(','), '4,5');
}

(async () => {
  await testDeletionHandlers();
  await testEditingAfterRemoval();
  console.log('Passed: scoped deletion from both lists, preserved sibling/student grades, last-module cleanup, exact instance checks, stale clients, same-group edits and group replacement.');
})().catch(error => { console.error(error); process.exitCode = 1; });
