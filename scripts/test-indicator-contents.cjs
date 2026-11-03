const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

function load(file, imports = {}) {
  const mod = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('module', 'exports', 'require', code)(mod, mod.exports, name => {
    if (name in imports) return imports[name];
    throw Error(`Unexpected import ${name}`);
  });
  return mod.exports;
}

const similarity = load('functions/src/modules/academico/contentSimilarity.ts');
assert.deepEqual(similarity.splitIndicatorContents(' Uno\n\nDos párrafos \n  Tres  espacios '), ['Uno', 'Dos párrafos', 'Tres espacios']);
assert.equal(similarity.indicatorContentsAreSimilar('Propiedades de Página.', 'propiedades de página'), true);
assert.equal(similarity.indicatorContentsAreSimilar('Conocimiento: Mantenimiento de puertas', 'Sílabo 2026: Mantenimientos de puertas'), true);
assert.equal(similarity.indicatorContentsAreSimilar('Reconocimiento de Columna A', 'Reconocimiento de Columna B'), false);
assert.equal(similarity.indicatorContentsAreSimilar('Aplicando el ángulo 45°', 'Aplicando el ángulo 90°'), false);
assert.equal(similarity.indicatorContentsAreSimilar('Herramientas de trazo y seguridad', 'Herramientas de medición y seguridad'), false);

