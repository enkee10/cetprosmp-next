import { https } from "firebase-functions/v1";
import {
  buildTurnoDataFromInput,
  getIdFromKeyOutput,
  toNumber,
  toNumberOrNull,
} from "../core/userMappers.js";
import { dataConnect } from "../core/dataConnectCore.js";
import { requirePermission } from "../core/permissions.js";
import { DataConnectTurno, DataConnectTurnoInput } from "../core/types.js";
import {
  DELETE_TURNO_MUTATION,
  INSERT_TURNO_MUTATION,
  UPDATE_TURNO_MUTATION,
} from "../../dataconnectOperations.js";

const LIST_TURNOS_QUERY = `
  query ListTurnosManual {
    turnos(limit: 500) {
      id
      nombre
      horaInicio
      horaFin
      estado
      fechaCreacion
      fechaActualizacion
    }
  }
`;

const GET_TURNO_QUERY = `
  query GetTurnoManual($id: Int!) {
    turno(id: $id) {
      id
      nombre
      horaInicio
      horaFin
      estado
      fechaCreacion
      fechaActualizacion
    }
  }
`;

const sortTurnos = (items: DataConnectTurno[]) =>
  items
    .slice()
    .sort((a, b) => String(a.nombre ?? "").localeCompare(String(b.nombre ?? ""), "es", { numeric: true }) || a.id - b.id);

export const listTurnos = https.onCall(async (_data, context) => {
  await requirePermission(context, "turnos", "view");

  try {
    const response = await dataConnect.executeGraphql<{ turnos: DataConnectTurno[] }, Record<string, never>>(
      LIST_TURNOS_QUERY,
    );
    return { turnos: sortTurnos(response.data.turnos ?? []) };
  } catch (error) {
    console.error("Error in listTurnos:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while listing shifts.");
  }
});

export const getTurno = https.onCall(async (data, context) => {
  await requirePermission(context, "turnos", "view");

  const turnoId = toNumber(data?.id, -1);
  if (turnoId <= 0) {
    throw new https.HttpsError("invalid-argument", "id is required.");
  }

  try {
    const response = await dataConnect.executeGraphql<{ turno: DataConnectTurno | null }, { id: number }>(
      GET_TURNO_QUERY,
      { variables: { id: turnoId } },
    );
    return { turno: response.data.turno ?? null };
  } catch (error) {
    console.error("Error in getTurno:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while getting shift.");
  }
});

export const createOrUpdateTurno = https.onCall(async (data, context) => {
  const now = new Date().toISOString();
  const payload = buildTurnoDataFromInput({
    ...(data as Record<string, unknown>),
    estado: (data as Record<string, unknown> | null)?.estado || "activo",
    fechaActualizacion: now,
  }) as DataConnectTurnoInput;

  if (!payload.nombre) {
    throw new https.HttpsError("invalid-argument", "nombre is required.");
  }

  const turnoId = toNumberOrNull(data?.id);
  await requirePermission(context, "turnos", turnoId ? "edit" : "create");

  try {
    if (turnoId) {
      const updated = await dataConnect.executeGraphql<
        { turno_update: unknown },
        { id: number; data: DataConnectTurnoInput }
      >(UPDATE_TURNO_MUTATION, { variables: { id: turnoId, data: payload } });

      return { id: getIdFromKeyOutput(updated.data.turno_update) ?? turnoId };
    }

    const created = await dataConnect.executeGraphql<
      { turno_insert: unknown },
      { data: DataConnectTurnoInput }
    >(INSERT_TURNO_MUTATION, {
      variables: {
        data: {
          ...payload,
          fechaCreacion: now,
          fechaActualizacion: now,
        },
      },
    });

    return { id: getIdFromKeyOutput(created.data.turno_insert) };
  } catch (error) {
    console.error("Error in createOrUpdateTurno:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while saving shift.");
  }
});

export const deleteTurno = https.onCall(async (data, context) => {
  await requirePermission(context, "turnos", "delete");

  const turnoId = toNumber(data?.id, -1);
  if (turnoId <= 0) {
    throw new https.HttpsError("invalid-argument", "id is required.");
  }

  try {
    const deleted = await dataConnect.executeGraphql<{ turno_delete: unknown }, { id: number }>(
      DELETE_TURNO_MUTATION,
      { variables: { id: turnoId } },
    );
    return { id: getIdFromKeyOutput(deleted.data.turno_delete) ?? turnoId };
  } catch (error) {
    console.error("Error in deleteTurno:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while deleting shift.");
  }
});
