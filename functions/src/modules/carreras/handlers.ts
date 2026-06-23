import { https } from "firebase-functions/v1";
import {
  buildCarreraDataFromInput,
  getIdFromKeyOutput,
  toNumber,
  toNumberOrNull,
} from "../core/userMappers.js";
import { dataConnect } from "../core/dataConnectCore.js";
import { DataConnectCarrera, DataConnectCarreraInput } from "../core/types.js";
import {
  DELETE_CARRERA_MUTATION,
  INSERT_CARRERA_MUTATION,
  UPDATE_CARRERA_MUTATION,
} from "../../dataconnectOperations.js";

const LIST_CARRERAS_QUERY = `
  query ListCarrerasManual {
    carreras(limit: 500) {
      id
      nombre
      codigo
      descripcion
      tipo
      estado
      creadoEn
      actualizadoEn
      actEconomicaId
    }
  }
`;

const GET_CARRERA_QUERY = `
  query GetCarreraManual($id: Int!) {
    carrera(id: $id) {
      id
      nombre
      codigo
      descripcion
      tipo
      estado
      creadoEn
      actualizadoEn
      actEconomicaId
    }
  }
`;

export const listCarreras = https.onCall(async (_data, context) => {
  const requesterLevel = context.auth?.token?.level ?? 0;
  if (requesterLevel < 600) {
    throw new https.HttpsError("permission-denied", "You do not have permission to list careers.");
  }

  try {
    const response = await dataConnect.executeGraphql<{ carreras: DataConnectCarrera[] }, Record<string, never>>(
      LIST_CARRERAS_QUERY,
    );
    const carreras = (response.data.carreras ?? [])
      .slice()
      .sort((a, b) => String(a.nombre ?? "").localeCompare(String(b.nombre ?? ""), "es"));

    return { carreras };
  } catch (error) {
    console.error("Error in listCarreras:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while listing careers.");
  }
});

export const getCarrera = https.onCall(async (data, context) => {
  const requesterLevel = context.auth?.token?.level ?? 0;
  if (requesterLevel < 600) {
    throw new https.HttpsError("permission-denied", "You do not have permission to get careers.");
  }

  const carreraId = toNumber(data?.id, -1);
  if (carreraId <= 0) {
    throw new https.HttpsError("invalid-argument", "id is required.");
  }

  try {
    const response = await dataConnect.executeGraphql<{ carrera: DataConnectCarrera | null }, { id: number }>(
      GET_CARRERA_QUERY,
      { variables: { id: carreraId } },
    );

    return { carrera: response.data.carrera ?? null };
  } catch (error) {
    console.error("Error in getCarrera:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while getting career.");
  }
});

export const createOrUpdateCarrera = https.onCall(async (data, context) => {
  const requesterLevel = context.auth?.token?.level ?? 0;
  if (requesterLevel < 600) {
    throw new https.HttpsError("permission-denied", "You do not have permission to mutate careers.");
  }

  const payload = buildCarreraDataFromInput(data as Record<string, unknown>);
  if (!payload.nombre) {
    throw new https.HttpsError("invalid-argument", "nombre is required.");
  }

  const carreraId = toNumberOrNull(data?.id);

  try {
    if (carreraId) {
      const updated = await dataConnect.executeGraphql<
        { carrera_update: unknown },
        { id: number; data: DataConnectCarreraInput }
      >(
        UPDATE_CARRERA_MUTATION,
        { variables: { id: carreraId, data: payload } },
      );

      return { id: getIdFromKeyOutput(updated.data.carrera_update) ?? carreraId };
    }

    const created = await dataConnect.executeGraphql<
      { carrera_insert: unknown },
      { data: DataConnectCarreraInput }
    >(
      INSERT_CARRERA_MUTATION,
      { variables: { data: payload } },
    );

    return { id: getIdFromKeyOutput(created.data.carrera_insert) };
  } catch (error) {
    console.error("Error in createOrUpdateCarrera:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while saving career.");
  }
});

export const deleteCarrera = https.onCall(async (data, context) => {
  const requesterLevel = context.auth?.token?.level ?? 0;
  if (requesterLevel < 600) {
    throw new https.HttpsError("permission-denied", "You do not have permission to delete careers.");
  }

  const carreraId = toNumber(data?.id, -1);
  if (carreraId <= 0) {
    throw new https.HttpsError("invalid-argument", "id is required.");
  }

  try {
    const deleted = await dataConnect.executeGraphql<{ carrera_delete: unknown }, { id: number }>(
      DELETE_CARRERA_MUTATION,
      { variables: { id: carreraId } },
    );

    return { id: getIdFromKeyOutput(deleted.data.carrera_delete) ?? carreraId };
  } catch (error) {
    console.error("Error in deleteCarrera:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while deleting career.");
  }
});
