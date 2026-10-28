const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const mod = { exports: {} };
new Function('module', 'exports', ts.transpileModule(fs.readFileSync('src/lib/curricularUpdates.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText)(mod, mod.exports);
const { applyAcademicRemoval } = mod.exports;
const comp = { id: 10, nombre: 'UC1', tipo: 'TECNICA', moduloId: 1 };
const modules = [
  { id: 1, planId: 5, plan: { id: 5 }, planIds: [5], planModulos: [{ id: 50, planId: 5 }], competencias: [comp, { ...comp, id: 11 }],
    unidadesDidacticas: [{ id: 20, relacionId: 21, competenciaId: 10, competencia: comp, orden: 4,
      capacidadesTerminales: [{ id: 30, orden: 5, indicadoresCapacidad: [{ id: 40, orden: 6, aprendizajes: [{ id: 50,
        actividades: [{ id: 60, orden: 7, contenidos: [{ id: 80 }] }, { id: 61, orden: 9, contenidos: [] }] }] }, { id: 41, orden: 8, aprendizajes: [] }] }, { id: 31, orden: 8, indicadoresCapacidad: [] }] }] },
  { id: 2, competencias: [], unidadesDidacticas: [] },
];
const cases = [
  [{ entity: 'modulo', moduloId: 1, planId: 5 }, next => assert.deepEqual(next.map(row => row.id), [2])],
  [{ entity: 'competencia', competenciaId: 11 }, next => { assert.deepEqual(next[0].competencias.map(row => row.id), [10]); assert.equal(next[0].unidadesDidacticas, modules[0].unidadesDidacticas); }],
  [{ entity: 'unidadDidactica', relacionId: 21 }, next => assert.equal(next[0].unidadesDidacticas.length, 0)],
  [{ entity: 'capacidadTerminal', capacidadTerminalId: 30 }, next => assert.deepEqual(next[0].unidadesDidacticas[0].capacidadesTerminales.map(row => row.id), [31])],
  [{ entity: 'indicadorCapacidad', indicadorCapacidadId: 40 }, next => assert.deepEqual(next[0].unidadesDidacticas[0].capacidadesTerminales[0].indicadoresCapacidad.map(row => row.id), [41])],
  [{ entity: 'actividad', actividadId: 60 }, next => { const learning = next[0].unidadesDidacticas[0].capacidadesTerminales[0].indicadoresCapacidad[0].aprendizajes[0]; assert.equal(learning.id, 50); assert.deepEqual(learning.actividades.map(row => [row.id, row.orden]), [[61, 9]]); }],
];
for (const [removal, check] of cases) {
  const snapshot = structuredClone(modules);
  const next = applyAcademicRemoval(modules, removal, { id: 1 });
  check(next);
  assert.equal(next.at(-1), modules[1], 'Unrelated module keeps its reference');
  assert.deepEqual(modules, snapshot, 'Deletion must not mutate the original state');
}
assert.equal(applyAcademicRemoval(modules, { entity: 'actividad', actividadId: 999 }, { id: 999 }), modules);
const shared = structuredClone(modules);
shared[0].planModulos = [{ id: 50, planId: 5 }, { id: 60, planId: 6, orden: null }, { id: 70, planId: 7, orden: 1 }];
shared[0].planIds = [5, 6, 7];
const next = applyAcademicRemoval(shared, { entity: 'modulo', moduloId: 1, planId: 5 }, { id: 1 }, [{ id: 7, planEstudio: 'Otro plan' }]);
assert.equal(next[0].planId, 7, 'Primary plan follows the same ordering as the backend');
assert.equal(next[0].plan.planEstudio, 'Otro plan');
assert.deepEqual(next[0].planIds, [7, 6]);
assert.equal(next[0].unidadesDidacticas, shared[0].unidadesDidacticas, 'Shared module keeps its curricular content');
const changed = applyAcademicRemoval(modules, { entity: 'actividad', actividadId: 60 }, { id: 60,
  unitAssignments: [{ id: 21, unidadDidacticaId: 20, orden: 4, competenciaId: 11, competencia: { ...comp, id: 11 } }] });
assert.equal(changed[0].unidadesDidacticas[0].competenciaId, 11);
assert.equal(changed[0].unidadesDidacticas[0].capacidadesTerminales[0].indicadoresCapacidad[0].aprendizajes[0].actividades[0].id, 61);
console.log('Eliminacion: seis secciones, ramas intactas, orden conservado, modulos compartidos y clasificacion sincronizada: correctos.');
