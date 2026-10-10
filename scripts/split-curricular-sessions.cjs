// Applies a reviewed plan to the local emulator only, with a backup and atomic per-session changes.
const fs=require('node:fs');const assert=require('node:assert/strict');
process.env.GCLOUD_PROJECT='cetprosmp-2026';process.env.DATA_CONNECT_EMULATOR_HOST='127.0.0.1:9399';
const {dataConnect}=require('../functions/lib/modules/core/dataConnectCore.js');
const graph=async(q,v={})=>(await dataConnect.executeGraphql(q,{variables:v})).data;
const argument=(name,fallback)=>{const index=process.argv.indexOf(name);return index<0?fallback:process.argv[index+1];};
const plan=JSON.parse(fs.readFileSync(argument('--plan','tmp/session-divisions-reviewed.json'),'utf8'));
const originalSource=JSON.parse(fs.readFileSync(argument('--source','tmp/session-split-source.json'),'utf8'));
const sessionQuery=`query SessionDivisionState {
 actividads(limit:50000){id nombre numeroSesion orden claveImportacion moduloId descripcion proposito ambiente duracion fecha bibliografia aprendizajeId ejeTransversalId valorInstitucionalId contenidos:actividadContenidos_on_actividad(orderBy:{orden:ASC},limit:1000){id orden texto} materiales:actividadMateriales_on_actividad(orderBy:{orden:ASC},limit:1000){id orden texto materialId}}
 grupoModuloActividades(limit:30000){id actividadId grupoModuloId segmento inicio fin eventoId evento{id titulo descripcion tipoEvento fechaInicio fechaFin todoElDia ubicacion color estado minutosHoraAcademica computaHoras programacionHorariaId fechaCreacion fechaActualizacion calendarioId semestreId relaciones:eventoRelaciones_on_evento{entidadTipo entidadId fechaCreacion fechaActualizacion}}}
}`;
const keys=['nombre','numeroSesion','orden','moduloId','descripcion','proposito','ambiente','duracion','fecha','bibliografia','aprendizajeId','ejeTransversalId','valorInstitucionalId'];
const eventKeys=['descripcion','tipoEvento','todoElDia','ubicacion','color','estado','minutosHoraAcademica','computaHoras','programacionHorariaId','calendarioId','semestreId'];
const day=value=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));

