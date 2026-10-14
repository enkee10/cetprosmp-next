const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const file = 'functions/src/modules/matriculas/handlers.ts';
const ast = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
const helper = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'getGrupoModuloMapping');
assert.ok(helper);
const code = ts.transpileModule(helper.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
let group = { id: 10, semestreId: 4, archivado: true, estado: 'inactivo' };
class HttpsError extends Error { constructor(code, message) { super(message); this.code = code; } }
const map = vm.runInNewContext(`${code}\ngetGrupoModuloMapping`, {
  Number, Promise, https: { HttpsError },
  GET_GRUPO_FOR_MATRICULA_QUERY: 'group', GET_GRUPO_MODULOS_FOR_MATRICULA_QUERY: 'modules',
  dataConnect: { executeGraphql: async query => ({ data: query === 'group' ? { grupo: group } : { grupoModulos: [{ id: 20, grupoId: 10, moduloId: 31 }] } }) },
});
(async () => {
  const result = await map(4, 10);
  assert.equal(result.moduloGrupos[0].grupoModuloId, 20, 'Hidden groups remain enrollable');
  await assert.rejects(() => map(3, 10), /periodo/, 'Semester validation remains enforced');
  group = null;
  await assert.rejects(() => map(4, 10), /no existe/, 'Missing groups remain invalid');
  console.log('Passed: inactive/archived groups remain enrollable; period and existence validation are preserved.');
})().catch(error => { console.error(error); process.exitCode = 1; });
