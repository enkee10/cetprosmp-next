import { https } from "firebase-functions/v1";
import { listUsers as dcListUsers } from "@dataconnect/admin-generated";
import { UPDATE_USER_MUTATION } from "../../dataconnectOperations.js";
import {
  deleteStudentFromWorkspace,
  shouldSyncStudentWorkspace,
  syncStudentToWorkspace,
} from "../../workspace/studentWorkspaceSync.js";
import {
  asNullableString,
  buildUserDataFromInput,
  getIdFromKeyOutput,
  separarNombreCompleto,
  toNumber,
} from "../core/userMappers.js";
import { authAdmin, DEFAULT_LEVEL, getInitialClaimsByEmail } from "../core/authCore.js";
import {
  dataConnect,
  deleteDataConnectUserByDocumentId,
  findDataConnectUserIdByDocumentId,
  getRoleById,
  upsertDataConnectUserByDocumentId,
} from "../core/dataConnectCore.js";
import { DataConnectUserInput } from "../core/types.js";

export const registerUser = https.onCall(async (data) => {
  const { username, email, password } = data;
  if (!username || !email || !password) {
    throw new https.HttpsError("invalid-argument", "Completa nombre de usuario, correo y contrasena.");
  }

  try {
    const userRecord = await authAdmin.createUser({ email, password, displayName: username });
    const claims = getInitialClaimsByEmail(email);
    await authAdmin.setCustomUserClaims(userRecord.uid, claims);
    return { uid: userRecord.uid, email: userRecord.email };
  } catch (error: unknown) {
    const err = error as { code?: string };

    if (err.code === "auth/email-already-exists") {
      throw new https.HttpsError("already-exists", "Ese correo ya esta registrado.");
    }
    if (err.code === "auth/invalid-email") {
      throw new https.HttpsError("invalid-argument", "El correo electronico no es valido.");
    }
    if (err.code === "auth/invalid-password") {
      throw new https.HttpsError("invalid-argument", "La contrasena debe tener al menos 6 caracteres.");
    }
    if (err.code === "auth/operation-not-allowed") {
      throw new https.HttpsError("failed-precondition", "El acceso con correo y contrasena no esta habilitado en Firebase.");
    }
    if (err.code === "auth/too-many-requests") {
      throw new https.HttpsError("resource-exhausted", "Demasiados intentos. Intenta nuevamente en unos minutos.");
    }

    console.error("Error in registerUser:", error);
    throw new https.HttpsError("internal", "Ocurrio un error inesperado mientras se registraba el usuario.");
  }
});

export const listUsers = https.onCall(async (_data, context) => {
  const requesterLevel = context.auth?.token?.level ?? 0;
  if (requesterLevel < 600) {
    throw new https.HttpsError("permission-denied", "You do not have permission to list users.");
  }

  try {
    const response = await dcListUsers(dataConnect);
    const users = (response.data.users ?? []).map((user) => ({
      ...user,
      bloqueado: Boolean(user.blocked),
      rolId: user.rolId ? String(user.rolId) : "",
      rolTitulo: "Sin Rol",
      rolLevel: 0,
    }));

    return { users };
  } catch (error) {
    console.error("Error in listUsers:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while listing users.");
  }
});

