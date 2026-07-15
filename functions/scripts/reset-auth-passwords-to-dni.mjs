#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getDataConnect } from "firebase-admin/data-connect";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const PROJECT_ID = "cetprosmp-2026";

const connectorConfig = {
  connector: "default",
  serviceId: "cetprosmp-2026-service",
  location: "us-central1",
};

const LIST_USERS_QUERY = `
  query ResetAuthPasswordsListUsers {
    users(limit: 20000) {
      id
      documentId
      username
      email
      correoInstitucional
      dni
      blocked
      rolId
      rol {
        titulo
        scala
      }
    }
  }
`;

const UPDATE_USER_AUTH_LINK_MUTATION = `
  mutation ResetAuthPasswordsUpdateUser($id: Int!, $data: User_Data! @allow(fields: "documentId provider confirmed correoInstitucional")) {
    user_update(id: $id, data: $data)
  }
`;

function parseArgs(argv) {
  const args = {
    apply: false,
    target: "prod",
    credential: "service-account",
    limit: 0,
    only: new Set(),
  };

  for (const arg of argv) {
    if (arg === "--apply") args.apply = true;
    else if (arg === "--dry-run") args.apply = false;
    else if (arg.startsWith("--target=")) args.target = arg.slice("--target=".length);
    else if (arg.startsWith("--credential=")) args.credential = arg.slice("--credential=".length);
    else if (arg.startsWith("--limit=")) args.limit = Number(arg.slice("--limit=".length)) || 0;
    else if (arg.startsWith("--only=")) {
      arg
        .slice("--only=".length)
        .split(",")
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean)
        .forEach((value) => args.only.add(value));
    } else {
      throw new Error(`Argumento no reconocido: ${arg}`);
    }
  }

  if (!["emulator", "prod"].includes(args.target)) {
    throw new Error("--target debe ser emulator o prod.");
  }
  if (!["service-account", "adc"].includes(args.credential)) {
    throw new Error("--credential debe ser service-account o adc.");
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
      value = parts.join("\n");
    } else if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
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
      project_id: process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || PROJECT_ID,
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

  throw new Error("Falta GOOGLE_CLIENT_EMAIL/GOOGLE_PRIVATE_KEY o GOOGLE_APPLICATION_CREDENTIALS.");
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeDni(value) {
  const dni = String(value || "").replace(/\D+/g, "");
  return /^\d{8}$/.test(dni) ? dni : "";
}

function matchesOnlyFilter(user, only) {
  if (only.size === 0) return true;
  const candidates = [
    user.id,
    user.documentId,
    user.email,
    user.correoInstitucional,
    user.dni,
  ].map(normalizeText);

  return candidates.some((candidate) => only.has(candidate));
}

async function getAuthUser(auth, user) {
  const documentId = String(user.documentId || "").trim();
  if (documentId && !documentId.startsWith("matricula:")) {
    const byUid = await auth
      .getUser(documentId)
      .catch((error) => (error?.code === "auth/user-not-found" ? null : Promise.reject(error)));
    if (byUid) return byUid;
  }

  const emailCandidates = Array.from(
    new Set(
      [user.correoInstitucional, user.email]
        .map(normalizeText)
        .filter((value) => value.includes("@")),
    ),
  );

  for (const email of emailCandidates) {
    const byEmail = await auth
      .getUserByEmail(email)
      .catch((error) => (error?.code === "auth/user-not-found" ? null : Promise.reject(error)));
    if (byEmail) return byEmail;
  }

  return null;
}

function resolveInstitutionalEmail(user, dni) {
  const fromProfile = normalizeText(user.correoInstitucional);
  if (fromProfile.includes("@")) return fromProfile;

  const fromEmail = normalizeText(user.email);
  if (fromEmail.endsWith("@cetprosmp.edu.pe")) return fromEmail;

  return `${dni}@cetprosmp.edu.pe`;
}

function resolveDisplayName(user) {
  return String(user.username || user.correoInstitucional || user.email || `Usuario ${user.id}`).trim();
}

function resolveRoleClaims(user) {
  const roleId = Number(user.rolId || 0);
  const level = Number(user.rol?.scala ?? 0);
  return {
    role: Number.isFinite(roleId) && roleId > 0 ? String(roleId) : "1",
    level: Number.isFinite(level) ? level : 0,
  };
}

