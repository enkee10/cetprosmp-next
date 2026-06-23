import { https } from "firebase-functions/v1";
import {
  buildActEconomicaDataFromInput,
  getIdFromKeyOutput,
  toNumber,
  toNumberOrNull,
} from "../core/userMappers.js";
import { dataConnect } from "../core/dataConnectCore.js";
import { DataConnectActEconomica, DataConnectActEconomicaInput } from "../core/types.js";
import {
  DELETE_ACT_ECONOMICA_MUTATION,
  INSERT_ACT_ECONOMICA_MUTATION,
  UPDATE_ACT_ECONOMICA_MUTATION,
} from "../../dataconnectOperations.js";

const LIST_ACT_ECONOMICAS_QUERY = `
  query ListActEconomicasManual {
    actEconomicas(limit: 500) {
      id
      titulo
      descripcion
      familiaId
      especialidadId
    }
  }
`;

const GET_ACT_ECONOMICA_QUERY = `
  query GetActEconomicaManual($id: Int!) {
    actEconomica(id: $id) {
      id
      titulo
      descripcion
      familiaId
      especialidadId
    }
  }
`;

export const listActEconomicas = https.onCall(async (_data, context) => {
  const requesterLevel = context.auth?.token?.level ?? 0;
  if (requesterLevel < 600) {
    throw new https.HttpsError("permission-denied", "You do not have permission to list economic activities.");
  }

  try {
    const response = await dataConnect.executeGraphql<
      { actEconomicas: DataConnectActEconomica[] },
      Record<string, never>
    >(LIST_ACT_ECONOMICAS_QUERY);
    const actEconomicas = (response.data.actEconomicas ?? [])
      .slice()
      .sort((a, b) => String(a.titulo ?? "").localeCompare(String(b.titulo ?? ""), "es"));

    return { actEconomicas };
  } catch (error) {
    console.error("Error in listActEconomicas:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while listing economic activities.");
  }
});

export const getActEconomica = https.onCall(async (data, context) => {
  const requesterLevel = context.auth?.token?.level ?? 0;
  if (requesterLevel < 600) {
    throw new https.HttpsError("permission-denied", "You do not have permission to get economic activities.");
  }

  const actEconomicaId = toNumber(data?.id, -1);
  if (actEconomicaId <= 0) {
    throw new https.HttpsError("invalid-argument", "id is required.");
  }

  try {
    const response = await dataConnect.executeGraphql<
      { actEconomica: DataConnectActEconomica | null },
      { id: number }
    >(
      GET_ACT_ECONOMICA_QUERY,
      { variables: { id: actEconomicaId } },
    );

    return { actEconomica: response.data.actEconomica ?? null };
  } catch (error) {
    console.error("Error in getActEconomica:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while getting economic activity.");
  }
});

export const createOrUpdateActEconomica = https.onCall(async (data, context) => {
  const requesterLevel = context.auth?.token?.level ?? 0;
  if (requesterLevel < 600) {
    throw new https.HttpsError("permission-denied", "You do not have permission to mutate economic activities.");
  }

  const payload = buildActEconomicaDataFromInput(data as Record<string, unknown>);
  if (!payload.titulo) {
    throw new https.HttpsError("invalid-argument", "titulo is required.");
  }

  const actEconomicaId = toNumberOrNull(data?.id);

  try {
    if (actEconomicaId) {
      const updated = await dataConnect.executeGraphql<
        { actEconomica_update: unknown },
        { id: number; data: DataConnectActEconomicaInput }
      >(
        UPDATE_ACT_ECONOMICA_MUTATION,
        { variables: { id: actEconomicaId, data: payload } },
      );

      return { id: getIdFromKeyOutput(updated.data.actEconomica_update) ?? actEconomicaId };
    }

    const created = await dataConnect.executeGraphql<
      { actEconomica_insert: unknown },
      { data: DataConnectActEconomicaInput }
    >(
      INSERT_ACT_ECONOMICA_MUTATION,
      { variables: { data: payload } },
    );

    return { id: getIdFromKeyOutput(created.data.actEconomica_insert) };
  } catch (error) {
    console.error("Error in createOrUpdateActEconomica:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while saving economic activity.");
  }
});

export const deleteActEconomica = https.onCall(async (data, context) => {
  const requesterLevel = context.auth?.token?.level ?? 0;
  if (requesterLevel < 600) {
    throw new https.HttpsError("permission-denied", "You do not have permission to delete economic activities.");
  }

  const actEconomicaId = toNumber(data?.id, -1);
  if (actEconomicaId <= 0) {
    throw new https.HttpsError("invalid-argument", "id is required.");
  }

  try {
    const deleted = await dataConnect.executeGraphql<{ actEconomica_delete: unknown }, { id: number }>(
      DELETE_ACT_ECONOMICA_MUTATION,
      { variables: { id: actEconomicaId } },
    );

    return { id: getIdFromKeyOutput(deleted.data.actEconomica_delete) ?? actEconomicaId };
  } catch (error) {
    console.error("Error in deleteActEconomica:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while deleting economic activity.");
  }
});
