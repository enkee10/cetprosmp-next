const fs = require('node:fs');
const assert = require('node:assert/strict');
const ts = require('typescript');
const operations = [];
function load(file, imports = {}, fallback) {
  const mod = { exports: {} };
  new Function('module', 'exports', 'require', ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText)(mod, mod.exports, name => name in imports ? imports[name] : fallback ? fallback(name) : require(name));
  return mod.exports;
}
class HttpsError extends Error { constructor(code, message) { super(message); this.code = code; } }
let responseFor;
const dc = { executeGraphql: async (source, args = {}) => { operations.push({ source, variables: args.variables || {} }); return { data: await responseFor(source, args.variables || {}) }; } };
const https = { HttpsError, onCall: fn => fn };
const permissions = { requirePermission: async () => {} };
const mappers = load('functions/src/modules/core/userMappers.ts');
const creation = load('functions/src/modules/academico/curricularCreation.ts', { 'firebase-functions/v1': { https }, '../core/dataConnectCore.js': { dataConnect: dc } });
const context = { modulo: { id: 1 }, programa: false, competencias: [{ id: 10, orden: null }], relations: [], unidadIds: [] };
const services = { getModuloCompetenciaContext: async () => context, attachUnidadToModulo: async (...args) => {
  assert.equal(args[3], 10); assert.equal(args[4].preserveSelectedCompetencia, true);
} };
const common = { 'firebase-functions/v1': { https }, '../core/dataConnectCore.js': { dataConnect: dc }, '../core/permissions.js': permissions,
  '../../dataconnectOperations.js': load('functions/src/dataconnectOperations.ts'),
  '../core/userMappers.js': mappers, './curricularCreation.js': creation, '../competencias/service.js': services,
  '../competencias/model.js': { expectedCompetenciaType: () => 'TECNICA' }, '../materiales/handlers.js': {} };
const editing = load('functions/src/modules/academico/curricularEditing.ts', common);
const handlers = load('functions/src/modules/academico/handlers.ts', { ...common, './curricularEditing.js': editing }, () => ({}));
const updates = load('src/lib/curricularUpdates.ts');
const unit = { id: 20, relacionId: 21, competenciaId: 10, competencia: { id: 10, moduloId: 1, nombre: 'UC1', tipo: 'TECNICA' }, orden: null,
  capacidadesTerminales: [{ id: 30, unidadDidacticaId: 20, orden: null, indicadoresCapacidad: [{ id: 40, capacidadTerminalId: 30, orden: null,
    aprendizajes: [{ id: 50, descripcion: 'Existente', orden: null, indicadorCapacidadId: 40, actividades: [{ id: 60, aprendizajeId: 50, moduloId: 1, orden: null, contenidos: [], materiales: [] }] }] }] }] };
const base = [{ id: 1, planId: 5, orden: null, plan: { id: 5 }, planModulos: [{ id: 2, planId: 5, orden: null }], competencias: [{ id: 10, orden: null, tipo: 'TECNICA' }], unidadesDidacticas: [unit] },
  { id: 2, planId: 5, orden: 2, competencias: [], unidadesDidacticas: [] }];
