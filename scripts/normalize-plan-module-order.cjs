// Local-only repair of legacy orders that continued across careers in a specialty.
// Preview: node scripts/normalize-plan-module-order.cjs
// Apply with backup: node scripts/normalize-plan-module-order.cjs --apply
const assert = require('node:assert/strict');

function normalizePlanModuleOrders(state) {
  const expected = structuredClone(state), changes = [], groups = [];
  for (const plan of expected.planes) {
    const links = expected.planModulos.filter(row => row.planId === plan.id);
    const linkedIds = new Set(links.map(row => row.moduloId));
    const modules = expected.modulos.filter(row => row.planId === plan.id || linkedIds.has(row.id));
    assert.equal(new Set(links.map(row => row.moduloId)).size, links.length, 'Duplicate module in a plan.');
    const ordered = modules.map(module => ({ module, link: links.find(row => row.moduloId === module.id) }))
      .sort((a, b) => (a.link?.orden ?? a.module.orden ?? a.module.id) - (b.link?.orden ?? b.module.orden ?? b.module.id) || a.module.id - b.module.id);
    const group = { planId: plan.id, carrera: plan.carrera?.tituloComercial || plan.carrera?.nombre, modules: [] };
    for (const [index, { module, link }] of ordered.entries()) {
      const order = index + 1;
      group.modules.push({ id: module.id, title: module.titulo, before: link?.orden ?? module.orden, after: order });
      for (const [entity, row] of [['planModulo', link], ['modulo', module.planId === plan.id ? module : null]]) {
        if (!row || row.orden === order) continue;
        changes.push({ entity, id: row.id, planId: plan.id, before: row.orden ?? null, after: order });
        row.orden = order;
      }
    }
    if (ordered.length) groups.push(group);
  }
  return { expected, changes, groups };
}

async function main() {
  const fs = require('node:fs'), path = require('node:path');
  const { createRequire } = require('node:module');
  // Never allow the caller's environment to redirect this repair to production.
  process.env.DATA_CONNECT_EMULATOR_HOST = '127.0.0.1:9399';
  delete process.env.FIREBASE_DATA_CONNECT_EMULATOR_HOST;
  const req = createRequire(path.resolve(__dirname, '../functions/package.json'));
  const { initializeApp } = req('firebase-admin/app');
  const { getDataConnect } = req('firebase-admin/data-connect');
  const dc = getDataConnect({ serviceId: 'cetprosmp-2026-service', location: 'us-central1' }, initializeApp({ projectId: 'cetprosmp-2026' }));
  const graph = async (source, variables) => (await dc.executeGraphql(source, variables ? { variables } : undefined)).data;
  const query = `query LocalPlanModuleOrders {
    planes(limit:1000,orderBy:{id:ASC}) {id planEstudio carreraId carrera {nombre tituloComercial}}
    modulos(limit:10000,orderBy:{id:ASC}) {id titulo orden planId}
    planModulos(limit:10000,orderBy:{id:ASC}) {id planId moduloId orden}
  }`;
  const before = await graph(query);
  assert(before.planes.length < 1000 && before.modulos.length < 10000 && before.planModulos.length < 10000, 'Increase pagination before running the repair.');
  const { expected, changes, groups } = normalizePlanModuleOrders(before);
  console.log(JSON.stringify({ localOnly: true, changes: changes.length, plans: groups.filter(group => group.modules.some(row => row.before !== row.after)) }, null, 2));
  if (!process.argv.includes('--apply') || !changes.length) return;
  const directory = path.resolve(__dirname, '../tmp/module-plan-order');
  fs.mkdirSync(directory, { recursive: true });
  const backup = path.join(directory, `local-backup-${Date.now()}.json`);
  fs.writeFileSync(backup, JSON.stringify({ before, expected, changes, groups }, null, 2));
  const variables = {}, definitions = [], checks = [], updates = [];
  for (const [i, change] of changes.entries()) {
    definitions.push(`$before${i}:Int`); variables[`before${i}`] = change.before;
    checks.push(`c${i}:${change.entity}(id:${change.id}) @check(expr:"this != null && this.planId == ${change.planId} && this.orden == vars.before${i}",message:"El orden o plan del módulo cambió."){id planId orden}`);
    updates.push(`u${i}:${change.entity}_update(id:${change.id},data:{orden:${change.after}})`);
  }
  await graph(`mutation NormalizeLocalPlanModuleOrders(${definitions.join(',')}) @transaction {query {${checks.join('\n')}} ${updates.join('\n')}}`, variables);
  const after = await graph(query);
  fs.writeFileSync(path.join(directory, 'local-after.json'), JSON.stringify(after, null, 2));
  assert.deepEqual(after, expected, 'Unexpected changes; the original backup is available.');
  assert.equal(normalizePlanModuleOrders(after).changes.length, 0, 'The repair must be idempotent.');
  console.log(JSON.stringify({ localOnly: true, verified: true, updates: changes.length, plansCorrected: groups.filter(group => group.modules.some(row => row.before !== row.after)).length, backup }));
}
module.exports = { normalizePlanModuleOrders };
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
