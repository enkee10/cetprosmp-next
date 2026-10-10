// Pure planner: reads an exported database, never connects to local or remote services.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const seed = require('./data/calendarizacion-2026-jornadas.json');
const MINUTES = seed.minutesPerAcademicHour;
const day = value => String(value || '').slice(0, 10);
const weekday = value => new Date(value + 'T12:00:00Z').getUTCDay();
const workday = value => ![0, 6].includes(weekday(value));
const plusDay = value => new Date(Date.parse(value + 'T12:00:00Z') + 86400000).toISOString().slice(0, 10);
const normalized = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const sum = items => items.reduce((n, item) => n + item.minutes, 0);

function distribute(total, entries, fixed = () => false) {
  assert.equal(total % MINUTES, 0, 'La duración curricular debe expresarse en horas académicas enteras.');
  total /= MINUTES;
  const locked = entries.filter(fixed), free = entries.filter(item => !fixed(item));
  const remaining = total - locked.reduce((n, a) => n + a.duracion, 0);
  assert.ok(remaining >= free.length, 'Las sesiones de 3 horas no caben en el período de empleabilidad.');
  if (!free.length) { assert.equal(remaining, 0, 'Las sesiones fijas no completan las horas de empleabilidad.'); return new Map(locked.map(a => [a.id, a.duracion * MINUTES])); }
  const weight = free.reduce((n, a) => n + (a.duracion || 1), 0);
  const allocations = free.map(a => ({ id: a.id, exact: remaining * (a.duracion || 1) / weight }));
  const result = new Map([...locked.map(a => [a.id, a.duracion]), ...allocations.map(a => [a.id, Math.floor(a.exact)])]);
  let rounding = remaining - allocations.reduce((n, a) => n + Math.floor(a.exact), 0);
  for (const a of allocations.sort((a, b) => (b.exact % 1) - (a.exact % 1) || a.id - b.id)) { if (!rounding--) break; result.set(a.id, result.get(a.id) + 1); }
  assert.ok([...result.values()].every(n => n > 0), 'Una actividad quedaría sin tiempo programado.');
  return new Map([...result].map(([id,hours])=>[id,hours*MINUTES]));
}

function chooseBlock(blocks, gm, group, semester, hours) {
  const second = semester.titulo.endsWith('-2');
  const candidates = blocks.filter(b => b.hours === hours && (b.cycle > ((hours === 150 || hours === 300 && b.pattern === 'lv') ? 2 : 1)) === second);
  if (candidates.length === 1) return candidates[0];
  const same = group.modules.filter(g => g.modulo_id === gm.modulo_id || hours === 150).sort((a, b) => (a.orden || 0) - (b.orden || 0) || a.instancia - b.instancia || a.id - b.id);
  if (same.length > 1) return candidates[same.findIndex(g => g.id === gm.id)];
  if (/mayo?-jul|may-jul|oct-dic/.test(normalized(gm.nombre))) return candidates.at(-1);
  if (gm.inicio && Number(day(gm.inicio).slice(5, 7)) >= (second ? 10 : 5)) return candidates.at(-1);
  return candidates[0];
}

