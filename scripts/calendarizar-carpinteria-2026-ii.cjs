// Usa las 50 jornadas ya programadas del grupo-módulo 204.
// node scripts/calendarizar-carpinteria-2026-ii.cjs [--apply]
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const requireFunctions = createRequire(path.resolve('functions/package.json'));
const { initializeApp } = requireFunctions('firebase-admin/app');
const { getDataConnect } = requireFunctions('firebase-admin/data-connect');
if (process.env.DATA_CONNECT_EMULATOR_HOST || process.env.FIREBASE_DATA_CONNECT_EMULATOR_HOST) {
  throw new Error('Hay variables de emulador activas; se esperaba el proyecto remoto.');
}
const apply = process.argv.includes('--apply');
const db = getDataConnect(
  { serviceId: 'cetprosmp-2026-service', location: 'us-central1' },
  initializeApp({ projectId: 'cetprosmp-2026' }),
);
const graph = async (query, variables = {}) => (await db.executeGraphql(query, { variables })).data;
const query = `query CarpinteriaCalendarState {
  gm:grupoModulo(id:204) { id moduloId calendarioId grupo { semestreId } }
  actividades:actividads(where:{moduloId:{eq:31}},limit:100,orderBy:{numeroSesion:ASC}) {
    id nombre numeroSesion duracion aprendizaje { indicadorCapacidad { capacidadTerminal { unidadDidacticaId } } }
  }
  jornadas:grupoModuloJornadas(where:{grupoModuloId:{eq:204}},limit:100) {
    id fecha tipo inicio fin horas horasCurriculares pendiente eventoId
  }
  practicas:efsrtPppPracticas(where:{grupoModuloId:{eq:204}},limit:100) {
    id numero titulo fecha
  }
  vinculos:grupoModuloActividades(where:{grupoModuloId:{eq:204}},limit:100) {
    id actividadId inicio fin eventoId
  }
  unidades:grupoModuloUnidadesDidacticas(where:{grupoModuloId:{eq:204}},limit:100) {
    id unidadDidacticaId inicio fin
  }
  partes:parteDiarioRegistros(where:{grupoModuloId:{eq:204}},limit:100) { id }
}`;
const limaDay = value => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date(value));
const byStart = rows => rows.slice().sort((a, b) => Date.parse(a.inicio) - Date.parse(b.inicio));
const sameTime = (a, b) => Date.parse(a) === Date.parse(b);

function plan(state) {
  assert.equal(state.gm?.moduloId, 31);
  assert.equal(state.gm.calendarioId, 12);
  assert.equal(state.gm.grupo.semestreId, 4);
  assert.equal(state.partes.length, 0, 'Hay partes diarios existentes; revisar antes de vincular sesiones.');
  const actividades = state.actividades.slice().sort((a, b) => a.numeroSesion - b.numeroSesion);
  const practicas = state.practicas.slice().sort((a, b) => a.numero - b.numero);
  const curriculares = byStart(state.jornadas.filter(row => row.tipo === 'curricular'));
  const ppp = byStart(state.jornadas.filter(row => row.tipo === 'ppp'));
  assert.equal(actividades.length, 35);
  assert.equal(practicas.length, 15);
  assert.equal(curriculares.length, 35);
  assert.equal(ppp.length, 15);
  assert.equal(state.jornadas.length, 50);
  assert.equal(state.unidades.length, 6);
  assert.equal(actividades.reduce((sum, row) => sum + row.duracion, 0), 210);
  assert.equal(state.jornadas.reduce((sum, row) => sum + row.horas, 0), 300);
  assert.equal(new Set(state.vinculos.map(row => row.actividadId)).size, state.vinculos.length);
  const currPending = [];
  const pppPending = [];
  actividades.forEach((actividad, index) => {
    const jornada = curriculares[index];
    assert.equal(actividad.numeroSesion, index + 1);
    assert.equal(actividad.duracion, jornada.horasCurriculares);
    const existing = state.vinculos.find(row => row.actividadId === actividad.id);
    if (existing) {
      assert(sameTime(existing.inicio, jornada.inicio) && sameTime(existing.fin, jornada.fin));
      assert(existing.eventoId && existing.eventoId === jornada.eventoId);
    } else {
      assert.equal(jornada.eventoId, null);
      currPending.push({ actividad, jornada });
    }
  });
  practicas.forEach((practica, index) => {
    const jornada = ppp[index];
    assert.equal(practica.numero, index + 1);
    if (practica.fecha) {
      assert(sameTime(practica.fecha, jornada.inicio));
      assert(jornada.eventoId);
    } else {
      assert.equal(jornada.eventoId, null);
      pppPending.push({ practica, jornada });
    }
  });
  for (const jornada of state.jornadas) {
    assert.equal(jornada.horas, 6);
    assert.equal(Date.parse(jornada.fin) - Date.parse(jornada.inicio), 270 * 60000);
    assert.equal(limaDay(jornada.inicio), jornada.fecha);
  }
  const unitIds = new Set(state.unidades.map(row => row.unidadDidacticaId));
  const units = state.unidades.map(unit => {
    assert(unitIds.has(unit.unidadDidacticaId));
    const sessions = actividades.flatMap((activity, index) =>
      activity.aprendizaje?.indicadorCapacidad?.capacidadTerminal?.unidadDidacticaId === unit.unidadDidacticaId
        ? [curriculares[index]] : []);
    assert(sessions.length > 0);
    return { id: unit.id, inicio: sessions[0].inicio, fin: sessions.at(-1).fin };
  });
  return { currPending, pppPending, units, first: curriculares[0].fecha, last: ppp.at(-1).fecha };
}

