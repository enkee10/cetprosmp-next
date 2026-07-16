import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const DEFAULT_EXCEL_PATH = String.raw`G:\Mi unidad\_Desarrollo2\Files cetprosmp-strapi\Tablas - datos\Extraccion_Semestre1_v4_con_unidad_competencia.xlsx`;
const DEFAULT_REPORT_PATH = path.join(ROOT_DIR, "tmp", "modulo-competencias-report.json");
const MATCH_THRESHOLD = 0.72;

const MODULE_OVERRIDES = new Map([
  ["operaciones basicas de cocina y manejo de insumos", 33],
  ["tecnicas de tizado tendido y", 10],
  ["acondicionamiento y elaboracion de productos de panaderia y pasteleria", 25],
  ["tecnicas de confeccion de prendas de vestir", 11],
  ["tratamiento capilar coloracion ondulacion y laceado", 2],
  ["atencion de incidentes y problemas de operatividad en el centro de computo", 5],
  ["aparado armado y acabado de calzado", 20],
  ["ensamblado y acabado de articulos de cuero", 18],
  ["diseno y corte de calzado", 19],
  ["corte de cabello diseno barba y peinado", 1],
  ["mantenimiento de carpinteria", 31],
  ["confeccion de muebles en melamina", 32],
  ["diseno publicitario", 8],
  ["ofimatica", 7],
  ["bordados computarizados", 14],
  ["ceramica al frio", 24],
  ["mantenimiento de telefonos celulares", 3],
  ["bisuteria", 22],
  ["decoracion de eventos especiales", 21],
  ["mantenimiento de instalaciones electricas domiciliarias", 4],
  ["pintura decorativa", 23],
  ["tejido a maquina", 15],
  ["tejido a mano", 16],
]);

const LIST_MODULOS_QUERY = `
  query ListModulosForCompetencias {
    modulos(limit: 1000, orderBy: [{ id: ASC }]) {
      id
      titulo
      tituloComercial
      slug
      competencia
    }
  }
`;

const UPDATE_MODULO_COMPETENCIA_MUTATION = `
  mutation UpdateModuloCompetencia($id: Int!, $data: Modulo_Data! @allow(fields: "competencia")) {
    modulo_update(id: $id, data: $data)
  }
`;

