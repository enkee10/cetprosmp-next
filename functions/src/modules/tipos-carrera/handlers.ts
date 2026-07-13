import { https } from "firebase-functions/v1";
import {
  buildTipoCarreraDataFromInput,
  getIdFromKeyOutput,
  toNumber,
  toNumberOrNull,
} from "../core/userMappers.js";
import { dataConnect } from "../core/dataConnectCore.js";
import { requirePermission } from "../core/permissions.js";
import { DataConnectTipoCarrera, DataConnectTipoCarreraInput } from "../core/types.js";
import {
  DELETE_TIPO_CARRERA_MUTATION,
  INSERT_TIPO_CARRERA_MUTATION,
  UPDATE_TIPO_CARRERA_MUTATION,
} from "../../dataconnectOperations.js";

const LIST_TIPOS_CARRERA_QUERY = `
  query ListTiposCarreraManual {
    tipoCarreras(limit: 500) {
      id
      nombre
    }
  }
`;

const GET_TIPO_CARRERA_QUERY = `
  query GetTipoCarreraManual($id: Int!) {
    tipoCarrera(id: $id) {
      id
      nombre
    }
  }
`;

export const listTiposCarrera = https.onCall(async (_data, context) => {
  await requirePermission(context, "tipos-carrera", "view");

  try {
    const response = await dataConnect.executeGraphql<
      { tipoCarreras: DataConnectTipoCarrera[] },
      Record<string, never>
    >(LIST_TIPOS_CARRERA_QUERY);
    const tiposCarrera = (response.data.tipoCarreras ?? [])
      .slice()
      .sort((a, b) => String(a.nombre ?? "").localeCompare(String(b.nombre ?? ""), "es"));

    return { tiposCarrera };
  } catch (error) {
    console.error("Error in listTiposCarrera:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while listing career types.");
  }
});

export const getTipoCarrera = https.onCall(async (data, context) => {
  await requirePermission(context, "tipos-carrera", "view");

  const tipoCarreraId = toNumber(data?.id, -1);
  if (tipoCarreraId <= 0) {
    throw new https.HttpsError("invalid-argument", "id is required.");
  }

  try {
    const response = await dataConnect.executeGraphql<
      { tipoCarrera: DataConnectTipoCarrera | null },
      { id: number }
    >(
      GET_TIPO_CARRERA_QUERY,
      { variables: { id: tipoCarreraId } },
    );

    return { tipoCarrera: response.data.tipoCarrera ?? null };
  } catch (error) {
    console.error("Error in getTipoCarrera:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while getting career type.");
  }
});

export const createOrUpdateTipoCarrera = https.onCall(async (data, context) => {
  const payload = buildTipoCarreraDataFromInput(data as Record<string, unknown>);
  if (!payload.nombre) {
    throw new https.HttpsError("invalid-argument", "nombre is required.");
  }

  const tipoCarreraId = toNumberOrNull(data?.id);
  await requirePermission(context, "tipos-carrera", tipoCarreraId ? "edit" : "create");

  try {
    if (tipoCarreraId) {
      const updated = await dataConnect.executeGraphql<
        { tipoCarrera_update: unknown },
        { id: number; data: DataConnectTipoCarreraInput }
      >(
        UPDATE_TIPO_CARRERA_MUTATION,
        { variables: { id: tipoCarreraId, data: payload } },
      );

      return { id: getIdFromKeyOutput(updated.data.tipoCarrera_update) ?? tipoCarreraId };
    }

    const created = await dataConnect.executeGraphql<
      { tipoCarrera_insert: unknown },
      { data: DataConnectTipoCarreraInput }
    >(
      INSERT_TIPO_CARRERA_MUTATION,
      { variables: { data: payload } },
    );

    return { id: getIdFromKeyOutput(created.data.tipoCarrera_insert) };
  } catch (error) {
    console.error("Error in createOrUpdateTipoCarrera:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while saving career type.");
  }
});

export const deleteTipoCarrera = https.onCall(async (data, context) => {
  await requirePermission(context, "tipos-carrera", "delete");

  const tipoCarreraId = toNumber(data?.id, -1);
  if (tipoCarreraId <= 0) {
    throw new https.HttpsError("invalid-argument", "id is required.");
  }

  try {
    const deleted = await dataConnect.executeGraphql<{ tipoCarrera_delete: unknown }, { id: number }>(
      DELETE_TIPO_CARRERA_MUTATION,
      { variables: { id: tipoCarreraId } },
    );

    return { id: getIdFromKeyOutput(deleted.data.tipoCarrera_delete) ?? tipoCarreraId };
  } catch (error) {
    console.error("Error in deleteTipoCarrera:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while deleting career type.");
  }
});
