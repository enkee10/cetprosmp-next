import { https } from "firebase-functions/v1";
import {
  buildFamiliaDataFromInput,
  getIdFromKeyOutput,
  toNumber,
  toNumberOrNull,
} from "../core/userMappers.js";
import { dataConnect } from "../core/dataConnectCore.js";
import { DataConnectFamilia, DataConnectFamiliaInput } from "../core/types.js";
import {
  DELETE_FAMILIA_MUTATION,
  INSERT_FAMILIA_MUTATION,
  UPDATE_FAMILIA_MUTATION,
} from "../../dataconnectOperations.js";

const LIST_FAMILIAS_QUERY = `
  query ListFamiliasManual {
    familias(limit: 500) {
      id
      titulo
      descripcion
      sectorId
    }
  }
`;

const GET_FAMILIA_QUERY = `
  query GetFamiliaManual($id: Int!) {
    familia(id: $id) {
      id
      titulo
      descripcion
      sectorId
    }
  }
`;

export const listFamilias = https.onCall(async (_data, context) => {
  const requesterLevel = context.auth?.token?.level ?? 0;
  if (requesterLevel < 600) {
    throw new https.HttpsError("permission-denied", "You do not have permission to list families.");
  }

  try {
    const response = await dataConnect.executeGraphql<{ familias: DataConnectFamilia[] }, Record<string, never>>(
      LIST_FAMILIAS_QUERY,
    );
    const familias = (response.data.familias ?? [])
      .slice()
      .sort((a, b) => String(a.titulo ?? "").localeCompare(String(b.titulo ?? ""), "es"));

    return { familias };
  } catch (error) {
    console.error("Error in listFamilias:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while listing families.");
  }
});

export const getFamilia = https.onCall(async (data, context) => {
  const requesterLevel = context.auth?.token?.level ?? 0;
  if (requesterLevel < 600) {
    throw new https.HttpsError("permission-denied", "You do not have permission to get families.");
  }

  const familiaId = toNumber(data?.id, -1);
  if (familiaId <= 0) {
    throw new https.HttpsError("invalid-argument", "id is required.");
  }

  try {
    const response = await dataConnect.executeGraphql<{ familia: DataConnectFamilia | null }, { id: number }>(
      GET_FAMILIA_QUERY,
      { variables: { id: familiaId } },
    );

    return { familia: response.data.familia ?? null };
  } catch (error) {
    console.error("Error in getFamilia:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while getting family.");
  }
});

export const createOrUpdateFamilia = https.onCall(async (data, context) => {
  const requesterLevel = context.auth?.token?.level ?? 0;
  if (requesterLevel < 600) {
    throw new https.HttpsError("permission-denied", "You do not have permission to mutate families.");
  }

  const payload = buildFamiliaDataFromInput(data as Record<string, unknown>);
  if (!payload.titulo) {
    throw new https.HttpsError("invalid-argument", "titulo is required.");
  }

  const familiaId = toNumberOrNull(data?.id);

  try {
    if (familiaId) {
      const updated = await dataConnect.executeGraphql<
        { familia_update: unknown },
        { id: number; data: DataConnectFamiliaInput }
      >(
        UPDATE_FAMILIA_MUTATION,
        { variables: { id: familiaId, data: payload } },
      );

      return { id: getIdFromKeyOutput(updated.data.familia_update) ?? familiaId };
    }

    const created = await dataConnect.executeGraphql<
      { familia_insert: unknown },
      { data: DataConnectFamiliaInput }
    >(
      INSERT_FAMILIA_MUTATION,
      { variables: { data: payload } },
    );

    return { id: getIdFromKeyOutput(created.data.familia_insert) };
  } catch (error) {
    console.error("Error in createOrUpdateFamilia:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while saving family.");
  }
});

export const deleteFamilia = https.onCall(async (data, context) => {
  const requesterLevel = context.auth?.token?.level ?? 0;
  if (requesterLevel < 600) {
    throw new https.HttpsError("permission-denied", "You do not have permission to delete families.");
  }

  const familiaId = toNumber(data?.id, -1);
  if (familiaId <= 0) {
    throw new https.HttpsError("invalid-argument", "id is required.");
  }

  try {
    const deleted = await dataConnect.executeGraphql<{ familia_delete: unknown }, { id: number }>(
      DELETE_FAMILIA_MUTATION,
      { variables: { id: familiaId } },
    );

    return { id: getIdFromKeyOutput(deleted.data.familia_delete) ?? familiaId };
  } catch (error) {
    console.error("Error in deleteFamilia:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while deleting family.");
  }
});
