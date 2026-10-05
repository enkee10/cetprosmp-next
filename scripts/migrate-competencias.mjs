import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
throw new Error('Migracion historica sustituida: use migrate-competencia-unidades.mjs. No vuelva a crear relaciones directas con capacidades.');
import { expectedCompetenciaType, isProgramaEstudio, orderedCapacidadIds } from '../functions/lib/modules/competencias/model.js';

const require = createRequire(new URL('../functions/package.json', import.meta.url));
const { initializeApp } = require('firebase-admin/app');
const { getDataConnect } = require('firebase-admin/data-connect');
const root = path.resolve(import.meta.dirname, '..');
const backupPath = path.join(root, 'tmp', 'competencias-migration-backup-20261005.json');
const reportPath = path.join(root, 'tmp', 'competencias-migration-report-20261005.json');
if (process.env.DATA_CONNECT_EMULATOR_HOST || process.env.FIREBASE_DATA_CONNECT_EMULATOR_HOST) {
  throw new Error('La migracion debe apuntar al servicio remoto, sin emuladores.');
}
const dc = getDataConnect({ serviceId: 'cetprosmp-2026-service', location: 'us-central1' }, initializeApp({ projectId: 'cetprosmp-2026' }));
const query = async (source, variables) => (await dc.executeGraphql(source, { variables })).data;
const write = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', 'utf8');
};
const legacyQuery = `query BackupCompetencias {
  modulos(limit:10000, orderBy:{id:ASC}) { id titulo tituloComercial orden competencia tipoCompetencia planId plan { carrera { id nombre tipoCarrera { id nombre } } } }
  planModulos(limit:50000) { id moduloId planId plan { carrera { id nombre tipoCarrera { id nombre } } } }
  unidadDidacticaModulos(limit:50000) { id moduloId unidadDidacticaId orden }
  unidadesDidacticas(limit:50000) { id nombre duracion creditos sigla comun }
  capacidadesTerminales(limit:50000) { id descripcion sigla orden unidadDidacticaId }
  indicadoresCapacidad(limit:100000) { id descripcion sigla orden capacidadTerminalId }
  capacidadesTerminalesEstudiantes(limit:100000) { id matriculaId capacidadTerminalId }
}`;

function buildMigrationPlan(data) {
  const XLSX = require(path.join(root, 'tmp/oo-xlsx-reader/node_modules/xlsx'));
  const excelFile = String.raw`G:\Mi unidad\_Desarrollo2\Files cetprosmp-strapi\Tablas - datos\Programaciones 2026\Semestre2\CONSOLIDADO_PROGRAMAS_DE_ESTUDIO_PERIODO_2.xlsx`;
  const workbook = XLSX.readFile(excelFile);
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets.Consolidado, { header:1, defval:'' }).slice(1);
  const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const employability = rows.filter(r => normalize(r[9]).includes('empleabilidad') && String(r[10]).trim());
  const modules = [];
  for (const modulo of data.modulos) {
    const carreraTypes = [modulo.plan, ...data.planModulos.filter(r=>r.moduloId === modulo.id).map(r=>r.plan)]
      .map(p=>p?.carrera?.tipoCarrera?.nombre).filter(Boolean);
    const programa = carreraTypes.length > 0 && carreraTypes.every(isProgramaEstudio);
    const capacidadIds = orderedCapacidadIds(data.unidadDidacticaModulos.filter(r=>r.moduloId === modulo.id),data.capacidadesTerminales);
    if (!String(modulo.competencia ?? '').trim() && !capacidadIds.length) {
      modules.push({ id:modulo.id, titulo:modulo.titulo, skipped:true, reason:'Sin competencia ni capacidades previas' }); continue;
    }
    const competencias = [];
    const original = String(modulo.competencia ?? '').trim();
    // Keep every legacy technical statement, including multi-UC text, verbatim in the new entity.
    if (original) competencias.push({ nombre:original, tipo:'TECNICA', capacidadIds:[] });
    for (const capacidadId of capacidadIds) {
      const capacidad = data.capacidadesTerminales.find(c=>c.id === capacidadId);
      const tipo = expectedCompetenciaType(programa, capacidadIds, capacidadId);
      let nombre = original;
      let fallback = false;
      if (tipo === 'EMPLEABILIDAD') {
        const text = normalize(capacidad.descripcion);
        const code = String(capacidad.descripcion ?? '').match(/CE\s*(\d+)/i)?.[1];
        const unit = normalize(data.unidadesDidacticas.find(u=>u.id===capacidad.unidadDidacticaId)?.nombre);
        const expectedCode = code || (unit.includes('etico') ? '4' : unit.includes('negocio') || unit.includes('emprend') ? '3' : unit.includes('comunic') ? '1' : unit.includes('informatic') || unit.includes('tic') ? '2' : null);
        const exact = employability.find(r => normalize(r[18]) === text);
        const candidates = employability.filter(r => expectedCode && new RegExp(`^ce\\s*${expectedCode}\\b`,'i').test(String(r[10])));
        const counts = new Map(); for (const row of candidates) counts.set(String(row[10]),(counts.get(String(row[10]))??0)+1);
        nombre = String(exact?.[10] || [...counts].sort((a,b)=>b[1]-a[1])[0]?.[0] || '');
        fallback = !exact && !counts.size;
      } else if (!nombre) {
        const sourceNames = [...new Set(rows.filter(r => normalize(r[8]).includes(normalize(modulo.titulo)) && !normalize(r[9]).includes('empleabilidad')).map(r=>String(r[10]).trim()).filter(Boolean))];
        nombre = sourceNames.join('\n\n'); fallback = !nombre;
      }
      let competencia = competencias.find(c=>c.nombre === nombre && c.tipo === tipo);
      if (!competencia) { competencia = { nombre, tipo, capacidadIds:[], fallback }; competencias.push(competencia); }
      competencia.capacidadIds.push(capacidadId);
    }
    modules.push({ id:modulo.id, titulo:modulo.titulo, programa, competencias });
  }
  return modules;
}