class HttpsError extends Error { constructor(code, message) { super(message); this.code = code; } }
const https = { HttpsError, onCall: handler => handler };
let items = [], nextId = 1;
let sessionItems = [{ id: 51, orden: 7, texto: 'Recurso previo', materialId: 71 }];
const catalog = new Map([[71, { id: 71, nombre: 'Recurso previo' }], [72, { id: 72, nombre: 'Papel' }], [73, { id: 73, nombre: 'Papeles, de colores' }]]);
let materialLookups = 0;
const sessionEdits = [];
const dataConnect = { executeGraphql: async (source, { variables = {} } = {}) => {
  if (source.includes('mutation CurricularEditText')) {
    assert(source.includes('nombre proposito duracion'));
    sessionEdits.push(variables);
    return { data: { actividad_update: { id: variables.id } } };
  }
  if (source.includes('query CurricularSessionItems') || source.includes('query CurricularSavedSessionItems')) return { data: { actividad: { id: variables.actividadId }, items: sessionItems.slice() } };
  if (source.includes('mutation AttachSessionMaterials(')) {
    assert(source.includes('@transaction'), 'All session links are saved together');
    const orders = [...source.matchAll(/m(\d+):actividadMaterial_insert\([^\n]+orden:(\d+)/g)];
    const added = orders.map(([, index, order]) => ({ id: 1000 + sessionItems.length + Number(index), orden: Number(order), texto: variables['texto' + index], materialId: variables['materialId' + index] }));
    sessionItems = sessionItems.concat(added);
    return { data: {} };
  }
  if (source.includes('query CurricularIndicatorContents')) return { data: { indicador: { id: variables.indicadorCapacidadId }, items: items.slice().sort((a, b) => a.orden - b.orden) } };
  if (source.includes('mutation AddIndicatorContents')) {
    for (const [, id, orden] of source.matchAll(/shift(\d+):indicadorContenido_update\([^\n]+data:\{orden:(\d+)\}/g)) {
      items = items.map(item => item.id === Number(id) ? { ...item, orden: Number(orden) } : item);
    }
    const orders = new Map([...source.matchAll(/c(\d+):indicadorContenido_insert\([^\n]+,orden:(\d+),texto:/g)].map(([, index, order]) => [Number(index), Number(order)]));
    Object.keys(variables).filter(key => /^texto\d+$/.test(key)).sort((a, b) => Number(a.slice(5)) - Number(b.slice(5))).forEach((key, index) => {
      items.push({ id: nextId++, orden: orders.get(index), texto: variables[key], contenidoPadreId: variables.contenidoPadreId ?? null });
    });
    return { data: {} };
  }
  if (source.includes('mutation RemoveIndicatorContent')) { items = items.filter(item => !variables.ids.includes(item.id)); return { data: {} }; }
  if (source.includes('mutation ReorderIndicatorContents')) {
    const orders = [...source.matchAll(/c(\d+):indicadorContenido_update\([^\n]+data:\{orden:(\d+)\}/g)].map(match => [Number(match[1]), Number(match[2])]);
    items = items.map(item => ({ ...item, orden: orders.find(([id]) => id === item.id)?.[1] ?? item.orden }));
    return { data: {} };
  }
  throw Error(`Unexpected operation: ${source.slice(0, 80)}`);
} };
const editing = load('functions/src/modules/academico/curricularEditing.ts', {
  'firebase-functions/v1': { https },
  '../core/dataConnectCore.js': { dataConnect },
  '../core/permissions.js': { requirePermission: async () => {} },
  '../core/userMappers.js': { toNumberOrNull: value => Number(value) || null, getIdFromKeyOutput: () => 1 },
  '../competencias/model.js': {}, '../competencias/service.js': {}, './curricularCreation.js': {},
  '../materiales/handlers.js': {
    getMaterialRow: async id => catalog.get(id),
    getOrCreateMaterial: async nombre => {
      materialLookups++;
      const existing = [...catalog.values()].find(row => row.nombre.toLowerCase() === nombre.toLowerCase());
      if (existing) return existing;
      const row = { id: catalog.size + 100, nombre }; catalog.set(row.id, row); return row;
    },
    displayMaterialLink: item => item,
  }, './contentSimilarity.js': similarity, './contentTree.js': load('functions/src/modules/academico/contentTree.ts'),
});

(async () => {
  await editing.updateCurricularExtraCell('actividad', 10, 'proposito', 'Aplicar lo aprendido');
  await editing.updateCurricularExtraCell('actividad', 10, 'proposito', null);
  assert.deepEqual(sessionEdits, [
    { id: 10, data: { proposito: 'Aplicar lo aprendido' } },
    { id: 10, data: { proposito: null } },
  ], 'Purpose can be saved and cleared without changing the session name or resources');
  await assert.rejects(() => editing.updateCurricularExtraCell('actividad', 10, 'moduloId', 99), error => error.code === 'invalid-argument');
  await assert.rejects(() => editing.updateCurricularExtraCell('aprendizaje', 10, 'proposito', 'Invalid'), error => error.code === 'invalid-argument');
  assert.equal(sessionEdits.length, 2, 'Unrelated fields and entities remain protected');
  const call = payload => editing.saveEstructuraAcademicaIndicadorContenido(payload, {});
  let result = await call({ indicadorCapacidadId: 9, action: 'add', texto: 'Corte\n\nPegado\ncorte' });
  assert.deepEqual(result.items.map(item => item.texto), ['Corte', 'Pegado']);
  result = await call({ indicadorCapacidadId: 9, action: 'add', texto: 'Reconocimiento de Columna A\nReconocimiento de Columna B\nAplicando el ángulo 45°\nAplicando el ángulo 90°' });
  assert.equal(result.items.length, 6, 'Distinct concepts remain separate');
  result = await call({ indicadorCapacidadId: 9, action: 'add', texto: 'Conocimiento: Mantenimiento de puertas\nSílabo 2026: Mantenimientos de puertas' });
  assert.equal(result.items.length, 7, 'Equivalent lines are fused');
  const reversed = result.items.slice().reverse().map((item, index) => ({ id: item.id, orden: index + 1 }));
  result = await call({ indicadorCapacidadId: 9, action: 'reorder', items: reversed });
  assert.deepEqual(result.items.map(item => item.id), reversed.map(item => item.id));
  const removed = result.items[0].id;
  result = await call({ indicadorCapacidadId: 9, action: 'remove', itemId: removed });
  assert.equal(result.items.some(item => item.id === removed), false);
  result = await call({ indicadorCapacidadId: 9, action: 'add', texto: 'Texto con coma, que se conserva; completo' });
  assert(result.items.some(item => item.texto === 'Texto con coma, que se conserva; completo'), 'Content keeps commas and semicolons');

  const resource = payload => editing.saveEstructuraAcademicaSesionItem({ actividadId: 10, kind: 'material', action: 'add', ...payload }, {});
  result = await resource({ texto: '  Papel,\nLapiz;;Tijeras;\r\n \t,, Pincel' });
  assert.deepEqual(result.items.map(item => item.texto), ['Recurso previo', 'Papel', 'Lapiz', 'Tijeras', 'Pincel']);
  assert.deepEqual(result.items.map(item => item.orden), [7, 8, 9, 10, 11]);
  assert.equal(result.items[1].materialId, 72, 'Existing catalog material is reused');
  assert.equal(result.items[0].id, 51, 'Existing links stay untouched');
  const before = structuredClone(sessionItems), lookups = materialLookups;
  for (const texto of [' , ; \n\t', 'x'.repeat(10001), Array.from({ length: 201 }, (_, i) => 'R' + i).join(';')]) {
    await assert.rejects(() => resource({ texto }), error => error.code === 'invalid-argument');
  }
  assert.deepEqual(sessionItems, before); assert.equal(materialLookups, lookups, 'Invalid batches do not create catalog materials');
  result = await resource({ materialId: 73 });
  assert.equal(result.items.at(-1).texto, 'Papeles, de colores', 'Selecting an existing ID preserves its full name');
  sessionItems = Array.from({ length: 199 }, (_, i) => ({ id: i + 1, orden: i + 1, texto: 'Existing ' + i }));
  await assert.rejects(() => resource({ texto: 'Nuevo A; Nuevo B' }), error => error.code === 'failed-precondition');
  assert.equal(sessionItems.length, 199); assert.equal(materialLookups, lookups);
  console.log('Passed: indicator contents and session resource batches, separators, empty fragments, catalog reuse, ordering and limits.');
})().catch(error => { console.error(error); process.exitCode = 1; });