function calendarSlots(block, semester, options, practiceMinutes, employMinutes, technicalMinutes, holidays) {
  const semesterStart = day(semester.inicio), semesterEnd = day(semester.fin);
  const rows = block.dates.filter(r => r.date >= semesterStart && r.date <= semesterEnd);
  const byDate = new Map(rows.map(r => [r.date, r.category]));
  const orange = rows.filter(r => r.category === 'efsrt_ppp');
  assert.ok(orange.length, 'El PDF no contiene fechas de prácticas.');
  const edges = rows.filter(r => r.category === 'inicio_termino');
  const start = edges.find(r => r.date < orange[0].date)?.date || rows.find(r => workday(r.date) && [null, 'empleabilidad'].includes(r.category))?.date;
  const final = edges.find(r => r.date > orange.at(-1).date)?.date || rows.find(r => r.date > orange.at(-1).date && r.category === 'dia_logro')?.date;
  assert.ok(start && final, 'Falta una fecha de inicio o cierre identificable en el PDF.');
  const blocked = date => holidays.has(date) || ['feriado', 'gestion', 'vacaciones_gestion'].includes(byDate.get(date));
  const eligible = date => (!options.moveWeekendPPP || workday(date)) && !blocked(date);
  const employer = rows.filter(r => r.date >= start && r.date < orange[0].date && r.category === 'empleabilidad' && workday(r.date) && !blocked(r.date));
  assert.ok(employer.length * 270 >= employMinutes, 'Faltan horas en las fechas de empleabilidad del PDF.');
  const employ = employer.map(r => ({ date: r.date, offset: 0, minutes: 0, phase: 'empleabilidad' }));
  let remaining = employMinutes;
  for (const slot of employ) { slot.minutes = Math.min(270, remaining); remaining -= slot.minutes; }
  assert.ok(employ.every(s => s.minutes > 0), 'Una fecha de empleabilidad quedaría vacía.');
  const technical = rows.filter(r => r.date >= start && r.date < orange[0].date && [null, 'inicio_termino'].includes(r.category) && workday(r.date) && (!options.technicalWeekdays || options.technicalWeekdays.includes(weekday(r.date))) && !blocked(r.date)).map(r => ({ date: r.date, offset: 0, minutes: 270, phase: 'tecnica' }));
  let missingTechnical = technicalMinutes - sum(technical);
  for (const slot of employ) if (missingTechnical > 0 && slot.minutes < 270) { const minutes = Math.min(270 - slot.minutes, missingTechnical); technical.push({ date: slot.date, offset: slot.minutes, minutes, phase: 'tecnica' }); missingTechnical -= minutes; }
  const practiceDates = new Set(orange.filter(r => eligible(r.date)).map(r => r.date));
  if (eligible(final)) practiceDates.add(final);
  rows.filter(r => r.date >= orange[0].date && r.date <= final && r.category === 'dia_logro' && eligible(r.date)).forEach(r => practiceDates.add(r.date));
  if (!options.moveWeekendPPP && orange.some(r => !workday(r.date))) throw Error('PPP en fin de semana: falta decidir cómo trasladar estas fechas.');
  for (let date = orange[0].date; date <= final && practiceDates.size * 270 < practiceMinutes + Math.max(0, missingTechnical); date = plusDay(date)) if (workday(date) && !blocked(date) && !['empleabilidad','inicio_termino'].includes(byDate.get(date))) practiceDates.add(date);
  const practice = [...practiceDates].sort().map(date => ({ date, offset: 0, minutes: 0, phase: 'practica' }));
  assert.ok(practice.length * 270 >= practiceMinutes + Math.max(0, missingTechnical), 'No caben todas las horas de prácticas y clases dentro de las fechas del PDF.');
  remaining = practiceMinutes;
  for (const slot of practice) { const future = practice.filter(s => s.date > slot.date).length; slot.minutes = Math.min(270, Math.max(1, remaining - future)); remaining -= slot.minutes; }
  assert.equal(remaining, 0);
  for (const slot of [...practice].reverse()) if (missingTechnical > 0 && slot.minutes < 270) { const minutes = Math.min(270 - slot.minutes, missingTechnical); technical.push({ date: slot.date, offset: slot.minutes, minutes, phase: 'tecnica' }); missingTechnical -= minutes; }
  assert.ok(missingTechnical <= 0, 'Faltan horas para todas las actividades técnicas.');
  // If a PDF offers more teaching time, shorten the last technical days to the exact total.
  remaining = technicalMinutes;
  const capacity=sum(technical);
  const exactTechnical = technical.sort((a, b) => a.date.localeCompare(b.date) || a.offset - b.offset).map((slot,i) => {const minutes=i===technical.length-1?remaining:Math.floor(slot.minutes*technicalMinutes/capacity);remaining-=minutes;return {...slot,minutes};});
  assert.equal(remaining, 0);
  return { start, end: final, technical: exactTechnical, employ, practice };
}

