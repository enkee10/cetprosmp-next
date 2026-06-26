import { google, admin_directory_v1 } from "googleapis";
import { randomBytes } from "node:crypto";

const WORKSPACE_SYNC_ENABLED = String(process.env.WORKSPACE_SYNC_ENABLED || "").trim().toLowerCase() === "true";
const WORKSPACE_SUBJECT_EMAIL = String(process.env.WORKSPACE_SUBJECT_EMAIL || "").trim();
const WORKSPACE_PRIMARY_DOMAIN = String(process.env.WORKSPACE_PRIMARY_DOMAIN || "").trim();
const WORKSPACE_STUDENT_EMAIL_DOMAIN = String(
  process.env.WORKSPACE_STUDENT_EMAIL_DOMAIN || "cetprosmp.edu.pe",
).trim().toLowerCase();
const WORKSPACE_DEFAULT_COUNTRY_CODE = String(
  process.env.WORKSPACE_DEFAULT_COUNTRY_CODE || "51",
).trim().replace(/\D+/g, "") || "51";
const WORKSPACE_STUDENT_ORG_UNIT_PATH =
  String(process.env.WORKSPACE_STUDENT_ORG_UNIT_PATH || "/Estudiantes/Estudiantes-2026-2").trim();
const WORKSPACE_GROUP_PROFESORES_CLASE = String(
  process.env.WORKSPACE_GROUP_PROFESORES_CLASE || "profesores_clase@cetprosmp.edu.pe",
).trim().toLowerCase();
const WORKSPACE_GROUP_TRABAJADORES = String(
  process.env.WORKSPACE_GROUP_TRABAJADORES || "trabajadores-cetprosmp@cetprosmp.edu.pe",
).trim().toLowerCase();
const WORKSPACE_GROUP_ADMINISTRACION = String(
  process.env.WORKSPACE_GROUP_ADMINISTRACION || "administracion@cetprosmp.edu.pe",
).trim().toLowerCase();
const WORKSPACE_STUDENT_ROLE_IDS = String(
  process.env.WORKSPACE_STUDENT_ROLE_IDS
  || process.env.WORKSPACE_STUDENT_PERMISSION_IDS
  || "",
)
  .split(",")
  .map((value) => Number(value.trim()))
  .filter((value) => Number.isFinite(value) && value > 0);
const WORKSPACE_REQUIRE_STUDENT_ROLE_MATCH =
  String(
    process.env.WORKSPACE_REQUIRE_STUDENT_ROLE_MATCH
    || process.env.WORKSPACE_REQUIRE_STUDENT_PERMISSION_MATCH
    || "false",
  ).trim().toLowerCase() === "true";

export type WorkspaceUserContext = {
  email: string;
  institutionalEmail?: string | null;
  formEmail?: string | null;
  avatar?: string | null;
  password?: string | null;
  username: string;
  roleId?: number | null;
  roleTitle?: string | null;
  fechaCreacion?: string | null;
  fechaModificacion?: string | null;
  apellidoPaterno: string | null;
  apellidoMaterno: string | null;
  nombre: string | null;
  direccion: string | null;
  distrito: string | null;
  telefono: string | null;
  celular: string | null;
  dni: string | null;
  tipoDocumento?: string | null;
  sexo?: string | null;
  fechaNacimiento?: string | null;
  instruccion?: string | null;
  estadoCivil?: string | null;
  blocked: boolean;
};

type WorkspaceSyncOptions = {
  previousEmail?: string | null;
  createIfMissing?: boolean;
};

type WorkspaceDirectoryClient = {
  directory: admin_directory_v1.Admin;
};

type WorkspaceErrorMeta = {
  status: number;
  reason: string;
};

type WorkspacePersonalSchemaMapping = {
  schemaName: string;
  estadoCivilField?: string;
  gradoInstruccionField?: string;
  fechaNacimientoField?: string;
  sexoField?: string;
  tipoDocumentoField?: string;
  numeroDocumentoField?: string;
  domicilioField?: string;
  distritoField?: string;
};

