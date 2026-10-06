import { https, runWith } from "firebase-functions/v1";
import { createHash } from "node:crypto";
import { dataConnect } from "../core/dataConnectCore.js";
import { requirePermission } from "../core/permissions.js";
import { DataConnectEvento, DataConnectEventoInput } from "../core/types.js";
import { generateEventoOcurrencias } from "./handlers.js";
import { BusyInterval, distributeHours, limaDay, ScheduleRules, validateRules } from "./scheduling.js";

const eventFields = `id titulo descripcion tipoEvento fechaInicio fechaFin todoElDia ubicacion color estado calendarioId
  minutosHoraAcademica computaHoras programacionHorariaId
  relaciones:eventoRelaciones_on_evento(limit:100) { entidadTipo entidadId }
  ocurrencias:eventoOcurrencias_on_evento(limit:1500) { id fechaInicio fechaFin estado numeroOcurrencia recurrenciaId grupoId }
  recurrencias:eventoRecurrencias_on_evento(limit:5) { id eventoId frecuencia intervalo diasSemana diaMes fechaInicio fechaFin cantidadOcurrencias activo
    horario { id nombre regla diasSemana viernesAlternoInicio } turno { id nombre horaInicio horaFin } }
  semestre { titulo }`;

export interface AgendaEvent {
  id: string; eventoId: number; ocurrenciaId: number | null; titulo: string; descripcion: string | null;
  calendarioId: number; fechaInicio: string; fechaFin: string; tipoEvento: string | null;
  todoElDia: boolean; color: string | null; estado: string | null; ubicacion: string | null;
  minutosHoraAcademica: number; computaHoras: boolean; programacionHorariaId: number | null;
  grupoIds: number[]; grupoModuloIds: number[]; relaciones: { entidadTipo?: string | null; entidadId?: number | null }[];
}
interface CalendarRow { id: number; titulo: string | null; color: string | null; activo: boolean | null; inicio: string | null; fin: string | null }
interface GroupModuleRow { id: number; nombre: string | null; grupoId: number; calendarioId: number | null; modulo: { titulo: string | null; horas: number | null }; grupo: { nombreDisplay: string | null } }
type EventRow = DataConnectEvento & { semestre?: { titulo?: string | null }; minutosHoraAcademica?: number | null; computaHoras?: boolean | null; programacionHorariaId?: number | null };

