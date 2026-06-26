import { https } from "firebase-functions/v1";
import {
  buildCalendarioDataFromInput,
  buildEventoDataFromInput,
  getIdFromKeyOutput,
  toNumber,
  toNumberOrNull,
} from "../core/userMappers.js";
import { dataConnect } from "../core/dataConnectCore.js";
import {
  DataConnectCalendario,
  DataConnectCalendarioInput,
  DataConnectEvento,
  DataConnectEventoInput,
  DataConnectGrupo,
} from "../core/types.js";
import {
  DELETE_CALENDARIO_MUTATION,
  DELETE_EVENTO_MUTATION,
  INSERT_CALENDARIO_MUTATION,
  INSERT_EVENTO_MUTATION,
  UPDATE_CALENDARIO_MUTATION,
  UPDATE_EVENTO_MUTATION,
} from "../../dataconnectOperations.js";

const LIST_CALENDARIOS_QUERY = `
  query ListCalendariosManual {
    calendarios(limit: 500) {
      id
      titulo
      descripcion
      fechaIni
      fechaFin
      tipo
      color
      activo
      archivado
      fechaCreacion
      fechaActualizacion
      semestreId
    }
  }
`;

const GET_CALENDARIO_QUERY = `
  query GetCalendarioManual($id: Int!) {
    calendario(id: $id) {
      id
      titulo
      descripcion
      fechaIni
      fechaFin
      tipo
      color
      activo
      archivado
      fechaCreacion
      fechaActualizacion
      semestreId
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
      grupoId
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
      grupoId
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
      moduloId
      semestreId
      personalId
      paqueteId
      turnoId
      grupoOrd
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
  if (!payload.titulo) {
    throw new https.HttpsError("invalid-argument", "titulo is required.");
  }

  const now = new Date().toISOString();
  payload.fechaActualizacion = now;
  if (!toNumberOrNull(data?.id)) {
    payload.fechaCreacion = payload.fechaCreacion ?? now;
  }

  const calendarioId = toNumberOrNull(data?.id);

  try {
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
    if (eventoId) {
      const updated = await dataConnect.executeGraphql<
        { evento_update: unknown },
        { id: number; data: DataConnectEventoInput }
      >(UPDATE_EVENTO_MUTATION, { variables: { id: eventoId, data: payload } });

      return { id: getIdFromKeyOutput(updated.data.evento_update) ?? eventoId };
    }

    const created = await dataConnect.executeGraphql<
      { evento_insert: unknown },
      { data: DataConnectEventoInput }
    >(INSERT_EVENTO_MUTATION, { variables: { data: payload } });

    return { id: getIdFromKeyOutput(created.data.evento_insert) };
  } catch (error) {
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
