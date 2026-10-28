import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { migrationTables, snapshotUnits, planIndependentUnits, migrateIndependentUnits } from './independent-units-migration.mjs';

// Only remote snapshots are read. This runner never imports an emulator export or local data.
for (const key of ['DATA_CONNECT_EMULATOR_HOST', 'FIREBASE_DATA_CONNECT_EMULATOR_HOST']) {
  assert(!process.env[key], `Quite ${key} antes de usar el ejecutor remoto.`);
}
const require = createRequire(new URL('../tmp/cloudsql-tools/package.json', import.meta.url));
const { Connector, AuthTypes, IpAddressTypes } = require('@google-cloud/cloud-sql-connector');
const { Pool } = require('pg');
const project = 'cetprosmp-2026';
const instance = 'cetprosmp-2026-instance';
const directory = path.resolve('backups/independent-units-remote-20261027');
const mode = process.argv.includes('--apply-data') ? 'apply-data' : process.argv.includes('--finalize') ? 'finalize' : 'audit';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const write = (name, value) => {
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, name), JSON.stringify(value, null, 2), { flag: 'wx' });
};
const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const connector = new Connector();
let pool, client;
try {
  const options = await connector.getOptions({ instanceConnectionName: `${project}:us-central1:${instance}`, authType: AuthTypes.IAM, ipType: IpAddressTypes.PUBLIC });
  pool = new Pool({ ...options, user: 'enkee03@cetprosmp.edu.pe', database: 'cetprosmp-db', max: 1, connectionTimeoutMillis: 30000 });
  pool.on('error', error => { if (error.code !== 'ERRCLOSED') console.error(error.message); });
  client = await pool.connect();
  const identity = (await client.query('SELECT current_database() database, current_user')).rows[0];
  assert.equal(identity.database, 'cetprosmp-db');
  await client.query(mode === 'audit' ? 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY' : 'BEGIN');
  await client.query("SET LOCAL lock_timeout='10s'");
  await client.query("SET LOCAL statement_timeout='180s'");
  if (mode !== 'audit') {
    const backup = JSON.parse(fs.readFileSync(path.join(directory, 'managed-backup.json'), 'utf8'));
    assert.equal(backup.status, 'SUCCESSFUL');
    assert.equal(backup.instance, instance);
    assert.equal(backup.description, 'Antes de unidades didacticas independientes 2026-10-27');
    await client.query(`LOCK TABLE ${migrationTables.map(table => `public."${table}"`).join(',')} IN SHARE ROW EXCLUSIVE MODE`);
  }
  const before = await snapshotUnits(client);
  const schema = (await client.query(`SELECT table_name,column_name,data_type,is_nullable,column_default
    FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position`)).rows;
  const constraints = (await client.query(`SELECT conrelid::regclass::text table_name,conname,pg_get_constraintdef(oid) definition
    FROM pg_constraint WHERE connamespace='public'::regnamespace ORDER BY conrelid::regclass::text,conname`)).rows;
  const counts = Object.fromEntries(Object.entries(before).map(([table, rows]) => [table, rows.length]));
  const plan = planIndependentUnits(before);
  const backupName = `${mode}-before-${stamp}.json`;
  write(backupName, { source: 'remote', project, instance, recordedAt: new Date().toISOString(), identity, counts, schema, constraints, fingerprint: hash(before), data: before });
  console.log(JSON.stringify({ source: 'remote', project, mode, backup: path.join(directory, backupName), counts, units: plan }, null, 2));
  if (mode === 'apply-data') {
    const report = await migrateIndependentUnits(client, before, { dropLegacyColumn: false, batchUpdates: true });
    write(`apply-data-verified-${stamp}.json`, report);
    await client.query('COMMIT');
    write('data-migration-committed.json', { project, instance, committedAt: new Date().toISOString(), report: `apply-data-verified-${stamp}.json`, backup: backupName });
    console.log(JSON.stringify({ committed: true, legacyColumnRemoved: false, copies: report.copies, changedRows: report.changedRows, historicalUnits: report.historicalUnits, countsAfter: report.countsAfter }, null, 2));
  } else if (mode === 'finalize') {
    assert(fs.existsSync(path.join(directory, 'application-deployed.json')), 'Verifique el despliegue de la aplicacion antes de retirar la columna.');
    assert(fs.existsSync(path.join(directory, 'schema-deployed.json')), 'Verifique el despliegue del esquema antes de retirar la columna.');
    assert(plan.every(unit => unit.moduleIds.length <= 1), 'Aun existen unidades compartidas.');
    await client.query(fs.readFileSync(new URL('../dataconnect/migrations/20261026_make_units_independent.sql', import.meta.url), 'utf8'));
    const after = await snapshotUnits(client);
    for (const table of migrationTables) {
      const expected = table === 'unidades_didacticas' ? before[table].map(({ comun, ...row }) => row) : before[table];
      assert.deepEqual(after[table], expected, `La finalizacion cambio datos de ${table}`);
    }
    await client.query('COMMIT');
    write('migration-finalized.json', { project, instance, verifiedAt: new Date().toISOString(), fingerprint: hash(after), counts: Object.fromEntries(Object.entries(after).map(([table, rows]) => [table, rows.length])) });
    console.log(JSON.stringify({ finalized: true, legacyColumnRemoved: true, allRowsPreserved: true }));
  } else {
    await client.query('ROLLBACK');
    console.log(JSON.stringify({ audited: true, writes: 0, plannedCopies: plan.reduce((sum, unit) => sum + Math.max(0, unit.moduleIds.length - 1), 0) }));
  }
} catch (error) {
  if (client) await client.query('ROLLBACK').catch(() => {});
  throw error;
} finally { client?.release(); await pool?.end(); connector.close(); }