async function main() {
  loadEnvFile(path.join(repoRoot, ".env.local"));
  loadEnvFile(path.join(repoRoot, ".env"));
  loadEnvFile(path.join(repoRoot, "functions", ".env"));
  loadEnvFile(path.join(repoRoot, "functions", ".env.local"));

  const args = parseArgs(process.argv.slice(2));
  if (args.target === "emulator") {
    process.env.FIREBASE_AUTH_EMULATOR_HOST ||= "127.0.0.1:9099";
    process.env.DATA_CONNECT_EMULATOR_HOST ||= "127.0.0.1:9399";
  } else {
    delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
    delete process.env.DATA_CONNECT_EMULATOR_HOST;
  }

  const serviceAccount = args.credential === "service-account" ? getServiceAccount() : null;
  const projectId = serviceAccount?.project_id || PROJECT_ID;
  const app = getApps().length
    ? getApps()[0]
    : initializeApp({
      credential: serviceAccount ? cert(serviceAccount) : applicationDefault(),
      projectId,
    });
  const auth = getAuth(app);
  const dataConnect = getDataConnect(connectorConfig, app);

  const response = await dataConnect.executeGraphql(LIST_USERS_QUERY);
  const users = (response.data.users || [])
    .filter((user) => matchesOnlyFilter(user, args.only))
    .slice(0, args.limit > 0 ? args.limit : undefined);

  const summary = {
    target: args.target,
    mode: args.apply ? "APPLY" : "DRY RUN",
    scanned: users.length,
    candidates: 0,
    updated: 0,
    created: 0,
    skippedInvalidDni: 0,
    skippedNoAuth: 0,
    errors: 0,
  };

  for (const user of users) {
    const dni = normalizeDni(user.dni);
    if (!dni) {
      summary.skippedInvalidDni += 1;
      continue;
    }

    summary.candidates += 1;
    let authUser = await getAuthUser(auth, user);
    if (!authUser) {
      const email = resolveInstitutionalEmail(user, dni);
      try {
        if (args.apply) {
          authUser = await auth.createUser({
            email,
            password: dni,
            displayName: resolveDisplayName(user),
            emailVerified: true,
            disabled: Boolean(user.blocked),
          });
          await auth.setCustomUserClaims(authUser.uid, resolveRoleClaims(user));
          await dataConnect.executeGraphql(UPDATE_USER_AUTH_LINK_MUTATION, {
            variables: {
              id: Number(user.id),
              data: {
                documentId: authUser.uid,
                provider: "password",
                confirmed: true,
                correoInstitucional: email,
              },
            },
          });
        }
        summary.created += 1;
        console.log(`${args.apply ? "Creado" : "Crear"}: ${email} userId=${user.id}`);
        continue;
      } catch (error) {
        summary.errors += 1;
        summary.skippedNoAuth += 1;
        console.error(`Error creando Auth userId=${user.id} email=${email}:`, error);
        continue;
      }
    }

    try {
      if (args.apply) {
        await auth.updateUser(authUser.uid, {
          password: dni,
          emailVerified: true,
          disabled: Boolean(user.blocked),
        });
        await auth.setCustomUserClaims(authUser.uid, resolveRoleClaims(user));
        if (String(user.documentId || "").trim() !== authUser.uid) {
          await dataConnect.executeGraphql(UPDATE_USER_AUTH_LINK_MUTATION, {
            variables: {
              id: Number(user.id),
              data: {
                documentId: authUser.uid,
                provider: "password",
                confirmed: true,
                correoInstitucional: resolveInstitutionalEmail(user, dni),
              },
            },
          });
        }
      }
      summary.updated += 1;
      console.log(`${args.apply ? "Actualizado" : "Pendiente"}: ${authUser.email || authUser.uid} userId=${user.id}`);
    } catch (error) {
      summary.errors += 1;
      console.error(`Error actualizando userId=${user.id} uid=${authUser.uid}:`, error);
    }
  }

  console.log(JSON.stringify(summary, null, 2));
  if (!args.apply) {
    console.log("Dry-run solamente. Ejecuta con --apply para aplicar los cambios.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