export const createNewUser = https.onCall(async (data, context) => {
  const requesterLevel = context.auth?.token?.level ?? 0;
  if (requesterLevel < 600) {
    throw new https.HttpsError("permission-denied", "You do not have permission to create new users.");
  }

  const roleId = data?.rolId;
  const { email, password, username, level, ...otherData } = data;
  if (!email || !password || !username || !roleId) {
    throw new https.HttpsError("invalid-argument", "Email, password, username, and roleId are required.");
  }

  const roleNumberId = toNumber(roleId, -1);
  if (roleNumberId <= 0) {
    throw new https.HttpsError("invalid-argument", "roleId must be a valid numeric ID.");
  }

  try {
    const role = await getRoleById(roleNumberId);
    if (!role) {
      throw new https.HttpsError("not-found", `The role ID '${roleId}' does not exist.`);
    }

    const permissionLevel = toNumber(level, role.scala ?? DEFAULT_LEVEL);
    const blockedForAuth = Boolean(otherData?.bloqueado ?? otherData?.blocked ?? false);
    let userRecord: Awaited<ReturnType<typeof authAdmin.getUser>>;
    let existedInAuth = false;

    try {
      const created = await authAdmin.createUser({
        email,
        password,
        displayName: username,
        emailVerified: true,
        disabled: blockedForAuth,
      });
      await authAdmin.updateUser(created.uid, { emailVerified: true });
      userRecord = await authAdmin.getUser(created.uid);
    } catch (authError: unknown) {
      const authCode = (authError as { code?: string } | null)?.code;
      if (authCode !== "auth/email-already-exists") {
        throw authError;
      }

      existedInAuth = true;
      const existingAuthUser = await authAdmin.getUserByEmail(email);
      await authAdmin.updateUser(existingAuthUser.uid, {
        displayName: username,
        password,
        emailVerified: true,
        disabled: blockedForAuth,
      });
      userRecord = await authAdmin.getUser(existingAuthUser.uid);
    }

    const createdAuthUser = userRecord;
    if (!createdAuthUser.emailVerified) {
      throw new https.HttpsError("failed-precondition", "No se pudo activar la verificacion de correo al crear el usuario.");
    }
    await authAdmin.setCustomUserClaims(createdAuthUser.uid, { role: String(roleNumberId), level: permissionLevel });

    const { nombre, apellido_paterno, apellido_materno } = separarNombreCompleto(username);
    const profileData = buildUserDataFromInput(
      {
        username,
        email,
        confirmed: true,
        nombre,
        apellido_paterno,
        apellido_materno,
        foto: null,
        bloqueado: false,
        rolId: roleNumberId,
        ...otherData,
      },
      {
        documentId: createdAuthUser.uid,
        email,
        username,
        displayName: username,
        photoURL: null,
        provider: "password",
        rolId: roleNumberId,
      },
    );

    const dataConnectId = await upsertDataConnectUserByDocumentId(createdAuthUser.uid, profileData);

    const shouldSyncStudent = shouldSyncStudentWorkspace(roleNumberId, role?.titulo);
    if (shouldSyncStudent) {
      try {
        await syncStudentToWorkspace({
          email,
          password,
          username,
          apellidoPaterno: profileData.apellidoPaterno ?? null,
          apellidoMaterno: profileData.apellidoMaterno ?? null,
          nombre: profileData.nombre ?? null,
          direccion: profileData.direccion ?? null,
          distrito: profileData.distrito ?? null,
          telefono: profileData.telefono ?? null,
          celular: profileData.celular ?? null,
          dni: profileData.dni ?? null,
          blocked: Boolean(profileData.blocked),
        });
      } catch (workspaceError: unknown) {
        const rawMessage = String((workspaceError as { message?: string } | null)?.message || "");
        const safeMessage = rawMessage || "No se pudo sincronizar el usuario estudiante con Google Workspace.";
        console.error("Workspace sync failed in createNewUser:", workspaceError);
        throw new https.HttpsError("failed-precondition", safeMessage);
      }
    }

    return {
      result: existedInAuth
        ? `Successfully updated existing user ${createdAuthUser.uid} with role ${roleNumberId}.`
        : `Successfully created user ${createdAuthUser.uid} with role ${roleNumberId}.`,
      uid: createdAuthUser.uid,
      emailVerified: createdAuthUser.emailVerified,
      dataConnectId,
      workspaceSynced: shouldSyncStudent,
      authAlreadyExisted: existedInAuth,
    };
  } catch (error: unknown) {
    if (error instanceof https.HttpsError) throw error;

    const err = error as { code?: string };
    const message = String((error as { message?: string } | null)?.message || "");
    if (err.code === "auth/email-already-exists") {
      throw new https.HttpsError("already-exists", "A user with this email address already exists.");
    }
    if (message.includes("fechaNacimiento is invalid Timestamp")) {
      throw new https.HttpsError("invalid-argument", "La fecha de nacimiento no es valida. Usa el formato YYYY-MM-DD.");
    }
    console.error("Error in createNewUser:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred.");
  }
});