function scheduleActivities(activities, durations, slots, gm, shift) {
  if (!activities.length) return [];
  let slotIndex = 0, used = 0;
  const segments = [];
  for (const activity of activities) {
    let left = durations.get(activity.id), segment = 1;
    while (left > 0) {
      const slot = slots[slotIndex]; assert.ok(slot, `No caben las actividades del grupo-módulo ${gm.id}.`);
      const minutes = Math.min(left, slot.minutes - used), start = Date.parse(`${slot.date}T${shift.hora_inicio.slice(11, 19)}-05:00`) + (slot.offset + used) * 60000;
      segments.push({ activityId: activity.id, unitId: activity.unitId, segment: segment++, start: new Date(start).toISOString(), end: new Date(start + minutes * 60000).toISOString(), minutes, phase: slot.phase });
      left -= minutes; used += minutes;
      if (used === slot.minutes) { slotIndex++; used = 0; }
    }
  }
  assert.equal(slotIndex, slots.length, 'Las actividades no completan las horas del calendario.');
  return segments;
}

function reconcileTechnicalDates(plan, data, holidays) {
  const pending = [];
  const ordered = plan.groups.flatMap(g => [...g.slots.employ, ...g.slots.technical].map(s => ({ group: g, slot: s }))).sort((a,b) => Number(a.slot.phase==='tecnica')-Number(b.slot.phase==='tecnica') || a.slot.date.localeCompare(b.slot.date) || a.group.id-b.group.id);
  const accepted = [];
  const bounds = (g,s) => {const start=Date.parse(`${s.date}T${g.shift.hora_inicio.slice(11,19)}-05:00`)+s.offset*60000;return {start,end:start+s.minutes*60000};};
  const conflicts = (g,s) => {const t=bounds(g,s);return accepted.some(a=>a.group.teacherId===g.teacherId&&t.start<a.end&&t.end>a.start);};
  for(const {group:g,slot:s} of ordered) {
    if(conflicts(g,s)){assert.equal(s.phase,'tecnica','Los PDF asignan empleabilidad simultánea al mismo docente.');pending.push({group:g,slot:s});g.slots.technical=g.slots.technical.filter(a=>a!==s);}
    else accepted.push({group:g,...bounds(g,s)});
  }
  for(const {group:g,slot:s} of pending){
    const profile=seed.blocks.find(b=>b.hours===(g.adapted&&g.hours===240?300:g.hours)&&b.pattern===g.pattern&&b.cycle===g.cycle);
    const categories=new Map(profile.dates.map(d=>[d.date,d.category]));
    const forbidden=date=>holidays.has(date)||['feriado','gestion','vacaciones_gestion'].includes(categories.get(date));
    const allowed={lmv:[1,3,5],mjv:[2,4,5],lv:[1,2,3,4,5]}[g.pattern];
    let replacement;
    // Prefer an unused teaching day before practices; use the practice period only when necessary.
    for(let date=g.slots.start;date<=g.slots.end;date=plusDay(date)){
      if(!allowed.includes(weekday(date))||forbidden(date))continue;
      for(const offset of [0,135]){
        if(offset+s.minutes>270)continue;
        const candidate={...s,date,offset};
        if(conflicts(g,candidate))continue;
        const own=[...g.slots.technical,...g.slots.employ].filter(t=>t.date===date);
        if(own.some(t=>offset<t.offset+t.minutes&&offset+s.minutes>t.offset))continue;
        replacement=candidate;break;
      }
      if(replacement)break;
    }
    assert.ok(replacement,`No existe una jornada disponible sin cruce para ${g.id}.`);
    g.slots.technical.push(replacement);accepted.push({group:g,...bounds(g,replacement)});
    g.adjustments.push({phase:'tecnica',from:s.date,to:replacement.date,minutes:s.minutes,reason:'Cruce de clases del mismo docente en los PDF'});
  }
  for(const g of plan.groups){
    const profile=seed.blocks.find(b=>b.hours===(g.adapted&&g.hours===240?300:g.hours)&&b.pattern===g.pattern&&b.cycle===g.cycle),categories=new Map(profile.dates.map(d=>[d.date,d.category]));
    const available=date=>{const occupied=[...g.slots.technical,...g.slots.employ].filter(s=>s.date===date).sort((a,b)=>a.offset-b.offset);let cursor=0;const gaps=[];for(const s of occupied){if(cursor<s.offset)gaps.push({offset:cursor,minutes:s.offset-cursor});cursor=s.offset+s.minutes;}if(cursor<270)gaps.push({offset:cursor,minutes:270-cursor});return gaps;};
    let displaced=0;
    g.slots.practice=g.slots.practice.flatMap(s=>{const gap=available(s.date).find(a=>a.minutes>0);const minutes=gap?Math.min(s.minutes,gap.minutes):0;displaced+=s.minutes-minutes;return minutes?[{...s,offset:gap.offset,minutes}]:[];});
    const first=profile.dates.find(d=>d.category==='efsrt_ppp').date;
    for(let date=first;date<=g.slots.end&&displaced>0;date=plusDay(date)){
      if(!workday(date)||holidays.has(date)||['feriado','gestion','vacaciones_gestion'].includes(categories.get(date)))continue;
      const existing=g.slots.practice.find(p=>p.date===date),gap=available(date).find(a=>a.offset===(existing?.offset??a.offset));if(!gap)continue;
      const extra=Math.min(displaced,gap.minutes-(existing?.minutes||0));if(extra<=0)continue;
      if(existing)existing.minutes+=extra;else g.slots.practice.push({date,offset:gap.offset,minutes:extra,phase:'practica'});displaced-=extra;
    }
    assert.equal(displaced,0,`No hay espacio para completar las prácticas de ${g.id}.`);
    g.slots.technical.sort((a,b)=>a.date.localeCompare(b.date)||a.offset-b.offset);g.slots.practice.sort((a,b)=>a.date.localeCompare(b.date));
    const metadata=g.activities.map(id=>{const first=g.segments.find(s=>s.activityId===id);return {id,unitId:first.unitId,phase:first.phase,minutes:g.segments.filter(s=>s.activityId===id).reduce((n,s)=>n+s.minutes,0)};});
    g.segments=[...scheduleActivities(metadata.filter(a=>a.phase==='tecnica'),new Map(metadata.map(a=>[a.id,a.minutes])),g.slots.technical,g,g.shift),...scheduleActivities(metadata.filter(a=>a.phase==='empleabilidad'),new Map(metadata.map(a=>[a.id,a.minutes])),g.slots.employ,g,g.shift)].sort((a,b)=>a.start.localeCompare(b.start)||a.activityId-b.activityId);
    g.journeys=makeJourneys(g.slots,g.segments,g.shift,g.practiceType);g.start=g.journeys[0].start;g.end=g.journeys.at(-1).end;delete g.slots;delete g.shift;delete g.practiceType;
  }
}

