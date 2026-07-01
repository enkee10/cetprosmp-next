import { https } from "firebase-functions/v1";
import {
  asNullableString,
  asNullableTimestamp,
  buildCalendarioDataFromInput,
  buildEventoDataFromInput,
  getIdFromKeyOutput,
  toBoolean,
  toNumber,
  toNumberOrNull,
} from "../core/userMappers.js";
import { dataConnect } from "../core/dataConnectCore.js";
import {
  DataConnectCalendario,
  DataConnectCalendarioInput,
  DataConnectEvento,
  DataConnectEventoInput,
  DataConnectEventoOcurrencia,
  DataConnectEventoOcurrenciaInput,
  DataConnectEventoRecurrencia,
  DataConnectEventoRecurrenciaInput,
  DataConnectEventoRelacionInput,
  DataConnectGrupo,
  DataConnectHorario,
  DataConnectTurno,
} from "../core/types.js";
import {
  DELETE_CALENDARIO_MUTATION,
  DELETE_EVENTO_MUTATION,
  DELETE_EVENTO_RELACIONES_BY_EVENTO_MUTATION,
  INSERT_CALENDARIO_MUTATION,
  INSERT_EVENTO_MUTATION,
  INSERT_EVENTO_OCURRENCIA_MUTATION,
  INSERT_EVENTO_RECURRENCIA_MUTATION,
  INSERT_EVENTO_RELACION_MUTATION,
  UPDATE_CALENDARIO_MUTATION,
  UPDATE_EVENTO_MUTATION,
  UPDATE_EVENTO_OCURRENCIA_MUTATION,
  UPDATE_EVENTO_RECURRENCIA_MUTATION,
} from "../../dataconnectOperations.js";

const LIST_CALENDARIOS_QUERY = `
  query ListCalendariosManual {
    calendarios(limit: 500) {
      id
      titulo
      descripcion
      inicio
      fin
      duracion
      color
      activo
      fechaCreacion
      fechaActualizacion
      anioId
      semestreId
      semestre {
        titulo
        fin
      }
      horarioId
      horario {
        nombre
      }
    }
  }
`;

const GET_CALENDARIO_QUERY = `
  query GetCalendarioManual($id: Int!) {
    calendario(id: $id) {
      id
      titulo
      descripcion
      inicio
      fin
      duracion
      color
      activo
      fechaCreacion
      fechaActualizacion
      anioId
      semestreId
      semestre {
        titulo
        fin
      }
      horarioId
      horario {
        nombre
      }
    }
  }
`;

const LIST_EVENTOS_QUERY = `
  query ListEventosManual {
    eventos(limit: 1000) {
      id
      titulo
      descripcion
      tipoEvento
      fechaInicio
      fechaFin
      todoElDia
      ubicacion
      color
      estado
      fechaCreacion
      fechaActualizacion
      calendarioId
      semestreId
      relaciones: eventoRelaciones_on_evento(limit: 100) {
        id
        entidadTipo
        entidadId
        fechaCreacion
        fechaActualizacion
        eventoId
      }
      recurrencias: eventoRecurrencias_on_evento(limit: 5, orderBy: [{ id: ASC }]) {
        id
        frecuencia
        intervalo
        diasSemana
        diaMes
        semanaMes
        fechaInicio
        fechaFin
        cantidadOcurrencias
        reglaEspecial
        activo
        fechaCreacion
        fechaActualizacion
        eventoId
        horarioId
        horario {
          id
          nombre
          regla
          diasSemana
          viernesAlternoInicio
        }
        turnoId
        turno {
          id
          nombre
          horaInicio
          horaFin
        }
      }
      ocurrencias: eventoOcurrencias_on_evento(limit: 500, orderBy: [{ numeroOcurrencia: ASC }, { id: ASC }]) {
        id
        fechaInicio
        fechaFin
        numeroOcurrencia
        tipoOcurrencia
        estado
        observacion
        fechaCreacion
        fechaActualizacion
        eventoId
        recurrenciaId
        grupoId
      }
    }
  }
`;

