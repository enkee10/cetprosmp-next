import { https, auth } from "firebase-functions/v1";
import { initializeApp, getApps, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getDataConnect } from "firebase-admin/data-connect";
import {
  connectorConfig,
  getPermisoById as dcGetPermisoById,
  getUserByDocumentId as dcGetUserByDocumentId,
  listPermisos as dcListPermisos,
  listUsers as dcListUsers,
} from "@dataconnect/admin-generated";
import {
  DELETE_USER_BY_DOCUMENT_ID_MUTATION,
  INSERT_PERMISO_MUTATION,
  INSERT_USER_MUTATION,
  UPDATE_PERMISO_MUTATION,
  UPDATE_USER_MUTATION,
} from "./dataconnectOperations.js";

/**
 * Separa un nombre completo en nombre, apellido paterno y materno.
 */
function separarNombreCompleto(displayName: string | null) {
  const texto = (displayName || "").trim().replace(/\s+/g, " ");
  if (!texto) {
    return { nombre: "", apellido_paterno: "", apellido_materno: "" };
  }

  const partes = texto.split(" ");
  if (partes.length >= 3) {
    return {
      nombre: partes.slice(0, -2).join(" "),
      apellido_paterno: partes[partes.length - 2],
      apellido_materno: partes[partes.length - 1],
    };
  }
  if (partes.length === 2) {
    return { nombre: partes[0], apellido_paterno: partes[1], apellido_materno: "" };
  }
  return { nombre: partes[0], apellido_paterno: "", apellido_materno: "" };
}

function asNullableString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const asString = String(value).trim();
  return asString.length ? asString : null;
}

function asNullableTimestamp(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;

  if (typeof value === "string") {
    const dt = new Date(value);
    return Number.isNaN(dt.getTime()) ? null : dt.toISOString();
  }

  if (typeof value === "object" && value !== null && "_seconds" in (value as Record<string, unknown>)) {
    const seconds = Number((value as { _seconds: number })._seconds);
    if (Number.isNaN(seconds)) return null;
    return new Date(seconds * 1000).toISOString();
  }

  return null;
}

function toBoolean(value: unknown): boolean | undefined {
  if (value === undefined) return undefined;
  return Boolean(value);
}

function toNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toNumberOrNull(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getIdFromKeyOutput(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return numeric;
    }

    try {
      return getIdFromKeyOutput(JSON.parse(value));
    } catch {
      return null;
    }
  }

  if (typeof value === "object" && value !== null && "id" in value) {
    return toNumberOrNull((value as { id?: unknown }).id) ?? null;
  }

  return null;
}

interface DataConnectPermiso {
  id: number;
  titulo?: string | null;
  scala?: number | null;
}

interface DataConnectUserInput {
  documentId?: string | null;
  username?: string | null;
  email?: string | null;
  provider?: string | null;
  confirmed?: boolean;
  blocked?: boolean;
  dni?: string | null;
  tipoDocumento?: string | null;
  nombre?: string | null;
  apellidos?: string | null;
  apellidoPaterno?: string | null;
  apellidoMaterno?: string | null;
  sexo?: string | null;
  estadoCivil?: string | null;
  instruccion?: string | null;
  fechaNacimiento?: string | null;
  direccion?: string | null;
  distrito?: string | null;
  telefono?: string | null;
  celular?: string | null;
  avatar?: string | null;
  permisoId?: number | null;
}

interface DataConnectPermisoInput {
  titulo?: string | null;
  scala?: number | null;
}

function compactUndefined<T extends object>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj as Record<string, unknown>).filter(([, v]) => v !== undefined),
  ) as T;
}

