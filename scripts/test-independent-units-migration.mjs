import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { snapshotUnits, migrateIndependentUnits } from './independent-units-migration.mjs';

const require = createRequire(new URL('../tmp/cloudsql-tools/package.json', import.meta.url));
const { Client } = require('pg');
const client = new Client({ host: '127.0.0.1', port: 5432, user: 'postgres', database: 'cetprosmp-db', connectionTimeoutMillis: 5000 });
const dropLegacyColumn = !process.argv.includes('--keep-column');
await client.connect();
try {
  await client.query('BEGIN');
  const insert = async (table, data) => {
    const keys = Object.keys(data);
    return (await client.query(`INSERT INTO public.${table} (${keys.join(',')}) VALUES (${keys.map((_,i) => `$${i+1}`).join(',')}) RETURNING id`, Object.values(data))).rows[0].id;
  };
  // Old schema is seeded only inside this rolled-back transaction, even after the real migration.
  await client.query('ALTER TABLE public.unidades_didacticas ADD COLUMN IF NOT EXISTS comun boolean DEFAULT false');
  await client.query('DROP INDEX IF EXISTS competencia_unidades_didacticas_unidad_didactica_id_key');
  const moduleA = await insert('modulos', { titulo: 'Unidad propia prueba A', horas: 300 });
  const moduleB = await insert('modulos', { titulo: 'Unidad propia prueba B', horas: 300 });
  const compA = await insert('competencias', { modulo_id: moduleA, nombre: 'Competencia A', tipo: 'TECNICA' });
  const compB = await insert('competencias', { modulo_id: moduleB, nombre: 'Competencia B', tipo: 'TECNICA' });
  const unit = await insert('unidades_didacticas', { nombre: 'Unidad antes compartida', comun: true, duracion: 30, creditos: 2, horas_teoricas: 10, horas_practicas: 20, creditos_teoricos: 1, creditos_practicos: 1 });
  await insert('competencia_unidades_didacticas', { competencia_id: compA, unidad_didactica_id: unit, orden: 1 });
  await insert('competencia_unidades_didacticas', { competencia_id: compB, unidad_didactica_id: unit, orden: 1 });
  const capacity = await insert('capacidades_terminales', { unidad_didactica_id: unit, descripcion: 'Capacidad conservada', orden: 1 });
  const indicator = await insert('indicadores_capacidad', { capacidad_terminal_id: capacity, descripcion: 'Indicador conservado', orden: 1 });
  const learning = await insert('aprendizajes', { indicador_capacidad_id: indicator, descripcion: 'Aprendizaje conservado' });
  const generic = await insert('actividades', { aprendizaje_id: learning, nombre: 'Sesion generica', clave_importacion: `test-independent-${Date.now()}`, duracion: 2 });
  const specific = await insert('actividades', { aprendizaje_id: learning, modulo_id: moduleB, nombre: 'Sesion propia B' });
  await insert('actividad_contenidos', { actividad_id: generic, orden: 1, texto: 'Contenido conservado' });
  const material = (await client.query('SELECT id FROM materiales LIMIT 1')).rows[0].id;
  await insert('actividad_materiales', { actividad_id: generic, material_id: material, orden: 1, texto: 'Material conservado' });
  const phase = await insert('fases', { actividad_id: generic, nombre: 'Fase conservada', duracion: 1 });
  const method = await insert('metodos', { nombre: 'Metodo de prueba' });
  await insert('fases_metodos', { fase_id: phase, metodo_id: method });
  const evaluation = await insert('evaluaciones', { actividad_id: generic, indicador_capacidad_id: indicator, instrumento: 'Instrumento conservado' });
  const aspect = await insert('aspectos_evaluacion', { evaluacion_id: evaluation, descripcion: 'Aspecto conservado' });
  const group = (await client.query('SELECT id FROM grupos ORDER BY id LIMIT 1')).rows[0].id;
  const gmA = await insert('grupo_modulos', { grupo_id: group, modulo_id: moduleA, instancia: 1 });
  const gmB = await insert('grupo_modulos', { grupo_id: group, modulo_id: moduleB, instancia: 1 });
  const enrollment = await insert('matriculas', { grupo_id: group });
  const enrollmentColumns = new Set((await client.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='modulos_estudiantes'")).rows.map(row => row.column_name));
  for (const gm of [gmA, gmB]) {
    await insert('modulos_estudiantes', { matricula_id: enrollment, grupo_modulo_id: gm,
      ...(enrollmentColumns.has('modulo_id') ? { modulo_id: gm === gmA ? moduleA : moduleB } : {}),
      ...(enrollmentColumns.has('grupo_id') ? { grupo_id: group } : {}),
    });
    await insert('grupo_modulo_unidades_didacticas', { grupo_modulo_id: gm, unidad_didactica_id: unit, orden: 1, inicio: '2026-10-26T13:00:00Z', fin: '2026-10-26T15:00:00Z' });
    await insert('grupo_modulo_actividades', { grupo_modulo_id: gm, actividad_id: generic, segmento: 1, inicio: '2026-10-26T13:00:00Z', fin: '2026-10-26T15:00:00Z' });
  }
  await insert('unidades_didacticas_estudiantes', { matricula_id: enrollment, unidad_didactica_id: unit, promedio: 17 });
  await insert('capacidades_terminales_estudiantes', { matricula_id: enrollment, capacidad_terminal_id: capacity, promedio: 16 });
  await insert('indicadores_capacidad_estudiantes', { matricula_id: enrollment, indicador_capacidad_id: indicator, promedio: 15 });
  const grade = await insert('evaluaciones_estudiantes', { matricula_id: enrollment, evaluacion_id: evaluation, nota: 18 });
  await insert('aspectos_evaluacion_estudiantes', { evaluacion_estudiante_id: grade, aspecto_evaluacion_id: aspect, puntaje: 9 });
  const teacher = (await client.query('SELECT id FROM personales ORDER BY id LIMIT 1')).rows[0].id;
  const diary = await insert('parte_diario_registros', { grupo_modulo_id: gmB, docente_id: teacher, fecha: '2026-10-26', unidad_didactica_id: unit, actividad_id: generic, actividad_programada_id: generic, matriculados: 1, observaciones: [], creado_por: 'local-test', actualizado_por: 'local-test', fecha_creacion: '2026-10-26T13:00:00Z', fecha_actualizacion: '2026-10-26T13:00:00Z' });
  const before = await snapshotUnits(client);
  const report = await migrateIndependentUnits(client, before, { dropLegacyColumn });
  const after = await snapshotUnits(client);
  const unitA = Number(report.mapping.unidades_didacticas[unit][moduleA]);
  const unitB = Number(report.mapping.unidades_didacticas[unit][moduleB]);
  assert.notEqual(unitA, unitB);
  assert.equal(after.unidades_didacticas.find(u => u.id === unitB).horas_practicas, 20);
  assert.equal(after.unidades_didacticas_estudiantes.filter(r => r.matricula_id === enrollment && r.promedio === 17).length, 2);
  assert.equal(after.evaluaciones_estudiantes.filter(r => r.matricula_id === enrollment && r.nota === 18).length, 2);
  const genericB = report.mapping.actividades[generic][moduleB];
  assert.notEqual(genericB, generic);
  assert.equal(after.actividad_contenidos.find(r => r.actividad_id === genericB).texto, 'Contenido conservado');
  assert.equal(after.actividad_materiales.find(r => r.actividad_id === genericB).material_id, material);
  assert.equal(after.actividades.find(r => r.id === specific).aprendizaje_id, report.mapping.aprendizajes[learning][moduleB]);
  assert.equal(after.parte_diario_registros.find(r => r.id === diary).actividad_programada_id, genericB);
  assert.equal(after.parte_diario_registros.find(r => r.id === diary).unidad_didactica_id, unitB);
  const second = await migrateIndependentUnits(client, after, { dropLegacyColumn });
  if (dropLegacyColumn) assert.equal(second.units.length, 0);
  else assert(second.units.every(item => item.moduleIds.length <= 1));
  assert.deepEqual(second.copies, {});
  assert.deepEqual(await snapshotUnits(client), after, 'Repetir la migracion no cambia los datos');
  await client.query('SAVEPOINT unique_check');
  await assert.rejects(() => insert('competencia_unidades_didacticas', { competencia_id: compB, unidad_didactica_id: unitA }), error => error.code === '23505');
  await client.query('ROLLBACK TO SAVEPOINT unique_check');
  await client.query('UPDATE unidades_didacticas SET nombre=$1 WHERE id=$2', ['Cambio solo en A', unitA]);
  assert.equal((await client.query('SELECT nombre FROM unidades_didacticas WHERE id=$1', [unitB])).rows[0].nombre, 'Unidad antes compartida');
  console.log('Migracion local verificada: copias independientes, sesiones genericas y propias, contenidos, materiales, fases, evaluaciones, notas, cronogramas, parte diario, unicidad e idempotencia.');
} finally {
  await client.query('ROLLBACK');
  await client.end();
}
