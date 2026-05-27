import { google, admin_directory_v1 } from "googleapis";

const WORKSPACE_SYNC_ENABLED = String(process.env.WORKSPACE_SYNC_ENABLED || "").trim().toLowerCase() === "true";
const WORKSPACE_SUBJECT_EMAIL = String(process.env.WORKSPACE_SUBJECT_EMAIL || "").trim();
const WORKSPACE_PRIMARY_DOMAIN = String(process.env.WORKSPACE_PRIMARY_DOMAIN || "").trim();
const WORKSPACE_STUDENT_ORG_UNIT_PATH =
  String(process.env.WORKSPACE_STUDENT_ORG_UNIT_PATH || "/Estudiantes-2026-2").trim();
const WORKSPACE_STUDENT_PERMISSION_IDS = String(process.env.WORKSPACE_STUDENT_PERMISSION_IDS || "")
  .split(",")
  .map((value) => Number(value.trim()))
  .filter((value) => Number.isFinite(value) && value > 0);
const WORKSPACE_REQUIRE_STUDENT_PERMISSION_MATCH =
  String(process.env.WORKSPACE_REQUIRE_STUDENT_PERMISSION_MATCH || "false").trim().toLowerCase() === "true";

export type WorkspaceUserContext = {
  email: string;
  username: string;
  apellidoPaterno: string | null;
  apellidoMaterno: string | null;
  nombre: string | null;
  direccion: string | null;
  distrito: string | null;
  telefono: string | null;
  celular: string | null;
  dni: string | null;
  blocked: boolean;
};

function compactUndefined<T extends object>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj as Record<string, unknown>).filter(([, v]) => v !== undefined),
  ) as T;
}

function normalizePhoneNumber(value: string | null): string | null {
  if (!value) return null;
  const compact = value.replace(/\s+/g, "");
  return compact.length ? compact : null;
}

function resolveWorkspaceGivenName(user: WorkspaceUserContext): string {
  const firstName = (user.nombre || "").trim();
  if (firstName) return firstName;
  const fallback = user.username.trim();
  return fallback || "Estudiante";
}

function resolveWorkspaceFamilyName(user: WorkspaceUserContext): string {
  const parts = [user.apellidoPaterno, user.apellidoMaterno].filter(Boolean).join(" ").trim();
  if (parts) return parts;
  return "SinApellido";
}

function buildWorkspacePayload(user: WorkspaceUserContext): admin_directory_v1.Schema$User {
  const addresses: admin_directory_v1.Schema$UserAddress[] = [];
  const phones: admin_directory_v1.Schema$UserPhone[] = [];
  const externalIds: admin_directory_v1.Schema$UserExternalId[] = [];

  if (user.direccion || user.distrito) {
    addresses.push({
      type: "work",
      streetAddress: user.direccion || undefined,
      locality: user.distrito || undefined,
      region: "Lima",
      country: "PE",
      primary: true,
    });
  }

  const mobile = normalizePhoneNumber(user.celular);
  if (mobile) {
    phones.push({ type: "mobile", value: mobile, primary: true });
  }

  const phone = normalizePhoneNumber(user.telefono);
  if (phone) {
    phones.push({ type: "work", value: phone });
  }

  if (user.dni) {
    externalIds.push({
      type: "custom",
      customType: "dni",
      value: user.dni,
    });
  }

  return compactUndefined({
    primaryEmail: user.email.toLowerCase(),
    name: {
      givenName: resolveWorkspaceGivenName(user),
      familyName: resolveWorkspaceFamilyName(user),
    },
    orgUnitPath: WORKSPACE_STUDENT_ORG_UNIT_PATH,
    suspended: user.blocked,
    changePasswordAtNextLogin: false,
    addresses,
    phones,
    externalIds,
  });
}

export function shouldSyncStudentWorkspace(permisoId: number, permisoTitulo: string | null | undefined): boolean {
  const shouldSyncById =
    WORKSPACE_STUDENT_PERMISSION_IDS.length > 0 && WORKSPACE_STUDENT_PERMISSION_IDS.includes(permisoId);
  const title = String(permisoTitulo || "").trim().toLowerCase();
  const shouldSyncByTitle = title.includes("estudiante") || title.includes("alumno");
  return WORKSPACE_REQUIRE_STUDENT_PERMISSION_MATCH ? shouldSyncById : (shouldSyncById || shouldSyncByTitle);
}

export async function syncStudentToWorkspace(context: WorkspaceUserContext): Promise<void> {
  if (!WORKSPACE_SYNC_ENABLED) return;
  if (!WORKSPACE_SUBJECT_EMAIL || !WORKSPACE_PRIMARY_DOMAIN) {
    throw new Error(
      "Faltan variables WORKSPACE_SUBJECT_EMAIL o WORKSPACE_PRIMARY_DOMAIN para sincronizar Workspace.",
    );
  }
  const clientEmail = String(process.env.GOOGLE_CLIENT_EMAIL || "").trim();
  const privateKey = String(process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) {
    throw new Error("Faltan credenciales para Workspace: GOOGLE_CLIENT_EMAIL o GOOGLE_PRIVATE_KEY.");
  }

  const jwtClient = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/admin.directory.user"],
    subject: WORKSPACE_SUBJECT_EMAIL,
  });

  const directory = google.admin({ version: "directory_v1", auth: jwtClient });
  const payload = buildWorkspacePayload(context);

  try {
    await directory.users.insert({
      requestBody: payload,
    });
  } catch (error: unknown) {
    const status = (error as { code?: number })?.code;
    const reason = JSON.stringify((error as { errors?: unknown }).errors || "");
    const alreadyExists = status === 409 || reason.includes("duplicate") || reason.includes("Entity already exists");

    if (!alreadyExists) {
      throw error;
    }

    await directory.users.update({
      userKey: context.email.toLowerCase(),
      requestBody: payload,
    });
  }
}
