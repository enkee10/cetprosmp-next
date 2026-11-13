// Unifica C3I3 (373) en C3I2 (372), conservando notas y promedios.
// Uso: node scripts/unificar-indicador-panaderia.cjs [--apply]
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { initializeApp, cert } = require('firebase-admin/app');
const { getDataConnect } = require('firebase-admin/data-connect');

assert(!process.env.DATA_CONNECT_EMULATOR_HOST && !process.env.FIREBASE_DATA_CONNECT_EMULATOR_HOST,
  'Esta correccion corresponde a los datos remotos, no al emulador.');
const projectId = 'cetprosmp-2026';
const serviceId = 'cetprosmp-2026-service';
const keepId = 372;
const duplicateId = 373;
const root = path.resolve(__dirname, '..');
const env = fs.readFileSync(path.join(root, '.env.local'), 'utf8');
const match = env.match(/GOOGLE_APPLICATION_CREDENTIALS_JSON\s*=\s*'([\s\S]*?)'/);
const credential = match ? JSON.parse(match[1]) : null;
if (credential) assert.equal(credential.project_id, projectId);
const db = getDataConnect({ serviceId, location: 'us-central1' }, initializeApp({
  projectId, ...(credential ? { credential: cert(credential) } : {}),
}));
const graph = async (query, variables = {}) => (await db.executeGraphql(query, { variables })).data;
const stateQuery = `query PanaderiaDuplicateState {
  indicadores: indicadoresCapacidad(where:{capacidadTerminalId:{eq:148}},limit:50000,orderBy:{id:ASC}) {
    id descripcion sigla orden capacidadTerminalId
  }
  notas: indicadoresCapacidadEstudiantes(where:{indicadorCapacidad:{capacidadTerminalId:{eq:148}}},limit:50000,orderBy:{id:ASC}) {
    id matriculaId indicadorCapacidadId promedio matricula{semestreId}
  }
  aprendizajes(where:{indicadorCapacidadId:{in:[372,373]}},limit:50000,orderBy:{id:ASC}) {
    id descripcion sigla orden indicadorCapacidadId
  }
  actividades: actividads(where:{aprendizaje:{indicadorCapacidadId:{in:[372,373]}}},limit:50000,orderBy:{id:ASC}) {
    id aprendizajeId moduloId nombre numeroSesion orden descripcion
  }
  contenidos: indicadorContenidos(where:{indicadorCapacidadId:{in:[372,373]}},limit:50000,orderBy:{id:ASC}) {
    id texto orden contenidoPadreId indicadorCapacidadId
  }
  evaluaciones: evaluacions(where:{indicadorCapacidadId:{in:[372,373]}},limit:50000,orderBy:{id:ASC}) {
    id instrumento actividadId indicadorCapacidadId metodoId tecnicaId
  }
  planes: planSemestres(limit:50000,orderBy:{id:ASC}) {
    id planId semestreId seleccion revision actualizadoEn
  }
  promediosCapacidad: capacidadesTerminalesEstudiantes(where:{capacidadTerminalId:{eq:148}},limit:50000,orderBy:{id:ASC}) {
    id matriculaId capacidadTerminalId promedio
  }
  promediosUnidad: unidadesDidacticasEstudiantes(where:{unidadDidacticaId:{eq:126}},limit:50000,orderBy:{id:ASC}) {
    id matriculaId unidadDidacticaId promedio
  }
  promediosModulo: modulosEstudiantes(where:{moduloId:{eq:26}},limit:50000,orderBy:{id:ASC}) {
    id matriculaId moduloId grupoModuloId grupoId promedio puntaje
  }
  relaciones: competenciaUnidadesDidacticas(where:{unidadDidacticaId:{eq:126}},limit:50000,orderBy:{id:ASC}) {
    id unidadDidacticaId competenciaId competencia{moduloId nombre}
  }
}`;