function parseArgs(argv) {
  const options = {
    apply: false,
    production: false,
    excel: DEFAULT_EXCEL_PATH,
    report: DEFAULT_REPORT_PATH,
    python: "python",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--apply") options.apply = true;
    else if (arg === "--production") options.production = true;
    else if (arg === "--excel") options.excel = argv[++index];
    else if (arg === "--report") options.report = argv[++index];
    else if (arg === "--python") options.python = argv[++index];
    else if (arg === "--help" || arg === "-h") {
      console.log(`Usage:
  node scripts/update-modulo-competencias.mjs [--excel <path>] [--report <path>]
  node scripts/update-modulo-competencias.mjs --apply [--production]

By default this targets the local Data Connect emulator at 127.0.0.1:9399.`);
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function cleanText(value) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeText(value) {
  return cleanText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseCompetenciaPart(value) {
  let text = cleanText(value);
  let uc = null;

  const unidadMatch = text.match(/^unidad\s+de\s+competencia\s*(?:n[°o.]*)?\s*(\d+)?\s*(?:\(\s*UC\s*(\d+)\s*\))?\s*[:.-]?\s*/i);
  if (unidadMatch) {
    uc = Number(unidadMatch[2] || unidadMatch[1] || "") || null;
    text = text.slice(unidadMatch[0].length).trim();
  }

  const ucMatch = text.match(/^uc\s*(\d+)\s*[:."-]?\s*/i);
  if (ucMatch) {
    uc ??= Number(ucMatch[1]) || null;
    text = text.slice(ucMatch[0].length).trim();
  }

  const numericMatch = text.match(/^(\d+)\s*[.)-]\s*/);
  if (numericMatch) {
    uc ??= Number(numericMatch[1]) || null;
    text = text.slice(numericMatch[0].length).trim();
  }

  return {
    uc,
    body: text
      .replace(/^["“”'.,:;\-\s]+/, "")
      .replace(/\s+/g, " ")
      .trim(),
  };
}

function extractCompetencias(value) {
  const text = cleanText(value);
  if (!text) return [];

  const normalized = text
    .replace(/\s*\/\s*(?=(?:Unidad\s+de\s+Competencia|UC\s*\d+))/gi, "\n")
    .replace(/(?<!^)\s+(?=Unidad\s+de\s+Competencia\s*(?:N[°o.]*)?\s*\d+)/gi, "\n")
    .replace(/(?<!^)\s+(?=UC\s*\d+\b)/gi, "\n");

  return normalized
    .split(/\n+/)
    .map((part) => cleanText(part))
    .filter(Boolean);
}

function formatCompetencias(rawValues) {
  const entries = [];
  const seenBodies = new Set();

  for (const raw of rawValues) {
    for (const part of extractCompetencias(raw)) {
      const { uc, body } = parseCompetenciaPart(part);
      if (!body) continue;
      const key = normalizeText(body);
      if (!key || seenBodies.has(key)) continue;
      seenBodies.add(key);
      entries.push({ uc, body, order: entries.length });
    }
  }

  if (entries.length <= 1) return entries[0]?.body ?? null;

  const sorted = entries
    .slice()
    .sort((a, b) => {
      if (a.uc != null && b.uc != null && a.uc !== b.uc) return a.uc - b.uc;
      if (a.uc != null && b.uc == null) return -1;
      if (a.uc == null && b.uc != null) return 1;
      return a.order - b.order;
    });

  return sorted.map((entry, index) => `UC${index + 1} ${entry.body}`).join("\n\n");
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;

  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = Array.from({ length: b.length + 1 }, () => 0);
  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j += 1) previous[j] = current[j];
  }
  return previous[b.length];
}

function tokenJaccard(a, b) {
  const aTokens = new Set(a.split(" ").filter(Boolean));
  const bTokens = new Set(b.split(" ").filter(Boolean));
  if (!aTokens.size || !bTokens.size) return 0;
  let intersection = 0;
  for (const token of aTokens) {
    if (bTokens.has(token)) intersection += 1;
  }
  const union = new Set([...aTokens, ...bTokens]).size;
  return union ? intersection / union : 0;
}

function similarityScore(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const edit = 1 - levenshtein(a, b) / Math.max(a.length, b.length);
  const tokens = tokenJaccard(a, b);
  const containment = a.includes(b) || b.includes(a) ? Math.min(a.length, b.length) / Math.max(a.length, b.length) : 0;
  return Math.max(0, Math.min(1, edit * 0.48 + tokens * 0.42 + containment * 0.1));
}

function readExcel(options) {
  const parserPath = path.join(ROOT_DIR, "scripts", "parse-academic-excel.py");
  const result = spawnSync(options.python, [parserPath, options.excel], {
    cwd: ROOT_DIR,
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || "Excel parser failed.");

  const parsed = JSON.parse(result.stdout);
  const carry = {};
  parsed.rows = parsed.rows.map((row) => {
    const values = { ...row.values };
    for (const key of ["nombre_modulo", "unidad_competencia"]) {
      if (cleanText(values[key])) carry[key] = values[key];
      else if (carry[key] != null) values[key] = carry[key];
    }
    return {
      ...row,
      values,
      moduleName: cleanText(values.nombre_modulo),
      competencia: cleanText(values.unidad_competencia),
    };
  });
  return parsed;
}

function groupCompetenciasByModule(rows) {
  const grouped = new Map();
  for (const row of rows) {
    const moduleNorm = normalizeText(row.moduleName);
    if (!moduleNorm || !row.competencia) continue;
    const current = grouped.get(moduleNorm) ?? {
      normalized: moduleNorm,
      rawName: row.moduleName,
      values: [],
    };
    current.values.push(row.competencia);
    grouped.set(moduleNorm, current);
  }

  return [...grouped.values()].map((item) => ({
    ...item,
    competencia: formatCompetencias(item.values),
  }));
}

function displayModuleName(modulo) {
  return cleanText(modulo.titulo) || cleanText(modulo.tituloComercial) || `Modulo ${modulo.id}`;
}

function buildMappings(excelModules, modulos) {
  const modulesById = new Map(modulos.map((modulo) => [Number(modulo.id), modulo]));
  const moduleCandidates = modulos.map((modulo) => ({
    modulo,
    names: [
      normalizeText(modulo.titulo),
      normalizeText(modulo.tituloComercial),
      normalizeText(modulo.slug),
    ].filter(Boolean),
  }));

  return excelModules.map((item) => {
    const overrideId = MODULE_OVERRIDES.get(item.normalized);
    if (overrideId) {
      const modulo = modulesById.get(overrideId);
      return {
        ...item,
        status: modulo ? "matched" : "unresolved",
        reason: modulo ? "manual-override" : "override-target-missing",
        matchedModuloId: modulo?.id ?? null,
        matchedModuloTitulo: modulo ? displayModuleName(modulo) : null,
        currentCompetencia: modulo?.competencia ?? null,
        score: modulo ? 1 : 0,
      };
    }

    let best = null;
    for (const candidate of moduleCandidates) {
      const score = Math.max(...candidate.names.map((name) => similarityScore(item.normalized, name)));
      if (!best || score > best.score) best = { modulo: candidate.modulo, score };
    }

    const matched = best && best.score >= MATCH_THRESHOLD;
    return {
      ...item,
      status: matched ? "matched" : "unresolved",
      reason: matched ? "fuzzy" : "low-confidence",
      matchedModuloId: matched ? best.modulo.id : best?.modulo?.id ?? null,
      matchedModuloTitulo: matched ? displayModuleName(best.modulo) : best ? displayModuleName(best.modulo) : null,
      currentCompetencia: matched ? best.modulo.competencia ?? null : null,
      score: best ? Number(best.score.toFixed(4)) : 0,
    };
  });
}

function writeReport(reportPath, report) {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.production) {
    process.env.DATA_CONNECT_EMULATOR_HOST ||= "127.0.0.1:9399";
    process.env.FIREBASE_DATA_CONNECT_EMULATOR_HOST ||= "127.0.0.1:9399";
    process.env.GCLOUD_PROJECT ||= "cetprosmp-2026";
    process.env.GOOGLE_CLOUD_PROJECT ||= "cetprosmp-2026";
  } else {
    process.env.GOOGLE_CLOUD_PROJECT ||= "cetprosmp-2026";
    process.env.GCLOUD_PROJECT ||= "cetprosmp-2026";
  }

  const parsed = readExcel(options);
  const { dataConnect } = await import("../functions/lib/modules/core/dataConnectCore.js");
  const response = await dataConnect.executeGraphql(LIST_MODULOS_QUERY);
  const modulos = response.data?.modulos ?? [];
  const excelModules = groupCompetenciasByModule(parsed.rows);
  const mappings = buildMappings(excelModules, modulos);
  const unresolved = mappings.filter((mapping) => mapping.status !== "matched");
  const updates = mappings
    .filter((mapping) => mapping.status === "matched" && cleanText(mapping.competencia))
    .map((mapping) => ({
      id: Number(mapping.matchedModuloId),
      excelName: mapping.rawName,
      modulo: mapping.matchedModuloTitulo,
      reason: mapping.reason,
      score: mapping.score,
      oldCompetencia: mapping.currentCompetencia,
      newCompetencia: mapping.competencia,
      changed: cleanText(mapping.currentCompetencia) !== cleanText(mapping.competencia),
    }));

  const report = {
    mode: options.apply ? "apply" : "preview",
    target: options.production ? "remote" : "local",
    excel: { path: parsed.path, rowCount: parsed.rows.length, moduleCount: excelModules.length },
    status: unresolved.length ? "blocked-unresolved-modules" : "ready",
    unresolved,
    updates,
    changedCount: updates.filter((item) => item.changed).length,
    unchangedCount: updates.filter((item) => !item.changed).length,
    reportPath: options.report,
  };

  if (!unresolved.length && options.apply) {
    for (const update of updates.filter((item) => item.changed)) {
      await dataConnect.executeGraphql(UPDATE_MODULO_COMPETENCIA_MUTATION, {
        variables: { id: update.id, data: { competencia: update.newCompetencia } },
      });
    }
    report.status = "applied";
  }

  writeReport(options.report, report);
  console.log(`Mode: ${report.mode}`);
  console.log(`Target: ${report.target}`);
  console.log(`Status: ${report.status}`);
  console.log(`Excel modules: ${report.excel.moduleCount}`);
  console.log(`Updates: ${updates.length}, changed: ${report.changedCount}, unchanged: ${report.unchangedCount}`);
  if (unresolved.length) {
    for (const item of unresolved) {
      console.log(`  unresolved: "${item.rawName}" -> "${item.matchedModuloTitulo ?? "none"}" score=${item.score}`);
    }
  }
  console.log(`Report: ${options.report}`);
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
