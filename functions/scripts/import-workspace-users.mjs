#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { google } from "googleapis";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getDataConnect } from "firebase-admin/data-connect";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

const connectorConfig = {
  connector: "default",
  serviceId: "cetprosmp-2026-service",
  location: "us-central1",
};

const ROLE_BY_OU = new Map([
  ["/Docentes", 4],
  ["/Administrativos", 5],
]);

const WORKSPACE_SCOPES = [
  "https://www.googleapis.com/auth/admin.directory.user",
];

const LIST_ROLES_QUERY = `
  query ImportWorkspaceListRoles {
    rols(limit: 100) {
      id
      titulo
      scala
    }
  }
`;

const LIST_USERS_QUERY = `
  query ImportWorkspaceListUsers {
    users(limit: 1000) {
      id
      documentId
      email
      correoInstitucional
      fechaCreacion
    }
  }
`;

const INSERT_USER_MUTATION = `
  mutation ImportWorkspaceInsertUser($data: User_Data! @allow(fields: "documentId username email provider confirmed blocked dni tipoDocumento nombre apellidos apellidoPaterno apellidoMaterno sexo estadoCivil instruccion fechaNacimiento direccion distrito telefono celular correoInstitucional fechaCreacion fechaModificacion emailCreador avatar rolId")) {
    user_insert(data: $data)
  }
`;

const UPDATE_USER_MUTATION = `
  mutation ImportWorkspaceUpdateUser($id: Int!, $data: User_Data! @allow(fields: "documentId username email provider confirmed blocked dni tipoDocumento nombre apellidos apellidoPaterno apellidoMaterno sexo estadoCivil instruccion fechaNacimiento direccion distrito telefono celular correoInstitucional fechaCreacion fechaModificacion emailCreador avatar rolId")) {
    user_update(id: $id, data: $data)
  }
`;

function parseArgs(argv) {
  const args = {
    apply: false,
    target: "emulator",
    subject: "",
    domain: "cetprosmp.edu.pe",
    ous: Array.from(ROLE_BY_OU.keys()),
    limit: 0,
  };

  for (const arg of argv) {
    if (arg === "--apply") args.apply = true;
    else if (arg === "--dry-run") args.apply = false;
    else if (arg.startsWith("--target=")) args.target = arg.slice("--target=".length);
    else if (arg.startsWith("--subject=")) args.subject = arg.slice("--subject=".length);
    else if (arg.startsWith("--domain=")) args.domain = arg.slice("--domain=".length);
    else if (arg.startsWith("--ou=")) args.ous = arg.slice("--ou=".length).split(",").map(normalizeOuPath).filter(Boolean);
    else if (arg.startsWith("--limit=")) args.limit = Number(arg.slice("--limit=".length)) || 0;
    else throw new Error(`Argumento no reconocido: ${arg}`);
  }

  if (!["emulator", "prod"].includes(args.target)) {
    throw new Error("--target debe ser emulator o prod.");
  }

  return args;
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  const lines = text.split(/\r?\n/);

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;

    const eq = line.indexOf("=");
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();

    if (!key || process.env[key] !== undefined) continue;

    if (value.startsWith("'") && !value.endsWith("'")) {
      const parts = [value.slice(1)];
      while (i + 1 < lines.length) {
        i += 1;
        const next = lines[i];
        if (next.endsWith("'")) {
          parts.push(next.slice(0, -1));
          break;
        }
        parts.push(next);
      }
      process.env[key] = parts.join("\n");
      continue;
    }

    if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function getServiceAccount() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  if (clientEmail && privateKey) {
    return {
      project_id: process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || "cetprosmp-2026",
      client_email: String(clientEmail).trim(),
      private_key: String(privateKey).replace(/\\n/g, "\n"),
    };
  }

  const rawJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (rawJson) return JSON.parse(rawJson);

  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credentialsPath) {
    return JSON.parse(fs.readFileSync(path.resolve(credentialsPath), "utf8"));
  }

  throw new Error("Falta GOOGLE_APPLICATION_CREDENTIALS_JSON o GOOGLE_APPLICATION_CREDENTIALS.");
}

function normalizeOuPath(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return raw.startsWith("/") ? raw : `/${raw}`;
}

function normalizeEmail(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized.includes("@") ? normalized : "";
}

