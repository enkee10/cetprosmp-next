import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { text, normalize, cleanName, splitItems, matchRecord, similarity, dateCandidates, resolveDate, validDate, addDays, allowedDay, turnoTime, groupPeriod, scheduleSessions } from './silabus-model.mjs';

const require = createRequire(new URL('../functions/package.json', import.meta.url));
const ExcelJS = require('exceljs');
const { initializeApp, getApps } = require('firebase-admin/app');
const { getDataConnect } = require('firebase-admin/data-connect');
const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'tmp/silabus');
const args = process.argv.slice(2);
const production = args.includes('--production');
const excel = args.includes('--excel') ? args[args.indexOf('--excel') + 1] : String.raw`G:\Mi unidad\_Desarrollo2\Files cetprosmp-strapi\Tablas - datos\Documentos\Silabus\Silabus_Consolidado_Todos_Modulos_EVENTOS_CORREGIDO3.xlsx`;
if (production) {
  delete process.env.DATA_CONNECT_EMULATOR_HOST;
  delete process.env.FIREBASE_DATA_CONNECT_EMULATOR_HOST;
} else process.env.DATA_CONNECT_EMULATOR_HOST = '127.0.0.1:9399';
const dc = getDataConnect({ serviceId: 'cetprosmp-2026-service', location: 'us-central1' }, getApps()[0] ?? initializeApp({ projectId: 'cetprosmp-2026' }));
export const query = async (source, variables) => (await dc.executeGraphql(source, { variables })).data;
export const save = (name, data) => { fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(path.join(out, name), JSON.stringify(data, null, 2) + '\n'); };

export const stateQuery = `query SilabusState {
  modulos(limit:10000,orderBy:{id:ASC}) {id titulo tituloComercial planId plan {carrera {id nombre tipoCarrera {nombre}}}}
  planModulos(limit:10000) {moduloId planId plan {carrera {id nombre tipoCarrera {nombre}}}}
  competenciaUnidadesDidacticas(limit:50000) {id orden unidadDidacticaId competencia {moduloId}}
  unidadesDidacticas(limit:50000) {id nombre sigla duracion creditos comun}
  capacidadesTerminales(limit:50000,orderBy:[{orden:ASC},{id:ASC}]) {id descripcion sigla orden unidadDidacticaId}
  indicadoresCapacidad(limit:50000,orderBy:[{orden:ASC},{id:ASC}]) {id descripcion sigla orden capacidadTerminalId}
  aprendizajes(limit:50000) {id descripcion sigla indicadorCapacidadId}
  actividads(limit:50000) {id nombre descripcion duracion fecha aprendizajeId}
  semestres(limit:100) {id titulo inicio fin}
  grupoModulos(limit:10000) {id nombre instancia moduloId orden inicio fin calendarioId grupo {id semestreId turnoId horarioId}}
  grupoModuloUnidadesDidacticas(limit:50000) {id grupoModuloId unidadDidacticaId orden inicio fin}
  horarios(limit:100) {id nombre diasSemana regla viernesAlternoInicio}
  turnos(limit:100) {id nombre horaInicio horaFin}
  calendarios(limit:1000) {id titulo semestreId horarioId inicio fin}
  eventos(where:{tipoEvento:{eq:"feriado"}},limit:1000) {id fechaInicio fechaFin}
}`;

function cellValue(value) {
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    if ('result' in value) return cellValue(value.result);
    if ('richText' in value) return value.richText.map(v => v.text).join('');
    if ('text' in value) return value.text;
  }
  return value;
}

export async function readExcel() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(excel);
  const sheet = workbook.worksheets.find(v => normalize(v.name) === 'consolidado silabos');
  if (!sheet || sheet.getRow(1).getCell(16).value !== 'Nombre de la sesi\u00f3n o actividades') throw new Error('No se reconoce la hoja o las columnas del Excel.');
  const rows = [];
  for (let i = 2; i <= sheet.rowCount; i++) {
    const values = Array.from({ length: 20 }, (_, j) => cellValue(sheet.getRow(i).getCell(j + 1).value));
    if (!values.some(v => v != null && v !== '')) continue;
    rows.push({ row: i, programa: text(values[0]), module: text(values[1]), unit: text(values[2]), periodo: text(values[3]),
      unitCredits: Number(values[6]) || null, unitHours: Number(values[7]) || null,
      unitStart: values[8], unitEnd: values[9], capacity: text(values[11]), numeroSesion: Number(values[12]) || null,
      indicator: text(values[13]), aprendizaje: text(values[14]), nombre: cleanName(values[15]),
      contenidos: splitItems(values[16]), materiales: splitItems(values[17]), duracion: Number(values[18]), rawDate: values[19] });
  }
  return rows;
}

