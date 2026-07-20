import { https } from "firebase-functions/v1";
import {
  buildSemestreDataFromInput,
  getIdFromKeyOutput,
  toNumber,
  toNumberOrNull,
} from "../core/userMappers.js";
import { dataConnect } from "../core/dataConnectCore.js";
import { requirePermission } from "../core/permissions.js";
import { DataConnectSemestre, DataConnectSemestreInput } from "../core/types.js";
import {
  DELETE_SEMESTRE_MUTATION,
  INSERT_SEMESTRE_MUTATION,
  UPDATE_SEMESTRE_MUTATION,
} from "../../dataconnectOperations.js";

const SEMESTRE_FIELDS = `
  id
  titulo
  descripcion
  inicio
  fin
  fechaActa
  fechaCertificado
  fechaNomina
  archivado
  anioId
  directorId
  coordinador1Id
  coordinador2Id
  director {
    id
    displayName
    user {
      username
    }
  }
  coordinador1 {
    id
    displayName
    user {
      username
    }
  }
  coordinador2 {
    id
    displayName
    user {
      username
    }
  }
  anio {
    id
    nombre
    titulo
  }
`;

const LIST_SEMESTRES_QUERY = `
  query ListSemestresManual {
    semestres(limit: 500) {
      ${SEMESTRE_FIELDS}
    }
  }
`;

const GET_SEMESTRE_QUERY = `
  query GetSemestreManual($id: Int!) {
    semestre(id: $id) {
      ${SEMESTRE_FIELDS}
    }
  }
`;

const sortSemestres = (items: DataConnectSemestre[]) =>
  items
    .slice()
    .sort((a, b) =>
      String(a.anio?.nombre ?? a.anio?.titulo ?? "").localeCompare(
        String(b.anio?.nombre ?? b.anio?.titulo ?? ""),
        "es",
        { numeric: true },
      ) ||
      String(a.titulo ?? "").localeCompare(String(b.titulo ?? ""), "es", { numeric: true }) ||
      a.id - b.id,
    );

const addAnioTitulo = (semestre: DataConnectSemestre): DataConnectSemestre => ({
  ...semestre,
  anioTitulo: semestre.anio?.nombre ?? semestre.anio?.titulo ?? null,
  directorUsername: semestre.director?.user?.username ?? semestre.director?.displayName ?? null,
  coordinador1Username: semestre.coordinador1?.user?.username ?? semestre.coordinador1?.displayName ?? null,
  coordinador2Username: semestre.coordinador2?.user?.username ?? semestre.coordinador2?.displayName ?? null,
});

export const listSemestres = https.onCall(async (_data, context) => {
  await requirePermission(context, "semestres", "view");

  try {
    const response = await dataConnect.executeGraphql<{ semestres: DataConnectSemestre[] }, Record<string, never>>(
      LIST_SEMESTRES_QUERY,
    );
    return { semestres: sortSemestres(response.data.semestres ?? []).map(addAnioTitulo) };
  } catch (error) {
    console.error("Error in listSemestres:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while listing semesters.");
  }
});

export const getSemestre = https.onCall(async (data, context) => {
  await requirePermission(context, "semestres", "view");

  const semestreId = toNumber(data?.id, -1);
  if (semestreId <= 0) {
    throw new https.HttpsError("invalid-argument", "id is required.");
  }

  try {
    const response = await dataConnect.executeGraphql<{ semestre: DataConnectSemestre | null }, { id: number }>(
      GET_SEMESTRE_QUERY,
      { variables: { id: semestreId } },
    );
    return { semestre: response.data.semestre ? addAnioTitulo(response.data.semestre) : null };
  } catch (error) {
    console.error("Error in getSemestre:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while getting semester.");
  }
});

export const createOrUpdateSemestre = https.onCall(async (data, context) => {
  const payload = buildSemestreDataFromInput(data as Record<string, unknown>) as DataConnectSemestreInput;
  if (!payload.titulo) {
    throw new https.HttpsError("invalid-argument", "titulo is required.");
  }

  const semestreId = toNumberOrNull(data?.id);
  await requirePermission(context, "semestres", semestreId ? "edit" : "create");

  try {
    if (semestreId) {
      const updated = await dataConnect.executeGraphql<
        { semestre_update: unknown },
        { id: number; data: DataConnectSemestreInput }
      >(UPDATE_SEMESTRE_MUTATION, { variables: { id: semestreId, data: payload } });

      return { id: getIdFromKeyOutput(updated.data.semestre_update) ?? semestreId };
    }

    const created = await dataConnect.executeGraphql<
      { semestre_insert: unknown },
      { data: DataConnectSemestreInput }
    >(INSERT_SEMESTRE_MUTATION, { variables: { data: payload } });

    return { id: getIdFromKeyOutput(created.data.semestre_insert) };
  } catch (error) {
    console.error("Error in createOrUpdateSemestre:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while saving semester.");
  }
});

export const deleteSemestre = https.onCall(async (data, context) => {
  await requirePermission(context, "semestres", "delete");

  const semestreId = toNumber(data?.id, -1);
  if (semestreId <= 0) {
    throw new https.HttpsError("invalid-argument", "id is required.");
  }

  try {
    const deleted = await dataConnect.executeGraphql<{ semestre_delete: unknown }, { id: number }>(
      DELETE_SEMESTRE_MUTATION,
      { variables: { id: semestreId } },
    );
    return { id: getIdFromKeyOutput(deleted.data.semestre_delete) ?? semestreId };
  } catch (error) {
    console.error("Error in deleteSemestre:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while deleting semester.");
  }
});