const GET_EVENTO_SCHEDULE_QUERY = `
  query GetEventoScheduleManual($id: Int!) {
    evento(id: $id) {
      id
      recurrencias: eventoRecurrencias_on_evento(limit: 5, orderBy: [{ id: ASC }]) {
        id
        frecuencia
        intervalo
        diasSemana
        diaMes
        semanaMes
        fechaInicio
        fechaFin
        cantidadOcurrencias
        reglaEspecial
        activo
        fechaCreacion
        fechaActualizacion
        eventoId
        horarioId
        horario {
          id
          nombre
          regla
          diasSemana
          viernesAlternoInicio
        }
        turnoId
        turno {
          id
          nombre
          horaInicio
          horaFin
        }
      }
      ocurrencias: eventoOcurrencias_on_evento(limit: 500, orderBy: [{ numeroOcurrencia: ASC }, { id: ASC }]) {
        id
        fechaInicio
        fechaFin
        numeroOcurrencia
        tipoOcurrencia
        estado
        observacion
        fechaCreacion
        fechaActualizacion
        eventoId
        recurrenciaId
        grupoId
      }
    }
  }
`;

const GET_EVENTO_QUERY = `
  query GetEventoManual($id: Int!) {
    evento(id: $id) {
      id
      titulo
      descripcion
      tipoEvento
      fechaInicio
      fechaFin
      todoElDia
      ubicacion
      color
      estado
      fechaCreacion
      fechaActualizacion
      calendarioId
      semestreId
      relaciones: eventoRelaciones_on_evento(limit: 100) {
        id
        entidadTipo
        entidadId
        fechaCreacion
        fechaActualizacion
        eventoId
      }
      recurrencias: eventoRecurrencias_on_evento(limit: 5, orderBy: [{ id: ASC }]) {
        id
        frecuencia
        intervalo
        diasSemana
        diaMes
        semanaMes
        fechaInicio
        fechaFin
        cantidadOcurrencias
        reglaEspecial
        activo
        fechaCreacion
        fechaActualizacion
        eventoId
        horarioId
        horario {
          id
          nombre
          regla
          diasSemana
          viernesAlternoInicio
        }
        turnoId
        turno {
          id
          nombre
          horaInicio
          horaFin
        }
      }
      ocurrencias: eventoOcurrencias_on_evento(limit: 500, orderBy: [{ numeroOcurrencia: ASC }, { id: ASC }]) {
        id
        fechaInicio
        fechaFin
        numeroOcurrencia
        tipoOcurrencia
        estado
        observacion
        fechaCreacion
        fechaActualizacion
        eventoId
        recurrenciaId
        grupoId
      }
    }
  }
`;

const LIST_GRUPOS_QUERY = `
  query ListGruposManual {
    grupos(limit: 1000) {
      id
      turnoNombre
      descripcion
      nombreDisplay
      estado
      archivado
      semestreId
      personalId
      paqueteId
      turnoId
      horarioId
      grupoOrd
    }
  }
`;

const GET_HORARIO_FOR_RECURRENCIA_QUERY = `
  query GetHorarioForRecurrencia($id: Int!) {
    horario(id: $id) {
      id
      nombre
      regla
      diasSemana
      viernesAlternoInicio
    }
  }
`;

const GET_TURNO_FOR_RECURRENCIA_QUERY = `
  query GetTurnoForRecurrencia($id: Int!) {
    turno(id: $id) {
      id
      nombre
      horaInicio
      horaFin
    }
  }
`;

const GET_SEMESTRE_FOR_RECURRENCIA_QUERY = `
  query GetSemestreForRecurrencia($id: Int!) {
    semestre(id: $id) {
      id
      titulo
    }
  }
`;

function requireLevel(context: https.CallableContext, action: string) {
  const requesterLevel = context.auth?.token?.level ?? 0;
  if (requesterLevel < 600) {
    throw new https.HttpsError("permission-denied", `You do not have permission to ${action}.`);
  }
}

const sortByTitle = <T extends { titulo?: string | null; id: number }>(items: T[]) =>
  items.slice().sort((a, b) => String(a.titulo ?? "").localeCompare(String(b.titulo ?? ""), "es") || a.id - b.id);

