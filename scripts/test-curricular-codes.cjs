const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(file, imports = {}) {
  const mod = { exports: {} };
  new Function('module', 'exports', 'require', ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText)(mod, mod.exports, name => imports[name] ?? {});
  return mod.exports;
}
const { curricularItemCode: code, curricularCompetencyCodes, curricularDescendantCodes: descendantCodes,
  curricularPlanCompetencyCodes: planCompetencyCodes, curricularPlanDescendantCodes: planDescendantCodes } = load('src/lib/curricularCodes.ts');
const competencyCodes = competencias => curricularCompetencyCodes([{ id: 1, planId: 1, competencias }], 1);
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
assert.equal(competencyCodes([{ id: 20, nombre: 'Otra técnica', tipo: 'TECNICA', orden: 8 }]).get(20), 'UC1', 'A plan without preceding competencies starts at one');
const reorderedCompetencies = applyAcademicOrder([{ competencias: mixedCompetencies, unidadesDidacticas: [] }], 'competencia', [{ id: 14, orden: 5 }]);
assert.equal(competencyCodes(reorderedCompetencies[0].competencias).get(14), 'UC1', 'Technical codes follow a reordered technical competency');
assert.equal(competencyCodes(reorderedCompetencies[0].competencias).get(11), 'CE1', 'Reordering technical competencies does not change the employability sequence');
assert.deepEqual(mixedCompetencies, competencySnapshot, 'Computing competency codes preserves source content and orders');
assert.deepEqual(competencyCodes([]), new Map());

const planModules = [
  { id: 2, planId: 1, orden: 20, competencias: [
    { id: 23, tipo: 'TECNICA', orden: 3 }, { id: 22, tipo: 'EMPLEABILIDAD', orden: 2 },
    { id: 21, tipo: 'TECNICA', orden: 1 },
  ] },
  { id: 3, planId: 2, orden: 1, competencias: [{ id: 31, tipo: 'TECNICA', orden: 1 }] },
  { id: 1, planId: 1, orden: 10, competencias: mixedCompetencies },
];
const planSnapshot = structuredClone(planModules);
const continuous = planCompetencyCodes(planModules, 1);
assert.deepEqual([10, 12, 14, 21, 23].map(id => continuous.get(id)), ['UC1', 'UC2', 'UC3', 'UC4', 'UC5'], 'UC continues across modules in module order before local competency order');
assert.deepEqual([11, 13, 22].map(id => continuous.get(id)), ['CE1', 'CE2', 'CE3'], 'CE also continues across modules in its own sequence');
assert.equal(continuous.has(31), false, 'Another plan must not change the selected plan numbering');
assert.equal(planCompetencyCodes(planModules, 2).get(31), 'UC1', 'A different plan has its own sequence');
const movedModules = planModules.map(module => module.id === 2 ? { ...module, orden: 5 } : module);
assert.equal(planCompetencyCodes(movedModules, 1).get(21), 'UC1');
assert.equal(planCompetencyCodes(movedModules, 1).get(10), 'UC3', 'Moving a module recomputes the sequence across all its following modules');
const sharedPlans = planModules.map(module => ({ ...module, planModulos: module.id === 1 ? [
  { planId: 1, orden: 1 }, { planId: 2, orden: 2 },
] : module.id === 2 ? [{ planId: 1, orden: 2 }, { planId: 2, orden: 1 }] : [] }));
assert.equal(planCompetencyCodes(sharedPlans, 1).get(21), 'UC4');
assert.equal(planCompetencyCodes(sharedPlans, 2).get(10), 'UC4', 'Shared modules use the selected plan relation order, including its other modules');
assert.equal(planCompetencyCodes([{ id: 0, planId: 1, orden: 0, competencias: [] }, ...planModules], 1).get(21), 'UC4', 'An empty module consumes no competency numbers');
assert.deepEqual(planModules, planSnapshot, 'Plan coding never changes stored orders or content');

const terminalCompetencies = planCompetencyCodes(planModules, 1, true);
assert.deepEqual([10, 12, 14, 21, 23].map(id => terminalCompetencies.get(id)), ['UC1', 'UC2', 'UC3', 'UC1', 'UC2'], 'Occupational competencies restart in each terminal module');
assert.deepEqual([11, 13, 22].map(id => terminalCompetencies.get(id)), ['CE1', 'CE2', 'CE1'], 'Each terminal module also has its own employability sequence');
assert.equal(terminalCompetencies.has(31), false, 'Independent numbering still excludes other plans');
assert.deepEqual(planCompetencyCodes(movedModules, 1, true), terminalCompetencies, 'Reordering terminal modules does not renumber their competencies');
assert.equal(planCompetencyCodes(sharedPlans, 2, true).get(10), 'UC1', 'Shared terminal modules restart in the selected plan edition');
assert.equal(planCompetencyCodes(planModules.filter(module => module.planId === 1), undefined, true).get(21), 'UC1', 'Terminal numbering also works without an explicit plan ID');

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

