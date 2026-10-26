// Apply a reviewed catalog merge plan; never infer equivalence during a remote write.
// Usage: node scripts/merge-material-catalog.cjs --plan <plan.json> [--apply]
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { createRequire } = require('node:module');

const args = process.argv.slice(2);
const planFile = args[args.indexOf('--plan') + 1];
assert(args.includes('--plan') && planFile, 'Provide a reviewed --plan file.');
const planPath = path.resolve(planFile);
const directory = path.dirname(planPath);
const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
const original = JSON.parse(fs.readFileSync(path.resolve(directory, plan.snapshot), 'utf8'));
assert.equal(plan.projectId, 'cetprosmp-2026');
assert.equal(plan.projectId, original.projectId);
assert.equal(plan.serviceId, original.serviceId);

for (const key of ['DATA_CONNECT_EMULATOR_HOST', 'FIREBASE_DATA_CONNECT_EMULATOR_HOST']) delete process.env[key];
const requireFunctions = createRequire(path.resolve(__dirname, '../functions/package.json'));
const { initializeApp } = requireFunctions('firebase-admin/app');
const { getDataConnect } = requireFunctions('firebase-admin/data-connect');
const dc = getDataConnect({ serviceId: plan.serviceId, location: 'us-central1' }, initializeApp({ projectId: plan.projectId }));
const graph = async (source) => (await dc.executeGraphql(source)).data;
const snapshot = () => graph(`query MaterialMergeState {
  materiales(limit:10000,orderBy:{id:ASC}) { id nombre clave }
  actividadMateriales(limit:50000,orderBy:{id:ASC}) { id actividadId orden texto materialId }
}`);
const materialKey = (name) => name.normalize('NFKC').replace(/\s+/g, ' ').trim().toLocaleLowerCase('es');
const stable = (data) => ({
  materiales: data.materiales.map(({ id, nombre, clave }) => ({ id, nombre, clave })).sort((a, b) => a.id - b.id),
  actividadMateriales: data.actividadMateriales.map(({ id, actividadId, orden, texto, materialId }) =>
    ({ id, actividadId, orden, texto, materialId })).sort((a, b) => a.id - b.id),
});
const save = (name, data) => fs.writeFileSync(path.join(directory, name), JSON.stringify(data, null, 2));
const quote = JSON.stringify;

