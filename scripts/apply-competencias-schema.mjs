import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const cliRoot = process.argv[process.argv.indexOf('--cli-root') + 1];
if (!process.argv.includes('--cli-root') || !cliRoot) throw new Error('Indique --cli-root con el directorio instalado de firebase-tools.');
const require = createRequire(path.join(cliRoot, 'package.json'));
const { Connector, AuthTypes, IpAddressTypes } = require('@google-cloud/cloud-sql-connector');
const { Pool } = require('pg');
const connector = new Connector();
let pool;
try {
  const options = await connector.getOptions({ instanceConnectionName: 'cetprosmp-2026:us-central1:cetprosmp-2026-instance', authType: AuthTypes.IAM, ipType: IpAddressTypes.PUBLIC });
  pool = new Pool({ ...options, user: 'enkee03@cetprosmp.edu.pe', database: 'cetprosmp-db', max: 1 });
  pool.on('error', error => { if (error.code !== 'ERRCLOSED') console.error(error.message); });
  if (process.argv.includes('--inspect')) {
    const state = await pool.query("SELECT schemaname, tablename, tableowner FROM pg_tables WHERE tablename IN ('competencias','competencia_capacidades')");
    const roles = await pool.query("SELECT rolname FROM pg_roles WHERE rolname LIKE 'firebase%'");
    const columns = await pool.query("SELECT table_name, column_name, column_default, is_nullable FROM information_schema.columns WHERE table_name IN ('competencias','competencia_capacidades')");
    const counts = await pool.query("SELECT (SELECT count(*) FROM competencias) AS competencias, (SELECT count(*) FROM competencia_capacidades) AS relaciones");
    console.log(JSON.stringify({ tables: state.rows, roles: roles.rows, columns: columns.rows, counts: counts.rows }));
  } else {
    const migration = process.argv.includes('--units') ? '20261005_create_competencia_unidades.sql'
      : process.argv.includes('--remove-units-legacy') ? '20261005_remove_legacy_academic_relations.sql'
      : process.argv.includes('--remove-legacy') ? '20261005_remove_modulo_competencia_columns.sql' : '20261005_create_competencias.sql';
    if (process.argv.includes('--remove-units-legacy')) {
      const report = JSON.parse(fs.readFileSync(new URL('../tmp/competencia-unidades-report-20261005.json', import.meta.url), 'utf8'));
      if (!report.applied || !report.verifiedAt) throw new Error('Primero debe verificar la migracion de unidades y las notas.');
    }
    if (process.argv.includes('--remove-legacy')) {
      const report = JSON.parse(fs.readFileSync(new URL('../tmp/competencias-migration-report-20261005.json', import.meta.url), 'utf8'));
      if (!report.applied || !report.verifiedAt) throw new Error('Primero debe migrar y verificar los datos.');
    }
    const sql = fs.readFileSync(new URL('../dataconnect/migrations/' + migration, import.meta.url), 'utf8');
    await pool.query(sql);
    console.log(`Aplicada migracion: ${migration}`);
  }
} finally {
  await pool?.end(); connector.close();
}
