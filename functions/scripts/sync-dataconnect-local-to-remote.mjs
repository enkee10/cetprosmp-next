#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const PROJECT_ID = "cetprosmp-2026";
const MODE = process.argv.find((arg) => arg.startsWith("--mode="))?.split("=")[1] ?? "backup-remote";
const OUT_DIR = process.argv.find((arg) => arg.startsWith("--out-dir="))?.split("=")[1] ?? "backups/prod-latest";
const APPLY = process.argv.includes("--apply");

process.env.GCLOUD_PROJECT ||= PROJECT_ID;
process.env.GOOGLE_CLOUD_PROJECT ||= PROJECT_ID;

function useLocal() {
  process.env.DATA_CONNECT_EMULATOR_HOST ||= "127.0.0.1:9399";
  process.env.FIREBASE_DATA_CONNECT_EMULATOR_HOST ||= "127.0.0.1:9399";
}

function useRemote() {
  delete process.env.DATA_CONNECT_EMULATOR_HOST;
  delete process.env.FIREBASE_DATA_CONNECT_EMULATOR_HOST;
}

function getDataConnect() {
  const { dataConnect } = require("../lib/modules/core/dataConnectCore.js");
  return dataConnect;
}

function gqlString(value) {
  return JSON.stringify(String(value));
}

