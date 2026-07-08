import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  INSERT_MODULO_MUTATION,
  INSERT_CAPACIDAD_TERMINAL_MUTATION,
  INSERT_INDICADOR_CAPACIDAD_MUTATION,
  INSERT_UNIDAD_DIDACTICA_MODULO_MUTATION,
  INSERT_UNIDAD_DIDACTICA_MUTATION,
} from "../functions/lib/dataconnectOperations.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const DEFAULT_EXCEL_PATH = String.raw`G:\Mi unidad\_Desarrollo2\Files cetprosmp-strapi\Tablas - datos\Extraccion_Semestre1_v4_limpio.xlsx`;
const DEFAULT_REPORT_PATH = path.join(ROOT_DIR, "tmp", "academic-excel-import-preview.json");
const MODULE_MATCH_THRESHOLD = 0.72;

const IMPORT_STATE_QUERY = `
  query ImportAcademicState {
    modulos(limit: 1000) {
      id
      titulo
      tituloComercial
      slug
      orden
      horas
      creditos
      activo
    }
    unidadesDidacticas(limit: 10000) {
      id
      nombre
      duracion
      creditos
      sigla
    }
    unidadDidacticaModulos(limit: 50000) {
      id
      unidadDidacticaId
      moduloId
      orden
    }
    capacidadesTerminales(limit: 50000) {
      id
      descripcion
      sigla
      unidadDidacticaId
    }
    indicadoresCapacidad(limit: 100000) {
      id
      descripcion
      sigla
      capacidadTerminalId
    }
  }
`;

const MODULES_ONLY_QUERY = `
  query ImportAcademicModulesOnly {
    modulos(limit: 1000) {
      id
      titulo
      tituloComercial
      slug
      orden
      horas
      creditos
      activo
    }
  }
`;

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

const MODULE_CREATIONS = new Map([
  [
    "operatividad de maquinas de confeccione",
    {
      titulo: "Operatividad de Máquinas de Confección",
      tituloComercial: "Operatividad de Máquinas de Confección",
      orden: 3,
      horas: 300,
      creditos: 20,
      activo: true,
      slug: "operatividad-maquinas-confeccion",
      planId: 6,
      descripcion: null,
      metas: null,
    },
  ],
]);

function parseArgs(argv) {
  const options = {
    apply: false,
    excel: DEFAULT_EXCEL_PATH,
    python: "python",
    report: DEFAULT_REPORT_PATH,
    production: false,
    skipUnresolved: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--apply") {
      options.apply = true;
    } else if (arg === "--production") {
      options.production = true;
    } else if (arg === "--skip-unresolved") {
      options.skipUnresolved = true;
    } else if (arg === "--excel") {
      options.excel = argv[++index];
    } else if (arg === "--python") {
      options.python = argv[++index];
    } else if (arg === "--report") {
      options.report = argv[++index];
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function printHelp() {
  console.log(`Usage:
  node scripts/import-academic-excel.mjs [--excel <path>] [--report <path>]
  node scripts/import-academic-excel.mjs --apply [--skip-unresolved]

Defaults:
  excel:  ${DEFAULT_EXCEL_PATH}
  report: ${DEFAULT_REPORT_PATH}

By default this targets the local Data Connect emulator at 127.0.0.1:9399.
Use --production only when you intentionally want to target configured production credentials.`);
}

function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
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

function toInteger(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : null;
}

function countBy(items, keySelector) {
  const result = {};
  for (const item of items) {
    const key = keySelector(item);
    result[key] = (result[key] ?? 0) + 1;
  }
  return result;
}

function compactData(data) {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  );
}

function getIdFromKeyOutput(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const number = Number(value);
    if (Number.isFinite(number)) return number;
    try {
      return getIdFromKeyOutput(JSON.parse(value));
    } catch {
      return null;
    }
  }
  if (value && typeof value === "object" && "id" in value) {
    const number = Number(value.id);
    return Number.isFinite(number) ? number : null;
  }
  return null;
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
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost,
      );
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