function normalizeText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function normalizeComparable(value) {
  return String(value || "")
    .replace(/[ñÑ]/g, "n")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function compactUndefined(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined));
}

function splitFamilyName(familyName) {
  const parts = normalizeText(familyName).split(/\s+/).filter(Boolean);
  if (!parts.length) return { apellidoPaterno: "", apellidoMaterno: "" };
  if (parts.length === 1) return { apellidoPaterno: parts[0], apellidoMaterno: "" };
  return {
    apellidoPaterno: parts[0],
    apellidoMaterno: parts.slice(1).join(" "),
  };
}

function generateUsername(nombre, apellidoPaterno) {
  return [normalizeText(nombre).split(/\s+/)[0], normalizeText(apellidoPaterno)]
    .filter(Boolean)
    .join(" ");
}

function normalizeDate(value) {
  const raw = String(value || "").trim();
  if (!raw || raw === "1970-01-01T00:00:00.000Z") return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return `${raw}T00:00:00.000Z`;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function normalizePhoneForApp(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const digits = raw.replace(/\D+/g, "");
  if (digits.startsWith("51") && digits.length === 11) return digits.slice(2);
  return digits || raw;
}

function firstOfType(items, types) {
  const normalizedTypes = types.map((type) => normalizeComparable(type));
  return (items || []).find((item) => normalizedTypes.includes(normalizeComparable(item.type || item.customType || "")));
}

function findSchemaFieldName(fields, aliases) {
  const normalizedAliases = aliases.map(normalizeComparable);
  for (const field of fields || []) {
    const name = normalizeComparable(field.fieldName || "");
    const display = normalizeComparable(field.displayName || "");
    if (normalizedAliases.includes(name) || normalizedAliases.includes(display)) return field.fieldName;
  }
  return "";
}

async function resolvePersonalSchemaMapping(directory) {
  try {
    const response = await directory.schemas.list({ customerId: "my_customer" });
    const schemas = response.data.schemas || [];
    let candidate = schemas.find((schema) => {
      const name = normalizeComparable(schema.schemaName || "");
      const display = normalizeComparable(schema.displayName || "");
      return ["datospersonales", "datospersonalesdeusuario"].includes(name)
        || ["datospersonales", "datospersonalesdeusuario"].includes(display);
    });

    if (!candidate) {
      candidate = schemas
        .map((schema) => {
          const fields = schema.fields || [];
          const score =
            Number(Boolean(findSchemaFieldName(fields, ["sexo"])))
            + Number(Boolean(findSchemaFieldName(fields, ["estado civil", "estadocivil"])))
            + Number(Boolean(findSchemaFieldName(fields, ["tipo documento", "tipodocumento"])))
            + Number(Boolean(findSchemaFieldName(fields, ["numero documento", "numerodocumento"])));
          return { schema, score };
        })
        .sort((a, b) => b.score - a.score)[0]?.schema;
    }

    if (!candidate?.schemaName) return null;
    const fields = candidate.fields || [];
    return {
      schemaName: candidate.schemaName,
      estadoCivilField: findSchemaFieldName(fields, ["estado civil", "estadocivil"]),
      instruccionField: findSchemaFieldName(fields, ["grado instruccion", "gradoinstruccion"]),
      fechaNacimientoField: findSchemaFieldName(fields, ["fecha nacimiento", "fechanacimiento"]),
      sexoField: findSchemaFieldName(fields, ["sexo"]),
      tipoDocumentoField: findSchemaFieldName(fields, ["tipo documento", "tipodocumento"]),
      numeroDocumentoField: findSchemaFieldName(fields, ["numero documento", "numerodocumento"]),
      direccionField: findSchemaFieldName(fields, ["domicilio", "direccion"]),
      distritoField: findSchemaFieldName(fields, ["distrito"]),
    };
  } catch (error) {
    console.warn("No se pudo leer la metadata de custom schemas; se intentara inferir campos personalizados desde cada usuario.");
    return null;
  }
}

function customValue(workspaceUser, mapping, key) {
  const fallbackAliasesByKey = {
    estadoCivilField: ["estado civil", "estadocivil"],
    instruccionField: ["grado instruccion", "gradoinstruccion"],
    fechaNacimientoField: ["fecha nacimiento", "fechanacimiento"],
    sexoField: ["sexo"],
    tipoDocumentoField: ["tipo documento", "tipodocumento"],
    numeroDocumentoField: ["numero documento", "numerodocumento"],
    direccionField: ["domicilio", "direccion"],
    distritoField: ["distrito"],
  };

  let value = null;
  if (mapping?.schemaName && mapping[key]) {
    const schema = workspaceUser.customSchemas?.[mapping.schemaName];
    value = schema?.[mapping[key]];
  }

  if (value === null || value === undefined) {
    const normalizedAliases = (fallbackAliasesByKey[key] || []).map(normalizeComparable);
    for (const schema of Object.values(workspaceUser.customSchemas || {})) {
      for (const [fieldName, fieldValue] of Object.entries(schema || {})) {
        if (normalizedAliases.includes(normalizeComparable(fieldName))) {
          value = fieldValue;
          break;
        }
      }
      if (value !== null && value !== undefined) break;
    }
  }

  if (Array.isArray(value)) return value[0]?.value ?? value[0] ?? null;
  return value ?? null;
}

function extractProfile(workspaceUser, ouPath, roleId, mapping) {
  const primaryEmail = normalizeEmail(workspaceUser.primaryEmail);
  const givenName = normalizeText(workspaceUser.name?.givenName);
  const familyName = normalizeText(workspaceUser.name?.familyName);
  const { apellidoPaterno, apellidoMaterno } = splitFamilyName(familyName);
  const username = normalizeText(workspaceUser.name?.fullName) || generateUsername(givenName, apellidoPaterno) || primaryEmail;
  const mobile = firstOfType(workspaceUser.phones, ["mobile", "work_mobile", "phone_mobile"]);
  const homePhone = firstOfType(workspaceUser.phones, ["home", "work", "main"]);
  const address = (workspaceUser.addresses || []).find((item) => item.primary) || workspaceUser.addresses?.[0] || {};
  const externalDni = firstOfType(workspaceUser.externalIds, ["dni", "employee_id", "organization"]);
  const schemaDni = customValue(workspaceUser, mapping, "numeroDocumentoField");
  const dni = normalizeText(schemaDni || externalDni?.value || workspaceUser.externalIds?.[0]?.value || "");
  const tipoDocumento = normalizeText(customValue(workspaceUser, mapping, "tipoDocumentoField"))
    || (/^\d{8}$/.test(dni) ? "DNI" : null);
  const recoveryEmail = normalizeEmail(workspaceUser.recoveryEmail);
  const alternateEmail = normalizeEmail((workspaceUser.emails || []).find((email) => !email.primary)?.address);
  const personalEmail = recoveryEmail || alternateEmail || primaryEmail;
  const fechaNacimiento = normalizeDate(customValue(workspaceUser, mapping, "fechaNacimientoField"));
  const fechaCreacion = normalizeDate(workspaceUser.creationTime) || new Date().toISOString();
  const avatar = workspaceUser.thumbnailPhotoUrl || null;

  return compactUndefined({
    username,
    email: personalEmail,
    provider: "workspace-import",
    confirmed: true,
    blocked: Boolean(workspaceUser.suspended),
    dni: dni || null,
    tipoDocumento,
    nombre: givenName || null,
    apellidos: familyName || null,
    apellidoPaterno: apellidoPaterno || null,
    apellidoMaterno: apellidoMaterno || null,
    sexo: normalizeText(customValue(workspaceUser, mapping, "sexoField")) || null,
    estadoCivil: normalizeText(customValue(workspaceUser, mapping, "estadoCivilField")) || null,
    instruccion: normalizeText(customValue(workspaceUser, mapping, "instruccionField")) || null,
    fechaNacimiento,
    direccion: normalizeText(customValue(workspaceUser, mapping, "direccionField") || address.streetAddress || "") || null,
    distrito: normalizeText(customValue(workspaceUser, mapping, "distritoField") || address.locality || "") || null,
    telefono: normalizePhoneForApp(homePhone?.value) || null,
    celular: normalizePhoneForApp(mobile?.value || workspaceUser.recoveryPhone) || null,
    correoInstitucional: primaryEmail,
    fechaCreacion,
    fechaModificacion: new Date().toISOString(),
    emailCreador: "workspace-import-script",
    avatar,
    rolId: roleId,
    _importMeta: {
      ouPath,
      primaryEmail,
    },
  });
}

function withoutImportMeta(profile) {
  const { _importMeta, ...data } = profile;
  return data;
}

function generatePassword(length = 20) {
  const lowercase = "abcdefghijkmnopqrstuvwxyz";
  const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const symbols = "!@#$%&*_-";
  const all = `${lowercase}${uppercase}${digits}${symbols}`;
  const pick = (chars) => chars[randomBytes(1)[0] % chars.length];
  const chars = [pick(lowercase), pick(uppercase), pick(digits), pick(symbols)];
  while (chars.length < length) chars.push(pick(all));
  return chars.sort(() => randomBytes(1)[0] - 128).join("");
}

function getKeyOutputId(value) {
  if (typeof value === "number") return value;
  if (value && typeof value === "object") {
    if (typeof value.id === "number") return value.id;
    if (Array.isArray(value.key) && typeof value.key[0]?.id === "number") return value.key[0].id;
  }
  return null;
}

async function listWorkspaceUsers(directory, ouPath) {
  const users = [];
  let pageToken;

  do {
    const response = await directory.users.list({
      customer: "my_customer",
      query: `orgUnitPath='${ouPath}'`,
      projection: "full",
      viewType: "admin_view",
      maxResults: 500,
      orderBy: "email",
      pageToken,
    });
    users.push(...(response.data.users || []));
    pageToken = response.data.nextPageToken || undefined;
  } while (pageToken);

  return users.filter((user) => normalizeOuPath(user.orgUnitPath) === ouPath);
}

async function main() {
  loadEnvFile(path.join(repoRoot, ".env.local"));
  loadEnvFile(path.join(repoRoot, ".env"));
  loadEnvFile(path.join(repoRoot, "functions", ".env"));
  loadEnvFile(path.join(repoRoot, "functions", ".env.local"));

  const args = parseArgs(process.argv.slice(2));
  const serviceAccount = getServiceAccount();
  const projectId = serviceAccount.project_id || process.env.GCLOUD_PROJECT || "cetprosmp-2026";
  const workspaceSubject =
    args.subject
    || process.env.WORKSPACE_SUBJECT_EMAIL
    || "enkee03@cetprosmp.edu.pe";

  if (args.target === "emulator") {
    process.env.FIREBASE_AUTH_EMULATOR_HOST ||= "127.0.0.1:9099";
    process.env.DATA_CONNECT_EMULATOR_HOST ||= "127.0.0.1:9399";
  }

  const app = getApps().length
    ? getApps()[0]
    : initializeApp({
      credential: cert(serviceAccount),
      projectId,
    });
  const auth = getAuth(app);
  const dataConnect = getDataConnect(connectorConfig, app);
  const jwt = new google.auth.JWT({
    email: serviceAccount.client_email,
    key: serviceAccount.private_key,
    scopes: WORKSPACE_SCOPES,
    subject: workspaceSubject,
  });
  const directory = google.admin({ version: "directory_v1", auth: jwt });

  console.log(`Destino: ${args.target} (${projectId})`);
  console.log(`Modo: ${args.apply ? "APPLY" : "DRY RUN"}`);
  console.log(`Workspace subject: ${workspaceSubject}`);
  console.log(`UO incluidas: ${args.ous.join(", ")}`);

  const [rolesResponse, usersResponse, personalSchemaMapping] = await Promise.all([
    dataConnect.executeGraphql(LIST_ROLES_QUERY),
    dataConnect.executeGraphql(LIST_USERS_QUERY),
    resolvePersonalSchemaMapping(directory),
  ]);

  const roles = new Map((rolesResponse.data.rols || []).map((role) => [Number(role.id), role]));
  for (const [ouPath, roleId] of ROLE_BY_OU.entries()) {
    if (args.ous.includes(ouPath) && !roles.has(roleId)) {
      throw new Error(`No existe el rol ${roleId} requerido para ${ouPath}.`);
    }
  }

  const existingProfiles = usersResponse.data.users || [];
  const profileByDocumentId = new Map();
  const profileByEmail = new Map();
  for (const profile of existingProfiles) {
    if (profile.documentId) profileByDocumentId.set(String(profile.documentId), profile);
    for (const email of [profile.correoInstitucional, profile.email]) {
      const normalized = normalizeEmail(email);
      if (normalized) profileByEmail.set(normalized, profile);
    }
  }

  const workspaceUsers = [];
  for (const ouPath of args.ous) {
    const roleId = ROLE_BY_OU.get(ouPath);
    if (!roleId) {
      throw new Error(`La UO ${ouPath} no esta permitida por este importador.`);
    }
    const users = await listWorkspaceUsers(directory, ouPath);
    workspaceUsers.push(...users.map((user) => ({ user, ouPath, roleId })));
  }

  const selectedUsers = args.limit > 0 ? workspaceUsers.slice(0, args.limit) : workspaceUsers;
  console.log(`Usuarios Workspace encontrados: ${workspaceUsers.length}`);
  if (args.limit > 0) console.log(`Limite aplicado: ${selectedUsers.length}`);

  const summary = {
    authCreated: 0,
    authUpdated: 0,
    profilesCreated: 0,
    profilesUpdated: 0,
    skipped: 0,
    failed: 0,
  };
  const failures = [];

  for (const item of selectedUsers) {
    const primaryEmail = normalizeEmail(item.user.primaryEmail);
    if (!primaryEmail) {
      summary.skipped += 1;
      continue;
    }

    const role = roles.get(item.roleId);
    const profile = extractProfile(item.user, item.ouPath, item.roleId, personalSchemaMapping);
    const displayName = profile.username || primaryEmail;
    const photoURL = profile.avatar && /^https?:\/\//i.test(profile.avatar) ? profile.avatar : undefined;

    try {
      let authUser = await auth.getUserByEmail(primaryEmail)
        .catch((error) => (error?.code === "auth/user-not-found" ? null : Promise.reject(error)));
      const authAction = authUser ? "update" : "create";

      if (args.apply) {
        if (authUser) {
          await auth.updateUser(authUser.uid, {
            displayName,
            disabled: Boolean(profile.blocked),
            emailVerified: true,
            ...(photoURL ? { photoURL } : {}),
          });
          authUser = await auth.getUser(authUser.uid);
          summary.authUpdated += 1;
        } else {
          authUser = await auth.createUser({
            email: primaryEmail,
            displayName,
            password: generatePassword(),
            disabled: Boolean(profile.blocked),
            emailVerified: true,
            ...(photoURL ? { photoURL } : {}),
          });
          summary.authCreated += 1;
        }

        await auth.setCustomUserClaims(authUser.uid, {
          role: String(item.roleId),
          level: Number(role?.scala ?? 0),
        });
      }

      const documentId = authUser?.uid || `dry-run-${primaryEmail}`;
      const existingProfile =
        profileByDocumentId.get(documentId)
        || profileByEmail.get(primaryEmail)
        || profileByEmail.get(normalizeEmail(profile.email));
      const data = {
        ...withoutImportMeta(profile),
        documentId,
        fechaCreacion: existingProfile?.fechaCreacion || profile.fechaCreacion,
      };

      if (args.apply) {
        if (existingProfile?.id) {
          const updated = await dataConnect.executeGraphql(
            UPDATE_USER_MUTATION,
            { variables: { id: existingProfile.id, data } },
          );
          const updatedId = getKeyOutputId(updated.data.user_update) ?? existingProfile.id;
          profileByDocumentId.set(documentId, { ...existingProfile, ...data, id: updatedId });
          profileByEmail.set(primaryEmail, { ...existingProfile, ...data, id: updatedId });
          summary.profilesUpdated += 1;
        } else {
          const created = await dataConnect.executeGraphql(
            INSERT_USER_MUTATION,
            { variables: { data } },
          );
          const createdId = getKeyOutputId(created.data.user_insert);
          profileByDocumentId.set(documentId, { ...data, id: createdId });
          profileByEmail.set(primaryEmail, { ...data, id: createdId });
          summary.profilesCreated += 1;
        }
      } else {
        if (authAction === "create") summary.authCreated += 1;
        else summary.authUpdated += 1;
        if (existingProfile?.id) summary.profilesUpdated += 1;
        else summary.profilesCreated += 1;
      }

      console.log(`${args.apply ? "OK" : "DRY"} ${primaryEmail} -> rol ${item.roleId} (${item.ouPath})`);
    } catch (error) {
      summary.failed += 1;
      failures.push({
        email: primaryEmail,
        message: error?.message || String(error),
      });
      console.error(`ERROR ${primaryEmail}: ${error?.message || error}`);
    }
  }

  console.log("Resumen:", JSON.stringify(summary, null, 2));
  if (failures.length) {
    console.log("Fallos:", JSON.stringify(failures, null, 2));
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exitCode = 1;
});
