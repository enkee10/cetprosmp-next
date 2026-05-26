import { https } from "firebase-functions/v1";
import { listPermisos as dcListPermisos } from "@dataconnect/admin-generated";
import {
  buildPermisoDataFromInput,
  getIdFromKeyOutput,
  toNumber,
  toNumberOrNull,
} from "../core/userMappers.js";
import { authAdmin, DEFAULT_LEVEL } from "../core/authCore.js";
import { dataConnect, findDataConnectUserIdByDocumentId, getPermisoById } from "../core/dataConnectCore.js";
import { DataConnectPermisoInput, DataConnectUserInput } from "../core/types.js";
import { INSERT_PERMISO_MUTATION, UPDATE_PERMISO_MUTATION, UPDATE_USER_MUTATION } from "../../dataconnectOperations.js";

export const listPermisos = https.onCall(async (_data, context) => {
  const requesterLevel = context.auth?.token?.level ?? 0;
  if (requesterLevel < 600) {
    throw new https.HttpsError("permission-denied", "You do not have permission to list permissions.");
  }

  try {
    const response = await dcListPermisos(dataConnect);
    const permisos = (response.data.permisos ?? []).slice().sort((a, b) => (a.scala ?? 0) - (b.scala ?? 0));
    return { permisos };
  } catch (error) {
    console.error("Error in listPermisos:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while listing permissions.");
  }
});

export const getPermiso = https.onCall(async (data, context) => {
  const requesterLevel = context.auth?.token?.level ?? 0;
  if (requesterLevel < 600) {
    throw new https.HttpsError("permission-denied", "You do not have permission to get permissions.");
  }

  const permisoId = toNumber(data?.id, -1);
  if (permisoId <= 0) {
    throw new https.HttpsError("invalid-argument", "id is required.");
  }

  try {
    const permiso = await getPermisoById(permisoId);
    return { permiso };
  } catch (error) {
    console.error("Error in getPermiso:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while getting permission.");
  }
});

export const createOrUpdatePermiso = https.onCall(async (data, context) => {
  const requesterLevel = context.auth?.token?.level ?? 0;
  if (requesterLevel < 600) {
    throw new https.HttpsError("permission-denied", "You do not have permission to mutate permissions.");
  }

  const payload = buildPermisoDataFromInput(data as Record<string, unknown>);
  if (!payload.titulo || payload.scala === null || payload.scala === undefined) {
    throw new https.HttpsError("invalid-argument", "titulo and scala are required.");
  }

  const permisoId = toNumberOrNull(data?.id);

  try {
    if (permisoId) {
      const updated = await dataConnect.executeGraphql<{ permiso_update: unknown }, { id: number; data: DataConnectPermisoInput }>(
        UPDATE_PERMISO_MUTATION,
        { variables: { id: permisoId, data: payload } },
      );

      return { id: getIdFromKeyOutput(updated.data.permiso_update) ?? permisoId };
    }

    const created = await dataConnect.executeGraphql<{ permiso_insert: unknown }, { data: DataConnectPermisoInput }>(
      INSERT_PERMISO_MUTATION,
      { variables: { data: payload } },
    );

    return { id: getIdFromKeyOutput(created.data.permiso_insert) };
  } catch (error) {
    console.error("Error in createOrUpdatePermiso:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while saving permission.");
  }
});

export const setUserRole = https.onCall(async (data, context) => {
  const requesterLevel = context.auth?.token?.level ?? 0;
  if (requesterLevel < 600) {
    throw new https.HttpsError("permission-denied", "You do not have permission to change roles.");
  }

  const { uid, roleId, level } = data;
  if (!uid || !roleId) {
    throw new https.HttpsError("invalid-argument", "User ID and Role ID are required.");
  }

  const permisoNumberId = toNumber(roleId, -1);
  if (permisoNumberId <= 0) {
    throw new https.HttpsError("invalid-argument", "roleId must be a valid numeric permission ID.");
  }

  try {
    const permiso = await getPermisoById(permisoNumberId);
    if (!permiso) {
      throw new https.HttpsError("not-found", `The permission ID '${roleId}' does not exist.`);
    }

    const newLevel = toNumber(level, permiso.scala ?? DEFAULT_LEVEL);
    await authAdmin.setCustomUserClaims(uid, { role: String(permisoNumberId), level: newLevel });

    const existingId = await findDataConnectUserIdByDocumentId(uid);
    if (existingId) {
      await dataConnect.executeGraphql<{ user_update: unknown }, { id: number; data: DataConnectUserInput }>(
        UPDATE_USER_MUTATION,
        { variables: { id: existingId, data: { permisoId: permisoNumberId } } },
      );
    }

    return { result: `Role updated for user ${uid}. New level: ${newLevel}.` };
  } catch (error) {
    if (error instanceof https.HttpsError) {
      throw error;
    }
    console.error("Error in setUserRole:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred.");
  }
});
