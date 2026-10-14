import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

// This administrative bulk operation uses PostgreSQL row/table locks so that
// enrollment numbers, backups and deletion checks share one consistent snapshot.
// Dry-run by default. --apply --delete-legacy is authorized for the 2026-2 change.
const require = createRequire(new URL('../tmp/cloudsql-tools/package.json', import.meta.url));
const { Connector, AuthTypes, IpAddressTypes } = require('@google-cloud/cloud-sql-connector');
const { Pool } = require('pg');
const connector = new Connector();
const apply = process.argv.includes('--apply');
const deleteLegacy = process.argv.includes('--delete-legacy');
const backupDir = new URL('../backups/grupos-etapas-20261014/', import.meta.url);
const tables = ['grupos', 'grupo_modulos', 'turnos', 'horarios', 'semestres', 'modulos', 'competencias', 'unidades_didacticas', 'calendarios',
  'competencia_unidades_didacticas', 'actividades', 'aprendizajes', 'indicadores_capacidad', 'capacidades_terminales',
  'matriculas', 'matricula_users', 'modulos_estudiantes', 'grupo_modulo_unidades_didacticas',
  'grupo_modulo_jornadas', 'grupo_modulo_actividades', 'parte_diario_registros', 'registro_academico_documentos',
  'certificado_titulo_documentos', 'certificados', 'programaciones_horarias', 'efsrt_ppp_practicas',
  'efsrt_ppp_estudiantes', 'matricula_cambios_modulo', 'eventos', 'evento_relaciones', 'evento_ocurrencias'];
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const plusDay = d => new Date(Date.parse(d + 'T12:00:00Z') + 86400000).toISOString().slice(0, 10);
const dateInLima = value => new Date(Date.parse(value) - 5 * 3600000).toISOString().slice(0, 10);
const midnight = d => `${d}T05:00:00.000Z`;
let pool;

function makeRomeoDays(events, end) {
  const blocked = new Set();
  for (const e of events) if (e.calendario_id === 21 && e.estado !== 'cancelado'
    && ['feriado', 'gestion', 'vacaciones_gestion'].includes(e.tipo_evento)) {
    for (let d = dateInLima(e.fecha_inicio); d < dateInLima(e.fecha_fin); d = plusDay(d)) blocked.add(d);
  }
  const days = [];
  for (let d = '2026-10-22'; d <= end; d = plusDay(d)) {
    if (![0, 6].includes(new Date(d + 'T12:00:00Z').getUTCDay()) && !blocked.has(d)) days.push(d);
  }
  assert.equal(days.length, 42, 'Calendar changed: review available teaching days');
  // 30 curricular days x 7 h = 210 h; PPP 6 x 7 h + 6 x 8 h = 90 h.
  return days.map((fecha, i) => {
    const horas = i >= 36 ? 8 : 7;
    const inicio = new Date(`${fecha}T16:15:00-05:00`).toISOString();
    return { fecha, tipo: i < 30 ? 'curricular' : 'ppp', inicio,
      fin: new Date(Date.parse(inicio) + horas * 45 * 60000).toISOString(),
      horas, horas_curriculares: i < 30 ? horas : 0, pendiente: false };
  });
}