const EVENTO_RELACION_TIPOS = new Set([
  "grupo",
  "grupo_modulo",
  "modulo",
  "unidad_didactica",
  "capacidad_terminal",
  "indicador_capacidad",
  "aprendizaje",
  "actividad",
  "grupo_unidad_didactica",
  "grupo_unidad_didactica_actividad",
]);

function getInputArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
}

function buildEventoRelacionesFromInput(input: Record<string, unknown>, eventoId: number, now: string) {
  const seen = new Set<string>();

  return getInputArray(input.relaciones).reduce<DataConnectEventoRelacionInput[]>((acc, item) => {
    const entidadTipo = asNullableString(item.entidadTipo);
    const entidadId = toNumberOrNull(item.entidadId);
    if (!entidadTipo || !EVENTO_RELACION_TIPOS.has(entidadTipo) || !entidadId) return acc;

    const key = `${entidadTipo}:${entidadId}`;
    if (seen.has(key)) return acc;
    seen.add(key);

    acc.push({
      entidadTipo,
      entidadId,
      eventoId,
      fechaCreacion: now,
      fechaActualizacion: now,
    });
    return acc;
  }, []);
}

function buildEventoRecurrenciaFromInput(
  input: Record<string, unknown>,
  evento: DataConnectEventoInput,
  eventoId: number,
  now: string,
): DataConnectEventoRecurrenciaInput | null {
  const raw = typeof input.recurrencia === "object" && input.recurrencia !== null
    ? input.recurrencia as Record<string, unknown>
    : null;
  if (!raw || !toBoolean(raw.activo)) return null;

  const frecuencia = asNullableString(raw.frecuencia) ?? "semanal";
  const intervalo = Math.max(1, toNumber(raw.intervalo, 1));
  const fechaInicio = asNullableTimestamp(raw.fechaInicio) ?? evento.fechaInicio ?? null;
  const fechaFin = asNullableTimestamp(raw.fechaFin) ?? null;
  const cantidadOcurrencias = toNumberOrNull(raw.cantidadOcurrencias);

  if (!fechaInicio) {
    throw new https.HttpsError("invalid-argument", "fechaInicio is required to create recurrence.");
  }

  return {
    frecuencia,
    intervalo,
    diasSemana: asNullableString(raw.diasSemana),
    diaMes: toNumberOrNull(raw.diaMes),
    semanaMes: toNumberOrNull(raw.semanaMes),
    fechaInicio,
    fechaFin,
    cantidadOcurrencias,
    reglaEspecial: asNullableString(raw.reglaEspecial),
    activo: true,
    fechaCreacion: now,
    fechaActualizacion: now,
    eventoId,
    horarioId: toNumberOrNull(raw.horarioId),
    turnoId: toNumberOrNull(raw.turnoId),
  };
}

const addDays = (date: Date, days: number) => {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const addMonths = (date: Date, months: number, dayOfMonth?: number | null) => {
  const next = new Date(date.getTime());
  const targetDay = Math.max(1, Math.min(31, dayOfMonth ?? date.getUTCDate()));
  next.setUTCMonth(next.getUTCMonth() + months, 1);
  const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
  next.setUTCDate(Math.min(targetDay, lastDay));
  return next;
};

const parseDiasSemana = (diasSemana?: string | null) =>
  (diasSemana || "")
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6);

const buildDiasSemanaKey = (diasSemana: number[]) =>
  Array.from(new Set(diasSemana))
    .sort((a, b) => a - b)
    .join(",");

const getNumeroSemestreFromTitulo = (semestreTitulo?: string | null) => {
  const lastChar = String(semestreTitulo ?? "").trim().slice(-1);
  return lastChar === "1" || lastChar === "2" ? lastChar : null;
};

const getSemestreCodigoFromTitulo = (semestreTitulo?: string | null) => {
  const text = String(semestreTitulo ?? "").trim();
  const yearMatches = text.match(/\d{4}/g);
  if (yearMatches?.length) return yearMatches[yearMatches.length - 1];
  const digits = text.replace(/\D/g, "");
  return digits.slice(-4) || text;
};

const hasViernesIntercalableMarker = (horario: DataConnectHorario | null) => {
  const nombre = String(horario?.nombre ?? "").toLowerCase();
  const regla = String(horario?.regla ?? "").toUpperCase();
  return /@\s*vie/.test(nombre) || regla.includes("VIE@");
};