function hydrateRows(rows) {
  const carryKeys = [
    "archivo_origen",
    "nombre_carrera_opcion_programa",
    "nombre_modulo",
    "duracion_horas_modulo",
    "fecha_inicio_modulo",
    "fecha_fin_modulo",
    "creditos_modulo",
    "nombre_unidad_didactica",
    "creditos_unidad_didactica",
    "inicio_unidad_didactica",
    "fin_unidad_didactica",
    "duracion_unidad_didactica",
    "nombre_capacidad_terminal",
  ];
  const carry = {};

  return rows.map((row) => {
    const values = { ...row.values };
    for (const key of carryKeys) {
      if (values[key] != null && cleanText(values[key])) {
        carry[key] = values[key];
      } else if (carry[key] != null) {
        values[key] = carry[key];
      }
    }

    return {
      ...row,
      values,
      moduleName: cleanText(values.nombre_modulo),
      unitName: cleanText(values.nombre_unidad_didactica),
      capacityDescription: cleanText(values.nombre_capacidad_terminal),
      indicatorDescription: cleanText(values.criterio_evaluacion_capacidad),
    };
  });
}

function readExcel(options) {
  const parserPath = path.join(ROOT_DIR, "scripts", "parse-academic-excel.py");
  const result = spawnSync(options.python, [parserPath, options.excel], {
    cwd: ROOT_DIR,
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "Excel parser failed.");
  }

  const parsed = JSON.parse(result.stdout);
  parsed.rows = hydrateRows(parsed.rows);
  return parsed;
}

function buildModuleMappings(rows, modulos) {
  const modulesById = new Map(modulos.map((modulo) => [Number(modulo.id), modulo]));
  const moduleCandidates = modulos.map((modulo) => ({
    modulo,
    names: [
      normalizeText(modulo.titulo),
      normalizeText(modulo.tituloComercial),
      normalizeText(modulo.slug),
    ].filter(Boolean),
  }));

  const byName = new Map();
  for (const row of rows) {
    const rawName = row.moduleName;
    const normalized = normalizeText(rawName);
    if (!normalized) continue;
    const current = byName.get(normalized) ?? {
      normalized,
      rawName,
      rows: 0,
      colors: {},
    };
    current.rows += 1;
    current.colors[row.color] = (current.colors[row.color] ?? 0) + 1;
    byName.set(normalized, current);
  }

  const mappings = [];
  for (const item of [...byName.values()].sort((a, b) => a.rawName.localeCompare(b.rawName, "es"))) {
    const moduleCreation = MODULE_CREATIONS.get(item.normalized);
    if (moduleCreation) {
      const existing = findExistingModuleForCreation(moduleCreation, moduleCandidates);
      mappings.push({
        ...item,
        status: existing ? "matched" : "create",
        reason: existing ? "existing-created-module" : "manual-create",
        matchedModuloId: existing?.id ?? null,
        matchedModuloTitulo: existing ? displayModuleName(existing) : moduleCreation.tituloComercial,
        createData: existing ? null : moduleCreation,
        score: existing ? 1 : 0,
      });
      continue;
    }

    const overrideId = MODULE_OVERRIDES.get(item.normalized);
    if (overrideId) {
      const modulo = modulesById.get(overrideId);
      mappings.push({
        ...item,
        status: modulo ? "override" : "unresolved",
        reason: modulo ? "manual-override" : "override-target-missing",
        matchedModuloId: modulo?.id ?? null,
        matchedModuloTitulo: modulo ? displayModuleName(modulo) : null,
        score: modulo ? 1 : 0,
      });
      continue;
    }

    let best = null;
    for (const candidate of moduleCandidates) {
      const score = Math.max(...candidate.names.map((name) => similarityScore(item.normalized, name)));
      if (!best || score > best.score) best = { modulo: candidate.modulo, score };
    }

    if (best && best.score >= MODULE_MATCH_THRESHOLD) {
      mappings.push({
        ...item,
        status: "matched",
        reason: "fuzzy",
        matchedModuloId: best.modulo.id,
        matchedModuloTitulo: displayModuleName(best.modulo),
        score: Number(best.score.toFixed(4)),
      });
    } else {
      mappings.push({
        ...item,
        status: "unresolved",
        reason: "low-confidence",
        matchedModuloId: best?.modulo?.id ?? null,
        matchedModuloTitulo: best ? displayModuleName(best.modulo) : null,
        score: best ? Number(best.score.toFixed(4)) : 0,
      });
    }
  }

  return mappings;
}

function displayModuleName(modulo) {
  return cleanText(modulo.tituloComercial) || cleanText(modulo.titulo) || `Modulo ${modulo.id}`;
}

