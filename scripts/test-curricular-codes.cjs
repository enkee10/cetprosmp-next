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
const { curricularItemCode: code, curricularCompetencyCodes: competencyCodes, curricularDescendantCodes: descendantCodes } = load('src/lib/curricularCodes.ts');
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

const mixedCompetencies = [
  { id: 14, nombre: 'Tercera técnica', tipo: 'TECNICA', orden: 50 },
  { id: 12, nombre: 'Segunda técnica', tipo: 'TECNICA', orden: 30, periodActive: true },
  { id: 13, nombre: 'Segunda de empleabilidad', tipo: 'EMPLEABILIDAD', orden: 40, periodActive: false },
  { id: 11, nombre: 'Primera de empleabilidad', tipo: 'EMPLEABILIDAD', orden: 20 },
  { id: 10, nombre: 'Primera técnica', tipo: 'TECNICA', orden: 10, periodActive: false },
];
const competencySnapshot = structuredClone(mixedCompetencies);
const typedCodes = competencyCodes(mixedCompetencies);
assert.deepEqual([10, 12, 14].map(id => typedCodes.get(id)), ['UC1', 'UC2', 'UC3'], 'Technical competencies use UC and count only their own type in stored order');
assert.deepEqual([11, 13].map(id => typedCodes.get(id)), ['CE1', 'CE2'], 'Employability competencies use CE and start their own sequence');
assert.equal(typedCodes.get(12), 'UC2', 'The only selected technical competency keeps UC2 when UC1 is hidden');
assert.equal(typedCodes.get(13), 'CE2', 'A hidden employability competency retains CE2 in its own type sequence');
assert.deepEqual(competencyCodes(mixedCompetencies.map(c => ({ ...c, periodActive: !c.periodActive }))), typedCodes, 'Visibility must never change competency prefixes or numbering');
assert.equal(competencyCodes([{ id: 20, nombre: 'Otra técnica', tipo: 'TECNICA', orden: 8 }]).get(20), 'UC1', 'Another module starts its own type sequence at one');
const reorderedCompetencies = applyAcademicOrder([{ competencias: mixedCompetencies, unidadesDidacticas: [] }], 'competencia', [{ id: 14, orden: 5 }]);
assert.equal(competencyCodes(reorderedCompetencies[0].competencias).get(14), 'UC1', 'Technical codes follow a reordered technical competency');
assert.equal(competencyCodes(reorderedCompetencies[0].competencias).get(11), 'CE1', 'Reordering technical competencies does not change the employability sequence');
assert.deepEqual(mixedCompetencies, competencySnapshot, 'Computing competency codes preserves source content and orders');
assert.deepEqual(competencyCodes([]), new Map());

