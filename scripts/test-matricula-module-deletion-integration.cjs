const assert = require('node:assert/strict');
const path = require('node:path');
const requireFunctions = require('node:module').createRequire(path.resolve(__dirname, '../functions/package.json'));
const { initializeApp } = requireFunctions('firebase-admin/app');
const { getDataConnect } = requireFunctions('firebase-admin/data-connect');

// This test is restricted to a disposable demo project and a dedicated emulator port.
assert.equal(process.env.GCLOUD_PROJECT, 'demo-cetpro-module-test');
assert.equal(process.env.DATA_CONNECT_EMULATOR_HOST, '127.0.0.1:9398');
initializeApp({ projectId: 'demo-cetpro-module-test' });
const dc = getDataConnect({ serviceId: 'cetprosmp-2026-service', location: 'us-central1', connector: 'default' });
const { deleteMatriculaModulo } = require('../functions/lib/modules/core/matriculaModuloDeletion.js');
const { DELETE_MODULO_ESTUDIANTES_BY_MATRICULA_MUTATION } = require('../functions/lib/dataconnectOperations.js');
async function insert(type, data) {
  const result = await dc.executeGraphql(`mutation Seed($data:${type}_Data! @allow(fields:"${Object.keys(data).join(' ')}")){row:${type[0].toLowerCase() + type.slice(1)}_insert(data:$data)}`, { variables: { data } });
  return result.data.row.id;
}
const query = async () => (await dc.executeGraphql(`query VerifyIndependentModules {
  matriculas {id}
  modulosEstudiantes {id matriculaId grupoModuloId promedio}
  efsrtPppEstudiantes {id moduloEstudianteId promedioFinal}
  unidadesDidacticasEstudiantes {id matriculaId promedio}
  users {id}
}`)).data;

(async () => {
  const user = await insert('User', { nombre: 'Prueba aislada' });
  const group = await insert('Grupo', { nombreDisplay: 'Grupo de prueba' });
  const moduleA = await insert('Modulo', { titulo: 'Módulo A' });
  const moduleB = await insert('Modulo', { titulo: 'Módulo B' });
  const ga = await insert('GrupoModulo', { grupoId: group, moduloId: moduleA, instancia: 1 });
  const gb = await insert('GrupoModulo', { grupoId: group, moduloId: moduleB, instancia: 1 });
  const enrollment = await insert('Matricula', { userId: user, grupoId: group });
  const otherEnrollment = await insert('Matricula', { userId: user, grupoId: group });
  const a = await insert('ModuloEstudiante', { matriculaId: enrollment, grupoId: group, grupoModuloId: ga, moduloId: moduleA, promedio: 12 });
  const b = await insert('ModuloEstudiante', { matriculaId: enrollment, grupoId: group, grupoModuloId: gb, moduloId: moduleB, promedio: 18 });
  const otherA = await insert('ModuloEstudiante', { matriculaId: otherEnrollment, grupoId: group, grupoModuloId: ga, moduloId: moduleA, promedio: 17 });
  await insert('EfsrtPppEstudiante', { moduloEstudianteId: a, grupoModuloId: ga, promedioFinal: 12 });
  await insert('EfsrtPppEstudiante', { moduloEstudianteId: b, grupoModuloId: gb, promedioFinal: 19 });
  const unit = await insert('UnidadDidactica', { nombre: 'Unidad B' });
  await insert('UnidadDidacticaEstudiante', { matriculaId: enrollment, unidadDidacticaId: unit, promedio: 18 });
  const removed = await deleteMatriculaModulo(ga, a, enrollment);
  assert.equal(removed.matriculaDeleted, false);
  let state = await query();
  assert.ok(!state.modulosEstudiantes.some(row => row.id === a));
  assert.equal(state.modulosEstudiantes.find(row => row.id === b).promedio, 18);
  assert.equal(state.efsrtPppEstudiantes.find(row => row.moduloEstudianteId === b).promedioFinal, 19);
  assert.equal(state.unidadesDidacticasEstudiantes[0].promedio, 18);
  assert.ok(state.modulosEstudiantes.some(row => row.id === otherA));
  assert.ok(state.matriculas.some(row => row.id === enrollment));
  const last = await deleteMatriculaModulo(gb, b, enrollment);
  assert.equal(last.matriculaDeleted, true);
  state = await query();
  assert.ok(!state.matriculas.some(row => row.id === enrollment));
  assert.equal(state.unidadesDidacticasEstudiantes.length, 0);
  assert.ok(state.matriculas.some(row => row.id === otherEnrollment));
  assert.equal(state.users.length, 1, 'Removing enrollments never deletes the student');
  // Group replacement also removes dependent practice rows without FK failures.
  await insert('EfsrtPppEstudiante', { moduloEstudianteId: otherA, grupoModuloId: ga, promedioFinal: 17 });
  await dc.executeGraphql(DELETE_MODULO_ESTUDIANTES_BY_MATRICULA_MUTATION, { variables: { matriculaId: otherEnrollment } });
  state = await query();
  assert.equal(state.modulosEstudiantes.length, 0);
  assert.equal(state.efsrtPppEstudiantes.length, 0);
  assert.equal(state.matriculas.length, 1, 'Group replacement retains the parent enrollment');
  console.log('Passed against isolated SQL Connect: partial removal, preserved sibling/practice/unit grades, final-parent cleanup, preserved user and FK-safe group replacement.');
})().catch(error => { console.error(error); process.exitCode = 1; });