(async () => {
  const current = stable(await snapshot());
  const before = stable(original.data);
  assert(before.materiales.length < 10000 && before.actividadMateriales.length < 50000, 'Increase pagination before proceeding.');
  const materials = new Map(before.materiales.map((material) => [material.id, material]));
  const groupsById = new Map();
  const keys = new Set();
  for (const group of plan.groups) {
    assert(group.nombre.trim() && group.ids.length > 1 && group.ids.includes(group.keepId));
    const key = materialKey(group.nombre);
    assert(!keys.has(key), 'Duplicate canonical name.');
    keys.add(key);
    for (const id of group.ids) {
      assert(materials.has(id) && !groupsById.has(id), `Invalid or reused material ID ${id}.`);
      assert.deepEqual(materials.get(id), group.originals.find((item) => item.id === id));
      groupsById.set(id, group);
    }
    assert(!before.materiales.some((item) => item.clave === key && !group.ids.includes(item.id)), 'Canonical key collision.');
  }

  const duplicateLinks = new Set();
  const seen = new Set();
  const sortedLinks = [...before.actividadMateriales].sort((a, b) => a.actividadId - b.actividadId || a.orden - b.orden || a.id - b.id);
  for (const link of sortedLinks) {
    assert(materials.has(link.materialId), `Unassociated material ${link.id}.`);
    const group = groupsById.get(link.materialId);
    const pair = `${link.actividadId}:${group?.keepId ?? link.materialId}`;
    if (seen.has(pair)) duplicateLinks.add(link.id);
    seen.add(pair);
  }
  const expected = stable({
    materiales: before.materiales.flatMap((item) => {
      const group = groupsById.get(item.id);
      return !group ? [item] : item.id === group.keepId ? [{ id: item.id, nombre: group.nombre, clave: materialKey(group.nombre) }] : [];
    }),
    actividadMateriales: before.actividadMateriales.filter((item) => !duplicateLinks.has(item.id)).map((item) => {
      const group = groupsById.get(item.materialId);
      return group ? { ...item, materialId: group.keepId, texto: group.nombre } : item;
    }),
  });
  const coverageBefore = new Set(before.actividadMateriales.map((item) => `${item.actividadId}:${groupsById.get(item.materialId)?.keepId ?? item.materialId}`));
  const coverageAfter = new Set(expected.actividadMateriales.map((item) => `${item.actividadId}:${item.materialId}`));
  assert.deepEqual(coverageAfter, coverageBefore, 'Session material coverage must be preserved.');
  const expectedLinks = new Map(expected.actividadMateriales.map((item) => [item.id, item]));
  const updatedSessions = new Set(before.actividadMateriales.filter((item) => {
    const next = expectedLinks.get(item.id);
    return !next || ['actividadId', 'orden', 'texto', 'materialId'].some((field) => item[field] !== next[field]);
  }).map((item) => item.actividadId));
  const summary = {
    projectId: plan.projectId, groups: plan.groups.length,
    materialsBefore: before.materiales.length, materialsAfter: expected.materiales.length,
    removedCatalogDuplicates: before.materiales.length - expected.materiales.length,
    affectedSessions: new Set(before.actividadMateriales.filter((item) => groupsById.has(item.materialId)).map((item) => item.actividadId)).size,
    updatedSessions: updatedSessions.size,
    sessionLinksBefore: before.actividadMateriales.length, sessionLinksAfter: expected.actividadMateriales.length,
    removedRepeatedSessionEntries: duplicateLinks.size,
  };
  save('expected-after.json', expected);
  save('preview.json', summary);
  console.log(JSON.stringify({ ...summary, apply: args.includes('--apply') }));
  const fingerprint = createHash('sha256').update(JSON.stringify(plan)).digest('hex');
  const journalPath = path.join(directory, 'apply-journal.json');
  const journal = fs.existsSync(journalPath) ? JSON.parse(fs.readFileSync(journalPath, 'utf8')) : {
    projectId: plan.projectId, fingerprint, backupFile: `before-apply-${Date.now()}.json`, referencesCompleted: [], completed: [],
  };
  assert.equal(journal.fingerprint, fingerprint, 'The journal belongs to another merge plan.');
  const referenced = new Set(journal.referencesCompleted);
  const merged = new Set(journal.completed);
  const stateFromJournal = () => stable({
    materiales: before.materiales.flatMap((item) => {
      const group = groupsById.get(item.id);
      if (!group || !merged.has(group.keepId)) return [item];
      return item.id === group.keepId ? [{ id: item.id, nombre: group.nombre, clave: materialKey(group.nombre) }] : [];
    }),
    actividadMateriales: before.actividadMateriales.filter((item) => {
      if (!duplicateLinks.has(item.id)) return true;
      const group = groupsById.get(item.materialId);
      return group ? !merged.has(group.keepId) : !journal.removedExistingDuplicateLinks;
    }).map((item) => {
      const group = groupsById.get(item.materialId);
      return group && referenced.has(group.keepId) ? { ...item, materialId: group.keepId, texto: group.nombre } : item;
    }),
  });
  assert.deepEqual(current, stateFromJournal(), 'Remote catalog changed outside the reviewed plan or journal.');
  if (!args.includes('--apply')) return;
  const backupFile = journal.backupFile;
  if (!fs.existsSync(journalPath)) {
    save(backupFile, { projectId: plan.projectId, serviceId: plan.serviceId, takenAt: new Date().toISOString(), data: before, plan });
    save('apply-journal.json', journal);
  }
  const guardsFor = (chunk) => chunk.flatMap((group) => group.originals.map((item) =>
    `m${item.id}:material(id:${item.id}) @check(expr:"this != null",message:"Missing material ${item.id}") {
      nombre @check(expr:${quote(`this == ${quote(item.nombre)}`)},message:"Changed name ${item.id}")
      clave @check(expr:${quote(`this == ${quote(item.clave)}`)},message:"Changed key ${item.id}")
    }`));

  // First commit reference changes only. Verify persisted rows before deleting any catalog row.
  const referencesPending = plan.groups.filter((group) => !referenced.has(group.keepId));
  for (let start = 0; start < referencesPending.length; start += 8) {
    const chunk = referencesPending.slice(start, start + 8);
    const fields = chunk.map((group) => {
      const count = before.actividadMateriales.filter((item) => group.ids.includes(item.materialId)).length;
      return `m${group.keepId}Links:actividadMaterial_updateMany(where:{materialId:{in:${quote(group.ids)}}},data:{materialId:${group.keepId},texto:${quote(group.nombre)}}) @check(expr:"this == ${count}",message:"Changed session links ${group.keepId}")`;
    });
    await graph(`mutation ReassignReviewedMaterialReferences @transaction {
      query @redact { ${guardsFor(chunk).join('\n')} }
      ${fields.join('\n')}
    }`);
    chunk.forEach((group) => referenced.add(group.keepId));
    journal.referencesCompleted = [...referenced];
    save('apply-journal.json', journal);
    console.log(`Reassigned ${referenced.size}/${plan.groups.length} reviewed groups.`);
  }
  assert.deepEqual(stable(await snapshot()), stateFromJournal(), 'Reference reassignment differs from the exact expected state.');

  const catalogPending = plan.groups.filter((group) => !merged.has(group.keepId));
  for (let start = 0; start < catalogPending.length; start += 8) {
    const chunk = catalogPending.slice(start, start + 8);
    const guards = [...guardsFor(chunk), ...chunk.map((group) =>
      `r${group.keepId}:actividadMateriales(where:{materialId:{in:${quote(group.ids.filter((id) => id !== group.keepId))}}},limit:1) @check(expr:"this.size() == 0",message:"Unmoved references ${group.keepId}") { id }`)];
    const fields = chunk.flatMap((group) => {
      const prefix = `m${group.keepId}`;
      const links = before.actividadMateriales.filter((item) => group.ids.includes(item.materialId));
      const duplicates = links.filter((item) => duplicateLinks.has(item.id)).map((item) => item.id);
      const removeIds = group.ids.filter((id) => id !== group.keepId);
      return [
        ...(duplicates.length ? [`${prefix}Repeated:actividadMaterial_deleteMany(where:{id:{in:${quote(duplicates)}}}) @check(expr:"this == ${duplicates.length}",message:"Changed repeated links ${group.keepId}")`] : []),
        `${prefix}Duplicates:material_deleteMany(where:{id:{in:${quote(removeIds)}}}) @check(expr:"this == ${removeIds.length}",message:"Changed duplicates ${group.keepId}")`,
        `${prefix}Name:material_update(id:${group.keepId},data:{nombre:${quote(group.nombre)},clave:${quote(materialKey(group.nombre))}}) @check(expr:"this != null",message:"Missing target ${group.keepId}")`,
      ];
    });
    await graph(`mutation MergeReviewedMaterials @transaction {
      query @redact { ${guards.join('\n')} }
      ${fields.join('\n')}
    }`);
    chunk.forEach((group) => merged.add(group.keepId));
    journal.completed = [...merged];
    save('apply-journal.json', journal);
    console.log(`Merged ${merged.size}/${plan.groups.length} reviewed groups.`);
  }
  const existingDuplicates = before.actividadMateriales.filter((item) => duplicateLinks.has(item.id) && !groupsById.has(item.materialId));
  if (existingDuplicates.length && !journal.removedExistingDuplicateLinks) {
    const guards = existingDuplicates.map((item) => `a${item.id}:actividadMaterial(id:${item.id}) @check(expr:"this != null") {
      actividadId @check(expr:"this == ${item.actividadId}")
      materialId @check(expr:"this == ${item.materialId}")
      orden @check(expr:"this == ${item.orden}")
      texto @check(expr:${quote(`this == ${quote(item.texto)}`)})
    }`);
    await graph(`mutation RemoveAlreadyRepeatedSessionMaterials @transaction {
      query @redact { ${guards.join('\n')} }
      repeated:actividadMaterial_deleteMany(where:{id:{in:${quote(existingDuplicates.map((item) => item.id))}}}) @check(expr:"this == ${existingDuplicates.length}")
    }`);
    journal.removedExistingDuplicateLinks = existingDuplicates.map((item) => item.id);
    save('apply-journal.json', journal);
  }
  const after = stable(await snapshot());
  save('after-remote.json', { projectId: plan.projectId, verifiedAt: new Date().toISOString(), data: after });
  assert.deepEqual(after, expected, 'Remote data differs from the exact expected result.');
  save('result.json', { ...summary, backupFile, verified: true, allSessionCoveragePreserved: true });
  console.log(JSON.stringify({ ...summary, verified: true, backupFile }));
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
