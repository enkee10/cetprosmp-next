const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const mod = { exports: {} };
new Function('exports', ts.transpileModule(fs.readFileSync('src/lib/registroPrintLayout.ts', 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText)(mod.exports);
const { buildRegistroPrintPages: build, REGISTRO_PRINT_SIZES: sizes, PRINT_PX_TO_MM } = mod.exports;
const unit = (id, count = 1) => [
  ...Array.from({ length: count }, (_, index) => ({ key: `i-${id}-${index}`, widthMm: sizes.minimumIndicatorMm, type: 'indicador', unidad: { id }, capacidad: { id } })),
  { key: `u-${id}`, widthMm: sizes.averageMm, type: 'unidad', unidad: { id }, capacidad: null },
];
const summary = { key: 'general', widthMm: sizes.averageMm, type: 'promedio', unidad: null, capacidad: null };
const measurements = (baseIndicator, extendedIndicator, baseCapacity, extendedCapacity) => ({
  indicators: { base: { 'i-1-0': baseIndicator }, extended: { 'i-1-0': extendedIndicator } },
  capacities: { base: { 1: baseCapacity }, extended: { 1: extendedCapacity } },
});
let page = build(unit(1), 200, measurements(20, 15, 50, 40))[0];
assert.deepEqual(page.adjustments, [], 'Fitting text must not increase either header');
assert.equal(page.capacityHeightPx, 93);
assert.equal(page.indicatorHeightPx, 135);
page = build(unit(1), 200, measurements(20, 15, 200, 110))[0];
assert.deepEqual(page.adjustments, ['capacity']);
assert.equal(page.capacityHeightPx, 93 * 1.1);
assert.equal(page.indicatorHeightPx, 135, 'Capacity overflow does not enlarge indicators');
assert.equal(page.overflow.score, 0);
page = build(unit(1), 200, measurements(140, 110, 50, 40))[0];
assert.deepEqual(page.adjustments, ['indicator']);
assert.equal(page.capacityHeightPx, 93, 'Indicator overflow does not enlarge capacities');
assert.equal(page.indicatorHeightPx, 135 * 1.1);
assert.equal(page.overflow.score, 0);
page = build(unit(1), 200, measurements(160, 100, 200, 110))[0];
assert.deepEqual(page.adjustments, ['capacity', 'indicator'], 'Headers grow separately, with a full redistribution after each step');
assert.equal(page.overflow.score, 0);
const impossible = build(unit(1), 200, measurements(250, 200, 300, 250));
assert.equal(impossible.length, 1, 'A single unit is never split');
assert(impossible[0].overflow.score > 0);
assert(impossible[0].capacityHeightPx <= 93 * 1.1 && impossible[0].indicatorHeightPx <= 135 * 1.1);
assert.equal(impossible[0].columns.length, 2, 'Residual overflow never discards columns');
const singlePageColumns = [...unit(1), ...unit(2), summary];
for (const { indicator, capacity, expected } of [
  { indicator: [40, 35], capacity: [40, 35], expected: [] },
  { indicator: [60, 40], capacity: [10, 10], expected: ['indicator'] },
  { indicator: [10, 10], capacity: [60, 40], expected: ['capacity'] },
  { indicator: [70, 45], capacity: [80, 45], expected: ['capacity', 'indicator'] },
]) {
  const measured = { indicators: { base: {}, extended: {} }, capacities: { base: {}, extended: {} } };
  for (const id of [1, 2]) {
    measured.indicators.base[`i-${id}-0`] = indicator[0];
    measured.indicators.extended[`i-${id}-0`] = indicator[1];
    measured.capacities.base[id] = capacity[0];
    measured.capacities.extended[id] = capacity[1];
  }
  const fitted = build(singlePageColumns, 200, measured);
  assert.equal(fitted.length, 1, `Try all necessary single-page strategies before using two pages: ${expected}`);
  assert.deepEqual(fitted[0].adjustments, expected);
  assert(fitted[0].overflow.score <= 0.05, 'The entire content fits after single-page adjustments');
  assert.deepEqual(fitted[0].columns.map(column => column.key), singlePageColumns.map(column => column.key), 'One page retains both units and the general average');
}
const columns = [1, 2, 3, 4].flatMap(id => unit(id));
const splitMeasurements = { indicators: { base: {}, extended: {} }, capacities: { base: {}, extended: {} } };
for (const [index, width] of [110, 90, 30, 30].entries()) {
  splitMeasurements.indicators.base[`i-${index + 1}-0`] = width;
  splitMeasurements.indicators.extended[`i-${index + 1}-0`] = width;
}
const pages = build([...columns, summary], 280, splitMeasurements);
assert.equal(pages.length, 2);
assert.deepEqual([...new Set(pages[0].columns.map(column => column.unidad?.id))], [1]);
assert.deepEqual([...new Set(pages[1].columns.filter(column => column.unidad).map(column => column.unidad.id))], [2, 3, 4], 'The split moves a whole unit away from the overflowing half');
assert(pages.every(page => page.overflow.score === 0));
const occupationalPages = build([...columns, summary], 280, splitMeasurements, 1);
assert.equal(occupationalPages.length, 1, 'Occupational programs always use a single horizontal page');
assert.deepEqual(occupationalPages[0].columns.map(column => column.key), [...columns, summary].map(column => column.key), 'The single-page exception keeps every unit and grade column');
assert.deepEqual(pages.flatMap(page => page.columns.map(column => column.key)), [...columns, summary].map(column => column.key));
for (const page of pages) for (const column of page.columns.filter(column => column.type !== 'indicador')) assert.equal(column.widthMm, 9, 'Unit and general averages are always fixed at 9mm');
assert.equal(sizes.efsrtMm, 9);
for (const printableWidth of [160, 190, 277]) {
  const denseColumns = [...unit(1, 25), { key: 'efsrt', widthMm: sizes.efsrtMm, type: 'efsrt', unidad: null, capacidad: null }, summary];
  const dense = build(denseColumns, printableWidth, measurements(20, 15, 50, 40), 1)[0];
  assert(dense.widthMm + PRINT_PX_TO_MM <= printableWidth + 0.001, 'Dense tables include borders within the actual printable width');
  assert(dense.columns.filter(column => column.type === 'indicador').every(column => column.widthMm > 0));
}
const independentMeasurements = { indicators: { base: { 'i-1-0': 10, 'i-1-1': 15, 'i-1-2': 25 }, extended: {} }, capacities: { base: {}, extended: {} } };
const independent = build(unit(1, 3), 277, independentMeasurements)[0].columns.filter(column => column.type === 'indicador');
assert(Math.abs(independent[1].widthMm - independent[0].widthMm - 5) < 0.001);
assert(Math.abs(independent[2].widthMm - independent[1].widthMm - 10) < 0.001, 'Independent minima are retained while sharing spare space equally');
console.log('Impresión: alturas condicionales hasta 110%, saltos solo por unidad, máximo dos páginas, anchos independientes y promedios fijos: correcto.');
