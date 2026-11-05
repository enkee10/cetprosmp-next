const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
// Never use production credentials or endpoints for these destructive fixture tests.
process.env.DATA_CONNECT_EMULATOR_HOST = '127.0.0.1:9399';
process.env.GOOGLE_CLOUD_PROJECT = 'cetprosmp-2026';
const { dataConnect } = require('../functions/lib/modules/core/dataConnectCore.js');
const graph = async (query, variables = {}) => (await dataConnect.executeGraphql(query, { variables })).data;
const transpile = source => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function load(file) {
  const mod = { exports: {} };
  new Function('module', 'exports', 'require', transpile(fs.readFileSync(file, 'utf8')))(mod, mod.exports, name => {
    if (name === '../core/dataConnectCore.js') return { dataConnect };
    throw Error('Unexpected import: ' + name);
  });
  return mod.exports;
}
const frontend = load('src/lib/curricularGradeProtection.ts');
const protection = load('functions/src/modules/academico/curricularGradeProtection.ts');
class HttpsError extends Error { constructor(code, message) { super(message); this.code = code; } }
// Use the actual handlers with permissions mocked; every database operation is real and local.
const handlers = ts.createSourceFile('handlers.ts', fs.readFileSync('functions/src/modules/academico/handlers.ts', 'utf8'), ts.ScriptTarget.Latest, true);
const declarations = new Map();
function visit(node) {
  if (ts.isVariableDeclaration(node)) declarations.set(node.name.getText(handlers), node.initializer);
  ts.forEachChild(node, visit);
}
visit(handlers);
const dependencies = {
  requirePermission: async () => {}, parseEstructuraActionEntity: value => value,
  dataConnect, ...protection, toNumber: (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback,
  https: { HttpsError }, console: { error() {} },
  effectiveModuloId: row => row.competenciaContinuacion?.planModulo?.moduloId ?? row.competencia.moduloId,
  reconcileModuloUnits: async () => {}, readCurricularUnitAssignments: async () => [],
  sortPlanModuloRelations: items => items.slice().sort((a, b) => (a.orden ?? a.id) - (b.orden ?? b.id)),
};
for (const name of ['GET_ESTRUCTURA_MODULO_DETACH_QUERY', 'detachEstructuraModuloMutation']) {
  dependencies[name] = new Function(...Object.keys(dependencies), transpile(`const value=${declarations.get(name).getText(handlers)};`) + '\nreturn value;')(...Object.values(dependencies));
}
function handler(name) {
  const action = declarations.get(name).arguments[0].getText(handlers);
  return new Function(...Object.keys(dependencies), transpile(`const fn=${action};`) + '\nreturn fn;')(...Object.values(dependencies));
}
const detach = handler('detachEstructuraAcademicaItem');
const removeContinuation = handler('deleteEstructuraAcademicaCompetenciaContinuacion');
const ids = { modules: [], units: [], plan: null, matricula: null };
const insert = async (table, fields) => (await graph(`mutation LocalGradeProtectionInsert {item:${table}_insert(data:{${fields}})}`)).item.id;
const read = async (table, id, fields = '') => (await graph(`query LocalGradeProtectionRead {item:${table}(id:${id}) {id ${fields}}}`)).item;
(async () => {
  try {
    // Validate every nested filter against the actual schema before creating fixtures.
    const tables = { indicadorCapacidad: 'indicadoresCapacidad', capacidadTerminal: 'capacidadesTerminales', unidadDidactica: 'unidadesDidacticas', unidadRelation: 'competenciaUnidadesDidacticas', competencia: 'competencias', continuacion: 'competenciaContinuaciones', modulo: 'modulos' };
    for (const [entity, table] of Object.entries(tables)) await graph(`query ValidateGradeFilter {rows:${table}(where:{_and:[{id:{eq:-1}},{_not:${protection.curricularHasGradesFilter(entity)}}]},limit:1){id}}`);
    ids.plan = await insert('plan', 'planEstudio:"__local_grade_protection__"');
    ids.matricula = await insert('matricula', 'recibo:"__local_grade_protection__"');
    for (let i = 0; i < 2; i++) ids.modules.push(await insert('modulo', 'titulo:"__local_grade_protection__"'));
    const planModule = await insert('planModulo', `planId:${ids.plan},moduloId:${ids.modules[1]}`);
    const competency = await insert('competencia', `moduloId:${ids.modules[0]},nombre:"Original",tipo:TECNICA`);
    const continuation = await insert('competenciaContinuacion', `competenciaId:${competency},planModuloId:${planModule}`);
    const unit = await insert('unidadDidactica', 'nombre:"Unidad protegida"'); ids.units.push(unit);
    const relation = await insert('competenciaUnidadDidactica', `competenciaId:${competency},competenciaContinuacionId:${continuation},unidadDidacticaId:${unit}`);
    const capacity = await insert('capacidadTerminal', `unidadDidacticaId:${unit},descripcion:"Capacidad protegida"`);
    const indicator = await insert('indicadorCapacidad', `capacidadTerminalId:${capacity},descripcion:"Indicador protegido"`);
    const grade = await insert('indicadorCapacidadEstudiante', `matriculaId:${ids.matricula},indicadorCapacidadId:${indicator},promedio:0`);
    const emptyUnit = await insert('unidadDidactica', 'nombre:"Unidad vacía de la continuación"'); ids.units.push(emptyUnit);
    await insert('competenciaUnidadDidactica', `competenciaId:${competency},competenciaContinuacionId:${continuation},unidadDidacticaId:${emptyUnit}`);
    const usage = await protection.readCurricularGradeUsage();
    assert(usage.indicators.includes(indicator), 'A zero grade is saved and protected');
    assert(!usage.capacities.includes(capacity), 'Direct averages are distinct from descendant grades');
    const original = { id: competency, nombre: 'Original', tipo: 'TECNICA' };
    const modules = frontend.markCurricularGradeUsage([
      { id: ids.modules[0], competencias: [original], unidadesDidacticas: [] },
      { id: ids.modules[1], competencias: [{ ...original, esContinuacion: true, continuacionId: continuation }], unidadesDidacticas: [
        { id: unit, relacionId: relation, competenciaId: competency, competenciaContinuacionId: continuation, capacidadesTerminales: [
          { id: capacity, indicadoresCapacidad: [{ id: indicator }] },
        ] },
      ] },
    ], usage);
    const marked = frontend.withCurricularGradeProtection(modules);
    assert(marked[1].hasSavedGrades && marked[1].competencias[0].hasSavedGrades);
    assert(marked[0].competencias[0].hasSavedGradesInAnyModule);
    for (const [entity, id] of [['indicadorCapacidad', indicator], ['capacidadTerminal', capacity], ['unidadDidactica', unit], ['unidadRelation', relation], ['competencia', competency], ['continuacion', continuation]]) {
      const result = await graph(`query VerifyPositiveGradeFilter {rows:${tables[entity]}(where:{_and:[{id:{eq:${id}}},${protection.curricularHasGradesFilter(entity)}]}){id}}`);
      assert.equal(result.rows.length, 1, `${entity}: its actual saved grade must match the write filter`);
    }
    for (const [entity, id] of [['indicadorCapacidad', indicator], ['capacidadTerminal', capacity], ['unidadDidactica', unit], ['unidadRelation', relation], ['competencia', competency], ['continuacion', continuation], ['modulo', ids.modules[1]]]) {
      await assert.rejects(() => graph(`query VerifyGradeCheck {${protection.curricularGradeChecks(entity, id, [unit])}}`), error => /notas.*guardad/.test(error.message), `${entity}: a saved grade must block removal with the correct reason`);
    }
    for (const payload of [
      { entity: 'indicadorCapacidad', indicadorCapacidadId: indicator },
      { entity: 'capacidadTerminal', capacidadTerminalId: capacity },
      { entity: 'unidadDidactica', relacionId: relation },
    ]) {
      assert(frontend.curricularRemovalIsProtected(modules, payload));
      await assert.rejects(() => detach(payload, {}));
      assert.equal((await read('indicadorCapacidadEstudiante', grade, 'promedio')).promedio, 0, 'A blocked delete preserves the saved grade');
      assert(await read('indicadorCapacidad', indicator));
    }
    await assert.rejects(() => removeContinuation({ continuacionId: continuation }, {}));
    assert(await read('competenciaContinuacion', continuation));
    assert(await read('unidadDidactica', unit));
    assert(await read('unidadDidactica', emptyUnit), 'A blocked continuation deletion rolls back deletion of every empty sibling too');
    assert(await read('indicadorCapacidadEstudiante', grade));
    // An empty continuation is independent from grades in another branch of the same competency.
    const emptyContinuation = await insert('competenciaContinuacion', `competenciaId:${competency},planModuloId:${await insert('planModulo', `planId:${ids.plan},moduloId:${ids.modules[0]}`)}`);
    await removeContinuation({ continuacionId: emptyContinuation }, {});
    assert.equal(await read('competenciaContinuacion', emptyContinuation), null);
    assert(await read('indicadorCapacidadEstudiante', grade));
    await assert.rejects(() => detach({ entity: 'modulo', moduloId: ids.modules[1], planId: ids.plan, relacionId: planModule }, {}));
    assert(await read('planModulo', planModule), 'A blocked module detachment preserves the continuation path');
    assert(await read('competenciaContinuacion', continuation));
    assert(await read('indicadorCapacidadEstudiante', grade));
    // Empty descendants remain removable even when a parent has an independently stored average.
    const emptyIndicator = await insert('indicadorCapacidad', `capacidadTerminalId:${capacity},descripcion:"Vacío"`);
    await insert('capacidadTerminalEstudiante', `matriculaId:${ids.matricula},capacidadTerminalId:${capacity},promedio:0`);
    await detach({ entity: 'indicadorCapacidad', indicadorCapacidadId: emptyIndicator }, {});
    assert.equal(await read('indicadorCapacidad', emptyIndicator), null);
    await graph(`mutation LocalGradeProtectionNullIndicator {indicadorCapacidadEstudiante_update(id:${grade},data:{promedio:null})}`);
    await assert.rejects(() => detach({ entity: 'capacidadTerminal', capacidadTerminalId: capacity }, {}));
    assert(await read('capacidadTerminal', capacity), 'A capacity average alone protects the capacity');
    await insert('unidadDidacticaEstudiante', `matriculaId:${ids.matricula},unidadDidacticaId:${unit},promedio:0`);
    await graph(`mutation LocalGradeProtectionClearCapacity {capacidadTerminalEstudiante_deleteMany(where:{capacidadTerminalId:{eq:${capacity}}})}`);
    await assert.rejects(() => detach({ entity: 'unidadDidactica', relacionId: relation }, {}));
    assert(await read('competenciaUnidadDidactica', relation), 'A unit average alone protects its assignment');
    // Successful deletion checks the same real SQL paths used for protected elements.
    await detach({ entity: 'capacidadTerminal', capacidadTerminalId: capacity }, {});
    assert.equal(await read('capacidadTerminal', capacity), null);
    await graph(`mutation LocalGradeProtectionClearUnit {unidadDidacticaEstudiante_deleteMany(where:{unidadDidacticaId:{eq:${unit}}})}`);
    await detach({ entity: 'unidadDidactica', relacionId: relation }, {});
    assert.equal(await read('competenciaUnidadDidactica', relation), null);
    await detach({ entity: 'modulo', moduloId: ids.modules[1], planId: ids.plan, relacionId: planModule }, {});
    assert.equal(await read('planModulo', planModule), null);
    // A child moved to another module must no longer protect its old module.
    const moved = frontend.withCurricularGradeProtection([{ ...modules[0], unidadesDidacticas: modules[1].unidadesDidacticas }, { ...modules[1], unidadesDidacticas: [] }]);
    assert(moved[0].hasSavedGrades && !moved[1].hasSavedGrades);
    console.log('Base local: filtros válidos, nota cero, bloqueo atómico de indicador/capacidad/unidad/continuación, notas preservadas, borrado vacío permitido y protección tras traslado.');
  } finally {
    await graph(`mutation LocalGradeProtectionCleanup($modules:[Int!]!,$units:[Int!]!,$plan:Int,$matricula:Int) @transaction {
      unidadDidactica_deleteMany(where:{id:{in:$units}})
      modulo_deleteMany(where:{id:{in:$modules}})
      plan_deleteMany(where:{id:{eq:$plan}})
      matricula_deleteMany(where:{id:{eq:$matricula}})
    }`, { modules: ids.modules, units: ids.units, plan: ids.plan, matricula: ids.matricula });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