function curriculum(data, moduleId) {
  const compet = data.competencias.filter(c => c.modulo_id === moduleId);
  const links = data.competencia_unidades_didacticas.filter(l => compet.some(c => c.id === l.competencia_id));
  const units = [...new Map(links.map(l => [l.unidad_didactica_id, {
    id: l.unidad_didactica_id, orden: l.orden,
    employ: compet.find(c => c.id === l.competencia_id).tipo === 'EMPLEABILIDAD'
      || /gestion empresarial|emprendimiento|plan de negocio/.test((data.unidades_didacticas.find(u => u.id === l.unidad_didactica_id)?.nombre ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()),
  }])).values()].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || a.id - b.id);
  const capacities = new Map(data.capacidades_terminales.map(r => [r.id, r.unidad_didactica_id]));
  const indicators = new Map(data.indicadores_capacidad.map(r => [r.id, capacities.get(r.capacidad_terminal_id)]));
  const learning = new Map(data.aprendizajes.map(r => [r.id, indicators.get(r.indicador_capacidad_id)]));
  const activities = data.actividades.filter(a => a.modulo_id === moduleId || a.modulo_id == null)
    .map(a => ({ ...a, unitId: learning.get(a.aprendizaje_id) }))
    .filter(a => units.some(u => u.id === a.unitId))
    .sort((a, b) => units.findIndex(u => u.id === a.unitId) - units.findIndex(u => u.id === b.unitId)
      || (a.orden ?? a.numero_sesion ?? a.id) - (b.orden ?? b.numero_sesion ?? b.id) || a.id - b.id);
  assert.ok(units.length, `Missing units for module ${moduleId}`);
  // Module 31 exists with its units but has no syllabus activities yet.
  // Preserve that absence rather than copying activities belonging to Melamina.
  if (!activities.length) return { units, activities: [] };
  const segments = [];
  for (const employ of [false, true]) {
    const list = activities.filter(a => units.find(u => u.id === a.unitId).employ === employ);
    assert.ok(list.length, 'Missing technical/employment activities');
    const total = (employ ? 30 : 180) * 45;
    const weight = list.reduce((n, a) => n + (a.duracion || 1), 0);
    let allocated = 0;
    list.forEach((a, i) => {
      const minutes = i === list.length - 1 ? total - allocated : Math.floor(total * (a.duracion || 1) / weight);
      assert.ok(minutes > 0); allocated += minutes;
      segments.push({ activityId: a.id, unitId: a.unitId, minutes });
    });
  }
  return { units, activities: segments };
}

function schedule(data, moduleId, days) {
  const { units, activities } = curriculum(data, moduleId);
  if (!activities.length) return { rows: [], pendingSyllabus: true, units: units.map(u => ({
    unidad_didactica_id: u.id, orden: u.orden, inicio: null, fin: null,
  })) };
  const slots = days.filter(d => d.horas_curriculares > 0)
    .map(d => ({ ...d, minutes: Math.round(d.horas_curriculares * 45) }));
  assert.equal(slots.reduce((n, d) => n + d.minutes, 0), 210 * 45);
  const rows = []; let index = 0, used = 0;
  for (const a of activities) {
    let left = a.minutes, segmento = 1;
    while (left) {
      const slot = slots[index]; assert.ok(slot, 'Activities exceed teaching capacity');
      const minutes = Math.min(left, slot.minutes - used);
      const start = Date.parse(slot.inicio) + used * 60000;
      rows.push({ actividad_id: a.activityId, unitId: a.unitId, segmento: segmento++,
        inicio: new Date(start).toISOString(), fin: new Date(start + minutes * 60000).toISOString() });
      left -= minutes; used += minutes;
      if (used === slot.minutes) { index++; used = 0; }
    }
  }
  assert.equal(index, slots.length); assert.equal(used, 0);
  return { rows, units: units.map(u => {
    const relevant = rows.filter(r => r.unitId === u.id);
    return { unidad_didactica_id: u.id, orden: u.orden,
      inicio: midnight(dateInLima(relevant[0].inicio)), fin: midnight(dateInLima(relevant.at(-1).fin)) };
  }) };
}

async function insert(client, table, rows) {
  if (!rows.length) return [];
  assert.ok(tables.includes(table));
  const keys = Object.keys(rows[0]); assert.ok(keys.every(k => /^[a-z_]+$/.test(k)));
  const values = [];
  const tuples = rows.map(row => '(' + keys.map(k => { values.push(row[k]); return '$' + values.length; }).join(',') + ')');
  return (await client.query(`INSERT INTO public.${table} (${keys.join(',')}) VALUES ${tuples.join(',')} RETURNING *`, values)).rows;
}

