import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const cliRoot = process.argv[process.argv.indexOf('--cli-root') + 1];
if (!process.argv.includes('--cli-root') || !cliRoot) throw new Error('Indica --cli-root con la instalación de firebase-tools.');
const require = createRequire(path.join(cliRoot, 'package.json'));
const { Connector, AuthTypes, IpAddressTypes } = require('@google-cloud/cloud-sql-connector');
const { Pool } = require('pg');
const connector = new Connector();
let pool;
try {
  const options = await connector.getOptions({ instanceConnectionName: 'cetprosmp-2026:us-central1:cetprosmp-2026-instance', authType: AuthTypes.IAM, ipType: IpAddressTypes.PUBLIC });
  pool = new Pool({ ...options, user: 'enkee03@cetprosmp.edu.pe', database: 'cetprosmp-db', max: 1 });
  pool.on('error', error => { if (error.code !== 'ERRCLOSED') console.error(error.message); });
  const roleNames = ['firebaseowner_cetprosmp-db_public', 'firebasereader_cetprosmp-db_public', 'firebasewriter_cetprosmp-db_public'];
  const roles = await pool.query('SELECT rolname FROM pg_roles WHERE rolname = ANY($1::text[])', [roleNames]);
  assert.equal(roles.rows.length, roleNames.length, 'Faltan los roles de Data Connect requeridos para la tabla nueva.');
  const before = (await pool.query('SELECT count(*)::int AS eventos FROM public.eventos')).rows[0];
  if (process.argv.includes('--apply')) {
    const sql = fs.readFileSync(new URL('../dataconnect/migrations/20261005_add_programaciones_horarias.sql', import.meta.url), 'utf8');
    await pool.query(sql);
  }
  const columns = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='eventos' AND column_name IN ('minutos_hora_academica','computa_horas','programacion_horaria_id')");
  const table = await pool.query("SELECT to_regclass('public.programaciones_horarias')::text AS tabla");
  const after = (await pool.query('SELECT count(*)::int AS eventos FROM public.eventos')).rows[0];
  console.log(JSON.stringify({ aplicada: process.argv.includes('--apply'), tabla: table.rows[0].tabla, campos: columns.rows.map(row => row.column_name), eventosAntes: before.eventos, eventosDespues: after.eventos }));
} finally { await pool?.end(); connector.close(); }
