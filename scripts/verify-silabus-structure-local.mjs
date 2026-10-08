import assert from 'node:assert/strict';
import { query, stateQuery } from './import-silabus.mjs';
import { missingStructure, structureMutation, assertPreserved } from './silabus-structure.mjs';

assert.ok(!process.argv.includes('--production'), 'Esta prueba solo usa el emulador');
const fixture = await query(`mutation StructureFixture {modulo_insert(data:{titulo:"Silabus estructura test",horas:528})}`);
const moduloId = fixture.modulo_insert.id;
const rows = [
  { module: 'Test', unit: '1. TECNICA', capacity: 'UC1 C1 Capacidad', indicator: 'C1.I1 Indicador', unitHours: 32, unitCredits: 1 },
  { module: 'Test', unit: 'PLAN DE NEGOCIOS', capacity: 'CE3 C1 Negocios', indicator: 'C1.I1 Negocio', unitHours: null, unitCredits: 2 },
  { module: 'Test', unit: 'ETICA', capacity: 'CE4 C1 Etica', indicator: 'C1.I1 Etica', unitHours: 48, unitCredits: 2 },
];
const mappings = [{ type: 'modulo', id: moduloId, excel: 'Test' }];
const sourceState = state => ({ ...state, modulos: state.modulos.map(v => v.id === moduloId ? { ...v, plan: { carrera: { tipoCarrera: { nombre: 'Programa de estudio' } } } } : v) });
const contextQuery = `query TestStructureContext {competencias(limit:10000){id nombre tipo moduloId} modulos(limit:10000){id horas}}`;
const deletes = { competencias: 'competencia_delete', unidadesDidacticas: 'unidadDidactica_delete', capacidadesTerminales: 'capacidadTerminal_delete', indicadoresCapacidad: 'indicadorCapacidad_delete', competenciaUnidadesDidacticas: 'competenciaUnidadDidactica_delete' };
let cleanup = [];
try {
  const before = await query(stateQuery), context = await query(contextQuery);
  const structure = missingStructure(rows, mappings, sourceState(before), context, [moduloId]);
  const mutation = structureMutation(structure.additions);
  const invalid = structuredClone(mutation.variables);
  const competence = Object.values(invalid).find(v => v && typeof v === 'object' && v.moduloId === moduloId);
  competence.moduloId = -1000000;
  await assert.rejects(() => query(mutation.source, invalid));
  assertPreserved(before, await query(stateQuery));
  assert.equal((await query(stateQuery)).unidadesDidacticas.length, before.unidadesDidacticas.length, 'Rollback de toda la estructura');
  const result = await query(mutation.source, mutation.variables);
  cleanup = structure.additions.map(v => ({ table: v.table, id: result[mutation.aliases.get(v.record.id)].id }));
  const after = await query(stateQuery), afterContext = await query(contextQuery);
  assertPreserved(before, after);
  const repeated = missingStructure(rows, mappings, sourceState(after), afterContext, [moduloId]);
  assert.equal(repeated.additions.length, 0);
  assert.equal(after.unidadesDidacticas.find(v => v.nombre === '1. TECNICA')?.duracion, 32);
  assert.equal(after.unidadesDidacticas.find(v => v.nombre === 'PLAN DE NEGOCIOS')?.duracion, null);
  assert.ok(after.capacidadesTerminales.some(v => v.descripcion === 'UC1 C1 Capacidad'));
  assert.ok(after.indicadoresCapacidad.some(v => v.descripcion === 'C1.I1 Indicador'));
  assert.deepEqual(afterContext.competencias.filter(v => v.moduloId === moduloId).map(v => v.tipo).sort(), ['EMPLEABILIDAD', 'TECNICA']);
  console.log('Emulador: transaccion real, rollback, textos, relaciones y repeticion sin duplicados verificados.');
} finally {
  for (const [index, item] of cleanup.reverse().entries()) await query(`mutation CleanupStructure${index} {${deletes[item.table]}(id:${item.id})}`);
  await query(`mutation CleanupStructureModule {modulo_delete(id:${moduloId})}`);
}
