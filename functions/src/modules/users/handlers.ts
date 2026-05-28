import { https } from "firebase-functions/v1";
import { listUsers as dcListUsers } from "@dataconnect/admin-generated";
import { UPDATE_USER_MUTATION } from "../../dataconnectOperations.js";
import { shouldSyncStudentWorkspace, syncStudentToWorkspace } from "../../workspace/studentWorkspaceSync.js";
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
  getPermisoById,
  waitForDataConnectUserIdByDocumentId,
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
      permisoId: user.permisoId ? String(user.permisoId) : "",
      permisoTitulo: "Sin Permiso",
      permisoLevel: 0,
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

  const { email, password, username, permisoId, level, ...otherData } = data;
  if (!email || !password || !username || !permisoId) {
    throw new https.HttpsError("invalid-argument", "Email, password, username, and permisoId are required.");
  }

  const permisoNumberId = toNumber(permisoId, -1);
  if (permisoNumberId <= 0) {
    throw new https.HttpsError("invalid-argument", "permisoId must be a valid numeric ID.");
  }

  try {
    const permiso = await getPermisoById(permisoNumberId);
    if (!permiso) {
      throw new https.HttpsError("not-found", `The permission ID '${permisoId}' does not exist.`);
    }

    const permissionLevel = toNumber(level, permiso.scala ?? DEFAULT_LEVEL);

    const userRecord = await authAdmin.createUser({
      email,
      password,
      displayName: username,
      emailVerified: true,
    });
    await authAdmin.updateUser(userRecord.uid, { emailVerified: true });
    const createdAuthUser = await authAdmin.getUser(userRecord.uid);
    if (!createdAuthUser.emailVerified) {
      throw new https.HttpsError("failed-precondition", "No se pudo activar la verificacion de correo al crear el usuario.");
    }
    await authAdmin.setCustomUserClaims(userRecord.uid, { role: String(permisoNumberId), level: permissionLevel });

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
        permisoId: permisoNumberId,
        ...otherData,
      },
      {
        documentId: userRecord.uid,
        email,
        username,
        displayName: username,
        photoURL: null,
        provider: "password",
        permisoId: permisoNumberId,
      },
    );

    const triggerProfileId = await waitForDataConnectUserIdByDocumentId(userRecord.uid);
    if (!triggerProfileId) {
      throw new https.HttpsError("failed-precondition", "No se pudo sincronizar el perfil del usuario en Data Connect. Intenta nuevamente.");
    }

    const updated = await dataConnect.executeGraphql<{ user_update: unknown }, { id: number; data: DataConnectUserInput }>(
      UPDATE_USER_MUTATION,
      { variables: { id: triggerProfileId, data: profileData } },
    );
    const dataConnectId = getIdFromKeyOutput(updated.data.user_update) ?? triggerProfileId;

    const shouldSyncStudent = shouldSyncStudentWorkspace(permisoNumberId, permiso?.titulo);
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
      result: `Successfully created user ${userRecord.uid} with role ${permisoNumberId}.`,
      uid: userRecord.uid,
      emailVerified: createdAuthUser.emailVerified,
      dataConnectId,
      workspaceSynced: shouldSyncStudent,
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
    const existingId = await findDataConnectUserIdByDocumentId(documentId);
    if (!existingId) {
      throw new https.HttpsError("not-found", `No Data Connect user was found for documentId '${documentId}'.`);
    }

    const payload = buildUserDataFromInput(data as Record<string, unknown>, { documentId });
    const updated = await dataConnect.executeGraphql<{ user_update: unknown }, { id: number; data: DataConnectUserInput }>(
      UPDATE_USER_MUTATION,
      { variables: { id: existingId, data: payload } },
    );

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
    console.error("Error in deleteUser:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while deleting user.");
  }
});
