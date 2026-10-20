const assert = require('node:assert/strict');
const path = require('node:path');
const requireFunctions = require('node:module').createRequire(path.resolve(__dirname, '../functions/package.json'));
assert.equal(process.env.GCLOUD_PROJECT, 'demo-cetpro-semestre-test');
assert.equal(process.env.DATA_CONNECT_EMULATOR_HOST, '127.0.0.1:9398');
const { initializeApp } = requireFunctions('firebase-admin/app');
const { getDataConnect } = requireFunctions('firebase-admin/data-connect');
initializeApp({ projectId: 'demo-cetpro-semestre-test' });
const dc = getDataConnect({ serviceId: 'cetprosmp-2026-service', location: 'us-central1', connector: 'default' });
const { loadCurrentDocenteModulos, listDocenteMenuModulos } = require('../functions/lib/modules/core/docenteSemester.js');
const { listMatriculaDocenteGrupos, listMatriculas } = require('../functions/lib/modules/matriculas/handlers.js');
const { listRegistroAuxiliarDocenteModulos, getRegistroAuxiliar } = require('../functions/lib/modules/registro-auxiliar/handlers.js');
const { getAppSettings } = require('../functions/lib/modules/settings/handlers.js');
const coreDc = require('../functions/lib/modules/core/dataConnectCore.js').dataConnect;
const executedQueries = [];
const execute = coreDc.executeGraphql.bind(coreDc);
coreDc.executeGraphql = (query, ...args) => { executedQueries.push(query); return execute(query, ...args); };
async function insert(type, data) {
  const result = await dc.executeGraphql(`mutation Seed($data:${type}_Data! @allow(fields:"${Object.keys(data).join(' ')}")){
    row:${type[0].toLowerCase() + type.slice(1)}_insert(data:$data)
  }`, { variables: { data } });
  return result.data.row.id;
}

