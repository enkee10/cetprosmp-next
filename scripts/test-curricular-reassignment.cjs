const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const operations = [];
function load(file, imports = {}) {
  const mod = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  new Function('module', 'exports', 'require', code)(mod, mod.exports, name => {
    if (name in imports) return imports[name];
    throw new Error(`Unexpected dependency: ${name}`);
  });
  return mod.exports;
}
const tree = load('src/lib/curricularReassignment.ts');
const makeModule = id => {
  const comp = { id: id * 10 + 1, nombre: 'UC1', tipo: 'TECNICA', orden: 1 };
  return { id, titulo: `Modulo ${id}`, planId: id, plan: null, competencias: [comp],
    unidadesDidacticas: [{ id: id * 100 + 1, relacionId: id * 100 + 2, competenciaId: comp.id, competencia: { ...comp, moduloId: id }, nombre: `Unidad ${id}`, orden: 1, duracion: 40, creditos: 2,
      capacidadesTerminales: [{ id: id * 1000 + 1, unidadDidacticaId: id * 100 + 1, descripcion: 'C1', orden: 1, competencias: [{ ...comp, moduloId: id }],
        indicadoresCapacidad: [{ id: id * 10000 + 1, capacidadTerminalId: id * 1000 + 1, descripcion: 'I1', orden: 1, contenidos: [{ id: id * 10000000 + 1, texto: 'Contenido', orden: 1 }],
          aprendizajes: [{ id: id * 100000 + 1, orden: 1, indicadorCapacidadId: id * 10000 + 1, descripcion: 'Aprendizaje', actividades: [{ id: id * 1000000 + 1, aprendizajeId: id * 100000 + 1, moduloId: id, nombre: 'Sesion', orden: 1, duracion: 2,
            materiales: [{ id: id * 10000000 + 2, texto: 'Material', orden: 1 }] }] }] }] }] }] };
};
const cases = [
  ['competencia', 21, 'modulo', 1, 2, 1],
  ['competenciaUnidadDidactica', 202, 'competencia', 11, 21, 11],
  ['capacidadTerminal', 2001, 'competenciaUnidadDidactica', 102, 201, 101],
  ['indicadorCapacidad', 20001, 'capacidadTerminal', 1001, 2001, 1001],
  ['aprendizaje', 200001, 'indicadorCapacidad', 10001, 20001, 10001],
  ['actividad', 2000001, 'aprendizaje', 100001, 200001, 100001],
];
for (const [entity, id, parentEntity, targetId, previousParentId, parentId] of cases) {
  const original = [makeModule(1), makeModule(2), makeModule(3)];
  const snapshot = structuredClone(original);
  const move = tree.reassignmentFor(original, { entity, id }, { entity: parentEntity, id: targetId });
  assert.deepEqual(move, { entity, id, parentId, previousParentId });
  const next = tree.applyAcademicReassignment(original, move);
  const locations = tree.academicLocations(next);
  assert.equal(locations.get(`${entity}:${id}`).parentId, parentId);
  assert.equal(locations.get(`${entity}:${id}`).module.id, 1, 'Destination before source must work');
  assert.equal(locations.size, tree.academicLocations(original).size, 'No components duplicated or lost');
  assert.equal(next[2], original[2], 'Unrelated module must keep the same reference');
  assert.deepEqual(original, snapshot, 'Original state must not be mutated');
  const session = next[0].unidadesDidacticas.flatMap(u => u.capacidadesTerminales).flatMap(c => c.indicadoresCapacidad).flatMap(i => i.aprendizajes).flatMap(a => a.actividades).find(a => a.id === 2000001);
  const content = next.flatMap(m => m.unidadesDidacticas).flatMap(u => u.capacidadesTerminales).flatMap(c => c.indicadoresCapacidad).flatMap(i => i.contenidos).find(item => item.id === 20000001);
  assert(session); assert.equal(content.texto, 'Contenido'); assert.equal(session.materiales[0].texto, 'Material');
  assert.equal(session.moduloId, 1, 'Session module must match its new branch immediately');
  const restored = tree.applyAcademicReassignment(next, { ...move, parentId: previousParentId, previousParentId: parentId, orden: 1 });
  assert.deepEqual(restored, original, `${entity}: rollback must restore content and relationships`);
  assert.equal(tree.applyAcademicReassignment(original, { ...move, parentId: 9999999 }), original, 'Invalid destination must not remove the source');
}
const modules = [makeModule(1), makeModule(2)];
assert.equal(tree.reassignmentFor(modules, { entity: 'competencia', id: 11 }, { entity: 'modulo', id: 1 }), null);
assert.equal(tree.reassignmentFor(modules, { entity: 'competencia', id: 11 }, { entity: 'capacidadTerminal', id: 2001 }), null);
modules[0].competencias[0].tipo = 'EMPLEABILIDAD';
assert.equal(tree.reassignmentFor(modules, { entity: 'competenciaUnidadDidactica', id: 202 }, { entity: 'competencia', id: 11 }), null);
modules[1].plan = { carrera: { tipoCarrera: { nombre: 'Opción Ocupacional' } } };
assert.equal(tree.reassignmentFor(modules, { entity: 'competencia', id: 11 }, { entity: 'modulo', id: 2 }), null);

