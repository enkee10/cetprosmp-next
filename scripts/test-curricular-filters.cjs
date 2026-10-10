const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const utility = { exports: {} };
new Function('module', 'exports', ts.transpileModule(fs.readFileSync('src/lib/curricularFilters.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText)(utility, utility.exports);
const filters = utility.exports;
const plan = (id, value, year, careerId, careerName, order) => ({ id, planEstudio: value, anio: year,
  carrera: { id: careerId, nombre: careerName, especialidad: { orden: order } } });
const plans = [plan(11, '2024', 2024, 101, 'Cultivo', 1), plan(12, '2024', 2024, 102, 'Panificacion', 3),
  plan(13, '2024', 2024, 103, 'Mecanica', 2), plan(14, '2022', 2022, 102, 'Panificacion', 3),
  plan(15, '2022', 2022, 104, 'Cocina', 1), plan(16, ' 2024 ', 2024, 101, 'Cultivo', 1),
  plan(17, '2026', 2026, 105, 'Carrera sin modulos', 1)];
const modules = [
  { id: 1, titulo: 'Modulo Cultivo', planId: 11, plan: plans[0], orden: 1, unidadesDidacticas: [] },
  { id: 2, titulo: 'Modulo Mecanica', planId: 13, plan: plans[2], orden: 1, unidadesDidacticas: [] },
  { id: 3, titulo: 'Modulo Cocina', planId: 15, plan: plans[4], orden: 1, unidadesDidacticas: [] },
  { id: 99, titulo: 'Modulo compartido', planId: 12, plan: plans[1], orden: 8, planModuloId: 990, planIds: [12, 14],
    unidadesDidacticas: [], planModulos: [{ id: 990, planId: 12, orden: 8, plan: plans[1] },
      { id: 991, planId: 14, orden: 2, plan: plans[3] }] },
];
const catalog = filters.curricularPlanCatalog(plans, modules);
const options = filters.curricularPlanOptions(catalog);
assert.deepEqual(options.map(item => item.label), ['2026', '2024', '2022']);
assert.deepEqual([...options[1].planIds].sort((a, b) => a - b), [11, 12, 13, 16], 'One displayed value encompasses all plan records');
const key24 = options[1].key;
const key22 = options[2].key;
assert.deepEqual(filters.nextCurricularPlanSelection(['all'], ['all', key24]), [key24]);
assert.deepEqual(filters.nextCurricularPlanSelection([key24], [key24, key22]), [key24, key22]);
assert.deepEqual(filters.nextCurricularPlanSelection([key24, key22], [key24, key22, 'all']), ['all']);
assert.deepEqual(filters.nextCurricularPlanSelection([key24], []), ['all']);
const careers = filters.curricularCareerOptions(catalog, [key24, key22]);
assert.deepEqual(careers.map(item => `${item.planLabel}/${item.label}`), [
  '2024/Cultivo', '2024/Mecanica', '2024/Panificacion', '2022/Cocina', '2022/Panificacion',
]);
assert.deepEqual(careers[0].planIds.sort((a, b) => a - b), [11, 16], 'Repeated career records in the same displayed plan form one choice');
assert.equal(filters.curricularCareerOptions(catalog, [key22]).length, 2);
assert.equal(filters.curricularCareerOptions(catalog, ['all']).length, 6, 'Includes careers whose plan has no modules');
assert.deepEqual(filters.filterCurricularModules(modules, catalog, [key24], null).map(item => item.id), [1, 2, 99]);
assert.deepEqual(filters.filterCurricularModules(modules, catalog, [key24, key22], null).map(item => item.id), [1, 2, 99, 3]);
const olderPan = careers.find(item => item.planLabel === '2022' && item.label === 'Panificacion');
const shared = filters.filterCurricularModules(modules, catalog, [key22], olderPan);
assert.equal(shared.length, 1);
assert.equal(shared[0].id, 99);
assert.equal(shared[0].planId, 14);
assert.equal(shared[0].planModuloId, 991, 'Editing/removing a shared module targets its selected plan relation');
assert.equal(shared[0].orden, 2);
assert.equal(shared[0].plan.planEstudio, '2022');
assert.equal(modules[3].planId, 12, 'Filtering does not mutate source data');
assert.equal(filters.filterCurricularModules(modules, catalog, ['all'], careers[0]).length, 1);
const noModulesCareer = filters.curricularCareerOptions(catalog, ['all'])[0];
assert.equal(filters.filterCurricularModules(modules, catalog, ['all'], noModulesCareer).length, 0);
assert.equal(filters.filterCurricularModules([{ id: 100, planId: null }], [], ['all'], null).length, 1);
assert.equal(filters.curricularTitle('Estructura Academica 2026-1'), 'Programación Curricular 2026-1');
assert.equal(filters.curricularTitle('Estructura Académica'), 'Programación Curricular');
const fallback = filters.curricularPlanCatalog([], modules);
assert.ok(fallback.some(item => item.id === 14), 'All plan relations are retained even when using an older server response');
assert.equal(filters.shortCurricularSemester('2026-1'), '26-1');
assert.equal(filters.shortCurricularSemester('2026-2'), '26-2');
const semesterPlans = [
  { ...plans[1], version: { titulo: '2026-1' }, periodoVigencia: { titulo: '2024-1' } },
  { ...plans[1], id: 120, version: { titulo: '2026-2' }, periodoVigencia: { titulo: '2024-1' } },
];
const semesterCareers = filters.curricularCareerOptions(semesterPlans, ['all']);
assert.deepEqual(semesterCareers.map(item => item.semester), ['26-1', '26-2'], 'The prefix comes from the plan version, not its starting period');
assert.equal(semesterCareers.length, 2, 'Career choices from different semesters must remain separate');
assert.deepEqual(semesterCareers.map(item => item.planIds), [[12], [120]]);
assert.equal(filters.curricularCareerOptions([{ ...plans[1], periodoVigencia: { titulo: '2024-1' } }], ['all'])[0].semester, '24-1');
console.log('Programacion Curricular: planes agrupados, multiseleccion, Todos, carreras y orden, planes sin modulos y contexto de modulos compartidos verificados.');
module.exports = { plans, modules };
