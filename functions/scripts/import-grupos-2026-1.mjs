#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { google } from "googleapis";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getDataConnect } from "firebase-admin/data-connect";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

const DEFAULT_EXCEL_PATH = String.raw`G:\Mi unidad\_Desarrollo2\Files cetprosmp-strapi\Tablas - datos\Grupos Matricula 2026-1.xlsx`;
const DEFAULT_REPORT_PATH = path.join(repoRoot, "tmp", "grupos-2026-1-import-preview.json");
const SEMESTRE_TITULO = "2026-1";
const APP_GROUP_PREFIX = "26-1 ";
const PROJECT_ID = "cetprosmp-2026";
const DEFAULT_DOMAIN = "cetprosmp.edu.pe";

const connectorConfig = {
  connector: "default",
  serviceId: "cetprosmp-2026-service",
  location: "us-central1",
};

const WORKSPACE_SCOPES = [
  "https://www.googleapis.com/auth/admin.directory.group",
  "https://www.googleapis.com/auth/admin.directory.group.member",
  "https://www.googleapis.com/auth/apps.groups.settings",
];

const IMPORT_STATE_QUERY = `
  query ImportGrupos20261State($semestreTitulo: String!) {
    semestres(where: { titulo: { eq: $semestreTitulo } }, limit: 5) {
      id
      titulo
      coordinador1Id
      coordinador2Id
      coordinador1 {
        id
        displayName
        user {
          username
          correoInstitucional
        }
      }
      coordinador2 {
        id
        displayName
        user {
          username
          correoInstitucional
        }
      }
    }
    personals(limit: 1000) {
      id
      displayName
      user {
        id
        username
        correoInstitucional
        rolId
        rol {
          titulo
        }
      }
    }
    paquetes(limit: 1000) {
      id
      titulo
      descripcion
      archivado
      paqueteModulos_on_paquete(limit: 20, orderBy: [{ orden: ASC }, { id: ASC }]) {
        id
        paqueteId
        moduloId
        orden
        obligatorio
        modulo {
          id
          titulo
          tituloComercial
          orden
        }
      }
    }
    modulos(limit: 1000) {
      id
      titulo
      tituloComercial
      orden
      planId
    }
    unidadDidacticaModulos(limit: 50000) {
      id
      orden
      unidadDidacticaId
      moduloId
    }
    turnos(limit: 100) {
      id
      nombre
      estado
    }
    horarios(limit: 200) {
      id
      nombre
      regla
      diasSemana
      activo
    }
    grupos(limit: 1000) {
      id
      nombreDisplay
      workspaceCorreo
    }
  }
`;

const INSERT_PAQUETE_MUTATION = `
  mutation ImportGrupos20261InsertPaquete($data: Paquete_Data! @allow(fields: "titulo descripcion archivado")) {
    paquete_insert(data: $data)
  }
`;

const INSERT_PAQUETE_MODULO_MUTATION = `
  mutation ImportGrupos20261InsertPaqueteModulo($data: PaqueteModulo_Data! @allow(fields: "paqueteId moduloId orden obligatorio")) {
    paqueteModulo_insert(data: $data)
  }
`;

const INSERT_GRUPO_MUTATION = `
  mutation ImportGrupos20261InsertGrupo($data: Grupo_Data! @allow(fields: "turnoNombre descripcion nombreDisplay estado archivado fechaCreacion fechaActualizacion semestreId personalId paqueteId turnoId horarioId grupoOrd workspaceName workspaceCorreo")) {
    grupo_insert(data: $data)
  }
`;

const INSERT_GRUPO_MODULO_MUTATION = `
  mutation ImportGrupos20261InsertGrupoModulo($data: GrupoModulo_Data! @allow(fields: "grupoId moduloId orden obligatorio inicio fin calendarioId")) {
    grupoModulo_insert(data: $data)
  }
`;

const INSERT_GRUPO_MODULO_UNIDAD_MUTATION = `
  mutation ImportGrupos20261InsertGrupoModuloUnidad($data: GrupoModuloUnidadDidactica_Data! @allow(fields: "grupoModuloId unidadDidacticaId orden inicio fin")) {
    grupoModuloUnidadDidactica_insert(data: $data)
  }
`;