function makeJourneys(slots,segments,shift,practiceType){
  const phases=[...slots.technical,...slots.employ,...slots.practice];
  const localDate=value=>new Date(Date.parse(value)-5*3600000).toISOString().slice(0,10);
  return [...new Set(phases.map(s=>s.date))].sort().map(date=>{const practice=slots.practice.find(s=>s.date===date),curr=[...slots.technical,...slots.employ].filter(s=>s.date===date),selected=practice?[practice]:curr;const base=Date.parse(`${date}T${shift.hora_inicio.slice(11,19)}-05:00`);return {date,type:practice?practiceType:'curricular',start:new Date(base+Math.min(...selected.map(s=>s.offset))*60000).toISOString(),end:new Date(base+Math.max(...selected.map(s=>s.offset+s.minutes))*60000).toISOString(),hours:sum(selected)/MINUTES,curricularHours:sum(curr)/MINUTES,pending:!segments.some(s=>localDate(s.start)===date)&&!practice};});
}

function buildPlan(data, options = {}) {
  const index = Object.fromEntries(Object.entries(data).map(([name, rows]) => [name, new Map(rows.map(row => [row.id, row]))]));
  const by = (table, id) => index[table]?.get(id);
  const holidays = new Set(data.eventos.filter(e => e.tipo_evento === 'feriado' && e.estado !== 'cancelado' && e.todo_el_dia && !e.semestre_id).map(e => new Date(e.fecha_inicio).toISOString().slice(0, 10)));
  const groups = data.grupos.filter(g => [3, 4].includes(g.semestre_id) && !g.archivado).map(g=>({...g}));
  const result = { version: 1, localOnly: true, options, groups: [], skipped: [], durationUpdates: [] }, durationUpdates = new Map();
  for (const group of groups) {
    group.modules = data.grupo_modulos.filter(g => g.grupo_id === group.id);
    for (const gm of group.modules) try {
      if (options.groupModuloIds && !options.groupModuloIds.includes(gm.id)) continue;
      const module = by('modulos', gm.modulo_id), semester = by('semestres', group.semestre_id), shift = by('turnos', group.turno_id);
      let pattern = { 1: 'lmv', 3: 'mjv', 5: 'lv' }[group.horario_id], adapted = false, changedHorario=null;
      if (!pattern && group.horario_id === 7 && module.horas === 300 && options.includeAlternateFridays) { pattern = 'mjv'; adapted = true; }
      if(group.horario_id===1&&module.id===33&&options.correctCocinaToLV){pattern='lv';adapted=true;changedHorario=5;}
      if(!pattern&&group.horario_id===6&&module.horas===240&&options.adapt240){pattern='lmv';adapted=true;}
      assert.ok(pattern, 'No hay PDF que coincida con los días configurados.');
      let hours = module.horas;
      if (hours === 240 && options.adapt240 && ['lv','lmv'].includes(pattern)) { hours = 300; adapted = true; }
      const candidates = seed.blocks.filter(b => b.pattern === pattern);
      const block = chooseBlock(candidates, gm, group, semester, hours); assert.ok(block, 'No hay PDF que coincida con las horas y los días.');
      const type = by('tipo_carreras', by('carreras', by('planes', module.plan_id)?.carrera_id)?.tipo_carrera_id)?.nombre;
      const practiceType = /ocupacional/i.test(type || '') ? 'ppp' : 'efsrt';
      const links = data.competencia_unidades_didacticas.filter(r => by('competencias', r.competencia_id)?.modulo_id === module.id);
      const units = [...new Map(links.map(r => { const u = by('unidades_didacticas', r.unidad_didactica_id), c = by('competencias', r.competencia_id);return [u.id,{...u,order:r.orden,type:c.tipo}]; })).values()];
      const lastUnit = [...units].sort((a,b)=>(a.order||0)-(b.order||0)||a.id-b.id).at(-1);
      const business = units.filter(u => /gestion empresarial|emprendimiento|plan de negocio/.test(normalized(u.nombre)));
      const employment = new Set(units.filter(u => u.type === 'EMPLEABILIDAD' || practiceType === 'ppp' && (business.length ? business.some(b => b.id === u.id) : u.id === lastUnit?.id)).map(u => u.id));
      const activities = data.actividades.filter(a => a.modulo_id === module.id || a.modulo_id == null).map(a => ({ ...a, unitId: by('capacidades_terminales', by('indicadores_capacidad', by('aprendizajes', a.aprendizaje_id)?.indicador_capacidad_id)?.capacidad_terminal_id)?.unidad_didactica_id })).filter(a => units.some(u => u.id === a.unitId)).sort((a,b)=>(units.find(u=>u.id===a.unitId).order||0)-(units.find(u=>u.id===b.unitId).order||0)||(a.orden??a.numero_sesion??a.id)-(b.orden??b.numero_sesion??b.id)||a.id-b.id);
      if (!activities.length && !options.allowPendingSyllabus) throw Error('No tiene actividades del sílabo; falta decidir si se dejan pendientes.');
      const empActivities = activities.filter(a => employment.has(a.unitId)), techActivities = activities.filter(a => !employment.has(a.unitId));
      const practiceHours = module.horas===240 ? module.duracion_efsrt : practiceType === 'ppp' ? module.horas * .3 : 192;
      const employmentHours = module.horas===240 ? 30 : practiceType === 'ppp' ? module.horas / 10 : 96;
      const technicalHours = module.horas - practiceHours - employmentHours;
      assert.ok(technicalHours > 0 && shift && semester.inicio && semester.fin);
      const slots = calendarSlots(block, semester, {...options,technicalWeekdays:group.horario_id===6?[1,3]:null}, Math.round(practiceHours * MINUTES), Math.round(employmentHours * MINUTES), Math.round(technicalHours * MINUTES), holidays);
      const techDurations = techActivities.length ? distribute(Math.round(technicalHours * MINUTES), techActivities) : new Map();
      const empDurations = empActivities.length ? distribute(Math.round(employmentHours * MINUTES), empActivities, a => a.duracion === 3) : new Map();
      const segments = [...scheduleActivities(techActivities, techDurations, slots.technical, gm, shift), ...scheduleActivities(empActivities, empDurations, slots.employ, gm, shift)].sort((a,b)=>a.start.localeCompare(b.start)||a.activityId-b.activityId);
      for (const a of activities) { const minutes = techDurations.get(a.id) ?? empDurations.get(a.id);if (minutes != null) { const previous = durationUpdates.get(a.id);assert.ok(!previous || previous.minutes === minutes, 'La misma actividad tendría duraciones distintas según el grupo.');durationUpdates.set(a.id,{id:a.id,minutes,hours:minutes/MINUTES,previousHours:a.duracion}); } }
      const journeys = makeJourneys(slots,segments,shift,practiceType);
      const calendar = data.calendarios.find(c=>c.semestre_id===semester.id&&c.duracion===module.horas&&c.horario_id===(module.horas===240&&group.horario_id===6?6:{lmv:1,mjv:3,lv:5}[pattern])) || data.calendarios.find(c=>c.semestre_id===semester.id&&c.duracion===hours&&c.horario_id===({lmv:1,mjv:3,lv:5}[pattern]));assert.ok(calendar,'Falta el calendario del perfil ya importado.');
      result.groups.push({id:gm.id,groupId:group.id,moduleId:module.id,teacherId:group.personal_id,semester:semester.titulo,calendarId:calendar.id,pattern,cycle:block.cycle,source:block.source,hours:module.horas,practiceHours,employmentHours,technicalHours,adapted,changeHorarioTo:changedHorario??(adapted&&group.horario_id===7?3:null),activities:activities.map(a=>a.id),pendingSyllabus:!activities.length,journeys,segments,start:journeys[0].start,end:journeys.at(-1).end,slots,shift,practiceType,adjustments:[]});
    } catch(error) { result.skipped.push({id:gm.id,moduleId:gm.modulo_id,name:gm.nombre,reason:error.message}); }
  }
  reconcileTechnicalDates(result,data,holidays);
  result.durationUpdates = [...durationUpdates.values()].filter(a=>Math.abs(a.hours-(a.previousHours||0))>1e-7);
  return result;
}
module.exports = { buildPlan, distribute, calendarSlots, scheduleActivities, makeJourneys };
if (require.main === module) {
  const file = process.argv[2]; assert.ok(file, 'Uso: node scripts/plan-calendarizacion-2026.cjs <export.json> [options.json]');
  const plan = buildPlan(JSON.parse(fs.readFileSync(file,'utf8')), process.argv[3] ? JSON.parse(fs.readFileSync(process.argv[3],'utf8')) : {});
  const output = 'tmp/parte-diario-reprogramacion/plan.json';fs.mkdirSync('tmp/parte-diario-reprogramacion',{recursive:true});fs.writeFileSync(output,JSON.stringify(plan,null,2));
  console.log(JSON.stringify({localOnly:true,output,plannedGroups:plan.groups.length,journeys:plan.groups.reduce((n,g)=>n+g.journeys.length,0),segments:plan.groups.reduce((n,g)=>n+g.segments.length,0),durationUpdates:plan.durationUpdates.length,skipped:plan.skipped},null,2));
}
