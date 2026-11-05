const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
// This test deliberately uses only the local Data Connect emulator.
process.env.DATA_CONNECT_EMULATOR_HOST = '127.0.0.1:9399';
process.env.GOOGLE_CLOUD_PROJECT = 'cetprosmp-2026';
const { dataConnect } = require('../functions/lib/modules/core/dataConnectCore.js');
const { reassignCurricularItem: move } = require('../functions/lib/modules/academico/curricularReassignment.js');
const graph = async (source, variables = {}) => (await dataConnect.executeGraphql(source, { variables })).data;
const context = async () => ({ programa: true });
function load(file) {
  const mod = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  new Function('module', 'exports', code)(mod, mod.exports);
  return mod.exports;
}
const tree = load('src/lib/curricularReassignment.ts');
const updates = load('src/lib/curricularUpdates.ts');
const originalComp = { id: 10, nombre: 'Original', tipo: 'TECNICA', orden: 1 };
const continued = { ...originalComp, esContinuacion: true, continuacionId: 70, continuacionPlanId: 5 };
const currentComp = { ...originalComp, id: 11, nombre: 'Actual' };
const unit = (id, comp, moduleId) => ({ id, relacionId: id + 1, nombre: 'Unidad', orden: 1, competenciaId: comp.id,
  competencia: { ...comp, moduloId: moduleId }, capacidadesTerminales: [] });
const fixture = [
  { id: 1, competencias: [originalComp], unidadesDidacticas: [unit(20, originalComp, 1)] },
  { id: 2, competencias: [continued, currentComp], unidadesDidacticas: [unit(30, currentComp, 2)] },
];
const request = tree.reassignmentFor(fixture, { entity: 'competenciaUnidadDidactica', id: 31 }, { entity: 'competencia', id: 10, continuacionId: 70 });
assert.equal(request.targetContinuacionId, 70);
assert.equal(tree.applyAcademicReassignment(fixture, request), fixture, 'Await confirmation before changing the continuation');
const next = tree.applyAcademicReassignment(fixture, { ...request, targetContinuacionId: undefined, continuacionId: 70, continuacionPlanId: 5, moduleId: 2, orden: 1 });
assert.equal(next[0], fixture[0], 'The original branch must remain untouched');
assert.equal(next[1].unidadesDidacticas.length, 1);
assert.equal(next[1].unidadesDidacticas[0].competenciaContinuacionId, 70);
assert.equal(next[1].unidadesDidacticas[0].competenciaContinuacionPlanId, 5);
assert.equal(tree.reassignmentFor(next, { entity: 'competencia', id: 10, continuacionId: 70 }, { entity: 'modulo', id: 1 }), null, 'The continuation itself remains locked');
assert.equal(tree.reassignmentFor(next, { entity: 'competenciaUnidadDidactica', id: 31 }, { entity: 'competencia', id: 10, continuacionId: 70 }), null);
assert.deepEqual(tree.academicReorderItems(next, 'competenciaUnidadDidactica', 31, 21, 'before'), [], 'The original and continuation are separate sibling lists');
const returned = tree.applyAcademicReassignment(next, { entity: 'competenciaUnidadDidactica', id: 31, previousParentId: 10, parentId: 10, continuacionId: null, moduleId: 1 });
assert.equal(returned[0].unidadesDidacticas.length, 2, 'A unit can leave a continuation for its original competency');
assert.equal(returned[1].unidadesDidacticas.length, 0);
assert.equal(returned[0].unidadesDidacticas[1].competenciaContinuacionId, null);
const created = updates.applyAcademicCreation(fixture, { entity: 'unidadDidactica', id: 40, item: { id: 40, nombre: '' },
  unitAssignments: [{ id: 41, unidadDidacticaId: 40, orden: 1, competenciaId: 10, competenciaContinuacionId: 70, competenciaContinuacionPlanId: 5, competencia: { ...originalComp, moduloId: 2 } }] });
assert.equal(created[0], fixture[0]);
assert.equal(created[1].unidadesDidacticas.find(u => u.id === 40).competenciaContinuacionId, 70);

