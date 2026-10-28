import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { migrationTables, snapshotUnits, planIndependentUnits, migrateIndependentUnits } from './independent-units-migration.mjs';

// Deliberately local-only. Production needs its own reviewed connection and approval.
const require = createRequire(new URL('../tmp/cloudsql-tools/package.json', import.meta.url));
const { Client } = require('pg');
const apply = process.argv.includes('--apply');
const rehearse = process.argv.includes('--rehearse');
const directory = path.resolve('backups', 'independent-units-local', new Date().toISOString().replace(/[:.]/g, '-'));
const client = new Client({ host: '127.0.0.1', port: 5432, user: 'postgres', database: 'cetprosmp-db', connectionTimeoutMillis: 5000 });
await client.connect();
try {
  await client.query('BEGIN');
  await client.query("SET LOCAL lock_timeout='5s'");
  await client.query("SET LOCAL statement_timeout='180s'");
  if (apply || rehearse) await client.query(`LOCK TABLE ${migrationTables.map(table => `public."${table}"`).join(',')} IN SHARE ROW EXCLUSIVE MODE`);
  const before = await snapshotUnits(client);
  const plan = planIndependentUnits(before);
  console.log(JSON.stringify({ environment: 'local', apply, units: plan }, null, 2));
  if (apply || rehearse) {
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, 'before.json'), JSON.stringify(before));
    const report = await migrateIndependentUnits(client, before);
    await client.query(apply ? 'COMMIT' : 'ROLLBACK');
    report.committed = apply;
    fs.writeFileSync(path.join(directory, 'report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ verified: true, committed: apply, backup: directory, copies: report.copies, changedRows: report.changedRows, historicalUnits: report.historicalUnits, countsBefore: report.countsBefore, countsAfter: report.countsAfter }, null, 2));
  } else await client.query('ROLLBACK');
} catch (error) {
  await client.query('ROLLBACK').catch(() => {});
  throw error;
} finally { await client.end(); }