(async () => {
  const suffix = String(Date.now());
  // The disposable emulator is the only allowed target. An explicit ID matches teacher claims.
  await dc.executeGraphql('mutation SeedRole { rol_upsert(data:{id:4,titulo:"Docente",scala:100}) }');
  for (const entity of ['matriculas', 'registro-auxiliar', 'estructura-academica']) {
    await dc.executeGraphql(`mutation CleanPermission {rolePermission_deleteMany(where:{roleId:{eq:4},entity:{eq:"${entity}"}})}`);
    await insert('RolePermission', { roleId: 4, entity, canView: true });
  }
  const uid = `teacher-a-${suffix}`;
  const userA = await insert('User', { documentId: uid, rolId: 4, username: 'Richard Ramos Ipanaque', apellidoPaterno: 'Ramos' });
  const userB = await insert('User', { documentId: `teacher-b-${suffix}`, rolId: 4 });
  const teacherA = await insert('Personal', { userId: userA });
  const teacherB = await insert('Personal', { userId: userB });
  const previous = await insert('Semestre', { titulo: '2026-1' });
  const current = await insert('Semestre', { titulo: '2026-2' });
  await dc.executeGraphql('mutation CleanSemesterSettings { appSetting_deleteMany(where:{settingKey:{in:["general.semestreActualId","formularioMatricula.semestreId"]}}) }');
  const settingId = await insert('AppSetting', { settingKey: 'general.semestreActualId', intValue: current });
  await insert('AppSetting', { settingKey: 'formularioMatricula.semestreId', intValue: previous });
  const moduleId = await insert('Modulo', { titulo: 'Carpintería' });
  async function group(semestreId, personalId, archivado = false) {
    const grupoId = await insert('Grupo', { semestreId, personalId, archivado });
    return insert('GrupoModulo', { grupoId, moduloId: moduleId, instancia: 1,
      nombre: 'Carpintería (oct-dic) [Noche] Lun, Mie, @Vie (Richard Ramos)' });
  }
  const currentA = await group(current, teacherA);
  const oldA = await group(previous, teacherA);
  const currentB = await group(current, teacherB);
  await group(current, teacherA, true);
  const context = { auth: { uid, token: { role: '4', level: 100 } } };
  const appSettings = (await getAppSettings.run({}, context)).settings;
  assert.equal(appSettings.general.semestreActualId, current);
  assert.equal(appSettings.general.semestres.find((s) => s.id === current).titulo, '2026-2', 'Semester names arrive with Settings in one request');
  let response = await loadCurrentDocenteModulos(uid);
  assert.deepEqual(response.modulos.map((m) => m.id), [currentA], 'Only this teacher and current semester, excluding archived groups');
  assert.equal(response.semestreTitulo, '2026-2');
  assert.equal(response.modulos[0].docenteNombre, 'Richard Ramos');
  executedQueries.length = 0;
  response = await listDocenteMenuModulos.run({ matriculas: true, notas: true, estructura: true }, context);
  assert.equal(executedQueries.filter((q) => q.includes('GetRequesterRoleForPermissionManual')).length, 1);
  assert.equal(executedQueries.filter((q) => q.includes('GetRolePermissionManual')).length, 1, 'All three menu permissions share one SQL lookup');
  assert.deepEqual(response.modulos.map((m) => m.id), [currentA], 'One menu endpoint serves both entries');
  response = await listMatriculaDocenteGrupos.run({ semestreTitulo: '2026-1' }, context);
  assert.deepEqual(response.grupoModulos.map((m) => m.id), [currentA], 'Explicit historical filters cannot expand teacher lists');
  response = await listRegistroAuxiliarDocenteModulos.run({ semestreTitulo: '2026-1' }, context);
  assert.deepEqual(response.modulos.map((m) => m.id), [currentA]);
  response = await listMatriculas.run({ semestreId: previous, grupoModuloIds: [oldA] }, context);
  assert.deepEqual(response.matriculas, []);
  response = await listMatriculas.run({ semestreId: current, grupoModuloIds: [currentA] }, context);
  assert.deepEqual(response.matriculas, []);
  assert.ok(executedQueries.some((q) => q.includes('ListDocenteModulosForMatriculaList')), 'The direct list checks ownership in SQL');
  response = await listMatriculas.run({ semestreId: current, grupoModuloIds: [currentB] }, context);
  assert.deepEqual(response.matriculas, [], 'A different teacher cannot open another group by ID');
  await assert.rejects(() => getRegistroAuxiliar.run({ grupoModuloId: oldA }, context), (e) => e.code === 'permission-denied');
  await assert.rejects(() => getRegistroAuxiliar.run({ grupoModuloId: currentB }, context), (e) => e.code === 'permission-denied');
  const registroActual = await getRegistroAuxiliar.run({ grupoModuloId: currentA }, context);
  assert.equal(registroActual.grupoModulo.id, currentA, 'The current module remains accessible');
  await dc.executeGraphql('mutation Switch($id:Int!,$value:Int!){appSetting_update(id:$id,data:{intValue:$value})}', { variables: { id: settingId, value: previous } });
  response = await loadCurrentDocenteModulos(uid);
  assert.deepEqual(response.modulos.map((m) => m.id), [oldA], 'Changing Settings immediately changes the selected semester');
  await dc.executeGraphql('mutation RevokeNotes {rolePermission_updateMany(where:{roleId:{eq:4},entity:{eq:"registro-auxiliar"}},data:{canView:false})}');
  await assert.rejects(() => listDocenteMenuModulos.run({ notas: true }, context), (e) => e.code === 'permission-denied');
  response = await listDocenteMenuModulos.run({ matriculas: true }, context);
  assert.deepEqual(response.modulos.map((m) => m.id), [oldA], 'List-only permission still works');
  console.log('Passed in isolated SQL Connect emulator: current semester, teacher ownership, archived groups, shared menu, historical links, setting changes, and permissions.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
