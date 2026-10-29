// Review text replacements in a JSON plan before applying them. No automatic edits during a write.
// Snapshot: node scripts/clean-curricular-codes.cjs --target local|remote --snapshot <file>
// Apply: node scripts/clean-curricular-codes.cjs --plan <reviewed-plan.json> --apply
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { createHash } = require('node:crypto');
const arg = name => process.argv[process.argv.indexOf(name) + 1];
const canonical = value => Array.isArray(value) ? value.map(canonical)
  : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const hash = data => createHash('sha256').update(JSON.stringify(canonical(data))).digest('hex');
const tables = {
  modulos: { entity: 'modulo', fields: ['titulo', 'tituloComercial'] },
  competencias: { entity: 'competencia', fields: ['nombre'] },
  unidadesDidacticas: { entity: 'unidadDidactica', fields: ['nombre'] },
  capacidadesTerminales: { entity: 'capacidadTerminal', fields: ['descripcion'] },
  indicadoresCapacidad: { entity: 'indicadorCapacidad', fields: ['descripcion'] },
  aprendizajes: { fields: ['descripcion'] },
  actividads: { fields: ['nombre'] },
};
const planPath = process.argv.includes('--plan') ? path.resolve(arg('--plan')) : null;
const plan = planPath ? JSON.parse(fs.readFileSync(planPath, 'utf8')) : null;
const target = plan?.target ?? arg('--target');
assert(['local', 'remote'].includes(target), 'Choose an explicit local or remote target.');
assert(!process.argv.includes('--apply') || plan, 'A reviewed plan is required to apply changes.');
for (const key of ['DATA_CONNECT_EMULATOR_HOST', 'FIREBASE_DATA_CONNECT_EMULATOR_HOST']) delete process.env[key];
if (target === 'local') process.env.DATA_CONNECT_EMULATOR_HOST = '127.0.0.1:9399';
const req = createRequire(path.resolve(__dirname, '../functions/package.json'));
const { initializeApp } = req('firebase-admin/app');
const { getDataConnect } = req('firebase-admin/data-connect');
const projectId = 'cetprosmp-2026', serviceId = 'cetprosmp-2026-service';
const dc = getDataConnect({ serviceId, location: 'us-central1' }, initializeApp({ projectId }));
const graph = async (source, variables) => (await dc.executeGraphql(source, variables ? { variables } : undefined)).data;
async function snapshot() {
  const data = {};
  for (const [table, config] of Object.entries(tables)) {
    const rows = [];
    for (let offset = 0; ; offset += 1000) {
      assert(offset < 100000, 'Unexpected catalog size; review pagination.');
      const page = (await graph(`query TextSnapshot { rows:${table}(limit:1000,offset:${offset},orderBy:{id:ASC}) {id ${config.fields.join(' ')}} }`)).rows;
      rows.push(...page);
      if (page.length < 1000) break;
    }
    data[table] = rows;
  }
  return { target, projectId, serviceId, capturedAt: new Date().toISOString(), hash: hash(data), data };
}
function save(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}
async function main() {
  const before = await snapshot();
  if (!plan) {
    assert(process.argv.includes('--snapshot'));
    save(path.resolve(arg('--snapshot')), before);
    console.log(JSON.stringify({ target, hash: before.hash, counts: Object.fromEntries(Object.entries(before.data).map(([table, rows]) => [table, rows.length])) }));
    return;
  }
  assert.equal(plan.projectId, projectId);
  assert.equal(plan.serviceId, serviceId);
  const original = JSON.parse(fs.readFileSync(path.resolve(path.dirname(planPath), plan.snapshot), 'utf8'));
  assert.equal(original.target, target);
  assert.equal(plan.sourceHash, original.hash);
  assert.equal(before.hash, hash(original.data), 'The catalog changed after review. Read and review a fresh snapshot.');
  const expected = structuredClone(before.data), seen = new Set();
  for (const edit of plan.edits) {
    const config = tables[edit.table];
    assert(config?.entity && config.fields.includes(edit.field), 'Only names through indicators may be edited.');
    const key = `${edit.table}:${edit.id}:${edit.field}`;
    assert(!seen.has(key), 'Duplicate edit.'); seen.add(key);
    const row = expected[edit.table].find(item => item.id === edit.id);
    assert(row && row[edit.field] === edit.before, `Original value differs: ${key}`);
    assert(typeof edit.after === 'string' && edit.after.trim() && edit.after !== edit.before);
    assert(Array.isArray(edit.removals) && edit.removals.length, `Reviewed removals are required: ${key}`);
    let reconstructed = edit.before;
    for (const removal of [...edit.removals].sort((a, b) => b.start - a.start)) {
      assert.equal(edit.before.slice(removal.start, removal.end), removal.text);
      assert(/^(?:["“])?(?:UC|CE|UD|C|I|M)\s*\d/u.test(removal.text), `A removal must begin with a curricular code: ${key}`);
      assert(['', ' '].includes(removal.replacement));
      reconstructed = reconstructed.slice(0, removal.start) + removal.replacement + reconstructed.slice(removal.end);
    }
    assert.equal(edit.after, reconstructed, `Only reviewed prefixes may be removed: ${key}`);
    row[edit.field] = edit.after;
  }
  console.log(JSON.stringify({ target, edits: plan.edits.length, apply: process.argv.includes('--apply') }));
  if (!process.argv.includes('--apply')) return;
  const directory = path.dirname(planPath), stamp = Date.now();
  save(path.join(directory, `${target}-before-${stamp}.json`), before);
  for (let start = 0; start < plan.edits.length; start += 40) {
    const edits = plan.edits.slice(start, start + 40), variables = {}, definitions = [], checks = [], updates = [];
    for (const [i, edit] of edits.entries()) {
      definitions.push(`$before${i}:String!`, `$after${i}:String!`);
      variables[`before${i}`] = edit.before; variables[`after${i}`] = edit.after;
      const entity = tables[edit.table].entity;
      checks.push(`c${i}:${entity}(id:${edit.id}) @check(expr:"this != null && this.${edit.field} == vars.before${i}",message:"The text changed after review."){id ${edit.field}}`);
      updates.push(`u${i}:${entity}_update(id:${edit.id},data:{${edit.field}:$after${i}})`);
    }
    await graph(`mutation CleanCurricularText(${definitions.join(',')}) @transaction { query {${checks.join('\n')}} ${updates.join('\n')} }`, variables);
  }
  const after = await snapshot();
  save(path.join(directory, `${target}-after-${stamp}.json`), after);
  assert.deepEqual(after.data, expected, 'Verify the final catalog; the original backup is available.');
  save(path.join(directory, `${target}-result.json`), { target, edits: plan.edits.length, verified: true, beforeHash: before.hash, afterHash: after.hash });
  console.log(JSON.stringify({ target, edited: plan.edits.length, verified: true, sessionsUnchanged: true }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
