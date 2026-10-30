const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(file, imports = {}) {
  const mod = { exports: {} };
  new Function('module', 'exports', 'require', ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText)(mod, mod.exports, name => {
    if (name in imports) return imports[name];
    throw Error(`Unexpected dependency ${name}`);
  });
  return mod.exports;
}
const tree = load('src/lib/curricularReassignment.ts');
const { applyAcademicOrder, applyAcademicCreation } = load('src/lib/curricularUpdates.ts');
const codes = load('src/lib/curricularCodes.ts');
const server = load('functions/src/modules/academico/curricularReassignment.ts', {
  'firebase-functions/v1': { https: { onCall: fn => fn, HttpsError: class extends Error {} } },
  '../core/dataConnectCore.js': {}, '../core/permissions.js': {}, '../competencias/service.js': {},
});
const parent = { competencia: 'moduloId', competenciaUnidadDidactica: 'competenciaId', capacidadTerminal: 'unidadDidacticaId', indicadorCapacidad: 'capacidadTerminalId', aprendizaje: 'indicadorCapacidadId', actividad: 'aprendizajeId' };
const sort = rows => [...rows].sort((a, b) => (a.orden ?? a.numeroSesion ?? a.id) - (b.orden ?? b.numeroSesion ?? b.id) || a.id - b.id);
const operations = [];
function fixture() {
  let serial = 0;
  const db = Object.fromEntries(['modulo', ...Object.keys(parent)].map(name => [name, []]));
  const add = (entity, data) => { const row = { id: ++serial, ...data }; db[entity].push(row); return row; };
  for (let m = 1; m <= 2; m++) {
    const module = add('modulo', { orden: m, planId: 1 });
    for (let c = 1; c <= 3; c++) {
      const comp = add('competencia', { moduloId: module.id, tipo: 'EMPLEABILIDAD', nombre: `Competencia ${c}`, orden: c, periodActive: c === 3 });
      for (let u = 1; u <= 3; u++) {
        const relation = add('competenciaUnidadDidactica', { competenciaId: comp.id, orden: u, periodActive: u === 3 });
        relation.unidadDidacticaId = relation.id + 100000;
        for (let a = 1; a <= 3; a++) {
          const cap = add('capacidadTerminal', { unidadDidacticaId: relation.unidadDidacticaId, orden: a, periodActive: a === 3 });
          for (let i = 1; i <= 2; i++) {
            const ind = add('indicadorCapacidad', { capacidadTerminalId: cap.id, orden: i, periodActive: i === 2 });
            for (let l = 1; l <= 2; l++) {
              const learning = add('aprendizaje', { indicadorCapacidadId: ind.id, orden: l });
              for (let s = 1; s <= 3; s++) add('actividad', { aprendizajeId: learning.id, moduloId: module.id, orden: s, numeroSesion: s, nombre: `Sesión ${s}` });
            }
          }
        }
      }
    }
  }
  const row = (entity, id) => db[entity].find(r => r.id === id);
  const relation = unitId => db.competenciaUnidadDidactica.find(r => r.unidadDidacticaId === unitId);
  const siblings = (entity, parentId) => sort(db[entity].filter(r => r[parent[entity]] === parentId));
  const hydrate = () => db.modulo.map(m => ({ ...m,
    competencias: sort(db.competencia.filter(c => c.moduloId === m.id)).map(c => ({ ...c })),
    unidadesDidacticas: sort(db.competenciaUnidadDidactica.filter(u => row('competencia', u.competenciaId).moduloId === m.id)).map(u => ({
      id: u.unidadDidacticaId, relacionId: u.id, competenciaId: u.competenciaId, competencia: { ...row('competencia', u.competenciaId) }, orden: u.orden, periodActive: u.periodActive,
      capacidadesTerminales: siblings('capacidadTerminal', u.unidadDidacticaId).map(c => ({ ...c,
        indicadoresCapacidad: siblings('indicadorCapacidad', c.id).map(i => ({ ...i, contenidos: [],
          aprendizajes: siblings('aprendizaje', i.id).map(a => ({ ...a, actividades: siblings('actividad', a.id).map(s => ({ ...s, materiales: [] })) })),
        })),
      })),
    })),
  }));
  const owner = (entity, id) => {
    if (entity === 'modulo') return id;
    const item = row(entity, id);
    if (entity === 'competencia') return item.moduloId;
    if (entity === 'competenciaUnidadDidactica') return row('competencia', item.competenciaId).moduloId;
    if (entity === 'capacidadTerminal') return owner('competenciaUnidadDidactica', relation(item.unidadDidacticaId).id);
    if (entity === 'indicadorCapacidad') return owner('capacidadTerminal', item.capacidadTerminalId);
    if (entity === 'aprendizaje') return owner('indicadorCapacidad', item.indicadorCapacidadId);
    return owner('aprendizaje', item.aprendizajeId);
  };
  function sourceRow(entity, id) {
    const r = row(entity, id);
    if (entity === 'competencia') return { id, moduloId: r.moduloId, tipo: r.tipo, orden: r.orden };
    if (entity === 'competenciaUnidadDidactica') {
      const comp = row('competencia', r.competenciaId);
      return { id, competenciaId: r.competenciaId, unidadDidacticaId: r.unidadDidacticaId, orden: r.orden, competencia: { id: comp.id, moduloId: comp.moduloId, tipo: comp.tipo } };
    }
    if (entity === 'capacidadTerminal') return { id, unidadDidacticaId: r.unidadDidacticaId, orden: r.orden };
    if (entity === 'indicadorCapacidad') return { id, capacidadTerminalId: r.capacidadTerminalId, orden: r.orden, capacidadTerminal: { unidadDidacticaId: row('capacidadTerminal', r.capacidadTerminalId).unidadDidacticaId } };
    if (entity === 'aprendizaje') return { id, indicadorCapacidadId: r.indicadorCapacidadId, orden: r.orden, indicadorCapacidad: { capacidadTerminal: sourceRow('indicadorCapacidad', r.indicadorCapacidadId).capacidadTerminal } };
    return { id, aprendizajeId: r.aprendizajeId, moduloId: r.moduloId, orden: r.orden, aprendizaje: { indicadorCapacidad: sourceRow('aprendizaje', r.aprendizajeId).indicadorCapacidad } };
  }
  function targetRow(entity, id) {
    if (entity === 'unidad' || entity === 'modulo') return { id };
    const r = row(entity, id);
    if (entity === 'competencia') return { id, moduloId: r.moduloId, tipo: r.tipo };
    if (entity === 'capacidadTerminal') return { id, unidadDidacticaId: r.unidadDidacticaId };
    if (entity === 'indicadorCapacidad') return { id, capacidadTerminal: sourceRow(entity, id).capacidadTerminal };
    return { id, indicadorCapacidad: sourceRow(entity, id).indicadorCapacidad };
  }
  const parentEntity = { competencia: 'modulo', competenciaUnidadDidactica: 'competencia', capacidadTerminal: 'unidad', indicadorCapacidad: 'capacidadTerminal', aprendizaje: 'indicadorCapacidad', actividad: 'aprendizaje' };
  async function persistMove(request) {
    let targetModuleId;
    let selectedLearning;
    const before = hydrate();
    const location = tree.academicLocations(before).get(`${request.entity}:${request.id}`);
    const under = session => {
      let entity = 'actividad', id = session.id;
      while (entity !== 'modulo') {
        if (entity === request.entity && id === request.id) return true;
        const r = row(entity, id);
        if (entity === 'capacidadTerminal') { id = relation(r.unidadDidacticaId).id; entity = 'competenciaUnidadDidactica'; }
        else { id = r[parent[entity]]; entity = parentEntity[entity]; }
      }
      return false;
    };
    const affected = db.actividad.filter(under);
    const graph = async (query, vars) => {
      operations.push({ source: query, variables: vars });
      if (query.startsWith('query CurricularMoveContext')) {
        const p = parentEntity[request.entity];
        return { source: sourceRow(request.entity, request.id), target: request.targetIndicatorId ? targetRow('indicadorCapacidad', request.targetIndicatorId) : targetRow(p, request.parentId) };
      }
      if (query.startsWith('query CurricularMoveTargetLearning')) {
        const aprendizajes = siblings('aprendizaje', vars.indicadorId);
        selectedLearning = aprendizajes.at(-1);
        return { aprendizajes };
      }
      if (query.startsWith('query CurricularMoveOwners')) return { owners: vars.ids.map(unitId => ({ unidadDidacticaId: unitId, competencia: { moduloId: owner('competenciaUnidadDidactica', relation(unitId).id) } })) };
      if (query.startsWith('query CurricularMoveSiblings')) return { siblings: siblings(request.entity, vars.parentId) };
      if (query.startsWith('query CurricularMoveUnits')) return { units: siblings('competenciaUnidadDidactica', vars.id) };
      if (query.startsWith('query CurricularMoveActivities')) return { activities: affected.map(a => ({ id: a.id, moduloId: a.moduloId })) };
      if (query.startsWith('mutation ReassignCurricularItem')) {
        assert.match(query, /@transaction/);
        assert.match(query, /vars.previousParentId/);
        const orden = Number(query.match(/data:\{[^}]*,orden:(\d+)/)[1]);
        let createdLearning;
        if (request.targetIndicatorId && !selectedLearning) {
          createdLearning = { id: Math.max(...Object.values(db).flat().map(r => r.id)) + 1, orden: 1, indicadorCapacidadId: request.targetIndicatorId, descripcion: 'Aprendizaje', sigla: null };
          db.aprendizaje.push(createdLearning);
        }
        Object.assign(row(request.entity, request.id), { [parent[request.entity]]: request.targetIndicatorId ? (selectedLearning ?? createdLearning).id : request.parentId, orden });
        for (const match of query.matchAll(/order(\d+):actividad_update[^}]*data:\{orden:(\d+)/g)) row('actividad', Number(match[1])).orden = Number(match[2]);
        affected.forEach(a => { a.moduloId = targetModuleId; });
        return { saved: { id: request.id }, ...(createdLearning ? { createdLearning: { id: createdLearning.id } } : {}) };
      }
      throw Error(query);
    };
    const result = await server.reassignCurricularItem(request, graph, async id => { targetModuleId = id; return { programa: true }; });
    assert.equal(result.previousModuleId, location.module.id);
    return result;
  }
  const persistOrder = (entity, items) => items.forEach(item => { row(entity, item.id).orden = item.orden; });
  return { db, row, relation, hydrate, siblings, persistMove, persistOrder };
}
const locationsView = modules => [...tree.academicLocations(modules)].map(([key, row]) => [key, row.parentId, row.orden, row.module.id]).sort((a, b) => a[0].localeCompare(b[0]));

