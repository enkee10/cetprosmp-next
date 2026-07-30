import { https } from "firebase-functions/v1";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
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
import { authAdmin, DEFAULT_LEVEL, getInitialClaimsByEmail, isBlockedIntranetRole } from "../core/authCore.js";
import { requireAuthenticated, requirePermission, requireSuperUser } from "../core/permissions.js";
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
      nickName
      email
      blocked
      avatar
      recorteFotografia
      dniImagenFrenteUrl
      dniImagenReversoUrl
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
      nombreColegio
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

const GET_MY_PROFILE_QUERY = `
  query GetMyProfileManual($documentId: String!) {
    users(where: { documentId: { eq: $documentId } }, limit: 1) {
      id
      documentId
      username
      avatar
      recorteFotografia
      nombre
      apellidoPaterno
      apellidoMaterno
      rolId
      rol {
        titulo
        scala
      }
    }
  }
`;

const LIST_LOGIN_USERS_QUERY = `
  query ListLoginUsersManual {
    users(limit: 10000) {
      id
      documentId
      username
      nickName
      email
      correoInstitucional
      dni
      blocked
    }
  }
`;

const GET_USER_DNI_IMAGES_QUERY = `
  query GetUserDniImages($documentId: String!) {
    users(where: { documentId: { eq: $documentId } }, limit: 1) {
      id
      tipoDocumento
      dni
      dniImagenFrenteUrl
      dniImagenReversoUrl
      dniImagenFrenteProcesadaUrl
      dniImagenReversoProcesadaUrl
    }
  }
`;

const GET_USER_AVATAR_IMAGES_QUERY = `
  query GetUserAvatarImages($documentId: String!) {
    users(where: { documentId: { eq: $documentId } }, limit: 1) {
      id
      tipoDocumento
      dni
      avatar
      recorteFotografia
    }
  }
`;