function findExistingModuleForCreation(moduleCreation, moduleCandidates) {
  const creationNames = [
    normalizeText(moduleCreation.titulo),
    normalizeText(moduleCreation.tituloComercial),
    normalizeText(moduleCreation.slug),
  ].filter(Boolean);

  return moduleCandidates.find((candidate) =>
    candidate.names.some((name) => creationNames.includes(name)),
  )?.modulo ?? null;
}

async function loadState(dataConnect) {
  try {
    const response = await dataConnect.executeGraphql(IMPORT_STATE_QUERY);
    return {
      ok: true,
      data: response.data,
      schemaIssue: null,
    };
  } catch (error) {
    const message = String(error?.message || error);
    let modules = [];
    try {
      const response = await dataConnect.executeGraphql(MODULES_ONLY_QUERY);
      modules = response.data?.modulos ?? [];
    } catch {
      // Keep the original error as the useful one.
    }

    return {
      ok: false,
      data: { modulos: modules },
      schemaIssue: message,
    };
  }
}

function buildExcelOrderMap(rows, mappingByNormalizedModule) {
  const orderMap = new Map();
  const nextByModule = new Map();
  for (const row of rows) {
    const mapping = mappingByNormalizedModule.get(normalizeText(row.moduleName));
    if (!mapping?.matchedModuloId) continue;
    const unitNorm = normalizeText(row.unitName);
    if (!unitNorm) continue;
    const key = `${mapping.matchedModuloId}:${unitNorm}`;
    if (orderMap.has(key)) continue;
    const next = (nextByModule.get(mapping.matchedModuloId) ?? 0) + 1;
    nextByModule.set(mapping.matchedModuloId, next);
    orderMap.set(key, next);
  }
  return orderMap;
}

function createImportContext(state, options, dataConnect) {
  let nextTempId = -1;
  const context = {
    apply: options.apply,
    dataConnect,
    counts: {
      created: { modulos: 0, unidades: 0, relaciones: 0, capacidades: 0, indicadores: 0 },
      reused: { modulos: 0, unidades: 0, relaciones: 0, capacidades: 0, indicadores: 0 },
      skipped: { unresolvedRows: 0, missingCommonRows: 0, emptyRows: 0 },
    },
    actions: [],
    missingCommonUnits: [],
    unitsById: new Map(),
    unitIdsByNorm: new Map(),
    linksByKey: new Map(),
    unitIdByModuleUnitNorm: new Map(),
    unitLinkCount: new Map(),
    commonUnitIdByNorm: new Map(),
    capacityIdByUnitNorm: new Map(),
    indicatorIdByCapacityNorm: new Map(),
    tempId() {
      const id = nextTempId;
      nextTempId -= 1;
      return id;
    },
  };

  for (const unit of state.unidadesDidacticas ?? []) {
    const id = Number(unit.id);
    context.unitsById.set(id, unit);
    addMapSet(context.unitIdsByNorm, normalizeText(unit.nombre), id);
  }

  for (const link of state.unidadDidacticaModulos ?? []) {
    const unitId = Number(link.unidadDidacticaId);
    const moduloId = Number(link.moduloId);
    const unit = context.unitsById.get(unitId);
    const unitNorm = normalizeText(unit?.nombre);
    context.linksByKey.set(`${moduloId}:${unitId}`, link);
    context.unitLinkCount.set(unitId, (context.unitLinkCount.get(unitId) ?? 0) + 1);
    if (unitNorm) context.unitIdByModuleUnitNorm.set(`${moduloId}:${unitNorm}`, unitId);
  }

  for (const [unitId, count] of context.unitLinkCount.entries()) {
    if (count > 1) {
      const unit = context.unitsById.get(unitId);
      const unitNorm = normalizeText(unit?.nombre);
      if (unitNorm && !context.commonUnitIdByNorm.has(unitNorm)) {
        context.commonUnitIdByNorm.set(unitNorm, unitId);
      }
    }
  }

  for (const capacity of state.capacidadesTerminales ?? []) {
    const unitId = Number(capacity.unidadDidacticaId);
    const capacityNorm = normalizeText(capacity.descripcion);
    if (capacityNorm) context.capacityIdByUnitNorm.set(`${unitId}:${capacityNorm}`, Number(capacity.id));
  }

  for (const indicator of state.indicadoresCapacidad ?? []) {
    const capacityId = Number(indicator.capacidadTerminalId);
    const indicatorNorm = normalizeText(indicator.descripcion);
    if (indicatorNorm) context.indicatorIdByCapacityNorm.set(`${capacityId}:${indicatorNorm}`, Number(indicator.id));
  }

  return context;
}

