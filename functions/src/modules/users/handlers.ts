import { https } from "firebase-functions/v1";
import { getFirestore } from "firebase-admin/firestore";
import { UPDATE_USER_MUTATION } from "../../dataconnectOperations.js";
import { deleteMatriculasForUser } from "../core/matriculaDeletion.js";
import {
  deleteStudentFromWorkspace,
  resolveStudentWorkspacePrimaryEmail,
  resolveWorkspacePrimaryEmail,
  syncWorkspaceRoleGroups,
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

const LIST_USERS_QUERY = `
  query ListUsersManual {
    users(limit: 10000, orderBy: [{ id: DESC }]) {
      id
      documentId
      username
      email
      blocked
      avatar
      dniImagenFrenteProcesadaUrl
      dniImagenReversoProcesadaUrl
      nombre
      apellidoPaterno
      apellidoMaterno
      celular
      telefono
      direccion
      distrito
      tipoDocumento
      dni
      sexo
      nacionalidad
      estadoCivil
      instruccion
      fechaNacimiento
      correoInstitucional
      fechaCreacion
      fechaModificacion
      emailCreador
      rolId
      rol {
        titulo
        scala
      }
    }
  }
`;

const isTransientDataConnectSqlError = (error: unknown): boolean => {
  const message = [
    String((error as { message?: string } | null)?.message || ""),
    String((error as { stack?: string } | null)?.stack || ""),
    String(error || ""),
  ].join("\n");

  return (
    message.includes("unexpected message 'E'; expected ReadyForQuery")
    || message.includes("Failed to prepare SQL statement")
    || message.includes("Cannot prepare SQL statement")
    || message.includes("code = FailedPrecondition")
  );
};

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

let listUsersQueryQueue: Promise<unknown> = Promise.resolve();
const MATRICULA_AVATAR_EXTRACTION_COLLECTION = "matriculaAvatarExtractionJobs";

async function executeListUsersQuery(): Promise<Array<Record<string, unknown>>> {
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await dataConnect.executeGraphql<{
        users: Array<Record<string, unknown>>;
      }, Record<string, never>>(LIST_USERS_QUERY);

      return response.data.users ?? [];
    } catch (error) {
      lastError = error;
      if (!isTransientDataConnectSqlError(error) || attempt >= 2) {
        throw error;
      }

      console.warn(`Transient Data Connect listUsers failure, retrying attempt ${attempt + 2}.`, error);
      await wait(200 * (attempt + 1));
    }
  }

  throw lastError;
}

async function executeListUsersQuerySerialized(): Promise<Array<Record<string, unknown>>> {
  const runAfterPrevious = listUsersQueryQueue.catch(() => undefined);
  const current = runAfterPrevious.then(() => executeListUsersQuery());

  listUsersQueryQueue = current.catch(() => undefined);
  return current;
}

async function hydrateProcessedAvatarThumbnails(
  users: Array<Record<string, unknown>>,
): Promise<Array<Record<string, unknown>>> {
  const userIds = new Set(
    users
      .map((user) => toNumber(user.id, 0))
      .filter((id) => id > 0),
  );
  if (userIds.size === 0) return users;

  const snapshot = await getFirestore()
    .collection(MATRICULA_AVATAR_EXTRACTION_COLLECTION)
    .orderBy("updatedAt", "desc")
    .limit(1000)
    .get();

  const thumbnailByUserId = new Map<number, string>();
  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    const userId = toNumber(data.userId, 0);
    if (!userIds.has(userId) || thumbnailByUserId.has(userId) || data.status !== "completed") return;

    const avatarTamanos = data.avatarTamanos as {
      pequeno?: { url?: unknown } | null;
      grande?: { url?: unknown } | null;
    } | null;
    const avatar = data.avatar as { url?: unknown } | null;
    const thumbnail =
      asNullableString(avatarTamanos?.pequeno?.url)
      ?? asNullableString(avatarTamanos?.grande?.url)
      ?? asNullableString(avatar?.url);

    if (thumbnail) {
      thumbnailByUserId.set(userId, thumbnail);
    }
  });

  if (thumbnailByUserId.size === 0) return users;

  return users.map((user) => {
    const userId = toNumber(user.id, 0);
    const avatarPequeno = thumbnailByUserId.get(userId);
    return avatarPequeno ? { ...user, avatarPequeno } : user;
  });
}