const applyTurnoTime = (date: Date, timeSource?: string | null) => {
  if (!timeSource) return new Date(date.getTime());
  const time = new Date(timeSource);
  if (Number.isNaN(time.getTime())) return new Date(date.getTime());

  const result = new Date(date.getTime());
  result.setUTCHours(time.getUTCHours(), time.getUTCMinutes(), time.getUTCSeconds(), time.getUTCMilliseconds());
  return result;
};

const resolveViernesAlternoInicio = (
  horario: DataConnectHorario | null,
  semestreTitulo: string | null | undefined,
  diasSemana: number[],
) => {
  if (!diasSemana.includes(5)) return null;
  if (!hasViernesIntercalableMarker(horario)) return null;
  if (horario?.viernesAlternoInicio === "primer" || horario?.viernesAlternoInicio === "segundo") {
    return horario.viernesAlternoInicio;
  }

  const numeroSemestre = getNumeroSemestreFromTitulo(semestreTitulo);
  if (!numeroSemestre) return null;

  const diasKey = buildDiasSemanaKey(diasSemana);
  if (numeroSemestre === "1") return diasKey === "1,3,5" ? "primer" : "segundo";
  return diasKey === "2,4,5" ? "primer" : "segundo";
};

const shouldIncludeAlternatingFriday = (date: Date, fridayIndex: number, viernesAlternoInicio?: string | null) => {
  if (date.getUTCDay() !== 5 || !viernesAlternoInicio) return true;
  if (viernesAlternoInicio === "segundo") return fridayIndex % 2 === 1;
  return fridayIndex % 2 === 0;
};

function generateEventoOcurrencias(
  evento: DataConnectEventoInput,
  recurrencia: DataConnectEventoRecurrenciaInput,
  recurrenciaId: number,
  now: string,
  horario?: DataConnectHorario | null,
  turno?: DataConnectTurno | null,
  semestreTitulo?: string | null,
): DataConnectEventoOcurrenciaInput[] {
  const start = new Date(recurrencia.fechaInicio ?? evento.fechaInicio ?? "");
  if (Number.isNaN(start.getTime())) return [];

  const eventStart = evento.fechaInicio ? new Date(evento.fechaInicio) : start;
  const eventEnd = evento.fechaFin ? new Date(evento.fechaFin) : eventStart;
  const duration = !Number.isNaN(eventEnd.getTime()) && eventEnd.getTime() > eventStart.getTime()
    ? eventEnd.getTime() - eventStart.getTime()
    : 0;

  const maxByCount = recurrencia.cantidadOcurrencias && recurrencia.cantidadOcurrencias > 0
    ? Math.min(recurrencia.cantidadOcurrencias, 200)
    : 16;
  const until = recurrencia.fechaFin ? new Date(recurrencia.fechaFin) : null;
  const intervalo = Math.max(1, recurrencia.intervalo ?? 1);
  const frecuencia = recurrencia.frecuencia || "semanal";
  const diasSemana = parseDiasSemana(horario?.diasSemana ?? recurrencia.diasSemana);
  const viernesAlternoInicio = resolveViernesAlternoInicio(horario ?? null, semestreTitulo, diasSemana);
  const results: DataConnectEventoOcurrenciaInput[] = [];

  const pushOccurrence = (date: Date) => {
    if (until && date.getTime() > until.getTime()) return false;
    const occurrenceStart = turno?.horaInicio ? applyTurnoTime(date, turno.horaInicio) : date;
    let occurrenceEnd = turno?.horaFin
      ? applyTurnoTime(date, turno.horaFin)
      : duration > 0
        ? new Date(occurrenceStart.getTime() + duration)
        : new Date(occurrenceStart.getTime());
    if (turno?.horaFin && occurrenceEnd.getTime() <= occurrenceStart.getTime()) {
      occurrenceEnd = addDays(occurrenceEnd, 1);
    }
    results.push({
      fechaInicio: occurrenceStart.toISOString(),
      fechaFin: occurrenceEnd.toISOString(),
      numeroOcurrencia: results.length + 1,
      tipoOcurrencia: "generada",
      estado: evento.estado || "programado",
      observacion: null,
      fechaCreacion: now,
      fechaActualizacion: now,
      eventoId: recurrencia.eventoId,
      recurrenciaId,
      grupoId: null,
    });
    return results.length < maxByCount;
  };

  if (frecuencia === "diaria") {
    for (let current = start; results.length < maxByCount; current = addDays(current, intervalo)) {
      if (!pushOccurrence(current)) break;
    }
    return results;
  }

  if (frecuencia === "mensual") {
    for (let current = addMonths(start, 0, recurrencia.diaMes); results.length < maxByCount; current = addMonths(current, intervalo, recurrencia.diaMes)) {
      if (!pushOccurrence(current)) break;
    }
    return results;
  }

  if (diasSemana.length) {
    const maxScanDays = 366 * 2;
    let fridayIndex = 0;
    for (let offset = 0; offset <= maxScanDays && results.length < maxByCount; offset += 1) {
      const current = addDays(start, offset);
      const weeksFromStart = Math.floor(offset / 7);
      const isFriday = current.getUTCDay() === 5;
      const currentFridayIndex = fridayIndex;
      if (isFriday) fridayIndex += 1;
      if (weeksFromStart % intervalo !== 0 || !diasSemana.includes(current.getUTCDay())) continue;
      if (!shouldIncludeAlternatingFriday(current, currentFridayIndex, viernesAlternoInicio)) continue;
      if (!pushOccurrence(current)) break;
    }
    return results;
  }

  for (let current = start; results.length < maxByCount; current = addDays(current, intervalo * 7)) {
    if (!pushOccurrence(current)) break;
  }
  return results;
}

