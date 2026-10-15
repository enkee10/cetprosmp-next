// Corrige la importación del sílabo del módulo 31 sin modificar notas de estudiantes.
// Uso: node scripts/redistribuir-indicadores-carpinteria.cjs [--apply]
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');

const requireFunctions = createRequire(path.resolve('functions/package.json'));
const { initializeApp } = requireFunctions('firebase-admin/app');
const { getDataConnect } = requireFunctions('firebase-admin/data-connect');
if (process.env.DATA_CONNECT_EMULATOR_HOST || process.env.FIREBASE_DATA_CONNECT_EMULATOR_HOST) {
  throw new Error('Hay variables de emulador activas. Este script revisa el proyecto remoto.');
}

const apply = process.argv.includes('--apply');
const db = getDataConnect(
  { serviceId: 'cetprosmp-2026-service', location: 'us-central1' },
  initializeApp({ projectId: 'cetprosmp-2026' }),
);
const originalIds = [52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 464, 465];
const importedIds = Array.from({ length: 25 }, (_, index) => 466 + index);
// La programación de cada unidad contiene dos criterios de evaluación. Las
// sesiones se asignan por el trabajo evaluado, no por el indicador textual
// distinto que aparecía en cada fila del sílabo.
const targetBySession = [
  52, 52, 53, 53, 52, 52, 53, 53, // Taller, herramientas y materiales
  54, 54, 54, 55, 55, 55,         // Gabinete de baño: habilitación / armado
  56, 56, 56, 57, 57, 57,         // Puertas interiores / exteriores
  58, 58, 59, 59, 59, 59,         // Mesa de noche: habilitación / armado
  60, 60, 61, 61,                 // Estante: habilitación / armado
  464, 464, 464, 465, 465,       // Negocio viable / promoción
];
assert.equal(targetBySession.length, 35);

const stateQuery = `query CarpinteriaIndicatorState($allIds:[Int!]!,$importedIds:[Int!]!) {
  modulo(id:31) { id titulo }
  actividades: actividads(where:{moduloId:{eq:31}},limit:100,orderBy:{numeroSesion:ASC}) {
    id numeroSesion nombre descripcion aprendizajeId
    aprendizaje { indicadorCapacidadId }
  }
  indicadores: indicadoresCapacidad(where:{id:{in:$allIds}},limit:100) {
    id descripcion capacidadTerminal { unidadDidacticaId }
  }
  aprendizajes(where:{indicadorCapacidadId:{in:$allIds}},limit:100) {
    id indicadorCapacidadId descripcion
  }
  notas: indicadoresCapacidadEstudiantes(where:{indicadorCapacidadId:{in:$allIds}},limit:10000) {
    id matriculaId indicadorCapacidadId promedio
  }
  evaluaciones: evaluacions(where:{indicadorCapacidadId:{in:$importedIds}},limit:1000) {
    id indicadorCapacidadId actividadId
  }
}`;
const variables = { allIds: [...originalIds, ...importedIds], importedIds };
const graph = async (source, vars = {}) => (await db.executeGraphql(source, { variables: vars })).data;
const originalSet = new Set(originalIds);
const importedSet = new Set(importedIds);
const unitBySession = [
  ...Array(8).fill(17), ...Array(6).fill(18), ...Array(6).fill(19),
  ...Array(6).fill(20), ...Array(4).fill(21), ...Array(5).fill(151),
];
const grades = rows => rows.map(row => ({
  id: row.id, matriculaId: row.matriculaId, indicadorCapacidadId: row.indicadorCapacidadId,
  promedio: row.promedio,
})).sort((a, b) => a.id - b.id);

