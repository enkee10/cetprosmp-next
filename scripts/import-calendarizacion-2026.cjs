// Imports reviewed PDF marks into the LOCAL SQL Connect emulator only.
const fs=require('node:fs');
const assert=require('node:assert/strict');
process.env.GCLOUD_PROJECT='cetprosmp-2026';
process.env.DATA_CONNECT_EMULATOR_HOST='127.0.0.1:9399';
process.env.FIREBASE_DATA_CONNECT_EMULATOR_HOST='127.0.0.1:9399';
const {dataConnect}=require('../functions/lib/modules/core/dataConnectCore.js');
const graph=async(query,variables={})=>(await dataConnect.executeGraphql(query,{variables})).data;
const seed=JSON.parse(fs.readFileSync('scripts/data/calendarizacion-2026.json','utf8'));
const day=value=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
const midnight=date=>`${date}T05:00:00.000Z`;
const nextDay=date=>new Date(Date.parse(midnight(date))+86400000).toISOString();
const stateQuery=`query CalendarizacionImportState {
 calendarios(limit:10000){id titulo descripcion tipo duracion color activo archivado inicio fin fechaIni fechaFin anioId semestreId horarioId fechaCreacion fechaActualizacion}
 semestres(limit:1000){id titulo anioId}
 anios(limit:100){id nombre}
 grupoModulos(limit:10000){id calendarioId grupoId moduloId nombre orden obligatorio instancia inicio fin modulo{horas titulo} grupo{semestre{titulo} horarioId}}
 grupos(limit:10000){id calendarioId}
 grupoModuloActividades(limit:30000){id grupoModuloId actividadId eventoId inicio fin segmento}
 programacionesHorarias(limit:10000){id calendarioId grupoModuloId}
 eventos(limit:50000){id titulo descripcion tipoEvento fechaInicio fechaFin todoElDia ubicacion color estado minutosHoraAcademica computaHoras programacionHorariaId fechaCreacion fechaActualizacion calendarioId semestreId relaciones:eventoRelaciones_on_evento(limit:1000){id entidadTipo entidadId fechaCreacion fechaActualizacion}}
}`;
const profileKeyForGroup=g=>{
 const pattern={1:'lmv',3:'mjv',5:'lv'}[g.grupo.horarioId];
 return `${g.grupo.semestre?.titulo}:${g.modulo.horas}:${pattern}`;
};
const fields={calendar:'titulo descripcion tipo duracion color activo archivado inicio fin anioId semestreId horarioId fechaActualizacion'};
const markDescription=(profile,mark)=>`Fuente: ${profile.source}. ${mark.type==='ppp'?'EFSRT del PDF equivale a PPP en Opción Ocupacional.':'Según la calendarización proporcionada.'}`;
const matchesMark=(event,mark)=>event.tipoEvento===mark.type&&event.todoElDia&&event.fechaInicio&&day(event.fechaInicio)===mark.date&&event.titulo===mark.title;
function plansFor(state){
 const assignedCalendarIds=new Set();
 return seed.profiles.map(profile=>{
  const semester=state.semestres.find(s=>s.titulo===profile.semester);
  assert.ok(semester,`Falta el semestre ${profile.semester}`);
  const title=`${profile.semester} ${profile.label} ${profile.hours} horas`;
  const exact=state.calendarios.filter(c=>c.semestreId===semester.id&&c.horarioId===profile.horarioId&&c.duracion===profile.hours&&!assignedCalendarIds.has(c.id));
  assert.ok(exact.length<=1,`Calendarios duplicados para ${profile.key}`);
  let calendar=exact[0];
  if(!calendar){
   const generic=state.calendarios.filter(c=>c.semestreId===semester.id&&c.horarioId===profile.horarioId&&c.duracion==null&&!assignedCalendarIds.has(c.id));
   const eligible=generic.filter(c=>{
    const linked=state.grupoModulos.filter(g=>g.calendarioId===c.id);
    if(!linked.length)return false;
    const counts=new Map();for(const g of linked)counts.set(g.modulo.horas,(counts.get(g.modulo.horas)||0)+1);
    const most=[...counts].sort((a,b)=>b[1]-a[1]||b[0]-a[0]);
    return most[0][0]===profile.hours;
   });
   assert.ok(eligible.length<=1,`Calendario compartido ambiguo para ${profile.key}`);
   calendar=eligible[0];
  }
  if(calendar)assignedCalendarIds.add(calendar.id);
  const groups=state.grupoModulos.filter(g=>profileKeyForGroup(g)===profile.key);
  const now=new Date().toISOString();
  const sourceNote=`Calendarización del semestre ${profile.semester}, ${profile.hours} horas, ${profile.label}. Fuente: ${profile.source}. En Opción Ocupacional, EFSRT equivale a PPP. Las marcas de todo el día no añaden horas a las clases.`;
  const originalDescription=(calendar?.descripcion||'').split(/(?:\n\n)?Calendarización (?:2026; perfil|del semestre)/)[0].trim();
  const oldDescription=originalDescription?originalDescription+'\n\n':'';
  const data={titulo:title,descripcion:oldDescription+sourceNote,tipo:'academico',duracion:profile.hours,color:({150:'#795548',300:'#1976d2',512:'#7b1fa2',528:'#00897b'})[profile.hours],activo:true,archivado:false,
   inicio:midnight(profile.semester.endsWith('-1')?'2026-03-01':'2026-08-01'),fin:midnight(profile.semester.endsWith('-1')?'2026-08-01':'2027-01-01'),
   anioId:semester.anioId,semestreId:semester.id,horarioId:profile.horarioId,fechaActualizacion:now};
  const existingMarks=profile.events.flatMap(mark=>state.eventos.filter(e=>e.calendarioId===calendar?.id&&matchesMark(e,mark)).map(event=>({event,mark})));
  const missing=profile.events.filter(mark=>!existingMarks.some(item=>item.mark===mark));
  const descriptionsToUpdate=existingMarks.filter(({event,mark})=>event.descripcion!==markDescription(profile,mark));
  return {profile,semester,title,calendar,groups,data,missing,descriptionsToUpdate};
 });
}
function eventDestination(event,state,groupPlans,plans){
 const linkedIds=new Set([
  ...event.relaciones.filter(r=>r.entidadTipo==='grupo_modulo').map(r=>r.entidadId),
  ...state.grupoModuloActividades.filter(a=>a.eventoId===event.id).map(a=>a.grupoModuloId),
  ...state.programacionesHorarias.filter(p=>p.id===event.programacionHorariaId&&p.grupoModuloId).map(p=>p.grupoModuloId),
 ]);
 const destinations=new Set([...linkedIds].map(id=>groupPlans.get(id)).filter(Boolean));
 if(destinations.size>1||[...linkedIds].some(id=>!groupPlans.has(id)))return null;
 if(destinations.size===1)return [...destinations][0];
 // Legacy annual period markers were all stored under the first 528-hour calendar.
 if(!linkedIds.size&&event.todoElDia&&event.tipoEvento==='clase'){
  const match=event.titulo?.match(/^(528|512|300) horas(?: lun - vie)? \(S([12])(?:-[12])?\)$/i);
  if(match)return plans.find(p=>p.profile.key===`2026-${match[2]}:${match[1]}:lv`);
 }
 return null;
}
const canonical=value=>Array.isArray(value)?value.map(canonical).sort((a,b)=>(a.id??0)-(b.id??0)):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,canonical(v)])):value;
(async()=>{
 const state=await graph(stateQuery);
 assert.ok(state.eventos.length<50000&&state.grupoModuloActividades.length<30000,'La consulta debe ser completa');
 const plans=plansFor(state),groupPlans=new Map(plans.flatMap(p=>p.groups.map(g=>[g.id,p])));
 const excluded=state.grupoModulos.filter(g=>String(g.grupo.semestre?.titulo).startsWith('2026-')&&!groupPlans.has(g.id)).map(g=>({id:g.id,module:g.modulo.titulo,hours:g.modulo.horas,horarioId:g.grupo.horarioId}));
 const eventPlans=new Map(state.eventos.map(e=>[e.id,eventDestination(e,state,groupPlans,plans)]).filter(([,p])=>p));
 const report={localOnly:true,profiles:plans.length,calendarsToCreate:plans.filter(p=>!p.calendar).length,calendarsToReuse:plans.filter(p=>p.calendar).length,eventsToAdd:plans.reduce((n,p)=>n+p.missing.length,0),matchedGroupModules:groupPlans.size,excluded,
  calendars:plans.map(p=>({key:p.profile.key,id:p.calendar?.id??null,title:p.title,missing:p.missing.length,groups:p.groups.map(g=>g.id)}))};
 fs.mkdirSync('tmp/calendarizacion-import',{recursive:true});
 fs.writeFileSync('tmp/calendarizacion-import/preview.json',JSON.stringify(report,null,2));
 if(!process.argv.includes('--apply')){console.log(JSON.stringify(report,null,2));return;}
 const backup=`tmp/calendarizacion-import/before-${Date.now()}.json`;
 fs.writeFileSync(backup,JSON.stringify(state,null,2));
 const resultingIds=new Map();
 const insertedIds=[];
 // Each calendar, its new marks, and its group links are saved atomically.
 for(const plan of plans){
  const {profile,calendar,groups,data,missing,descriptionsToUpdate}=plan;
  const vars={data};
  const defs=[`$data:Calendario_Data! @allow(fields:"${fields.calendar}${calendar?'':' fechaCreacion'}")`];
  const lines=[];
  if(calendar){defs.push('$calendarId:Int!');vars.calendarId=calendar.id;lines.push('calendar:calendario_update(id:$calendarId,data:$data) @check(expr:"this != null",message:"El calendario cambió.")');}
  else {data.fechaCreacion=data.fechaActualizacion;lines.push('calendar:calendario_insert(data:$data)');}
  // Literal input records let calendarId_expr refer to the inserted calendar.
  const fullLines=[lines[0]];
  if(missing.length){
   const references=missing.map((_,i)=>`{titulo:$title${i},descripcion:$description${i},tipoEvento:$type${i},fechaInicio:$start${i},fechaFin:$end${i},todoElDia:true,color:$color${i},estado:"confirmado",minutosHoraAcademica:45,computaHoras:false,semestreId:${plan.semester.id},fechaCreacion:$now,fechaActualizacion:$now,calendarioId_expr:"response.calendar.id"}`);
   defs.push('$now:Timestamp!');vars.now=data.fechaActualizacion;
   missing.forEach((mark,i)=>{
    defs.push(`$title${i}:String!,$description${i}:String!,$type${i}:String!,$start${i}:Timestamp!,$end${i}:Timestamp!,$color${i}:String!`);
    Object.assign(vars,{[`title${i}`]:mark.title,[`description${i}`]:markDescription(profile,mark),[`type${i}`]:mark.type,[`start${i}`]:midnight(mark.date),[`end${i}`]:nextDay(mark.date),[`color${i}`]:mark.color});
   });
   fullLines.push(`marks:evento_insertMany(data:[${references.join(',')}])`);
   if(groups.length)fullLines.push(`relations:eventoRelacion_insertMany(data:[${missing.flatMap((_,i)=>groups.map(g=>`{eventoId_expr:"response.marks[${i}].id",entidadTipo:"grupo_modulo",entidadId:${g.id},fechaCreacion:$now,fechaActualizacion:$now}`)).join(',')}])`);
  }
  for(const [i,description] of [...new Set(descriptionsToUpdate.map(({mark})=>markDescription(profile,mark)))].entries()){
   defs.push(`$descriptionIds${i}:[Int!]!,$updatedDescription${i}:String!`);
   vars[`descriptionIds${i}`]=descriptionsToUpdate.filter(({mark})=>markDescription(profile,mark)===description).map(({event})=>event.id);
   vars[`updatedDescription${i}`]=description;
   fullLines.push(`descriptions${i}:evento_updateMany(where:{id:{in:$descriptionIds${i}}},data:{descripcion:$updatedDescription${i}})`);
  }
  if(groups.length){
   defs.push('$groupModuleIds:[Int!]!');vars.groupModuleIds=groups.map(g=>g.id);
   fullLines.push('groupModules:grupoModulo_updateMany(where:{id:{in:$groupModuleIds}},data:{calendarioId_expr:"response.calendar.id"})');
   const groupIds=[...new Set(groups.map(g=>g.grupoId))].filter(id=>state.grupoModulos.filter(g=>g.grupoId===id).every(g=>groupPlans.get(g.id)===plan));
   if(groupIds.length){defs.push('$groupIds:[Int!]!');vars.groupIds=groupIds;fullLines.push('groups:grupo_updateMany(where:{id:{in:$groupIds}},data:{calendarioId_expr:"response.calendar.id"})');}
   const programIds=state.programacionesHorarias.filter(p=>groups.some(g=>g.id===p.grupoModuloId)).map(p=>p.id);
   if(programIds.length){defs.push('$programIds:[Int!]!');vars.programIds=programIds;fullLines.push('programs:programacionHoraria_updateMany(where:{id:{in:$programIds}},data:{calendarioId_expr:"response.calendar.id"})');}
  }
  const moveIds=[...eventPlans].filter(([,p])=>p===plan).map(([id])=>id);
  if(moveIds.length){defs.push('$moveIds:[Int!]!');vars.moveIds=moveIds;fullLines.push('existingEvents:evento_updateMany(where:{id:{in:$moveIds}},data:{calendarioId_expr:"response.calendar.id"})');}
  const mutation=`mutation ImportCalendarizacionCalendar(${defs.join(',')}) @transaction {${fullLines.join('\n')}}`;
  fs.writeFileSync(`tmp/calendarizacion-import/${profile.key.replace(/:/g,'-')}.gql`,mutation);
  if(process.argv.includes('--prepare-only'))continue;
  const response=await graph(mutation,vars);
  resultingIds.set(profile.key,response.calendar.id);
  insertedIds.push(...(response.marks||[]).map(m=>m.id));
 }
 if(process.argv.includes('--prepare-only')){console.log(JSON.stringify({localOnly:true,preparedOperations:plans.length}));return;}
 const after=await graph(stateQuery),afterEvents=new Map(after.eventos.map(e=>[e.id,e]));
 assert.equal(after.eventos.length,state.eventos.length+insertedIds.length);
 assert.deepEqual(canonical(after.grupoModuloActividades),canonical(state.grupoModuloActividades),'Se modificaron fechas o asociaciones de clases');
 for(const event of state.eventos){
  const expected={...event};
  if(eventPlans.has(event.id))expected.calendarioId=resultingIds.get(eventPlans.get(event.id).profile.key);
  const descriptionChange=plans.flatMap(p=>p.descriptionsToUpdate.map(item=>({...item,profile:p.profile}))).find(item=>item.event.id===event.id);
  if(descriptionChange)expected.descripcion=markDescription(descriptionChange.profile,descriptionChange.mark);
  assert.deepEqual(canonical(afterEvents.get(event.id)),canonical(expected),`Cambió el contenido del evento ${event.id}`);
 }
 for(const group of state.grupoModulos){
  const expected={...group};if(groupPlans.has(group.id))expected.calendarioId=resultingIds.get(groupPlans.get(group.id).profile.key);
  assert.deepEqual(canonical(after.grupoModulos.find(g=>g.id===group.id)),canonical(expected));
 }
 for(const plan of plans){
  const id=resultingIds.get(plan.profile.key);
  for(const mark of plan.profile.events){
   const matches=after.eventos.filter(e=>e.calendarioId===id&&matchesMark(e,mark));
   assert.equal(matches.length,1,`Falta o se duplicó ${mark.key}`);
   const event=matches[0];assert.equal(day(event.fechaInicio),mark.date);assert.equal(Date.parse(event.fechaFin)-Date.parse(event.fechaInicio),86400000);
   assert.equal(event.computaHoras,false);assert.equal(event.todoElDia,true);assert.equal(event.tipoEvento,mark.type);assert.equal(event.color,mark.color);
   assert.deepEqual(event.relaciones.filter(r=>r.entidadTipo==='grupo_modulo').map(r=>r.entidadId).sort((a,b)=>a-b),plan.groups.map(g=>g.id).sort((a,b)=>a-b));
  }
 }
 const result={...report,backup,insertedEvents:insertedIds.length,calendarIds:Object.fromEntries(resultingIds),preservedClassSchedules:after.grupoModuloActividades.length};
 fs.writeFileSync('tmp/calendarizacion-import/result.json',JSON.stringify(result,null,2));
 console.log(JSON.stringify(result,null,2));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
