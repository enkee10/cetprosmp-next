import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// Cloud SQL DDL migration: audit by default; --apply backs up and verifies
// the affected records in the same transaction before committing.
const require = createRequire(new URL('../tmp/cloudsql-tools/package.json', import.meta.url));
const { Connector, AuthTypes, IpAddressTypes } = require('@google-cloud/cloud-sql-connector');
const { Pool } = require('pg');
const connector = new Connector();
const backupDir = new URL('../backups/fusion-paquetes-grupos-remoto-20261014/', import.meta.url);
const apply = process.argv.includes('--apply');
const tables = ['grupos', 'grupo_modulos', 'matriculas', 'modulos_estudiantes', 'role_permissions'];
const retired = ['paquetes', 'paquete_modulos', 'paquete_grupos', 'matricula_paquetes'];
let pool;

const snapshot = async client => {
  const result = {};
  for (const table of [...tables, ...retired]) {
    const exists = (await client.query('SELECT to_regclass($1) IS NOT NULL AS present', [`public.${table}`])).rows[0].present;
    if (exists) result[table] = (await client.query(`SELECT to_jsonb(t) AS row FROM public.${table} t ORDER BY id`)).rows.map(item => item.row);
  }
  return result;
};

try {
  const options = await connector.getOptions({
    instanceConnectionName: 'cetprosmp-2026:us-central1:cetprosmp-2026-instance',
    authType: AuthTypes.IAM,
    ipType: IpAddressTypes.PUBLIC,
  });
  pool = new Pool({ ...options, user: 'enkee03@cetprosmp.edu.pe', database: 'cetprosmp-db', max: 1 });
  pool.on('error', error => { if (error.code !== 'ERRCLOSED') console.error(error.message); });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (apply) await client.query('LOCK TABLE public.grupos, public.grupo_modulos, public.matriculas, public.modulos_estudiantes, public.role_permissions IN SHARE ROW EXCLUSIVE MODE');
    const before = await snapshot(client);
    const groups = new Map(before.grupos.map(row => [row.id, row]));
    const groupModules = new Map(before.grupo_modulos.map(row => [row.id, row]));
    const enrollmentGroups = new Map();
    for (const row of before.modulos_estudiantes) {
      const gm = groupModules.get(row.grupo_modulo_id);
      if (gm) {
        assert.ok(row.grupo_id == null || row.grupo_id === gm.grupo_id, 'Conflicting student module group');
        assert.equal(row.modulo_id, gm.modulo_id, 'Conflicting student module');
      }
      const values = enrollmentGroups.get(row.matricula_id) ?? new Set();
      const groupId = gm?.grupo_id ?? row.grupo_id;
      if (groupId != null) values.add(groupId);
      enrollmentGroups.set(row.matricula_id, values);
    }
    const expectedEnrollments = before.matriculas.map(row => {
      const values = enrollmentGroups.get(row.id);
      assert.equal(values?.size, 1, `Enrollment ${row.id} must have exactly one group`);
      const groupId = [...values][0];
      assert.ok(row.grupo_id == null || row.grupo_id === groupId, `Enrollment ${row.id} group conflict`);
      assert.ok(groups.has(groupId), `Enrollment ${row.id} missing group`);
      assert.equal(row.semestre_id, groups.get(groupId).semestre_id, `Enrollment ${row.id} semester conflict`);
      const { paquete_id, ...preserved } = row;
      return { ...preserved, grupo_id: groupId };
    });
    const counts = Object.fromEntries(Object.entries(before).map(([table, rows]) => [table, rows.length]));
    fs.mkdirSync(backupDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = new URL(`${apply ? 'before-apply' : 'audit'}-${stamp}.json`, backupDir);
    fs.writeFileSync(backupFile, JSON.stringify({ recordedAt: new Date().toISOString(), project: 'cetprosmp-2026', counts, data: before }, null, 2), { flag: 'wx' });
    if (apply) {
      let sql = fs.readFileSync(new URL('../dataconnect/migrations/20261013_fusion_paquetes_grupos.sql', import.meta.url), 'utf8')
        .replace(/^BEGIN;\s*$/m, '').replace(/^COMMIT;\s*$/m, '');
      const canCreateSchema = (await client.query("SELECT has_database_privilege(current_database(),'CREATE') AS allowed")).rows[0].allowed;
      if (!canCreateSchema) {
        // An IAM database owner may administer public tables without permission
        // to create a schema. Require a completed Cloud SQL backup instead.
        const managedBackup = JSON.parse(fs.readFileSync(new URL('cloudsql-backup.json', backupDir), 'utf8'));
        assert.equal(managedBackup.status, 'SUCCESSFUL', 'A completed managed backup is required');
        assert.equal(managedBackup.instance, 'cetprosmp-2026-instance');
        assert.equal(managedBackup.description, 'Antes de fusion paquetes grupos 2026-10-14');
        sql = sql
          .replace(/CREATE SCHEMA IF NOT EXISTS codex_backups;[\s\S]*?\$\$;\s*/, '')
          .replace(/INSERT INTO codex_backups\.fusion_paquetes_grupos_20261013\(tabla,clave,registro\)\s*SELECT 'role_permissions'[\s\S]*?ON CONFLICT DO NOTHING;\s*/, '');
        assert.ok(!sql.includes('codex_backups'), 'Only the optional SQL backup statements may be skipped');
      }
      await client.query(sql);
      // Match SQL Connect's optional-reference behavior and generated index name.
      await client.query('ALTER TABLE public.matriculas DROP CONSTRAINT matriculas_grupo_id_fkey, ADD CONSTRAINT matriculas_grupo_id_fkey FOREIGN KEY (grupo_id) REFERENCES public.grupos(id) ON DELETE SET NULL');
      await client.query('ALTER INDEX public.matriculas_grupo_id_idx RENAME TO "matriculas_grupoId_idx"');
      const after = await snapshot(client);
      assert.deepEqual(after.grupos, before.grupos.map(({ paquete_id, ...row }) => row));
      assert.deepEqual(after.grupo_modulos, before.grupo_modulos.map(row => ({ ...row, sufijo: row.sufijo ?? null })));
      assert.deepEqual(after.matriculas, expectedEnrollments);
      assert.deepEqual(after.modulos_estudiantes, before.modulos_estudiantes);
      assert.deepEqual(after.role_permissions, before.role_permissions.filter(row => row.entity !== 'paquetes'));
      for (const table of retired) assert.equal(after[table], undefined, `Retired table still exists: ${table}`);
      await client.query('COMMIT');
      fs.writeFileSync(new URL('verified.json', backupDir), JSON.stringify({ verifiedAt: new Date().toISOString(), applied: true, countsBefore: counts, countsAfter: Object.fromEntries(Object.entries(after).map(([table, rows]) => [table, rows.length])) }, null, 2));
    } else await client.query('ROLLBACK');
    console.log(JSON.stringify({ applied: apply, auditedEnrollments: expectedEnrollments.length, counts, backup: fileURLToPath(backupFile) }));
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
} finally {
  await pool?.end();
  connector.close();
}
