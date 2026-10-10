// Additive local permissions: never overwrites an existing role decision.
const fs = require('node:fs');
const path = require('node:path');
process.env.GCLOUD_PROJECT = 'cetprosmp-2026';
process.env.GOOGLE_CLOUD_PROJECT = 'cetprosmp-2026';
process.env.DATA_CONNECT_EMULATOR_HOST = '127.0.0.1:9399';
const { dataConnect } = require('../functions/lib/modules/core/dataConnectCore.js');
const graph = async (query, variables = {}) => (await dataConnect.executeGraphql(query, { variables })).data;
(async () => {
  const { rols, rolePermissions } = await graph(`query ParteRoles {
    rols { id titulo scala }
    rolePermissions(where: { entity: { eq: "parte-diario" } }) { id roleId canView canCreate canEdit canDelete }
  }`);
  const missing = rols.filter(role => role.scala >= 300 && role.scala < 600 && !rolePermissions.some(p => p.roleId === role.id));
  if (process.argv.includes('--apply') && missing.length) {
    const dir = path.resolve(__dirname, '../tmp/parte-diario');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `permissions-before-${Date.now()}.json`), JSON.stringify({ rols, rolePermissions }, null, 2));
    for (const role of missing) await graph(`mutation ParteRole($role:Int!) {
      rolePermission_insert(data:{roleId:$role,entity:"parte-diario",canView:true,canCreate:true,canEdit:true,canDelete:false})
    }`, { role: role.id });
  }
  console.log(JSON.stringify({ localOnly: true, apply: process.argv.includes('--apply'), missingRoles: missing.map(r => ({ id: r.id, titulo: r.titulo })), existingRolesPreserved: rolePermissions.length }));
})().catch(error => { console.error(error.message); process.exitCode = 1; });
