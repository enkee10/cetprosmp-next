const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

function helpers(file, names) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const declarations = source.statements.flatMap(node => {
    if (ts.isFunctionDeclaration(node) && names.includes(node.name?.text)) return [node.getText(source)];
    if (ts.isVariableStatement(node)) return node.declarationList.declarations
      .filter(item => names.includes(item.name.getText(source))).map(item => `const ${item.getText(source)};`);
    return [];
  });
  const code = ts.transpileModule(declarations.join('\n'), { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  return new Function(`${code}\nreturn {${names.join(',')}};`)();
}

const files = [
  'src/app/(aplicacion)/intranet/registro-auxiliar/page.tsx',
  'src/app/(sueltos)/intranet/registro-auxiliar/imprimir/page.tsx',
  'functions/src/modules/registro-auxiliar/handlers.ts',
];
for (const file of files) {
  const { average, weightedAverage } = helpers(file, ['average', 'weightedAverage']);
  for (const missing of [null, undefined, NaN, Infinity]) {
    assert.equal(average([18, missing]), null, `${file}: partial averages remain empty`);
    assert.equal(weightedAverage([{ value: 18, weight: 1 }, { value: missing, weight: 2 }]), null);
  }
  assert.equal(average([]), null);
  assert.equal(average([0, 18]), 9, 'Zero is a recorded grade');
  assert.equal(average([13, 18]), 16);
  assert.equal(weightedAverage([{ value: 0, weight: 1 }, { value: 18, weight: 2 }]), 12);
  assert.equal(weightedAverage([{ value: 10, weight: null }, { value: 18, weight: null }]), 14);
}
const { averageGrades } = helpers('functions/src/modules/reportes/handlers.ts', ['averageGrades']);
assert.equal(averageGrades([18, null]), null);
assert.equal(averageGrades([0, 18]), 9);

const math = helpers(files[2], ['average', 'weightedAverage', 'roundPromedio', 'sum']);
for (const file of files.slice(0, 2)) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  let callback, moduloCallback;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === 'getCapacidadAverage') callback = node.initializer.arguments[0].getText(source);
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === 'getModuloAverage') moduloCallback = node.initializer.arguments[0].getText(source);
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert(callback, `${file}: capacity calculation exists`);
  const code = ts.transpileModule(`const calculate = ${callback};`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  for (const [grades, expected] of [
    [[null, 18], null], [[14, null], null], [[null, null], null],
    [[14, 18], 18], [[0, 18], 18], [[14, 0], 0],
  ]) {
    const calculate = new Function('average', 'roundPromedio', 'getNotaValue', 'usesOcupacionalRules', `${code}\nreturn calculate;`)(math.average, math.roundPromedio, (_, id) => grades[id - 1], true);
    assert.equal(calculate(100, { indicadoresCapacidad: [{ id: 1 }, { id: 2 }] }), expected, `${file}: occupational achievement requires all grades: ${grades}`);
  }
  assert(moduloCallback, `${file}: module calculation exists`);
  const moduloCode = ts.transpileModule(`const calculate = ${moduloCallback};`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  for (const occupational of [false, true]) {
    for (const [grades, expected] of [[[10, 18], occupational ? 14 : 16], [[10, null], null], [[0, 0], 0]]) {
      const calculate = new Function('average', 'weightedAverage', 'getUnidadAverage', 'registro', 'usesOcupacionalRules', 'getEfsrtPppAverage', `${moduloCode}\nreturn calculate;`)(
        math.average, math.weightedAverage, (_, unit) => grades[unit.id - 1],
        { estructura: [{ id: 1, creditos: 1 }, { id: 2, creditos: 3 }], grupoModulo: { modulo: { creditosEfsrt: 100 } } },
        occupational, () => { throw Error('EFSRT must not participate in the general average'); },
      );
      assert.equal(calculate({ id: 40, matriculaId: 100 }), expected, `${file}: module average uses only complete unit grades`);
    }
  }
}
const code = ts.transpileModule(fs.readFileSync('functions/src/modules/registro-auxiliar/partialSave.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const mod = { exports: {} };
let mutation;
const snapshot = {
  notes: [{ id: 1, matriculaId: 100, indicadorCapacidadId: 11, promedio: 14 }, { id: 2, matriculaId: 100, indicadorCapacidadId: 12, promedio: 18 }],
  capacities: [{ id: 3, matriculaId: 100, capacidadTerminalId: 20, promedio: 16 }],
  units: [{ id: 4, matriculaId: 100, unidadDidacticaId: 30, promedio: 16 }],
  efsrt: [{ id: 5, moduloEstudianteId: 40, promedioFinal: 16 }],
};
new Function('module', 'exports', 'require', code)(mod, mod.exports, name => {
  if (name === 'firebase-functions/v1') return { https: { HttpsError: Error } };
  if (name === '../core/dataConnectCore.js') return { dataConnect: { executeGraphql: async source => {
    if (source.startsWith('query')) return { data: snapshot };
    mutation = source;
    return { data: {} };
  } } };
  throw Error(`Unexpected import: ${name}`);
});
(async () => {
  await mod.exports.savePartialRegistroGrades({
    grupoModuloId: 50, usesOcupacionalRules: false, moduloCreditoEfsrt: 1,
    unidadIds: [30], unidadCreditoById: new Map([[30, 1]]),
    capacidades: [{ id: 20, unidadDidacticaId: 30 }],
    indicadores: [{ id: 11, capacidadTerminalId: 20 }, { id: 12, capacidadTerminalId: 20 }],
    moduloEstudiantes: [{ id: 40, matriculaId: 100 }],
    notas: [{ matriculaId: 100, indicadorCapacidadId: 11, nota: null }], efsrtPppPromedios: [],
  }, math);
  for (const table of ['indicadorCapacidadEstudiante', 'capacidadTerminalEstudiante', 'unidadDidacticaEstudiante', 'moduloEstudiante']) {
    assert.match(mutation, new RegExp(`${table}_update\\([^\\n]*promedio:null`), `${table}: clearing a grade clears downstream averages`);
  }
  assert.equal(snapshot.notes[1].promedio, 18, 'Unchanged indicator grades remain intact');
  for (const [grades, expected] of [
    [[null, 18], null], [[14, null], null], [[null, null], null],
    [[14, 18], 18], [[0, 18], 18], [[14, 0], 0],
  ]) {
    snapshot.notes.forEach((row, index) => { row.promedio = grades[index]; });
    await mod.exports.savePartialRegistroGrades({
      grupoModuloId: 50, usesOcupacionalRules: true, moduloCreditoEfsrt: null,
      unidadIds: [30], unidadCreditoById: new Map([[30, 1]]),
      capacidades: [{ id: 20, unidadDidacticaId: 30 }],
      indicadores: [{ id: 11, capacidadTerminalId: 20 }, { id: 12, capacidadTerminalId: 20 }],
      moduloEstudiantes: [{ id: 40, matriculaId: 100 }],
      notas: [{ matriculaId: 100, indicadorCapacidadId: 11, nota: grades[0] }], efsrtPppPromedios: [],
    }, math);
    for (const table of ['capacidadTerminalEstudiante', 'unidadDidacticaEstudiante', 'moduloEstudiante']) {
      assert.match(mutation, new RegExp(`${table}_update\\([^\\n]*promedio:${expected}(?:,|})`), `${table}: occupational averages require both grades, including zero`);
    }
  }
  snapshot.notes[0].promedio = 14;
  snapshot.notes[1].promedio = 18;
  for (const efsrt of [undefined, null, 0, 20]) {
    snapshot.efsrt = efsrt === undefined ? [] : [{ id: 5, moduloEstudianteId: 40, promedioFinal: efsrt }];
    await mod.exports.savePartialRegistroGrades({
      grupoModuloId: 50, usesOcupacionalRules: false, moduloCreditoEfsrt: 100,
      unidadIds: [30], unidadCreditoById: new Map([[30, 1]]),
      capacidades: [{ id: 20, unidadDidacticaId: 30 }],
      indicadores: [{ id: 11, capacidadTerminalId: 20 }, { id: 12, capacidadTerminalId: 20 }],
      moduloEstudiantes: [{ id: 40, matriculaId: 100 }],
      notas: [{ matriculaId: 100, indicadorCapacidadId: 11, nota: 14 }], efsrtPppPromedios: [],
    }, math);
    assert.match(mutation, /moduloEstudiante_update\([^\n]*promedio:16,/, 'Module average is independent of missing, empty, zero or different EFSRT grades');
  }
  for (const value of [null, 0, 20]) {
    await mod.exports.savePartialRegistroGrades({
      grupoModuloId: 50, usesOcupacionalRules: false, moduloCreditoEfsrt: 100,
      unidadIds: [30], unidadCreditoById: new Map([[30, 1]]),
      capacidades: [{ id: 20, unidadDidacticaId: 30 }],
      indicadores: [{ id: 11, capacidadTerminalId: 20 }, { id: 12, capacidadTerminalId: 20 }],
      moduloEstudiantes: [{ id: 40, matriculaId: 100 }], notas: [],
      efsrtPppPromedios: [{ moduloEstudianteId: 40, promedioFinal: value }],
    }, math);
    assert.match(mutation, new RegExp(`efsrtPppEstudiante_update\\([^\\n]*promedioFinal:${value},`), 'EFSRT grade is saved independently');
    assert.match(mutation, /moduloEstudiante_update\([^\n]*promedio:16,/, 'Editing only EFSRT leaves the module average unchanged');
    assert.doesNotMatch(mutation, /indicadorCapacidadEstudiante_(?:update|insert)/, 'Editing EFSRT preserves indicator grades');
  }
  console.log('Promedios completos: pantalla, impresión, opción ocupacional, cero válido, borrado y EFSRT independiente al guardar: correctos.');
})().catch(error => { console.error(error); process.exitCode = 1; });
