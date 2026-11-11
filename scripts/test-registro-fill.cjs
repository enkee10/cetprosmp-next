const assert = require('node:assert/strict');
const { buildSync } = require('esbuild');
const compiled = buildSync({ entryPoints: ['src/lib/registroFill.ts'], bundle: true, write: false, platform: 'node', format: 'cjs' });
const loaded = { exports: {} };
new Function('module', 'exports', compiled.outputFiles[0].text)(loaded, loaded.exports);
const { repeatRegistroFill } = loaded.exports;
const source = [[10, 20], [12, 18]];
const original = { minRow: 3, maxRow: 4, minCol: 4, maxCol: 5 };
assert.deepEqual(repeatRegistroFill(source, original, original), [], 'The source is never overwritten');
assert.deepEqual(repeatRegistroFill(source, original, { ...original, maxRow: 7 }).map(cell => cell.value), [10, 20, 12, 18, 10, 20]);
assert.deepEqual(repeatRegistroFill(source, original, { ...original, minRow: 0 }).map(cell => cell.value), [12, 18, 10, 20, 12, 18], 'Filling upwards keeps the pattern aligned to its original block');
assert.deepEqual(repeatRegistroFill(source, original, { ...original, maxCol: 8 }).map(cell => cell.value), [10, 20, 10, 12, 18, 12]);
assert.deepEqual(repeatRegistroFill(source, original, { ...original, minCol: 1 }).map(cell => cell.value), [20, 10, 20, 18, 12, 18], 'Filling left keeps the original column order');
assert.deepEqual(repeatRegistroFill([[0, null]], { minRow: 0, maxRow: 0, minCol: 0, maxCol: 1 },
  { minRow: 0, maxRow: 2, minCol: 0, maxCol: 1 }).map(cell => cell.value), [0, null, 0, null], 'Zeros and blanks are copied');
assert.deepEqual(source, [[10, 20], [12, 18]], 'Repeated previews do not mutate the original values');
console.log('Relleno: cuatro direcciones, bloques, alineacion, origen intacto, ceros y vacios. Correcto.');