const continuedPlan = [
  { id: 1, planId: 7, orden: 1, planModulos: [{ planId: 7, orden: 1 }], competencias: [
    { id: 100, nombre: 'Primera', tipo: 'TECNICA', orden: 1 },
    { id: 200, nombre: 'Segunda', tipo: 'TECNICA', orden: 2 },
  ], unidadesDidacticas: [unit(1000, 200, 1, [capacity(2000, [indicator(3000)])])] },
  { id: 2, planId: 7, orden: 2, planModulos: [{ planId: 7, orden: 2 }], competencias: [
    { id: 200, nombre: 'Segunda', tipo: 'TECNICA', orden: 2, esContinuacion: true, continuacionId: 9 },
    { id: 300, nombre: 'Tercera', tipo: 'TECNICA', orden: 1 },
  ], unidadesDidacticas: [
    unit(1001, 200, 1, [capacity(2001, [indicator(3001)])]),
    unit(1002, 300, 1, [capacity(2002, [indicator(3002)])]),
  ] },
];
const terminalPlan = continuedPlan.map(module => ({ ...module,
  competencias: module.competencias.filter(item => !item.esContinuacion),
  unidadesDidacticas: module.unidadesDidacticas.filter(item => item.competenciaId !== 200 || module.id === 1),
}));
const terminalSnapshot = structuredClone(terminalPlan);
const terminalDescendants = planDescendantCodes(terminalPlan, 7, true);
assert.deepEqual([1000, 1002].map(id => terminalDescendants.unidades.get(id)), ['UD1', 'UD1'], 'Units restart in every independent terminal module');
assert.deepEqual([1000, 1002].map(id => planDescendantCodes(terminalPlan, 7).unidades.get(id)), ['UD1', 'UD2'], 'Study programs retain continuous numbering across modules');
const terminalWithHidden = terminalPlan.map(module => ({ ...module,
  unidadesDidacticas: module.unidadesDidacticas.map(item => ({ ...item, periodActive: false })),
}));
assert.deepEqual(planDescendantCodes(terminalWithHidden, 7, true), terminalDescendants, 'Hiding units does not change terminal module codes');
assert.deepEqual(planDescendantCodes(terminalPlan.slice().reverse(), 7, true), terminalDescendants, 'Terminal numbering preserves stored module order');
assert.deepEqual(planDescendantCodes(terminalPlan.filter(module => module.id === 2), 7, true), {
  unidades: new Map([[1002, 'UD1']]), capacidades: new Map([[2002, 'C1']]),
  indicadores: new Map([[3002, 'I1']]), sesiones: new Map(),
}, 'Teachers assigned only a later terminal module start its numbering at one');
assert.deepEqual(terminalPlan, terminalSnapshot, 'Terminal numbering never changes stored curriculum data');
const continuedCompetencyCodes = planCompetencyCodes(continuedPlan, 7);
assert.deepEqual([100, 200, 300].map(id => continuedCompetencyCodes.get(id)), ['UC1', 'UC2', 'UC3'], 'A continuation keeps its first-appearance code and new competencies follow it');
const continuedDescendantCodes = planDescendantCodes(continuedPlan, 7);
assert.deepEqual([1000, 1001, 1002].map(id => continuedDescendantCodes.unidades.get(id)), ['UD1', 'UD2', 'UD3'], 'Units continue across plan modules');
assert.deepEqual([2000, 2001].map(id => continuedDescendantCodes.capacidades.get(id)), ['C1', 'C2'], 'Capabilities continue inside the logical competency');
assert.deepEqual(curricularCompetencyCodes(continuedPlan, 7), continuedCompetencyCodes, 'Full-plan teacher context and continuation codes must agree');
assert.deepEqual(planDescendantCodes([...continuedPlan, { ...continuedPlan[0], id: 3, planId: 8, planModulos: [], unidadesDidacticas: [unit(9999, 900, 1, [])] }], 7), continuedDescendantCodes, 'Another plan must not change the unit or capacity sequence');
const { curricularUnitIdsInOrder } = load('functions/src/modules/academico/curricularUnitOrder.ts');
const combinedRelations = [
  { unidadDidacticaId: 1, orden: 1, competenciaId: 10, competencia: { id: 10, orden: 1, tipo: 'EMPLEABILIDAD' } },
  { unidadDidacticaId: 2, orden: 1, competenciaId: 20, competencia: { id: 20, orden: 1, tipo: 'TECNICA' } },
  { unidadDidacticaId: 3, orden: 1, competenciaId: 30, competenciaContinuacionId: 9, competencia: { id: 30, orden: 3, tipo: 'TECNICA' } },
];
const combinedModule = { competencias: combinedRelations.map(row => ({ ...row.competencia, esContinuacion: Boolean(row.competenciaContinuacionId) })),
  unidadesDidacticas: combinedRelations.map(row => ({ ...row, id: row.unidadDidacticaId })) };