function quoteIdent(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function qTable(table) {
  return `public.${quoteIdent(table)}`;
}

function sqlLiteral(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "NULL";
    return String(value);
  }
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "object") {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function nativeSelect(dc, sql) {
  const query = `query { rows: _select(sql: ${gqlString(sql)}) }`;
  const response = await dc.executeGraphql(query);
  return response.data.rows ?? [];
}

async function nativeExecute(dc, sql) {
  const mutation = `mutation { affected: _execute(sql: ${gqlString(sql)}) }`;
  const response = await dc.executeGraphql(mutation);
  return response.data.affected ?? 0;
}

async function getTables(dc) {
  const rows = await nativeSelect(dc, `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  return rows.map((row) => row.table_name);
}

async function getColumns(dc) {
  const rows = await nativeSelect(dc, `
    SELECT
      table_name,
      column_name,
      ordinal_position,
      column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position
  `);
  const byTable = new Map();
  for (const row of rows) {
    const current = byTable.get(row.table_name) ?? [];
    current.push({
      name: row.column_name,
      ordinal: row.ordinal_position,
      default: row.column_default,
    });
    byTable.set(row.table_name, current);
  }
  return byTable;
}

async function getForeignKeys(dc) {
  return nativeSelect(dc, `
    SELECT
      tc.table_name AS child_table,
      ccu.table_name AS parent_table
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
  `);
}

function sortTables(tables, foreignKeys) {
  const tableSet = new Set(tables);
  const parentsByChild = new Map(tables.map((table) => [table, new Set()]));
  const childrenByParent = new Map(tables.map((table) => [table, new Set()]));

  for (const fk of foreignKeys) {
    const child = fk.child_table;
    const parent = fk.parent_table;
    if (!tableSet.has(child) || !tableSet.has(parent) || child === parent) continue;
    parentsByChild.get(child)?.add(parent);
    childrenByParent.get(parent)?.add(child);
  }

  const ready = tables.filter((table) => (parentsByChild.get(table)?.size ?? 0) === 0).sort();
  const ordered = [];

  while (ready.length > 0) {
    const table = ready.shift();
    ordered.push(table);
    for (const child of childrenByParent.get(table) ?? []) {
      const parents = parentsByChild.get(child);
      parents?.delete(table);
      if (parents?.size === 0) {
        ready.push(child);
        ready.sort();
      }
    }
  }

  const remaining = tables.filter((table) => !ordered.includes(table)).sort();
  return [...ordered, ...remaining];
}

async function getTableRows(dc, table, columns) {
  const orderColumn = columns.some((column) => column.name === "id") ? "id" : columns[0]?.name;
  const orderSql = orderColumn ? ` ORDER BY ${quoteIdent(orderColumn)}` : "";
  const rows = await nativeSelect(dc, `
    SELECT row_to_json(t) AS row
    FROM (SELECT * FROM ${qTable(table)}${orderSql}) t
  `);
  return rows.map((item) => item.row ?? item);
}

async function exportSnapshot(source) {
  if (source === "local") useLocal();
  else useRemote();

  const dc = getDataConnect();
  const tables = await getTables(dc);
  const columns = await getColumns(dc);
  const foreignKeys = await getForeignKeys(dc);
  const orderedTables = sortTables(tables, foreignKeys);
  const snapshot = {
    source,
    exportedAt: new Date().toISOString(),
    tables: {},
    order: orderedTables,
  };

  for (const table of orderedTables) {
    const tableColumns = columns.get(table) ?? [];
    const rows = await getTableRows(dc, table, tableColumns);
    snapshot.tables[table] = {
      columns: tableColumns,
      rows,
    };
    console.log(`${source}: ${table} -> ${rows.length}`);
  }

  return snapshot;
}

function buildInsertStatements(table, columns, rows) {
  if (rows.length === 0) return [];
  const columnNames = columns.map((column) => column.name);
  const prefix = `INSERT INTO ${qTable(table)} (${columnNames.map(quoteIdent).join(", ")}) VALUES`;
  const statements = [];
  let batch = [];
  let size = prefix.length;

  const flush = () => {
    if (batch.length === 0) return;
    statements.push(`${prefix}\n${batch.join(",\n")};`);
    batch = [];
    size = prefix.length;
  };

  for (const row of rows) {
    const values = columnNames.map((column) => sqlLiteral(row[column])).join(", ");
    const tuple = `(${values})`;
    if (batch.length > 0 && size + tuple.length > 500_000) flush();
    batch.push(tuple);
    size += tuple.length + 2;
  }
  flush();
  return statements;
}

function buildSequenceStatements(snapshot) {
  const statements = [];
  for (const [table, payload] of Object.entries(snapshot.tables)) {
    for (const column of payload.columns) {
      if (!String(column.default ?? "").includes("nextval(")) continue;
      statements.push(
        `SELECT setval(pg_get_serial_sequence('${qTable(table).replace(/'/g, "''")}', '${column.name.replace(/'/g, "''")}'), COALESCE((SELECT MAX(${quoteIdent(column.name)}) FROM ${qTable(table)}), 1), (SELECT COUNT(*) > 0 FROM ${qTable(table)}));`,
      );
    }
  }
  return statements;
}

function writeSnapshot(snapshot, filename) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, JSON.stringify(snapshot, null, 2), "utf8");
}

async function applySnapshotToRemote(snapshot) {
  useRemote();
  const dc = getDataConnect();
  const order = snapshot.order;
  const reverse = [...order].reverse();

  console.log("Borrando datos remotos...");
  for (const table of reverse) {
    await nativeExecute(dc, `DELETE FROM ${qTable(table)};`);
    console.log(`delete ${table}`);
  }

  console.log("Insertando datos locales en remoto...");
  for (const table of order) {
    const payload = snapshot.tables[table];
    const statements = buildInsertStatements(table, payload.columns, payload.rows);
    for (const statement of statements) {
      await nativeExecute(dc, statement);
    }
    console.log(`insert ${table}: ${payload.rows.length}`);
  }

  console.log("Ajustando secuencias remotas...");
  await resetRemoteSequences(dc, snapshot);
}

async function resetRemoteSequences(dc, snapshot) {
  for (const statement of buildSequenceStatements(snapshot)) {
    await nativeSelect(dc, statement);
  }
}

async function main() {
  if (MODE === "backup-remote") {
    const snapshot = await exportSnapshot("remote");
    const filename = path.join(OUT_DIR, "dataconnect-remote-backup.json");
    writeSnapshot(snapshot, filename);
    console.log(`Backup remoto escrito en ${filename}`);
    return;
  }

  if (MODE === "export-local") {
    const snapshot = await exportSnapshot("local");
    const filename = path.join(OUT_DIR, "dataconnect-local-snapshot.json");
    writeSnapshot(snapshot, filename);
    console.log(`Snapshot local escrito en ${filename}`);
    return;
  }

  if (MODE === "apply-local-to-remote") {
    const filename = path.join(OUT_DIR, "dataconnect-local-snapshot.json");
    if (!fs.existsSync(filename)) {
      throw new Error(`No existe ${filename}. Ejecuta primero --mode=export-local.`);
    }
    if (!APPLY) {
      console.log("Modo vista previa. Agrega --apply para reemplazar remoto con el snapshot local.");
      return;
    }
    const snapshot = JSON.parse(fs.readFileSync(filename, "utf8"));
    await applySnapshotToRemote(snapshot);
    console.log("Data Connect remoto reemplazado con snapshot local.");
    return;
  }

  if (MODE === "reset-remote-sequences") {
    const filename = path.join(OUT_DIR, "dataconnect-local-snapshot.json");
    if (!fs.existsSync(filename)) {
      throw new Error(`No existe ${filename}. Ejecuta primero --mode=export-local.`);
    }
    const snapshot = JSON.parse(fs.readFileSync(filename, "utf8"));
    useRemote();
    await resetRemoteSequences(getDataConnect(), snapshot);
    console.log("Secuencias remotas ajustadas.");
    return;
  }

  throw new Error(`Modo no soportado: ${MODE}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
