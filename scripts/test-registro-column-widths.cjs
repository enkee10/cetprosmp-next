const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const code = ts.transpileModule(fs.readFileSync('src/lib/registroColumnWidths.ts', 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText;
const mod = { exports: {} };
new Function('exports', code)(mod.exports);
const { calculateRegistroColumnWidths: calculate } = mod.exports;
const capacities = [{ id: 1, indicatorIds: [11, 12, 13] }, { id: 2, indicatorIds: [21, 22] }];
const measured = { indicators: { 11: 20, 12: 80, 13: 140, 21: 20, 22: 20 }, capacities: { 1: 150, 2: 400 } };
const fixedWidth = 549;
const narrow = calculate(capacities, measured, 650, fixedWidth);
assert(narrow.indicatorWidths[11] < narrow.indicatorWidths[12]);
assert(narrow.indicatorWidths[12] < narrow.indicatorWidths[13], 'Indicators retain independent content widths');
assert.equal(narrow.indicatorWidths[11], 44, 'Short labels retain only the width needed to enter a grade');
assert(narrow.indicatorWidths[21] + narrow.indicatorWidths[22] >= 400, 'Parent capacity must fit using only its indicators');
assert.equal(narrow.averageWidth, 40, 'Average stays narrow while content requires horizontal scrolling');
assert(narrow.tableWidth > 650, 'Long content scrolls instead of being clipped');
const wide = calculate(capacities, measured, 2400, fixedWidth);
assert.equal(wide.tableWidth, 2400);
assert(wide.averageWidth >= 40 && wide.averageWidth <= 70);
assert(Math.abs(wide.indicatorWidths[12] - wide.indicatorWidths[11] - 36) < 0.001);
assert(Math.abs(wide.indicatorWidths[13] - wide.indicatorWidths[12] - 60) < 0.001, 'Sharing spare space preserves the differences required by each label');
const oneUnit = calculate(capacities, measured, 650, fixedWidth, 1);
assert(Math.abs(oneUnit.tableWidth - (fixedWidth + oneUnit.averageWidth + Object.values(oneUnit.indicatorWidths).reduce((sum, width) => sum + width, 0))) < 0.001, 'Two capacities in one unit share a single unit-average column');
const widthsWithoutParentConstraint = calculate([capacities[0]], measured, 1600, fixedWidth);
const excess = capacities[0].indicatorIds.map(id => widthsWithoutParentConstraint.indicatorWidths[id] - Math.max(44, measured.indicators[id]));
assert(Math.max(...excess) - Math.min(...excess) < 0.001, 'Spare space is divided equally between indicators');
for (const viewport of [800, 1033, 1040, 1200, 1800]) {
  const layout = calculate([{ id: 1, indicatorIds: [1, 2] }], { indicators: { 1: 400, 2: 44 }, capacities: {} }, viewport, fixedWidth);
  assert(layout.averageWidth < layout.indicatorWidths[2], 'The average remains narrower than the shortest indicator');
  const total = fixedWidth + layout.averageWidth + layout.indicatorWidths[1] + layout.indicatorWidths[2];
  assert(Math.abs(total - layout.tableWidth) < 0.001, 'Column widths add up to the table width');
}
for (const columns of [[], [{ id: 1, indicatorIds: [] }]]) {
  const layout = calculate(columns, { indicators: {}, capacities: {} }, 2000, fixedWidth);
  assert(Number.isFinite(layout.tableWidth));
  assert(Number.isFinite(layout.averageWidth));
  assert.equal(layout.tableWidth, fixedWidth + columns.length * 70, 'An empty page does not stretch fixed summary columns');
}
console.log('Anchos de registro: indicadores independientes, capacidad completa, espacio mínimo y reparto uniforme: correctos.');
