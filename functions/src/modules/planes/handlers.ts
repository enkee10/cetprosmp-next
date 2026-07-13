import { https } from "firebase-functions/v1";
import {
  buildPlanDataFromInput,
  getIdFromKeyOutput,
  toNumber,
  toNumberOrNull,
} from "../core/userMappers.js";
import { dataConnect } from "../core/dataConnectCore.js";
import { requirePermission } from "../core/permissions.js";
import { DataConnectPlan, DataConnectPlanInput } from "../core/types.js";
import {
  DELETE_PLAN_MUTATION,
  INSERT_PLAN_MUTATION,
  UPDATE_PLAN_MUTATION,
} from "../../dataconnectOperations.js";

const LIST_PLANES_QUERY = `
  query ListPlanesManual {
    planes(limit: 500) {
      id
      duracion
      creditos
      tituloComercial
      slug
      descripcion2
      imagenPortadaUrl
      planEstudio
      periodoCaducidad
      resolucionTipo
      nro
      anio
      genera
      carreraId
      periodoVigenciaId
      versionId
    }
  }
`;

const GET_PLAN_QUERY = `
  query GetPlanManual($id: Int!) {
    plan(id: $id) {
      id
      duracion
      creditos
      tituloComercial
      slug
      descripcion2
      imagenPortadaUrl
      planEstudio
      periodoCaducidad
      resolucionTipo
      nro
      anio
      genera
      carreraId
      periodoVigenciaId
      versionId
    }
  }
`;

export const listPlanes = https.onCall(async (_data, context) => {
  await requirePermission(context, "planes", "view");

  try {
    const response = await dataConnect.executeGraphql<{ planes: DataConnectPlan[] }, Record<string, never>>(
      LIST_PLANES_QUERY,
    );
    const planes = (response.data.planes ?? [])
      .slice()
      .sort((a, b) => String(a.tituloComercial ?? "").localeCompare(String(b.tituloComercial ?? ""), "es"));

    return { planes };
  } catch (error) {
    console.error("Error in listPlanes:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while listing plans.");
  }
});

export const getPlan = https.onCall(async (data, context) => {
  await requirePermission(context, "planes", "view");

  const planId = toNumber(data?.id, -1);
  if (planId <= 0) {
    throw new https.HttpsError("invalid-argument", "id is required.");
  }

  try {
    const response = await dataConnect.executeGraphql<{ plan: DataConnectPlan | null }, { id: number }>(
      GET_PLAN_QUERY,
      { variables: { id: planId } },
    );

    return { plan: response.data.plan ?? null };
  } catch (error) {
    console.error("Error in getPlan:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while getting plan.");
  }
});

export const createOrUpdatePlan = https.onCall(async (data, context) => {
  const payload = buildPlanDataFromInput(data as Record<string, unknown>);
  if (!payload.tituloComercial && !payload.periodoVigenciaId) {
    throw new https.HttpsError("invalid-argument", "tituloComercial or periodoVigenciaId is required.");
  }

  const planId = toNumberOrNull(data?.id);
  await requirePermission(context, "planes", planId ? "edit" : "create");

  try {
    if (planId) {
      const updated = await dataConnect.executeGraphql<
        { plan_update: unknown },
        { id: number; data: DataConnectPlanInput }
      >(
        UPDATE_PLAN_MUTATION,
        { variables: { id: planId, data: payload } },
      );

      return { id: getIdFromKeyOutput(updated.data.plan_update) ?? planId };
    }

    const created = await dataConnect.executeGraphql<
      { plan_insert: unknown },
      { data: DataConnectPlanInput }
    >(
      INSERT_PLAN_MUTATION,
      { variables: { data: payload } },
    );

    return { id: getIdFromKeyOutput(created.data.plan_insert) };
  } catch (error) {
    console.error("Error in createOrUpdatePlan:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while saving plan.");
  }
});

export const deletePlan = https.onCall(async (data, context) => {
  await requirePermission(context, "planes", "delete");

  const planId = toNumber(data?.id, -1);
  if (planId <= 0) {
    throw new https.HttpsError("invalid-argument", "id is required.");
  }

  try {
    const deleted = await dataConnect.executeGraphql<{ plan_delete: unknown }, { id: number }>(
      DELETE_PLAN_MUTATION,
      { variables: { id: planId } },
    );

    return { id: getIdFromKeyOutput(deleted.data.plan_delete) ?? planId };
  } catch (error) {
    console.error("Error in deletePlan:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while deleting plan.");
  }
});