function buildUserDataFromInput(
  input: Record<string, unknown>,
  defaults?: {
    documentId?: string;
    email?: string;
    username?: string;
    displayName?: string;
    photoURL?: string | null;
    provider?: string | null;
    permisoId?: number | null;
  },
): DataConnectUserInput {
  const apellidoPaterno = asNullableString(input.apellido_paterno ?? input.apellidoPaterno) ?? null;
  const apellidoMaterno = asNullableString(input.apellido_materno ?? input.apellidoMaterno) ?? null;
  const nombre = asNullableString(input.nombre) ?? null;

  const apellidos = [apellidoPaterno, apellidoMaterno].filter(Boolean).join(" ") || null;

  const payload: DataConnectUserInput = {
    documentId: asNullableString(input.documentId) ?? asNullableString(defaults?.documentId) ?? null,
    username: asNullableString(input.username) ?? asNullableString(defaults?.username) ?? null,
    email: asNullableString(input.email) ?? asNullableString(defaults?.email) ?? null,
    provider: asNullableString(input.provider) ?? asNullableString(defaults?.provider) ?? null,
    confirmed: toBoolean(input.confirmed),
    blocked: toBoolean(input.bloqueado ?? input.blocked),
    dni: asNullableString(input.dni),
    tipoDocumento: asNullableString(input.tipo_documento ?? input.tipoDocumento),
    nombre,
    apellidos,
    apellidoPaterno,
    apellidoMaterno,
    sexo: asNullableString(input.sexo),
    estadoCivil: asNullableString(input.estado_civil ?? input.estadoCivil),
    instruccion: asNullableString(input.instruccion),
    fechaNacimiento: asNullableTimestamp(input.fecha_nacimiento ?? input.fechaNacimiento),
    direccion: asNullableString(input.direccion),
    distrito: asNullableString(input.distrito),
    telefono: asNullableString(input.telefono),
    celular: asNullableString(input.celular),
    avatar: asNullableString(input.avatar ?? input.foto) ?? asNullableString(defaults?.photoURL) ?? null,
    permisoId: toNumberOrNull(input.permisoId) ?? defaults?.permisoId ?? null,
  };

  if (!payload.username) {
    payload.username = asNullableString(defaults?.displayName) ?? null;
  }

  return compactUndefined(payload);
}

function buildPermisoDataFromInput(input: Record<string, unknown>): DataConnectPermisoInput {
  return compactUndefined({
    titulo: asNullableString(input.titulo),
    scala: toNumberOrNull(input.scala),
  });
}

// Initialize Firebase Admin SDK
let app: App;
if (!getApps().length) {
  app = initializeApp();
} else {
  app = getApps()[0];
}

const authAdmin = getAuth(app);
const dataConnect = getDataConnect(connectorConfig, app);
const DEFAULT_PERMISO_ID = 1;
const DEFAULT_LEVEL = 0;

async function findDataConnectUserIdByDocumentId(documentId: string): Promise<number | null> {
  const response = await dcGetUserByDocumentId(dataConnect, { documentId });

  const firstUser = response.data.users?.[0];
  return firstUser?.id ?? null;
}

async function getPermisoById(permisoId: number): Promise<DataConnectPermiso | null> {
  const response = await dcGetPermisoById(dataConnect, { id: permisoId });

  return response.data.permiso ?? null;
}

async function upsertDataConnectUserByDocumentId(documentId: string, data: DataConnectUserInput): Promise<number> {
  const existingId = await findDataConnectUserIdByDocumentId(documentId);

  if (existingId) {
    const updated = await dataConnect.executeGraphql<{ user_update: unknown }, { id: number; data: DataConnectUserInput }>(
      UPDATE_USER_MUTATION,
      { variables: { id: existingId, data } },
    );

    if (!updated.data.user_update) {
      throw new Error(`No se pudo actualizar el usuario Data Connect con id ${existingId}.`);
    }

    return getIdFromKeyOutput(updated.data.user_update) ?? existingId;
  }

  const created = await dataConnect.executeGraphql<{ user_insert: unknown }, { data: DataConnectUserInput }>(
    INSERT_USER_MUTATION,
    { variables: { data: { ...data, documentId } } },
  );

  const createdId = getIdFromKeyOutput(created.data.user_insert);
  if (!createdId) {
    throw new Error("No se pudo crear el usuario en Data Connect.");
  }

  return createdId;
}

/**
 * Asigna un rol por defecto y crea/actualiza un perfil en Data Connect
 * para cualquier nuevo usuario.
 */
export const assignDefaultRole = auth.user().onCreate(async (user) => {
  try {
    await authAdmin.setCustomUserClaims(user.uid, { role: String(DEFAULT_PERMISO_ID), level: DEFAULT_LEVEL });

    const { nombre, apellido_paterno, apellido_materno } = separarNombreCompleto(user.displayName || null);
    const primerNombre = nombre.split(" ").filter(Boolean)[0] || "";
    const username = [primerNombre, apellido_paterno].filter(Boolean).join(" ");

    const profileData = buildUserDataFromInput(
      {
        nombre,
        apellido_paterno,
        apellido_materno,
        username,
        email: user.email || "",
        foto: user.photoURL || null,
        celular: "",
        bloqueado: false,
        tipo_documento: "DNI",
        dni: "",
        sexo: "M",
        estado_civil: "Soltero",
        fecha_nacimiento: null,
        instruccion: null,
        direccion: null,
        distrito: null,
        permisoId: DEFAULT_PERMISO_ID,
      },
      {
        documentId: user.uid,
        email: user.email || "",
        username,
        displayName: user.displayName || username,
        photoURL: user.photoURL || null,
        provider: user.providerData?.[0]?.providerId ?? null,
        permisoId: DEFAULT_PERMISO_ID,
      },
    );

    await upsertDataConnectUserByDocumentId(user.uid, profileData);

    console.log(`Successfully assigned role and created profile for user ${user.uid}`);
  } catch (error) {
    console.error(`Error assigning default role to user ${user.uid}:`, error);
  }
});