class HttpsError extends Error { constructor(code, message) { super(message); this.code = code; } }
let permissionCalls = 0;
let rejectPermission = false;
const server = load('functions/src/modules/academico/curricularReassignment.ts', {
  'firebase-functions/v1': { https: { HttpsError, onCall: fn => fn } },
  '../core/dataConnectCore.js': { dataConnect: { executeGraphql: () => { throw Error('No remote access permitted in tests'); } } },
  '../core/permissions.js': { requirePermission: async (_context, entity, action) => { permissionCalls++; assert.equal(entity, 'estructura-academica'); assert.equal(action, 'edit'); if (rejectPermission) throw new HttpsError('permission-denied', 'Denied'); } },
  '../competencias/service.js': { getModuloCompetenciaContext: () => { throw Error('Use a local context'); } },
});
function serverFixture(entity, { missing = false, stale = false, mixedType = false, otherSession = false, sameModule = false, failSave = false } = {}) {
  const dst = sameModule ? 1 : 2;
  const u1 = { unidadDidacticaId: 101 }, u2 = { unidadDidacticaId: 201 };
  const c1 = { capacidadTerminal: u1 }, c2 = { capacidadTerminal: u2 };
  const i1 = { indicadorCapacidad: c1 }, i2 = { indicadorCapacidad: c2 };
  const records = {
    competencia: [{ id: 11, moduloId: 1, tipo: 'TECNICA', orden: 1 }, { id: dst }],
    competenciaUnidadDidactica: [{ id: 102, competenciaId: 11, unidadDidacticaId: 101, orden: 1, competencia: { id: 11, moduloId: 1, tipo: 'TECNICA' } }, { id: 21, moduloId: dst, tipo: mixedType ? 'EMPLEABILIDAD' : 'TECNICA' }],
    capacidadTerminal: [{ id: 1001, unidadDidacticaId: 101, orden: 1 }, { id: 201 }],
    indicadorCapacidad: [{ id: 10001, capacidadTerminalId: 1001, orden: 1, ...c1 }, { id: 2001, ...u2 }],
    aprendizaje: [{ id: 100001, indicadorCapacidadId: 10001, ...i1 }, { id: 20001, ...c2 }],
    actividad: [{ id: 1000001, aprendizajeId: 100001, moduloId: 1, orden: 1, aprendizaje: i1 }, { id: 200001, ...i2 }],
  };
  const fk = { competencia: 'moduloId', competenciaUnidadDidactica: 'competenciaId', capacidadTerminal: 'unidadDidacticaId', indicadorCapacidad: 'capacidadTerminalId', aprendizaje: 'indicadorCapacidadId', actividad: 'aprendizajeId' }[entity];
  const [source, target] = records[entity];
  const request = { entity, id: source.id, previousParentId: source[fk] + (stale ? 1 : 0), parentId: target.id };
  const calls = [];
  const graph = async (sourceQuery, variables) => {
    calls.push({ source: sourceQuery, variables });
    operations.push({ source: sourceQuery, variables });
    if (sourceQuery.startsWith('query CurricularMoveContext')) return { source, target: missing ? null : target };
    if (sourceQuery.startsWith('query CurricularMoveOwners')) return { owners: [{ unidadDidacticaId: 101, competencia: { moduloId: 1 } }, { unidadDidacticaId: 201, competencia: { moduloId: dst } }] };
    if (sourceQuery.startsWith('query CurricularMoveSiblings')) return { siblings: [{ id: 99, orden: 4 }] };
    if (sourceQuery.startsWith('query CurricularMoveUnits')) return { units: [{ unidadDidacticaId: 101 }] };
    if (sourceQuery.startsWith('query CurricularMoveActivities')) return { activities: [{ id: 1000001, moduloId: otherSession ? 99 : 1 }] };
    if (sourceQuery.startsWith('mutation ReassignCurricularItem')) { if (failSave) throw new HttpsError('failed-precondition', 'Concurrent change'); return { saved: { id: request.id } }; }
    throw Error(sourceQuery);
  };
  return { request, graph, calls, context: async () => ({ programa: true }) };
}
(async () => {
  for (const [entity] of cases) {
    const f = serverFixture(entity);
    const result = await server.reassignCurricularItem(f.request, f.graph, f.context);
    assert.equal(result.moduleId, 2);
    assert.equal(result.previousModuleId, 1);
    assert.equal(result.orden, 5);
    const mutation = f.calls.filter(call => call.source.startsWith('mutation'));
    assert.equal(mutation.length, 1, 'All changes must be one transaction');
    assert.match(mutation[0].source, /@transaction/);
    assert.match(mutation[0].source, /vars.previousParentId/);
    assert.match(mutation[0].source, /moduloId:2/);
    assert(!/delete|insert/.test(mutation[0].source), 'No records should be deleted or duplicated');
    assert.equal(entity === 'actividad' ? 1 : 2, (mutation[0].source.match(/_update\(/g) || []).length);
  }
  for (const option of ['missing', 'stale', 'otherSession']) {
    const f = serverFixture('capacidadTerminal', { [option]: true });
    await assert.rejects(server.reassignCurricularItem(f.request, f.graph, f.context), e => ['not-found', 'failed-precondition'].includes(e.code));
    assert(!f.calls.some(call => call.source.startsWith('mutation')), 'Invalid move must not write');
  }
  const mixed = serverFixture('competenciaUnidadDidactica', { mixedType: true });
  await assert.rejects(server.reassignCurricularItem(mixed.request, mixed.graph, mixed.context), { code: 'failed-precondition' });
  const failed = serverFixture('aprendizaje', { failSave: true });
  await assert.rejects(server.reassignCurricularItem(failed.request, failed.graph, failed.context), { code: 'failed-precondition' });
  const within = serverFixture('indicadorCapacidad', { sameModule: true });
  await server.reassignCurricularItem(within.request, within.graph, within.context);
  assert(!within.calls.some(call => call.source.startsWith('query CurricularMoveActivities')), 'Avoid unnecessary session updates inside one module');
  const employee = serverFixture('competencia');
  const originalGraph = employee.graph;
  employee.graph = async (q, v) => { const result = await originalGraph(q, v); if (result.source) result.source.tipo = 'EMPLEABILIDAD'; return result; };
  await assert.rejects(server.reassignCurricularItem(employee.request, employee.graph, async () => ({ programa: false })), { code: 'failed-precondition' });
  await assert.rejects(server.reassignCurricularItem({ entity: '__proto__', id: 1, parentId: 2, previousParentId: 3 }), { code: 'invalid-argument' });
  await assert.rejects(server.reassignCurricularItem({ entity: 'competencia', id: '1', parentId: 2, previousParentId: 3 }), { code: 'invalid-argument' });
  rejectPermission = true;
  await assert.rejects(server.reassignEstructuraAcademicaItem({}, {}), { code: 'permission-denied' });
  assert.equal(permissionCalls, 1);
  if (process.argv.includes('--capture')) {
    const folder = path.resolve('tmp/curricular-reassignment-validation');
    fs.mkdirSync(folder, { recursive: true });
    fs.writeFileSync(path.join(folder, 'operations.json'), JSON.stringify(operations, null, 2));
  }
  console.log('Reasignacion: seis niveles, subarboles, referencias estables, rollback, permisos, tipos, concurrencia y transacciones: correctos.');
})().catch(error => { console.error(error); process.exitCode = 1; });
