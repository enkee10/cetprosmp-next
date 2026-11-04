const assert = require('node:assert/strict');
process.env.DATA_CONNECT_EMULATOR_HOST = '127.0.0.1:9399';
process.env.GOOGLE_CLOUD_PROJECT = 'cetprosmp-2026';
const { dataConnect } = require('../functions/lib/modules/core/dataConnectCore.js');
const { reassignCurricularItem: move } = require('../functions/lib/modules/academico/curricularReassignment.js');
const graph = async (source, variables = {}) => (await dataConnect.executeGraphql(source, { variables })).data;
const context = async () => ({ programa: true });
const modules = [], units = new Set();
const levels = ['modulo', 'competencia', 'competenciaUnidadDidactica', 'capacidadTerminal', 'indicadorCapacidad', 'aprendizaje', 'actividad'];
const fk = { competencia: 'moduloId', competenciaUnidadDidactica: 'competenciaId', capacidadTerminal: 'unidadDidacticaId', indicadorCapacidad: 'capacidadTerminalId', aprendizaje: 'indicadorCapacidadId', actividad: 'aprendizajeId' };
const lists = { competencia: 'competencias', competenciaUnidadDidactica: 'competenciaUnidadesDidacticas', capacidadTerminal: 'capacidadesTerminales', indicadorCapacidad: 'indicadoresCapacidad', aprendizaje: 'aprendizajes', actividad: 'actividads' };
async function newModule() {
  const result = await graph('mutation TestAncestorModule { item:modulo_insert(data:{titulo:"__local_ancestor_test__",orden:1}) }');
  modules.push(result.item.id); return result.item.id;
}
async function chain(moduleId, through = 6, order = 1) {
  const ids = [moduleId]; let parent = moduleId;
  for (let index = 1; index <= through; index++) {
    const entity = levels[index];
    if (entity === 'competenciaUnidadDidactica') {
      const result = await graph(`mutation TestAncestorUnit @transaction {
        unit:unidadDidactica_insert(data:{nombre:"Unidad conservada"})
        item:competenciaUnidadDidactica_insert(data:{competenciaId:${parent},unidadDidacticaId_expr:"response.unit.id",orden:${order}})
      }`);
      units.add(result.unit.id); ids.push(result.item.id); parent = result.unit.id;
    } else {
      const fields = entity === 'competencia' ? 'nombre:"Competencia conservada",tipo:TECNICA'
        : entity === 'actividad' ? `nombre:"Sesión conservada",moduloId:${moduleId},temas:"Tema uno\\nTema dos"` : 'descripcion:"Texto conservado"';
      const result = await graph(`mutation TestAncestorNode { item:${entity}_insert(data:{${fields},${fk[entity]}:${parent},orden:${order}}) }`);
      ids.push(result.item.id); parent = result.item.id;
    }
  }
  return ids;
}
async function row(entity, id) {
  return (await graph(`query TestAncestorRow { item:${entity}(id:${id}) {id ${fk[entity]} orden${entity === 'actividad' ? ' nombre moduloId temas' : ''}} }`)).item;
}
async function children(entity, parentId) {
  return (await graph(`query TestAncestorList { items:${lists[entity]}(where:{${fk[entity]}:{eq:${parentId}}},limit:10000) {id orden${entity === 'competenciaUnidadDidactica' ? ' unidadDidacticaId' : ''}} }`)).items;
}
(async () => {
  try {
    const sourceModule = await newModule(), source = await chain(sourceModule);
    const sourceUnit = (await graph(`query TestAncestorSourceUnit { item:competenciaUnidadDidactica(id:${source[2]}) {unidadDidacticaId} }`)).item.unidadDidacticaId;
    await graph(`mutation TestAncestorPreserveContent { indicadorContenido_insert(data:{indicadorCapacidadId:${source[4]},orden:1,texto:"Contenido conservado"}) }`);
    const originalActivity = await row('actividad', source[6]);
    let tested = 0;
    for (let from = 2; from < levels.length; from++) {
      const entity = levels[from], previousParentId = from === 3 ? sourceUnit : source[from - 1];
      for (let to = 0; to < from - 1; to++) {
        const targetModule = await newModule(), destination = await chain(targetModule, to);
        const target = { entity: levels[to], id: destination[to] };
        const result = await move({ entity, id: source[from], previousParentId, parentId: target.id, targetAncestor: target }, graph, context);
        assert.equal(result.creations.length, from - to - 1, `${entity} to ${target.entity}: create exactly the missing levels`);
        assert(result.creations.every(created => created.entity === 'unidadDidactica' ? created.item.nombre === '' : created.entity === 'competencia' ? created.item.nombre === '' : created.item.descripcion === ''));
        for (const created of result.creations) if (created.entity === 'unidadDidactica') units.add(created.id);
        const saved = await row(entity, source[from]);
        assert.equal(saved[fk[entity]], result.parentId);
        assert.equal(saved.orden, 1);
        assert.equal((await row('actividad', source[6])).moduloId, targetModule, 'Descendant sessions follow the new module');
        await move({ entity, id: source[from], previousParentId: result.parentId, parentId: previousParentId }, graph, context);
        const activity = await row('actividad', source[6]);
        assert.equal(activity.nombre, originalActivity.nombre); assert.equal(activity.temas, originalActivity.temas); assert.equal(activity.moduloId, sourceModule);
        tested++;
      }
    }
    // Existing paths: order, rather than ID or insertion order, determines the first branch.
    const orderedModule = await newModule();
    const last = await chain(orderedModule, 6, 20), first = await chain(orderedModule, 6, 3);
    const request = { entity: 'actividad', id: source[6], previousParentId: source[5], parentId: orderedModule, targetAncestor: { entity: 'modulo', id: orderedModule } };
    const existing = await move(request, graph, context);
    assert.equal(existing.creations.length, 0); assert.equal(existing.parentId, first[5]); assert.equal(existing.orden, 4);
    assert.notEqual(existing.parentId, last[5]);
    await move({ entity: 'actividad', id: source[6], previousParentId: existing.parentId, parentId: source[5] }, graph, context);
    // Sessions dropped on an indicator must choose its first learning too.
    const indicatorDrop = await move({ ...request, parentId: first[4], targetAncestor: { entity: 'indicadorCapacidad', id: first[4] } }, graph, context);
    assert.equal(indicatorDrop.parentId, first[5]);
    await move({ entity: 'actividad', id: source[6], previousParentId: indicatorDrop.parentId, parentId: source[5] }, graph, context);
    const rollbackModule = await newModule();
    const rollbackRequest = { ...request, parentId: rollbackModule, targetAncestor: { entity: 'modulo', id: rollbackModule } };
    const failingGraph = (query, variables) => graph(query.startsWith('mutation ReassignCurricularItem')
      ? query.slice(0, -1) + ' forced:modulo_update(id:2147483647,data:{orden:1}) @check(expr:"this != null",message:"forced rollback") }' : query, variables);
    await assert.rejects(() => move(rollbackRequest, failingGraph, context));
    assert.equal((await children('competencia', rollbackModule)).length, 0, 'Failed moves must roll back all blank levels');
    assert.equal((await row('actividad', source[6])).aprendizajeId, source[5]);
    await assert.rejects(() => move({ ...rollbackRequest, previousParentId: 2147483647 }, graph, context));
    assert.equal((await children('competencia', rollbackModule)).length, 0, 'Stale requests must not create levels');
    const second = (await graph(`mutation TestAncestorSecondIndicator { item:indicadorCapacidad_insert(data:{capacidadTerminalId:${source[3]},descripcion:"Otro indicador",orden:2}) }`)).item.id;
    const concurrentModule = await newModule();
    const results = await Promise.allSettled([source[4], second].map(id => move({ entity:'indicadorCapacidad',id,previousParentId:source[3],parentId:concurrentModule,targetAncestor:{entity:'modulo',id:concurrentModule} },graph,context)));
    assert(results.some(result => result.status === 'fulfilled'));
    const comps = await children('competencia', concurrentModule); assert.equal(comps.length, 1);
    const unitRows = await children('competenciaUnidadDidactica', comps[0].id); assert.equal(unitRows.length, 1); units.add(unitRows[0].unidadDidacticaId);
    const caps = await children('capacidadTerminal', unitRows[0].unidadDidacticaId); assert.equal(caps.length, 1);
    const indicators = await children('indicadorCapacidad', caps[0].id);
    assert.equal(new Set(indicators.map(row=>row.orden)).size, indicators.length, 'Concurrent moves cannot duplicate order or blank branches');
    console.log(`Correcto en emulador local: ${tested} combinaciones de niveles, rutas por orden, hijos vacíos, textos e IDs conservados, rollback y concurrencia.`);
  } finally {
    if (modules.length) {
      const rows = (await graph('query TestAncestorCleanupUnits($ids:[Int!]!) { items:competenciaUnidadesDidacticas(where:{competencia:{moduloId:{in:$ids}}},limit:10000) {unidadDidacticaId} }',{ids:modules})).items;
      rows.forEach(row => units.add(row.unidadDidacticaId));
      await graph('mutation TestAncestorCleanup($units:[Int!]!,$modules:[Int!]!) @transaction { unidadDidactica_deleteMany(where:{id:{in:$units}}) modulo_deleteMany(where:{id:{in:$modules}}) }',{units:[...units],modules});
    }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