async function syncEventoRelaciones(eventoId: number, relaciones: DataConnectEventoRelacionInput[]) {
  await dataConnect.executeGraphql<{ eventoRelacion_deleteMany: number }, { eventoId: number }>(
    DELETE_EVENTO_RELACIONES_BY_EVENTO_MUTATION,
    { variables: { eventoId } },
  );

  for (const relacion of relaciones) {
    await dataConnect.executeGraphql<
      { eventoRelacion_insert: unknown },
      { data: DataConnectEventoRelacionInput }
    >(INSERT_EVENTO_RELACION_MUTATION, { variables: { data: relacion } });
  }
}

async function getEventoSchedule(eventoId: number) {
  const response = await dataConnect.executeGraphql<
    {
      evento: {
        id: number;
        recurrencias?: DataConnectEventoRecurrencia[];
        ocurrencias?: DataConnectEventoOcurrencia[];
      } | null;
    },
    { id: number }
  >(GET_EVENTO_SCHEDULE_QUERY, { variables: { id: eventoId } });

  return {
    recurrencias: response.data.evento?.recurrencias ?? [],
    ocurrencias: response.data.evento?.ocurrencias ?? [],
  };
}

async function getRecurrenciaCatalogos(recurrencia: DataConnectEventoRecurrenciaInput) {
  const [horarioResponse, turnoResponse] = await Promise.all([
    recurrencia.horarioId
      ? dataConnect.executeGraphql<{ horario: DataConnectHorario | null }, { id: number }>(
        GET_HORARIO_FOR_RECURRENCIA_QUERY,
        { variables: { id: recurrencia.horarioId } },
      )
      : Promise.resolve({ data: { horario: null } }),
    recurrencia.turnoId
      ? dataConnect.executeGraphql<{ turno: DataConnectTurno | null }, { id: number }>(
        GET_TURNO_FOR_RECURRENCIA_QUERY,
        { variables: { id: recurrencia.turnoId } },
      )
      : Promise.resolve({ data: { turno: null } }),
  ]);

  return {
    horario: horarioResponse.data.horario,
    turno: turnoResponse.data.turno,
  };
}

async function getSemestreTitulo(semestreId?: number | null) {
  if (!semestreId) return null;

  const response = await dataConnect.executeGraphql<
    { semestre: { id: number; titulo?: string | null } | null },
    { id: number }
  >(GET_SEMESTRE_FOR_RECURRENCIA_QUERY, { variables: { id: semestreId } });

  return response.data.semestre?.titulo ?? null;
}