async function insertChunk(rows, type) {
  const defs = ['$now:Timestamp!'];
  const vars = { now: new Date().toISOString() };
  const fields = [];
  rows.forEach((row, index) => {
    const day = row.jornada;
    const title = type === 'curricular' ? row.actividad.nombre : row.practica.titulo;
    assert(title);
    defs.push(`$start${index}:Timestamp!,$end${index}:Timestamp!,$title${index}:String!`);
    vars[`start${index}`] = day.inicio;
    vars[`end${index}`] = day.fin;
    vars[`title${index}`] = title;
    fields.push(`e${index}:evento_insert(data:{
      titulo:$title${index},descripcion:"Mantenimiento de Carpintería · grupo-módulo 204",
      tipoEvento:"${type === 'curricular' ? 'clase' : 'ppp'}",
      fechaInicio:$start${index},fechaFin:$end${index},todoElDia:false,
      estado:"programado",minutosHoraAcademica:45,computaHoras:true,
      calendarioId:12,semestreId:4,fechaCreacion:$now,fechaActualizacion:$now
    })`);
    fields.push(`r${index}:eventoRelacion_insert(data:{
      eventoId_expr:"response.e${index}.id",entidadTipo:"grupo_modulo",entidadId:204,
      fechaCreacion:$now,fechaActualizacion:$now
    })`);
    fields.push(`j${index}:grupoModuloJornada_update(id:${day.id},data:{
      ${type === 'curricular' ? 'pendiente:false,' : ''}eventoId_expr:"response.e${index}.id"
    }) @check(expr:"this != null")`);
    if (type === 'curricular') {
      fields.push(`v${index}:grupoModuloActividad_insert(data:{
        grupoModuloId:204,actividadId:${row.actividad.id},segmento:1,
        inicio:$start${index},fin:$end${index},eventoId_expr:"response.e${index}.id"
      })`);
    } else {
      fields.push(`p${index}:efsrtPppPractica_update(id:${row.practica.id},data:{
        fecha:$start${index}
      }) @check(expr:"this != null")`);
    }
  });
  await graph(`mutation CalendarizarCarpinteria(${defs.join(',')}) @transaction {
    ${fields.join('\n')}
  }`, vars);
}

async function main() {
  const before = await graph(query);
  const work = plan(before);
  console.log(JSON.stringify({
    apply, grupoModuloId: 204, curriculares: 35, practicas: 15,
    pendientesCurriculares: work.currPending.length, pendientesPpp: work.pppPending.length,
    primeraFecha: work.first, ultimaFecha: work.last, horas: 300,
  }, null, 2));
  if (!apply) return;
  const backupDir = path.resolve('backups/calendarizar-carpinteria-20261014');
  fs.mkdirSync(backupDir, { recursive: true });
  const backupFile = path.join(backupDir, `before-${Date.now()}.json`);
  fs.writeFileSync(backupFile, JSON.stringify({ capturedAt: new Date().toISOString(), data: before }, null, 2), { flag: 'wx' });
  console.log(`Respaldo de filas: ${backupFile}`);
  for (const [type, rows] of [['curricular', work.currPending], ['ppp', work.pppPending]]) {
    for (let offset = 0; offset < rows.length; offset += 5) {
      await insertChunk(rows.slice(offset, offset + 5), type);
      console.log(`${type}: ${Math.min(offset + 5, rows.length)}/${rows.length}`);
    }
  }
  for (const unit of work.units) {
    await graph(`mutation CalendarizarUnidad($start:Timestamp!,$end:Timestamp!) {
      grupoModuloUnidadDidactica_update(id:${unit.id},data:{inicio:$start,fin:$end})
    }`, { start: unit.inicio, end: unit.fin });
  }
  const after = await graph(query);
  const remainder = plan(after);
  assert.equal(after.vinculos.length, 35);
  assert(after.practicas.every(row => row.fecha));
  assert(after.jornadas.every(row => row.eventoId));
  assert(after.jornadas.filter(row => row.tipo === 'curricular').every(row => !row.pendiente));
  assert.equal(remainder.currPending.length + remainder.pppPending.length, 0);
  assert(after.unidades.every(row => row.inicio && row.fin));
  console.log(JSON.stringify({
    verified: true, sesionesVinculadas: after.vinculos.length,
    practicasFechadas: after.practicas.length, eventosVinculados: after.jornadas.length,
  }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