const cases = [
  ['modulo', { planId: 5 }, { id: 100, orden: 11, planId: 5, planModulos: [{ id: 101, planId: 5, orden: 11 }] }, 10, 'modulo'],
  ['competencia', { moduloId: 1, tipo: 'TECNICA' }, { id: 100, moduloId: 1, orden: 11, tipo: 'TECNICA' }, 10, 'competencia'],
  ['unidadDidactica', { moduloId: 1, competenciaId: 10 }, { id: 100 }, 21, 'competenciaUnidadDidactica'],
  ['capacidadTerminal', { unidadDidacticaId: 20 }, { id: 100, unidadDidacticaId: 20, orden: 91 }, 90, 'capacidadTerminal'],
  ['indicadorCapacidad', { capacidadTerminalId: 30 }, { id: 100, capacidadTerminalId: 30, orden: 91 }, 90, 'indicadorCapacidad'],
  ['aprendizaje', { indicadorCapacidadId: 40 }, { id: 100, indicadorCapacidadId: 40, orden: 91 }, 90, 'aprendizaje'],
  ['actividad', { moduloId: 1, indicadorCapacidadId: 40, aprendizajeId: 50 }, { id: 100, aprendizajeId: 50, moduloId: 1, orden: 61, aprendizaje: { id: 50, indicadorCapacidadId: 40, orden: null } }, 60, 'actividad'],
];
(async () => {
  for (const [entity, payload, item, previousMax, dragEntity] of cases) {
    const start = operations.length;
    responseFor = (query, vars) => {
      if (query.includes('query ListPlanModuloRelationsByPlan')) return { modulos: [{ id: 1, orden: 3 }], planModulos: [{ id: 2, moduloId: 10, orden: null, modulo: { id: 10, orden: null } }] };
      if (query.includes('query ListUnidadRelationsByModulo')) return { competenciaUnidadesDidacticas: [{ id: 21, orden: null }] };
      if (query.startsWith('query CurricularNextChildOrder')) return { items: [{ id: 20, orden: 4 }, { id: 90, orden: null }] };
      if (query.startsWith('query CurricularSesiones')) return { actividads: [{ id: 60, orden: null, moduloId: 1, aprendizaje: { id: 50, indicadorCapacidadId: 40 } }] };
      if (query.includes('query ListGrupoModuloUnidadSync')) return { grupoModulos: [], grupoModuloUnidadesDidacticas: [] };
      if (query.startsWith('query CurricularCreatedItem')) return { item };
      if (query.startsWith('query CurricularUnitAssignments')) return { unitAssignments: [{ id: 101, orden: 22, unidadDidacticaId: 100, competenciaId: 10, competencia: { id: 10, nombre: 'UC1', tipo: 'TECNICA', moduloId: 1 } }] };
      if (/^\s*mutation/.test(query)) {
        if (query.includes('CurricularCreateSesionInLearning')) return { sesion: { id: 100 } };
        return Object.fromEntries(['competencia_insert', 'modulo_insert', 'planModulo_insert', 'unidadDidactica_insert', 'capacidadTerminal_insert', 'indicadorCapacidad_insert', 'aprendizaje_insert'].map(key => [key, { id: key === 'planModulo_insert' ? 101 : 100 }]));
      }
      throw Error(query);
    };
    const result = await handlers.createEstructuraAcademicaItem({ entity, ...payload }, {});
    assert.equal(result.id, 100); assert.equal(result.entity, entity);
    const calls = operations.slice(start);
    const create = calls.find(call => /^\s*mutation/.test(call.source) && (call.variables.data?.orden != null || call.variables.orden != null));
    if (entity !== 'unidadDidactica') assert.equal(create.variables.data?.orden ?? create.variables.orden, previousMax + 1, `${entity}: last effective order + 1`);
    const before = structuredClone(base);
    const created = updates.applyAcademicCreation(base, result);
    assert.deepEqual(base, before, 'Creation must not mutate state');
    if (entity !== 'modulo') assert.equal(created[1], base[1], 'Unrelated module must retain its reference');
    const dragId = entity === 'unidadDidactica' ? 101 : 100;
    const ordered = updates.applyAcademicOrder(created, dragEntity, [{ id: dragId, orden: 1 }], 5);
    const locations = load('src/lib/curricularReassignment.ts').academicLocations(ordered);
    assert.equal(locations.get(`${dragEntity}:${dragId}`).orden, 1, 'New item must accept immediate reordering');
    assert.equal(updates.applyAcademicCreation(created, result).length, created.length, 'Repeated creation response must not duplicate modules');
  }
  assert.equal(creation.nextCurricularOrder([]), 1);
  assert.equal(creation.nextCurricularOrder([{ id: 3, orden: 20 }, { id: 99, orden: null }]), 100);
  responseFor = query => {
    if (query.startsWith('query CurricularLearningOrder')) return { aprendizajes: [{ id: 50 }, { id: 100 }] };
    if (query.startsWith('mutation CurricularSaveOrder')) return {};
    throw Error(query);
  };
  await editing.reorderCurricularExtra('aprendizaje', [{ id: 100, orden: 1 }, { id: 50, orden: 2 }], { indicadorCapacidadId: 40 });
  assert.match(operations.at(-1).source, /aprendizaje_update\(id:100,data:\{orden:1\}\)/);
  await assert.rejects(editing.reorderCurricularExtra('aprendizaje', [{ id: 999, orden: 1 }], { indicadorCapacidadId: 40 }), { code: 'failed-precondition' });
  responseFor = query => {
    if (query.startsWith('query CurricularCompetenciaOrder')) return { competencias: [{ id: 50, tipo: 'TECNICA' }, { id: 100, tipo: 'EMPLEABILIDAD' }] };
    if (query.startsWith('mutation CurricularSaveOrder')) return {};
    throw Error(query);
  };
  await editing.reorderCurricularExtra('competencia', [{ id: 100, orden: 1 }, { id: 50, orden: 2 }], { moduloId: 1 });
  assert(!operations.at(-1).source.includes('tipo:'), 'Reordering must preserve Technical/Employability types');
  responseFor = query => {
    if (query.startsWith('mutation CurricularSaveChildOrder')) return {};
    throw Error(query);
  };
  for (const entity of ['competenciaUnidadDidactica', 'capacidadTerminal', 'indicadorCapacidad']) {
    await handlers.reorderEstructuraAcademicaItems({ entity, items: [{ id: 100, orden: 1 }, { id: 50, orden: 2 }] }, {});
    assert.match(operations.at(-1).source, /@transaction/);
    assert.equal((operations.at(-1).source.match(/_update\(/g)||[]).length, 2);
    assert(!/competenciaId:|unidadDidacticaId:|capacidadTerminalId:/.test(operations.at(-1).source), 'Ordering must not change parents');
  }
  const legacy = structuredClone(base);
  legacy[0].unidadesDidacticas[0].id = 9000;
  const createdUnit = updates.applyAcademicCreation(legacy, { id: 100, entity: 'unidadDidactica', item: { id: 100 }, unitAssignments: [{ id: 101, orden: 22, unidadDidacticaId: 100, competenciaId: 10, competencia: unit.competencia }] });
  assert.equal(createdUnit[0].unidadesDidacticas.at(-1).id, 100, 'Unit order fallback must use relation ID, matching the backend');
  const filters = load('src/lib/curricularFilters.ts');
  assert.deepEqual(filters.filterCurricularModules([{ id: 10, orden: null }, { id: 20, orden: null }, { id: 100, orden: 21 }], [], ['all'], null).map(row => row.id), [10, 20, 100], 'New module must follow legacy modules with null order');
  if (process.argv.includes('--capture')) { fs.mkdirSync('tmp/curricular-create-validation', { recursive: true }); fs.writeFileSync('tmp/curricular-create-validation/operations.json', JSON.stringify(operations, null, 2)); }
  console.log('Creacion: siete secciones, orden siguiente, IDs reales, actualizacion parcial y arrastre inmediato: correctos.');
})().catch(error => { console.error(error); process.exitCode = 1; });
