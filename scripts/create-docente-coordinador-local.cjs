// Copies the current Docente permissions. This script only connects to the local emulator.
// Usage: node scripts/create-docente-coordinador-local.cjs [--apply]
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const req = createRequire(path.resolve(__dirname, '../functions/package.json'));

process.env.DATA_CONNECT_EMULATOR_HOST = '127.0.0.1:9399';
const { initializeApp } = req('firebase-admin/app');
const { getDataConnect } = req('firebase-admin/data-connect');
const dc = getDataConnect(
  { serviceId: 'cetprosmp-2026-service', location: 'us-central1' },
  initializeApp({ projectId: 'cetprosmp-2026' }),
);
const title = 'Docente-coordinador';
const fields = ['entity', 'canView', 'canCreate', 'canEdit', 'canDelete'];
const normalize = (permissions) => permissions.map((item) =>
  Object.fromEntries(fields.map((field) => [field, item[field]])),
).sort((a, b) => a.entity.localeCompare(b.entity));
const query = `query CoordinatorRoleSnapshot {
  roles: rols(limit: 1000) { id titulo scala }
  rolePermissions(limit: 10000) { id roleId entity canView canCreate canEdit canDelete }
}`;

(async () => {
  const before = (await dc.executeGraphql(query)).data;
  const teacher = before.roles.find((role) => role.id === 4 && role.titulo === 'Docente');
  assert(teacher, 'The local Docente role is required.');
  const permissions = normalize(before.rolePermissions.filter((item) => item.roleId === teacher.id));
  assert(permissions.length > 0, 'Docente must have permissions to copy.');
  const existing = before.roles.filter((role) => role.titulo === title);
  assert(existing.length <= 1, 'Duplicate coordinator roles require review.');
  console.log(JSON.stringify({ environment: 'local', title, scala: 250, permissions: permissions.length, existingId: existing[0]?.id ?? null }));
  if (!process.argv.includes('--apply')) return;

  const directory = path.resolve(__dirname, '../tmp/docente-coordinador');
  fs.mkdirSync(directory, { recursive: true });
  let roleId = existing[0]?.id;
  if (!roleId) {
    fs.writeFileSync(path.join(directory, `before-${Date.now()}.json`), JSON.stringify(before, null, 2));
    const inserts = permissions.map((permission, index) => `p${index}: rolePermission_insert(data: {
      roleId_expr: "response.created.id"
      ${fields.map((field) => `${field}: ${JSON.stringify(permission[field])}`).join('\n')}
    })`);
    const created = await dc.executeGraphql(`mutation CreateDocenteCoordinador @transaction {
      created: rol_insert(data: { titulo: ${JSON.stringify(title)}, scala: 250 })
      ${inserts.join('\n')}
    }`);
    roleId = created.data.created.id;
  }

  const after = (await dc.executeGraphql(query)).data;
  const role = after.roles.find((item) => item.id === roleId);
  assert.equal(role.titulo, title);
  assert.equal(role.scala, 250);
  assert(roleId < 600, 'The role must not use a superuser identifier.');
  assert.deepEqual(normalize(after.rolePermissions.filter((item) => item.roleId === roleId)), permissions);
  assert.deepEqual(after.roles.filter((item) => item.id !== roleId).sort((a, b) => a.id - b.id), before.roles.filter((item) => item.id !== roleId).sort((a, b) => a.id - b.id));
  assert.deepEqual(after.rolePermissions.filter((item) => item.roleId !== roleId).sort((a, b) => a.id - b.id), before.rolePermissions.filter((item) => item.roleId !== roleId).sort((a, b) => a.id - b.id));
  fs.writeFileSync(path.join(directory, 'result.json'), JSON.stringify({ role, permissions }, null, 2));
  console.log(JSON.stringify({ verified: true, role, copiedPermissions: permissions.length }));
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