type WorkspaceRoleKind =
  | "docente"
  | "exdocente"
  | "administrativo"
  | "coordinador"
  | "director"
  | "superusuario"
  | "other";

type WorkspaceRoleGroupRule = {
  groupEmail: string;
  applies: (roleId: number | null | undefined) => boolean;
};

let cachedPersonalSchemaMapping:
  | { expiresAt: number; value: WorkspacePersonalSchemaMapping | null }
  | null = null;

const WORKSPACE_ROLE_IDS = {
  docente: 4,
  administrativo: 5,
  coordinador: 6,
  director: 7,
  superusuario: 8,
  exdocente: 9,
} as const;

const WORKSPACE_SUPPORTED_ROLE_IDS = new Set<number>(
  Object.values(WORKSPACE_ROLE_IDS),
);
const WORKSPACE_GROUP_RULES: WorkspaceRoleGroupRule[] = [
  {
    groupEmail: WORKSPACE_GROUP_PROFESORES_CLASE,
    applies: (roleId) => [4, 6, 7, 8].includes(Number(roleId || 0)),
  },
  {
    groupEmail: WORKSPACE_GROUP_TRABAJADORES,
    applies: (roleId) => {
      const value = Number(roleId || 0);
      return value >= 4 && value <= 8;
    },
  },
  {
    groupEmail: WORKSPACE_GROUP_ADMINISTRACION,
    applies: (roleId) => {
      const value = Number(roleId || 0);
      return value >= 5 && value <= 8;
    },
  },
];

function normalizeNameToken(value: string | null | undefined): string {
  return String(value || "")
    .replace(/[ñÑ]/g, "n")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function getFirstCharToken(value: string | null | undefined): string {
  return normalizeNameToken(value).slice(0, 1);
}

function resolveRoleKind(
  roleId: number | null | undefined,
  roleTitle: string | null | undefined,
): WorkspaceRoleKind {
  const normalizedId = Number(roleId || 0);
  if (normalizedId === WORKSPACE_ROLE_IDS.docente) return "docente";
  if (normalizedId === WORKSPACE_ROLE_IDS.exdocente) return "exdocente";
  if (normalizedId === WORKSPACE_ROLE_IDS.administrativo) return "administrativo";
  if (normalizedId === WORKSPACE_ROLE_IDS.coordinador) return "coordinador";
  if (normalizedId === WORKSPACE_ROLE_IDS.director) return "director";
  if (normalizedId === WORKSPACE_ROLE_IDS.superusuario) return "superusuario";

  const normalizedTitle = normalizeComparable(roleTitle);
  if (normalizedTitle.includes("exdocente")) return "exdocente";
  if (normalizedTitle.includes("docente")) return "docente";
  if (normalizedTitle.includes("administrativo")) return "administrativo";
  if (normalizedTitle.includes("coordinador")) return "coordinador";
  if (normalizedTitle.includes("director")) return "director";
  if (normalizedTitle.includes("superusuario")) return "superusuario";

  return "other";
}

function isWorkspaceInstitutionalRole(
  roleId: number | null | undefined,
  roleTitle: string | null | undefined,
): boolean {
  const normalizedId = Number(roleId || 0);
  if (WORKSPACE_SUPPORTED_ROLE_IDS.has(normalizedId)) return true;
  return resolveRoleKind(roleId, roleTitle) !== "other";
}

function resolveWorkspaceOrgUnitPath(user: WorkspaceUserContext): string {
  const roleKind = resolveRoleKind(user.roleId, user.roleTitle);
  if (roleKind === "docente") return "/Docentes";
  if (roleKind === "exdocente") return "/Ex-Docentes";
  if (["administrativo", "coordinador", "director"].includes(roleKind)) return "/Administrativos";
  if (roleKind === "superusuario") return "/SuperAdmin";
  return WORKSPACE_STUDENT_ORG_UNIT_PATH;
}

function resolveInstitutionalPrimaryEmailForRole(user: WorkspaceUserContext): string | null {
  if (!isWorkspaceInstitutionalRole(user.roleId, user.roleTitle)) return null;

  const firstNameInitial = getFirstCharToken(user.nombre);
  const apellidoPaterno = normalizeNameToken(user.apellidoPaterno);
  const apellidoMaternoInitial = getFirstCharToken(user.apellidoMaterno);
  const alias = `${firstNameInitial}${apellidoPaterno}${apellidoMaternoInitial}`;
  if (!alias) return null;
  return `${alias}@${WORKSPACE_STUDENT_EMAIL_DOMAIN}`;
}

function normalizeEmail(value: string | null | undefined): string | null {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) return null;
  return normalized;
}

