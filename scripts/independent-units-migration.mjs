import assert from 'node:assert/strict';
import fs from 'node:fs';

// The caller owns the connection, backup and transaction. No remote connection is opened here.
export const migrationTables = [
  'unidades_didacticas', 'competencias', 'competencia_unidades_didacticas',
  'capacidades_terminales', 'indicadores_capacidad', 'aprendizajes', 'actividades',
  'actividad_contenidos', 'actividad_materiales', 'fases', 'fases_metodos', 'fases_tecnicas', 'fases_recursos',
  'evaluaciones', 'aspectos_evaluacion', 'evaluaciones_estudiantes', 'aspectos_evaluacion_estudiantes',
  'unidades_didacticas_estudiantes', 'capacidades_terminales_estudiantes', 'indicadores_capacidad_estudiantes',
  'grupo_modulos', 'grupo_modulo_unidades_didacticas', 'grupo_modulo_actividades',
  'parte_diario_registros', 'matriculas', 'modulos_estudiantes',
];
const quote = name => `"${name.replaceAll('"', '""')}"`;
const tableName = name => `public.${quote(name)}`;
const index = rows => new Map(rows.map(row => [row.id, row]));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const ordered = values => [...new Set(values)].sort((a, b) => a - b);

export async function snapshotUnits(client) {
  const snapshot = {};
  for (const table of migrationTables) {
    snapshot[table] = (await client.query(`SELECT to_jsonb(t) AS row FROM ${tableName(table)} t ORDER BY id`)).rows.map(r => r.row);
  }
  return snapshot;
}

export function planIndependentUnits(before) {
  const units = index(before.unidades_didacticas);
  const competencias = index(before.competencias);
  const groups = index(before.grupo_modulos);
  const capacities = index(before.capacidades_terminales);
  const indicators = index(before.indicadores_capacidad);
  const learnings = index(before.aprendizajes);
  const usages = new Map();
  const add = (unitId, moduleId) => {
    if (unitId == null || moduleId == null) return;
    assert(units.has(unitId), `Unidad inexistente: ${unitId}`);
    const modules = usages.get(unitId) ?? new Set();
    modules.add(moduleId); usages.set(unitId, modules);
  };
  for (const row of before.competencia_unidades_didacticas) add(row.unidad_didactica_id, competencias.get(row.competencia_id).modulo_id);
  for (const row of before.grupo_modulo_unidades_didacticas) add(row.unidad_didactica_id, groups.get(row.grupo_modulo_id).modulo_id);
  for (const row of before.parte_diario_registros) add(row.unidad_didactica_id, groups.get(row.grupo_modulo_id).modulo_id);
  for (const row of before.actividades) {
    const indicator = indicators.get(learnings.get(row.aprendizaje_id)?.indicador_capacidad_id);
    add(capacities.get(indicator?.capacidad_terminal_id)?.unidad_didactica_id, row.modulo_id);
  }
  return [...units.values()].filter(unit => unit.comun || (usages.get(unit.id)?.size ?? 0) > 1).map(unit => ({
    originalId: unit.id, nombre: unit.nombre, moduleIds: ordered(usages.get(unit.id) ?? []),
    curricularModuleIds: ordered(before.competencia_unidades_didacticas.filter(r => r.unidad_didactica_id === unit.id)
      .map(r => competencias.get(r.competencia_id).modulo_id)),
  }));
}