async function getHorarioNombre(horarioId?: number | null) {
  if (!horarioId) return null;

  const response = await dataConnect.executeGraphql<
    { horario: { id: number; nombre?: string | null } | null },
    { id: number }
  >(GET_HORARIO_FOR_RECURRENCIA_QUERY, { variables: { id: horarioId } });

  return response.data.horario?.nombre ?? null;
}

async function buildCalendarioTitulo(payload: DataConnectCalendarioInput) {
  if (!payload.semestreId || !payload.horarioId || payload.duracion == null) {
    throw new https.HttpsError(
      "invalid-argument",
      "semestreId, horarioId and duracion are required to build calendario titulo.",
    );
  }

  const [semestreTitulo, horarioNombre] = await Promise.all([
    getSemestreTitulo(payload.semestreId),
    getHorarioNombre(payload.horarioId),
  ]);

  return [
    getSemestreCodigoFromTitulo(semestreTitulo),
    String(horarioNombre ?? "").trim(),
    String(payload.duracion),
  ].filter(Boolean).join(" ");
}

async function syncEventoOcurrencias(
  eventoId: number,
  desired: DataConnectEventoOcurrenciaInput[],
  existing: DataConnectEventoOcurrencia[],
  now: string,
) {
  for (let index = 0; index < desired.length; index += 1) {
    const data = desired[index];
    const current = existing[index];
    if (current?.id) {
      await dataConnect.executeGraphql<
        { eventoOcurrencia_update: unknown },
        { id: number; data: DataConnectEventoOcurrenciaInput }
      >(UPDATE_EVENTO_OCURRENCIA_MUTATION, { variables: { id: current.id, data } });
    } else {
      await dataConnect.executeGraphql<
        { eventoOcurrencia_insert: unknown },
        { data: DataConnectEventoOcurrenciaInput }
      >(INSERT_EVENTO_OCURRENCIA_MUTATION, { variables: { data } });
    }
  }

  for (let index = desired.length; index < existing.length; index += 1) {
    const current = existing[index];
    if (!current?.id) continue;
    await dataConnect.executeGraphql<
      { eventoOcurrencia_update: unknown },
      { id: number; data: DataConnectEventoOcurrenciaInput }
    >(UPDATE_EVENTO_OCURRENCIA_MUTATION, {
      variables: {
        id: current.id,
        data: {
          estado: "cancelado",
          fechaActualizacion: now,
          eventoId,
        },
      },
    });
  }
}

async function syncEventoRecurrenciaYOcurrencias(
  eventoId: number,
  evento: DataConnectEventoInput,
  recurrencia: DataConnectEventoRecurrenciaInput | null,
  generarOcurrencias: boolean,
  now: string,
) {
  const schedule = await getEventoSchedule(eventoId);
  const existingRecurrencia = schedule.recurrencias[0];

  if (!recurrencia) {
    if (existingRecurrencia?.id) {
      await dataConnect.executeGraphql<
        { eventoRecurrencia_update: unknown },
        { id: number; data: DataConnectEventoRecurrenciaInput }
      >(UPDATE_EVENTO_RECURRENCIA_MUTATION, {
        variables: {
          id: existingRecurrencia.id,
          data: {
            activo: false,
            fechaActualizacion: now,
            eventoId,
          },
        },
      });
    }
    return;
  }

  let recurrenciaId: number | null = existingRecurrencia?.id ?? null;
  if (recurrenciaId) {
    await dataConnect.executeGraphql<
      { eventoRecurrencia_update: unknown },
      { id: number; data: DataConnectEventoRecurrenciaInput }
    >(UPDATE_EVENTO_RECURRENCIA_MUTATION, { variables: { id: recurrenciaId, data: recurrencia } });
  } else {
    const created = await dataConnect.executeGraphql<
      { eventoRecurrencia_insert: unknown },
      { data: DataConnectEventoRecurrenciaInput }
    >(INSERT_EVENTO_RECURRENCIA_MUTATION, { variables: { data: recurrencia } });
    recurrenciaId = getIdFromKeyOutput(created.data.eventoRecurrencia_insert);
  }

  if (!generarOcurrencias || !recurrenciaId) return;

  const { horario, turno } = await getRecurrenciaCatalogos(recurrencia);
  const semestreTitulo = await getSemestreTitulo(evento.semestreId);
  const desired = generateEventoOcurrencias(evento, recurrencia, recurrenciaId, now, horario, turno, semestreTitulo);
  await syncEventoOcurrencias(eventoId, desired, schedule.ocurrencias, now);
}