const preservedQuery = `query PreservedAcademicData {
  unidadDidacticaModulos(limit:50000) { id moduloId unidadDidacticaId orden }
  unidadesDidacticas(limit:50000) { id nombre duracion creditos sigla comun }
  capacidadesTerminales(limit:50000) { id descripcion sigla orden unidadDidacticaId }
  indicadoresCapacidad(limit:100000) { id descripcion sigla orden capacidadTerminalId }
  capacidadesTerminalesEstudiantes(limit:100000) { id matriculaId capacidadTerminalId }
}`;
const gradesQuery = `query PreservedGrades {
  capacidadesTerminalesEstudiantes(limit:100000) { id matriculaId capacidadTerminalId promedio }
  indicadoresCapacidadEstudiantes(limit:100000) { id matriculaId indicadorCapacidadId promedio }
}`;
const sortRows = rows => rows.slice().sort((a,b)=>a.id-b.id);

async function migrate(apply) {
  const { data } = JSON.parse(fs.readFileSync(backupPath,'utf8'));
  const modules = buildMigrationPlan(data);
  write(reportPath, { applied:false, modules });
  console.log(JSON.stringify({ modules:modules.filter(m=>!m.skipped).length, competencias:modules.flatMap(m=>m.competencias??[]).length,
    links:modules.flatMap(m=>m.competencias??[]).reduce((sum,c)=>sum+c.capacidadIds.length,0),
    skipped:modules.filter(m=>m.skipped), fallback:modules.flatMap(m=>(m.competencias??[]).filter(c=>c.fallback).map(c=>({modulo:m.titulo,nombre:c.nombre}))) },null,2));
  if (!apply) return;
  const current = await query(preservedQuery);
  for (const [key, value] of Object.entries(current)) assert.deepEqual(sortRows(value),sortRows(data[key]),`Datos cambiaron desde el respaldo: ${key}`);
  const grades = await query(gradesQuery);
  const gradesPath = path.join(root,'tmp','competencias-grades-backup-20261005.json');
  if (!fs.existsSync(gradesPath)) write(gradesPath,grades);
  else for (const [key, value] of Object.entries(grades)) assert.deepEqual(sortRows(value),sortRows(JSON.parse(fs.readFileSync(gradesPath,'utf8'))[key]),`Notas cambiaron desde el respaldo: ${key}`);
  const existing = await query(`query ExistingCompetencias { competencias(limit:10000) { id nombre tipo moduloId } competenciaCapacidades(limit:50000) { id competenciaId capacidadTerminalId } }`);
  for (const module of modules.filter(m=>!m.skipped)) {
    const fields=[]; const variables={}; const definitions=[];
    module.competencias.forEach((competencia,index)=>{
      const previous = existing.competencias.find(c=>c.moduloId === module.id && c.nombre === competencia.nombre && c.tipo === competencia.tipo);
      if (!previous) {
        definitions.push(`$c${index}:Competencia_Data! @allow(fields:"nombre tipo moduloId")`); variables[`c${index}`]={nombre:competencia.nombre,tipo:competencia.tipo,moduloId:module.id};
        fields.push(`c${index}:competencia_insert(data:$c${index})`);
      }
      for (const capacidadId of competencia.capacidadIds) {
        if (previous && existing.competenciaCapacidades.some(r=>r.competenciaId === previous.id && r.capacidadTerminalId === capacidadId)) continue;
        fields.push(`r${index}_${capacidadId}:competenciaCapacidad_insert(data:{${previous ? `competenciaId:${previous.id}` : `competenciaId_expr:"response.c${index}.id"`},capacidadTerminalId:${capacidadId}})`);
      }
    });
    if (fields.length) await query(`mutation MigrateModule${module.id}${definitions.length ? '('+definitions.join(',')+')' : ''} @transaction { ${fields.join('\n')} }`,variables);
    console.log(`Migrado modulo ${module.id}: ${module.titulo}`);
  }
  const after = await query(preservedQuery);
  for (const [key, value] of Object.entries(after)) assert.deepEqual(sortRows(value),sortRows(data[key]),`Datos alterados: ${key}`);
  const afterGrades = await query(gradesQuery);
  for (const [key, value] of Object.entries(afterGrades)) assert.deepEqual(sortRows(value),sortRows(grades[key]),`Notas alteradas: ${key}`);
  const final = await query(`query VerifyCompetencias { competencias(limit:10000) { id nombre tipo moduloId } competenciaCapacidades(limit:50000) { id competenciaId capacidadTerminalId } }`);
  for (const module of modules.filter(m=>!m.skipped)) for (const competencia of module.competencias) {
    const record = final.competencias.find(c=>c.moduloId===module.id && c.nombre===competencia.nombre && c.tipo===competencia.tipo);
    assert.ok(record,`Competencia ausente del modulo ${module.id}`);
    for (const capacidadId of competencia.capacidadIds) assert.ok(final.competenciaCapacidades.some(r=>r.competenciaId===record.id && r.capacidadTerminalId===capacidadId));
  }
  write(reportPath,{applied:true,verifiedAt:new Date().toISOString(), modules,preservedCounts:Object.fromEntries(Object.entries(after).map(([key,value])=>[key,value.length])),gradeCounts:Object.fromEntries(Object.entries(afterGrades).map(([key,value])=>[key,value.length])),totals:{competencias:final.competencias.length,relaciones:final.competenciaCapacidades.length}});
  console.log('Verificacion completa: datos, identificadores, indicadores y notas conservados.');
}