export async function loadAgenda(inicio: string, fin: string) {
  const options = await dataConnect.executeGraphql<{ calendarios: CalendarRow[]; grupoModulos: GroupModuleRow[] }, Record<string, never>>(`query AgendaOptions {
    calendarios(limit:10000) { id titulo color activo inicio fin }
    grupoModulos(limit:10000) { id nombre grupoId calendarioId modulo { titulo horas } grupo { nombreDisplay } }
  }`);
  if (options.data.calendarios.length === 10000 || options.data.grupoModulos.length === 10000) throw new https.HttpsError("resource-exhausted", "Demasiadas opciones para el calendario.");
  const sources: EventRow[] = [];
  for (let offset = 0; ; offset += 500) {
    const page = await dataConnect.executeGraphql<{ eventos: EventRow[] }, { inicio: string; fin: string; offset: number }>(`query AgendaEvents($inicio:Timestamp!, $fin:Timestamp!, $offset:Int!) {
      eventos(where:{_or:[
        {fechaInicio:{lt:$fin},fechaFin:{gt:$inicio}},
        {eventoOcurrencias_on_evento:{exist:{fechaInicio:{lt:$fin},fechaFin:{gt:$inicio}}}},
        {eventoRecurrencias_on_evento:{exist:{fechaInicio:{lt:$fin},activo:{eq:true}}}}
      ]},limit:500,offset:$offset,orderBy:[{id:ASC}]) { ${eventFields} }
    }`, { variables: { inicio, fin, offset } });
    sources.push(...page.data.eventos);
    if (page.data.eventos.length < 500) break;
    if (offset >= 9500) throw new https.HttpsError("resource-exhausted", "Acorta el intervalo de consulta.");
  }
  const groupByModule = new Map(options.data.grupoModulos.map(row => [row.id, row.grupoId]));
  const eventos: AgendaEvent[] = [];
  for (const event of sources) {
    if ((event.ocurrencias?.length ?? 0) >= 1500) throw new https.HttpsError("resource-exhausted", "Un evento supera el límite de ocurrencias.");
    const occurrences = event.ocurrencias ?? [];
    const projected = (event.recurrencias ?? []).filter(row => row.activo).flatMap(row =>
      generateEventoOcurrencias(event as DataConnectEventoInput, { ...row, activo: row.activo ?? false }, row.id, new Date().toISOString(), row.horario, row.turno, event.semestre?.titulo));
    const savedKeys = new Set(occurrences.map(row => `${row.recurrenciaId}:${row.numeroOcurrencia}`));
    const instances = [...occurrences, ...projected.filter(row => !savedKeys.has(`${row.recurrenciaId}:${row.numeroOcurrencia}`))];
    const relations = event.relaciones ?? [];
    const moduleIds = relations.filter(row => row.entidadTipo === "grupo_modulo" && row.entidadId).map(row => row.entidadId!);
    const groupIds = [...new Set([...moduleIds.map(id => groupByModule.get(id)).filter((id): id is number => !!id),
      ...relations.filter(row => row.entidadTipo === "grupo" && row.entidadId).map(row => row.entidadId!)])];
    for (const instance of instances.length ? instances : [event]) {
      const start = instance.fechaInicio; const end = instance.fechaFin;
      if (!start || !end || Date.parse(start) >= Date.parse(fin) || Date.parse(end) <= Date.parse(inicio) || Date.parse(end) <= Date.parse(start)) continue;
      const occurrence = "numeroOcurrencia" in instance;
      const savedId = "id" in instance ? Number(instance.id) : null;
      eventos.push({ id: occurrence ? `${event.id}:${savedId ?? `r${instance.recurrenciaId}-${instance.numeroOcurrencia}`}` : String(event.id),
        eventoId: event.id, ocurrenciaId: occurrence ? savedId : null,
        titulo: event.titulo || "Sin título", descripcion: event.descripcion ?? null, calendarioId: event.calendarioId,
        fechaInicio: start, fechaFin: end, tipoEvento: event.tipoEvento ?? null, todoElDia: !!event.todoElDia,
        color: event.color ?? null, estado: event.estado === "cancelado" ? "cancelado" : instance.estado ?? event.estado ?? null,
        ubicacion: event.ubicacion ?? null, minutosHoraAcademica: event.minutosHoraAcademica ?? 60,
        computaHoras: event.computaHoras !== false && !event.todoElDia && event.tipoEvento !== "feriado",
        programacionHorariaId: event.programacionHorariaId ?? null, grupoModuloIds: moduleIds, relaciones: relations,
        grupoIds: [...new Set([...groupIds, ...("grupoId" in instance && instance.grupoId ? [instance.grupoId] : [])])] });
    }
  }
  return { ...options.data, eventos };
}

const range = (data: Record<string, unknown>) => {
  const inicio = new Date(String(data.inicio)).toISOString(); const fin = new Date(String(data.fin)).toISOString();
  if (fin <= inicio || Date.parse(fin) - Date.parse(inicio) > 370 * 86400000) throw new Error("El intervalo debe ser de hasta un año.");
  return { inicio, fin };
};

export const getCalendarioAgenda = runWith({ timeoutSeconds: 180 }).https.onCall(async (data, context) => {
  await requirePermission(context, "calendario", "view");
  let dates;
  try { dates = range(data); } catch { throw new https.HttpsError("invalid-argument", "Intervalo de fechas inválido."); }
  return loadAgenda(dates.inicio, dates.fin);
});