export const updateUserProfile = https.onCall(async (data, context) => {
  const requesterLevel = context.auth?.token?.level ?? 0;
  if (requesterLevel < 600) {
    throw new https.HttpsError("permission-denied", "You do not have permission to update users.");
  }

  const documentId = asNullableString(data?.documentId ?? data?.uid);
  if (!documentId) {
    throw new https.HttpsError("invalid-argument", "documentId is required.");
  }

  try {
    const previousEmailFromRequest = asNullableString(data?.previousEmail);
    const existingId = await findDataConnectUserIdByDocumentId(documentId);
    if (!existingId) {
      throw new https.HttpsError("not-found", `No Data Connect user was found for documentId '${documentId}'.`);
    }

    const payload = buildUserDataFromInput(data as Record<string, unknown>, { documentId });
    const updated = await dataConnect.executeGraphql<{ user_update: unknown }, { id: number; data: DataConnectUserInput }>(
      UPDATE_USER_MUTATION,
      { variables: { id: existingId, data: payload } },
    );

    const roleNumberId = toNumber(payload.rolId, -1);
    const role = roleNumberId > 0 ? await getRoleById(roleNumberId) : null;
    const shouldSyncStudent = role ? shouldSyncStudentWorkspace(roleNumberId, role.titulo) : false;
    if (shouldSyncStudent) {
      const authUser = await authAdmin
        .getUser(documentId)
        .catch((error: unknown) => ((error as { code?: string } | null)?.code === "auth/user-not-found" ? null : Promise.reject(error)));

      const previousEmail = previousEmailFromRequest ?? authUser?.email ?? null;
      const workspaceEmail = payload.email ?? previousEmail ?? null;
      const workspaceUsername = payload.username ?? authUser?.displayName ?? payload.nombre ?? "Estudiante";

      if (!workspaceEmail) {
        throw new https.HttpsError("failed-precondition", "No se encontro un correo para sincronizar en Workspace.");
      }

      try {
        await syncStudentToWorkspace({
          email: workspaceEmail,
          username: workspaceUsername,
          apellidoPaterno: payload.apellidoPaterno ?? null,
          apellidoMaterno: payload.apellidoMaterno ?? null,
          nombre: payload.nombre ?? null,
          direccion: payload.direccion ?? null,
          distrito: payload.distrito ?? null,
          telefono: payload.telefono ?? null,
          celular: payload.celular ?? null,
          dni: payload.dni ?? null,
          blocked: Boolean(payload.blocked),
        }, { previousEmail });
      } catch (workspaceError: unknown) {
        const rawMessage = String((workspaceError as { message?: string } | null)?.message || "");
        const safeMessage = rawMessage || "No se pudo sincronizar los cambios del usuario con Google Workspace.";
        console.error("Workspace sync failed in updateUserProfile:", workspaceError);
        throw new https.HttpsError("failed-precondition", safeMessage);
      }
    }

    return { id: getIdFromKeyOutput(updated.data.user_update) ?? existingId };
  } catch (error) {
    if (error instanceof https.HttpsError) throw error;
    const message = String((error as { message?: string } | null)?.message || "");
    if (message.includes("fechaNacimiento is invalid Timestamp")) {
      throw new https.HttpsError("invalid-argument", "La fecha de nacimiento no es valida. Usa el formato YYYY-MM-DD.");
    }
    console.error("Error in updateUserProfile:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while updating user profile.");
  }
});

export const deleteUser = https.onCall(async (data, context) => {
  const requesterLevel = context.auth?.token?.level ?? 0;
  if (requesterLevel < 600) {
    throw new https.HttpsError("permission-denied", "You do not have permission to delete users.");
  }

  const uid = asNullableString(data?.uid ?? data?.documentId);
  if (!uid) {
    throw new https.HttpsError("invalid-argument", "uid is required.");
  }

  try {
    let workspaceEmail = asNullableString(data?.email);
    const authUserBeforeDelete = await authAdmin
      .getUser(uid)
      .catch((error: unknown) => ((error as { code?: string } | null)?.code === "auth/user-not-found" ? null : Promise.reject(error)));
    if (authUserBeforeDelete?.email) {
      workspaceEmail = authUserBeforeDelete.email;
    }
    if (workspaceEmail) {
      try {
        await deleteStudentFromWorkspace(workspaceEmail);
      } catch (workspaceError: unknown) {
        const rawMessage = String((workspaceError as { message?: string } | null)?.message || "");
        const safeMessage = rawMessage || "No se pudo eliminar el usuario de Google Workspace.";
        console.error("Workspace delete failed in deleteUser:", workspaceError);
        throw new https.HttpsError("failed-precondition", safeMessage);
      }
    }

    let authDeleted = true;
    try {
      await authAdmin.deleteUser(uid);
    } catch (error: unknown) {
      const authCode = (error as { code?: string } | null)?.code;
      if (authCode === "auth/user-not-found") {
        authDeleted = false;
      } else {
        throw error;
      }
    }

    await deleteDataConnectUserByDocumentId(uid);
    return {
      result: authDeleted
        ? `Successfully deleted user ${uid}.`
        : `User ${uid} was not present in Auth. Data Connect profile was removed.`,
    };
  } catch (error) {
    if (error instanceof https.HttpsError) throw error;
    console.error("Error in deleteUser:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while deleting user.");
  }
});