export const listCalendarios = https.onCall(async (_data, context) => {
  requireLevel(context, "list calendars");

  try {
    const response = await dataConnect.executeGraphql<{ calendarios: DataConnectCalendario[] }, Record<string, never>>(
      LIST_CALENDARIOS_QUERY,
    );
    return { calendarios: sortByTitle(response.data.calendarios ?? []) };
  } catch (error) {
    console.error("Error in listCalendarios:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while listing calendars.");
  }
});

export const getCalendario = https.onCall(async (data, context) => {
  requireLevel(context, "get calendars");

  const calendarioId = toNumber(data?.id, -1);
  if (calendarioId <= 0) {
    throw new https.HttpsError("invalid-argument", "id is required.");
  }

  try {
    const response = await dataConnect.executeGraphql<{ calendario: DataConnectCalendario | null }, { id: number }>(
      GET_CALENDARIO_QUERY,
      { variables: { id: calendarioId } },
    );
    return { calendario: response.data.calendario ?? null };
  } catch (error) {
    console.error("Error in getCalendario:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while getting calendar.");
  }
});

export const createOrUpdateCalendario = https.onCall(async (data, context) => {
  requireLevel(context, "mutate calendars");

  const payload = buildCalendarioDataFromInput(data as Record<string, unknown>);

  const now = new Date().toISOString();
  payload.fechaActualizacion = now;
  if (!toNumberOrNull(data?.id)) {
    payload.fechaCreacion = payload.fechaCreacion ?? now;
  }

  const calendarioId = toNumberOrNull(data?.id);

  try {
    payload.titulo = await buildCalendarioTitulo(payload);
    if (!payload.titulo) {
      throw new https.HttpsError("invalid-argument", "titulo is required.");
    }

    if (calendarioId) {
      const updated = await dataConnect.executeGraphql<
        { calendario_update: unknown },
        { id: number; data: DataConnectCalendarioInput }
      >(UPDATE_CALENDARIO_MUTATION, { variables: { id: calendarioId, data: payload } });

      return { id: getIdFromKeyOutput(updated.data.calendario_update) ?? calendarioId };
    }

    const created = await dataConnect.executeGraphql<
      { calendario_insert: unknown },
      { data: DataConnectCalendarioInput }
    >(INSERT_CALENDARIO_MUTATION, { variables: { data: payload } });

    return { id: getIdFromKeyOutput(created.data.calendario_insert) };
  } catch (error) {
    if (error instanceof https.HttpsError) throw error;
    console.error("Error in createOrUpdateCalendario:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while saving calendar.");
  }
});

export const deleteCalendario = https.onCall(async (data, context) => {
  requireLevel(context, "delete calendars");

  const calendarioId = toNumber(data?.id, -1);
  if (calendarioId <= 0) {
    throw new https.HttpsError("invalid-argument", "id is required.");
  }

  try {
    const deleted = await dataConnect.executeGraphql<{ calendario_delete: unknown }, { id: number }>(
      DELETE_CALENDARIO_MUTATION,
      { variables: { id: calendarioId } },
    );
    return { id: getIdFromKeyOutput(deleted.data.calendario_delete) ?? calendarioId };
  } catch (error) {
    console.error("Error in deleteCalendario:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while deleting calendar.");
  }
});

export const listEventos = https.onCall(async (_data, context) => {
  requireLevel(context, "list events");

  try {
    const response = await dataConnect.executeGraphql<{ eventos: DataConnectEvento[] }, Record<string, never>>(
      LIST_EVENTOS_QUERY,
    );
    const eventos = (response.data.eventos ?? [])
      .slice()
      .sort((a, b) => String(a.fechaInicio ?? "").localeCompare(String(b.fechaInicio ?? "")) || a.id - b.id);
    return { eventos };
  } catch (error) {
    console.error("Error in listEventos:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while listing events.");
  }
});