async function ensureCreatedModules(context, mappings) {
  for (const mapping of mappings) {
    if (mapping.status !== "create" || !mapping.createData) continue;
    const data = compactData(mapping.createData);
    const id = context.apply
      ? await insertAndReturnId(context.dataConnect, INSERT_MODULO_MUTATION, "modulo_insert", { data })
      : context.tempId();

    mapping.matchedModuloId = id;
    mapping.matchedModuloTitulo = data.tituloComercial || data.titulo || mapping.rawName;
    mapping.status = context.apply ? "created" : "will-create";
    context.counts.created.modulos += 1;
    context.actions.push({ action: "createModulo", row: null, id, data, excelName: mapping.rawName });
  }
}

function addMapSet(map, key, value) {
  if (!key) return;
  const current = map.get(key) ?? [];
  current.push(value);
  map.set(key, current);
}

async function ensureWhiteUnit(context, row, moduloId) {
  const unitNorm = normalizeText(row.unitName);
  const existingLinkedId = context.unitIdByModuleUnitNorm.get(`${moduloId}:${unitNorm}`);
  if (existingLinkedId) {
    context.counts.reused.unidades += 1;
    return existingLinkedId;
  }

  const unlinkedCandidate = (context.unitIdsByNorm.get(unitNorm) ?? [])
    .find((unitId) => !context.unitLinkCount.get(unitId));
  if (unlinkedCandidate) {
    context.counts.reused.unidades += 1;
    return unlinkedCandidate;
  }

  return createUnit(context, row);
}

async function ensureCommonUnit(context, row, createIfMissing) {
  const unitNorm = normalizeText(row.unitName);
  const commonId = context.commonUnitIdByNorm.get(unitNorm);
  if (commonId) {
    context.counts.reused.unidades += 1;
    return commonId;
  }

  const existingByName = (context.unitIdsByNorm.get(unitNorm) ?? [])[0];
  if (existingByName) {
    context.commonUnitIdByNorm.set(unitNorm, existingByName);
    context.counts.reused.unidades += 1;
    return existingByName;
  }

  if (!createIfMissing) return null;

  const unitId = await createUnit(context, row);
  context.commonUnitIdByNorm.set(unitNorm, unitId);
  return unitId;
}

async function createUnit(context, row) {
  const data = compactData({
    nombre: row.unitName || null,
    duracion: toInteger(row.values.duracion_unidad_didactica),
    creditos: toInteger(row.values.creditos_unidad_didactica),
    sigla: null,
  });

  const id = context.apply
    ? await insertAndReturnId(context.dataConnect, INSERT_UNIDAD_DIDACTICA_MUTATION, "unidadDidactica_insert", { data })
    : context.tempId();

  const unit = { id, ...data };
  context.unitsById.set(id, unit);
  addMapSet(context.unitIdsByNorm, normalizeText(unit.nombre), id);
  context.counts.created.unidades += 1;
  context.actions.push({ action: "createUnidadDidactica", row: row.rowNumber, id, data });
  return id;
}

async function ensureLink(context, row, moduloId, unitId, order) {
  const key = `${moduloId}:${unitId}`;
  if (context.linksByKey.has(key)) {
    context.counts.reused.relaciones += 1;
    return context.linksByKey.get(key).id ?? null;
  }

  const data = { unidadDidacticaId: unitId, moduloId, orden: order ?? null };
  const id = context.apply
    ? await insertAndReturnId(context.dataConnect, INSERT_UNIDAD_DIDACTICA_MODULO_MUTATION, "unidadDidacticaModulo_insert", { data })
    : context.tempId();

  const link = { id, ...data };
  context.linksByKey.set(key, link);
  context.unitLinkCount.set(unitId, (context.unitLinkCount.get(unitId) ?? 0) + 1);
  const unitNorm = normalizeText(context.unitsById.get(unitId)?.nombre);
  if (unitNorm) context.unitIdByModuleUnitNorm.set(`${moduloId}:${unitNorm}`, unitId);
  context.counts.created.relaciones += 1;
  context.actions.push({ action: "createUnidadDidacticaModulo", row: row.rowNumber, id, data });
  return id;
}