try {
  const options = await connector.getOptions({ instanceConnectionName: 'cetprosmp-2026:us-central1:cetprosmp-2026-instance', authType: AuthTypes.IAM, ipType: IpAddressTypes.PUBLIC });
  pool = new Pool({ ...options, user: 'enkee03@cetprosmp.edu.pe', database: 'cetprosmp-db', max: 1 });
  pool.on('error', e => { if (e.code !== 'ERRCLOSED') console.error(e.message); });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (apply) await client.query(`LOCK TABLE ${tables.map(t => 'public.' + t).join(',')} IN SHARE ROW EXCLUSIVE MODE`);
    const data = {};
    for (const t of tables) data[t] = (await client.query(`SELECT to_jsonb(t) AS row FROM public.${t} t ORDER BY id`)).rows.map(r => r.row);
    fs.mkdirSync(backupDir, { recursive: true });
    fs.writeFileSync(new URL(`before-${apply ? 'apply' : 'plan'}-${stamp}.json`, backupDir), JSON.stringify(data, null, 2), { flag: 'wx' });
    const richard = data.grupos.find(g => g.id === 165);
    const legacy = data.grupos.find(g => g.id === 167);
    const romelio = data.grupos.find(g => g.id === 175);
    assert.equal(richard.personal_id, 24); assert.equal(legacy.personal_id, 24); assert.equal(romelio.personal_id, 33);
    assert.equal(richard.semestre_id, 4); assert.equal(legacy.semestre_id, 4); assert.equal(romelio.semestre_id, 4);
    const melamina = data.grupo_modulos.find(g => g.grupo_id === 165);
    const oldModule = data.grupo_modulos.find(g => g.grupo_id === 167);
    const bordado = data.grupo_modulos.find(g => g.grupo_id === 175);
    assert.equal(melamina.modulo_id, 32); assert.equal(oldModule.modulo_id, 32); assert.equal(bordado.modulo_id, 14);
    assert.equal(data.modulos.find(m => m.id === 31).titulo_comercial, 'Carpintería en Madera');
    assert.equal(data.modulos.find(m => m.id === 14).horas, 300);
    assert.equal(data.modulos_estudiantes.filter(m => m.grupo_modulo_id === oldModule.id).length, 0);
    assert.equal(data.matriculas.filter(m => m.grupo_id === legacy.id).length, 0);
    assert.ok(!data.grupos.some(g => /oct-dic/.test(g.workspace_correo ?? '')), 'New groups already exist: review before repeating');
    const enrollments = data.modulos_estudiantes.filter(m => m.grupo_modulo_id === melamina.id)
      .map(m => data.matriculas.find(r => r.id === m.matricula_id));
    assert.ok(enrollments.every(m => m.user_id && m.semestre_id === 4 && !m.archivado));
    const students = [...new Set(enrollments.map(m => m.user_id))];
    const semesterEnd = data.semestres.find(s => s.id === 4).fin.slice(0, 10);
    assert.equal(semesterEnd, '2026-12-23');
    const romeDays = makeRomeoDays(data.eventos, semesterEnd);
    const richDays = data.grupo_modulo_jornadas.filter(j => j.grupo_modulo_id === oldModule.id)
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .map(({ fecha, tipo, inicio, fin, horas, horas_curriculares, pendiente }) => ({ fecha, tipo, inicio, fin, horas, horas_curriculares, pendiente: false }));
    assert.equal(richDays.reduce((n, d) => n + d.horas, 0), 300);
    assert.equal(romeDays.reduce((n, d) => n + d.horas, 0), 300);
    const romeSchedule = schedule(data, 14, romeDays);
    const richSchedule = schedule(data, 31, richDays);
    const { buildMatriculaSchedule, findMatriculaScheduleOverlap } = require('../../functions/lib/modules/core/matriculaSchedule.js');
    const toSchedule = gm => {
      const g = data.grupos.find(r => r.id === gm.grupo_id);
      const h = data.horarios.find(r => r.id === g.horario_id);
      const t = data.turnos.find(r => r.id === g.turno_id);
      const s = data.semestres.find(r => r.id === g.semestre_id);
      const c = data.calendarios.find(r => r.id === gm.calendario_id);
      return buildMatriculaSchedule({ id: gm.id, grupoId: g.id, moduloId: gm.modulo_id, inicio: gm.inicio, fin: gm.fin,
        calendario: c && { inicio: c.inicio, fechaIni: c.fecha_ini, fin: c.fin, fechaFin: c.fecha_fin },
        grupo: { id: g.id, nombreDisplay: g.nombre_display, semestre: { titulo: s.titulo, inicio: s.inicio, fin: s.fin },
          turno: { horaInicio: t.hora_inicio, horaFin: t.hora_fin }, horario: { nombre: h.nombre, regla: h.regla,
            diasSemana: h.dias_semana, viernesAlternoInicio: h.viernes_alterno_inicio } } });
    };
    const targetSchedule = toSchedule(oldModule);
    for (const me of data.modulos_estudiantes) {
      const mat = data.matriculas.find(m => m.id === me.matricula_id);
      if (mat?.semestre_id !== 4 || mat.archivado || !students.includes(mat.user_id)) continue;
      const gm = data.grupo_modulos.find(r => r.id === me.grupo_modulo_id);
      assert.ok(!findMatriculaScheduleOverlap(targetSchedule, toSchedule(gm)), `Existing enrollment ${mat.id} conflicts with Carpintería`);
    }
    const report = { applied: apply, semester: '2026-2', studentsFromMelamina: students.length,
      romelio: { first: '2026-08-10 / 2026-10-21', second: `2026-10-22 / ${semesterEnd}`, extendedShift: '16:15–22:15', academicHours: 300, teachingDays: romeDays.length },
      richard: { existingSchedulePreserved: true, moduloId: 31, suffix: '(oct-dic)', start: oldModule.inicio, end: oldModule.fin, pendingSyllabus: !!richSchedule.pendingSyllabus },
      deleteLegacy, legacySignedRecords: data.parte_diario_registros.filter(r => r.grupo_modulo_id === oldModule.id).length,
      legacyDocuments: data.registro_academico_documentos.filter(r => r.grupo_modulo_id === oldModule.id).length,
      legacyChangeHistoryRecords: data.matricula_cambios_modulo.filter(r => r.grupo_modulo_anterior_id === oldModule.id || r.grupo_modulo_nuevo_id === oldModule.id).length };
    if (!apply) { await client.query('ROLLBACK'); console.log(JSON.stringify(report)); }
    else {
      assert.ok(deleteLegacy, 'Explicit --delete-legacy required for the authorized historical-record deletion');
      const now = new Date().toISOString();
      const enlarged = data.turnos.find(t => t.nombre === 'Noche ampliada' && t.hora_inicio.includes('16:15'))
        ?? (await insert(client, 'turnos', [{ nombre: 'Noche ampliada', hora_inicio: '1970-01-01T16:15:00Z', hora_fin: '1970-01-01T22:15:00Z', estado: 'activo', fecha_creacion: now, fecha_actualizacion: now }]))[0];
      const groupData = (base, nombre, turnoId, correo, workspaceName) => ({
        turno: base.turno, descripcion: base.descripcion, nombre_display: nombre, estado: 'activo', archivado: false,
        fecha_creacion: now, fecha_actualizacion: now, semestre_id: 4, personal_id: base.personal_id,
        turno_id: turnoId, horario_id: base.horario_id, grupo_ord: base.grupo_ord, workspace_name: workspaceName, workspace_correo: correo,
      });
      const newRome = (await insert(client, 'grupos', [groupData(romelio,
        'Bordados Computarizado [Noche ampliada] Lun - Vie (Romelio Figueroa) (oct-dic)', enlarged.id,
        '26-2-bordados-oct-dic-romelio-figueroa@cetprosmp.edu.pe', ':26-2_2.9 Bordados Computarizado (oct-dic) - Romelio Figueroa')]))[0];
      await client.query('UPDATE public.grupos SET turno=$1 WHERE id=$2', ['Noche ampliada', newRome.id]);
      const newRich = (await insert(client, 'grupos', [groupData(legacy,
        'Carpintería en Madera [Noche] Mar, Jue, @Vie (Richard Ramos) (oct-dic)', legacy.turno_id,
        '26-2-madera-oct-dic-richard-ramos@cetprosmp.edu.pe', ':26-2_8.3 Carpintería en Madera (oct-dic) - Richard Ramos')]))[0];
      const romeGM = (await insert(client, 'grupo_modulos', [{ nombre: newRome.nombre_display, sufijo: '(oct-dic)', orden: 1, obligatorio: true, instancia: 1,
        inicio: midnight('2026-10-22'), fin: midnight(semesterEnd), grupo_id: newRome.id, modulo_id: 14, calendario_id: 21 }]))[0];
      const richGM = (await insert(client, 'grupo_modulos', [{ nombre: newRich.nombre_display, sufijo: '(oct-dic)', orden: 1, obligatorio: true, instancia: 1,
        inicio: oldModule.inicio, fin: oldModule.fin, grupo_id: newRich.id, modulo_id: 31, calendario_id: oldModule.calendario_id }]))[0];
      const firstName = 'Bordados Computarizado [Noche] Lun - Vie (Romelio Figueroa) (ago-oct)';
      await client.query('UPDATE public.grupos SET nombre_display=$1,estado=$2,fecha_actualizacion=$3 WHERE id=$4', [firstName, 'activo', now, romelio.id]);
      await client.query('UPDATE public.grupo_modulos SET nombre=$1,sufijo=$2,inicio=$3,fin=$4 WHERE id=$5', [firstName, '(ago-oct)', midnight('2026-08-10'), midnight('2026-10-21'), bordado.id]);
      for (const [gm, days, layout] of [[romeGM, romeDays, romeSchedule], [richGM, richDays, richSchedule]]) {
        await insert(client, 'grupo_modulo_jornadas', days.map(d => ({ ...d, pendiente: !!layout.pendingSyllabus && d.horas_curriculares > 0, grupo_modulo_id: gm.id })));
        await insert(client, 'grupo_modulo_unidades_didacticas', layout.units.map(u => ({ ...u, grupo_modulo_id: gm.id })));
        await insert(client, 'grupo_modulo_actividades', layout.rows.map(({ unitId, ...r }) => ({ ...r, grupo_modulo_id: gm.id })));
      }
      const existingCodes = data.matriculas.map(m => String(m.codigo_inscripcion ?? '')).filter(c => /^0437863\d{4}26$/.test(c));
      let sequence = Math.max(data.matriculas.filter(m => m.fecha && dateInLima(m.fecha).startsWith('2026')).length, ...existingCodes.map(c => Number(c.slice(7, 11))));
      const created = await insert(client, 'matriculas', students.map(user_id => ({ recibo: null, fecha: now, fecha_actualizacion: now,
        codigo_inscripcion: `0437863${String(++sequence).padStart(4, '0')}26`, archivado: false, grupo_id: newRich.id, semestre_id: 4, user_id })));
      await insert(client, 'matricula_users', created.map(m => ({ matricula_id: m.id, user_id: m.user_id })));
      await insert(client, 'modulos_estudiantes', created.map(m => ({ matricula_id: m.id, grupo_id: newRich.id, grupo_modulo_id: richGM.id, modulo_id: 31 })));
      const hiddenIds = data.grupos.filter(g => ![165, 175].includes(g.id)).map(g => g.id);
      await client.query('UPDATE public.grupos SET estado=$1,fecha_actualizacion=$2 WHERE id=ANY($3::int[])', ['inactivo', now, hiddenIds]);
      // The user expressly authorized deletion of the signed Parte Diario and document.
      // Reject unexpected student/document/history links before touching anything.
      for (const t of ['certificados', 'certificado_titulo_documentos', 'efsrt_ppp_estudiantes']) {
        assert.equal(data[t].filter(r => r.grupo_modulo_id === oldModule.id).length, 0, `Unexpected protected relation: ${t}`);
      }
      for (const change of data.matricula_cambios_modulo.filter(r => r.grupo_modulo_anterior_id === oldModule.id || r.grupo_modulo_nuevo_id === oldModule.id)) {
        // Historical departure from the empty group; the actual enrollment must
        // already belong elsewhere and stays untouched when its old log is removed.
        assert.ok(data.matriculas.find(m => m.id === change.matricula_id)?.grupo_id !== legacy.id);
        assert.ok(!data.modulos_estudiantes.some(m => m.matricula_id === change.matricula_id && m.grupo_modulo_id === oldModule.id));
      }
      assert.equal(data.programaciones_horarias.filter(r => r.grupo_modulo_id === oldModule.id).length, 0);
      await client.query('DELETE FROM public.matricula_cambios_modulo WHERE grupo_modulo_anterior_id=$1 OR grupo_modulo_nuevo_id=$1 OR grupo_anterior_id=$2 OR grupo_nuevo_id=$2', [oldModule.id, legacy.id]);
      for (const t of ['parte_diario_registros', 'registro_academico_documentos', 'grupo_modulo_actividades', 'grupo_modulo_jornadas', 'grupo_modulo_unidades_didacticas', 'efsrt_ppp_practicas']) {
        await client.query(`DELETE FROM public.${t} WHERE grupo_modulo_id=$1`, [oldModule.id]);
      }
      await client.query('DELETE FROM public.evento_relaciones WHERE entidad_tipo=$1 AND entidad_id=$2', ['grupo_modulo', oldModule.id]);
      await client.query('DELETE FROM public.evento_ocurrencias WHERE grupo_id=$1', [legacy.id]);
      await client.query('DELETE FROM public.evento_relaciones WHERE entidad_tipo=$1 AND entidad_id=$2', ['grupo', legacy.id]);
      await client.query('DELETE FROM public.grupo_modulos WHERE id=$1', [oldModule.id]);
      await client.query('DELETE FROM public.grupos WHERE id=$1', [legacy.id]);
      const afterMat = (await client.query('SELECT to_jsonb(m) AS row FROM public.matriculas m WHERE id=ANY($1::int[]) ORDER BY id', [data.matriculas.map(m => m.id)])).rows.map(r => r.row);
      assert.deepEqual(afterMat, data.matriculas, 'An original enrollment changed');
      const afterME = (await client.query('SELECT to_jsonb(m) AS row FROM public.modulos_estudiantes m WHERE id=ANY($1::int[]) ORDER BY id', [data.modulos_estudiantes.map(m => m.id)])).rows.map(r => r.row);
      assert.deepEqual(afterME, data.modulos_estudiantes, 'An original student module/grade changed');
      assert.deepEqual((await client.query('SELECT to_jsonb(g) AS row FROM public.grupos g WHERE id=165')).rows[0].row, richard, 'Original Melamina group changed');
      const visible = (await client.query("SELECT id FROM public.grupos WHERE estado='activo' ORDER BY id")).rows.map(g => g.id);
      assert.deepEqual(visible, [165, 175, newRome.id, newRich.id].sort((a,b)=>a-b));
      assert.equal(created.length, students.length);
      await client.query('COMMIT');
      Object.assign(report, { romelioGroupId: newRome.id, romelioGroupModuloId: romeGM.id, richardGroupId: newRich.id,
        richardGroupModuloId: richGM.id, deletedGroupId: legacy.id, disabledGroups: hiddenIds.length - 1, enrollmentsCreated: created.length,
        originalEnrollmentsPreserved: data.matriculas.length, originalStudentModulesPreserved: data.modulos_estudiantes.length, visibleGroups: visible });
      fs.writeFileSync(new URL('applied.json', backupDir), JSON.stringify(report, null, 2));
      console.log(JSON.stringify(report));
    }
  } catch (e) { await client.query('ROLLBACK'); throw e; }
  finally { client.release(); }
} finally { await pool?.end(); connector.close(); }