export const getEvento = https.onCall(async (data, context) => {
  requireLevel(context, "get events");

  const eventoId = toNumber(data?.id, -1);
  if (eventoId <= 0) {
    throw new https.HttpsError("invalid-argument", "id is required.");
  }

  try {
    const response = await dataConnect.executeGraphql<{ evento: DataConnectEvento | null }, { id: number }>(
      GET_EVENTO_QUERY,
      { variables: { id: eventoId } },
    );
    return { evento: response.data.evento ?? null };
  } catch (error) {
    console.error("Error in getEvento:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while getting event.");
  }
});

export const createOrUpdateEvento = https.onCall(async (data, context) => {
  requireLevel(context, "mutate events");

  const payload = buildEventoDataFromInput(data as Record<string, unknown>);
  if (!payload.titulo) {
    throw new https.HttpsError("invalid-argument", "titulo is required.");
  }
  if (!payload.calendarioId) {
    throw new https.HttpsError("invalid-argument", "calendarioId is required.");
  }

  const now = new Date().toISOString();
  payload.fechaActualizacion = now;
  if (!toNumberOrNull(data?.id)) {
    payload.fechaCreacion = payload.fechaCreacion ?? now;
  }

  const eventoId = toNumberOrNull(data?.id);

  try {
    let savedEventoId: number | null = null;
    if (eventoId) {
      const updated = await dataConnect.executeGraphql<
        { evento_update: unknown },
        { id: number; data: DataConnectEventoInput }
      >(UPDATE_EVENTO_MUTATION, { variables: { id: eventoId, data: payload } });

      savedEventoId = getIdFromKeyOutput(updated.data.evento_update) ?? eventoId;
    } else {
      const created = await dataConnect.executeGraphql<
        { evento_insert: unknown },
        { data: DataConnectEventoInput }
      >(INSERT_EVENTO_MUTATION, { variables: { data: payload } });

      savedEventoId = getIdFromKeyOutput(created.data.evento_insert);
    }

    if (!savedEventoId) {
      throw new https.HttpsError("internal", "Evento was saved but no id was returned.");
    }

    const relaciones = buildEventoRelacionesFromInput(data as Record<string, unknown>, savedEventoId, now);
    const recurrencia = buildEventoRecurrenciaFromInput(data as Record<string, unknown>, payload, savedEventoId, now);
    const generarOcurrencias = toBoolean((data as Record<string, unknown>)?.generarOcurrencias) ?? false;

    await syncEventoRelaciones(savedEventoId, relaciones);
    await syncEventoRecurrenciaYOcurrencias(savedEventoId, payload, recurrencia, generarOcurrencias, now);

    return { id: savedEventoId };
  } catch (error) {
    if (error instanceof https.HttpsError) throw error;
    console.error("Error in createOrUpdateEvento:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while saving event.");
  }
});

export const deleteEvento = https.onCall(async (data, context) => {
  requireLevel(context, "delete events");

  const eventoId = toNumber(data?.id, -1);
  if (eventoId <= 0) {
    throw new https.HttpsError("invalid-argument", "id is required.");
  }

  try {
    const deleted = await dataConnect.executeGraphql<{ evento_delete: unknown }, { id: number }>(
      DELETE_EVENTO_MUTATION,
      { variables: { id: eventoId } },
    );
    return { id: getIdFromKeyOutput(deleted.data.evento_delete) ?? eventoId };
  } catch (error) {
    console.error("Error in deleteEvento:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while deleting event.");
  }
});

export const listGrupos = https.onCall(async (_data, context) => {
  requireLevel(context, "list groups");

  try {
    const response = await dataConnect.executeGraphql<{ grupos: DataConnectGrupo[] }, Record<string, never>>(
      LIST_GRUPOS_QUERY,
    );
    const grupos = (response.data.grupos ?? [])
      .slice()
      .sort((a, b) =>
        String(a.nombreDisplay ?? "").localeCompare(String(b.nombreDisplay ?? ""), "es", { numeric: true }) ||
        a.id - b.id,
      );
    return { grupos };
  } catch (error) {
    console.error("Error in listGrupos:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while listing groups.");
  }
});
