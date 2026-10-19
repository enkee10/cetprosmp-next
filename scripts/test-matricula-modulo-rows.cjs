const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

const file = 'functions/src/modules/core/matriculaModuloRows.ts';
const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const exported = { exports: {} };
new Function('module', 'exports', compiled)(exported, exported.exports);
const { buildMatriculaModuloRows } = exported.exports;

const grupos = Array.from({ length: 6 }, (_, index) => ({
  id: index + 1,
  nombre: `Manualidades ${index + 1}`,
  grupo: { id: Math.floor(index / 2) + 10, nombreDisplay: `Grupo ${Math.floor(index / 2) + 10}` },
  moduloId: index + 20,
}));
const link = (id) => ({ grupoModuloId: id, grupoId: grupos[id - 1].grupo.id, moduloId: grupos[id - 1].moduloId });
const matriculas = Array.from({ length: 73 }, (_, index) => ({
  id: index + 100,
  user: { nombre: `Estudiante ${index + 1}` },
  modulosEstudiantes: [link(index % 6 + 1), ...(index < 20 ? [link((index + 1) % 6 + 1)] : [])],
}));
const selected = grupos.map((grupo) => String(grupo.id));
const rows = buildMatriculaModuloRows(matriculas, grupos, selected);
assert.equal(rows.length, 93, '73 enrollments with 93 module enrollments produce 93 rows');
assert.equal(new Set(rows.map((row) => row.rowId)).size, 93, 'Every grid row has a unique ID');
assert.equal(new Set(rows.map((row) => row.id)).size, 73, 'Actions retain the 73 original enrollment IDs');
assert.equal(rows[0].grupoModuloNombre, 'Manualidades 1');
assert.strictEqual(rows[0].modulosEstudiantes, matriculas[0].modulosEstudiantes, 'A row retains all links for editing');
assert.strictEqual(rows[0].user, matriculas[0].user);

const oneModule = buildMatriculaModuloRows(matriculas, grupos, ['1']);
assert.ok(oneModule.length > 0);
assert.ok(oneModule.every((row) => row.grupoModuloId === 1), 'A selected module never shows sibling modules');
assert.equal(selected.reduce((sum, id) => sum + buildMatriculaModuloRows(matriculas, grupos, [id]).length, 0), 93);
assert.equal(buildMatriculaModuloRows(matriculas, grupos).length, 93, 'All modules are shown without a filter');
assert.equal(buildMatriculaModuloRows(matriculas, grupos, []).length, 0, 'An empty teacher scope has no rows');

const twoInstances = [grupos[0], { ...grupos[0], id: 99, nombre: 'Otra instancia' }];
assert.equal(buildMatriculaModuloRows([matriculas[0]], twoInstances, ['99']).length, 0,
  'An explicit instance ID takes precedence over an identical group/module pair');
const legacy = { id: 1, modulosEstudiantes: [{ grupoId: 10, moduloId: 20 }] };
assert.equal(buildMatriculaModuloRows([legacy], grupos, ['1']).length, 1, 'Legacy links match by group and module');
assert.equal(buildMatriculaModuloRows([legacy], grupos, ['2']).length, 0);
const nested = { id: 2, modulosEstudiantes: [{ grupoModulo: { id: 1, nombre: 'Manualidades 1' } }] };
assert.equal(buildMatriculaModuloRows([nested], [], ['1'])[0].grupoModuloNombre, 'Manualidades 1');
const duplicateLink = { id: 3, modulosEstudiantes: [link(1), link(1), link(2)] };
assert.equal(buildMatriculaModuloRows([duplicateLink], grupos).length, 2, 'Repeated links do not duplicate the same instance');
assert.equal(buildMatriculaModuloRows([{ id: 4 }], grupos).length, 1, 'Unassigned enrollments remain manageable in the general view');
assert.equal(buildMatriculaModuloRows([{ id: 4 }], grupos, ['1']).length, 0);

// Simulate the refreshed API response after changing/deleting one enrollment.
const changed = matriculas.map((item) => item.id === 100 ? { ...item, modulosEstudiantes: [link(5), link(6)] } : item);
const changedRows = buildMatriculaModuloRows(changed, grupos, selected).filter((row) => row.id === 100);
assert.deepEqual(changedRows.map((row) => row.grupoModuloId), [5, 6], 'Refresh replaces all rows of the edited enrollment');
const removedModule = matriculas.map(item => item.id === 100 ? { ...item, modulosEstudiantes: item.modulosEstudiantes.slice(1) } : item);
const deletedRows = buildMatriculaModuloRows(removedModule, grupos, selected);
assert.equal(deletedRows.length, 92);
assert.equal(deletedRows.filter(row => row.id === 100).length, 1, 'Deleting one module retains the sibling row of the same enrollment');
const identified = { ...matriculas[0], modulosEstudiantes: matriculas[0].modulosEstudiantes.map((item, i) => ({ ...item, id: 501 + i })) };
assert.equal(buildMatriculaModuloRows([identified], grupos)[1].moduloEstudianteId, 502, 'Rows carry the exact link ID for independent deletion');
assert.equal(matriculas[0].modulosEstudiantes[0].grupoModuloId, 1, 'Building rows never mutates source data');

console.log('Passed: 93 module rows / 73 enrollments, filters, instance IDs, legacy links, shared actions and refreshed changes.');