const PACKAGE_OVERRIDES = new Map([
  ["corte cabello dis barba y peinado", { packageId: 15, moduleIds: [1] }],
  ["trat capilar tinturac odulacion laceado", { packageId: 16, moduleIds: [2] }],
  ["operacion de maq ind de confeccion", { moduleIds: [35], createPackage: true }],
  ["tecconfeccion de prendas de vestir", { packageId: 25, moduleIds: [11] }],
  ["tec tizado tendido y cort de prend vestir", { packageId: 24, moduleIds: [10] }],
  ["tejido a maquina", { packageId: 28, moduleIds: [15] }],
  ["tejido a mano", { packageId: 29, moduleIds: [16] }],
  ["bordados a maquina computarizado", { packageId: 27, moduleIds: [14] }],
  ["ofimatica", { packageId: 21, moduleIds: [7] }],
  ["diseno publicitario", { packageId: 22, moduleIds: [8] }],
  ["soporte tecnico", { packageId: 47, moduleIds: [5, 6], ensurePackageModules: true }],
  ["bisuteria pintura decorativa", { packageId: 114, moduleIds: [22, 23] }],
  ["pintura decorativa ceramica al frio", { packageId: 81, moduleIds: [23, 24] }],
  ["decoracion de eventos especiales", { packageId: 34, moduleIds: [21] }],
  ["ensamblado y acabado de articulos de cuero", { packageId: 31, moduleIds: [18] }],
  ["patronaje y corte de calzado", { packageId: 32, moduleIds: [19] }],
  ["acond y elab de product de panad y paste", { packageId: 39, moduleIds: [26] }],
  ["ope bas de cocina y mane de insum", { packageId: 46, moduleIds: [33] }],
  ["mant de inst electricas", { packageId: 18, moduleIds: [4] }],
  ["reparacion de celulares", { packageId: 17, moduleIds: [3] }],
  ["conf de mueb de melamina", { packageId: 45, moduleIds: [32] }],
]);

const DIAS_TO_HORARIO_NAME = new Map([
  ["lu vi", "lun vie"],
  ["lu mi", "lun mie"],
  ["ma ju", "mar jue"],
  ["lu mi vi", "lun mie vie"],
  ["ma ju vi", "mar jue vie"],
]);

