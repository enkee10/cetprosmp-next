// Preview by default. --apply writes one transaction to the explicitly selected target.
// node scripts/repair-manualidades-schedule.cjs --remote [--apply]
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { scheduleDay, rebalanceSlots } = require('./alternating-calendar.cjs');
const MINUTE = 60000;
const limaDay = value => new Date(Date.parse(value) - 5 * 3600000).toISOString().slice(0, 10);
const duration = row => Date.parse(row.fin) - Date.parse(row.inicio);
const active = row => row.evento?.estado !== 'cancelado';
const equalTime = (a, b) => Date.parse(a) === Date.parse(b);
const startOf = (date, g) => Date.parse(`${date}T${g.grupo.turno.horaInicio.slice(11, 19)}-05:00`);

async function readState(graph) {
  const base = await graph(`query ManualidadesRepairBase {
    grupoModulos(where:{modulo:{plan:{carreraId:{eq:12}}},grupo:{semestre:{titulo:{eq:"2026-2"}},archivado:{ne:true}}},limit:100){
      id nombre inicio fin moduloId grupoId calendarioId modulo{horas}
      grupo{personalId semestreId horario{nombre diasSemana viernesAlternoInicio} turno{horaInicio horaFin} semestre{inicio titulo}}}
    eventos(where:{tipoEvento:{eq:"feriado"}},limit:1000){id fechaInicio fechaFin estado}
  }`);
  assert(base.grupoModulos.length > 0 && base.grupoModulos.length < 100);
  const state = await graph(`query ManualidadesRepairState($ids:[Int!]!){
    grupoModuloJornadas(where:{grupoModuloId:{in:$ids}},limit:5000,orderBy:{fecha:ASC}){id grupoModuloId fecha tipo inicio fin horas horasCurriculares pendiente eventoId evento{id titulo estado fechaInicio fechaFin fechaActualizacion}}
    grupoModuloActividades(where:{grupoModuloId:{in:$ids}},limit:5000,orderBy:{inicio:ASC}){id grupoModuloId actividadId segmento inicio fin eventoId evento{id titulo tipoEvento estado fechaInicio fechaFin fechaActualizacion} actividad{aprendizaje{indicadorCapacidad{capacidadTerminal{unidadDidacticaId}}}}}
    grupoModuloUnidadesDidacticas(where:{grupoModuloId:{in:$ids}},limit:1000){id grupoModuloId unidadDidacticaId inicio fin}
    parteDiarioRegistros(where:{grupoModuloId:{in:$ids}},limit:1000){id fecha grupoModuloId jornadaId actividadProgramadaId tipoUnidad actividadManual unidadDidacticaId actividadId matriculados asistentes firma observaciones usoMedios silabo fichaActividad instrumentoEvaluacion registroAsistencia registroAuxiliarEvaluacion material tareas fechaActualizacion}
  }`, { ids: base.grupoModulos.map(g => g.id) });
  assert(state.grupoModuloJornadas.length < 5000 && state.grupoModuloActividades.length < 5000 && state.parteDiarioRegistros.length < 1000);
  return { ...base, ...state };
}

