import { https } from "firebase-functions/v1";
import {
  buildAnioDataFromInput,
  getIdFromKeyOutput,
  toNumber,
  toNumberOrNull,
} from "../core/userMappers.js";
import { dataConnect } from "../core/dataConnectCore.js";
import { requirePermission } from "../core/permissions.js";
import { DataConnectAnio, DataConnectAnioInput } from "../core/types.js";
import {
  DELETE_ANIO_MUTATION,
  INSERT_ANIO_MUTATION,
  UPDATE_ANIO_MUTATION,
} from "../../dataconnectOperations.js";

const LIST_ANIOS_QUERY = `
  query ListAniosManual {
    anios(limit: 500) {
      id
      nombre
      titulo
    }
  }
`;

const GET_ANIO_QUERY = `
  query GetAnioManual($id: Int!) {
    anio(id: $id) {
      id
      nombre
      titulo
    }
  }
`;

const sortAnios = (items: DataConnectAnio[]) =>
  items
    .slice()
    .sort((a, b) =>
      String(a.nombre ?? a.titulo ?? "").localeCompare(String(b.nombre ?? b.titulo ?? ""), "es", { numeric: true }) ||
      a.id - b.id,
    );

export const listAnios = https.onCall(async (_data, context) => {
  await requirePermission(context, "anios", "view");

  try {
    const response = await dataConnect.executeGraphql<{ anios: DataConnectAnio[] }, Record<string, never>>(
      LIST_ANIOS_QUERY,
    );
    return { anios: sortAnios(response.data.anios ?? []) };
  } catch (error) {
    console.error("Error in listAnios:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while listing years.");
  }
});

export const getAnio = https.onCall(async (data, context) => {
  await requirePermission(context, "anios", "view");

  const anioId = toNumber(data?.id, -1);
  if (anioId <= 0) {
    throw new https.HttpsError("invalid-argument", "id is required.");
  }

  try {
    const response = await dataConnect.executeGraphql<{ anio: DataConnectAnio | null }, { id: number }>(
      GET_ANIO_QUERY,
      { variables: { id: anioId } },
    );
    return { anio: response.data.anio ?? null };
  } catch (error) {
    console.error("Error in getAnio:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while getting year.");
  }
});

export const createOrUpdateAnio = https.onCall(async (data, context) => {
  const payload = buildAnioDataFromInput(data as Record<string, unknown>);
  if (!payload.nombre && !payload.titulo) {
    throw new https.HttpsError("invalid-argument", "nombre or titulo is required.");
  }

  const anioId = toNumberOrNull(data?.id);
  await requirePermission(context, "anios", anioId ? "edit" : "create");

  try {
    if (anioId) {
      const updated = await dataConnect.executeGraphql<
        { anio_update: unknown },
        { id: number; data: DataConnectAnioInput }
      >(UPDATE_ANIO_MUTATION, { variables: { id: anioId, data: payload } });

      return { id: getIdFromKeyOutput(updated.data.anio_update) ?? anioId };
    }

    const created = await dataConnect.executeGraphql<
      { anio_insert: unknown },
      { data: DataConnectAnioInput }
    >(INSERT_ANIO_MUTATION, { variables: { data: payload } });

    return { id: getIdFromKeyOutput(created.data.anio_insert) };
  } catch (error) {
    console.error("Error in createOrUpdateAnio:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while saving year.");
  }
});

export const deleteAnio = https.onCall(async (data, context) => {
  await requirePermission(context, "anios", "delete");

  const anioId = toNumber(data?.id, -1);
  if (anioId <= 0) {
    throw new https.HttpsError("invalid-argument", "id is required.");
  }

  try {
    const deleted = await dataConnect.executeGraphql<{ anio_delete: unknown }, { id: number }>(
      DELETE_ANIO_MUTATION,
      { variables: { id: anioId } },
    );
    return { id: getIdFromKeyOutput(deleted.data.anio_delete) ?? anioId };
  } catch (error) {
    console.error("Error in deleteAnio:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while deleting year.");
  }
});
