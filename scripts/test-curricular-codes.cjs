const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(file) {
  const mod = { exports: {} };
  new Function('module', 'exports', ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText)(mod, mod.exports);
  return mod.exports;
}
const { curricularItemCode: code } = load('src/lib/curricularCodes.ts');
const { applyAcademicOrder } = load('src/lib/curricularUpdates.ts');
const { filterCurricularModules } = load('src/lib/curricularFilters.ts');
const comp = { id: 10, nombre: 'Primera competencia', orden: 1 };
const units = [{ id: 20, relacionId: 25, orden: 1, competenciaId: 10, competencia: comp,
  capacidadesTerminales: [{ id: 30, descripcion: 'Primera capacidad', orden: 1, indicadoresCapacidad: [
    { id: 40, descripcion: 'Primer indicador', orden: 1 }, { id: 41, descripcion: 'Segundo indicador', orden: 2 },
  ] }, { id: 31, descripcion: 'Segunda capacidad', orden: 2, indicadoresCapacidad: [] }] }];
let modules = [{ id: 1, planId: 1, orden: 1, competencias: [comp, { id: 11, nombre: 'Segunda competencia', orden: 2 }], unidadesDidacticas: units }];
const original = structuredClone(modules);
const capacityCode = () => `${code('UC', modules[0].competencias, 10)} ${code('C', modules[0].unidadesDidacticas[0].capacidadesTerminales, 30)}`;
assert.equal(capacityCode(), 'UC1 C1');
modules = applyAcademicOrder(modules, 'competencia', [{ id: 10, orden: 2 }, { id: 11, orden: 1 }]);
assert.equal(capacityCode(), 'UC2 C1', 'Parent codes follow the reordered related competency');
modules = applyAcademicOrder(modules, 'capacidadTerminal', [{ id: 30, orden: 2 }, { id: 31, orden: 1 }]);
assert.equal(capacityCode(), 'UC2 C2');
const firstCapacity = modules[0].unidadesDidacticas[0].capacidadesTerminales.find(item => item.id === 30);
assert.equal(`${code('C', modules[0].unidadesDidacticas[0].capacidadesTerminales, 30)} ${code('I', firstCapacity.indicadoresCapacidad, 40)}`, 'C2 I1');
assert.equal(firstCapacity.descripcion, 'Primera capacidad', 'Generated codes are never written into stored text');
assert.deepEqual(original[0].unidadesDidacticas, units, 'Reordering preserves the original tree');
const complete = [{ id: 1, orden: 10, periodActive: false }, { id: 2, orden: 20 }];
assert.equal(code('UD', complete, 2), 'UD2', 'Hidden siblings keep their place in the plan');
assert.equal(code('S', [{ id: 1, orden: null, numeroSesion: 2 }, { id: 2, orden: null, numeroSesion: 1 }], 1), 'S2');
assert.equal(code('M', [], 1), '');
const plans = [{ id: 10, planEstudio: '2026-1' }, { id: 20, planEstudio: '2026-2' }];
const sharedModule = { id: 99, planId: 10, orden: 1, planModulos: [
  { id: 100, planId: 10, orden: 2 }, { id: 101, planId: 20, orden: 3 },
] };
const teacherModules = filterCurricularModules([sharedModule], plans, ['all'], { planIds: [10] });
assert.equal(code('M', teacherModules, 99), 'M2', 'A teacher’s only module keeps its position in the plan');
const otherEdition = filterCurricularModules([sharedModule], plans, ['all'], { planIds: [20] });
assert.equal(code('M', otherEdition, 99), 'M3', 'A shared module uses the selected plan’s order');
const reorderedModules = applyAcademicOrder(teacherModules.map(item => ({ ...item, competencias: [], unidadesDidacticas: [] })), 'modulo', [{ id: 99, orden: 1 }], 10);
const refreshed = filterCurricularModules(reorderedModules, plans, ['all'], { planIds: [10] });
assert.equal(code('M', refreshed, 99), 'M1', 'Reordering updates the plan relation and generated module code');
assert.equal(code('M', [{ id: 1, orden: null }], 1), 'M1', 'Legacy modules without an order retain the fallback');
const { normalizePlanModuleOrders } = require('./normalize-plan-module-order.cjs');
const legacy = {
  planes: [{ id: 1, carreraId: 10 }, { id: 2, carreraId: 20 }, { id: 3, carreraId: 10 }],
  modulos: [{ id: 1, planId: 1, orden: 3 }, { id: 2, planId: 1, orden: 4 }, { id: 3, planId: 1, orden: 5 }, { id: 4, planId: 2, orden: 9 }],
  planModulos: [{ id: 101, planId: 1, moduloId: 1, orden: 3 }, { id: 102, planId: 1, moduloId: 2, orden: 4 },
    { id: 103, planId: 1, moduloId: 3, orden: 5 }, { id: 104, planId: 2, moduloId: 4, orden: 9 },
    { id: 105, planId: 3, moduloId: 2, orden: 20 }, { id: 106, planId: 3, moduloId: 1, orden: 30 }],
};
const normalized = normalizePlanModuleOrders(legacy).expected;
assert.deepEqual(normalized.planModulos.map(row => row.orden), [1, 2, 3, 1, 1, 2], 'Each career plan and edition starts at one');
assert.deepEqual(normalized.modulos.map(row => row.orden), [1, 2, 3, 1], 'Primary module orders follow their own plan');
assert.equal(legacy.modulos[0].orden, 3, 'Preview never mutates its source');
assert.equal(normalizePlanModuleOrders(normalized).changes.length, 0, 'Running the repair twice preserves the same order');
const catalog = normalized.planes.map(row => ({ ...row, planEstudio: 'Plan 2026-1' }));
const scoped = normalized.modulos.map(row => ({ ...row, planModulos: normalized.planModulos.filter(link => link.moduloId === row.id) }));
const onlySecond = filterCurricularModules(scoped.filter(row => row.id === 2), catalog, ['all'], { planIds: [1] });
assert.equal(code('M', onlySecond, 2), 'M2', 'A teacher keeps M2 after career-level normalization');
const anotherEdition = filterCurricularModules(scoped.filter(row => row.id === 2), catalog, ['all'], { planIds: [3] });
assert.equal(code('M', anotherEdition, 2), 'M1', 'A shared module has its own position in each edition');
console.log('Códigos curriculares: orden, relación con los padres, ocultos y textos conservados verificados.');