async function ensureCapacity(context, row, unitId) {
  const description = row.capacityDescription;
  const capacityNorm = normalizeText(description);
  if (!capacityNorm) return null;
  const key = `${unitId}:${capacityNorm}`;
  const existingId = context.capacityIdByUnitNorm.get(key);
  if (existingId) {
    context.counts.reused.capacidades += 1;
    return existingId;
  }

  const data = { descripcion: description, sigla: null, unidadDidacticaId: unitId };
  const id = context.apply
    ? await insertAndReturnId(context.dataConnect, INSERT_CAPACIDAD_TERMINAL_MUTATION, "capacidadTerminal_insert", { data })
    : context.tempId();

  context.capacityIdByUnitNorm.set(key, id);
  context.counts.created.capacidades += 1;
  context.actions.push({ action: "createCapacidadTerminal", row: row.rowNumber, id, data });
  return id;
}

async function ensureIndicator(context, row, capacityId) {
  if (!capacityId) return null;
  const description = row.indicatorDescription;
  const indicatorNorm = normalizeText(description);
  if (!indicatorNorm) return null;
  const key = `${capacityId}:${indicatorNorm}`;
  const existingId = context.indicatorIdByCapacityNorm.get(key);
  if (existingId) {
    context.counts.reused.indicadores += 1;
    return existingId;
  }

  const data = { descripcion: description, sigla: null, capacidadTerminalId: capacityId };
  const id = context.apply
    ? await insertAndReturnId(context.dataConnect, INSERT_INDICADOR_CAPACIDAD_MUTATION, "indicadorCapacidad_insert", { data })
    : context.tempId();

  context.indicatorIdByCapacityNorm.set(key, id);
  context.counts.created.indicadores += 1;
  context.actions.push({ action: "createIndicadorCapacidad", row: row.rowNumber, id, data });
  return id;
}

async function insertAndReturnId(dataConnect, mutation, responseField, variables) {
  const response = await dataConnect.executeGraphql(mutation, { variables });
  const id = getIdFromKeyOutput(response.data?.[responseField]);
  if (!id) throw new Error(`Insert did not return an id for ${responseField}.`);
  return id;
}

async function processCatalogRow(context, row, mapping, orderMap, common) {
  const moduloId = Number(mapping.matchedModuloId);
  const unitNorm = normalizeText(row.unitName);
  if (!unitNorm) {
    context.counts.skipped.emptyRows += 1;
    return;
  }

  const unitId = common
    ? await ensureCommonUnit(context, row, true)
    : await ensureWhiteUnit(context, row, moduloId);
  const order = orderMap.get(`${moduloId}:${unitNorm}`) ?? null;
  await ensureLink(context, row, moduloId, unitId, order);
  const capacityId = await ensureCapacity(context, row, unitId);
  await ensureIndicator(context, row, capacityId);
}

async function processYellowRow(context, row, mapping, orderMap) {
  const moduloId = Number(mapping.matchedModuloId);
  const unitNorm = normalizeText(row.unitName);
  if (!unitNorm) {
    context.counts.skipped.emptyRows += 1;
    return;
  }

  const unitId = await ensureCommonUnit(context, row, false);
  if (!unitId) {
    context.counts.skipped.missingCommonRows += 1;
    context.missingCommonUnits.push({
      row: row.rowNumber,
      moduloId,
      moduloExcel: row.moduleName,
      unidad: row.unitName,
    });
    return;
  }

  const order = orderMap.get(`${moduloId}:${unitNorm}`) ?? null;
  await ensureLink(context, row, moduloId, unitId, order);
}

async function buildPlan(parsed, state, mappings, options, dataConnect) {
  const mappingByNormalizedModule = new Map(mappings.map((mapping) => [mapping.normalized, mapping]));
  const context = createImportContext(state, options, dataConnect);
  await ensureCreatedModules(context, mappings);
  const orderMap = buildExcelOrderMap(parsed.rows, mappingByNormalizedModule);

  const rowsByPhase = {
    white: parsed.rows.filter((row) => row.color === "white"),
    blue: parsed.rows.filter((row) => row.color === "blue"),
    yellow: parsed.rows.filter((row) => row.color === "yellow"),
  };

  for (const row of rowsByPhase.white) {
    const mapping = mappingByNormalizedModule.get(normalizeText(row.moduleName));
    if (!mapping?.matchedModuloId) {
      context.counts.skipped.unresolvedRows += 1;
      continue;
    }
    await processCatalogRow(context, row, mapping, orderMap, false);
  }

  for (const row of rowsByPhase.blue) {
    const mapping = mappingByNormalizedModule.get(normalizeText(row.moduleName));
    if (!mapping?.matchedModuloId) {
      context.counts.skipped.unresolvedRows += 1;
      continue;
    }
    await processCatalogRow(context, row, mapping, orderMap, true);
  }

  for (const row of rowsByPhase.yellow) {
    const mapping = mappingByNormalizedModule.get(normalizeText(row.moduleName));
    if (!mapping?.matchedModuloId) {
      context.counts.skipped.unresolvedRows += 1;
      continue;
    }
    await processYellowRow(context, row, mapping, orderMap);
  }

  return {
    counts: context.counts,
    actions: context.actions,
    missingCommonUnits: context.missingCommonUnits,
  };
}