function makePlan(state, fromDate = '2026-10-16') {
  const holidays = new Set(state.eventos.filter(e => e.estado !== 'cancelado').map(e => limaDay(e.fechaInicio)));
  const groups = [];
  for (const g of state.grupoModulos) {
    const h = g.grupo.horario, days = h.diasSemana.split(',').map(Number);
    const allowed = date => !holidays.has(date) && scheduleDay(date, days, g.grupo.semestre.inicio, g.grupo.semestre.titulo, h.viernesAlternoInicio);
    const journeys = state.grupoModuloJornadas.filter(j => j.grupoModuloId === g.id && active(j));
    const original = state.grupoModuloActividades.filter(a => a.grupoModuloId === g.id && active(a)).sort((a, b) => Date.parse(a.inicio) - Date.parse(b.inicio) || a.id - b.id);
    const input = journeys.flatMap(j => [
      ...(j.horasCurriculares ? [{ date: j.fecha, offset: 0, minutes: j.horasCurriculares * 45, phase: 'curricular', journey: j }] : []),
      ...(j.tipo !== 'curricular' ? [{ date: j.fecha, offset: j.horasCurriculares * 45, minutes: j.horas * 45, phase: j.tipo, journey: j }] : []),
    ]);
    const balanced = rebalanceSlots(input, allowed, fromDate);
    const plannedJourneys = journeys.filter(j => allowed(j.fecha)).map(j => {
      const slots = balanced.slots.filter(s => s.date === j.fecha);
      const curricular = slots.filter(s => s.phase === 'curricular').reduce((n, s) => n + s.minutes, 0);
      const chosen = j.tipo === 'curricular' ? slots : slots.filter(s => s.phase !== 'curricular');
      const begin = startOf(j.fecha, g);
      const inicio = new Date(begin + Math.round(Math.min(...chosen.map(s => s.offset)) * MINUTE)).toISOString();
      const fin = new Date(begin + Math.round(Math.max(...chosen.map(s => s.offset + s.minutes)) * MINUTE)).toISOString();
      assert.equal(limaDay(fin), j.fecha, 'La recuperación no puede invadir el día siguiente.');
      return { ...j, inicio, fin, horas: chosen.reduce((n, s) => n + s.minutes, 0) / 45, horasCurriculares: curricular / 45 };
    });
    const removed = journeys.filter(j => !allowed(j.fecha));
    for (const j of removed) assert(!state.parteDiarioRegistros.some(r => r.jornadaId === j.id && r.firma), `La jornada inválida ${j.id} tiene un parte firmado.`);
    // Reflow only remaining curriculum, preserving the original order and every activity's duration.
    const future = original.filter(a => limaDay(a.inicio) >= fromDate);
    const slots = balanced.slots.filter(s => s.phase === 'curricular' && s.date >= fromDate);
    assert.equal(future.reduce((n, a) => n + duration(a), 0), slots.reduce((n, s) => n + Math.round(s.minutes * MINUTE), 0));
    const sessions = original.filter(a => limaDay(a.inicio) < fromDate);
    let slotIndex = 0, used = 0;
    const pools = new Map([...new Set(future.map(a => a.actividadId))].map(id => [id, future.filter(a => a.actividadId === id).sort((a, b) => a.segmento - b.segmento)]));
    const maxSegment = new Map([...new Set(original.map(a => a.actividadId))].map(id => [id, Math.max(...original.filter(a => a.actividadId === id).map(a => a.segmento))]));
    const usedIds = new Set();
    for (const a of future) {
      let left = duration(a);
      while (left > 0) {
        const slot = slots[slotIndex];
        assert(slot, `No cabe la actividad ${a.actividadId}.`);
        const capacity = Math.round(slot.minutes * MINUTE);
        const amount = Math.min(left, capacity - used);
        assert(amount > 0);
        const old = pools.get(a.actividadId).find(v => !usedIds.has(v.id));
        if (old) usedIds.add(old.id);
        else maxSegment.set(a.actividadId, maxSegment.get(a.actividadId) + 1);
        const begin = startOf(slot.date, g) + Math.round(slot.offset * MINUTE) + used;
        sessions.push({ ...a, id: old?.id ?? null, eventoId: old?.eventoId ?? null, evento: old?.evento ?? a.evento,
          segmento: old?.segmento ?? maxSegment.get(a.actividadId), inicio: new Date(begin).toISOString(), fin: new Date(begin + amount).toISOString() });
        left -= amount; used += amount;
        if (used === capacity) { slotIndex++; used = 0; }
      }
    }
    const discarded = future.filter(a => !usedIds.has(a.id));
    const total = plannedJourneys.reduce((n, j) => n + Math.round((j.horas + (j.tipo === 'curricular' ? 0 : j.horasCurriculares)) * 45 * MINUTE), 0);
    assert.equal(total, g.modulo.horas * 45 * MINUTE, `Total incorrecto del grupo-módulo ${g.id}.`);
    for (const a of sessions) assert(allowed(limaDay(a.inicio)) && limaDay(a.fin) <= limaDay(g.fin));
    for (const id of new Set(original.map(a => a.actividadId))) assert.equal(
      sessions.filter(a => a.actividadId === id).reduce((n, a) => n + duration(a), 0),
      original.filter(a => a.actividadId === id).reduce((n, a) => n + duration(a), 0), `Cambió la duración de ${id}.`);
    for (const r of state.parteDiarioRegistros.filter(r => r.grupoModuloId === g.id && r.firma && r.actividadProgramadaId != null)) {
      assert(sessions.some(a => a.actividadId === r.actividadProgramadaId && limaDay(a.inicio) === r.fecha), `Se perdería la sesión del parte firmado ${r.id}.`);
    }
    groups.push({ g, journeys: plannedJourneys, removed, sessions, discarded, extensions: balanced.extensions });
  }
  const intervals = groups.flatMap(p => [
    ...p.sessions.map(s => ({ ...s, teacher: p.g.grupo.personalId })),
    ...p.journeys.filter(j => j.tipo !== 'curricular').map(j => ({ ...j, teacher: p.g.grupo.personalId })),
  ]).sort((a, b) => Date.parse(a.inicio) - Date.parse(b.inicio));
  for (let i = 0; i < intervals.length; i++) for (let j = i + 1; j < intervals.length && Date.parse(intervals[j].inicio) < Date.parse(intervals[i].fin); j++) {
    assert(intervals[i].teacher !== intervals[j].teacher, `Cruce del docente ${intervals[i].teacher} en ${intervals[i].inicio}.`);
  }
  return groups;
}