export async function migrateIndependentUnits(client, before, { dropLegacyColumn = true, batchUpdates = true } = {}) {
  const plan = planIndependentUnits(before);
  const foreignKeys = (await client.query(`SELECT conrelid::regclass::text AS source
    FROM pg_constraint WHERE contype='f' AND confrelid::regclass::text = ANY($1::text[])`, [
    ['unidades_didacticas', 'capacidades_terminales', 'indicadores_capacidad', 'aprendizajes', 'actividades', 'fases', 'evaluaciones', 'aspectos_evaluacion', 'evaluaciones_estudiantes'],
  ])).rows;
  for (const key of foreignKeys) assert(migrationTables.includes(key.source), `Relacion no contemplada: ${key.source}. Revisar antes de migrar.`);
  const expected = Object.fromEntries(migrationTables.map(table => [table, index(structuredClone(before[table]))]));
  const maps = new Map();
  const report = { units: plan, copies: {}, changedRows: {}, historicalUnits: [], duplicatedGrades: {}, unassignedUnits: [] };
  const pendingUpdates = new Map();
  const mapFor = table => { if (!maps.has(table)) maps.set(table, new Map()); return maps.get(table); };
  const targets = (table, oldId) => mapFor(table).get(oldId);
  const mapped = (table, oldId, moduleId) => {
    if (oldId == null) return oldId;
    const available = targets(table, oldId);
    if (!available) return oldId;
    assert(available.has(moduleId), `${table} ${oldId} no tiene copia para modulo ${moduleId}`);
    return available.get(moduleId);
  };
  const update = async (table, row, changes) => {
    if (!Object.keys(changes).some(key => !same(row[key], changes[key]))) return;
    const fields = Object.keys(changes);
    if (batchUpdates) {
      const signature = `${table}:${fields.slice().sort().join(',')}`;
      const batch = pendingUpdates.get(signature) ?? { table, fields, rows: [] };
      batch.rows.push({ id: row.id, ...changes });
      pendingUpdates.set(signature, batch);
    } else {
      await client.query(`UPDATE ${tableName(table)} SET ${fields.map((key, i) => `${quote(key)}=$${i + 1}`).join(',')} WHERE id=$${fields.length + 1}`,
        [...fields.map(key => changes[key]), row.id]);
    }
    expected[table].set(row.id, { ...expected[table].get(row.id), ...changes });
    report.changedRows[table] = (report.changedRows[table] ?? 0) + 1;
  };
  const insert = async (table, row) => {
    const fields = Object.keys(row).filter(key => key !== 'id');
    const result = await client.query(`INSERT INTO ${tableName(table)} (${fields.map(quote).join(',')}) VALUES (${fields.map((_, i) => `$${i + 1}`).join(',')}) RETURNING id`, fields.map(key => row[key]));
    const saved = { ...row, id: result.rows[0].id };
    expected[table].set(saved.id, saved);
    report.copies[table] = (report.copies[table] ?? 0) + 1;
    return saved.id;
  };
  // Imported IDs may be above their sequences. Advance only sequences used by this migration.
  const resetSequences = async () => {
    for (const table of migrationTables) {
      const sequence = (await client.query('SELECT pg_get_serial_sequence($1,$2) name', [`public.${table}`, 'id'])).rows[0].name;
      if (sequence) await client.query(`SELECT setval($1::regclass, GREATEST((SELECT COALESCE(max(id),1) FROM ${tableName(table)}), (SELECT last_value FROM ${sequence})), true)`, [sequence]);
    }
  };
  await resetSequences();
  // One original becomes an ordinary unit of its first module; the other modules get independent copies.
  for (const item of plan) {
    const unit = before.unidades_didacticas.find(row => row.id === item.originalId);
    const unitMap = new Map(); mapFor('unidades_didacticas').set(unit.id, unitMap);
    if (!item.moduleIds.length) { report.unassignedUnits.push(unit.id); continue; }
    for (const moduleId of item.moduleIds) {
      const copy = { ...unit };
      if (Object.hasOwn(copy, 'comun')) copy.comun = false;
      const id = unitMap.size === 0 ? unit.id : await insert('unidades_didacticas', copy);
      unitMap.set(moduleId, id);
      if (!item.curricularModuleIds.includes(moduleId)) report.historicalUnits.push({ originalId: unit.id, moduleId, unitId: id });
    }
  }
  const cloneChildren = async (table, parent, column, transform = () => ({})) => {
    for (const row of before[table]) {
      const parentTargets = targets(parent, row[column]);
      if (!parentTargets?.size) continue;
      const ownTargets = new Map(); mapFor(table).set(row.id, ownTargets);
      for (const [moduleId, parentId] of parentTargets) {
        if (table === 'actividades' && row.modulo_id != null && row.modulo_id !== moduleId) continue;
        const changes = { [column]: parentId, ...transform(row, moduleId) };
        const id = ownTargets.size === 0 ? row.id : await insert(table, { ...row, ...changes });
        if (id === row.id) await update(table, row, changes);
        ownTargets.set(moduleId, id);
      }
    }
  };
  await cloneChildren('capacidades_terminales', 'unidades_didacticas', 'unidad_didactica_id');
  await cloneChildren('indicadores_capacidad', 'capacidades_terminales', 'capacidad_terminal_id');
  await cloneChildren('aprendizajes', 'indicadores_capacidad', 'indicador_capacidad_id');
  // Module-specific sessions keep their IDs and contents; only their parent changes.
  // Generic sessions are copied, including all of their contents, phases and assessments.
  await cloneChildren('actividades', 'aprendizajes', 'aprendizaje_id', (row, moduleId) => ({
    modulo_id: moduleId,
    clave_importacion: row.clave_importacion == null || row.modulo_id != null
      || moduleId === targets('aprendizajes', row.aprendizaje_id).keys().next().value
      ? row.clave_importacion : `${row.clave_importacion}:modulo:${moduleId}`,
  }));
  for (const table of ['actividad_contenidos', 'actividad_materiales', 'fases']) await cloneChildren(table, 'actividades', 'actividad_id');
  for (const table of ['fases_metodos', 'fases_tecnicas', 'fases_recursos']) await cloneChildren(table, 'fases', 'fase_id');
  await cloneChildren('evaluaciones', 'actividades', 'actividad_id', (row, moduleId) => ({
    indicador_capacidad_id: mapped('indicadores_capacidad', row.indicador_capacidad_id, moduleId),
  }));
  await cloneChildren('aspectos_evaluacion', 'evaluaciones', 'evaluacion_id');
  const groupModules = index(before.grupo_modulos);
  const competencias = index(before.competencias);
  for (const row of before.competencia_unidades_didacticas) await update('competencia_unidades_didacticas', row, {
    unidad_didactica_id: mapped('unidades_didacticas', row.unidad_didactica_id, competencias.get(row.competencia_id).modulo_id),
  });
  for (const row of before.grupo_modulo_unidades_didacticas) await update('grupo_modulo_unidades_didacticas', row, {
    unidad_didactica_id: mapped('unidades_didacticas', row.unidad_didactica_id, groupModules.get(row.grupo_modulo_id).modulo_id),
  });
  for (const row of before.grupo_modulo_actividades) await update('grupo_modulo_actividades', row, {
    actividad_id: mapped('actividades', row.actividad_id, groupModules.get(row.grupo_modulo_id).modulo_id),
  });
  for (const row of before.parte_diario_registros) {
    const moduleId = groupModules.get(row.grupo_modulo_id).modulo_id;
    await update('parte_diario_registros', row, {
      unidad_didactica_id: mapped('unidades_didacticas', row.unidad_didactica_id, moduleId),
      actividad_id: mapped('actividades', row.actividad_id, moduleId),
      actividad_programada_id: mapped('actividades', row.actividad_programada_id, moduleId),
    });
  }
  const enrollmentModules = new Map();
  const addEnrollment = (id, moduleId) => {
    if (moduleId == null) return;
    const modules = enrollmentModules.get(id) ?? new Set(); modules.add(moduleId); enrollmentModules.set(id, modules);
  };
  for (const row of before.modulos_estudiantes) addEnrollment(row.matricula_id, groupModules.get(row.grupo_modulo_id)?.modulo_id ?? row.modulo_id);
  for (const row of before.matriculas) {
    if (enrollmentModules.has(row.id)) continue;
    for (const gm of before.grupo_modulos) if (gm.grupo_id === row.grupo_id) addEnrollment(row.id, gm.modulo_id);
  }
  const migrateGrades = async (table, parent, column, transform = () => ({})) => {
    for (const row of before[table]) {
      const parentTargets = targets(parent, row[column]);
      if (!parentTargets?.size) continue;
      const moduleIds = ordered(enrollmentModules.get(row.matricula_id) ?? []).filter(id => parentTargets.has(id));
      assert(moduleIds.length, `No se puede resolver el modulo de ${table} ${row.id}, matricula ${row.matricula_id}. No se modificaron los datos.`);
      const ownTargets = new Map(); mapFor(table).set(row.id, ownTargets);
      for (const moduleId of moduleIds) {
        const changes = { [column]: parentTargets.get(moduleId), ...transform(row, moduleId) };
        const id = ownTargets.size === 0 ? row.id : await insert(table, { ...row, ...changes });
        if (id === row.id) await update(table, row, changes);
        ownTargets.set(moduleId, id);
      }
      if (moduleIds.length > 1) report.duplicatedGrades[table] = (report.duplicatedGrades[table] ?? 0) + moduleIds.length - 1;
    }
  };
  await migrateGrades('unidades_didacticas_estudiantes', 'unidades_didacticas', 'unidad_didactica_id');
  await migrateGrades('capacidades_terminales_estudiantes', 'capacidades_terminales', 'capacidad_terminal_id');
  await migrateGrades('indicadores_capacidad_estudiantes', 'indicadores_capacidad', 'indicador_capacidad_id');
  await migrateGrades('evaluaciones_estudiantes', 'evaluaciones', 'evaluacion_id');
  for (const row of before.aspectos_evaluacion_estudiantes) {
    const targetGrades = targets('evaluaciones_estudiantes', row.evaluacion_estudiante_id);
    if (!targetGrades?.size) continue;
    let first = true;
    for (const [moduleId, gradeId] of targetGrades) {
      const changes = { evaluacion_estudiante_id: gradeId, aspecto_evaluacion_id: mapped('aspectos_evaluacion', row.aspecto_evaluacion_id, moduleId) };
      if (first) await update('aspectos_evaluacion_estudiantes', row, changes);
      else await insert('aspectos_evaluacion_estudiantes', { ...row, ...changes });
      first = false;
    }
  }
  for (const { table, fields, rows } of pendingUpdates.values()) {
    for (let offset = 0; offset < rows.length; offset += 1000) {
      const setters = fields.map(field => `${quote(field)}=(jsonb_populate_record(NULL::${tableName(table)}, v.row)).${quote(field)}`).join(',');
      await client.query(`UPDATE ${tableName(table)} t SET ${setters}
        FROM jsonb_array_elements($1::jsonb) AS v(row) WHERE t.id=(v.row->>'id')::int`,
      [JSON.stringify(rows.slice(offset, offset + 1000))]);
    }
  }
  let finalizeSql = fs.readFileSync(new URL('../dataconnect/migrations/20261026_make_units_independent.sql', import.meta.url), 'utf8');
  if (!dropLegacyColumn) finalizeSql = finalizeSql.replace('ALTER TABLE public.unidades_didacticas DROP COLUMN IF EXISTS comun;', '');
  await client.query(finalizeSql);
  if (dropLegacyColumn) for (const row of expected.unidades_didacticas.values()) delete row.comun;
  const after = await snapshotUnits(client);
  // Compare every value, grade, date and relation, including unrelated rows; no cascading deletes.
  for (const table of migrationTables) {
    const actual = index(after[table]);
    assert.equal(actual.size, expected[table].size, `Conteo distinto: ${table}`);
    for (const [id, row] of expected[table]) assert.deepEqual(actual.get(id), row, `Datos distintos: ${table} ${id}`);
  }
  const stillShared = planIndependentUnits(after).filter(item => item.moduleIds.length > 1);
  assert.deepEqual(stillShared, [], 'Todavia existen unidades compartidas entre modulos');
  report.mapping = Object.fromEntries([...maps].map(([table, rows]) => [table, Object.fromEntries([...rows].map(([id, modules]) => [id, Object.fromEntries(modules)]))]));
  report.countsBefore = Object.fromEntries(migrationTables.map(table => [table, before[table].length]));
  report.countsAfter = Object.fromEntries(migrationTables.map(table => [table, after[table].length]));
  report.verifiedAt = new Date().toISOString();
  report.legacyColumnRemoved = dropLegacyColumn;
  return report;
}