function writeReport(reportPath, report) {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

function printSummary(report) {
  console.log(`Mode: ${report.mode}`);
  console.log(`Status: ${report.status}`);
  console.log(`Excel rows: ${report.excel.rowCount} (${Object.entries(report.excel.colorCounts).map(([key, value]) => `${key}:${value}`).join(", ")})`);
  console.log(`Modules: ${report.modules.matchedCount} matched, ${report.modules.unresolvedCount} unresolved`);
  if (report.modules.toCreateCount) {
    for (const item of report.modules.toCreate) {
      console.log(`  will create: "${item.rawName}" -> "${item.matchedModuloTitulo}"`);
    }
  }
  for (const item of report.modules.unresolved.slice(0, 10)) {
    console.log(`  unresolved: "${item.rawName}" -> suggested "${item.matchedModuloTitulo ?? "none"}" score=${item.score}`);
  }
  if (report.schemaIssue) {
    console.log("Schema issue:");
    console.log(`  ${report.schemaIssue}`);
  }
  if (report.plan) {
    console.log(`Creates: ${JSON.stringify(report.plan.counts.created)}`);
    console.log(`Reuses:  ${JSON.stringify(report.plan.counts.reused)}`);
    console.log(`Skipped: ${JSON.stringify(report.plan.counts.skipped)}`);
  }
  console.log(`Report: ${report.reportPath}`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.production) {
    process.env.DATA_CONNECT_EMULATOR_HOST ||= "127.0.0.1:9399";
    process.env.FIREBASE_DATA_CONNECT_EMULATOR_HOST ||= "127.0.0.1:9399";
    process.env.GCLOUD_PROJECT ||= "cetprosmp-2026";
    process.env.GOOGLE_CLOUD_PROJECT ||= "cetprosmp-2026";
  }

  const parsed = readExcel(options);
  const { dataConnect } = await import("../functions/lib/modules/core/dataConnectCore.js");
  const stateResult = await loadState(dataConnect);
  const mappings = buildModuleMappings(parsed.rows, stateResult.data.modulos ?? []);
  const unresolved = mappings.filter((mapping) => mapping.status === "unresolved");
  const toCreate = mappings.filter((mapping) => mapping.status === "create");

  const report = {
    mode: options.apply ? "apply" : "preview",
    status: "ready",
    excel: {
      path: parsed.path,
      sheet: parsed.sheet,
      rowCount: parsed.rows.length,
      colorCounts: parsed.colorCounts,
      rowsByColor: countBy(parsed.rows, (row) => row.color),
    },
    modules: {
      totalExcelNames: mappings.length,
      matchedCount: mappings.length - unresolved.length,
      unresolvedCount: unresolved.length,
      toCreateCount: toCreate.length,
      mappings,
      unresolved,
      toCreate,
    },
    schemaIssue: stateResult.schemaIssue,
    plan: null,
    reportPath: options.report,
  };

  if (!stateResult.ok) {
    report.status = "blocked-schema";
    writeReport(options.report, report);
    printSummary(report);
    process.exitCode = 2;
    return;
  }

  if (unresolved.length && options.apply && !options.skipUnresolved) {
    report.status = "blocked-unresolved-modules";
    writeReport(options.report, report);
    printSummary(report);
    process.exitCode = 3;
    return;
  }

  report.plan = await buildPlan(parsed, stateResult.data, mappings, options, dataConnect);
  if (unresolved.length) report.status = "ready-with-unresolved-modules";
  if (report.plan.missingCommonUnits.length) report.status = "ready-with-missing-common-units";

  writeReport(options.report, report);
  printSummary(report);
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