export function buildPlan(rows, state, originalState = state) {
  const semester = state.semestres.find(v => v.titulo === '2026-2');
  if (!semester?.inicio || !semester?.fin) throw new Error('Faltan las fechas del semestre 2026-2.');
  const start = semester.inicio.slice(0, 10), end = semester.fin.slice(0, 10);
  const groups = state.grupoModulos.filter(v => v.grupo.semestreId === semester.id);
  const activeModuleIds = new Set(groups.map(v => v.moduloId));
  const modules = state.modulos.filter(v => activeModuleIds.has(v.id));
  const moduleMap = new Map(), unitMap = new Map(), capacityMap = new Map(), indicatorMap = new Map();
  const issues = [], mappings = [], corrections = [], sessions = [], duplicates = [], fingerprints = new Map();
  const sorted = items => items.slice().sort((a, b) => (a.orden ?? 99999) - (b.orden ?? 99999) || a.id - b.id);
  const positions = (list, key) => [...new Set(list.map(v => normalize(cleanName(v[key])).replace(/ subtemas$/, '')))];
  const relativePosition = (index, sourceCount, targetCount) => targetCount && index >= 0 ? Math.min(targetCount - 1, Math.floor(index * targetCount / Math.max(1, sourceCount))) : null;
  for (const row of rows) {
    const mk = normalize(row.module);
    if (!moduleMap.has(mk)) {
      const ranked = modules.map(v => ({ record: v, score: Math.max(similarity(row.module, v.titulo), similarity(row.module, v.tituloComercial)) })).sort((a, b) => b.score - a.score);
      // Identical technical titles can have separate commercial variants. Prefer the populated plan.
      const populated = ranked.filter(v => v.score >= .9 && state.competenciaUnidadesDidacticas.some(l => l.competencia.moduloId === v.record.id));
      const best = populated[0] ?? ranked[0];
      const result = best?.score >= .6 ? { id: best.record.id, method: best.score === 1 ? 'exact' : 'similarity', score: best.score } : { id: null, method: 'unresolved' };
      moduleMap.set(mk, result); mappings.push({ type: 'modulo', excel: row.module, ...result, target: state.modulos.find(v => v.id === result.id)?.titulo });
    }
    const moduloId = moduleMap.get(mk).id;
    if (!moduloId) { issues.push({ row: row.row, reason: 'Modulo sin coincidencia', module: row.module }); continue; }
    const uk = `${moduloId}:${normalize(cleanName(row.unit))}`;
    if (!unitMap.has(uk)) {
      const links = state.competenciaUnidadesDidacticas.filter(v => v.competencia.moduloId === moduloId);
      const candidates = [...new Map(sorted(links).map(v => [v.unidadDidacticaId, state.unidadesDidacticas.find(u => u.id === v.unidadDidacticaId)])).values()].filter(Boolean);
      let result = matchRecord(row.unit, candidates, 'nombre', null, .6);
      if (!result.id && candidates.length) {
        const capacities = state.capacidadesTerminales.filter(v => candidates.some(u => u.id === v.unidadDidacticaId));
        const byCapacity = matchRecord(row.capacity, capacities, 'descripcion', null, .65);
        if (byCapacity.id) result = { ...byCapacity, id: capacities.find(v => v.id === byCapacity.id).unidadDidacticaId, method: 'capacity-similarity' };
      }
      if (!result.id && candidates.length && normalize(row.unit).startsWith('gestion empresarial')) {
        const common = candidates.find(v => normalize(v.nombre).startsWith('gestion empresarial'));
        if (common) result = { id: common.id, method: 'equivalent-business-unit', score: 1 };
      }
      if (!result.id && candidates.length && normalize(row.unit).includes('negocio')) {
        const common = candidates.find(v => /negocio|emprendimiento/.test(normalize(v.nombre)));
        if (common) result = { id: common.id, method: 'equivalent-entrepreneurship-unit', score: 1 };
      }
      if (!result.id && candidates.length) {
        const moduleCapacities = candidates.flatMap(u => sorted(state.capacidadesTerminales.filter(v => v.unidadDidacticaId === u.id)));
        const sourceCapacities = [...new Set(rows.filter(v => normalize(v.module) === mk).map(v => `${normalize(cleanName(v.unit))}:${normalize(cleanName(v.capacity))}`))];
        const position = sourceCapacities.indexOf(`${normalize(cleanName(row.unit))}:${normalize(cleanName(row.capacity))}`);
        const capacity = moduleCapacities[relativePosition(position, sourceCapacities.length, moduleCapacities.length)];
        if (capacity) result = { id: capacity.unidadDidacticaId, method: 'capacity-position-in-module', score: 0 };
      }
      unitMap.set(uk, result); mappings.push({ type: 'unidad', moduloId, excel: row.unit, ...result, target: state.unidadesDidacticas.find(v => v.id === result.id)?.nombre });
    }
    const unidadDidacticaId = unitMap.get(uk).id;
    if (!unidadDidacticaId) { issues.push({ row: row.row, moduloId, reason: 'Unidad sin coincidencia dentro del modulo', unit: row.unit }); continue; }
    const sameUnit = rows.filter(v => normalize(v.module) === mk && normalize(cleanName(v.unit)) === normalize(cleanName(row.unit)));
    const ck = `${uk}:${normalize(cleanName(row.capacity))}`;
    if (!capacityMap.has(ck)) {
      const candidates = sorted(state.capacidadesTerminales.filter(v => v.unidadDidacticaId === unidadDidacticaId));
      const source = positions(sameUnit, 'capacity');
      const result = matchRecord(row.capacity, candidates, 'descripcion', relativePosition(source.indexOf(normalize(cleanName(row.capacity))), source.length, candidates.length));
      capacityMap.set(ck, result); mappings.push({ type: 'capacidad', unidadDidacticaId, excel: row.capacity, ...result, target: state.capacidadesTerminales.find(v => v.id === result.id)?.descripcion });
    }
    let capacidadId = capacityMap.get(ck).id;
    if (!capacidadId) { issues.push({ row: row.row, reason: 'Capacidad sin posicion disponible' }); continue; }
    const ik = `${ck}:${normalize(cleanName(row.indicator))}`;
    if (!indicatorMap.has(ik)) {
      const unitCapacities = state.capacidadesTerminales.filter(v => v.unidadDidacticaId === unidadDidacticaId);
      const allIndicators = sorted(state.indicadoresCapacidad.filter(v => unitCapacities.some(c => c.id === v.capacidadTerminalId)));
      const direct = matchRecord(row.indicator, allIndicators, 'descripcion', null);
      const candidates = sorted(state.indicadoresCapacidad.filter(v => v.capacidadTerminalId === capacidadId));
      const sameCapacity = sameUnit.filter(v => normalize(cleanName(v.capacity)) === normalize(cleanName(row.capacity)));
      const distinct = positions(sameCapacity, 'indicator');
      const indicatorCode = row.indicator.match(/\bI\s*(\d+)\b/i);
      const codePosition = indicatorCode && Number(indicatorCode[1]) <= candidates.length ? Number(indicatorCode[1]) - 1 : null;
      const normalizedIndicator = normalize(cleanName(row.indicator)).replace(/ subtemas$/, '');
      let result = direct.id ? direct : matchRecord(row.indicator, candidates, 'descripcion', codePosition ?? relativePosition(distinct.indexOf(normalizedIndicator), distinct.length, candidates.length));
      if (!result.id && positions(sameUnit, 'capacity').length === 1 && distinct.length <= allIndicators.length) {
        result = matchRecord(row.indicator, allIndicators, 'descripcion', distinct.indexOf(normalize(cleanName(row.indicator))));
      }
      indicatorMap.set(ik, result); mappings.push({ type: 'indicador', capacidadId, excel: row.indicator, ...result, target: state.indicadoresCapacidad.find(v => v.id === result.id)?.descripcion });
    }
    const indicadorId = indicatorMap.get(ik).id;
    if (!indicadorId) { issues.push({ row: row.row, reason: 'Indicador sin posicion disponible' }); continue; }
    const index = sameUnit.findIndex(v => v.row === row.row);
    const unitStart = resolveDate(row.unitStart), unitEnd = resolveDate(row.unitEnd);
    const previous = dateCandidates(sameUnit[index - 1]?.rawDate)[0], next = dateCandidates(sameUnit[index + 1]?.rawDate)[0];
    let fecha = resolveDate(row.rawDate, { start: unitStart, end: unitEnd, previous, next });
    if (!fecha && row.rawDate == null && unitEnd) fecha = unitEnd;
    if (!fecha && text(row.rawDate).match(/^2026-09-31$/)) fecha = '2026-10-01';
    const boundsStart = previous && previous >= start ? previous : unitStart;
    const boundsEnd = next && next >= start ? next : unitEnd;
    if (fecha && boundsStart && boundsEnd && boundsStart <= boundsEnd && (fecha < boundsStart || fecha > boundsEnd)) {
      const day = Number(fecha.slice(8));
      const monthCorrections = Array.from({ length: 12 }, (_, m) => validDate(2026, m + 1, day)).filter(d => d && d >= boundsStart && d <= boundsEnd);
      if (monthCorrections.length === 1) fecha = monthCorrections[0];
      else if (fecha < boundsStart && unitEnd && previous && previous >= unitStart && index === sameUnit.length - 1) fecha = unitEnd;
    }
    if (!fecha) { issues.push({ row: row.row, reason: 'Fecha requiere contexto adicional', rawDate: row.rawDate, unitStart, unitEnd, previous, next }); }
    if (!row.nombre || !Number.isInteger(row.duracion) || row.duracion <= 0) { issues.push({ row: row.row, reason: 'Nombre o duracion invalida' }); continue; }
    const original = row.rawDate instanceof Date ? row.rawDate.toISOString().slice(0, 10) : text(row.rawDate);
    if (fecha && original !== fecha) corrections.push({ row: row.row, original, corrected: fecha });
    const fingerprint = createHash('sha256').update(JSON.stringify({ moduloId, unidadDidacticaId, indicadorId, nombre: normalize(row.nombre),
      numeroSesion: row.numeroSesion, aprendizaje: normalize(row.aprendizaje), duracion: row.duracion,
      contenidos: row.contenidos.map(normalize), materiales: row.materiales.map(normalize) })).digest('hex').slice(0, 24);
    if (fingerprints.has(fingerprint)) { duplicates.push({ row: row.row, originalRow: fingerprints.get(fingerprint), rawDate: row.rawDate }); continue; }
    fingerprints.set(fingerprint, row.row);
    sessions.push({ ...row, fecha, moduloId, unidadDidacticaId, indicadorId, orden: sessions.filter(v => v.moduloId === moduloId).length + 1,
      claveImportacion: `silabus:2026-2:${moduloId}:${fingerprint}` });
  }
  const holidays = new Set(state.eventos.map(v => v.fechaInicio?.slice(0, 10)).filter(Boolean));
  const schedules = [], occupiedByGroup = new Map();
  for (const group of groups.slice().sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || a.id - b.id)) {
    const moduleSessions = sessions.filter(v => v.moduloId === group.moduloId).map(v => ({ ...v }));
    if (!moduleSessions.length) continue;
    const horario = state.horarios.find(v => v.id === group.grupo.horarioId);
    const turno = state.turnos.find(v => v.id === group.grupo.turnoId);
    if (!horario || !turno) { issues.push({ grupoModuloId: group.id, reason: 'Horario o turno ausente' }); continue; }
    if (moduleSessions.some(v => !v.fecha)) continue;
    const originalGroup = originalState.grupoModulos.find(v => v.id === group.id) ?? group;
    const range = groupPeriod(originalGroup, start, end);
    const historical = moduleSessions.filter(v => v.fecha < range.start);
    if (historical.length) {
      const remapped = historical.length === moduleSessions.length ? moduleSessions : historical;
      const min = Math.min(...remapped.map(v => Date.parse(v.fecha))), max = Math.max(...remapped.map(v => Date.parse(v.fecha)));
      for (const session of remapped) session.fecha = addDays(range.start, max === min ? 0 : Math.round((Date.parse(session.fecha) - min) / (max - min) * (Date.parse(range.end) - Date.parse(range.start)) / 86400000));
    }
    moduleSessions.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.orden - b.orden);
    const existingBusy = occupiedByGroup.get(group.grupo.id) ?? new Map();
    const schedule = scheduleSessions(moduleSessions, { ...range,
      semesterStart: start, days: horario.diasSemana.split(',').map(Number), horaInicio: turnoTime(turno.horaInicio), horaFin: turnoTime(turno.horaFin), holidays, occupiedMinutes: existingBusy });
    const incompleteRows = new Set(schedule.issues.map(v => v.row));
    schedule.sessions = schedule.sessions.filter(v => !incompleteRows.has(v.row));
    for (const block of schedule.sessions) {
      const day = new Date(Date.parse(block.inicio) - 5 * 3600000).toISOString().slice(0, 10);
      existingBusy.set(day, (existingBusy.get(day) ?? 0) + block.minutos);
    }
    occupiedByGroup.set(group.grupo.id, existingBusy);
    schedules.push({ grupoModuloId: group.id, nombre: group.nombre, moduloId: group.moduloId, horarioId: horario.id, turnoId: turno.id,
      sessions: schedule.sessions });
    issues.push(...schedule.issues.map(v => ({ ...v, grupoModuloId: group.id })));
  }
  return { source: excel, production, semester, mappings, corrections, duplicates, sessions, schedules, issues,
    totals: { rows: rows.length, sesiones: sessions.length, contenidos: sessions.reduce((n, v) => n + v.contenidos.length, 0),
      materiales: sessions.reduce((n, v) => n + v.materiales.length, 0), grupos: schedules.length,
      eventos: schedules.reduce((n, v) => n + v.sessions.length, 0), duplicados: duplicates.length, issues: issues.length } };
}

