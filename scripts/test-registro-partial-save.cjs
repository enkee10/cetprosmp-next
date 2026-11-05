const assert = require('node:assert/strict'), fs = require('node:fs'), ts = require('typescript');
process.env.DATA_CONNECT_EMULATOR_HOST = '127.0.0.1:9399';
process.env.GOOGLE_CLOUD_PROJECT = 'cetprosmp-2026';
const { dataConnect } = require('../functions/lib/modules/core/dataConnectCore.js');
const { savePartialRegistroGrades } = require('../functions/lib/modules/registro-auxiliar/partialSave.js');
const { curricularUnitIdsInOrder: buildUnidadIds } = require('../functions/lib/modules/academico/curricularUnitOrder.js');
const graph = async (query, variables = {}) => (await dataConnect.executeGraphql(query, { variables })).data;
const transpile = source => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const source = ts.createSourceFile('handlers.ts', fs.readFileSync('functions/src/modules/registro-auxiliar/handlers.ts', 'utf8'), ts.ScriptTarget.Latest, true);
const helperNames = ['average', 'weightedAverage', 'roundPromedio', 'sum', 'normalizedNota', 'normalizeText', 'usesOpcionOcupacionalRules', 'getAcademicOrder', 'mergeModuloEstudiantesForGrupoModulo'];
const declarations = source.statements.filter(node => ts.isFunctionDeclaration(node) && helperNames.includes(node.name?.text));
const helpers = new Function(transpile(declarations.map(node => node.getText(source)).join('\n')) + `\nreturn {${helperNames.join(',')}};`)();
let action; function visit(node) { if (ts.isVariableDeclaration(node) && node.name.getText(source) === 'saveRegistroAuxiliar') action = node.initializer.arguments[0].getText(source); ts.forEachChild(node, visit); } visit(source);
class HttpsError extends Error { constructor(code, message) { super(message); this.code = code; } }
const dependencies = { ...helpers, savePartialRegistroGrades, buildUnidadIds, dataConnect, https: { HttpsError }, console, ensureRegistroAuxiliarAccess: async () => {}, applyPeriodSelection: async () => {}, toNumber: (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback };
const save = new Function(...Object.keys(dependencies), transpile(`const action=${action};`) + '\nreturn action;')(...Object.values(dependencies));
const ids = { module: null, group: null, semester: null, students: [], units: [] };
const insert = async (table, fields) => (await graph(`mutation LocalPartialSaveInsert {row:${table}_insert(data:{${fields}})}`)).row.id;
const read = async (table, where, fields) => (await graph(`query LocalPartialSaveRead {rows:${table}(where:{${where}}){${fields}}}`)).rows;
(async () => {
  try {
    ids.semester = await insert('semestre', 'titulo:"__local_partial_save__"');
    ids.module = await insert('modulo', 'titulo:"__local_partial_save__",creditosEfsrt:2');
    ids.group = await insert('grupo', `semestreId:${ids.semester}`);
    const groupModule = await insert('grupoModulo', `grupoId:${ids.group},moduloId:${ids.module}`);
    const comp = await insert('competencia', `moduloId:${ids.module},tipo:TECNICA,nombre:"Competencia de prueba"`);
    for (const credits of [1, 3]) {
      const id = await insert('unidadDidactica', `nombre:"Unidad de prueba",creditos:${credits}`); ids.units.push(id);
      await insert('competenciaUnidadDidactica', `competenciaId:${comp},unidadDidacticaId:${id}`);
    }
    const capacities = [];
    for (const unit of [ids.units[0], ids.units[0], ids.units[1]]) capacities.push(await insert('capacidadTerminal', `unidadDidacticaId:${unit}`));
    const indicators = [];
    for (const cap of [capacities[0], capacities[0], capacities[1], capacities[2]]) indicators.push(await insert('indicadorCapacidad', `capacidadTerminalId:${cap},orden:${indicators.length + 1}`));
    const modules = [];
    for (let i = 0; i < 2; i++) {
      const id = await insert('matricula', `semestreId:${ids.semester}`); ids.students.push(id);
      modules.push(await insert('moduloEstudiante', `matriculaId:${id},moduloId:${ids.module},grupoId:${ids.group},grupoModuloId:${groupModule}`));
      for (let index = 0; index < indicators.length; index++) await insert('indicadorCapacidadEstudiante', `matriculaId:${id},indicadorCapacidadId:${indicators[index]},promedio:${[10, 18, 20, 12][index]}`);
    }
    await insert('efsrtPppEstudiante', `grupoModuloId:${groupModule},moduloEstudianteId:${modules[0]},promedioFinal:16`);
    const nota = value => ({ matriculaId: ids.students[0], indicadorCapacidadId: indicators[0], nota: value });
    await save({ grupoModuloId: groupModule, partial: true, notas: [nota(14)] }, {});
    const values = await read('indicadoresCapacidadEstudiantes', `matriculaId:{eq:${ids.students[0]}}`, 'id indicadorCapacidadId promedio');
    assert.deepEqual(indicators.map(id => values.find(row => row.indicadorCapacidadId === id).promedio), [14, 18, 20, 12], 'A cell save preserves all other indicator grades');
    const capacityValues = await read('capacidadesTerminalesEstudiantes', `matriculaId:{eq:${ids.students[0]}}`, 'capacidadTerminalId promedio');
    assert.equal(capacityValues.find(row => row.capacidadTerminalId === capacities[0]).promedio, 16);
    assert.equal(capacityValues.length, 1, 'Only the affected capacity average is written');
    const unitValues = await read('unidadesDidacticasEstudiantes', `matriculaId:{eq:${ids.students[0]}}`, 'unidadDidacticaId promedio');
    assert.equal(unitValues[0].promedio, 18, 'Other capacity grades are included when calculating the unit');
    const moduleValue = (await read('modulosEstudiantes', `id:{eq:${modules[0]}}`, 'promedio puntaje'))[0];
    assert.deepEqual(moduleValue, { promedio: 14, puntaje: 46 }, 'Module averages retain untouched units and EFSRT');
    await save({ grupoModuloId: groupModule, partial: true, notas: [], efsrtPppPromedios: [{ moduloEstudianteId: modules[0], promedioFinal: 20 }] }, {});
    assert.equal((await read('modulosEstudiantes', `id:{eq:${modules[0]}}`, 'promedio'))[0].promedio, 16, 'EFSRT-only edits recalculate the module');
    await save({ grupoModuloId: groupModule, partial: true, notas: [nota(null)] }, {});
    assert.equal((await read('indicadoresCapacidadEstudiantes', `matriculaId:{eq:${ids.students[0]}},indicadorCapacidadId:{eq:${indicators[0]}}`, 'promedio'))[0].promedio, null);
    assert.equal((await read('indicadoresCapacidadEstudiantes', `matriculaId:{eq:${ids.students[1]}},indicadorCapacidadId:{eq:${indicators[0]}}`, 'promedio'))[0].promedio, 10, 'Other students are untouched');
    await assert.rejects(() => save({ grupoModuloId: groupModule, partial: true, notas: [{ ...nota(20), matriculaId: -5 }] }, {}));
    await assert.rejects(() => savePartialRegistroGrades({ grupoModuloId: groupModule, usesOcupacionalRules: false, moduloCreditoEfsrt: 2, unidadIds: ids.units, unidadCreditoById: new Map(), capacidades: [], indicadores: [], moduloEstudiantes: [], notas: [nota(20)], efsrtPppPromedios: [] }, helpers), /ya no pertenece/);
    // A missing module-student must roll back the whole mutation, including indicator updates.
    const before = await read('indicadoresCapacidadEstudiantes', `matriculaId:{eq:${ids.students[0]}}`, 'id indicadorCapacidadId promedio');
    await assert.rejects(() => savePartialRegistroGrades({ grupoModuloId: groupModule, usesOcupacionalRules: false, moduloCreditoEfsrt: 2, unidadIds: ids.units, unidadCreditoById: new Map(), capacidades: capacities.map((id, i) => ({ id, unidadDidacticaId: ids.units[i === 2 ? 1 : 0] })), indicadores: indicators.map((id, i) => ({ id, capacidadTerminalId: capacities[i < 2 ? 0 : i - 1] })), moduloEstudiantes: [{ id: 2147483640, matriculaId: ids.students[0] }], notas: [nota(19)], efsrtPppPromedios: [] }, helpers));
    assert.deepEqual(await read('indicadoresCapacidadEstudiantes', `matriculaId:{eq:${ids.students[0]}}`, 'id indicadorCapacidadId promedio'), before, 'A failed save cannot leave partially updated grades');
    await graph(`query CreatedRegistroStudent($id:Int!){moduloEstudiante(id:$id){id matriculaId moduloId grupoId grupoModuloId promedio puntaje matricula{id codigoInscripcion user{id dni nombre apellidos apellidoPaterno apellidoMaterno username}}}}`, { id: modules[0] });
    console.log('Base local: guardado parcial real, promedios por capacidad/unidad/módulo, EFSRT, borrado de nota, aislamiento de estudiantes, validación y reversión atómica.');
  } finally {
    await graph(`mutation LocalPartialSaveCleanup($module:Int,$group:Int,$semester:Int,$students:[Int!]!,$units:[Int!]!) @transaction {
      unidadDidactica_deleteMany(where:{id:{in:$units}})
      grupo_deleteMany(where:{id:{eq:$group}})
      modulo_deleteMany(where:{id:{eq:$module}})
      matricula_deleteMany(where:{id:{in:$students}})
      semestre_deleteMany(where:{id:{eq:$semester}})
    }`, ids);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