function normalizeDni(value: string | null | undefined): string | null {
  const compact = String(value || "").trim().replace(/\D+/g, "");
  return /^\d{8}$/.test(compact) ? compact : null;
}

export function resolveStudentWorkspacePrimaryEmail(
  dni: string | null | undefined,
  fallbackEmail?: string | null,
): string | null {
  const normalizedDni = normalizeDni(dni);
  if (normalizedDni) {
    return `${normalizedDni}@${WORKSPACE_STUDENT_EMAIL_DOMAIN}`;
  }
  return normalizeEmail(fallbackEmail ?? null);
}

export function resolveWorkspacePrimaryEmail(
  user: {
    roleId?: number | null;
    roleTitle?: string | null;
    nombre?: string | null;
    apellidoPaterno?: string | null;
    apellidoMaterno?: string | null;
    dni?: string | null;
    email?: string | null;
    institutionalEmail?: string | null;
  },
): string | null {
  const explicitInstitutional = normalizeEmail(user.institutionalEmail ?? null);
  if (explicitInstitutional) return explicitInstitutional;
  const roleEmail = resolveInstitutionalPrimaryEmailForRole(user as WorkspaceUserContext);
  if (roleEmail) return roleEmail;
  return resolveStudentWorkspacePrimaryEmail(user.dni ?? null, user.email ?? null);
}

function compactUndefined<T extends object>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj as Record<string, unknown>).filter(([, v]) => v !== undefined),
  ) as T;
}

function normalizeComparable(value: string | null | undefined): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function normalizePhoneNumber(value: string | null): string | null {
  if (!value) return null;
  const compact = value.replace(/[^\d+]/g, "");
  return compact.length ? compact : null;
}

