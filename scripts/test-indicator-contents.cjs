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
const dataConnect = { executeGraphql: async (source, { variables = {} } = {}) => {
  if (source.includes('query CurricularIndicatorContents')) return { data: { indicador: { id: variables.indicadorCapacidadId }, items: items.slice().sort((a, b) => a.orden - b.orden) } };
  if (source.includes('mutation AddIndicatorContents')) {
    const start = items.length;
    Object.keys(variables).filter(key => /^texto\d+$/.test(key)).sort((a, b) => Number(a.slice(5)) - Number(b.slice(5))).forEach((key, index) => {
      items.push({ id: nextId++, orden: start + index + 1, texto: variables[key] });
    });
    return { data: {} };
  }
  if (source.includes('mutation RemoveIndicatorContent')) { items = items.filter(item => item.id !== variables.id); return { data: {} }; }
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
  '../materiales/handlers.js': {}, './contentSimilarity.js': similarity,
});

(async () => {
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
  console.log('Contenidos por indicador: separación multilínea, fusión conservadora, reordenamiento y eliminación verificados.');
})().catch(error => { console.error(error); process.exitCode = 1; });