const LIST_USER_GRUPO_MODULO_HISTORIAL_QUERY = `
  query ListUserGrupoModuloHistorialManual {
    modulosEstudiantes(limit: 200000) {
      id
      promedio
      puntaje
      matriculaId
      grupoModuloId
      grupoId
      moduloId
      matricula {
        id
        userId
        archivado
        fecha
        semestre {
          id
          titulo
        }
      }
      grupoModulo {
        id
        nombre
        inicio
        fin
        grupo {
          id
          nombreDisplay
          semestre {
            id
            titulo
          }
        }
        modulo {
          id
          titulo
          tituloComercial
        }
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

const normalizeLoginText = (value: unknown): string => String(value || "").trim().toLowerCase();

const normalizeComparableLoginText = (value: unknown): string => (
  normalizeLoginText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
);

const getEmailLocalPart = (value: unknown): string => {
  const email = normalizeLoginText(value);
  const atIndex = email.indexOf("@");
  return atIndex > 0 ? email.slice(0, atIndex) : "";
};

function getStoragePathFromDownloadUrl(value: string | null | undefined): string | undefined {
  const raw = asNullableString(value);
  if (!raw) return undefined;

  try {
    const url = new URL(raw);
    const marker = "/o/";
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex < 0) return undefined;
    const encodedPath = url.pathname.slice(markerIndex + marker.length);
    return decodeURIComponent(encodedPath);
  } catch {
    return undefined;
  }
}

async function deleteStorageFilesFromUrls(urls: Array<string | null | undefined>) {
  const paths = Array.from(
    new Set(
      urls
        .map((url) => getStoragePathFromDownloadUrl(url))
        .filter((path): path is string => Boolean(path)),
    ),
  );
  if (!paths.length) return [];

  const bucket = getStorage().bucket();
  await Promise.all(paths.map(async (path) => {
    try {
      await bucket.file(path).delete({ ignoreNotFound: true });
    } catch (error) {
      console.warn("deleteStorageFilesFromUrls skipped", { path, error });
    }
  }));
  return paths;
}

function normalizeDocumentNumberForPath(value: unknown): string {
  return String(value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function getDocumentFilePrefix(value: unknown): "dni" | "ce" {
  const normalized = String(value ?? "").trim().toUpperCase();
  return normalized === "CE" || normalized.includes("EXTRANJ") ? "ce" : "dni";
}

function getExpectedDniStoragePaths(user: { tipoDocumento?: string | null; dni?: string | null }) {
  const number = normalizeDocumentNumberForPath(user.dni);
  if (!number) return [];
  const prefix = getDocumentFilePrefix(user.tipoDocumento);
  return [
    `matriculas/documentos/${number}/${prefix}-${number}-original-frente`,
    `matriculas/documentos/${number}/${prefix}-${number}-original-reverso`,
    `matriculas/documentos-procesados/${number}/${prefix}-${number}-procesado-frente.jpg`,
    `matriculas/documentos-procesados/${number}/${prefix}-${number}-procesado-reverso.jpg`,
  ];
}

function avatarSizeSuffix(size: "grande" | "mediano" | "pequeno" | "tiny") {
  return size === "grande" ? "" : `-${size}`;
}

function getExpectedAvatarStoragePaths(user: { tipoDocumento?: string | null; dni?: string | null }) {
  const number = normalizeDocumentNumberForPath(user.dni);
  if (!number) return [];
  const prefix = getDocumentFilePrefix(user.tipoDocumento);
  const avatarModes = ["generado", "recorte"];
  const sizes = ["grande", "mediano", "pequeno", "tiny"] as const;
  return [
    ...avatarModes.flatMap((mode) =>
      sizes.flatMap((size) => [
        `usuarios/avatars/${number}/avatar-${mode}-${prefix}-${number}${avatarSizeSuffix(size)}.jpg`,
        `usuarios/avatars/${number}/avatar-${mode}-${prefix}-${number}${avatarSizeSuffix(size)}.png`,
      ]),
    ),
    `usuarios/avatars/${number}/fotorecortada-${prefix}-${number}.jpg`,
  ];
}

async function deleteStorageFilesFromPaths(paths: string[]) {
  const uniquePaths = Array.from(new Set(paths.filter(Boolean)));
  if (!uniquePaths.length) return [];

  const bucket = getStorage().bucket();
  await Promise.all(uniquePaths.map(async (path) => {
    try {
      await bucket.file(path).delete({ ignoreNotFound: true });
    } catch (error) {
      console.warn("deleteStorageFilesFromPaths skipped", { path, error });
    }
  }));
  return uniquePaths;
}

const normalizeRoleTitleForCleanup = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

function isStudentOrFormerStudentRole(user: Record<string, unknown>) {
  const roleId = toNumber(user.rolId, 0);
  const rol = user.rol && typeof user.rol === "object" ? user.rol as { titulo?: unknown } : null;
  const title = normalizeRoleTitleForCleanup(rol?.titulo);
  return roleId === 3 || title.includes("estudiante") || title.includes("alumno");
}

async function resolveExistingAuthEmail(candidates: Array<unknown>): Promise<string | null> {
  const normalizedCandidates = Array.from(
    new Set(candidates.map(normalizeLoginText).filter((value) => value.includes("@"))),
  );

  for (const email of normalizedCandidates) {
    const authUser = await authAdmin
      .getUserByEmail(email)
      .catch((error: unknown) => ((error as { code?: string } | null)?.code === "auth/user-not-found" ? null : Promise.reject(error)));
    if (authUser?.email) return authUser.email;
  }

  return null;
}

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

  const thumbnailByUserId = new Map<number, { avatarTiny?: string; avatarPequeno?: string }>();
  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    const userId = toNumber(data.userId, 0);
    if (!userIds.has(userId) || thumbnailByUserId.has(userId) || data.status !== "completed") return;

    const avatarTamanos = data.avatarTamanos as {
      tiny?: { url?: unknown } | null;
      pequeno?: { url?: unknown } | null;
      grande?: { url?: unknown } | null;
    } | null;
    const avatar = data.avatar as { url?: unknown } | null;
    const tiny =
      asNullableString(avatarTamanos?.tiny?.url)
      ?? asNullableString(avatarTamanos?.pequeno?.url)
      ?? asNullableString(avatarTamanos?.grande?.url)
      ?? asNullableString(avatar?.url);
    const pequeno =
      asNullableString(avatarTamanos?.pequeno?.url)
      ?? asNullableString(avatarTamanos?.grande?.url)
      ?? asNullableString(avatar?.url);

    if (tiny || pequeno) {
      thumbnailByUserId.set(userId, {
        avatarTiny: tiny ?? undefined,
        avatarPequeno: pequeno ?? undefined,
      });
    }
  });

  if (thumbnailByUserId.size === 0) return users;

  return users.map((user) => {
    const userId = toNumber(user.id, 0);
    const avatars = thumbnailByUserId.get(userId);
    return avatars ? { ...user, ...avatars } : user;
  });
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

export const resolveLoginEmail = https.onCall(async (data) => {
  const identifier = normalizeLoginText(data?.identifier ?? data?.email ?? data?.username);
  if (!identifier) {
    throw new https.HttpsError("invalid-argument", "Ingresa tu usuario o correo electronico.");
  }

  const directCandidates = identifier.includes("@")
    ? [identifier]
    : [`${identifier}@cetprosmp.edu.pe`];
  const directAuthEmail = await resolveExistingAuthEmail(directCandidates);
  if (directAuthEmail) return { email: directAuthEmail };

  try {
    const response = await dataConnect.executeGraphql<{
      users: Array<Record<string, unknown>>;
    }, Record<string, never>>(LIST_LOGIN_USERS_QUERY);

    const comparableIdentifier = normalizeComparableLoginText(identifier);
    const matchedUser = (response.data.users ?? []).find((user) => {
      const values = [
        user.username,
        user.nickName,
        user.email,
        user.correoInstitucional,
        user.dni,
        getEmailLocalPart(user.email),
        getEmailLocalPart(user.correoInstitucional),
      ].map(normalizeComparableLoginText);

      return values.some((value) => value.length > 0 && value === comparableIdentifier);
    });

    if (!matchedUser) {
      throw new https.HttpsError("not-found", "No existe una cuenta con ese usuario o correo.");
    }

    if (matchedUser.blocked === true) {
      throw new https.HttpsError("permission-denied", "Tu cuenta se encuentra suspendida.");
    }

    const authUserByDocumentId = normalizeLoginText(matchedUser.documentId)
      ? await authAdmin
        .getUser(String(matchedUser.documentId))
        .catch((error: unknown) => ((error as { code?: string } | null)?.code === "auth/user-not-found" ? null : Promise.reject(error)))
      : null;
    if (authUserByDocumentId?.email) return { email: authUserByDocumentId.email };

    const resolvedEmail = await resolveExistingAuthEmail([
      matchedUser.correoInstitucional,
      matchedUser.email,
      `${normalizeLoginText(matchedUser.dni)}@cetprosmp.edu.pe`,
    ]);

    if (!resolvedEmail) {
      throw new https.HttpsError("not-found", "No se encontro una cuenta de autenticacion para este usuario.");
    }

    return { email: resolvedEmail };
  } catch (error) {
    if (error instanceof https.HttpsError) throw error;
    console.error("Error in resolveLoginEmail:", error);
    throw new https.HttpsError("internal", "No se pudo resolver el usuario para iniciar sesion.");
  }
});

export const listUsers = https.onCall(async (_data, context) => {
  await requirePermission(context, "users", "view");

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

export const listUserGrupoModuloHistorial = https.onCall(async (data, context) => {
  await requirePermission(context, "users", "view");

  const userId = toNumber(data?.userId, -1);
  if (userId <= 0) {
    throw new https.HttpsError("invalid-argument", "userId is required.");
  }

  try {
    const response = await dataConnect.executeGraphql<{
      modulosEstudiantes: Array<{
        id?: number | null;
        promedio?: number | null;
        puntaje?: number | null;
        matriculaId?: number | null;
        grupoModuloId?: number | null;
        grupoId?: number | null;
        moduloId?: number | null;
        matricula?: {
          id?: number | null;
          userId?: number | null;
          archivado?: boolean | null;
          fecha?: string | null;
          semestre?: { id?: number | null; titulo?: string | null } | null;
        } | null;
        grupoModulo?: {
          id?: number | null;
          nombre?: string | null;
          inicio?: string | null;
          fin?: string | null;
          grupo?: {
            id?: number | null;
            nombreDisplay?: string | null;
            semestre?: { id?: number | null; titulo?: string | null } | null;
          } | null;
          modulo?: {
            id?: number | null;
            titulo?: string | null;
            tituloComercial?: string | null;
          } | null;
        } | null;
      }>;
    }, Record<string, never>>(LIST_USER_GRUPO_MODULO_HISTORIAL_QUERY);

    const historial = (response.data.modulosEstudiantes ?? [])
      .filter((item) => Number(item.matricula?.userId ?? 0) === userId)
      .map((item) => {
        const promedio = typeof item.promedio === "number" && Number.isFinite(item.promedio) ? item.promedio : null;
        const estado = item.matricula?.archivado
          ? "retirado"
          : promedio == null
            ? "en curso"
            : promedio >= 13
              ? "aprobado"
              : "desaprobado";
        const semestre =
          asNullableString(item.grupoModulo?.grupo?.semestre?.titulo)
          ?? asNullableString(item.matricula?.semestre?.titulo)
          ?? "";
        return {
          id: item.id ?? null,
          matriculaId: item.matriculaId ?? item.matricula?.id ?? null,
          grupoModuloId: item.grupoModuloId ?? item.grupoModulo?.id ?? null,
          grupoModuloNombre:
            asNullableString(item.grupoModulo?.nombre)
            ?? asNullableString(item.grupoModulo?.modulo?.titulo)
            ?? asNullableString(item.grupoModulo?.modulo?.tituloComercial)
            ?? "",
          semestre,
          estado,
          promedio,
          puntaje: item.puntaje ?? null,
          inicio: item.grupoModulo?.inicio ?? null,
          fin: item.grupoModulo?.fin ?? null,
        };
      })
      .sort((a, b) =>
        String(b.semestre ?? "").localeCompare(String(a.semestre ?? ""), "es", { numeric: true }) ||
        String(a.grupoModuloNombre ?? "").localeCompare(String(b.grupoModuloNombre ?? ""), "es", { numeric: true }) ||
        Number(b.id ?? 0) - Number(a.id ?? 0),
      );

    return { historial };
  } catch (error) {
    console.error("Error in listUserGrupoModuloHistorial:", error);
    throw new https.HttpsError("internal", "No se pudo cargar el historial academico del usuario.");
  }
});

export const getMyProfile = https.onCall(async (_data, context) => {
  requireAuthenticated(context);

  const uid = context.auth?.uid;
  if (!uid) {
    throw new https.HttpsError("unauthenticated", "Debes iniciar sesion.");
  }

  try {
    const roleIdFromClaims = toNumber(context.auth?.token?.role, -1);
    const response = await dataConnect.executeGraphql<{
      users: Array<Record<string, unknown>>;
    }, { documentId: string }>(
      GET_MY_PROFILE_QUERY,
      { variables: { documentId: uid } },
    );
    const profile = response.data.users?.[0] ?? null;
    if (!profile) {
      const role = roleIdFromClaims > 0 ? await getRoleById(roleIdFromClaims) : null;
      return {
        profile: role
          ? {
            rolId: roleIdFromClaims,
            rolTitulo: role.titulo ?? null,
            roleTitle: role.titulo ?? null,
            cargo: role.titulo ?? null,
          }
          : null,
      };
    }

    const [hydratedProfile] = await hydrateProcessedAvatarThumbnails([profile]);
    const resolvedProfile = hydratedProfile ?? profile;
    const roleId = toNumber(resolvedProfile.rolId, roleIdFromClaims);
    const embeddedRoleTitle = asNullableString((resolvedProfile.rol as { titulo?: unknown } | null)?.titulo);
    const role = !embeddedRoleTitle && roleId > 0 ? await getRoleById(roleId) : null;
    const roleTitle = embeddedRoleTitle ?? role?.titulo ?? null;

    return {
      profile: {
        ...resolvedProfile,
        rolTitulo: roleTitle,
        roleTitle,
        cargo: roleTitle,
      },
    };
  } catch (error) {
    console.error("Error in getMyProfile:", error);
    throw new https.HttpsError("internal", "No se pudo cargar el perfil del usuario.");
  }
});

export const createNewUser = https.onCall(async (data, context) => {
  await requirePermission(context, "users", "create");

  const roleId = data?.rolId;
  const { email, password, username, ...otherData } = data;
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

    const permissionLevel = isBlockedIntranetRole(roleNumberId, role.titulo) ? DEFAULT_LEVEL : role.scala ?? DEFAULT_LEVEL;
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
  await requirePermission(context, "users", "edit");

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
    const requestedAvatar = asNullableString(data?.avatar ?? data?.foto);
    const avatarRemoved = data?.avatarRemoved === true;
    const fallbackAvatar = asNullableString(data?.previousAvatar)
      ?? asNullableString(data?.previousAvatarPequeno)
      ?? asNullableString(data?.previousPhotoURL);
    const avatarForPersist = avatarRemoved ? null : requestedAvatar ?? fallbackAvatar;
    const avatarForWorkspace = !avatarRemoved && requestedAvatar && requestedAvatar !== fallbackAvatar
      ? requestedAvatar
      : undefined;
    if (avatarForPersist) {
      payload.avatar = avatarForPersist;
    } else if (avatarRemoved) {
      payload.avatar = null;
    } else {
      delete payload.avatar;
    }
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
    const authUser = await authAdmin
      .getUser(documentId)
      .catch((error: unknown) => ((error as { code?: string } | null)?.code === "auth/user-not-found" ? null : Promise.reject(error)));
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
          avatar: avatarForWorkspace,
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

export const deleteUserDniImage = https.onCall(async (data, context) => {
  await requirePermission(context, "users", "edit");

  const documentId = asNullableString(data?.documentId ?? data?.uid);
  if (!documentId) {
    throw new https.HttpsError("invalid-argument", "documentId is required.");
  }

  try {
    const response = await dataConnect.executeGraphql<{
      users: Array<{
        id: number;
        tipoDocumento?: string | null;
        dni?: string | null;
        dniImagenFrenteUrl?: string | null;
        dniImagenReversoUrl?: string | null;
        dniImagenFrenteProcesadaUrl?: string | null;
        dniImagenReversoProcesadaUrl?: string | null;
      }>;
    }, { documentId: string }>(GET_USER_DNI_IMAGES_QUERY, { variables: { documentId } });
    const user = response.data.users?.[0] ?? null;
    if (!user?.id) {
      throw new https.HttpsError("not-found", `No Data Connect user was found for documentId '${documentId}'.`);
    }

    const urlPaths = await deleteStorageFilesFromUrls([
      user.dniImagenFrenteUrl,
      user.dniImagenReversoUrl,
      user.dniImagenFrenteProcesadaUrl,
      user.dniImagenReversoProcesadaUrl,
    ]);
    const expectedPaths = await deleteStorageFilesFromPaths(getExpectedDniStoragePaths(user));
    const deletedPaths = Array.from(new Set([...urlPaths, ...expectedPaths]));
    const updateData: DataConnectUserInput = {
      dniImagenFrenteUrl: null,
      dniImagenReversoUrl: null,
      dniImagenFrenteProcesadaUrl: null,
      dniImagenReversoProcesadaUrl: null,
    };

    await dataConnect.executeGraphql<{ user_update: unknown }, { id: number; data: DataConnectUserInput }>(
      UPDATE_USER_MUTATION,
      { variables: { id: user.id, data: updateData } },
    );

    return { id: user.id, deletedPaths };
  } catch (error) {
    if (error instanceof https.HttpsError) throw error;
    console.error("Error in deleteUserDniImage:", error);
    throw new https.HttpsError("internal", "No se pudo quitar la imagen de DNI del usuario.");
  }
});

export const deleteUserAvatarImage = https.onCall(async (data, context) => {
  await requirePermission(context, "users", "edit");

  const documentId = asNullableString(data?.documentId ?? data?.uid);
  if (!documentId) {
    throw new https.HttpsError("invalid-argument", "documentId is required.");
  }

  try {
    const response = await dataConnect.executeGraphql<{
      users: Array<{
        id: number;
        tipoDocumento?: string | null;
        dni?: string | null;
        avatar?: string | null;
        recorteFotografia?: string | null;
      }>;
    }, { documentId: string }>(GET_USER_AVATAR_IMAGES_QUERY, { variables: { documentId } });
    const user = response.data.users?.[0] ?? null;
    if (!user?.id) {
      throw new https.HttpsError("not-found", `No Data Connect user was found for documentId '${documentId}'.`);
    }

    const urlPaths = await deleteStorageFilesFromUrls([
      user.avatar,
      user.recorteFotografia,
    ]);
    const expectedPaths = await deleteStorageFilesFromPaths(getExpectedAvatarStoragePaths(user));
    const deletedPaths = Array.from(new Set([...urlPaths, ...expectedPaths]));
    const updateData: DataConnectUserInput = {
      avatar: null,
      recorteFotografia: null,
    };

    await dataConnect.executeGraphql<{ user_update: unknown }, { id: number; data: DataConnectUserInput }>(
      UPDATE_USER_MUTATION,
      { variables: { id: user.id, data: updateData } },
    );

    return { id: user.id, deletedPaths };
  } catch (error) {
    if (error instanceof https.HttpsError) throw error;
    console.error("Error in deleteUserAvatarImage:", error);
    throw new https.HttpsError("internal", "No se pudo eliminar el avatar del usuario.");
  }
});

export const clearStudentAvatarLinks = https.onCall(async (_data, context) => {
  requireSuperUser(context, "limpiar enlaces de avatar de estudiantes");

  try {
    const users = await executeListUsersQuerySerialized();
    const targetUsers = users.filter((user) => {
      const avatar = asNullableString(user.avatar);
      const recorteFotografia = asNullableString(user.recorteFotografia);
      return Boolean(avatar || recorteFotografia) && isStudentOrFormerStudentRole(user);
    });

    for (const user of targetUsers) {
      const id = toNumber(user.id, 0);
      if (!id) continue;
      await dataConnect.executeGraphql<{ user_update: unknown }, { id: number; data: DataConnectUserInput }>(
        UPDATE_USER_MUTATION,
        { variables: { id, data: { avatar: null, recorteFotografia: null } } },
      );
    }

    return {
      total: targetUsers.length,
      ids: targetUsers.map((user) => toNumber(user.id, 0)).filter((id) => id > 0),
    };
  } catch (error) {
    console.error("Error in clearStudentAvatarLinks:", error);
    throw new https.HttpsError("internal", "No se pudieron limpiar los enlaces de avatar de estudiantes.");
  }
});

export const deleteUser = https.onCall(async (data, context) => {
  await requirePermission(context, "users", "delete");

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
