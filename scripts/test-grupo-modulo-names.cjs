const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

// Run the production module-rename helper with mocked reads and writes.
const file = 'functions/src/modules/modulos/handlers.ts';
const ast = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
const helper = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'syncGrupoModulosNombreForModulo');
assert.ok(helper, 'The production rename helper must exist');
const renamed = [];
const original = [
  { id: 101, nombre: 'Nombre personalizado A', grupo: { id: 1 }, modulo: { id: 7 } },
  { id: 102, nombre: 'Nombre personalizado B', grupo: { id: 1 }, modulo: { id: 7 } },
  { id: 103, nombre: '', grupo: { id: 1 }, modulo: { id: 7 } },
];
const code = ts.transpileModule(helper.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
const sync = vm.runInNewContext(`${code}\nsyncGrupoModulosNombreForModulo`, {
  Promise,
  buildGrupoModuloNombreRelacional: () => 'Nombre para instancia sin nombre',
  LIST_GRUPO_MODULOS_FOR_MODULO_RENAME_QUERY: 'read',
  UPDATE_GRUPO_MODULO_MUTATION: 'update',
  dataConnect: { executeGraphql: async (query, options) => {
    if (query === 'read') return { data: { grupoModulos: original } };
    renamed.push(options.variables);
    return { data: {} };
  } },
});
sync(7).then(() => {
  assert.equal(renamed.length, 1, 'Module rename preserves all existing names');
  assert.equal(renamed[0].id, 103);
  assert.equal(renamed[0].data.nombre, 'Nombre para instancia sin nombre');
  console.log('Passed: module rename preserves custom instance names and only fills empty names.');
}).catch(error => { console.error(error); process.exitCode = 1; });
