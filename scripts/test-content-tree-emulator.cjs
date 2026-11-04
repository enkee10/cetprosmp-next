const assert = require('node:assert/strict');
// This runner always targets the local emulator, regardless of the shell environment.
process.env.DATA_CONNECT_EMULATOR_HOST = '127.0.0.1:9399';
process.env.GOOGLE_CLOUD_PROJECT = 'cetprosmp-2026';
const { dataConnect } = require('../functions/lib/modules/core/dataConnectCore.js');
const { saveEstructuraAcademicaIndicadorContenido: save } = require('../functions/lib/modules/academico/curricularEditing.js');
const { reorderContentSiblings, contentSubtreeIds } = require('../functions/lib/modules/academico/contentTree.js');
const graph = async (source, variables) => (await dataConnect.executeGraphql(source, variables ? { variables } : undefined)).data;
const context = { auth: { uid: 'local-content-tree-test', token: { level: 600 } } };
let unitId;
(async () => {
  try {
    const fixture = await graph(`mutation CreateLocalContentTreeFixture($name:String!) @transaction {
      unit:unidadDidactica_insert(data:{nombre:$name})
      capacity:capacidadTerminal_insert(data:{descripcion:$name,unidadDidacticaId_expr:"response.unit.id"})
      indicator:indicadorCapacidad_insert(data:{descripcion:$name,capacidadTerminalId_expr:"response.capacity.id"})
      other:indicadorCapacidad_insert(data:{descripcion:$name,orden:1,capacidadTerminalId_expr:"response.capacity.id"})
    }`, { name: `__local_content_tree_test_${Date.now()}__` });
    unitId = fixture.unit.id;
    const indicatorId = fixture.indicator.id;
    const otherId = fixture.other.id;
    const call = data => save.run({ indicadorCapacidadId: indicatorId, ...data }, context);
    let result = await call({ action: 'add', texto: 'Seguridad laboral\nHerramientas manuales' });
    assert.equal(result.items.length, 2);
    assert(result.items.every(item => item.contenidoPadreId === null));
    const parent = result.items[0].id, otherRoot = result.items[1].id;
    result = await call({ action: 'add', contenidoPadreId: null, despuesDeId: parent, texto: 'Intermedio uno\nIntermedio dos' });
    assert.deepEqual(result.items.filter(item => item.contenidoPadreId == null).map(item => item.texto), ['Seguridad laboral', 'Intermedio uno', 'Intermedio dos', 'Herramientas manuales'], 'Sibling batches are inserted immediately after the selected root');
    const intermediateIds = result.items.filter(item => item.texto.startsWith('Intermedio ')).map(item => item.id);
    for (const itemId of intermediateIds) result = await call({ action: 'remove', itemId });
    result = await call({ action: 'add', contenidoPadreId: parent, texto: 'Protección personal\nPrevención de accidentes' });
    const child = result.items.find(item => item.texto === 'Protección personal').id;
    const sibling = result.items.find(item => item.texto === 'Prevención de accidentes').id;
    result = await call({ action: 'add', contenidoPadreId: child, texto: 'Guantes de seguridad' });
    const grandchild = result.items.find(item => item.texto === 'Guantes de seguridad').id;
    result = await call({ action: 'add', contenidoPadreId: grandchild, texto: 'Inspección del material' });
    assert.equal(result.items.filter(item => item.contenidoPadreId === grandchild).length, 1, 'Four nesting levels are supported');
    const length = result.items.length;
    result = await call({ action: 'add', contenidoPadreId: child, texto: 'Guantes de seguridad.' });
    assert.equal(result.items.length, length, 'Duplicate detection stays within siblings');
    result = await call({ action: 'add', contenidoPadreId: otherRoot, texto: 'Guantes de seguridad' });
    assert.equal(result.items.length, length + 1, 'The same text under a different parent is valid');
    const foreign = await save.run({ indicadorCapacidadId: otherId, action: 'add', texto: 'Contenido de otro indicador' }, context);
    await assert.rejects(() => call({ action: 'add', contenidoPadreId: foreign.items[0].id, texto: 'No permitido' }), error => error.code === 'failed-precondition');
    for (const contenidoPadreId of [-1, 0, 1.5, 'bad']) await assert.rejects(() => call({ action: 'add', contenidoPadreId, texto: 'No permitido' }), error => error.code === 'invalid-argument');
    const branchBeforeInsert = contentSubtreeIds(result.items, child).sort((a, b) => a - b);
    result = await call({ action: 'add', contenidoPadreId: parent, despuesDeId: child, texto: 'Hermano nuevo' });
    const insertedSibling = result.items.find(item => item.texto === 'Hermano nuevo').id;
    assert.deepEqual(result.items.filter(item => item.contenidoPadreId === parent).map(item => item.id), [child, insertedSibling, sibling]);
    assert.deepEqual(contentSubtreeIds(result.items, child).sort((a, b) => a - b), branchBeforeInsert, 'Inserting a sibling preserves the existing branch');
    assert.equal(new Set(result.items.map(item => item.orden)).size, result.items.length);
    result = await call({ action: 'remove', itemId: insertedSibling });
    await assert.rejects(() => call({ action: 'add', contenidoPadreId: parent, despuesDeId: otherRoot, texto: 'Padre incompatible' }), error => error.code === 'failed-precondition');
    await assert.rejects(() => call({ action: 'add', contenidoPadreId: null, despuesDeId: foreign.items[0].id, texto: 'Destino ajeno' }), error => error.code === 'failed-precondition');
    await assert.rejects(() => call({ action: 'add', despuesDeId: -1, texto: 'Destino inválido' }), error => error.code === 'invalid-argument');

    const parentsBefore = new Map(result.items.map(item => [item.id, item.contenidoPadreId]));
    const positions = reorderContentSiblings(result.items, sibling, child, false);
    result = await call({ action: 'reorder', items: positions });
    assert.deepEqual(result.items.filter(item => item.contenidoPadreId === parent).map(item => item.id), [sibling, child]);
    for (const item of result.items) assert.equal(item.contenidoPadreId, parentsBefore.get(item.id), 'Reordering never changes parent links');
    assert.deepEqual(reorderContentSiblings(result.items, parent, child, true), [], 'Dragging into descendants cannot form a cycle');
    assert.deepEqual(reorderContentSiblings(result.items, child, otherRoot, true), [], 'Different sibling groups cannot be mixed');
    const originalIds = result.items.map(item => item.id).sort((a, b) => a - b);
    result = await call({ action: 'move', itemId: parent, targetId: otherRoot, position: 'inside' });
    assert.equal(result.items.find(item => item.id === parent).contenidoPadreId, otherRoot);
    assert.equal(result.items.find(item => item.id === child).contenidoPadreId, parent);
    result = await call({ action: 'move', itemId: child, targetId: otherRoot, position: 'inside' });
    assert.equal(result.items.find(item => item.id === child).contenidoPadreId, otherRoot);
    assert.equal(result.items.find(item => item.id === grandchild).contenidoPadreId, child);
    result = await call({ action: 'move', itemId: child, targetId: parent, position: 'before' });
    assert.equal(result.items.find(item => item.id === child).contenidoPadreId, otherRoot);
    assert(result.items.findIndex(item => item.id === child) < result.items.findIndex(item => item.id === parent));
    result = await call({ action: 'move', itemId: child, targetId: null, position: 'inside' });
    assert.equal(result.items.find(item => item.id === child).contenidoPadreId, null);
    assert.equal(result.items.find(item => item.id === grandchild).contenidoPadreId, child);
    result = await call({ action: 'move', itemId: child, targetId: parent, position: 'inside' });
    result = await call({ action: 'move', itemId: parent, targetId: otherRoot, position: 'before' });
    assert.equal(result.items.find(item => item.id === parent).contenidoPadreId, null);
    assert.deepEqual(result.items.map(item => item.id).sort((a, b) => a - b), originalIds, 'Moving never recreates or drops a content');
    const beforeNoOp = structuredClone(result.items);
    result = await call({ action: 'move', itemId: parent, targetId: otherRoot, position: 'before' });
    assert.deepEqual(result.items, beforeNoOp, 'An unchanged position is a no-op');
    for (const targetId of [parent, child, grandchild]) {
      await assert.rejects(() => call({ action: 'move', itemId: parent, targetId, position: 'inside' }), error => error.code === 'failed-precondition');
    }
    await assert.rejects(() => call({ action: 'move', itemId: parent, targetId: foreign.items[0].id, position: 'inside' }), error => error.code === 'failed-precondition');
    await assert.rejects(() => call({ action: 'move', itemId: foreign.items[0].id, targetId: parent, position: 'inside' }), error => error.code === 'failed-precondition');
    for (const move of [{ targetId: null, position: 'before' }, { targetId: parent, position: 'invalid' }, { position: 'inside' }]) {
      await assert.rejects(() => call({ action: 'move', itemId: child, ...move }), error => error.code === 'invalid-argument');
    }
    await assert.rejects(() => save.run({ indicadorCapacidadId: indicatorId, action: 'move', itemId: child, targetId: null, position: 'inside' }, {}), error => error.code === 'unauthenticated');

    result = await call({ action: 'add', texto: 'Concurrencia A\nConcurrencia B' });
    const first = result.items.find(item => item.texto === 'Concurrencia A').id;
    const second = result.items.find(item => item.texto === 'Concurrencia B').id;
    const opposing = await Promise.allSettled([
      call({ action: 'move', itemId: first, targetId: second, position: 'inside' }),
      call({ action: 'move', itemId: second, targetId: first, position: 'inside' }),
    ]);
    assert.equal(opposing.filter(item => item.status === 'fulfilled').length, 1, 'Conflicting concurrent moves cannot both succeed');
    const concurrentRows = (await graph('query ReadConcurrentContentMoves($id:Int!) { items:indicadorContenidos(where:{indicadorCapacidadId:{eq:$id}},orderBy:{orden:ASC}) { id orden texto contenidoPadreId } }', { id: indicatorId })).items;
    const concurrentRoot = concurrentRows.find(item => [first, second].includes(item.id) && item.contenidoPadreId == null);
    assert(concurrentRoot, 'Concurrent moves must retain a root and avoid cycles');
    result = await call({ action: 'remove', itemId: concurrentRoot.id, includeDescendants: true });
    assert.deepEqual(result.items.map(item => item.id).sort((a, b) => a - b), originalIds);
    await assert.rejects(() => call({ action: 'remove', itemId: parent }), error => error.code === 'failed-precondition');
    const subtree = contentSubtreeIds(result.items, parent);
    result = await call({ action: 'remove', itemId: parent, includeDescendants: true });
    assert(result.items.every(item => !subtree.includes(item.id)), 'Deleting a parent removes its full subtree');
    assert(result.items.some(item => item.id === otherRoot), 'Unrelated branches survive deletion');
    await assert.rejects(() => save.run({ indicadorCapacidadId: indicatorId, action: 'add', texto: 'No autorizado' }, {}), error => error.code === 'unauthenticated');

    const concurrent = await Promise.allSettled([
      call({ action: 'add', contenidoPadreId: otherRoot, texto: 'Adición concurrente' }),
      call({ action: 'remove', itemId: otherRoot, includeDescendants: true }),
    ]);
    assert(concurrent.some(item => item.status === 'fulfilled'));
    const saved = await graph('query VerifyLocalContentTree($id:Int!) { items:indicadorContenidos(where:{indicadorCapacidadId:{eq:$id}},limit:1000) { id orden texto contenidoPadreId } }', { id: indicatorId });
    const ids = new Set(saved.items.map(item => item.id));
    assert(saved.items.every(item => item.contenidoPadreId == null || ids.has(item.contenidoPadreId)), 'Concurrent add/delete must never orphan or promote a child');
    assert(saved.items.filter(item => item.contenidoPadreId == null).every(item => item.id === otherRoot), 'A deleted parent must never promote its children to roots');
    assert.equal(new Set(saved.items.map(item => item.orden)).size, saved.items.length);
    console.log('Correcto en emulador local: inserción de hermanos en su posición, lotes, ramas e IDs conservados, destinos validados, movimientos entre niveles y concurrencia.');
  } finally {
    if (unitId) await graph('mutation RemoveLocalContentTreeFixture($id:Int!) { unidadDidactica_delete(id:$id) }', { id: unitId });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