export async function loadImported() {
  return query(`query SilabusImported {
    actividads(limit:50000) {id nombre moduloId numeroSesion orden claveImportacion duracion fecha aprendizajeId
      contenidos:actividadContenidos_on_actividad(limit:200,orderBy:{orden:ASC}) {id orden texto}
      materiales:actividadMateriales_on_actividad(limit:200,orderBy:{orden:ASC}) {id orden texto}}
    grupoModuloActividades(limit:50000) {id grupoModuloId actividadId segmento inicio fin eventoId}
  }`);
}

export function validatePlan(plan, state) {
  const sessions = new Map(plan.sessions.map(v => [v.row, v])), byGroup = new Map();
  const semesterStart = plan.semester.inicio.slice(0, 10), semesterEnd = plan.semester.fin.slice(0, 10);
  const holidays = new Set(state.eventos.map(v => v.fechaInicio?.slice(0, 10)).filter(Boolean));
  for (const schedule of plan.schedules) {
    const gm = state.grupoModulos.find(v => v.id === schedule.grupoModuloId);
    assert.ok(gm && gm.grupo.semestreId === plan.semester.id, 'Solo se programa el semestre de destino');
    const horario = state.horarios.find(v => v.id === gm.grupo.horarioId), turno = state.turnos.find(v => v.id === gm.grupo.turnoId);
    const dates = byGroup.get(gm.grupo.id) ?? [], sums = new Map();
    for (const block of schedule.sessions) {
      const session = sessions.get(block.row);
      assert.equal(session.moduloId, gm.moduloId);
      const localStart = new Date(Date.parse(block.inicio) - 5 * 3600000).toISOString();
      const localEnd = new Date(Date.parse(block.fin) - 5 * 3600000).toISOString();
      const day = localStart.slice(0, 10);
      assert.ok(day >= semesterStart && day <= semesterEnd && !holidays.has(day));
      assert.ok(allowedDay(day, horario.diasSemana.split(',').map(Number), semesterStart));
      assert.equal(localEnd.slice(0, 10), day);
      assert.ok(localStart.slice(11, 16) >= turnoTime(turno.horaInicio) && localEnd.slice(11, 16) <= turnoTime(turno.horaFin));
      const minutes = (Date.parse(block.fin) - Date.parse(block.inicio)) / 60000;
      assert.ok(minutes > 0); sums.set(block.row, (sums.get(block.row) ?? 0) + minutes);
      dates.push(block);
    }
    for (const [row, minutes] of sums) assert.equal(minutes, sessions.get(row).duracion * 45, `Duracion incompleta: ${row}`);
    byGroup.set(gm.grupo.id, dates);
  }
  for (const dates of byGroup.values()) {
    dates.sort((a, b) => a.inicio.localeCompare(b.inicio));
    for (let i = 1; i < dates.length; i++) assert.ok(dates[i].inicio >= dates[i - 1].fin, 'Cruce entre sesiones del mismo grupo');
  }
}

