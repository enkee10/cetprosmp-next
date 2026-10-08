import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const cliRoot = process.argv.includes('--cli-root') ? process.argv[process.argv.indexOf('--cli-root') + 1] : null;
if (!cliRoot) throw new Error('Indica --cli-root con la instalacion de firebase-tools.');
const require = createRequire(path.join(cliRoot, 'package.json'));
const { Connector, AuthTypes, IpAddressTypes } = require('@google-cloud/cloud-sql-connector');
const { Pool } = require('pg');
const connector = new Connector();
let pool;
try {
  const options = await connector.getOptions({ instanceConnectionName: 'cetprosmp-2026:us-central1:cetprosmp-2026-instance', authType: AuthTypes.IAM, ipType: IpAddressTypes.PUBLIC });
  pool = new Pool({ ...options, user: 'enkee03@cetprosmp.edu.pe', database: 'cetprosmp-db', max: 1 });
  pool.on('error', error => { if (error.code !== 'ERRCLOSED') console.error(error.message); });
  const preserved = `SELECT
    (SELECT count(*)::int FROM public.unidades_didacticas) AS unidades,
    (SELECT count(*)::int FROM public.capacidades_terminales) AS capacidades,
    (SELECT count(*)::int FROM public.indicadores_capacidad) AS indicadores,
    (SELECT count(*)::int FROM public.actividades) AS actividades`;
  const before = (await pool.query(preserved)).rows[0];
  if (process.argv.includes('--apply')) await pool.query(fs.readFileSync(new URL('../dataconnect/migrations/20261007_add_silabus_sessions.sql', import.meta.url), 'utf8'));
  const after = (await pool.query(preserved)).rows[0];
  assert.deepEqual(after, before, 'La migracion debe conservar los registros existentes.');
  const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name = ANY($1::text[]) ORDER BY table_name", [['actividad_contenidos', 'actividad_materiales', 'grupo_modulo_actividades']]);
  assert.equal(tables.rows.length, 3);
  console.log(JSON.stringify({ aplicada: process.argv.includes('--apply'), tablas: tables.rows.map(v => v.table_name), before, after }));
} finally { await pool?.end(); connector.close(); }