const modules = [], units = new Set(); let planId;
const levels = ['competenciaUnidadDidactica', 'capacidadTerminal', 'indicadorCapacidad', 'aprendizaje', 'actividad'];
const fk = ['competenciaId', 'unidadDidacticaId', 'capacidadTerminalId', 'indicadorCapacidadId', 'aprendizajeId'];
async function insert(entity, fields) {
  return (await graph(`mutation LocalContinuationInsert { item:${entity}_insert(data:{${fields}}) }`)).item.id;
}
async function newChain(moduleId, compId, continuationId = null) {
  let parent = compId;
  const ids = [], parents = [];
  for (let index = 0; index < levels.length; index++) {
    if (index === 0) {
      const id = await insert('unidadDidactica', 'nombre:"Unidad conservada"'); units.add(id);
      parents.push(parent);
      ids.push(await insert(levels[index], `competenciaId:${parent},unidadDidacticaId:${id},orden:1,competenciaContinuacionId:${continuationId ?? 'null'}`));
      parent = id;
    } else {
      parents.push(parent);
      const text = index === 4 ? `nombre:"Sesion conservada",moduloId:${moduleId},temas:"Temas conservados"` : 'descripcion:"Texto conservado"';
      parent = await insert(levels[index], `${fk[index]}:${parent},orden:1,${text}`); ids.push(parent);
    }
  }
  return { ids, parents };
}
async function read(entity, id, fields) {
  return (await graph(`query LocalContinuationRead { item:${entity}(id:${id}) { id ${fields} } }`)).item;
}
(async () => {
  try {
    planId = await insert('plan', 'planEstudio:"__local_continuation_drag_test__"');
    for (let index = 1; index <= 2; index++) modules.push(await insert('modulo', `titulo:"__local_continuation_drag_test__",orden:${index}`));
    const planModulo = await insert('planModulo', `planId:${planId},moduloId:${modules[1]},orden:2`);
    const comp = await insert('competencia', `nombre:"Competencia actual",tipo:TECNICA,moduloId:${modules[1]},orden:1`);
    const source = await newChain(modules[1], comp);
    const originalComps = [];
    for (let index = 0; index < levels.length; index++) {
      const original = await insert('competencia', `nombre:"Competencia anterior",tipo:TECNICA,moduloId:${modules[0]},orden:${index + 1}`);
      originalComps.push(original);
      const untouched = await newChain(modules[0], original);
      const continuationId = await insert('competenciaContinuacion', `competenciaId:${original},planModuloId:${planModulo}`);
      const input = { entity: levels[index], id: source.ids[index], previousParentId: source.parents[index], parentId: original,
        ...(index === 0 ? { targetContinuacionId: continuationId } : { targetAncestor: { entity: 'competencia', id: original, continuacionId: continuationId } }) };
      const result = await move(input, graph, context);
      for (const creation of result.creations ?? []) if (creation.entity === 'unidadDidactica') units.add(creation.id);
      assert.equal(result.moduleId, modules[1]);
      assert.equal(result.creations?.length ?? 0, index);
      const assignment = (await graph(`query LocalContinuationAssignments { items:competenciaUnidadesDidacticas(where:{competenciaContinuacionId:{eq:${continuationId}}}) { id unidadDidacticaId competenciaId competenciaContinuacionId } }`)).items;
      assert.equal(assignment.length, 1, 'Use a separate unit in the continuation');
      const expected = await read('competenciaUnidadDidactica', untouched.ids[0], 'competenciaContinuacionId');
      assert.equal(expected.competenciaContinuacionId, null, 'Do not reuse the original branch');
      assert.equal((await read('actividad', source.ids[4], 'moduloId nombre temas')).moduloId, modules[1]);
      assert.equal((await read(levels[index], source.ids[index], fk[index]))[fk[index]], result.parentId);
      if (index > 0) {
        const childCreation = result.creations.find(row => row.entity === 'unidadDidactica');
        assert.equal(childCreation.unitAssignments[0].competenciaContinuacionId, continuationId);
        assert.equal(childCreation.unitAssignments[0].competencia.moduloId, modules[1]);
        // Existing continuation paths must append to this branch, not to the original.
        await move({ entity: levels[index], id: source.ids[index], previousParentId: result.parentId, parentId: source.parents[index] }, graph, context);
        const again = await move(input, graph, context);
        assert.equal(again.creations.length, 0); assert.equal(again.parentId, result.parentId);
        assert.equal(again.orden, 1);
      }
      await move({ entity: levels[index], id: source.ids[index], previousParentId: result.parentId, parentId: source.parents[index] }, graph, context);
      assert.equal((await read('actividad', source.ids[4], 'nombre temas')).temas, 'Temas conservados');
      // A deleted or mismatched continuation must not accept a move.
      await assert.rejects(() => move({ ...input, targetAncestor: undefined, targetContinuacionId: continuationId, entity: 'competenciaUnidadDidactica', id: source.ids[0], previousParentId: comp, parentId: comp }, graph, context), { code: 'failed-precondition' });
    }
    // Same competency ID, different branch: update the continuation even when the FK stays equal.
    const original = originalComps[0];
    const continuation = (await graph(`query LocalContinuationId { items:competenciaContinuaciones(where:{competenciaId:{eq:${original}}}) { id } }`)).items[0].id;
    const crossing = await newChain(modules[0], original);
    const across = await move({ entity: levels[0], id: crossing.ids[0], parentId: original, previousParentId: original, targetContinuacionId: continuation }, graph, context);
    assert.equal(across.moduleId, modules[1]);
    assert.equal((await read('actividad', crossing.ids[4], 'moduloId')).moduloId, modules[1]);
    await move({ entity: levels[0], id: crossing.ids[0], parentId: original, previousParentId: original }, graph, context);
    assert.equal((await read('competenciaUnidadDidactica', crossing.ids[0], 'competenciaContinuacionId')).competenciaContinuacionId, null);
    assert.equal((await read('actividad', crossing.ids[4], 'moduloId')).moduloId, modules[0]);
    console.log('Continuaciones: cinco niveles reciben arrastre; rutas vacias y existentes, rama original intacta, retorno y sesiones conservados. Correcto en local.');
  } finally {
    if (planId) {
      await graph(`mutation LocalContinuationCleanup($units:[Int!]!,$modules:[Int!]!,$plan:Int!) @transaction {
        unidadDidactica_deleteMany(where:{id:{in:$units}})
        competenciaContinuacion_deleteMany(where:{planModulo:{planId:{eq:$plan}}})
        planModulo_deleteMany(where:{planId:{eq:$plan}})
        modulo_deleteMany(where:{id:{in:$modules}})
        plan_delete(id:$plan)
      }`, { units: [...units], modules, plan: planId });
    }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
