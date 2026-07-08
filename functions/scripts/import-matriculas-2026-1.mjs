#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getDataConnect } from "firebase-admin/data-connect";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

const DEFAULT_EXCEL_PATH = String.raw`G:\Mi unidad\_Desarrollo2\Files cetprosmp-strapi\Tablas - datos\Estudiantes_26-1\Reporte_Estudiantes_26-1-2_con_SECUENCIA.xlsx`;
const DEFAULT_REPORT_PATH = path.join(repoRoot, "tmp", "matriculas-2026-1-import-preview.json");
const SEMESTRE_TITULO = "2026-1";
const PROJECT_ID = "cetprosmp-2026";
const STUDENT_ROLE_ID = 3;
const DEFAULT_DOMAIN = "cetprosmp.edu.pe";

const connectorConfig = {
  connector: "default",
  serviceId: "cetprosmp-2026-service",
  location: "us-central1",
};

const IMPORT_STATE_QUERY = `
  query ImportMatriculas20261State($semestreTitulo: String!) {
    semestres(where: { titulo: { eq: $semestreTitulo } }, limit: 5) {
      id
      titulo
    }
    rols(where: { id: { eq: 3 } }, limit: 1) {
      id
      titulo
    }
    grupos(where: { semestre: { titulo: { eq: $semestreTitulo } } }, limit: 1000, orderBy: [{ grupoOrd: ASC }, { id: ASC }]) {
      id
      nombreDisplay
      paqueteId
      workspaceCorreo
      paquete {
        id
        titulo
        archivado
      }
      grupoModulos_on_grupo(limit: 10, orderBy: [{ orden: ASC }, { id: ASC }]) {
        id
        orden
        moduloId
        grupoId
        modulo {
          id
          titulo
          tituloComercial
        }
      }
    }
    paquetes(limit: 1000) {
      id
      titulo
      archivado
      paqueteModulos_on_paquete(limit: 10, orderBy: [{ orden: ASC }, { id: ASC }]) {
        id
        orden
        obligatorio
        moduloId
        modulo {
          id
          titulo
          tituloComercial
        }
      }
    }
    users(limit: 20000) {
      id
      documentId
      username
      email
      provider
      confirmed
      blocked
      dni
      tipoDocumento
      nombre
      apellidos
      apellidoPaterno
      apellidoMaterno
      sexo
      nacionalidad
      estadoCivil
      instruccion
      fechaNacimiento
      fechaVencimiento
      direccion
      distrito
      telefono
      celular
      correoInstitucional
      fechaCreacion
      fechaModificacion
      emailCreador
      avatar
      dniImagenFrenteUrl
      dniImagenReversoUrl
      dniImagenFrenteProcesadaUrl
      dniImagenReversoProcesadaUrl
      rolId
    }
    matriculas(where: { semestre: { titulo: { eq: $semestreTitulo } } }, limit: 20000) {
      id
      userId
      semestreId
      paqueteId
      recibo
      user {
        id
        dni
        tipoDocumento
      }
    }
  }
`;

const INSERT_USER_MUTATION = `
  mutation ImportMatriculas20261InsertUser($data: User_Data! @allow(fields: "documentId username email provider confirmed blocked dni tipoDocumento nombre apellidos apellidoPaterno apellidoMaterno sexo nacionalidad estadoCivil instruccion fechaNacimiento fechaVencimiento direccion distrito telefono celular correoInstitucional fechaCreacion fechaModificacion emailCreador avatar dniImagenFrenteUrl dniImagenReversoUrl dniImagenFrenteProcesadaUrl dniImagenReversoProcesadaUrl rolId")) {
    user_insert(data: $data)
  }
`;

const UPDATE_USER_MUTATION = `
  mutation ImportMatriculas20261UpdateUser($id: Int!, $data: User_Data! @allow(fields: "documentId username email provider confirmed blocked dni tipoDocumento nombre apellidos apellidoPaterno apellidoMaterno sexo nacionalidad estadoCivil instruccion fechaNacimiento fechaVencimiento direccion distrito telefono celular correoInstitucional fechaCreacion fechaModificacion emailCreador avatar dniImagenFrenteUrl dniImagenReversoUrl dniImagenFrenteProcesadaUrl dniImagenReversoProcesadaUrl rolId")) {
    user_update(id: $id, data: $data)
  }
`;

const INSERT_MATRICULA_MUTATION = `
  mutation ImportMatriculas20261InsertMatricula($data: Matricula_Data! @allow(fields: "recibo fecha archivado paqueteId semestreId userId")) {
    matricula_insert(data: $data)
  }
`;