async function preview(rules: ScheduleRules) {
  const agenda = await loadAgenda(`${rules.fechaInicio}T05:00:00.000Z`, new Date(Date.parse(`${rules.fechaFin}T00:00:00-05:00`) + 86400000).toISOString());
  const calendar = agenda.calendarios.find(row => row.id === rules.calendarioId);
  if (!calendar || calendar.activo === false) throw new https.HttpsError("invalid-argument", "Selecciona un calendario activo.");
  if ((calendar.inicio && limaDay(calendar.inicio) > rules.fechaInicio) || (calendar.fin && limaDay(calendar.fin) < rules.fechaFin)) {
    throw new https.HttpsError("invalid-argument", "La programación debe quedar dentro del periodo del calendario.");
  }
  const groupModule = rules.grupoModuloId ? agenda.grupoModulos.find(row => row.id === rules.grupoModuloId) : null;
  if (rules.grupoModuloId && !groupModule) throw new https.HttpsError("invalid-argument", "Grupo-módulo inexistente.");
  const activeCalendars = new Set(agenda.calendarios.filter(row => row.activo !== false).map(row => row.id));
  const holidays = new Set<string>(); const busy: BusyInterval[] = [];
  for (const event of agenda.eventos) {
    if (event.estado === "cancelado" || !activeCalendars.has(event.calendarioId)) continue;
    if (event.tipoEvento === "feriado") {
      for (let time = Date.parse(event.fechaInicio); time < Date.parse(event.fechaFin); time += 86400000) holidays.add(limaDay(new Date(time).toISOString()));
    } else if (event.calendarioId === rules.calendarioId || (groupModule && event.grupoIds.includes(groupModule.grupoId))) {
      busy.push({ inicio: event.fechaInicio, fin: event.fechaFin });
    }
  }
  const proposed = distributeHours(rules, holidays, busy);
  if (proposed.sesiones.some(row => (calendar.inicio && Date.parse(row.fechaInicio) < Date.parse(calendar.inicio))
    || (calendar.fin && Date.parse(row.fechaFin) > Date.parse(calendar.fin)))) {
    throw new https.HttpsError("invalid-argument", "Las sesiones deben quedar dentro de las fechas y horas del calendario.");
  }
  const huella = createHash("sha256").update(JSON.stringify({ rules, sesiones: proposed.sesiones })).digest("hex");
  return { ...proposed, reglas: rules, huella, grupoId: groupModule?.grupoId ?? null,
    grupoModuloIdsDelGrupo: groupModule ? agenda.grupoModulos.filter(row => row.grupoId === groupModule.grupoId).map(row => row.id) : [] };
}

async function schedulePermission(context: https.CallableContext, data: Record<string, unknown>) {
  await requirePermission(context, "calendario", "create");
  await requirePermission(context, "eventos", "create");
  if (data.grupoModuloId) await requirePermission(context, "grupo-modulos", "view");
}
const parseRules = (data: Record<string, unknown>) => {
  try { return validateRules(data); } catch (error) { throw new https.HttpsError("invalid-argument", (error as Error).message); }
};
export const previewProgramacionHoraria = runWith({ timeoutSeconds: 180 }).https.onCall(async (data, context) => {
  await schedulePermission(context, data);
  return preview(parseRules(data));
});