assert.deepEqual(curricularUnitIdsInOrder({ competenciaUnidadesDidacticas: combinedRelations }), [3, 2, 1], 'Reports preserve technical continuations before original technical and employability competencies');
assert.deepEqual(load('src/lib/curricularCodes.ts').curricularUnitsInOrder(combinedModule).map(row => row.id), [3, 2, 1], 'Curricular cards and report columns must use the same order after integration');
const reorderedOrigin = applyAcademicOrder(continuedPlan, 'competencia', [{ id: 100, orden: 2 }, { id: 200, orden: 1 }]);
assert.deepEqual([200, 100, 300].map(id => planCompetencyCodes(reorderedOrigin, 7).get(id)), ['UC1', 'UC2', 'UC3'], 'Reordering the origin updates the continuation code and all following codes');

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

// A teacher sees M2 but needs the preceding competencies of M1, without gaining other plans.
const semestre = { id: 1, titulo: '2026-2' };
const visibleModule = { ...planModules[0], titulo: 'M2', competencias: planModules[0].competencias.map(comp => ({ ...comp, nombre: 'Competencia' })) };
let teacherQuery;
const teacherHandlers = load('functions/src/modules/academico/handlers.ts', {
  'firebase-functions/v1': { https: { onCall: handler => handler, HttpsError: Error } },
  '../core/authCore.js': { isDocenteRole: () => true },
  '../core/permissions.js': { requireAuthenticated() {}, getRequesterRoleId: () => 4 },
  '../core/dataConnectCore.js': { dataConnect: { executeGraphql: async query => {
    teacherQuery = query;
    return { data: {
      users: [{ id: 50 }], personals: [{ id: 60, userId: 50 }], semestres: [semestre],
      planes: [{ id: 1 }, { id: 2 }], planModulos: [],
      grupoModulos: [{ id: 70, moduloId: 2, grupo: { personalId: 60, semestre }, modulo: visibleModule }],
      competencyCodeModules: planModules,
      competenciaUnidadesDidacticas: [], unidadesDidacticas: [], capacidadesTerminales: [], indicadoresCapacidad: [],
    } };
  } } },
  '../settings/handlers.js': { getConfiguredSemestreConsultaIds: async () => [] },
  '../planes/periodSelection.js': { listCurricularSemesters: async () => [semestre], academicPeriodData: async () => ({}) },
  '../competencias/model.js': { projectUnidadRelations: rows => rows },
  './curricularGradeProtection.js': { readCurricularGradeUsage: async () => ({ modules: [], units: [], capacities: [], indicators: [] }) },
  './semesterPlans.js': load('functions/src/modules/academico/semesterPlans.ts'),
});
(async () => {
  const result = await teacherHandlers.listEstructuraAcademicaDocente({ semestreId: 1 }, { auth: { uid: 'teacher' } });
  assert(teacherQuery.includes('competencyCodeModules: modulos'), 'The teacher query must include the complete numbering context');
  assert.deepEqual(result.modulos.map(module => module.id), [2], 'The visible tree must remain restricted to the assigned module');
  assert.deepEqual(result.competencyCodeModules.map(module => module.id).sort(), [1, 2], 'Numbering context excludes unauthorized plans');
  const loadedIds = new Set(result.modulos.map(module => module.id));
  const previousModules = result.competencyCodeModules.filter(module => !loadedIds.has(module.id));
  assert.equal(planCompetencyCodes([...previousModules, ...result.modulos], 1).get(21), 'UC4', 'A teacher assigned only M2 keeps the full plan competency codes');
  const updatedVisible = result.modulos.map(module => ({ ...module, competencias: [
    { id: 24, tipo: 'TECNICA', orden: 0 }, ...module.competencias,
  ] }));
  assert.equal(planCompetencyCodes([...previousModules, ...updatedVisible], 1).get(21), 'UC5', 'Local edits replace visible metadata instead of duplicating or preserving stale competencies');
  console.log('Competencias entre módulos: contexto docente, acceso por plan y actualización local verificados.');
})().catch(error => { console.error(error); process.exitCode = 1; });