module.exports = { fixture, tree, codes };

if (require.main === module) (async () => {
  for (const entity of Object.keys(parent)) {
    for (const crossModule of entity === 'competencia' ? [true] : [false, true]) {
      const f = fixture(); let modules = f.hydrate();
      const module = modules[0], other = crossModule ? modules[1] : module;
      const fromUnit = module.unidadesDidacticas[0], fromCap = fromUnit.capacidadesTerminales[0], fromInd = fromCap.indicadoresCapacidad[0], fromLearning = fromInd.aprendizajes[0];
      const toUnit = crossModule ? other.unidadesDidacticas[0] : module.unidadesDidacticas[1];
      const toCap = crossModule ? toUnit.capacidadesTerminales[0] : fromUnit.capacidadesTerminales[1];
      const toInd = crossModule ? toCap.indicadoresCapacidad[0] : fromCap.indicadoresCapacidad[1];
      const toLearning = crossModule ? toInd.aprendizajes[0] : fromInd.aprendizajes[1];
      const lists = {
        competencia: [module.competencias, other.id],
        competenciaUnidadDidactica: [module.unidadesDidacticas.filter(u => u.competenciaId === module.competencias[0].id).map(u => ({ ...u, id: u.relacionId })), other.competencias[crossModule ? 0 : 1].id],
        capacidadTerminal: [fromUnit.capacidadesTerminales, toUnit.id],
        indicadorCapacidad: [fromCap.indicadoresCapacidad, toCap.id],
        aprendizaje: [fromInd.aprendizajes, toInd.id],
        actividad: [fromLearning.actividades, toLearning.id],
      };
      const [siblings, destination] = lists[entity];
      if (entity === 'actividad' && !crossModule) {
        f.siblings(entity, destination).forEach(r => { r.orden = null; });
        modules = f.hydrate();
      }
      const sourceId = siblings.at(-1).id, firstId = siblings[0].id;
      const original = structuredClone(modules);
      const order = tree.academicReorderItems(modules, entity, sourceId, firstId, 'before');
      assert.equal(order[0].id, sourceId);
      assert.equal(order.length, siblings.length, `${entity}: hidden siblings must be included`);
      const beforeReorder = modules;
      modules = applyAcademicOrder(modules, entity, order);
      assert.deepEqual(beforeReorder, original, 'Reordering preserves the input tree for rollback');
      f.persistOrder(entity, order);
      assert.deepEqual(locationsView(modules), locationsView(f.hydrate()), `${entity}: persisted reorder survives reload`);
      const previousParentId = tree.academicLocations(modules).get(`${entity}:${sourceId}`).parentId;
      const request = { entity, id: sourceId, parentId: destination, previousParentId };
      const expectedOrder = Math.max(0, ...f.siblings(entity, destination).map(r => r.orden ?? r.numeroSesion ?? r.id)) + 1;
      const optimistic = tree.applyAcademicReassignment(modules, request);
      assert.equal(tree.academicLocations(optimistic).get(`${entity}:${sourceId}`).orden, expectedOrder, `${entity}: optimistic append uses only the destination's children`);
      const result = await f.persistMove(request);
      assert.equal(result.orden, expectedOrder, `${entity}: server append matches the preview`);
      modules = applyAcademicOrder(optimistic, entity, [{ id: sourceId, orden: result.orden }]);
      assert.deepEqual(locationsView(modules), locationsView(f.hydrate()), `${entity}: changing parent preserves exactly the persisted tree`);
      assert.equal(f.siblings(entity, destination).at(-1).id, sourceId, `${entity}: moved item is last in the new parent`);
      const newFirst = f.siblings(entity, destination)[0].id;
      const reordered = tree.academicReorderItems(modules, entity, sourceId, newFirst, 'before');
      modules = applyAcademicOrder(modules, entity, reordered); f.persistOrder(entity, reordered);
      assert.equal(f.siblings(entity, destination)[0].id, sourceId);
      const reloaded = f.hydrate();
      assert.deepEqual(locationsView(modules), locationsView(reloaded), `${entity}: reordering after moving survives reload`);
      for (const m of modules) assert.deepEqual(codes.curricularDescendantCodes(m), codes.curricularDescendantCodes(reloaded.find(r => r.id === m.id)), `${entity}: all displayed codes match persisted parent/child order`);
      assert.deepEqual(tree.academicReorderItems(modules, entity, sourceId, firstId, 'before'), [], `${entity}: another parent's children cannot be reordered as siblings`);
    }
  }
  const f = fixture(), modules = f.hydrate(), unit = modules[0].unidadesDidacticas[0];
  const unitOrder = codes.curricularDescendantCodes(modules[0]).unidades;
  const reverseParents = applyAcademicOrder(modules, 'competencia', tree.academicReorderItems(modules, 'competencia', modules[0].competencias.at(-1).id, modules[0].competencias[0].id, 'before'));
  assert.notEqual(codes.curricularDescendantCodes(reverseParents[0]).unidades.get(unit.id), unitOrder.get(unit.id), 'Moving a parent moves the whole child branch in the sequence');
  const partialPlan = [{ ...modules[0], orden: 2 }, { ...modules[1], orden: 5 }];
  assert.deepEqual(tree.academicReorderItems(partialPlan, 'modulo', partialPlan[1].id, partialPlan[0].id, 'before', 1).map(r => r.orden), [2, 5], 'A teacher must not overwrite inaccessible module positions');
  const learning = unit.capacidadesTerminales[0].indicadoresCapacidad[0].aprendizajes;
  learning[0].actividades.forEach(a => { a.orden += 100; });
  assert.equal(codes.curricularSessionsInOrder(learning)[0].aprendizajeId, learning[0].id, 'Learning position precedes session-local order in another learning');
  for (const position of ['before', 'after']) {
    const f = fixture(), initial = f.hydrate();
    const i = initial[0].unidadesDidacticas[0].capacidadesTerminales[0].indicadoresCapacidad[0];
    const source = i.aprendizajes[0].actividades[0], target = i.aprendizajes[1].actividades[0];
    const request = { entity: 'actividad', id: source.id, previousParentId: source.aprendizajeId, parentId: target.aprendizajeId, targetSiblingId: target.id, position };
    let optimistic = tree.applyAcademicReassignment(initial, request);
    optimistic = applyAcademicOrder(optimistic, 'actividad', tree.academicReorderItems(optimistic, 'actividad', source.id, target.id, position));
    const result = await f.persistMove(request);
    const confirmed = applyAcademicOrder(optimistic, 'actividad', result.orders);
    assert.deepEqual(locationsView(confirmed), locationsView(f.hydrate()), 'Dropping between sessions of different learning parents persists the exact target position atomically');
    assert.equal(f.siblings('actividad', target.aprendizajeId)[position === 'before' ? 0 : 1].id, source.id);
  }
  for (const empty of [false, true]) {
    const f = fixture();
    let initial = f.hydrate();
    const indicators = initial[0].unidadesDidacticas[0].capacidadesTerminales[0].indicadoresCapacidad;
    if (empty) {
      const learningIds = new Set(f.siblings('aprendizaje', indicators[1].id).map(a => a.id));
      f.db.aprendizaje = f.db.aprendizaje.filter(a => !learningIds.has(a.id));
      f.db.actividad = f.db.actividad.filter(a => !learningIds.has(a.aprendizajeId));
      initial = f.hydrate();
    }
    const source = initial[0].unidadesDidacticas[0].capacidadesTerminales[0].indicadoresCapacidad[0].aprendizajes[0].actividades[0];
    const request = tree.reassignmentFor(initial, { entity: 'actividad', id: source.id }, { entity: 'indicadorCapacidad', id: indicators[1].id });
    assert(request, 'Sessions can be dropped on the displayed indicator parent');
    const result = await f.persistMove(request);
    const withLearning = result.learning ? applyAcademicCreation(initial, { entity: 'aprendizaje', id: result.learning.id, item: result.learning }) : initial;
    const confirmed = tree.applyAcademicReassignment(withLearning, result);
    assert.deepEqual(locationsView(confirmed), locationsView(f.hydrate()), 'Session transfer to an indicator survives reload, including creating its first learning');
    assert.equal(f.siblings('actividad', result.parentId).at(-1).id, source.id);
    if (empty) assert(result.learning && result.learning.indicadorCapacidadId === indicators[1].id);
  }
  if (process.argv.includes('--capture')) fs.writeFileSync('tmp/curricular-reassignment-validation/ordering-operations.json', JSON.stringify(operations, null, 2));
  console.log('Passed: all six child/parent levels, hidden siblings, same/cross-module moves, append, reorder again, independent persistence/reload, parent traversal and partial-plan positions.');
})().catch(error => { console.error(error); process.exitCode = 1; });