if (process.argv.includes('--permissions')) {
  const state = await query(`query CompetenciaPermissions { rolePermissions(where:{entity:{in:["capacidades-terminales","competencias"]}},limit:10000) { roleId entity canView canCreate canEdit canDelete } }`);
  const permissionsBackup = path.join(root,'tmp','competencias-permissions-backup-20261005.json');
  if (!fs.existsSync(permissionsBackup)) write(permissionsBackup,state);
  let inserted = 0;
  for (const permission of state.rolePermissions.filter(p=>p.entity === 'capacidades-terminales')) {
    if (state.rolePermissions.some(p=>p.entity === 'competencias' && p.roleId === permission.roleId)) continue;
    await query(`mutation AddCompetenciaPermission($data:RolePermission_Data! @allow(fields:"roleId entity canView canCreate canEdit canDelete")) { rolePermission_insert(data:$data) }`,{data:{...permission,entity:'competencias'}});
    inserted++;
  }
  console.log(`Permisos de competencias agregados para ${inserted} roles, con los mismos permisos de capacidades.`);
} else if (process.argv.includes('--snapshot')) {
  if (fs.existsSync(backupPath)) throw new Error('El respaldo ya existe; no se sobreescribira.');
  const data = await query(legacyQuery);
  write(backupPath, { createdAt: new Date().toISOString(), data });
  console.log(JSON.stringify({ backupPath, counts: Object.fromEntries(Object.entries(data).map(([key, value]) => [key, value.length])), modules: data.modulos.map(m => ({ id:m.id, titulo:m.titulo, tipo:m.plan?.carrera?.tipoCarrera?.nombre, competencia:m.competencia })) }, null, 2));
} else if (process.argv.includes('--preview') || process.argv.includes('--apply')) {
  await migrate(process.argv.includes('--apply'));
} else {
  console.log('Opciones: --snapshot (antes de quitar las columnas antiguas), --preview, --apply, --permissions.');
}
