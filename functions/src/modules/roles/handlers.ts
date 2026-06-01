import { https } from "firebase-functions/v1";
import { listRoles as dcListRoles, listUsers as dcListUsers } from "@dataconnect/admin-generated";
import {
  buildRoleDataFromInput,
  getIdFromKeyOutput,
  toNumber,
  toNumberOrNull,
} from "../core/userMappers.js";
import { authAdmin, DEFAULT_LEVEL } from "../core/authCore.js";
import { dataConnect, findDataConnectUserIdByDocumentId, getRoleById } from "../core/dataConnectCore.js";
import { DataConnectRoleInput, DataConnectUserInput } from "../core/types.js";
import { INSERT_ROLE_MUTATION, UPDATE_ROLE_MUTATION, UPDATE_USER_MUTATION } from "../../dataconnectOperations.js";

export const listRoles = https.onCall(async (_data, context) => {
  const requesterLevel = context.auth?.token?.level ?? 0;
  if (requesterLevel < 600) {
    throw new https.HttpsError("permission-denied", "You do not have permission to list roles.");
  }

  try {
    const response = await dcListRoles(dataConnect);
    const roles = (response.data.roles ?? []).slice().sort((a, b) => (a.scala ?? 0) - (b.scala ?? 0));
    return { roles };
  } catch (error) {
    console.error("Error in listRoles:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while listing roles.");
  }
});

export const getRole = https.onCall(async (data, context) => {
  const requesterLevel = context.auth?.token?.level ?? 0;
  if (requesterLevel < 600) {
    throw new https.HttpsError("permission-denied", "You do not have permission to get roles.");
  }

  const roleId = toNumber(data?.id, -1);
  if (roleId <= 0) {
    throw new https.HttpsError("invalid-argument", "id is required.");
  }

  try {
    const role = await getRoleById(roleId);
    return { role };
  } catch (error) {
    console.error("Error in getRole:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while getting role.");
  }
});

export const createOrUpdateRole = https.onCall(async (data, context) => {
  const requesterLevel = context.auth?.token?.level ?? 0;
  if (requesterLevel < 600) {
    throw new https.HttpsError("permission-denied", "You do not have permission to mutate roles.");
  }

  const payload = buildRoleDataFromInput(data as Record<string, unknown>);
  if (!payload.titulo || payload.scala === null || payload.scala === undefined) {
    throw new https.HttpsError("invalid-argument", "titulo and scala are required.");
  }

  const roleId = toNumberOrNull(data?.id);

  try {
    if (roleId) {
      const updated = await dataConnect.executeGraphql<{ rol_update: unknown }, { id: number; data: DataConnectRoleInput }>(
        UPDATE_ROLE_MUTATION,
        { variables: { id: roleId, data: payload } },
      );

      return { id: getIdFromKeyOutput(updated.data.rol_update) ?? roleId };
    }

    const created = await dataConnect.executeGraphql<{ rol_insert: unknown }, { data: DataConnectRoleInput }>(
      INSERT_ROLE_MUTATION,
      { variables: { data: payload } },
    );

    return { id: getIdFromKeyOutput(created.data.rol_insert) };
  } catch (error) {
    console.error("Error in createOrUpdateRole:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while saving role.");
  }
});

export const setUserRole = https.onCall(async (data, context) => {
  const requesterLevel = context.auth?.token?.level ?? 0;
  if (requesterLevel < 600) {
    throw new https.HttpsError("permission-denied", "You do not have permission to change roles.");
  }

  const roleId = data?.roleId ?? data?.rolId;
  const { uid, level } = data;
  if (!uid || !roleId) {
    throw new https.HttpsError("invalid-argument", "User ID and roleId are required.");
  }

  const roleNumberId = toNumber(roleId, -1);
  if (roleNumberId <= 0) {
    throw new https.HttpsError("invalid-argument", "roleId must be a valid numeric role ID.");
  }

  try {
    const role = await getRoleById(roleNumberId);
    if (!role) {
      throw new https.HttpsError("not-found", `The role ID '${roleId}' does not exist.`);
    }

    const newLevel = toNumber(level, role.scala ?? DEFAULT_LEVEL);
    await authAdmin.setCustomUserClaims(uid, { role: String(roleNumberId), level: newLevel });

    const existingId = await findDataConnectUserIdByDocumentId(uid);
    if (existingId) {
      const usersResponse = await dcListUsers(dataConnect);
      const existingUser = (usersResponse.data.users || []).find((user) => String(user.documentId || "") === String(uid));
      const mergedUserData: DataConnectUserInput = existingUser
        ? {
          documentId: existingUser.documentId ?? null,
          username: existingUser.username ?? null,
          email: existingUser.email ?? null,
          blocked: existingUser.blocked ?? undefined,
          avatar: existingUser.avatar ?? null,
          nombre: existingUser.nombre ?? null,
          apellidoPaterno: existingUser.apellidoPaterno ?? null,
          apellidoMaterno: existingUser.apellidoMaterno ?? null,
          celular: existingUser.celular ?? null,
          telefono: existingUser.telefono ?? null,
          direccion: existingUser.direccion ?? null,
          distrito: existingUser.distrito ?? null,
          tipoDocumento: existingUser.tipoDocumento ?? null,
          dni: existingUser.dni ?? null,
          sexo: existingUser.sexo ?? null,
          estadoCivil: existingUser.estadoCivil ?? null,
          instruccion: existingUser.instruccion ?? null,
          fechaNacimiento: existingUser.fechaNacimiento ?? null,
          rolId: roleNumberId,
        }
        : { rolId: roleNumberId };

      await dataConnect.executeGraphql<{ user_update: unknown }, { id: number; data: DataConnectUserInput }>(
        UPDATE_USER_MUTATION,
        { variables: { id: existingId, data: mergedUserData } },
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