function plan(state) {
  assert.equal(state.modulo?.id, 31);
  assert.equal(state.actividades.length, 35);
  assert([originalIds.length, originalIds.length + importedIds.length].includes(state.indicadores.length));
  assert(originalIds.every(id => state.indicadores.some(row => row.id === id)));
  assert.equal(state.evaluaciones.length, 0, 'Hay evaluaciones asociadas a indicadores nuevos.');
  assert(state.notas.every(row => originalSet.has(row.indicadorCapacidadId)),
    'Hay notas asociadas a indicadores nuevos.');
  const indicators = new Map(state.indicadores.map(row => [row.id, row]));
  const learningById = new Map(state.aprendizajes.map(row => [row.id, row]));
  assert.equal(new Set(state.actividades.map(row => row.aprendizajeId)).size, 35);
  const changes = state.actividades.map((activity, index) => {
    assert.equal(activity.numeroSesion, index + 1);
    const learning = learningById.get(activity.aprendizajeId);
    assert(learning);
    assert.equal(learning.indicadorCapacidadId, activity.aprendizaje.indicadorCapacidadId);
    const target = targetBySession[index];
    assert(originalSet.has(target));
    assert.equal(indicators.get(target)?.capacidadTerminal.unidadDidacticaId, unitBySession[index]);
    const source = indicators.get(learning.indicadorCapacidadId);
    assert(source);
    assert.equal(source.capacidadTerminal.unidadDidacticaId, unitBySession[index]);
    assert(importedSet.has(source.id) || source.id === target);
    const description = importedSet.has(source.id)
      ? `Indicador de la sesión: ${source.descripcion}`
      : activity.descripcion;
    assert(!activity.descripcion || activity.descripcion === description,
      `La descripción de la sesión ${activity.numeroSesion} fue editada.`);
    return { activity, learning, target, description };
  }).filter(row => row.learning.indicadorCapacidadId !== row.target);
  return { changes, indicators };
}

async function main() {
  const before = await graph(stateQuery, variables);
  const work = plan(before);
  console.log(JSON.stringify({
    apply, modulo: before.modulo.titulo, sesiones: before.actividades.length,
    indicadoresOriginales: originalIds.length,
    indicadoresImportados: before.indicadores.filter(row => importedSet.has(row.id)).length,
    aprendizajesPorMover: work.changes.length,
    notasQueSeConservan: before.notas.length,
    distribucion: Object.fromEntries(originalIds.map(id => [id, targetBySession.filter(value => value === id).length])),
  }, null, 2));
  if (!apply) return;

  const backupDir = path.resolve('backups/redistribuir-indicadores-carpinteria-20261014');
  fs.mkdirSync(backupDir, { recursive: true });
  const backupFile = path.join(backupDir, `before-${Date.now()}.json`);
  fs.writeFileSync(backupFile, JSON.stringify({ capturedAt: new Date().toISOString(), data: before }, null, 2), { flag: 'wx' });
  console.log(`Respaldo de filas: ${backupFile}`);

  for (let offset = 0; offset < work.changes.length; offset += 5) {
    const chunk = work.changes.slice(offset, offset + 5);
    const defs = [];
    const vars = {};
    const fields = [];
    chunk.forEach((row, index) => {
      defs.push(`$description${index}:String!`);
      vars[`description${index}`] = row.description;
      fields.push(`learning${index}:aprendizaje_update(id:${row.learning.id},data:{
        indicadorCapacidadId:${row.target}
      }) @check(expr:"this != null")`);
      fields.push(`activity${index}:actividad_update(id:${row.activity.id},data:{
        descripcion:$description${index}
      }) @check(expr:"this != null")`);
    });
    await graph(`mutation RedistribuirCarpinteria(${defs.join(',')}) @transaction {
      ${fields.join('\n')}
    }`, vars);
    console.log(`Aprendizajes corregidos: ${Math.min(offset + 5, work.changes.length)}/${work.changes.length}`);
  }

  const moved = await graph(stateQuery, variables);
  assert.equal(plan(moved).changes.length, 0);
  assert.deepEqual(grades(moved.notas), grades(before.notas));
  assert(moved.aprendizajes.every(row => !importedSet.has(row.indicadorCapacidadId)));
  assert.equal(moved.evaluaciones.length, 0);
  if (moved.indicadores.length > originalIds.length) {
    assert.equal(moved.indicadores.length, originalIds.length + importedIds.length);
    await graph(`mutation EliminarIndicadoresDuplicados @transaction {
      ${importedIds.map(id => `i${id}:indicadorCapacidad_delete(id:${id}) @check(expr:"this != null")`).join('\n')}
    }`);
    console.log(`Indicadores adicionales eliminados: ${importedIds.length}`);
  }

  const after = await graph(stateQuery, variables);
  assert.equal(after.indicadores.length, 12);
  assert.equal(after.actividades.length, 35);
  assert.equal(after.aprendizajes.length, 35);
  assert(after.actividades.every((activity, index) =>
    activity.aprendizaje.indicadorCapacidadId === targetBySession[index]));
  assert(after.actividades.every(activity => activity.descripcion?.startsWith('Indicador de la sesión: ')));
  assert.deepEqual(grades(after.notas), grades(before.notas));
  console.log(JSON.stringify({
    verified: true, indicadores: after.indicadores.length,
    sesiones: after.actividades.length, notasConservadas: after.notas.length,
  }, null, 2));
}

main().catch(error => { console.error(error); process.exitCode = 1; });
