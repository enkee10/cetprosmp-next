import { https } from "firebase-functions/v1";
import {
  buildModuloDataFromInput,
  getIdFromKeyOutput,
  toNumber,
  toNumberOrNull,
} from "../core/userMappers.js";
import { dataConnect } from "../core/dataConnectCore.js";
import { DataConnectModulo, DataConnectModuloInput } from "../core/types.js";
import {
  DELETE_MODULO_MUTATION,
  INSERT_MODULO_MUTATION,
  UPDATE_MODULO_MUTATION,
} from "../../dataconnectOperations.js";

const LIST_MODULOS_QUERY = `
  query ListModulosManual {
    modulos(limit: 500) {
      id
      titulo
      tituloComercial
      orden
      descripcion
      horas
      creditos
      metas
      activo
      slug
      descripcion2
      planId
    }
  }
`;

const GET_MODULO_QUERY = `
  query GetModuloManual($id: Int!) {
    modulo(id: $id) {
      id
      titulo
      tituloComercial
      orden
      descripcion
      horas
      creditos
      metas
      activo
      slug
      descripcion2
      planId
    }
  }
`;

export const listModulos = https.onCall(async (_data, context) => {
  const requesterLevel = context.auth?.token?.level ?? 0;
  if (requesterLevel < 600) {
    throw new https.HttpsError("permission-denied", "You do not have permission to list modules.");
  }

  try {
    const response = await dataConnect.executeGraphql<{ modulos: DataConnectModulo[] }, Record<string, never>>(
      LIST_MODULOS_QUERY,
    );
    const modulos = (response.data.modulos ?? [])
      .slice()
      .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || String(a.titulo ?? "").localeCompare(String(b.titulo ?? ""), "es"));

    return { modulos };
  } catch (error) {
    console.error("Error in listModulos:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while listing modules.");
  }
});

export const getModulo = https.onCall(async (data, context) => {
  const requesterLevel = context.auth?.token?.level ?? 0;
  if (requesterLevel < 600) {
    throw new https.HttpsError("permission-denied", "You do not have permission to get modules.");
  }

  const moduloId = toNumber(data?.id, -1);
  if (moduloId <= 0) {
    throw new https.HttpsError("invalid-argument", "id is required.");
  }

  try {
    const response = await dataConnect.executeGraphql<{ modulo: DataConnectModulo | null }, { id: number }>(
      GET_MODULO_QUERY,
      { variables: { id: moduloId } },
    );

    return { modulo: response.data.modulo ?? null };
  } catch (error) {
    console.error("Error in getModulo:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while getting module.");
  }
});

export const createOrUpdateModulo = https.onCall(async (data, context) => {
  const requesterLevel = context.auth?.token?.level ?? 0;
  if (requesterLevel < 600) {
    throw new https.HttpsError("permission-denied", "You do not have permission to mutate modules.");
  }

  const payload = buildModuloDataFromInput(data as Record<string, unknown>);
  if (!payload.titulo) {
    throw new https.HttpsError("invalid-argument", "titulo is required.");
  }

  const moduloId = toNumberOrNull(data?.id);

  try {
    if (moduloId) {
      const updated = await dataConnect.executeGraphql<
        { modulo_update: unknown },
        { id: number; data: DataConnectModuloInput }
      >(
        UPDATE_MODULO_MUTATION,
        { variables: { id: moduloId, data: payload } },
      );

      return { id: getIdFromKeyOutput(updated.data.modulo_update) ?? moduloId };
    }

    const created = await dataConnect.executeGraphql<
      { modulo_insert: unknown },
      { data: DataConnectModuloInput }
    >(
      INSERT_MODULO_MUTATION,
      { variables: { data: payload } },
    );

    return { id: getIdFromKeyOutput(created.data.modulo_insert) };
  } catch (error) {
    console.error("Error in createOrUpdateModulo:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while saving module.");
  }
});

export const deleteModulo = https.onCall(async (data, context) => {
  const requesterLevel = context.auth?.token?.level ?? 0;
  if (requesterLevel < 600) {
    throw new https.HttpsError("permission-denied", "You do not have permission to delete modules.");
  }

  const moduloId = toNumber(data?.id, -1);
  if (moduloId <= 0) {
    throw new https.HttpsError("invalid-argument", "id is required.");
  }

  try {
    const deleted = await dataConnect.executeGraphql<{ modulo_delete: unknown }, { id: number }>(
      DELETE_MODULO_MUTATION,
      { variables: { id: moduloId } },
    );

    return { id: getIdFromKeyOutput(deleted.data.modulo_delete) ?? moduloId };
  } catch (error) {
    console.error("Error in deleteModulo:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while deleting module.");
  }
});
