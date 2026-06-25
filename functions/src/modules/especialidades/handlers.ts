import { https } from "firebase-functions/v1";
import {
  buildEspecialidadDataFromInput,
  getIdFromKeyOutput,
  toNumber,
  toNumberOrNull,
} from "../core/userMappers.js";
import { dataConnect } from "../core/dataConnectCore.js";
import { DataConnectEspecialidad, DataConnectEspecialidadInput } from "../core/types.js";
import {
  DELETE_ESPECIALIDAD_MUTATION,
  INSERT_ESPECIALIDAD_MUTATION,
  UPDATE_ESPECIALIDAD_MUTATION,
} from "../../dataconnectOperations.js";

const LIST_ESPECIALIDADES_QUERY = `
  query ListEspecialidadesManual {
    especialidads(limit: 500) {
      id
      titulo
      tituloComercial
      descripcion
      descripcion2
      slug
      imagenPortadaUrl
      actEconomicaId
    }
  }
`;

const GET_ESPECIALIDAD_QUERY = `
  query GetEspecialidadManual($id: Int!) {
    especialidad(id: $id) {
      id
      titulo
      tituloComercial
      descripcion
      descripcion2
      slug
      imagenPortadaUrl
      actEconomicaId
    }
  }
`;

export const listEspecialidades = https.onCall(async (_data, context) => {
  const requesterLevel = context.auth?.token?.level ?? 0;
  if (requesterLevel < 600) {
    throw new https.HttpsError("permission-denied", "You do not have permission to list specialties.");
  }

  try {
    const response = await dataConnect.executeGraphql<
      { especialidads: DataConnectEspecialidad[] },
      Record<string, never>
    >(LIST_ESPECIALIDADES_QUERY);
    const especialidades = (response.data.especialidads ?? [])
      .slice()
      .sort((a, b) => String(a.titulo ?? "").localeCompare(String(b.titulo ?? ""), "es"));

    return { especialidades };
  } catch (error) {
    console.error("Error in listEspecialidades:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while listing specialties.");
  }
});

export const getEspecialidad = https.onCall(async (data, context) => {
  const requesterLevel = context.auth?.token?.level ?? 0;
  if (requesterLevel < 600) {
    throw new https.HttpsError("permission-denied", "You do not have permission to get specialties.");
  }

  const especialidadId = toNumber(data?.id, -1);
  if (especialidadId <= 0) {
    throw new https.HttpsError("invalid-argument", "id is required.");
  }

  try {
    const response = await dataConnect.executeGraphql<
      { especialidad: DataConnectEspecialidad | null },
      { id: number }
    >(
      GET_ESPECIALIDAD_QUERY,
      { variables: { id: especialidadId } },
    );

    return { especialidad: response.data.especialidad ?? null };
  } catch (error) {
    console.error("Error in getEspecialidad:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while getting specialty.");
  }
});

export const createOrUpdateEspecialidad = https.onCall(async (data, context) => {
  const requesterLevel = context.auth?.token?.level ?? 0;
  if (requesterLevel < 600) {
    throw new https.HttpsError("permission-denied", "You do not have permission to mutate specialties.");
  }

  const payload = buildEspecialidadDataFromInput(data as Record<string, unknown>);
  if (!payload.titulo) {
    throw new https.HttpsError("invalid-argument", "titulo is required.");
  }

  const especialidadId = toNumberOrNull(data?.id);

  try {
    if (especialidadId) {
      const updated = await dataConnect.executeGraphql<
        { especialidad_update: unknown },
        { id: number; data: DataConnectEspecialidadInput }
      >(
        UPDATE_ESPECIALIDAD_MUTATION,
        { variables: { id: especialidadId, data: payload } },
      );

      return { id: getIdFromKeyOutput(updated.data.especialidad_update) ?? especialidadId };
    }

    const created = await dataConnect.executeGraphql<
      { especialidad_insert: unknown },
      { data: DataConnectEspecialidadInput }
    >(
      INSERT_ESPECIALIDAD_MUTATION,
      { variables: { data: payload } },
    );

    return { id: getIdFromKeyOutput(created.data.especialidad_insert) };
  } catch (error) {
    console.error("Error in createOrUpdateEspecialidad:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while saving specialty.");
  }
});

export const deleteEspecialidad = https.onCall(async (data, context) => {
  const requesterLevel = context.auth?.token?.level ?? 0;
  if (requesterLevel < 600) {
    throw new https.HttpsError("permission-denied", "You do not have permission to delete specialties.");
  }

  const especialidadId = toNumber(data?.id, -1);
  if (especialidadId <= 0) {
    throw new https.HttpsError("invalid-argument", "id is required.");
  }

  try {
    const deleted = await dataConnect.executeGraphql<{ especialidad_delete: unknown }, { id: number }>(
      DELETE_ESPECIALIDAD_MUTATION,
      { variables: { id: especialidadId } },
    );

    return { id: getIdFromKeyOutput(deleted.data.especialidad_delete) ?? especialidadId };
  } catch (error) {
    console.error("Error in deleteEspecialidad:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while deleting specialty.");
  }
});
