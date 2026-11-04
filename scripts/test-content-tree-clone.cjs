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
const sourceGraph = {
  modulos: [{ id: 10 }], planModulos: [], competencias: [], continuaciones: [], relaciones: [], unidades: [{ id: 50 }],
  capacidades: [{ id: 40, unidadDidacticaId: 50 }],
  indicadores: [{ id: 20, capacidadTerminalId: 40 }], aprendizajes: [{ id: 19, indicadorCapacidadId: 20 }],
  actividades: [{ id: 60, aprendizajeId: 19, moduloId: 10, temas: 'Primer tema\nSegundo tema' }], materiales: [],
  // Deliberately read children before their parents: insertion order must not matter.
  contenidos: [
    { id: 33, texto: 'Nieto', orden: 3, indicadorCapacidadId: 20, contenidoPadreId: 32 },
    { id: 32, texto: 'Hijo', orden: 2, indicadorCapacidadId: 20, contenidoPadreId: 31 },
    { id: 31, texto: 'Raíz', orden: 1, indicadorCapacidadId: 20, contenidoPadreId: null },
  ],
};
let mutation;
const clone = load('functions/src/modules/planes/clonePlan.ts', {
  '../core/dataConnectCore.js': { dataConnect: { executeGraphql: async query => {
    if (query.includes('PreviousCareerPlans')) return { data: { planes: [{ id: 1, carreraId: 5 }] } };
    mutation = query;
    return { data: { created: { id: 2 } } };
  } } },
  './curriculumGraph.js': { ...load('functions/src/modules/planes/curriculumGraph.ts', { '../core/dataConnectCore.js': {} }), readCurriculumGraph: async () => sourceGraph, PLAN_FIELDS: '', MODULE_FIELDS: '', UNIT_FIELDS: '' },
  './periodSelection.js': { listSelectionSemesters: async () => [], semesterOrder: () => '' },
  './visibilityPolicy.js': { plansAllowingPeriodSelection: async () => new Set() },
});
(async () => {
  await clone.createPlanWithPreviousCurriculum({ carreraId: 5 });
  assert(mutation.includes('@transaction'));
  assert(mutation.includes('ctp0:indicadorContenido_update(id_expr:"response.ct0.id",data:{contenidoPadreId_expr:"response.ct1.id"})'));
  assert(mutation.includes('ctp1:indicadorContenido_update(id_expr:"response.ct1.id",data:{contenidoPadreId_expr:"response.ct2.id"})'));
  assert(!mutation.includes('ctp2:'), 'Roots remain roots');
  assert(mutation.indexOf('ct2:indicadorContenido_insert') < mutation.indexOf('ctp0:'), 'All parents are created before linking their children');
  assert(!mutation.includes('contenidoPadreId:31') && !mutation.includes('contenidoPadreId:32'), 'The copy must never reference the original plan contents');
  assert(mutation.includes(`temas:${JSON.stringify(sourceGraph.actividades[0].temas)}`), 'Copying a plan preserves activity topics');
  console.log('Correcto: la copia de planes conserva los temas de las actividades y vincula cada subcontenido a su padre copiado.');
})().catch(error => { console.error(error); process.exitCode = 1; });