export async function applyPlan(plan, state) {
  if (plan.issues.length && !args.includes('--allow-pending')) throw new Error('Hay casos pendientes; revisar el informe antes de aplicar con --allow-pending.');
  assert.equal(new Set(plan.sessions.map(v => v.claveImportacion)).size, plan.sessions.length, 'Claves de sesion repetidas');
  validatePlan(plan, state);
  const imported = await loadImported();
  const learningMap = new Map(state.aprendizajes.map(v => [`${v.indicadorCapacidadId}:${normalize(v.descripcion)}`, v.id]));
  const learningKey = session => `${session.indicadorId}:${normalize(session.aprendizaje)}`;
  const missingLearning = [...new Map(plan.sessions.filter(v => !learningMap.has(learningKey(v))).map(v => [learningKey(v), v])).values()];
  for (let offset = 0; offset < missingLearning.length; offset += 40) {
    const chunk = missingLearning.slice(offset, offset + 40), variables = {}, definitions = [], fields = [];
    chunk.forEach((session, i) => {
      definitions.push(`$d${i}:Aprendizaje_Data! @allow(fields:"descripcion indicadorCapacidadId")`);
      variables[`d${i}`] = { descripcion: session.aprendizaje || null, indicadorCapacidadId: session.indicadorId };
      fields.push(`a${i}:aprendizaje_insert(data:$d${i})`);
    });
    const result = await query(`mutation ImportSilabusLearning(${definitions.join(',')}) @transaction {${fields.join('\n')}}`, variables);
    chunk.forEach((session, i) => learningMap.set(learningKey(session), result[`a${i}`].id));
  }
  const activityMap = new Map(imported.actividads.filter(v => v.claveImportacion).map(v => [v.claveImportacion, v]));
  const newSessions = plan.sessions.filter(v => !activityMap.has(v.claveImportacion));
  for (let offset = 0; offset < newSessions.length; offset += 20) {
    const chunk = newSessions.slice(offset, offset + 20), variables = {}, definitions = [], fields = [];
    chunk.forEach((session, i) => {
      definitions.push(`$a${i}:Actividad_Data! @allow(fields:"nombre moduloId numeroSesion orden claveImportacion duracion aprendizajeId")`);
      variables[`a${i}`] = { nombre: session.nombre, moduloId: session.moduloId, numeroSesion: session.numeroSesion,
        orden: session.orden, claveImportacion: session.claveImportacion, duracion: session.duracion, aprendizajeId: learningMap.get(learningKey(session)) };
      fields.push(`a${i}:actividad_insert(data:$a${i})`);
      for (const [key, items, singular] of [['c', session.contenidos, 'actividadContenido'], ['m', session.materiales, 'actividadMaterial']]) {
        items.forEach((texto, index) => {
          const variable = `${key}${i}Item${index}`;
          definitions.push(`$${variable}:String!`); variables[variable] = texto;
          fields.push(`${variable}:${singular}_insert(data:{actividadId_expr:"response.a${i}.id",orden:${index + 1},texto:$${variable}})`);
        });
      }
    });
    const result = await query(`mutation ImportSilabusActivities(${definitions.join(',')}) @transaction {${fields.join('\n')}}`, variables);
    chunk.forEach((session, i) => activityMap.set(session.claveImportacion, { id: result[`a${i}`].id }));
    console.log(`Sesiones insertadas: ${Math.min(offset + chunk.length, newSessions.length)}/${newSessions.length}`);
  }

  const calendars = state.calendarios.slice(), now = new Date().toISOString();
  const existingLinks = new Map(imported.grupoModuloActividades.map(v => [`${v.grupoModuloId}:${v.actividadId}:${v.segmento}`, v]));
  const sessionsByRow = new Map(plan.sessions.map(v => [v.row, v]));
  let createdEvents = 0;
  for (const schedule of plan.schedules) {
    if (!schedule.sessions.length) continue;
    const group = state.grupoModulos.find(v => v.id === schedule.grupoModuloId);
    let calendar = calendars.find(v => v.id === group.calendarioId) ?? calendars.find(v => v.semestreId === plan.semester.id && v.horarioId === schedule.horarioId);
    if (!calendar) {
      const horario = state.horarios.find(v => v.id === schedule.horarioId);
      const result = await query(`mutation ImportSilabusCalendar($data:Calendario_Data! @allow(fields:"titulo semestreId horarioId inicio fin activo fechaCreacion fechaActualizacion")) {calendario_insert(data:$data)}`, {
        data: { titulo: `2026-2 ${horario.nombre}`, semestreId: plan.semester.id, horarioId: schedule.horarioId,
          inicio: `${plan.semester.inicio.slice(0, 10)}T05:00:00Z`, fin: `${plan.semester.fin.slice(0, 10)}T23:59:59-05:00`, activo: true, fechaCreacion: now, fechaActualizacion: now },
      });
      calendar = { id: result.calendario_insert.id, semestreId: plan.semester.id, horarioId: schedule.horarioId };
      calendars.push(calendar);
    }
    const blocks = schedule.sessions.filter(v => !existingLinks.has(`${schedule.grupoModuloId}:${activityMap.get(sessionsByRow.get(v.row).claveImportacion).id}:${v.segmento}`));
    if (!blocks.length) continue;
    for (let offset = 0; offset < blocks.length; offset += 40) {
      const chunk = blocks.slice(offset, offset + 40), variables = {}, definitions = [], fields = [];
      chunk.forEach((block, i) => {
        const session = sessionsByRow.get(block.row), actividadId = activityMap.get(session.claveImportacion).id;
        definitions.push(`$e${i}:Evento_Data! @allow(fields:"titulo tipoEvento fechaInicio fechaFin todoElDia estado minutosHoraAcademica computaHoras calendarioId semestreId fechaCreacion fechaActualizacion")`);
        variables[`e${i}`] = { titulo: session.nombre, tipoEvento: 'clase', fechaInicio: block.inicio, fechaFin: block.fin,
          todoElDia: false, estado: 'programado', minutosHoraAcademica: 45, computaHoras: true,
          calendarioId: calendar.id, semestreId: plan.semester.id, fechaCreacion: now, fechaActualizacion: now };
        fields.push(`e${i}:evento_insert(data:$e${i})`);
        definitions.push(`$inicio${i}:Timestamp!`, `$fin${i}:Timestamp!`);
        variables[`inicio${i}`] = block.inicio; variables[`fin${i}`] = block.fin;
        fields.push(`l${i}:grupoModuloActividad_insert(data:{grupoModuloId:${schedule.grupoModuloId},actividadId:${actividadId},segmento:${block.segmento},inicio:$inicio${i},fin:$fin${i},eventoId_expr:"response.e${i}.id"})`);
        fields.push(`r${i}:eventoRelacion_insert(data:{eventoId_expr:"response.e${i}.id",entidadTipo:"grupo_modulo",entidadId:${schedule.grupoModuloId}})`);
      });
      await query(`mutation ImportSilabusSchedule(${definitions.join(',')}) @transaction {${fields.join('\n')}}`, variables);
      createdEvents += chunk.length;
    }
    const inicio = schedule.sessions[0].inicio, fin = schedule.sessions[schedule.sessions.length - 1].fin;
    await query(`mutation ImportSilabusGroupDates($id:Int!,$inicio:Timestamp!,$fin:Timestamp!,$calendarioId:Int!) {
      grupoModulo_update(id:$id,data:{inicio:$inicio,fin:$fin,calendarioId:$calendarioId})
    }`, { id: schedule.grupoModuloId, inicio, fin, calendarioId: calendar.id });
    const unitIds = [...new Set(schedule.sessions.map(v => sessionsByRow.get(v.row).unidadDidacticaId))];
    for (const unidadDidacticaId of unitIds) {
      const unitBlocks = schedule.sessions.filter(v => sessionsByRow.get(v.row).unidadDidacticaId === unidadDidacticaId);
      const previous = state.grupoModuloUnidadesDidacticas.find(v => v.grupoModuloId === schedule.grupoModuloId && v.unidadDidacticaId === unidadDidacticaId);
      const data = { grupoModuloId: schedule.grupoModuloId, unidadDidacticaId, inicio: unitBlocks[0].inicio, fin: unitBlocks[unitBlocks.length - 1].fin };
      if (previous) await query(`mutation ImportSilabusUnitDates($id:Int!,$inicio:Timestamp!,$fin:Timestamp!) {grupoModuloUnidadDidactica_update(id:$id,data:{inicio:$inicio,fin:$fin})}`, { id: previous.id, inicio: data.inicio, fin: data.fin });
      else await query(`mutation ImportSilabusUnitDates($data:GrupoModuloUnidadDidactica_Data! @allow(fields:"grupoModuloId unidadDidacticaId inicio fin")) {grupoModuloUnidadDidactica_insert(data:$data)}`, { data });
    }
    console.log(`Programado grupo-modulo ${schedule.grupoModuloId}: ${schedule.sessions.length} bloques`);
  }
  const after = await query(stateQuery), final = await loadImported();
  const sorted = rows => rows.slice().sort((a, b) => a.id - b.id);
  for (const key of ['unidadesDidacticas', 'capacidadesTerminales', 'indicadoresCapacidad']) assert.deepEqual(sorted(after[key]), sorted(state[key]), `Datos existentes alterados: ${key}`);
  const byKey = new Map(final.actividads.map(v => [v.claveImportacion, v]));
  for (const session of plan.sessions) {
    const activity = byKey.get(session.claveImportacion);
    assert.ok(activity, `Sesion no guardada: ${session.row}`);
    assert.equal(activity.nombre, session.nombre); assert.equal(activity.duracion, session.duracion); assert.equal(activity.fecha, null);
    assert.deepEqual(activity.contenidos.map(v => v.texto), session.contenidos);
    assert.deepEqual(activity.materiales.map(v => v.texto), session.materiales);
  }
  for (const schedule of plan.schedules) for (const block of schedule.sessions) {
    const activity = byKey.get(sessionsByRow.get(block.row).claveImportacion);
    const link = final.grupoModuloActividades.find(v => v.grupoModuloId === schedule.grupoModuloId && v.actividadId === activity.id && v.segmento === block.segmento);
    assert.ok(link?.eventoId, `Programacion sin evento: ${schedule.grupoModuloId}/${block.row}`);
    assert.equal(Date.parse(link.inicio), Date.parse(block.inicio)); assert.equal(Date.parse(link.fin), Date.parse(block.fin));
  }
  const report = { appliedAt: new Date().toISOString(), production, totals: { ...plan.totals, aprendizajes: new Set(plan.sessions.map(v => byKey.get(v.claveImportacion).aprendizajeId)).size }, created: { aprendizajes: missingLearning.length, sesiones: newSessions.length, eventos: createdEvents },
    pending: plan.issues, preserved: ['unidadesDidacticas', 'capacidadesTerminales', 'indicadoresCapacidad'],
    source: excel, schedules: plan.schedules.map(v => ({ grupoModuloId: v.grupoModuloId, nombre: v.nombre, bloques: v.sessions.length })), corrections: plan.corrections, duplicates: plan.duplicates };
  save(production ? 'result-remote.json' : 'result-local.json', report);
  console.log(JSON.stringify(report.created));
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? '')) {
  if (args.includes('--offline') && args.includes('--apply')) throw new Error('No se puede aplicar una vista offline.');
  const state = args.includes('--offline') ? JSON.parse(fs.readFileSync(path.join(out, 'before-remote.json'), 'utf8')).state : await query(stateQuery);
  if (args.includes('--snapshot')) {
    const filename = production ? 'before-remote.json' : 'before-local.json';
    if (!fs.existsSync(path.join(out, filename))) save(filename, { capturedAt: new Date().toISOString(), state });
  }
  const rows = await readExcel();
  const originalPath = path.join(out, production ? 'before-remote.json' : 'before-local.json');
  const original = fs.existsSync(originalPath) ? JSON.parse(fs.readFileSync(originalPath, 'utf8')).state : state;
  const plan = buildPlan(rows, state, original);
  save(production ? 'preview-remote.json' : 'preview-local.json', plan);
  console.log(JSON.stringify({ ...plan.totals, mappings: plan.mappings.filter(v => v.type === 'modulo'), issues: plan.issues.slice(0, 30) }, null, 2));
  if (args.includes('--apply')) await applyPlan(plan, state);
}