function normalizeRecoveryPhone(value: string | null): string | null {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const plusCandidate = raw.startsWith("+")
    ? `+${raw.slice(1).replace(/\D+/g, "")}`
    : "";
  if (/^\+\d{8,15}$/.test(plusCandidate)) return plusCandidate;

  const digits = raw.replace(/\D+/g, "");
  if (!digits) return null;

  if (digits.startsWith("00") && /^\d{10,17}$/.test(digits)) {
    const asPlus = `+${digits.slice(2)}`;
    if (/^\+\d{8,15}$/.test(asPlus)) return asPlus;
  }

  if (digits.length === 9) {
    return `+${WORKSPACE_DEFAULT_COUNTRY_CODE}${digits}`;
  }

  if (digits.startsWith(WORKSPACE_DEFAULT_COUNTRY_CODE) && digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`;
  }

  if (digits.length >= 8 && digits.length <= 15) {
    return `+${digits}`;
  }

  return null;
}

function normalizeDateString(value: string | null | undefined): string | null {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function normalizeAvatarUrl(value: string | null | undefined): string | null {
  const normalized = String(value || "").trim();
  if (!normalized) return null;
  if (normalized.startsWith("http://") || normalized.startsWith("https://")) return normalized;
  if (normalized.startsWith("data:image/")) return normalized;
  return null;
}

async function loadAvatarAsBase64(avatar: string): Promise<string> {
  if (avatar.startsWith("data:image/")) {
    const parts = avatar.split(",", 2);
    if (parts.length !== 2 || !parts[1]) {
      throw new Error("Avatar data URL invalida.");
    }
    return parts[1];
  }

  const response = await fetch(avatar);
  if (!response.ok) {
    throw new Error(`No se pudo descargar el avatar (${response.status}).`);
  }

  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  if (contentType && !contentType.startsWith("image/")) {
    throw new Error("El avatar no corresponde a una imagen valida.");
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (!buffer.length) {
    throw new Error("El avatar esta vacio.");
  }
  return buffer.toString("base64");
}

async function syncWorkspaceAvatar(
  directory: admin_directory_v1.Admin,
  userKey: string,
  avatar: string | null | undefined,
): Promise<void> {
  const normalizedAvatar = normalizeAvatarUrl(avatar);

  if (!normalizedAvatar) {
    try {
      await directory.users.photos.delete({ userKey });
    } catch (error: unknown) {
      const { status, reason } = getWorkspaceErrorMeta(error);
      const notFound =
        status === 404
        || reason.includes("notfound")
        || reason.includes("resource not found");
      if (!notFound) throw error;
    }
    return;
  }

  const photoData = await loadAvatarAsBase64(normalizedAvatar);
  await directory.users.photos.update({
    userKey,
    requestBody: { photoData },
  });
}

function findSchemaFieldName(
  fields: admin_directory_v1.Schema$SchemaFieldSpec[] | undefined,
  aliases: string[],
): string | undefined {
  if (!fields?.length) return undefined;
  const normalizedAliases = aliases.map((alias) => normalizeComparable(alias));
  for (const field of fields) {
    const display = normalizeComparable(field.displayName || "");
    const name = normalizeComparable(field.fieldName || "");
    if (normalizedAliases.includes(display) || normalizedAliases.includes(name)) {
      return field.fieldName || undefined;
    }
  }
  return undefined;
}

async function resolvePersonalSchemaMapping(
  directory: admin_directory_v1.Admin,
): Promise<WorkspacePersonalSchemaMapping | null> {
  if (cachedPersonalSchemaMapping && cachedPersonalSchemaMapping.expiresAt > Date.now()) {
    return cachedPersonalSchemaMapping.value;
  }

  try {
    const response = await directory.schemas.list({ customerId: "my_customer" });
    const schemas = response.data.schemas || [];
    if (!schemas.length) {
      cachedPersonalSchemaMapping = { expiresAt: Date.now() + 5 * 60_000, value: null };
      return null;
    }

    const normalizedTargets = ["datospersonales", "datospersonalesdeusuario"];
    let candidate = schemas.find((schema) => {
      const display = normalizeComparable(schema.displayName || "");
      const name = normalizeComparable(schema.schemaName || "");
      return normalizedTargets.includes(display) || normalizedTargets.includes(name);
    });

    if (!candidate) {
      const scored = schemas
        .map((schema) => {
          const fields = schema.fields || [];
          const score =
            Number(Boolean(findSchemaFieldName(fields, ["sexo"])))
            + Number(Boolean(findSchemaFieldName(fields, ["estadocivil"])))
            + Number(Boolean(findSchemaFieldName(fields, ["tipodocumento"])))
            + Number(Boolean(findSchemaFieldName(fields, ["numerodocumento"])));
          return { schema, score };
        })
        .sort((a, b) => b.score - a.score);
      candidate = scored[0]?.score >= 3 ? scored[0].schema : undefined;
    }

    if (!candidate?.schemaName) {
      cachedPersonalSchemaMapping = { expiresAt: Date.now() + 5 * 60_000, value: null };
      return null;
    }

    const mapping: WorkspacePersonalSchemaMapping = {
      schemaName: candidate.schemaName,
      estadoCivilField: findSchemaFieldName(candidate.fields, ["estado civil", "estadocivil"]),
      gradoInstruccionField: findSchemaFieldName(candidate.fields, ["grado instruccion", "gradoinstruccion"]),
      fechaNacimientoField: findSchemaFieldName(candidate.fields, ["fecha nacimiento", "fechanacimiento"]),
      sexoField: findSchemaFieldName(candidate.fields, ["sexo"]),
      tipoDocumentoField: findSchemaFieldName(candidate.fields, ["tipo documento", "tipodocumento"]),
      numeroDocumentoField: findSchemaFieldName(candidate.fields, ["numero documento", "numerodocumento"]),
      domicilioField: findSchemaFieldName(candidate.fields, ["domicilio", "direccion"]),
      distritoField: findSchemaFieldName(candidate.fields, ["distrito"]),
    };

    cachedPersonalSchemaMapping = { expiresAt: Date.now() + 5 * 60_000, value: mapping };
    return mapping;
  } catch (error) {
    console.warn("No se pudo resolver mapping de custom schema en Workspace:", error);
    cachedPersonalSchemaMapping = { expiresAt: Date.now() + 60_000, value: null };
    return null;
  }
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

function buildWorkspacePayload(
  user: WorkspaceUserContext,
  personalSchemaMapping: WorkspacePersonalSchemaMapping | null,
): admin_directory_v1.Schema$User {
  const primaryEmail = resolveWorkspacePrimaryEmail(user);
  if (!primaryEmail) {
    throw new Error("No se pudo resolver el correo principal para Workspace. Verifica el DNI del usuario.");
  }

  const addresses: admin_directory_v1.Schema$UserAddress[] = [];
  const phones: admin_directory_v1.Schema$UserPhone[] = [];
  const externalIds: admin_directory_v1.Schema$UserExternalId[] = [];
  const organizations: admin_directory_v1.Schema$UserOrganization[] = [];
  const emails: admin_directory_v1.Schema$UserEmail[] = [];

  const normalizedFormEmail = normalizeEmail(user.formEmail ?? user.email);
  if (normalizedFormEmail) {
    // Correo electrónico(Casa) / Dirección de correo electrónico alternativa
    emails.push({ address: normalizedFormEmail, type: "home", primary: false });
  }

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
    phones.push({ type: "home", value: phone });
  }

  const normalizedFechaNacimiento = normalizeDateString(user.fechaNacimiento);

  if (user.dni) {
    externalIds.push({
      type: "custom",
      customType: "dni",
      value: user.dni,
    });
    // Equivalente práctico para "ID de empleado" cuando el SDK tipado no expone employeeId.
    externalIds.push({
      type: "custom",
      customType: "employee_id",
      value: user.dni,
    });
  }

  const costCenterValue = user.fechaModificacion || user.fechaCreacion || undefined;
  if (user.roleTitle || user.dni || costCenterValue) {
    organizations.push(({
      primary: true,
      title: user.roleTitle || undefined, // Cargo
      costCenter: costCenterValue, // Centro de costos
      employeeId: user.dni || undefined, // ID de empleado
    }) as unknown as admin_directory_v1.Schema$UserOrganization);
  }

  const personalCustomFields: Record<string, string> = {};
  if (personalSchemaMapping?.estadoCivilField && user.estadoCivil) {
    personalCustomFields[personalSchemaMapping.estadoCivilField] = user.estadoCivil;
  }
  if (personalSchemaMapping?.gradoInstruccionField && user.instruccion) {
    personalCustomFields[personalSchemaMapping.gradoInstruccionField] = user.instruccion;
  }
  if (personalSchemaMapping?.fechaNacimientoField && normalizedFechaNacimiento) {
    personalCustomFields[personalSchemaMapping.fechaNacimientoField] = normalizedFechaNacimiento;
  }
  if (personalSchemaMapping?.sexoField && user.sexo) {
    personalCustomFields[personalSchemaMapping.sexoField] = user.sexo;
  }
  if (personalSchemaMapping?.tipoDocumentoField && user.tipoDocumento) {
    personalCustomFields[personalSchemaMapping.tipoDocumentoField] = user.tipoDocumento;
  }
  if (personalSchemaMapping?.numeroDocumentoField && user.dni) {
    personalCustomFields[personalSchemaMapping.numeroDocumentoField] = user.dni;
  }
  if (personalSchemaMapping?.domicilioField && user.direccion) {
    personalCustomFields[personalSchemaMapping.domicilioField] = user.direccion;
  }
  if (personalSchemaMapping?.distritoField && user.distrito) {
    personalCustomFields[personalSchemaMapping.distritoField] = user.distrito;
  }

  const hasCustomSchemas =
    Boolean(personalSchemaMapping?.schemaName) && Object.keys(personalCustomFields).length > 0;
  const customSchemas = hasCustomSchemas
    ? { [personalSchemaMapping!.schemaName]: personalCustomFields }
    : undefined;

  return compactUndefined({
    primaryEmail,
    password: user.password || undefined,
    name: {
      givenName: resolveWorkspaceGivenName(user),
      familyName: resolveWorkspaceFamilyName(user),
    },
    orgUnitPath: resolveWorkspaceOrgUnitPath(user),
    suspended: user.blocked,
    changePasswordAtNextLogin: false,
    emails: emails.length ? emails : undefined,
    recoveryEmail: normalizedFormEmail || undefined, // Correo electrónico de recuperación
    recoveryPhone: normalizeRecoveryPhone(user.celular) || undefined, // Teléfono de recuperación (E.164)
    addresses: addresses.length ? addresses : undefined,
    phones: phones.length ? phones : undefined,
    organizations: organizations.length ? organizations : undefined,
    externalIds: externalIds.length ? externalIds : undefined,
    customSchemas,
  });
}

function generateWorkspacePassword(length = 16): string {
  const lowercase = "abcdefghijkmnopqrstuvwxyz";
  const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const symbols = "!@#$%&*_-";
  const all = `${lowercase}${uppercase}${digits}${symbols}`;

  const pick = (chars: string): string => chars[randomBytes(1)[0] % chars.length];
  const base = [pick(lowercase), pick(uppercase), pick(digits), pick(symbols)];

  while (base.length < length) {
    base.push(pick(all));
  }

  for (let i = base.length - 1; i > 0; i -= 1) {
    const j = randomBytes(1)[0] % (i + 1);
    [base[i], base[j]] = [base[j], base[i]];
  }

  return base.join("");
}

function getWorkspaceErrorMeta(error: unknown): WorkspaceErrorMeta {
  const err = error as {
    code?: number;
    status?: number;
    message?: string;
    errors?: unknown;
    response?: {
      status?: number;
      data?: unknown;
    };
  };

  const status =
    Number(err?.code)
    || Number(err?.status)
    || Number(err?.response?.status)
    || 0;

  const reason = JSON.stringify({
    message: String(err?.message || ""),
    errors: err?.errors || "",
    responseData: err?.response?.data || "",
  }).toLowerCase();

  return { status, reason };
}

function getWorkspaceDirectoryClient(): WorkspaceDirectoryClient {
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
    scopes: [
      "https://www.googleapis.com/auth/admin.directory.user",
      "https://www.googleapis.com/auth/admin.directory.userschema.readonly",
      "https://www.googleapis.com/auth/admin.directory.group.member",
    ],
    subject: WORKSPACE_SUBJECT_EMAIL,
  });

  const directory = google.admin({ version: "directory_v1", auth: jwtClient });
  return { directory };
}

async function syncWorkspaceRoleGroupsInternal(
  directory: admin_directory_v1.Admin,
  userEmail: string,
  roleId: number | null | undefined,
): Promise<void> {
  const normalizedUserEmail = String(userEmail || "").trim().toLowerCase();
  if (!normalizedUserEmail) return;

  for (const rule of WORKSPACE_GROUP_RULES) {
    const groupEmail = String(rule.groupEmail || "").trim().toLowerCase();
    if (!groupEmail) continue;

    if (rule.applies(roleId)) {
      try {
        await directory.members.insert({
          groupKey: groupEmail,
          requestBody: {
            email: normalizedUserEmail,
            role: "MEMBER",
          },
        });
      } catch (error: unknown) {
        const { status, reason } = getWorkspaceErrorMeta(error);
        const alreadyMember =
          status === 409
          || reason.includes("member already exists")
          || reason.includes("duplicate")
          || reason.includes("already exists");
        if (!alreadyMember) throw error;
      }
      continue;
    }

    try {
      await directory.members.delete({
        groupKey: groupEmail,
        memberKey: normalizedUserEmail,
      });
    } catch (error: unknown) {
      const { status, reason } = getWorkspaceErrorMeta(error);
      const notMember =
        status === 404
        || reason.includes("not found")
        || reason.includes("notfound")
        || reason.includes("resource not found");
      if (!notMember) throw error;
    }
  }
}

export function shouldSyncStudentWorkspace(roleId: number, roleTitle: string | null | undefined): boolean {
  if (isWorkspaceInstitutionalRole(roleId, roleTitle)) return true;
  const shouldSyncById =
    WORKSPACE_STUDENT_ROLE_IDS.length > 0 && WORKSPACE_STUDENT_ROLE_IDS.includes(roleId);
  const title = String(roleTitle || "").trim().toLowerCase();
  const shouldSyncByTitle = title.includes("estudiante") || title.includes("alumno");
  return WORKSPACE_REQUIRE_STUDENT_ROLE_MATCH ? shouldSyncById : (shouldSyncById || shouldSyncByTitle);
}

export async function syncStudentToWorkspace(
  context: WorkspaceUserContext,
  options?: WorkspaceSyncOptions,
): Promise<void> {
  if (!WORKSPACE_SYNC_ENABLED) return;
  const { directory } = getWorkspaceDirectoryClient();
  const personalSchemaMapping = await resolvePersonalSchemaMapping(directory);
  const payload = buildWorkspacePayload(context, personalSchemaMapping);
  const hasProvidedPassword = typeof payload.password === "string" && payload.password.trim().length > 0;
  const insertPayload: admin_directory_v1.Schema$User = hasProvidedPassword
    ? payload
    : { ...payload, password: generateWorkspacePassword() };
  const previousEmail = String(options?.previousEmail || "").trim().toLowerCase();
  const currentEmail = String(payload.primaryEmail || "").trim().toLowerCase();
  if (!currentEmail) {
    throw new Error("No se pudo resolver el correo principal de Workspace para sincronizar al usuario.");
  }
  const createIfMissing = options?.createIfMissing !== false;
  const shouldRenamePrimaryEmail = Boolean(previousEmail) && previousEmail !== currentEmail;
  let effectiveUserKeyForPhoto = currentEmail;

  if (!createIfMissing) {
    const updateExisting = async (userKey: string) => {
      const response = await directory.users.update({
        userKey,
        requestBody: payload,
      });
      effectiveUserKeyForPhoto = response.data.id || response.data.primaryEmail || currentEmail;
    };

    try {
      if (shouldRenamePrimaryEmail) {
        await updateExisting(previousEmail);
      } else {
        await updateExisting(currentEmail);
      }
    } catch (error: unknown) {
      const { status, reason } = getWorkspaceErrorMeta(error);
      const notFound =
        status === 404
        || reason.includes("notfound")
        || reason.includes("resource not found");

      if (!shouldRenamePrimaryEmail || !notFound) {
        if (notFound) {
          throw new Error(`Usuario no encontrado en Workspace: '${currentEmail}'. No se recreo la cuenta.`);
        }
        throw error;
      }

      try {
        await updateExisting(currentEmail);
      } catch (updateError: unknown) {
        const { status: updateStatus, reason: updateReason } = getWorkspaceErrorMeta(updateError);
        const updateNotFound =
          updateStatus === 404
          || updateReason.includes("notfound")
          || updateReason.includes("resource not found");
        if (updateNotFound) {
          throw new Error(`Usuario no encontrado en Workspace: '${currentEmail}'. No se recreo la cuenta.`);
        }
        throw updateError;
      }
    }

    await syncWorkspaceAvatar(directory, effectiveUserKeyForPhoto, context.avatar ?? null);
    await syncWorkspaceRoleGroupsInternal(directory, currentEmail, context.roleId ?? null);
    return;
  }

  try {
    if (shouldRenamePrimaryEmail) {
      const response = await directory.users.update({
        userKey: previousEmail,
        requestBody: payload,
      });
      effectiveUserKeyForPhoto = response.data.id || response.data.primaryEmail || currentEmail;
    } else {
      const response = await directory.users.insert({
        requestBody: insertPayload,
      });
      effectiveUserKeyForPhoto = response.data.id || response.data.primaryEmail || currentEmail;
    }
  } catch (error: unknown) {
    const { status, reason } = getWorkspaceErrorMeta(error);
    const alreadyExists =
      status === 409
      || reason.includes("duplicate")
      || reason.includes("entity already exists")
      || reason.includes("already exists");
    const notFound =
      status === 404
      || reason.includes("notfound")
      || reason.includes("resource not found");

    if (shouldRenamePrimaryEmail) {
      if (alreadyExists) {
        throw new Error(
          `No se pudo cambiar el correo en Workspace: '${currentEmail}' ya existe en otra cuenta.`,
        );
      }

      if (notFound) {
        // Si no existe con el correo anterior, intentamos como flujo normal.
        const response = await directory.users.update({
          userKey: currentEmail,
          requestBody: payload,
        }).catch(async (updateError: unknown) => {
          const { status: updateStatus, reason: updateReason } = getWorkspaceErrorMeta(updateError);
          const updateNotFound =
            updateStatus === 404
            || updateReason.includes("notfound")
            || updateReason.includes("resource not found");
          if (!updateNotFound) throw updateError;
          return directory.users.insert({ requestBody: insertPayload });
        });
        effectiveUserKeyForPhoto = response.data.id || response.data.primaryEmail || currentEmail;
        await syncWorkspaceAvatar(directory, effectiveUserKeyForPhoto, context.avatar ?? null);
        return;
      }
    }

    if (!alreadyExists) {
      try {
        const response = await directory.users.update({
          userKey: currentEmail,
          requestBody: payload,
        });
        effectiveUserKeyForPhoto = response.data.id || response.data.primaryEmail || currentEmail;
        await syncWorkspaceAvatar(directory, effectiveUserKeyForPhoto, context.avatar ?? null);
        return;
      } catch {
        throw error;
      }
    }

    const response = await directory.users.update({
      userKey: currentEmail,
      requestBody: payload,
    });
    effectiveUserKeyForPhoto = response.data.id || response.data.primaryEmail || currentEmail;
  }

  await syncWorkspaceAvatar(directory, effectiveUserKeyForPhoto, context.avatar ?? null);
  await syncWorkspaceRoleGroupsInternal(directory, currentEmail, context.roleId ?? null);
}

export async function syncWorkspaceRoleGroups(
  userEmail: string | null | undefined,
  roleId: number | null | undefined,
): Promise<void> {
  if (!WORKSPACE_SYNC_ENABLED) return;
  const normalizedUserEmail = normalizeEmail(userEmail);
  if (!normalizedUserEmail) return;
  const { directory } = getWorkspaceDirectoryClient();
  await syncWorkspaceRoleGroupsInternal(directory, normalizedUserEmail, roleId);
}

export async function deleteStudentFromWorkspace(email: string): Promise<void> {
  if (!WORKSPACE_SYNC_ENABLED) return;

  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) return;

  const { directory } = getWorkspaceDirectoryClient();

  try {
    await directory.users.delete({
      userKey: normalizedEmail,
    });
  } catch (error: unknown) {
    const { status, reason } = getWorkspaceErrorMeta(error);
    const userNotFound =
      status === 404
      || reason.includes("notfound")
      || reason.includes("resource not found");
    if (userNotFound) return;
    throw error;
  }
}