const literal = value => value === null ? 'null' : Array.isArray(value) ? `[${value.map(literal).join(',')}]`
  : typeof value === 'object' ? `{${Object.entries(value).map(([k, v]) => `${k}:${literal(v)}`).join(',')}}` : JSON.stringify(value);

function mutationFor(state, plan) {
  const fields = [], now = new Date().toISOString();
  const updates = new Map();
  const update = (table, id, data, before) => {
    const key = `${table}:${id}`;
    const filtered = Object.fromEntries(Object.entries(data).filter(([k, v]) => k === 'fechaActualizacion' || (typeof v === 'string' && /^(inicio|fin|fechaInicio|fechaFin)$/.test(k) ? !equalTime(v, before[k]) : v !== before[k])));
    if (!Object.keys(filtered).some(k => k !== 'fechaActualizacion')) return;
    assert(!updates.has(key), `Actualización duplicada: ${key}`); updates.set(key, true);
    const guard = table === 'evento' ? { fechaActualizacion: { eq: before.fechaActualizacion } } : { inicio: { eq: before.inicio }, fin: { eq: before.fin } };
    fields.push(`u${fields.length}:${table}_update(first:{where:${literal({ id: { eq: id }, ...guard })}},data:${literal(filtered)}) @check(expr:"this != null",message:"La programación cambió; vuelva a preparar el plan.")`);
  };
  const eventUpdate = (event, data) => { assert(event); update('evento', event.id, { ...data, fechaActualizacion: now }, event); };
  for (const p of plan) {
    for (const j of p.removed) {
      if (j.evento) eventUpdate(j.evento, { estado: 'cancelado' });
      else {
        const alias = `e${fields.length}`;
        fields.push(`${alias}:evento_insert(data:${literal({titulo:`Jornada reprogramada · ${p.g.nombre}`,tipoEvento:'clase',fechaInicio:j.inicio,fechaFin:j.fin,estado:'cancelado',computaHoras:false,minutosHoraAcademica:45,calendarioId:p.g.calendarioId,semestreId:p.g.grupo.semestreId,fechaCreacion:now,fechaActualizacion:now})})`);
        fields.push(`j${fields.length}:grupoModuloJornada_update(id:${j.id},data:{eventoId_expr:"response.${alias}.id"}) @check(expr:"this != null")`);
      }
    }
    for (const j of p.journeys) {
      const before = state.grupoModuloJornadas.find(v => v.id === j.id);
      update('grupoModuloJornada', j.id, { inicio:j.inicio,fin:j.fin,horas:j.horas,horasCurriculares:j.horasCurriculares }, before);
      if (j.evento) eventUpdate(j.evento, { fechaInicio:j.inicio,fechaFin:j.fin });
    }
    for (const a of p.discarded) eventUpdate(a.evento, { estado:'cancelado' });
    for (const a of p.sessions) {
      if (a.id) {
        update('grupoModuloActividad', a.id, { inicio:a.inicio,fin:a.fin }, state.grupoModuloActividades.find(v => v.id === a.id));
        eventUpdate(a.evento, { fechaInicio:a.inicio,fechaFin:a.fin });
      } else {
        const alias = `e${fields.length}`;
        const e = { titulo:a.evento.titulo,tipoEvento:a.evento.tipoEvento,estado:'confirmado',fechaInicio:a.inicio,fechaFin:a.fin,minutosHoraAcademica:45,computaHoras:true,calendarioId:p.g.calendarioId,semestreId:p.g.grupo.semestreId,fechaCreacion:now,fechaActualizacion:now };
        fields.push(`${alias}:evento_insert(data:${literal(e)})`);
        fields.push(`a${fields.length}:grupoModuloActividad_insert(data:{grupoModuloId:${p.g.id},actividadId:${a.actividadId},segmento:${a.segmento},inicio:${literal(a.inicio)},fin:${literal(a.fin)},eventoId_expr:"response.${alias}.id"})`);
        fields.push(`r${fields.length}:eventoRelacion_insert(data:{entidadTipo:"grupo_modulo",entidadId:${p.g.id},eventoId_expr:"response.${alias}.id",fechaCreacion:${literal(now)},fechaActualizacion:${literal(now)}})`);
      }
    }
    for (const unit of state.grupoModuloUnidadesDidacticas.filter(u => u.grupoModuloId === p.g.id)) {
      const sessions = p.sessions.filter(a => a.actividad?.aprendizaje?.indicadorCapacidad.capacidadTerminal.unidadDidacticaId === unit.unidadDidacticaId);
      if (!sessions.length) continue;
      update('grupoModuloUnidadDidactica', unit.id, {
        inicio: new Date(Math.min(...sessions.map(a => Date.parse(a.inicio)))).toISOString(),
        fin: new Date(Math.max(...sessions.map(a => Date.parse(a.fin)))).toISOString(),
      }, unit);
    }
  }
  return { query:`mutation RepairManualidadesAlternation @transaction {${fields.join('\n')}}`, count:fields.length };
}