export const createProgramacionHoraria = runWith({ timeoutSeconds: 180 }).https.onCall(async (data, context) => {
  await schedulePermission(context, data);
  const rules = parseRules(data);
  const clave = String(data.clave ?? "");
  if (!/^[a-f\d-]{36}$/i.test(clave)) throw new https.HttpsError("invalid-argument", "Clave de solicitud inválida.");
  const existing = await dataConnect.executeGraphql<{ programacionesHorarias: { id: number }[] }, { clave: string }>(
    `query ExistingSchedule($clave:String!) { programacionesHorarias(where:{clave:{eq:$clave}},limit:1) { id } }`, { variables: { clave } });
  if (existing.data.programacionesHorarias.length) return { id: existing.data.programacionesHorarias[0].id, existente: true };
  const proposed = await preview(rules);
  if (data.huella !== proposed.huella) throw new https.HttpsError("failed-precondition", "La agenda cambió. Vuelve a previsualizar antes de guardar.");
  if (!proposed.completa) throw new https.HttpsError("failed-precondition", `Faltan ${proposed.horasPendientes.toFixed(2)} horas. Amplía el periodo o los días disponibles.`);
  const now = new Date().toISOString();
  const scope = `_or:[{calendarioId:{eq:$calendarioId}}${proposed.grupoId ? `,
    {eventoRelaciones_on_evento:{exist:{_or:[{entidadTipo:{eq:"grupo"},entidadId:{eq:${proposed.grupoId}}},
      {entidadTipo:{eq:"grupo_modulo"},entidadId:{in:[${proposed.grupoModuloIdsDelGrupo.join(',')}]}}]}}}` : ''}]`;
  const active = `_and:[{_or:[{estado:{isNull:true}},{estado:{ne:"cancelado"}}]},
    {_or:[{tipoEvento:{isNull:true}},{tipoEvento:{ne:"feriado"}}]},
    {calendario:{_or:[{activo:{isNull:true}},{activo:{eq:true}}]}}]`;
  const checks = rules.evitarCruces ? proposed.sesiones.map((session, index) => `
    b${index}:eventos(where:{_and:[{${scope}},{${active}},{fechaInicio:{lt:${JSON.stringify(session.fechaFin)}},fechaFin:{gt:${JSON.stringify(session.fechaInicio)}},
      eventoOcurrencias_on_evento:{count:{eq:0}},eventoRecurrencias_on_evento:{exist:{activo:{eq:true}},count:{eq:0}}}]},limit:1)
      @check(expr:"this.size() == 0",message:"La agenda cambió. Vuelve a previsualizar.") { id }
    o${index}:eventoOcurrencias(where:{_and:[{evento:{_and:[{${scope}},{${active}}]}},{_or:[{estado:{isNull:true}},{estado:{ne:"cancelado"}}]},
      {fechaInicio:{lt:${JSON.stringify(session.fechaFin)}},fechaFin:{gt:${JSON.stringify(session.fechaInicio)}}}]},limit:1)
      @check(expr:"this.size() == 0",message:"La agenda cambió. Vuelve a previsualizar.") { id }
  `).join('\n') : '';
  const changes = proposed.sesiones.map((session, index) => `s${index}:evento_insert(data:{
    titulo:$titulo,calendarioId:$calendarioId,fechaInicio:${JSON.stringify(session.fechaInicio)},fechaFin:${JSON.stringify(session.fechaFin)},
    minutosHoraAcademica:$minutosHoraAcademica,computaHoras:true,todoElDia:false,tipoEvento:"clase",estado:"programado",
    programacionHorariaId_expr:"response.plan.id",fechaCreacion:$now,fechaActualizacion:$now
  }) ${rules.grupoModuloId ? `r${index}:eventoRelacion_insert(data:{eventoId_expr:"response.s${index}.id",entidadTipo:"grupo_modulo",entidadId:${rules.grupoModuloId},fechaCreacion:$now,fechaActualizacion:$now})` : ""}`);
  try {
    const result = await dataConnect.executeGraphql<{ plan: { id: number } }, Record<string, unknown>>(`mutation SaveSchedule(
    $plan:ProgramacionHoraria_Data! @allow(fields:"clave titulo calendarioId grupoModuloId horasObjetivo minutosHoraAcademica minutosSesion fechaInicio fechaFin diasSemana horaInicio horaFin excluirFeriados evitarCruces fechaCreacion"), $titulo:String!, $calendarioId:Int!, $minutosHoraAcademica:Int!, $now:Timestamp!
  ) @transaction { ${checks ? `query { ${checks} }` : ''} plan:programacionHoraria_insert(data:$plan) ${changes.join("\n")} }`,
  { variables: { plan: { ...rules, clave, fechaCreacion: now }, titulo: rules.titulo, calendarioId: rules.calendarioId, minutosHoraAcademica: rules.minutosHoraAcademica, now } });
    return { id: result.data.plan.id, sesiones: proposed.sesiones.length, horasProgramadas: proposed.horasProgramadas };
  } catch (error) {
    const retry = await dataConnect.executeGraphql<{ programacionesHorarias: { id: number }[] }, { clave: string }>(
      `query SavedSchedule($clave:String!) { programacionesHorarias(where:{clave:{eq:$clave}},limit:1) { id } }`, { variables: { clave } });
    if (retry.data.programacionesHorarias.length) return { id: retry.data.programacionesHorarias[0].id, existente: true };
    console.error("Error al guardar programación horaria", error);
    throw new https.HttpsError("failed-precondition", "No se guardó la programación. Actualiza la agenda y vuelve a previsualizar.");
  }
});
