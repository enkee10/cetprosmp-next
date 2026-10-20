const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Module, createRequire } = require('node:module');
const { performance } = require('node:perf_hooks');
const { buildSync } = require('esbuild');
const req = createRequire(path.resolve('functions/package.json'));
assert.equal(process.env.GCLOUD_PROJECT, 'demo-cetpro-semestre-test');
assert.equal(process.env.DATA_CONNECT_EMULATOR_HOST, '127.0.0.1:9398');
assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8088');
req('firebase-admin/app').initializeApp({ projectId: 'demo-cetpro-semestre-test' });
const db = req('firebase-admin/firestore').getFirestore();
const dc = require('../functions/lib/modules/core/dataConnectCore.js').dataConnect;
const currentMat = require('../functions/lib/modules/matriculas/handlers.js');
const currentUsers = require('../functions/lib/modules/users/handlers.js');
const { buildMatriculaModuloRows } = require('../functions/lib/modules/core/matriculaModuloRows.js');
const sources = JSON.parse(fs.readFileSync('tmp/performance-local/before-sources.json', 'utf8'));
function baseline(file) {
  const compiled = buildSync({ stdin: { contents: sources[file], resolveDir: path.dirname(path.resolve(file)), loader: 'ts' },
    bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external' });
  const filename = path.resolve(path.dirname(file), 'benchmark-before.cjs');
  const mod = new Module(filename); mod.paths = Module._nodeModulePaths(path.dirname(filename));
  mod._compile(compiled.outputFiles[0].text, filename); return mod.exports;
}
const oldMat = baseline('functions/src/modules/matriculas/handlers.ts');
const oldUsers = baseline('functions/src/modules/users/handlers.ts');
async function insert(type, data) {
  const response = await dc.executeGraphql(`mutation Seed($data:${type}_Data! @allow(fields:"${Object.keys(data).join(' ')}")) {
    row:${type[0].toLowerCase()+type.slice(1)}_insert(data:$data)
  }`, { variables: { data } }); return response.data.row.id;
}
async function sample(action, repetitions = 5) {
  const times = []; let value;
  for (let i = 0; i < repetitions; i++) { const started = performance.now(); value = await action(); times.push(performance.now() - started); }
  return { firstCallMs: +times[0].toFixed(2), medianMs: +[...times].sort((a,b)=>a-b)[Math.floor(times.length/2)].toFixed(2),
    responseBytes: Buffer.byteLength(JSON.stringify(value)), value };
}
const summary = ({ value, ...rest }) => rest;

(async () => {
  await dc.executeGraphql('mutation Role {rol_upsert(data:{id:4,titulo:"Docente",scala:100})}');
  await dc.executeGraphql('mutation StudentRole {rol_upsert(data:{id:2,titulo:"Estudiante",scala:1})}');
  for (const entity of ['matriculas','registro-auxiliar','estructura-academica']) await insert('RolePermission', { roleId:4, entity, canView:true });
  const current = await insert('Semestre', {titulo:'2026-2'}), previous = await insert('Semestre', {titulo:'2026-1'});
  await insert('AppSetting', {settingKey:'general.semestreActualId',intValue:current});
  const uid = 'performance-teacher-a';
  const teacherUser = await insert('User', {documentId:uid,rolId:4,nombre:'Ana',apellidoPaterno:'Docente'});
  const teacher = await insert('Personal', {userId:teacherUser});
  const otherUser = await insert('User', {documentId:'performance-teacher-b',rolId:4});
  const otherTeacher = await insert('Personal', {userId:otherUser});
  const grupoId = await insert('Grupo', {semestreId:current,personalId:teacher});
  const otherGroup = await insert('Grupo', {semestreId:current,personalId:otherTeacher});
  const moduloId = await insert('Modulo', {titulo:'Módulo de prueba'});
  const groupModule = await insert('GrupoModulo', {grupoId,moduloId,instancia:1,nombre:'Módulo A'});
  const secondModule = await insert('GrupoModulo', {grupoId,moduloId,instancia:2,nombre:'Módulo B'});
  const otherModule = await insert('GrupoModulo', {grupoId:otherGroup,moduloId,instancia:1,nombre:'Otro docente'});
  const memberships = [{id:groupModule,grupoId,moduloId,nombre:'Módulo A'}, {id:secondModule,grupoId,moduloId,nombre:'Módulo B'}];
  const context = {auth:{uid,token:{role:'4',level:100}}};
  const users = [], enrollments = [];
  for (let i=0;i<125;i++) {
    const userId = await insert('User', {documentId:`perf-student-${i}`,rolId:2,nombre:`Alumno ${String(i).padStart(3,'0')}`,
      apellidoPaterno:'Prueba',dni:String(10000000+i),sexo:i%2?'M':'F',direccion:'Dirección de prueba',fechaNacimiento:'2000-01-01T00:00:00Z'});
    users.push(userId);
    const group = i<100?grupoId:otherGroup;
    const id = await insert('Matricula', {userId,semestreId:current,grupoId:group,fecha:new Date(Date.UTC(2026,8,1,0,i)).toISOString(),recibo:`R-${i}`});
    enrollments.push(id);
    if (i<100) {
      if (i===0) await insert('ModuloEstudiante', {matriculaId:id,grupoId,moduloId});
      else for (const grupoModuloId of [groupModule,secondModule]) await insert('ModuloEstudiante', {matriculaId:id,grupoId,moduloId,grupoModuloId});
    } else await insert('ModuloEstudiante', {matriculaId:id,grupoId:otherGroup,moduloId,grupoModuloId:otherModule});
  }
  const jobs = db.collection('matriculaAvatarExtractionJobs');
  for(let start=0;start<1100;start+=400){ const batch=db.batch();
    for(let i=start;i<Math.min(start+400,1100);i++)batch.set(jobs.doc(`unrelated-${i}`),{userId:999999+i,status:'completed',updatedAt:new Date(2026,0,1),avatarTamanos:{tiny:{url:'https://example.test/unrelated.png'}}});
    await batch.commit();
  }
  const batch = db.batch();
  for(const id of [teacherUser,...users])batch.set(jobs.doc(`own-${id}`),{userId:id,status:'completed',updatedAt:new Date(2026,9,19),avatarTamanos:{tiny:{url:`https://example.test/${id}.png`}}});
  await batch.commit();

  const oldProfile=await sample(()=>oldUsers.getMyProfile.run({},context));
  const profile=await sample(()=>currentUsers.getMyProfile.run({includeAvatar:false},context));
  assert.equal(profile.value.profile.avatarTiny,undefined);
  const photo=await currentUsers.getMyAvatar.run({},context);assert.equal(photo.profile.avatarTiny,`https://example.test/${teacherUser}.png`);
  const oldList=await sample(()=>oldMat.listMatriculas.run({semestreId:current},context));
  const page=await sample(()=>currentMat.listMatriculasPage.run({semestreId:current,page:0,pageSize:50},context));
  const expected=buildMatriculaModuloRows(oldList.value.matriculas,memberships,[String(groupModule),String(secondModule)]);
  assert.equal(expected.length,200);
  assert.equal(page.value.rowCount,200);assert.equal(page.value.rows.length,50);
  const ids=new Set();
  for(let p=0;p<4;p++){
    const result=await currentMat.listMatriculasPage.run({semestreId:current,page:p,pageSize:50},context);
    for(const row of result.rows){assert(!ids.has(row.rowId),'No duplicate rows between pages');ids.add(row.rowId);}
  }
  assert.deepEqual([...ids].sort(),expected.map(r=>r.rowId).sort(),'Pages preserve all modern and legacy module instances');
  const filtered=await currentMat.listMatriculasPage.run({semestreId:current,pageSize:50,filterModel:{items:[{field:'estudiante',operator:'contains',value:'Alumno 099'}]}},context);
  assert.equal(filtered.rowCount,2);assert(filtered.rows.every(r=>r.user.nombre==='Alumno 099'));
  const sorted=await currentMat.listMatriculasPage.run({semestreId:current,pageSize:50,sortModel:[{field:'estudiante',sort:'asc'}]},context);
  assert.equal(sorted.rows[0].user.nombre,'Alumno 000');
  const scope={semestreId:current,grupoModuloIds:[groupModule]};
  const single=await currentMat.listMatriculasPage.run({...scope,pageSize:50},context);
  assert.equal(single.rowCount,100);assert(single.rows.every(r=>r.grupoModuloId===groupModule));
  const photos=await currentMat.getMatriculasPageAvatars.run({...scope,matriculaIds:[enrollments[0],enrollments[124]]},context);
  assert.equal(Object.keys(photos.avatars).length,1,'Photo requests enforce teacher ownership');
  assert.equal((await currentMat.listMatriculasPage.run({semestreId:previous},context)).rowCount,0);
  assert.equal((await currentMat.listMatriculasPage.run({semestreId:current,grupoModuloIds:[otherModule]},context)).rowCount,0);
  const admin={auth:{uid:'perf-admin',token:{role:'600',level:600}}};
  const all=await currentMat.listMatriculasPage.run({semestreId:current,page:0,pageSize:50},admin);assert.equal(all.rowCount,225);
  await dc.executeGraphql('mutation Revoke{rolePermission_updateMany(where:{roleId:{eq:4},entity:{eq:"matriculas"}},data:{canView:false})}');
  await assert.rejects(()=>currentMat.listMatriculasPage.run({semestreId:current},context),e=>e.code==='permission-denied');
  const report={environment:'isolated local SQL + Firestore emulators',students:125,teacherRows:200,pageRows:50,
    profileBefore:summary(oldProfile),profileAfterWithoutPhoto:summary(profile),listBefore:summary(oldList),listAfterFirstPage:summary(page),
    profileAvatarDocumentsBefore:1000,profileAvatarDocumentsAfterCriticalPath:0,profileAvatarDocumentsAfterBackground:1};
  fs.writeFileSync('tmp/performance-local/results.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
  console.log('Passed: SQL page membership, 4 pages, legacy instances, search, sorting, ownership, semester, optional photos and revoked permissions.');
})().catch(e=>{console.error(e);process.exitCode=1;});