const INSERT_MODULO_ESTUDIANTE_MUTATION = `
  mutation ImportMatriculas20261InsertModuloEstudiante($data: ModuloEstudiante_Data! @allow(fields: "promedio matriculaId moduloId grupoId")) {
    moduloEstudiante_insert(data: $data)
  }
`;

const GROUP_ALIAS = new Map([
  [
    "apardo armado y acabado de calzado noche lu vi john grijalba",
    "patronaje y corte de calzado noche lu vi john grijalba",
  ],
  [
    "manejo de maq ind de confeccion noche lu mi maria saavedra",
    "operacion de maq ind de confeccion noche lu mi maria saavedra",
  ],
  [
    "productos pasteleria y panaderia ii manana lu vi dora gonzalo",
    "acond y elab de product de panad y paste manana lu vi dora gonzalo",
  ],
  [
    "productos pasteleria y panaderia ii tarde lu vi maria blas",
    "acond y elab de product de panad y paste tarde lu vi maria blas",
  ],
  [
    "productos pasteleria y panaderia ii noche lu vi mary lazo",
    "acond y elab de product de panad y paste noche lu vi mary lazo",
  ],
]);

function parseArgs(argv) {
  const options = {
    apply: false,
    target: "emulator",
    excel: DEFAULT_EXCEL_PATH,
    report: DEFAULT_REPORT_PATH,
    limit: 0,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--apply") options.apply = true;
    else if (arg === "--dry-run") options.apply = false;
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
  node functions/scripts/import-matriculas-2026-1.mjs --dry-run [--target=emulator|prod]
  node functions/scripts/import-matriculas-2026-1.mjs --apply [--target=emulator|prod]

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

  throw new Error("Falta GOOGLE_APPLICATION_CREDENTIALS_JSON o GOOGLE_APPLICATION_CREDENTIALS para Firebase.");
}

function psSingleQuoted(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function readExcelRows(excelPath) {
  const columns = [
    "TIPO DOCUMENTO",
    "N\u00daMERO DOCUMENTO",
    "APELLIDO PATERNO",
    "APELLIDO MATERNO",
    "NOMBRES",
    "SEXO",
    "FECHA NACIMIENTO",
    "EMAIL",
    "TEL\u00c9FONO CELULAR",
    "NOMBRE M\u00d3DULO",
    "SECUENCIA",
    "FECHA DE REGISTRO",
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
  $ws = $wb.Worksheets.Item('Reporte_Estudiantes')
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
    maxBuffer: 1024 * 1024 * 30,
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
    .replace(/^26\s*-\s*1\s+/, "")
    .replace(/\bat\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  return email.includes("@") ? email : "";
}

function normalizeDocumentType(value) {
  const text = normalizeComparable(value).replace(/\s+/g, "");
  if (text.includes("extranjeria") || text === "ce" || text.includes("carnet")) return "CE";
  if (text.includes("dni") || text.includes("documentonacional") || text.includes("cui")) return "DNI";
  return "";
}

function normalizeDocumentNumber(value) {
  return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function normalizeGender(value) {
  const text = normalizeComparable(value);
  if (text === "f" || text.includes("femenino") || text.includes("mujer")) return "F";
  if (text === "m" || text.includes("masculino") || text.includes("hombre")) return "M";
  return null;
}

function parseDate(value) {
  const raw = normalizeSpaces(value);
  if (!raw) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}T00:00:00.000Z`;
  const dmy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(raw);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}T00:00:00.000Z`;
  return null;
}

function compactUndefined(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined));
}

function getIdFromKeyOutput(value) {
  if (typeof value === "number") return value;
  if (!value || typeof value !== "object") return null;
  const id = Number(value.id ?? value.key?.id ?? value._key?.id ?? 0);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function uniqueNumbers(values) {
  return Array.from(new Set(values.map(Number).filter((value) => Number.isFinite(value) && value > 0)));
}

function tokenScore(needle, haystack) {
  const needleTokens = normalizeComparable(needle).split(/\s+/).filter(Boolean);
  const haystackTokens = new Set(normalizeComparable(haystack).split(/\s+/).filter(Boolean));
  if (needleTokens.length === 0) return 0;
  return needleTokens.filter((token) => haystackTokens.has(token)).length / needleTokens.length;
}

function groupKey(value) {
  return normalizeComparable(value);
}

function documentKey(tipoDocumento, dni) {
  return `${tipoDocumento}:${dni}`;
}

function moduleSetKey(moduleIds) {
  return uniqueNumbers(moduleIds).sort((a, b) => a - b).join(",");
}

function buildStateIndexes(state) {
  const groupByKey = new Map();
  for (const group of state.grupos || []) {
    groupByKey.set(groupKey(group.nombreDisplay), group);
  }

  const packageById = new Map((state.paquetes || []).map((item) => [Number(item.id), item]));
  const packageByModuleSet = new Map();
  for (const item of state.paquetes || []) {
    const key = moduleSetKey((item.paqueteModulos_on_paquete || []).map((mod) => mod.moduloId));
    if (key && !packageByModuleSet.has(key)) packageByModuleSet.set(key, item);
  }

  const userByDocument = new Map();
  for (const user of state.users || []) {
    const type = normalizeDocumentType(user.tipoDocumento);
    const dni = normalizeDocumentNumber(user.dni);
    if (type && dni && !userByDocument.has(documentKey(type, dni))) {
      userByDocument.set(documentKey(type, dni), user);
    }
  }

  const matriculaByUserSemesterPackage = new Set();
  for (const matricula of state.matriculas || []) {
    if (matricula.userId && matricula.semestreId && matricula.paqueteId) {
      matriculaByUserSemesterPackage.add(`${matricula.userId}:${matricula.semestreId}:${matricula.paqueteId}`);
    }
  }

  return {
    groupByKey,
    packageById,
    packageByModuleSet,
    userByDocument,
    matriculaByUserSemesterPackage,
  };
}

function resolveGroup(rawSecuencia, state, indexes) {
  const sourceKey = groupKey(rawSecuencia);
  const aliasKey = GROUP_ALIAS.get(sourceKey) || sourceKey;
  const exact = indexes.groupByKey.get(aliasKey);
  if (exact) return { group: exact, method: GROUP_ALIAS.has(sourceKey) ? "alias" : "exact", score: 1 };

  const candidates = (state.grupos || [])
    .map((group) => ({
      group,
      score: Math.max(tokenScore(rawSecuencia, group.nombreDisplay), tokenScore(group.nombreDisplay, rawSecuencia)),
    }))
    .sort((a, b) => b.score - a.score || Number(a.group.id) - Number(b.group.id));

  const best = candidates[0] || null;
  if (best && best.score >= 0.82) {
    return { group: best.group, method: "fuzzy", score: Number(best.score.toFixed(3)) };
  }

  return { group: null, method: "unresolved", score: best ? Number(best.score.toFixed(3)) : 0 };
}

function resolvePackageForGroup(group, indexes) {
  if (group?.paqueteId) {
    const paquete = indexes.packageById.get(Number(group.paqueteId)) || null;
    return { paquete, paqueteId: paquete?.id || group.paqueteId, method: "group-paqueteId" };
  }

  const groupModuleIds = uniqueNumbers((group?.grupoModulos_on_grupo || []).map((item) => item.moduloId));
  const paquete = indexes.packageByModuleSet.get(moduleSetKey(groupModuleIds)) || null;
  return { paquete, paqueteId: paquete?.id || null, method: paquete ? "module-set" : "unresolved" };
}

function packageModules(paquete, group) {
  const packageMods = (paquete?.paqueteModulos_on_paquete || [])
    .slice()
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || a.moduloId - b.moduloId);
  if (packageMods.length > 0) return packageMods.map((item) => ({ moduloId: item.moduloId, orden: item.orden }));

  return (group?.grupoModulos_on_grupo || [])
    .slice()
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || a.moduloId - b.moduloId)
    .map((item) => ({ moduloId: item.moduloId, orden: item.orden }));
}

function isValidExcelRow(row) {
  return Boolean(
    normalizeDocumentType(row["TIPO DOCUMENTO"])
    && normalizeDocumentNumber(row["N\u00daMERO DOCUMENTO"])
    && normalizeSpaces(row.SECUENCIA)
  );
}

function buildUserPayload(row, existingUser, now) {
  const tipoDocumento = normalizeDocumentType(row["TIPO DOCUMENTO"]);
  const dni = normalizeDocumentNumber(row["N\u00daMERO DOCUMENTO"]);
  const nombre = normalizeSpaces(row.NOMBRES) || null;
  const apellidoPaterno = normalizeSpaces(row["APELLIDO PATERNO"]) || null;
  const apellidoMaterno = normalizeSpaces(row["APELLIDO MATERNO"]) || null;
  const apellidos = [apellidoPaterno, apellidoMaterno].filter(Boolean).join(" ") || null;
  const username = [nombre, apellidoPaterno, apellidoMaterno].filter(Boolean).join(" ") || existingUser?.username || "Estudiante";
  const email = normalizeEmail(row.EMAIL) || `${dni.toLowerCase()}@${DEFAULT_DOMAIN}`;
  const fechaNacimiento = parseDate(row["FECHA NACIMIENTO"]);

  return compactUndefined({
    documentId: existingUser?.documentId || `matricula:${tipoDocumento}:${dni}`,
    username,
    email,
    provider: existingUser?.provider || "matricula",
    confirmed: existingUser?.confirmed ?? true,
    blocked: existingUser?.blocked ?? false,
    dni,
    tipoDocumento,
    nombre,
    apellidos,
    apellidoPaterno,
    apellidoMaterno,
    sexo: normalizeGender(row.SEXO),
    nacionalidad: existingUser?.nacionalidad || (tipoDocumento === "DNI" ? "PERUANA" : null),
    estadoCivil: existingUser?.estadoCivil ?? null,
    instruccion: existingUser?.instruccion || "Secundaria",
    fechaNacimiento: fechaNacimiento ?? existingUser?.fechaNacimiento ?? null,
    fechaVencimiento: existingUser?.fechaVencimiento ?? null,
    direccion: existingUser?.direccion ?? null,
    distrito: existingUser?.distrito ?? null,
    telefono: existingUser?.telefono ?? null,
    celular: normalizeSpaces(row["TEL\u00c9FONO CELULAR"]) || existingUser?.celular || null,
    correoInstitucional: email,
    fechaCreacion: existingUser?.fechaCreacion || now,
    fechaModificacion: now,
    emailCreador: existingUser?.emailCreador || "import-matriculas-2026-1",
    avatar: existingUser?.avatar ?? null,
    dniImagenFrenteUrl: existingUser?.dniImagenFrenteUrl ?? null,
    dniImagenReversoUrl: existingUser?.dniImagenReversoUrl ?? null,
    dniImagenFrenteProcesadaUrl: existingUser?.dniImagenFrenteProcesadaUrl ?? null,
    dniImagenReversoProcesadaUrl: existingUser?.dniImagenReversoProcesadaUrl ?? null,
    rolId: existingUser?.rolId || STUDENT_ROLE_ID,
  });
}

function buildPlan(rows, state) {
  const indexes = buildStateIndexes(state);
  const semestre = (state.semestres || [])[0] || null;
  const role = (state.rols || [])[0] || null;
  const validRows = rows.filter(isValidExcelRow);
  const skippedRows = rows.filter((row) => !isValidExcelRow(row) && (
    normalizeDocumentNumber(row["N\u00daMERO DOCUMENTO"])
    || normalizeSpaces(row.SECUENCIA)
    || normalizeSpaces(row["NOMBRE M\u00d3DULO"])
  ));
  const now = new Date().toISOString();
  const plannedDocumentPackage = new Set();
  const plannedUsers = new Map();
  const matriculas = [];
  const blockers = [];
  const warnings = [];

  for (const [index, row] of validRows.entries()) {
    const tipoDocumento = normalizeDocumentType(row["TIPO DOCUMENTO"]);
    const dni = normalizeDocumentNumber(row["N\u00daMERO DOCUMENTO"]);
    const docKey = documentKey(tipoDocumento, dni);
    const groupResolution = resolveGroup(row.SECUENCIA, state, indexes);
    const group = groupResolution.group;
    const packageResolution = resolvePackageForGroup(group, indexes);
    const moduleRows = packageModules(packageResolution.paquete, group);
    const existingUser = indexes.userByDocument.get(docKey) || null;
    const plannedUser = plannedUsers.get(docKey) || null;
    const syntheticUserKey = existingUser?.id ? String(existingUser.id) : docKey;
    const rowBlockers = [];
    const rowWarnings = [];

    if (!semestre) rowBlockers.push("No existe semestre 2026-1.");
    if (!role) rowBlockers.push("No existe rol estudiante id 3.");
    if (!group) rowBlockers.push(`No se resolvio grupo por SECUENCIA: ${row.SECUENCIA}`);
    if (groupResolution.method === "fuzzy") {
      rowWarnings.push(`Grupo resuelto por similitud (${groupResolution.score}): ${group?.nombreDisplay}`);
    }
    if (!packageResolution.paqueteId) rowBlockers.push(`No se resolvio paquete para grupo: ${group?.nombreDisplay || row.SECUENCIA}`);
    if (packageResolution.paquete?.archivado) rowBlockers.push(`El paquete esta archivado: ${packageResolution.paquete?.titulo}`);
    if (moduleRows.length < 1) rowBlockers.push(`No se resolvieron modulos para grupo: ${group?.nombreDisplay || row.SECUENCIA}`);

    const paqueteId = packageResolution.paqueteId || null;
    if (existingUser?.id && semestre?.id && paqueteId && indexes.matriculaByUserSemesterPackage.has(`${existingUser.id}:${semestre.id}:${paqueteId}`)) {
      rowBlockers.push(`Ya existe matricula para ${tipoDocumento} ${dni} en paquete ${paqueteId}.`);
    }

    if (semestre?.id && paqueteId) {
      const plannedKey = `${syntheticUserKey}:${semestre.id}:${paqueteId}`;
      if (plannedDocumentPackage.has(plannedKey)) {
        rowBlockers.push(`Duplicado en Excel para ${tipoDocumento} ${dni} y paquete ${paqueteId}.`);
      }
      plannedDocumentPackage.add(plannedKey);
    }

    const excelModule = normalizeSpaces(row["NOMBRE M\u00d3DULO"]);
    const moduleLabels = [
      packageResolution.paquete?.titulo,
      ...(group?.grupoModulos_on_grupo || []).map((item) => item.modulo?.tituloComercial || item.modulo?.titulo),
    ].filter(Boolean).join(" / ");
    const moduleScore = tokenScore(excelModule, moduleLabels);
    if (excelModule && moduleLabels && moduleScore < 0.32) {
      rowWarnings.push(`Modulo Excel con baja similitud (${moduleScore.toFixed(2)}): "${excelModule}" -> "${moduleLabels}"`);
    }

    const userPayload = plannedUser?.userPayload || buildUserPayload(row, existingUser, now);
    plannedUsers.set(docKey, { existingUser, userPayload });

    const item = {
      row: row.row,
      excel: {
        tipoDocumento,
        dni,
        apellidoPaterno: row["APELLIDO PATERNO"],
        apellidoMaterno: row["APELLIDO MATERNO"],
        nombres: row.NOMBRES,
        sexo: row.SEXO,
        fechaNacimiento: row["FECHA NACIMIENTO"],
        email: normalizeEmail(row.EMAIL),
        celular: row["TEL\u00c9FONO CELULAR"],
        nombreModulo: row["NOMBRE M\u00d3DULO"],
        secuencia: row.SECUENCIA,
        fechaRegistro: row["FECHA DE REGISTRO"],
      },
      user: {
        existingUserId: existingUser?.id || null,
        documentKey: docKey,
        payload: userPayload,
      },
      matricula: {
        fecha: parseDate(row["FECHA DE REGISTRO"]) || now,
        recibo: null,
        archivado: false,
        semestreId: semestre?.id || null,
        paqueteId,
      },
      grupo: group ? {
        id: group.id,
        nombreDisplay: group.nombreDisplay,
        paqueteId: group.paqueteId,
        resolution: groupResolution.method,
        packageResolution: packageResolution.method,
      } : null,
      modulos: moduleRows.map((item) => ({
        moduloId: item.moduloId,
        grupoId: group?.id || null,
      })),
      blocked: rowBlockers.length > 0,
      blockers: rowBlockers,
      warnings: rowWarnings,
      ordinal: index + 1,
    };

    matriculas.push(item);
    for (const message of rowBlockers) blockers.push({ row: row.row, message });
    for (const message of rowWarnings) warnings.push({ row: row.row, message });
  }

  return {
    targetSemestre: semestre,
    studentRole: role,
    counts: {
      rawRows: rows.length,
      validRows: validRows.length,
      skippedRows: skippedRows.length,
      matriculasReady: matriculas.filter((item) => !item.blocked).length,
      matriculasBlocked: matriculas.filter((item) => item.blocked).length,
      uniqueStudents: plannedUsers.size,
      warnings: warnings.length,
    },
    skippedRows: skippedRows.map((row) => ({
      row: row.row,
      dni: row["N\u00daMERO DOCUMENTO"],
      secuencia: row.SECUENCIA,
      modulo: row["NOMBRE M\u00d3DULO"],
    })),
    matriculas,
    blockers,
    warnings,
  };
}

async function upsertUser(dataConnect, item, createdUsers) {
  const cache = createdUsers.get(item.user.documentKey);
  if (cache) return cache;

  if (item.user.existingUserId) {
    const updated = await dataConnect.executeGraphql(UPDATE_USER_MUTATION, {
      variables: { id: item.user.existingUserId, data: item.user.payload },
    });
    const id = getIdFromKeyOutput(updated.data.user_update) || item.user.existingUserId;
    const result = { userId: id, action: "updated" };
    createdUsers.set(item.user.documentKey, result);
    return result;
  }

  const created = await dataConnect.executeGraphql(INSERT_USER_MUTATION, {
    variables: { data: item.user.payload },
  });
  const id = getIdFromKeyOutput(created.data.user_insert);
  if (!id) throw new Error(`No se pudo crear usuario ${item.user.documentKey}.`);
  const result = { userId: id, action: "created" };
  createdUsers.set(item.user.documentKey, result);
  return result;
}

async function insertMatricula(dataConnect, item, userId) {
  const created = await dataConnect.executeGraphql(INSERT_MATRICULA_MUTATION, {
    variables: {
      data: {
        recibo: item.matricula.recibo,
        fecha: item.matricula.fecha,
        archivado: item.matricula.archivado,
        paqueteId: item.matricula.paqueteId,
        semestreId: item.matricula.semestreId,
        userId,
      },
    },
  });
  const matriculaId = getIdFromKeyOutput(created.data.matricula_insert);
  if (!matriculaId) throw new Error(`No se pudo crear matricula para ${item.user.documentKey}.`);

  for (const modulo of item.modulos) {
    await dataConnect.executeGraphql(INSERT_MODULO_ESTUDIANTE_MUTATION, {
      variables: {
        data: {
          promedio: null,
          matriculaId,
          moduloId: modulo.moduloId,
          grupoId: modulo.grupoId,
        },
      },
    });
  }

  return matriculaId;
}

async function applyPlan(dataConnect, plan) {
  if (plan.blockers.length > 0) {
    throw new Error(`La importacion tiene ${plan.blockers.length} bloqueos. Revisa el reporte antes de aplicar.`);
  }

  const createdUsers = new Map();
  const results = [];
  for (const item of plan.matriculas) {
    const userResult = await upsertUser(dataConnect, item, createdUsers);
    const matriculaId = await insertMatricula(dataConnect, item, userResult.userId);
    results.push({
      row: item.row,
      matriculaId,
      userId: userResult.userId,
      userAction: userResult.action,
      grupoId: item.grupo?.id || null,
      paqueteId: item.matricula.paqueteId,
      dni: item.excel.dni,
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
  console.log(`Excel: ${report.excel.validRows} filas validas, ${report.excel.skippedRows} filas omitidas`);
  console.log(`Semestre: ${report.plan.targetSemestre ? `${report.plan.targetSemestre.titulo} (id ${report.plan.targetSemestre.id})` : "NO RESUELTO"}`);
  console.log(`Matriculas listas: ${report.plan.counts.matriculasReady}; bloqueadas: ${report.plan.counts.matriculasBlocked}`);
  console.log(`Estudiantes unicos: ${report.plan.counts.uniqueStudents}; advertencias: ${report.plan.counts.warnings}`);
  if (report.plan.blockers.length > 0) {
    console.log("Bloqueos:");
    for (const item of report.plan.blockers.slice(0, 25)) console.log(`  fila ${item.row}: ${item.message}`);
  }
  if (report.plan.warnings.length > 0) {
    console.log("Advertencias:");
    for (const item of report.plan.warnings.slice(0, 10)) console.log(`  fila ${item.row}: ${item.message}`);
  }
  if (report.applyResults) {
    console.log(`Aplicadas: ${report.applyResults.length}`);
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

  const serviceAccount = getFirebaseServiceAccount();
  const app = getApps().length
    ? getApps()[0]
    : initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id || PROJECT_ID,
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
      touched: false,
      note: "Este script no usa Google Workspace ni Firebase Auth.",
    },
    excel: {
      path: options.excel,
      rawRows: rows.length,
      validRows: plan.counts.validRows,
      skippedRows: plan.counts.skippedRows,
    },
    plan,
    reportPath: options.report,
  };

  if (options.apply) {
    report.applyResults = await applyPlan(dataConnect, plan);
  }

  writeReport(options.report, report);
  printSummary(report);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