const indicator = (id, activities = [], orden = 1) => ({ id, orden, aprendizajes: [{ id: id + 1000, actividades: activities }] });
const capacity = (id, indicators, orden = 1) => ({ id, orden, indicadoresCapacidad: indicators });
const unit = (id, competenciaId, orden, capacities) => ({ id, competenciaId, orden, capacidadesTerminales: capacities });
const fullModule = { unidadesDidacticas: [
  unit(30, 10, 30, [capacity(304, [indicator(405, [{ id: 905, orden: 5 }])])]),
  { ...unit(10, 10, 10, [
    capacity(301, [indicator(403, [{ id: 903, orden: null, numeroSesion: 3 }], 2), {
      ...indicator(402), periodActive: false, aprendizajes: [
        { id: 1402, orden: 1, actividades: [{ id: 912, orden: 4 }, { id: 902, orden: 2 }] },
        { id: 2402, orden: 2, actividades: [{ id: 922, orden: null, numeroSesion: 8 }, { id: 932, orden: 6 }] },
      ],
    }], 2),
    { ...capacity(302, [indicator(401, [{ id: 901, orden: 1 }])]), periodActive: false },
  ]), periodActive: false },
  unit(40, 11, 1, [capacity(305, [indicator(406, [{ id: 906, orden: 6 }])])]),
  unit(20, 10, 20, [capacity(303, [indicator(404, [{ id: 904, orden: 4 }])])]),
] };
const fullSnapshot = structuredClone(fullModule);
const codes = descendantCodes(fullModule);
assert.deepEqual([10, 20, 30, 40].map(id => codes.unidades.get(id)), ['UD1', 'UD2', 'UD3', 'UD4'], 'Unit codes follow competency position first and then sibling order inside each competency');
assert.equal(codes.unidades.get(30), 'UD3', 'A unit displayed alone keeps its position across complete parent branches');
const oneUnitPerCompetency = { unidadesDidacticas: [
  { ...unit(3, 103, 3, []), periodActive: true },
  { ...unit(1, 101, 1, []), periodActive: false },
  { ...unit(2, 102, 2, []), periodActive: false },
] };
assert.deepEqual([1, 2, 3].map(id => descendantCodes(oneUnitPerCompetency).unidades.get(id)), ['UD1', 'UD2', 'UD3'], 'A module with one unit per UC must never show UD1 for every unit');
assert.equal(descendantCodes(oneUnitPerCompetency).unidades.get(3), 'UD3', 'Selecting only the third UC must preserve the third unit position in its module');
assert.deepEqual([302, 301, 303, 304].map(id => codes.capacidades.get(id)), ['C1', 'C2', 'C3', 'C4'], 'Capacity codes span every unit of the UC in unit/child order');
assert.equal(codes.capacidades.get(305), 'C1', 'A different UC has its own capacity sequence');
assert.equal(codes.capacidades.get(304), 'C4', 'Selecting the only visible capacity in a later unit must not reset its code');
assert.deepEqual([401, 402, 403, 404, 405].map(id => codes.indicadores.get(id)), ['I1', 'I1', 'I2', 'I1', 'I1'], 'Each capacity numbers its complete indicator list, including hidden indicators');
assert.equal(codes.indicadores.get(403), 'I2', 'The only visible indicator retains I2 when its previous sibling is hidden');
assert.equal(codes.indicadores.get(406), 'I1', 'Indicator numbering starts over in another capacity');
assert.equal(`${codes.capacidades.get(304)} ${codes.indicadores.get(405)}`, 'C4 I1', 'Indicator cards use the capacity code within its UC and their own position within that capacity');
assert.deepEqual([901, 902, 903, 904, 905, 906].map(id => codes.sesiones.get(id)), ['S1', 'S1', 'S1', 'S1', 'S1', 'S1'], 'Each indicator starts its own session sequence');
assert.deepEqual([902, 912, 932, 922].map(id => codes.sesiones.get(id)), ['S1', 'S2', 'S3', 'S4'], 'Sessions include every learning branch of their indicator and follow stored order even when their parent is hidden');
assert.deepEqual(descendantCodes({ unidadesDidacticas: fullModule.unidadesDidacticas.map(u => ({ ...u, periodActive: !u.periodActive })) }), codes, 'Visibility changes must never renumber cards');
const reorderedUnits = { unidadesDidacticas: fullModule.unidadesDidacticas.map(u => ({ ...u, orden: u.id === 30 ? 5 : u.orden })) };
assert.equal(descendantCodes(reorderedUnits).unidades.get(30), 'UD1', 'Reordering a unit updates its position inside its parent branch');
assert.equal(descendantCodes(reorderedUnits).unidades.get(10), 'UD2', 'Hidden units keep their correct new position inside their branch');
assert.equal(descendantCodes(reorderedUnits).unidades.get(40), 'UD4', 'Local child orders must never move a unit ahead of another competency branch');
assert.equal(descendantCodes(reorderedUnits).capacidades.get(304), 'C1', 'Reordering a unit updates the complete UC sequence');
assert.equal(descendantCodes(reorderedUnits).indicadores.get(405), 'I1', 'Indicator codes follow their reordered unit');
assert.deepEqual(fullModule, fullSnapshot, 'Computing codes does not change stored orders or content');
assert.deepEqual(descendantCodes(null), { unidades: new Map(), capacidades: new Map(), indicadores: new Map(), sesiones: new Map() });

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