function parseArgs(argv) {
  const options = {
    apply: false,
    target: "emulator",
    excel: DEFAULT_EXCEL_PATH,
    report: DEFAULT_REPORT_PATH,
    workspace: true,
    limit: 0,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--apply") options.apply = true;
    else if (arg === "--dry-run") options.apply = false;
    else if (arg === "--skip-workspace") options.workspace = false;
    else if (arg === "--excel") options.excel = argv[++index];
    else if (arg === "--report") options.report = argv[++index];
    else if (arg.startsWith("--target=")) options.target = arg.slice("--target=".length);
    else if (arg.startsWith("--limit=")) options.limit = Number(arg.slice("--limit=".length)) || 0;
    else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Argumento no reconocido: ${arg}`);
    }
  }

  if (!["emulator", "prod"].includes(options.target)) {
    throw new Error("--target debe ser emulator o prod.");
  }

  return options;
}

function printHelp() {
  console.log(`Usage:
  node functions/scripts/import-grupos-2026-1.mjs --dry-run [--target=emulator|prod]
  node functions/scripts/import-grupos-2026-1.mjs --apply [--target=emulator|prod] [--skip-workspace]

Defaults:
  --target=emulator
  --excel "${DEFAULT_EXCEL_PATH}"
  --report "${DEFAULT_REPORT_PATH}"
`);
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  const lines = text.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;

    const eq = line.indexOf("=");
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (!key || process.env[key] !== undefined) continue;

    if (value.startsWith("'") && !value.endsWith("'")) {
      const parts = [value.slice(1)];
      while (index + 1 < lines.length) {
        index += 1;
        const next = lines[index];
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

function getFirebaseServiceAccount() {
  const rawJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (rawJson) return JSON.parse(rawJson);

  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credentialsPath) {
    return JSON.parse(fs.readFileSync(path.resolve(credentialsPath), "utf8"));
  }

  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  if (clientEmail && privateKey) {
    return {
      project_id: process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || PROJECT_ID,
      client_email: String(clientEmail).trim(),
      private_key: String(privateKey).replace(/\\n/g, "\n"),
    };
  }

  throw new Error("Falta GOOGLE_APPLICATION_CREDENTIALS_JSON o GOOGLE_APPLICATION_CREDENTIALS para Firebase.");
}

function getWorkspaceServiceAccount(fallbackServiceAccount) {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  if (clientEmail && privateKey) {
    return {
      project_id: process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || PROJECT_ID,
      client_email: String(clientEmail).trim(),
      private_key: String(privateKey).replace(/\\n/g, "\n"),
    };
  }

  return fallbackServiceAccount;
}

function psSingleQuoted(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function readExcelRows(excelPath) {
  const columns = [
    "Ord",
    "Especialidad",
    "PAQUETE",
    "Turno",
    "dias",
    "Docente",
    "MENU - HORARIO",
    "CORREO",
    "GRUPO",
    "Descripcion",
    "whoCanContactOwner",
    "whoCanViewGroup",
    "whoCanPostMessage",
    "whoCanViewMembership",
    "whoCanManageMembers",
    "whoCanJoin",
    "Estado",
  ];
  const columnsLiteral = columns.map(psSingleQuoted).join(",");
  const script = `
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$path = ${psSingleQuoted(excelPath)}
$columns = @(${columnsLiteral})
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
$wb = $excel.Workbooks.Open($path, $null, $true)
try {
  $ws = $wb.Worksheets.Item('datos')
  $used = $ws.UsedRange
  $headers = @{}
  for ($c = 1; $c -le $used.Columns.Count; $c++) {
    $header = [string]$ws.Cells.Item(1, $c).Text
    if ($header -and -not $headers.ContainsKey($header)) { $headers[$header] = $c }
  }
  $rows = @()
  for ($r = 2; $r -le $used.Rows.Count; $r++) {
    $item = [ordered]@{ row = $r }
    foreach ($column in $columns) {
      $value = ''
      if ($headers.ContainsKey($column)) { $value = [string]$ws.Cells.Item($r, $headers[$column]).Text }
      $item[$column] = $value
    }
    $rows += [pscustomobject]$item
  }
  @($rows) | ConvertTo-Json -Depth 5 -Compress
} finally {
  $wb.Close($false)
  $excel.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($wb) | Out-Null
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}
`;

  const result = spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script], {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 20,
  });

  if (result.status !== 0) {
    throw new Error(`No se pudo leer el Excel:\n${result.stderr || result.stdout}`);
  }

  const stdout = String(result.stdout || "").trim();
  if (!stdout) return [];
  const parsed = JSON.parse(stdout);
  return Array.isArray(parsed) ? parsed : [parsed];
}

function normalizeSpaces(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function normalizeComparable(value) {
  return normalizeSpaces(value)
    .replace(/[\u00f1\u00d1]/g, "n")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeCompact(value) {
  return normalizeComparable(value).replace(/\s+/g, "");
}

function normalizeEmail(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized.includes("@")) return "";
  if (normalized === `@${DEFAULT_DOMAIN}`) return "";
  return normalized;
}

function packageKey(value) {
  return normalizeComparable(String(value || "").replace(/\([^)]*\)/g, " "))
    .replace(/\bde\b/g, " de ")
    .trim()
    .replace(/\s+/g, " ");
}

function titleTokens(value) {
  return normalizeComparable(value).split(/\s+/).filter(Boolean);
}

function tokenScore(needle, haystack) {
  const needleTokens = titleTokens(needle);
  const haystackTokens = new Set(titleTokens(haystack));
  if (needleTokens.length === 0) return 0;
  const matched = needleTokens.filter((token) => haystackTokens.has(token)).length;
  return matched / needleTokens.length;
}

function uniqueNumbers(values) {
  return Array.from(new Set(values.map(Number).filter((value) => Number.isFinite(value) && value > 0)));
}

function getIdFromKeyOutput(value) {
  if (typeof value === "number") return value;
  if (!value || typeof value !== "object") return null;
  const id = Number(value.id ?? value.key?.id ?? value._key?.id ?? 0);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function parseGrupoOrd(value, fallback) {
  const raw = String(value || "").trim();
  const asNumber = Number(raw);
  if (Number.isInteger(asNumber)) return asNumber;
  return fallback;
}

function cleanDescription(row) {
  const raw = normalizeSpaces(row.Descripcion);
  if (raw) return raw.replace(/\b25-2\b/g, "26-1");

  const paquete = normalizeSpaces(row.PAQUETE);
  const turno = normalizeSpaces(row.Turno).replace(/^\d+/, "");
  const dias = normalizeSpaces(row.dias);
  return [`Grupo ${SEMESTRE_TITULO} de: ${paquete}.`, turno ? `turno ${turno}.` : "", dias ? `horario: ${dias}` : ""]
    .filter(Boolean)
    .join(" ");
}

function isValidExcelRow(row) {
  return Boolean(
    normalizeEmail(row.CORREO)
    && normalizeSpaces(row["MENU - HORARIO"])
    && normalizeSpaces(row.PAQUETE)
    && normalizeSpaces(row.Docente),
  );
}

function buildStateIndexes(state) {
  const packageById = new Map((state.paquetes || []).map((item) => [Number(item.id), item]));
  const moduleById = new Map((state.modulos || []).map((item) => [Number(item.id), item]));
  const unitsByModuloId = new Map();
  for (const item of state.unidadDidacticaModulos || []) {
    const current = unitsByModuloId.get(Number(item.moduloId)) || [];
    current.push(item);
    unitsByModuloId.set(Number(item.moduloId), current);
  }
  for (const items of unitsByModuloId.values()) {
    items.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || a.unidadDidacticaId - b.unidadDidacticaId);
  }

  const turnoByName = new Map((state.turnos || []).map((item) => [normalizeComparable(item.nombre), item]));
  const horarioByName = new Map((state.horarios || []).map((item) => [normalizeComparable(item.nombre), item]));
  const existingGroupByEmail = new Map(
    (state.grupos || [])
      .map((item) => [normalizeEmail(item.workspaceCorreo), item])
      .filter(([email]) => email),
  );
  const existingGroupByName = new Map(
    (state.grupos || [])
      .map((item) => [normalizeComparable(item.nombreDisplay), item])
      .filter(([name]) => name),
  );

  return {
    packageById,
    moduleById,
    unitsByModuloId,
    turnoByName,
    horarioByName,
    existingGroupByEmail,
    existingGroupByName,
  };
}

function resolveTurno(rawTurno, indexes) {
  const normalized = normalizeComparable(rawTurno).replace(/^\d+/, "").trim();
  return indexes.turnoByName.get(normalized) || null;
}

function resolveHorario(rawDias, indexes) {
  const normalized = normalizeComparable(rawDias).replace(/\bat\b/g, "").replace(/\s+/g, " ").trim();
  const target = DIAS_TO_HORARIO_NAME.get(normalized) || normalized;
  return indexes.horarioByName.get(target) || null;
}

function resolvePersonal(rawDocente, personals) {
  const raw = normalizeComparable(rawDocente);
  const rawTokens = titleTokens(raw);
  const candidates = [];
  for (const personal of personals || []) {
    const label = [personal.displayName, personal.user?.username].filter(Boolean).join(" ");
    const labelTokens = new Set(titleTokens(label));
    const allTokens = rawTokens.length > 0 && rawTokens.every((token) => labelTokens.has(token));
    const score = tokenScore(raw, label);
    if (allTokens || score > 0) candidates.push({ personal, score: allTokens ? 1 : score, label });
  }
  candidates.sort((a, b) => b.score - a.score || String(a.label).localeCompare(String(b.label), "es"));
  return candidates[0] || null;
}

function findBestPackageBySimilarity(rawPaquete, packages) {
  const candidates = (packages || []).map((item) => ({
    package: item,
    score: Math.max(tokenScore(rawPaquete, item.titulo), tokenScore(item.titulo, rawPaquete)),
  }));
  candidates.sort((a, b) => b.score - a.score || String(a.package.titulo).localeCompare(String(b.package.titulo), "es"));
  return candidates[0] || null;
}

function packageModuleIds(paquete) {
  return uniqueNumbers((paquete?.paqueteModulos_on_paquete || []).map((item) => item.moduloId));
}

function moduleTitle(module) {
  return module?.tituloComercial || module?.titulo || `Modulo ${module?.id || ""}`.trim();
}

function resolvePackage(rawPaquete, state, indexes) {
  const key = packageKey(rawPaquete);
  const override = PACKAGE_OVERRIDES.get(key);
  if (override) {
    const paquete = override.packageId ? indexes.packageById.get(Number(override.packageId)) || null : null;
    const moduleIds = uniqueNumbers(override.moduleIds || packageModuleIds(paquete));
    const modules = moduleIds.map((id) => indexes.moduleById.get(id)).filter(Boolean);
    const title = paquete?.titulo || modules.map(moduleTitle).join(" / ") || normalizeSpaces(rawPaquete);
    return {
      status: paquete ? "matched-override" : (override.createPackage ? "create-package" : "missing-package"),
      paquete,
      paqueteId: paquete?.id || null,
      moduleIds,
      title,
      ensurePackageModules: Boolean(override.ensurePackageModules || override.createPackage),
      rawKey: key,
      score: 1,
    };
  }

  const exact = (state.paquetes || []).find((item) => normalizeComparable(item.titulo) === normalizeComparable(rawPaquete));
  if (exact) {
    return {
      status: "matched-exact",
      paquete: exact,
      paqueteId: exact.id,
      moduleIds: packageModuleIds(exact),
      title: exact.titulo,
      ensurePackageModules: false,
      rawKey: key,
      score: 1,
    };
  }

  const best = findBestPackageBySimilarity(rawPaquete, state.paquetes);
  if (best && best.score >= 0.72) {
    return {
      status: "matched-fuzzy",
      paquete: best.package,
      paqueteId: best.package.id,
      moduleIds: packageModuleIds(best.package),
      title: best.package.titulo,
      ensurePackageModules: false,
      rawKey: key,
      score: Number(best.score.toFixed(3)),
    };
  }

  return {
    status: "unresolved",
    paquete: null,
    paqueteId: null,
    moduleIds: [],
    title: "",
    ensurePackageModules: false,
    rawKey: key,
    score: best ? Number(best.score.toFixed(3)) : 0,
  };
}

function buildWorkspaceSettings(row) {
  const manageMembers = normalizeSpaces(row.whoCanManageMembers);
  return {
    whoCanContactOwner: normalizeSpaces(row.whoCanContactOwner),
    whoCanViewGroup: normalizeSpaces(row.whoCanViewGroup),
    whoCanPostMessage: normalizeSpaces(row.whoCanPostMessage),
    whoCanViewMembership: normalizeSpaces(row.whoCanViewMembership),
    whoCanModifyMembers: manageMembers,
    whoCanModerateMembers: manageMembers,
    whoCanJoin: normalizeSpaces(row.whoCanJoin),
  };
}

function compactSettings(settings) {
  return Object.fromEntries(Object.entries(settings).filter(([, value]) => Boolean(value)));
}

function buildPlan(rows, state) {
  const indexes = buildStateIndexes(state);
  const semestre = (state.semestres || [])[0] || null;
  const coordinatorEmails = [
    normalizeEmail(semestre?.coordinador1?.user?.correoInstitucional),
    normalizeEmail(semestre?.coordinador2?.user?.correoInstitucional),
  ].filter(Boolean);
  const validRows = rows.filter(isValidExcelRow);
  const skippedRows = rows.filter((row) => !isValidExcelRow(row) && (normalizeEmail(row.CORREO) || normalizeSpaces(row["MENU - HORARIO"]) || normalizeSpaces(row.PAQUETE)));
  const seenEmails = new Set();
  const seenNames = new Set();
  const groups = [];
  const blockers = [];
  const packageActions = new Map();

  validRows.forEach((row, index) => {
    const correo = normalizeEmail(row.CORREO);
    const appName = `${APP_GROUP_PREFIX}${normalizeSpaces(row["MENU - HORARIO"])}`;
    const workspaceName = normalizeSpaces(row.GRUPO) || appName;
    const packageResolution = resolvePackage(row.PAQUETE, state, indexes);
    const personalMatch = resolvePersonal(row.Docente, state.personals || []);
    const personal = personalMatch?.personal || null;
    const ownerEmail = normalizeEmail(personal?.user?.correoInstitucional);
    const turno = resolveTurno(row.Turno, indexes);
    const horario = resolveHorario(row.dias, indexes);
    const moduleIds = uniqueNumbers(packageResolution.moduleIds);
    const description = cleanDescription(row);
    const settings = compactSettings(buildWorkspaceSettings(row));
    const rowBlockers = [];

    if (!semestre) rowBlockers.push("No existe semestre 2026-1.");
    if (coordinatorEmails.length < 1) rowBlockers.push("El semestre no tiene coordinadores con correo institucional.");
    if (!packageResolution.paqueteId && packageResolution.status !== "create-package") rowBlockers.push(`No se resolvio paquete: ${row.PAQUETE}`);
    if (moduleIds.length === 0) rowBlockers.push(`No se resolvieron modulos para paquete: ${row.PAQUETE}`);
    if (!personal) rowBlockers.push(`No se resolvio docente: ${row.Docente}`);
    if (personal && !ownerEmail) rowBlockers.push(`El docente no tiene correo institucional: ${row.Docente}`);
    if (!turno) rowBlockers.push(`No se resolvio turno: ${row.Turno}`);
    if (!horario) rowBlockers.push(`No se resolvio horario: ${row.dias}`);
    if (seenEmails.has(correo)) rowBlockers.push(`Correo duplicado en Excel: ${correo}`);
    if (seenNames.has(normalizeComparable(appName))) rowBlockers.push(`Nombre duplicado en Excel: ${appName}`);
    if (indexes.existingGroupByEmail.has(correo)) rowBlockers.push(`Ya existe un grupo con correo ${correo}`);
    if (indexes.existingGroupByName.has(normalizeComparable(appName))) rowBlockers.push(`Ya existe un grupo con nombre ${appName}`);

    seenEmails.add(correo);
    seenNames.add(normalizeComparable(appName));

    if (packageResolution.status === "create-package" || packageResolution.ensurePackageModules) {
      const key = packageResolution.paqueteId ? `existing:${packageResolution.paqueteId}` : `create:${packageResolution.rawKey}`;
      packageActions.set(key, {
        action: packageResolution.status === "create-package" ? "create-package" : "ensure-package-modules",
        packageId: packageResolution.paqueteId,
        title: packageResolution.title,
        moduleIds,
        rawPaquete: row.PAQUETE,
      });
    }

    const group = {
      row: row.row,
      excel: {
        paquete: row.PAQUETE,
        docente: row.Docente,
        turno: row.Turno,
        dias: row.dias,
        menuHorario: row["MENU - HORARIO"],
        correo,
        workspaceName,
      },
      app: {
        nombreDisplay: appName,
        descripcion: description,
        grupoOrd: parseGrupoOrd(row.Ord, index + 1),
        semestreId: semestre?.id || null,
        personalId: personal?.id || null,
        paqueteId: packageResolution.paqueteId,
        turnoId: turno?.id || null,
        horarioId: horario?.id || null,
        workspaceCorreo: correo,
        workspaceName,
      },
      workspace: {
        email: correo,
        name: workspaceName,
        description,
        ownerEmail,
        managerEmails: coordinatorEmails.filter((email) => email !== ownerEmail),
        settings,
      },
      matched: {
        paqueteStatus: packageResolution.status,
        paqueteId: packageResolution.paqueteId,
        paqueteTitle: packageResolution.title,
        packageScore: packageResolution.score,
        moduleIds,
        modules: moduleIds.map((id) => ({ id, title: moduleTitle(indexes.moduleById.get(id)) })),
        docenteId: personal?.id || null,
        docenteName: personal?.user?.username || personal?.displayName || null,
        docenteScore: personalMatch ? Number(personalMatch.score.toFixed(3)) : 0,
        turno: turno?.nombre || null,
        horario: horario?.nombre || null,
      },
      blockers: rowBlockers,
    };

    if (rowBlockers.length) blockers.push(...rowBlockers.map((message) => ({ row: row.row, message })));
    groups.push(group);
  });

  return {
    targetSemestre: semestre ? {
      id: semestre.id,
      titulo: semestre.titulo,
      coordinador1: semestre.coordinador1?.user?.correoInstitucional || null,
      coordinador2: semestre.coordinador2?.user?.correoInstitucional || null,
    } : null,
    groups,
    skippedRows,
    blockers,
    packageActions: Array.from(packageActions.values()),
    counts: {
      rawRows: rows.length,
      validRows: validRows.length,
      skippedRows: skippedRows.length,
      groupsReady: groups.filter((group) => group.blockers.length === 0).length,
      groupsBlocked: groups.filter((group) => group.blockers.length > 0).length,
      packageActions: packageActions.size,
    },
  };
}

async function ensurePackage(dataConnect, action, indexes) {
  let packageId = action.packageId || null;
  if (!packageId) {
    const created = await dataConnect.executeGraphql(INSERT_PAQUETE_MUTATION, {
      variables: {
        data: {
          titulo: action.title,
          descripcion: `Paquete creado por importacion ${SEMESTRE_TITULO}: ${action.rawPaquete}`,
          archivado: false,
        },
      },
    });
    packageId = getIdFromKeyOutput(created.data.paquete_insert);
    if (!packageId) throw new Error(`No se pudo crear paquete para ${action.rawPaquete}.`);
    action.packageId = packageId;
    indexes.packageById.set(packageId, {
      id: packageId,
      titulo: action.title,
      paqueteModulos_on_paquete: [],
    });
  }

  const paquete = indexes.packageById.get(Number(packageId));
  const existingModuleIds = new Set(packageModuleIds(paquete));
  const missingModuleIds = uniqueNumbers(action.moduleIds).filter((id) => !existingModuleIds.has(id));
  for (const [index, moduleId] of missingModuleIds.entries()) {
    await dataConnect.executeGraphql(INSERT_PAQUETE_MODULO_MUTATION, {
      variables: {
        data: {
          paqueteId: Number(packageId),
          moduloId: moduleId,
          orden: existingModuleIds.size + index + 1,
          obligatorio: true,
        },
      },
    });
  }
  return packageId;
}

async function insertGrupoModuloUnidades(dataConnect, grupoModuloId, moduloId, indexes) {
  const units = indexes.unitsByModuloId.get(Number(moduloId)) || [];
  for (const [index, unit] of units.entries()) {
    await dataConnect.executeGraphql(INSERT_GRUPO_MODULO_UNIDAD_MUTATION, {
      variables: {
        data: {
          grupoModuloId,
          unidadDidacticaId: unit.unidadDidacticaId,
          orden: unit.orden ?? index + 1,
          inicio: null,
          fin: null,
        },
      },
    });
  }
}

async function insertAppGroup(dataConnect, group, indexes, packageIdOverride = null) {
  const now = new Date().toISOString();
  const payload = {
    turnoNombre: group.matched.turno,
    descripcion: group.app.descripcion,
    nombreDisplay: group.app.nombreDisplay,
    estado: "activo",
    archivado: false,
    fechaCreacion: now,
    fechaActualizacion: now,
    semestreId: group.app.semestreId,
    personalId: group.app.personalId,
    paqueteId: packageIdOverride || group.app.paqueteId,
    turnoId: group.app.turnoId,
    horarioId: group.app.horarioId,
    grupoOrd: group.app.grupoOrd,
    workspaceName: group.app.workspaceName,
    workspaceCorreo: group.app.workspaceCorreo,
  };

  const created = await dataConnect.executeGraphql(INSERT_GRUPO_MUTATION, { variables: { data: payload } });
  const grupoId = getIdFromKeyOutput(created.data.grupo_insert);
  if (!grupoId) throw new Error(`No se pudo crear grupo ${group.app.nombreDisplay}.`);

  for (const [index, moduloId] of group.matched.moduleIds.entries()) {
    const inserted = await dataConnect.executeGraphql(INSERT_GRUPO_MODULO_MUTATION, {
      variables: {
        data: {
          grupoId,
          moduloId,
          orden: index + 1,
          obligatorio: true,
          inicio: null,
          fin: null,
          calendarioId: null,
        },
      },
    });
    const grupoModuloId = getIdFromKeyOutput(inserted.data.grupoModulo_insert);
    if (!grupoModuloId) throw new Error(`No se pudo crear modulo ${moduloId} para grupo ${grupoId}.`);
    await insertGrupoModuloUnidades(dataConnect, grupoModuloId, moduloId, indexes);
  }

  return grupoId;
}

function getWorkspaceClients(serviceAccount) {
  const subject = process.env.WORKSPACE_SUBJECT_EMAIL;
  if (!subject) throw new Error("Falta WORKSPACE_SUBJECT_EMAIL para actualizar Workspace.");

  const jwt = new google.auth.JWT({
    email: serviceAccount.client_email,
    key: serviceAccount.private_key,
    scopes: WORKSPACE_SCOPES,
    subject,
  });

  return {
    subject,
    directory: google.admin({ version: "directory_v1", auth: jwt }),
    groupsSettings: google.groupssettings({ version: "v1", auth: jwt }),
  };
}

function getWorkspaceErrorInfo(error) {
  const err = error || {};
  const status = Number(err.code || err.status || err.response?.status || 0);
  const message = String(err.message || err.response?.data?.error?.message || "");
  const reason = JSON.stringify({
    message,
    errors: err.errors || "",
    responseData: err.response?.data || "",
  }).toLowerCase();
  return { status, message, reason };
}

function isNotFound(error) {
  const { status, reason } = getWorkspaceErrorInfo(error);
  return status === 404 || reason.includes("not found") || reason.includes("notfound");
}

function isAlreadyExists(error) {
  const { status, reason } = getWorkspaceErrorInfo(error);
  return status === 409 || reason.includes("already exists") || reason.includes("duplicate") || reason.includes("member already exists");
}

async function upsertWorkspaceGroup(directory, group) {
  const requestBody = {
    email: group.workspace.email,
    name: group.workspace.name,
    description: group.workspace.description,
  };

  try {
    await directory.groups.insert({ requestBody });
    return "created";
  } catch (error) {
    if (!isAlreadyExists(error)) throw error;
    await directory.groups.patch({ groupKey: group.workspace.email, requestBody });
    return "updated";
  }
}

async function upsertWorkspaceMember(directory, groupEmail, memberEmail, role) {
  const email = normalizeEmail(memberEmail);
  if (!email) return "skipped";
  try {
    await directory.members.insert({
      groupKey: groupEmail,
      requestBody: { email, role },
    });
    return "created";
  } catch (error) {
    if (!isAlreadyExists(error)) throw error;
    await directory.members.update({
      groupKey: groupEmail,
      memberKey: email,
      requestBody: { email, role },
    });
    return "updated";
  }
}

async function updateWorkspaceGroup(workspaceClients, group) {
  const { directory, groupsSettings } = workspaceClients;
  const groupAction = await upsertWorkspaceGroup(directory, group);
  await groupsSettings.groups.patch({
    groupUniqueId: group.workspace.email,
    requestBody: group.workspace.settings,
  });
  const ownerAction = await upsertWorkspaceMember(directory, group.workspace.email, group.workspace.ownerEmail, "OWNER");
  const managerActions = [];
  for (const managerEmail of group.workspace.managerEmails) {
    managerActions.push({
      email: managerEmail,
      action: await upsertWorkspaceMember(directory, group.workspace.email, managerEmail, "MANAGER"),
    });
  }
  return { groupAction, ownerAction, managerActions };
}

async function preflightWorkspace(workspaceClients) {
  await workspaceClients.directory.groups.list({
    domain: DEFAULT_DOMAIN,
    maxResults: 1,
  });
}

async function applyPlan(dataConnect, serviceAccount, plan, options, state) {
  if (plan.blockers.length > 0) {
    throw new Error(`La importacion tiene ${plan.blockers.length} bloqueos. Revisa el reporte antes de aplicar.`);
  }

  const indexes = buildStateIndexes(state);
  const workspaceClients = options.workspace ? getWorkspaceClients(serviceAccount) : null;
  if (workspaceClients) await preflightWorkspace(workspaceClients);

  const packageIdByActionKey = new Map();
  for (const action of plan.packageActions) {
    const beforeId = action.packageId || null;
    const packageId = await ensurePackage(dataConnect, action, indexes);
    packageIdByActionKey.set(beforeId ? `existing:${beforeId}` : `create:${packageKey(action.rawPaquete)}`, packageId);
  }

  const results = [];
  for (const group of plan.groups) {
    const packageAction = plan.packageActions.find((action) =>
      (!group.app.paqueteId && packageKey(action.rawPaquete) === packageKey(group.excel.paquete))
      || (group.app.paqueteId && Number(action.packageId) === Number(group.app.paqueteId)),
    );
    const packageIdOverride = packageAction
      ? packageIdByActionKey.get(packageAction.packageId ? `existing:${packageAction.packageId}` : `create:${packageKey(packageAction.rawPaquete)}`)
      : null;
    const workspace = workspaceClients ? await updateWorkspaceGroup(workspaceClients, group) : { skipped: true };
    const grupoId = await insertAppGroup(dataConnect, group, indexes, packageIdOverride);
    results.push({
      row: group.row,
      grupoId,
      workspace,
      email: group.workspace.email,
      nombreDisplay: group.app.nombreDisplay,
    });
  }
  return results;
}

function writeReport(reportPath, report) {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

function printSummary(report) {
  console.log(`Destino Data Connect: ${report.target}`);
  console.log(`Modo: ${report.mode}`);
  console.log(`Excel: ${report.excel.validRows} grupos validos, ${report.excel.skippedRows} filas omitidas`);
  console.log(`Semestre: ${report.plan.targetSemestre ? `${report.plan.targetSemestre.titulo} (id ${report.plan.targetSemestre.id})` : "NO RESUELTO"}`);
  console.log(`Grupos listos: ${report.plan.counts.groupsReady}; bloqueados: ${report.plan.counts.groupsBlocked}`);
  console.log(`Acciones de paquetes: ${report.plan.counts.packageActions}`);
  if (report.plan.blockers.length > 0) {
    console.log("Bloqueos:");
    for (const item of report.plan.blockers.slice(0, 20)) console.log(`  fila ${item.row}: ${item.message}`);
  }
  if (report.applyResults) {
    console.log(`Aplicados: ${report.applyResults.length}`);
  }
  console.log(`Reporte: ${report.reportPath}`);
}

async function main() {
  loadEnvFile(path.join(repoRoot, ".env.local"));
  loadEnvFile(path.join(repoRoot, ".env"));
  loadEnvFile(path.join(repoRoot, "functions", ".env"));
  loadEnvFile(path.join(repoRoot, "functions", ".env.local"));

  const options = parseArgs(process.argv.slice(2));
  if (options.target === "emulator") {
    process.env.DATA_CONNECT_EMULATOR_HOST ||= "127.0.0.1:9399";
    process.env.FIREBASE_DATA_CONNECT_EMULATOR_HOST ||= "127.0.0.1:9399";
  } else {
    delete process.env.DATA_CONNECT_EMULATOR_HOST;
    delete process.env.FIREBASE_DATA_CONNECT_EMULATOR_HOST;
  }
  process.env.GCLOUD_PROJECT ||= PROJECT_ID;
  process.env.GOOGLE_CLOUD_PROJECT ||= PROJECT_ID;

  const firebaseServiceAccount = getFirebaseServiceAccount();
  const workspaceServiceAccount = getWorkspaceServiceAccount(firebaseServiceAccount);
  const projectId = firebaseServiceAccount.project_id || process.env.GCLOUD_PROJECT || PROJECT_ID;
  const app = getApps().length
    ? getApps()[0]
    : initializeApp({
      credential: cert(firebaseServiceAccount),
      projectId,
    });
  const dataConnect = getDataConnect(connectorConfig, app);

  const allRows = readExcelRows(options.excel);
  const rows = options.limit > 0 ? allRows.slice(0, options.limit) : allRows;
  const stateResponse = await dataConnect.executeGraphql(IMPORT_STATE_QUERY, {
    variables: { semestreTitulo: SEMESTRE_TITULO },
  });
  const state = stateResponse.data;
  const plan = buildPlan(rows, state);
  const report = {
    mode: options.apply ? "apply" : "dry-run",
    target: options.target,
    workspace: {
      enabled: options.workspace,
      subject: options.workspace ? (process.env.WORKSPACE_SUBJECT_EMAIL || null) : null,
    },
    excel: {
      path: options.excel,
      sheet: "datos",
      rawRows: rows.length,
      validRows: plan.counts.validRows,
      skippedRows: plan.counts.skippedRows,
    },
    plan,
    applyResults: null,
    reportPath: options.report,
  };

  if (options.apply) {
    report.applyResults = await applyPlan(dataConnect, workspaceServiceAccount, plan, options, state);
  }

  writeReport(options.report, report);
  printSummary(report);
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