(async()=>{
 const state=await graph(sessionQuery), byId=new Map(state.actividads.map(row=>[row.id,row]));
 const pending=[],ready=[],already=[];
 for(const entry of plan){
  const old=byId.get(entry.id);
  if(!old)throw Error(`Sesión inexistente: ${entry.id}`);
  const splitKey=`${old.claveImportacion||'session:'+old.id}:split:2`;
  if(state.actividads.some(row=>row.claveImportacion===splitKey)){already.push(entry.id);continue;}
  const schedules=state.grupoModuloActividades.filter(row=>row.actividadId===entry.id);
  if(old.duracion===3||schedules.some(row=>Date.parse(row.fin)-Date.parse(row.inicio)!==270*60000)){
   pending.push({id:entry.id,reason:'Necesita espacio adicional en la programación para conservar 3 horas por actividad y la misma fecha'});continue;
  }
  const original=originalSource.actividads.find(row=>row.id===entry.id);
  assert.equal(old.nombre,original.nombre,'El nombre cambió desde la revisión');
  assert.deepEqual(old.contenidos,entry.contenidos,'Los contenidos cambiaron desde la revisión');
  ready.push({entry,old,schedules,splitKey});
 }
 if(!process.argv.includes('--apply')){console.log(JSON.stringify({localOnly:true,ready:ready.map(r=>r.old.id),pending,already}));return;}
 fs.mkdirSync('tmp/session-divisions',{recursive:true});
 const backup='tmp/session-divisions/before-'+Date.now()+'.json';fs.writeFileSync(backup,JSON.stringify(state,null,2));
 const applied=[];
 for(const {entry,old,schedules,splitKey} of ready){
  const data=Object.fromEntries(keys.map(key=>[key,old[key]??null]));
  Object.assign(data,{nombre:entry.parts[1],duracion:3,claveImportacion:splitKey});
  const vars={id:old.id,nombre:entry.parts[0],data,original:old.nombre};
  const definitions=['$id:Int!','$nombre:String!','$original:String!',`$data:Actividad_Data! @allow(fields:"${keys.join(' ')} claveImportacion")`];
  const fields=[`query { actividad(id:$id) @check(expr:"this.nombre == vars.original",message:"La sesión cambió."){id nombre} }`,
   'first:actividad_update(id:$id,data:{nombre:$nombre,duracion:3})',
   'second:actividad_insert(data:$data)'];
  let previous='second';
  const secondItems=[...entry.contents.filter(row=>row.target===1),...entry.additions.filter(row=>row.target===1)];
  const firstItems=[...entry.contents.filter(row=>row.target===0),...entry.additions.filter(row=>row.target===0)];
  for(const [target,items] of [[1,secondItems],[0,firstItems]])for(const [index,item] of items.entries()){
   const alias=`content${target}Item${index}`,textVar=`text${target}Item${index}`;
   definitions.push(`$${textVar}:String!`);vars[textVar]=item.texto;
   const activity=target===1?'actividadId_expr:"response.second.id"':'actividadId:$id';
   if(item.id)fields.push(`${alias}:actividadContenido_update(id_expr:"response.${previous} != null ? ${item.id} : 0",data:{${activity},orden:${index+1},texto:$${textVar}}) @check(expr:"this != null",message:"El contenido ya no existe.")`);
   else fields.push(`${alias}:actividadContenido_insert(data:{${activity},orden:${index+1},texto:$${textVar}})`);
   previous=alias;
  }
  for(const [index,item] of old.materiales.entries()){
   if(!item.materialId)throw Error('Ejecuta primero la migración del catálogo de materiales.');
   definitions.push(`$materialText${index}:String!`);vars[`materialText${index}`]=item.texto;
   fields.push(`material${index}:actividadMaterial_insert(data:{actividadId_expr:"response.second.id",materialId:${item.materialId},orden:${item.orden},texto:$materialText${index}})`);
  }
  for(const [index,schedule] of schedules.entries()){
   const midpoint=new Date(Date.parse(schedule.inicio)+135*60000).toISOString();
   assert.equal(day(schedule.inicio),day(midpoint),'La segunda sesión debe conservar la fecha local');
   definitions.push(`$mid${index}:Timestamp!`,`$end${index}:Timestamp!`);vars[`mid${index}`]=midpoint;vars[`end${index}`]=schedule.fin;
   fields.push(`schedule${index}:grupoModuloActividad_update(id:${schedule.id},data:{fin:$mid${index}})`);
   let eventExpr='';
   if(schedule.evento){
    const event=Object.fromEntries(eventKeys.map(key=>[key,schedule.evento[key]??null]));
    Object.assign(event,{titulo:entry.parts[1],fechaInicio:midpoint,fechaFin:schedule.fin,fechaCreacion:new Date().toISOString(),fechaActualizacion:new Date().toISOString()});
    definitions.push(`$event${index}:Evento_Data! @allow(fields:"${Object.keys(event).join(' ')}")`);vars[`event${index}`]=event;
    fields.push(`oldEvent${index}:evento_update(id:${schedule.eventoId},data:{titulo:$nombre,fechaFin:$mid${index}})`,`newEvent${index}:evento_insert(data:$event${index})`);
    eventExpr=`,eventoId_expr:"response.newEvent${index}.id"`;
    for(const [j,relation] of schedule.evento.relaciones.entries()){
     const relVar=`rel${index}Item${j}`;
     const scalars=[];for(const [key,value] of Object.entries(relation)){const variable=`${relVar}${key[0].toUpperCase()+key.slice(1)}`;definitions.push(`$${variable}:${key==='entidadId'?'Int':key.startsWith('fecha')?'Timestamp':'String'}`);vars[variable]=value;scalars.push(`${key}:$${variable}`);}
     fields.push(`${relVar}:eventoRelacion_insert(data:{eventoId_expr:"response.newEvent${index}.id",${scalars.join(',')}})`);
    }
   }
   fields.push(`newSchedule${index}:grupoModuloActividad_insert(data:{actividadId_expr:"response.second.id",grupoModuloId:${schedule.grupoModuloId},segmento:${schedule.segmento},inicio:$mid${index},fin:$end${index}${eventExpr}})`);
  }
  const result=await graph(`mutation SplitCurricularSession(${definitions.join(',')}) @transaction {${fields.join('\n')}}`,vars);
  applied.push({originalId:old.id,newId:result.second.id,moduloId:old.moduloId,names:entry.parts,schedules:schedules.length});
 }
 // Insert the new session immediately after its original, preserving all other relative positions.
 for(const moduleId of new Set(applied.map(row=>row.moduloId))){
  const sorted=state.actividads.filter(row=>row.moduloId===moduleId).sort((a,b)=>(a.orden??a.numeroSesion??a.id)-(b.orden??b.numeroSesion??b.id)||a.id-b.id);
  const ordering=sorted.flatMap(row=>{const split=applied.find(s=>s.originalId===row.id);return split?[row.id,split.newId]:[row.id];});
  for(let start=0;start<ordering.length;start+=25)await graph(`mutation RenumberSplitSessions @transaction {${ordering.slice(start,start+25).map((id,index)=>`s${id}:actividad_update(id:${id},data:{orden:${start+index+1}})`).join('\n')}}`);
 }
 const after=await graph(sessionQuery), finalById=new Map(after.actividads.map(row=>[row.id,row]));
 for(const row of applied){
  const original=byId.get(row.originalId),a=finalById.get(row.originalId),b=finalById.get(row.newId);
  assert.equal(a.duracion,3);assert.equal(b.duracion,3);assert.equal(a.fecha,original.fecha);assert.equal(b.fecha,original.fecha);
  assert.deepEqual(b.materiales.map(m=>m.materialId),a.materiales.map(m=>m.materialId));
  for(const old of state.grupoModuloActividades.filter(s=>s.actividadId===row.originalId)){
   const first=after.grupoModuloActividades.find(s=>s.id===old.id),second=after.grupoModuloActividades.find(s=>s.actividadId===row.newId&&s.grupoModuloId===old.grupoModuloId&&s.segmento===old.segmento);
   assert.equal(day(first.inicio),day(second.inicio));assert.equal(Date.parse(first.fin),Date.parse(second.inicio));
   for(const s of [first,second])assert.equal((Date.parse(s.fin)-Date.parse(s.inicio))/60000,135);
  }
 }
 const report={localOnly:true,applied,pending,already,backup};fs.writeFileSync(argument('--report','tmp/session-divisions/result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