function isStudentToTeacherOrHigherTransition(
  previousRoleId: number | null | undefined,
  nextRoleId: number | null | undefined,
): boolean {
  const previous = Number(previousRoleId ?? 0);
  const next = Number(nextRoleId ?? 0);
  return previous >= 1 && previous <= 3 && next >= 4 && next <= 8;
}

function isTeacherOrStaffToStudentTransition(
  previousRoleId: number | null | undefined,
  nextRoleId: number | null | undefined,
): boolean {
  const previous = Number(previousRoleId ?? 0);
  const next = Number(nextRoleId ?? 0);
  return previous >= 4 && previous <= 8 && next >= 1 && next <= 3;
}

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
    const users = (await hydrateProcessedAvatarThumbnails(await executeListUsersQuerySerialized()))
      .slice()
      .sort((a, b) => toNumber(b.id, 0) - toNumber(a.id, 0))
      .map((user) => ({
        ...user,
        bloqueado: Boolean(user.blocked),
        rolId: user.rolId ? String(user.rolId) : "",
        rolTitulo: (user.rol as { titulo?: string | null } | null)?.titulo ?? "Sin Rol",
        rolLevel: (user.rol as { scala?: number | null } | null)?.scala ?? 0,
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
  const authPrimaryEmail = asNullableString(data?.correo_institucional ?? data?.correoInstitucional);
  if (!authPrimaryEmail) {
    throw new https.HttpsError(
      "invalid-argument",
      "correo_institucional es requerido para crear/actualizar la cuenta principal.",
    );
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
    const nowIso = new Date().toISOString();
    const requesterEmail = asNullableString(context.auth?.token?.email);
    const creatorEmail =
      asNullableString(data?.email_creador ?? data?.emailCreador)
      ?? requesterEmail
      ?? null;
    const splitName = separarNombreCompleto(username);
    let userRecord: Awaited<ReturnType<typeof authAdmin.getUser>>;
    let existedInAuth = false;

    const existingAuthUser = await authAdmin
      .getUserByEmail(authPrimaryEmail)
      .catch((error: unknown) => ((error as { code?: string } | null)?.code === "auth/user-not-found" ? null : Promise.reject(error)));

    if (existingAuthUser) {
      await authAdmin.updateUser(existingAuthUser.uid, {
        displayName: username,
        password,
        emailVerified: true,
        disabled: blockedForAuth,
      });
      userRecord = await authAdmin.getUser(existingAuthUser.uid);
      existedInAuth = true;
    } else {
      const created = await authAdmin.createUser({
        email: authPrimaryEmail,
        password,
        displayName: username,
        emailVerified: true,
        disabled: blockedForAuth,
      });
      await authAdmin.updateUser(created.uid, { emailVerified: true });
      userRecord = await authAdmin.getUser(created.uid);
    }

    const createdAuthUser = userRecord;
    if (!createdAuthUser.emailVerified) {
      throw new https.HttpsError("failed-precondition", "No se pudo activar la verificacion de correo al crear el usuario.");
    }
    await authAdmin.setCustomUserClaims(createdAuthUser.uid, { role: String(roleNumberId), level: permissionLevel });

    const { nombre, apellido_paterno, apellido_materno } = splitName;
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
        photoURL: createdAuthUser.photoURL || null,
        provider: "password",
        rolId: roleNumberId,
      },
    );

    const profileDataForPersist = profileData;
    profileDataForPersist.nacionalidad = profileDataForPersist.nacionalidad ?? "PERUANA";
    profileDataForPersist.fechaCreacion = profileDataForPersist.fechaCreacion ?? nowIso;
    profileDataForPersist.fechaModificacion =
      profileDataForPersist.fechaModificacion ?? profileDataForPersist.fechaCreacion ?? nowIso;
    profileDataForPersist.emailCreador = profileDataForPersist.emailCreador ?? creatorEmail;
    if (!profileDataForPersist.apellidoMaterno || !profileDataForPersist.celular || !profileDataForPersist.dni) {
      console.warn("createNewUser payload has empty critical fields", {
        apellidoMaterno: profileDataForPersist.apellidoMaterno ?? null,
        celular: profileDataForPersist.celular ?? null,
        dni: profileDataForPersist.dni ?? null,
        receivedKeys: Object.keys(data || {}),
      });
    }

    const dataConnectId = await upsertDataConnectUserByDocumentId(createdAuthUser.uid, profileDataForPersist);

    const shouldSyncStudent = shouldSyncStudentWorkspace(roleNumberId, role?.titulo);
    const workspacePrimaryEmail = resolveWorkspacePrimaryEmail({
      roleId: roleNumberId,
      roleTitle: role?.titulo ?? null,
      nombre: profileData.nombre ?? null,
      apellidoPaterno: profileData.apellidoPaterno ?? null,
      apellidoMaterno: profileData.apellidoMaterno ?? null,
      dni: profileDataForPersist.dni ?? null,
      email: profileData.email ?? email ?? null,
      institutionalEmail: profileDataForPersist.correoInstitucional ?? authPrimaryEmail ?? null,
    });
    const fechaCreacionForWorkspace = profileDataForPersist.fechaCreacion ?? nowIso;
    const fechaModificacionForWorkspace = profileDataForPersist.fechaModificacion ?? fechaCreacionForWorkspace;
    if (shouldSyncStudent) {
      if (!workspacePrimaryEmail) {
        throw new https.HttpsError(
          "failed-precondition",
          "No se pudo resolver el correo principal de Workspace. Verifica que el DNI sea valido.",
        );
      }

      try {
        await syncStudentToWorkspace({
          email: workspacePrimaryEmail,
          institutionalEmail: profileDataForPersist.correoInstitucional ?? authPrimaryEmail ?? null,
          formEmail: profileDataForPersist.email ?? email ?? null,
          avatar: profileDataForPersist.avatar ?? null,
          password,
          username,
          roleId: roleNumberId,
          roleTitle: role?.titulo ?? null,
          fechaCreacion: fechaCreacionForWorkspace,
          fechaModificacion: fechaModificacionForWorkspace,
          apellidoPaterno: profileDataForPersist.apellidoPaterno ?? null,
          apellidoMaterno: profileDataForPersist.apellidoMaterno ?? null,
          nombre: profileDataForPersist.nombre ?? null,
          direccion: profileDataForPersist.direccion ?? null,
          distrito: profileDataForPersist.distrito ?? null,
          telefono: profileDataForPersist.telefono ?? null,
          celular: profileDataForPersist.celular ?? null,
          dni: profileDataForPersist.dni ?? null,
          tipoDocumento: profileDataForPersist.tipoDocumento ?? null,
          sexo: profileDataForPersist.sexo ?? null,
          fechaNacimiento: profileDataForPersist.fechaNacimiento ?? null,
          instruccion: profileDataForPersist.instruccion ?? null,
          estadoCivil: profileDataForPersist.estadoCivil ?? null,
          blocked: Boolean(profileDataForPersist.blocked),
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
      workspacePrimaryEmail: shouldSyncStudent ? workspacePrimaryEmail : null,
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
    const previousInstitutionalFromRequest = asNullableString(
      data?.previousCorreoInstitucional ?? data?.previous_cuenta_institucional,
    );
    const previousDniFromRequest = asNullableString(data?.previousDni);
    const existingId = await findDataConnectUserIdByDocumentId(documentId);
    if (!existingId) {
      throw new https.HttpsError("not-found", `No Data Connect user was found for documentId '${documentId}'.`);
    }

    const nowIso = new Date().toISOString();
    const payload = buildUserDataFromInput(data as Record<string, unknown>, { documentId });
    payload.fechaModificacion = nowIso;
    if (!payload.apellidoMaterno || !payload.celular || !payload.dni) {
      console.warn("updateUserProfile payload has empty critical fields", {
        apellidoMaterno: payload.apellidoMaterno ?? null,
        celular: payload.celular ?? null,
        dni: payload.dni ?? null,
        receivedKeys: Object.keys(data || {}),
      });
    }
    const roleNumberId = toNumber(payload.rolId, -1);
    const previousRoleNumberId = toNumber(data?.previousRolId, -1);
    if (isStudentToTeacherOrHigherTransition(previousRoleNumberId, roleNumberId)) {
      throw new https.HttpsError(
        "failed-precondition",
        "No se puede cambiar de rol a docente o superior.",
      );
    }
    if (isTeacherOrStaffToStudentTransition(previousRoleNumberId, roleNumberId)) {
      throw new https.HttpsError(
        "failed-precondition",
        "No es posible cambiar a este tipo de rol.",
      );
    }

    const authUser = await authAdmin
      .getUser(documentId)
      .catch((error: unknown) => ((error as { code?: string } | null)?.code === "auth/user-not-found" ? null : Promise.reject(error)));
    if (!payload.avatar && authUser?.photoURL) {
      payload.avatar = authUser.photoURL;
    }
    const nextAuthPrimaryEmail = asNullableString(payload.correoInstitucional);
    if (authUser) {
      const authUpdate: {
        email?: string;
        emailVerified?: boolean;
        disabled: boolean;
      } = {
        disabled: Boolean(payload.blocked),
      };

      const currentAuthPrimaryEmail = String(authUser.email || "").trim().toLowerCase();
      const normalizedNextAuthPrimaryEmail = nextAuthPrimaryEmail?.trim().toLowerCase() || "";

      if (normalizedNextAuthPrimaryEmail && currentAuthPrimaryEmail !== normalizedNextAuthPrimaryEmail) {
        const authUserByNewEmail = await authAdmin
          .getUserByEmail(normalizedNextAuthPrimaryEmail)
          .catch((error: unknown) => ((error as { code?: string } | null)?.code === "auth/user-not-found" ? null : Promise.reject(error)));

        if (authUserByNewEmail && authUserByNewEmail.uid !== documentId) {
          throw new https.HttpsError("already-exists", "El correo institucional pertenece a otro usuario.");
        }

        authUpdate.email = normalizedNextAuthPrimaryEmail;
        authUpdate.emailVerified = true;
      }

      await authAdmin.updateUser(documentId, authUpdate);
    }

    const updated = await dataConnect.executeGraphql<{ user_update: unknown }, { id: number; data: DataConnectUserInput }>(
      UPDATE_USER_MUTATION,
      { variables: { id: existingId, data: payload } },
    );

    const role = roleNumberId > 0 ? await getRoleById(roleNumberId) : null;
    const shouldSyncStudent = role ? shouldSyncStudentWorkspace(roleNumberId, role.titulo) : false;
    const previousRoleTitle = asNullableString(data?.previousRoleTitle);
    const shouldSyncPreviousRole =
      previousRoleNumberId > 0
      && shouldSyncStudentWorkspace(previousRoleNumberId, previousRoleTitle);
    const fechaCreacionForWorkspace =
      payload.fechaCreacion
      ?? asNullableString(data?.fecha_creacion ?? data?.fechaCreacion)
      ?? nowIso;
    const fechaModificacionForWorkspace = payload.fechaModificacion ?? nowIso;
    let workspaceWarning: string | null = null;
    if (shouldSyncStudent) {
      const previousWorkspaceEmail =
        resolveWorkspacePrimaryEmail({
          roleId: previousRoleNumberId > 0 ? previousRoleNumberId : roleNumberId,
          roleTitle: previousRoleTitle ?? role?.titulo ?? null,
          nombre: asNullableString(data?.previousNombre) ?? payload.nombre ?? null,
          apellidoPaterno: asNullableString(data?.previousApellidoPaterno) ?? payload.apellidoPaterno ?? null,
          apellidoMaterno: asNullableString(data?.previousApellidoMaterno) ?? payload.apellidoMaterno ?? null,
          dni: previousDniFromRequest ?? null,
          email: previousEmailFromRequest ?? authUser?.email ?? null,
          institutionalEmail: previousInstitutionalFromRequest ?? null,
        });
      const workspaceEmail = resolveWorkspacePrimaryEmail({
        roleId: roleNumberId,
        roleTitle: role?.titulo ?? null,
        nombre: payload.nombre ?? null,
        apellidoPaterno: payload.apellidoPaterno ?? null,
        apellidoMaterno: payload.apellidoMaterno ?? null,
        dni: payload.dni ?? null,
        email: payload.email ?? previousEmailFromRequest ?? authUser?.email ?? null,
        institutionalEmail: payload.correoInstitucional ?? null,
      });
      const workspaceUsername = payload.username ?? authUser?.displayName ?? payload.nombre ?? "Estudiante";

      if (!workspaceEmail) {
        throw new https.HttpsError("failed-precondition", "No se encontro un correo para sincronizar en Workspace.");
      }

      try {
        await syncStudentToWorkspace({
          email: workspaceEmail,
          institutionalEmail: payload.correoInstitucional ?? null,
          formEmail: payload.email ?? previousEmailFromRequest ?? authUser?.email ?? null,
          avatar: payload.avatar ?? null,
          username: workspaceUsername,
          roleId: roleNumberId,
          roleTitle: role?.titulo ?? null,
          fechaCreacion: fechaCreacionForWorkspace,
          fechaModificacion: fechaModificacionForWorkspace,
          apellidoPaterno: payload.apellidoPaterno ?? null,
          apellidoMaterno: payload.apellidoMaterno ?? null,
          nombre: payload.nombre ?? null,
          direccion: payload.direccion ?? null,
          distrito: payload.distrito ?? null,
          telefono: payload.telefono ?? null,
          celular: payload.celular ?? null,
          dni: payload.dni ?? null,
          tipoDocumento: payload.tipoDocumento ?? null,
          sexo: payload.sexo ?? null,
          fechaNacimiento: payload.fechaNacimiento ?? null,
          instruccion: payload.instruccion ?? null,
          estadoCivil: payload.estadoCivil ?? null,
          blocked: Boolean(payload.blocked),
        }, { previousEmail: previousWorkspaceEmail, createIfMissing: false });
      } catch (workspaceError: unknown) {
        const rawMessage = String((workspaceError as { message?: string } | null)?.message || "");
        const safeMessage = rawMessage || "No se pudo sincronizar los cambios del usuario con Google Workspace.";
        if (safeMessage.includes("Usuario no encontrado en Workspace") && safeMessage.includes("No se recreo")) {
          console.warn("Workspace user missing in updateUserProfile:", workspaceError);
          workspaceWarning = safeMessage;
        } else {
          console.error("Workspace sync failed in updateUserProfile:", workspaceError);
          throw new https.HttpsError("failed-precondition", safeMessage);
        }
      }
    } else if (shouldSyncPreviousRole) {
      const fallbackWorkspaceEmail =
        previousInstitutionalFromRequest
        ?? previousEmailFromRequest
        ?? payload.correoInstitucional
        ?? payload.email
        ?? null;
      const previousWorkspaceEmail = resolveWorkspacePrimaryEmail({
        roleId: previousRoleNumberId,
        roleTitle: previousRoleTitle,
        nombre: asNullableString(data?.previousNombre) ?? payload.nombre ?? null,
        apellidoPaterno: asNullableString(data?.previousApellidoPaterno) ?? payload.apellidoPaterno ?? null,
        apellidoMaterno: asNullableString(data?.previousApellidoMaterno) ?? payload.apellidoMaterno ?? null,
        dni: previousDniFromRequest ?? payload.dni ?? null,
        email: fallbackWorkspaceEmail,
        institutionalEmail: previousInstitutionalFromRequest ?? payload.correoInstitucional ?? null,
      });

      if (previousWorkspaceEmail) {
        try {
          await syncWorkspaceRoleGroups(previousWorkspaceEmail, roleNumberId > 0 ? roleNumberId : null);
        } catch (workspaceGroupError: unknown) {
          const rawMessage = String((workspaceGroupError as { message?: string } | null)?.message || "");
          const safeMessage = rawMessage || "No se pudo sincronizar los grupos de Workspace para el usuario.";
          console.error("Workspace group sync failed in updateUserProfile:", workspaceGroupError);
          throw new https.HttpsError("failed-precondition", safeMessage);
        }
      }
    }

    return { id: getIdFromKeyOutput(updated.data.user_update) ?? existingId, workspaceWarning };
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
  const requesterRole = Number(context.auth?.token?.role ?? 0);
  if (new Set<number>([5, 6, 7]).has(requesterRole)) {
    throw new https.HttpsError("permission-denied", "No tienes permiso para eliminar usuarios.");
  }
  const requesterLevel = context.auth?.token?.level ?? 0;
  if (requesterLevel < 600) {
    throw new https.HttpsError("permission-denied", "You do not have permission to delete users.");
  }

  const uid = asNullableString(data?.uid ?? data?.documentId);
  if (!uid) {
    throw new https.HttpsError("invalid-argument", "uid is required.");
  }

  try {
    const dataConnectUserId = await findDataConnectUserIdByDocumentId(uid);
    const deletedMatriculaIds = dataConnectUserId ? await deleteMatriculasForUser(dataConnectUserId) : [];

    const authUserBeforeDelete = await authAdmin
      .getUser(uid)
      .catch((error: unknown) => ((error as { code?: string } | null)?.code === "auth/user-not-found" ? null : Promise.reject(error)));

    const rolIdForWorkspace = toNumber(data?.rolId, -1);
    const workspaceEmailByRole = resolveWorkspacePrimaryEmail({
      roleId: rolIdForWorkspace > 0 ? rolIdForWorkspace : null,
      roleTitle: asNullableString(data?.roleTitle ?? data?.rolTitulo) ?? null,
      nombre: asNullableString(data?.nombre) ?? null,
      apellidoPaterno: asNullableString(data?.apellidoPaterno) ?? null,
      apellidoMaterno: asNullableString(data?.apellidoMaterno) ?? null,
      dni: asNullableString(data?.dni) ?? null,
      email: asNullableString(data?.email) ?? authUserBeforeDelete?.email ?? null,
      institutionalEmail: asNullableString(data?.correo_institucional ?? data?.correoInstitucional) ?? null,
    });

    const workspaceCandidates = Array.from(
      new Set(
        [
          workspaceEmailByRole,
          resolveStudentWorkspacePrimaryEmail(asNullableString(data?.dni) ?? null, null),
          resolveStudentWorkspacePrimaryEmail(null, authUserBeforeDelete?.email ?? null),
          resolveStudentWorkspacePrimaryEmail(null, asNullableString(data?.email) ?? null),
        ]
          .map((value) => String(value || "").trim().toLowerCase())
          .filter((value) => value.length > 0),
      ),
    );

    for (const workspaceEmail of workspaceCandidates) {
      try {
        await deleteStudentFromWorkspace(workspaceEmail);
      } catch (workspaceError: unknown) {
        console.warn(
          `Workspace delete skipped for '${workspaceEmail}' in deleteUser. Main deletion will continue.`,
          workspaceError,
        );
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
      deletedMatriculaIds,
    };
  } catch (error) {
    if (error instanceof https.HttpsError) throw error;
    console.error("Error in deleteUser:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while deleting user.");
  }
});