async function main() {
  const remote = process.argv.includes('--remote'), apply = process.argv.includes('--apply');
  assert(remote || process.argv.includes('--local'), 'Indique --remote o --local explícitamente.');
  if (remote) { delete process.env.DATA_CONNECT_EMULATOR_HOST; delete process.env.FIREBASE_DATA_CONNECT_EMULATOR_HOST; }
  else process.env.DATA_CONNECT_EMULATOR_HOST = '127.0.0.1:9399';
  const req = require('node:module').createRequire(path.resolve('functions/package.json'));
  const { initializeApp } = req('firebase-admin/app');
  const { getDataConnect } = req('firebase-admin/data-connect');
  const dc = getDataConnect({serviceId:'cetprosmp-2026-service',location:'us-central1'},initializeApp({projectId:'cetprosmp-2026'}));
  const graph = async (query, variables = {}) => (await dc.executeGraphql(query, {variables})).data;
  const before = await readState(graph), plan = makePlan(before), mutation = mutationFor(before, plan);
  const folder = path.resolve('backups/manualidades-20261016'); fs.mkdirSync(folder,{recursive:true});
  const prefix = `${remote?'remote':'local'}-${Date.now()}`;
  fs.writeFileSync(path.join(folder,`${prefix}-before.json`),JSON.stringify(before,null,2),{flag:'wx'});
  fs.writeFileSync(path.join(folder,`${prefix}-plan.json`),JSON.stringify(plan,null,2),{flag:'wx'});
  fs.writeFileSync(path.join(folder,`${prefix}-mutation.gql`),mutation.query,{flag:'wx'});
  console.log(JSON.stringify({remote,apply,operations:mutation.count,groups:plan.map(p=>({id:p.g.id,nombre:p.g.nombre,horas:p.g.modulo.horas,fechaLimite:limaDay(p.g.fin),fechasRetiradas:p.removed.map(j=>j.fecha),recuperacion:p.extensions})),backup:prefix},null,2));
  if (!apply || !mutation.count) return;
  // Reject drift between review and the transaction, including newly signed parts.
  assert.deepEqual(await readState(graph),before,'Los datos cambiaron durante la preparación.');
  await graph(mutation.query);
  const after = await readState(graph);
  fs.writeFileSync(path.join(folder,`${prefix}-after.json`),JSON.stringify(after,null,2),{flag:'wx'});
  assert.deepEqual(after.parteDiarioRegistros,before.parteDiarioRegistros,'Los partes deben conservarse íntegros.');
  const verified = makePlan(after);
  assert.equal(mutationFor(after,verified).count,0,'La reparación debe ser idempotente.');
  console.log(JSON.stringify({verified:true,activeHoursPreserved:true,conflicts:0,partesPreservados:after.parteDiarioRegistros.length}));
}
module.exports = { readState, makePlan, mutationFor };
if (require.main === module) main().catch(e=>{console.error(e);process.exitCode=1;});
