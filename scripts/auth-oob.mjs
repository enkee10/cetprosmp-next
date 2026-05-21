#!/usr/bin/env node

import { spawn } from "node:child_process";

const host = process.env.AUTH_EMULATOR_HOST || "127.0.0.1";
const port = process.env.AUTH_EMULATOR_PORT || "9099";
const projectId = process.env.FIREBASE_PROJECT_ID || "cetprosmp-2026";
const apiKey = process.env.AUTH_EMULATOR_API_KEY || "fake-api-key";
const baseUrl = `http://${host}:${port}/emulator/v1/projects/${projectId}/oobCodes`;
const applyOobUrl = `http://${host}:${port}/identitytoolkit.googleapis.com/v1/accounts:update?key=${encodeURIComponent(apiKey)}`;

const args = process.argv.slice(2);
const action = args[0] || "list";

function getArg(flag) {
  const i = args.findIndex((a) => a === flag);
  if (i === -1) return null;
  return args[i + 1] || null;
}

function pickLatestForEmail(codes, email) {
  const filtered = codes.filter(
    (c) => c.requestType === "VERIFY_EMAIL" && (!email || c.email === email),
  );
  return filtered.length ? filtered[filtered.length - 1] : null;
}

function pickLatestVerifyCode(codes) {
  const filtered = codes.filter((c) => c.requestType === "VERIFY_EMAIL");
  return filtered.length ? filtered[filtered.length - 1] : null;
}

async function openInBrowser(url) {
  const platform = process.platform;
  if (platform === "win32") {
    spawn(
      "powershell",
      [
        "-NoProfile",
        "-Command",
        `Start-Process -FilePath '${url.replace(/'/g, "''")}'`,
      ],
      { stdio: "ignore", detached: true },
    );
    return;
  }
  if (platform === "darwin") {
    spawn("open", [url], { stdio: "ignore", detached: true });
    return;
  }
  spawn("xdg-open", [url], { stdio: "ignore", detached: true });
}

async function main() {
  const res = await fetch(baseUrl);
  if (!res.ok) {
    throw new Error(`No se pudo leer oobCodes (${res.status} ${res.statusText}). URL: ${baseUrl}`);
  }
  const data = await res.json();
  const oobCodes = Array.isArray(data.oobCodes) ? data.oobCodes : [];

  if (action === "list") {
    if (!oobCodes.length) {
      console.log("No hay OOB codes pendientes.");
      return;
    }
    for (const code of oobCodes) {
      console.log(`email: ${code.email}`);
      console.log(`type: ${code.requestType}`);
      console.log(`link: ${code.oobLink}`);
      console.log("---");
    }
    return;
  }

  if (action === "open" || action === "latest") {
    const email = getArg("--email");
    const code = pickLatestForEmail(oobCodes, email);
    if (!code) {
      if (email) {
        throw new Error(`No se encontró VERIFY_EMAIL para ${email}.`);
      }
      throw new Error("No se encontró ningún VERIFY_EMAIL disponible.");
    }
    console.log(`Abriendo link para ${code.email}...`);
    console.log(code.oobLink);
    await openInBrowser(code.oobLink);
    return;
  }

  if (action === "verify") {
    const email = getArg("--email");
    const code = email ? pickLatestForEmail(oobCodes, email) : pickLatestVerifyCode(oobCodes);
    if (!code) {
      if (email) {
        throw new Error(`No se encontró VERIFY_EMAIL para ${email}.`);
      }
      throw new Error("No se encontró ningún VERIFY_EMAIL disponible.");
    }

    const res = await fetch(applyOobUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oobCode: code.oobCode }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`No se pudo aplicar oobCode (${res.status}): ${body}`);
    }
    const payload = await res.json();
    console.log(`Correo verificado para ${payload.email}.`);
    return;
  }

  if (action === "verify-latest") {
    const code = pickLatestVerifyCode(oobCodes);
    if (!code) {
      throw new Error("No se encontró ningún VERIFY_EMAIL disponible.");
    }

    const res = await fetch(applyOobUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oobCode: code.oobCode }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`No se pudo aplicar oobCode (${res.status}): ${body}`);
    }
    const payload = await res.json();
    console.log(`Correo verificado automáticamente (último): ${payload.email}.`);
    return;
  }

  console.log("Uso:");
  console.log("  node scripts/auth-oob.mjs list");
  console.log("  node scripts/auth-oob.mjs open --email alguien@dominio.com");
  console.log("  node scripts/auth-oob.mjs latest");
  console.log("  node scripts/auth-oob.mjs verify --email alguien@dominio.com");
  console.log("  node scripts/auth-oob.mjs verify-latest");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