/**
 * Registra un usuario publico con correo y contrasena.
 */
export const registerUser = https.onCall(async (data) => {
  const { username, email, password } = data;
  if (!username || !email || !password) {
    throw new https.HttpsError("invalid-argument", "Completa nombre de usuario, correo y contrasena.");
  }

  try {
    const userRecord = await authAdmin.createUser({ email, password, displayName: username });
    await authAdmin.setCustomUserClaims(userRecord.uid, { role: String(DEFAULT_PERMISO_ID), level: DEFAULT_LEVEL });

    const { nombre, apellido_paterno, apellido_materno } = separarNombreCompleto(username);

    const profileData = buildUserDataFromInput(
      {
        username,
        email,
        nombre,
        apellido_paterno,
        apellido_materno,
        foto: null,
        celular: "",
        bloqueado: false,
        tipo_documento: "DNI",
        dni: "",
        sexo: "M",
        estado_civil: "Soltero",
        fecha_nacimiento: null,
        instruccion: null,
        direccion: null,
        distrito: null,
        permisoId: DEFAULT_PERMISO_ID,
      },
      {
        documentId: userRecord.uid,
        email,
        username,
        displayName: username,
        photoURL: null,
        provider: "password",
        permisoId: DEFAULT_PERMISO_ID,
      },
    );

    await upsertDataConnectUserByDocumentId(userRecord.uid, profileData);

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

/**
 * Lista permisos desde Data Connect.
 */
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

/**
 * Obtiene un permiso por id desde Data Connect.
 */
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

/**
 * Crea o actualiza un permiso en Data Connect.
 */
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

/**
 * Lista usuarios desde Data Connect.
 */
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
      permisoTitulo: user.permiso?.titulo || "Sin Permiso",
      permisoLevel: user.permiso?.scala ?? 0,
    }));

    return { users };
  } catch (error) {
    console.error("Error in listUsers:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while listing users.");
  }
});

/**
 * Crea un nuevo usuario en Auth y Data Connect.
 */
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

    const userRecord = await authAdmin.createUser({ email, password, displayName: username });
    await authAdmin.setCustomUserClaims(userRecord.uid, { role: String(permisoNumberId), level: permissionLevel });

    const { nombre, apellido_paterno, apellido_materno } = separarNombreCompleto(username);

    const profileData = buildUserDataFromInput(
      {
        username,
        email,
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

    const dataConnectId = await upsertDataConnectUserByDocumentId(userRecord.uid, profileData);

    return {
      result: `Successfully created user ${userRecord.uid} with role ${permisoNumberId}.`,
      uid: userRecord.uid,
      dataConnectId,
    };
  } catch (error: unknown) {
    if (error instanceof https.HttpsError) {
      throw error;
    }

    const err = error as { code?: string };
    if (err.code === "auth/email-already-exists") {
      throw new https.HttpsError("already-exists", "A user with this email address already exists.");
    }
    console.error("Error in createNewUser:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred.");
  }
});

/**
 * Actualiza un perfil de usuario en Data Connect.
 */
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
    if (error instanceof https.HttpsError) {
      throw error;
    }
    console.error("Error in updateUserProfile:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while updating user profile.");
  }
});

/**
 * Actualiza el rol (custom claims) de un usuario y sincroniza permisoId en Data Connect.
 */
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

/**
 * Elimina un usuario de Auth y su perfil en Data Connect.
 */
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
    await authAdmin.deleteUser(uid);

    await dataConnect.executeGraphql<{ user_deleteMany: number }, { documentId: string }>(
      DELETE_USER_BY_DOCUMENT_ID_MUTATION,
      { variables: { documentId: uid } },
    );

    return { result: `Successfully deleted user ${uid}.` };
  } catch (error) {
    console.error("Error in deleteUser:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while deleting user.");
  }
});