async function main() {
  const apply = process.argv.includes('--apply');
  const before = await graph(stateQuery);
  for (const rows of Object.values(before)) assert(rows.length < 50000, 'Revisar paginacion.');
  const keep = before.indicadores.find(row => row.id === keepId);
  const duplicate = before.indicadores.find(row => row.id === duplicateId);
  assert(keep && duplicate, 'Deben existir ambos indicadores antes de aplicar la correccion.');
  assert.equal(keep.descripcion, duplicate.descripcion);
  assert.equal(keep.orden, 2);
  assert.equal(duplicate.orden, 3);
  assert.equal(before.relaciones[0]?.competencia.moduloId, 26);
  assert.equal(before.contenidos.length, 0, 'Hay contenidos que requieren revisar su traslado.');
  assert.equal(before.evaluaciones.length, 0, 'Hay evaluaciones que requieren revisar su traslado.');
  const duplicates = before.notas.filter(row => row.indicadorCapacidadId === duplicateId);
  const retained = before.notas.filter(row => row.indicadorCapacidadId === keepId);
  assert.equal(duplicates.length, 15);
  assert.equal(retained.length, 31);
  for (const row of duplicates) {
    const target = retained.find(item => item.matriculaId === row.matriculaId);
    assert(target && target.promedio === row.promedio,
      `Las notas de la matricula ${row.matriculaId} requieren una decision.`);
  }
  const plans = before.planes.filter(row => row.seleccion.indicadorIds.includes(duplicateId));
  const learnings = before.aprendizajes.filter(row => row.indicadorCapacidadId === duplicateId);
  console.log(JSON.stringify({ apply, projectId, moduloId: 26, conserva: keepId, elimina: duplicateId,
    notasConservadas: retained.length, copiasIdenticas: duplicates.length,
    semestresConNotas: [...new Set([...retained, ...duplicates].map(row => row.matricula.semestreId))],
    planesPorActualizar: plans.length, aprendizajesPorTrasladar: learnings.length,
  }, null, 2));
  if (!apply) return;

  const directory = path.join(root, 'backups', `unificar-indicador-panaderia-${Date.now()}`);
  fs.mkdirSync(directory, { recursive: true });
  const save = (name, value) => fs.writeFileSync(path.join(directory, name), JSON.stringify(value, null, 2), { flag: 'wx' });
  save('before.json', { projectId, serviceId, capturedAt: new Date().toISOString(), data: before });
  const checks = [];
  const changes = [];
  const variables = {};
  const definitions = [];
  const check = (alias, table, where, count) => checks.push(
    `${alias}:${table}(where:${where},limit:50000) @check(expr:"this.size() == ${count}"){id}`);
  checks.push(`matchingGrades:indicadoresCapacidadEstudiantes(where:{indicadorCapacidadId:{in:[372,373]}},limit:50000)
    @check(expr:"this.size() == ${retained.length + duplicates.length} && this.filter(r, r.indicadorCapacidadId == 373).size() == ${duplicates.length} && this.filter(r, r.indicadorCapacidadId == 373).all(s, this.exists(t, t.indicadorCapacidadId == 372 && t.matriculaId == s.matriculaId && t.promedio == s.promedio))")
    {id matriculaId indicadorCapacidadId promedio}`);
  check('sourceLearningCount', 'aprendizajes', '{indicadorCapacidadId:{eq:373}}', learnings.length);
  check('noEvaluations', 'evaluacions', '{indicadorCapacidadId:{in:[372,373]}}', 0);
  check('noContents', 'indicadorContenidos', '{indicadorCapacidadId:{in:[372,373]}}', 0);
  for (const indicator of [keep, duplicate]) {
    check(`indicator${indicator.id}`, 'indicadoresCapacidad',
      `{id:{eq:${indicator.id}},capacidadTerminalId:{eq:148},orden:{eq:${indicator.orden}},descripcion:{eq:${JSON.stringify(indicator.descripcion)}}}`, 1);
  }
  for (const row of learnings) {
    check(`learning${row.id}`, 'aprendizajes', `{id:{eq:${row.id}},indicadorCapacidadId:{eq:373}}`, 1);
    changes.push(`move${row.id}:aprendizaje_update(id:${row.id},data:{indicadorCapacidadId:372}) @check(expr:"this != null")`);
  }
  for (const row of plans) {
    check(`plan${row.id}`, 'planSemestres', `{id:{eq:${row.id}},revision:{eq:${row.revision}}}`, 1);
    const selection = { ...row.seleccion, indicadorIds: [...new Set(row.seleccion.indicadorIds.map(id => id === duplicateId ? keepId : id))] };
    definitions.push(`$selection${row.id}:Any!`);
    variables[`selection${row.id}`] = selection;
    changes.push(`updatePlan${row.id}:planSemestre_update(id:${row.id},data:{seleccion:$selection${row.id},revision:${row.revision + 1},actualizadoEn_expr:"request.time"}) @check(expr:"this != null")`);
  }
  changes.push(`deleteGrades:indicadorCapacidadEstudiante_deleteMany(where:{indicadorCapacidadId:{eq:373}}) @check(expr:"this == ${duplicates.length}")`);
  changes.push('deleteIndicator:indicadorCapacidad_delete(id:373) @check(expr:"this != null")');
  const mutation = `mutation MergePanaderiaIndicator(${definitions.join(',')}) @transaction {
    query { ${checks.join('\n')} }
    ${changes.join('\n')}
  }`;
  save('mutation.json', { mutation, variables });
  await graph(mutation, variables);
  const after = await graph(stateQuery);
  save('after.json', { projectId, serviceId, capturedAt: new Date().toISOString(), data: after });
  assert.deepEqual(after.indicadores, before.indicadores.filter(row => row.id !== duplicateId));
  assert.deepEqual(after.notas, before.notas.filter(row => row.indicadorCapacidadId !== duplicateId));
  assert.deepEqual(after.aprendizajes, before.aprendizajes.map(row => ({
    ...row, indicadorCapacidadId: row.indicadorCapacidadId === duplicateId ? keepId : row.indicadorCapacidadId,
  })));
  for (const key of ['actividades', 'contenidos', 'evaluaciones', 'promediosCapacidad', 'promediosUnidad', 'promediosModulo', 'relaciones']) {
    assert.deepEqual(after[key], before[key], `${key} debe conservarse.`);
  }
  for (const row of after.planes) {
    const original = before.planes.find(item => item.id === row.id);
    if (!plans.some(item => item.id === row.id)) { assert.deepEqual(row, original); continue; }
    assert.deepEqual(row.seleccion, { ...original.seleccion,
      indicadorIds: [...new Set(original.seleccion.indicadorIds.map(id => id === duplicateId ? keepId : id))],
    });
    assert.equal(row.revision, original.revision + 1);
  }
  const verification = { verified: true, notasConservadas: retained.length,
    copiasEliminadas: duplicates.length, indicadoresEliminados: 1,
    promediosConservados: true, planesActualizados: plans.length, backup: directory };
  save('verification.json', verification);
  console.log(JSON.stringify(verification, null, 2));
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
