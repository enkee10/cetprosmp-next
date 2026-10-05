import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { expectedCompetenciaType, isProgramaEstudio, orderedUnidadRelations, employabilityCodeForUnidad } from '../functions/lib/modules/competencias/model.js';

const root = path.resolve(import.meta.dirname, '..');
const require = createRequire(new URL('../functions/package.json', import.meta.url));
const { initializeApp } = require('firebase-admin/app');
const { getDataConnect } = require('firebase-admin/data-connect');
if (process.env.DATA_CONNECT_EMULATOR_HOST || process.env.FIREBASE_DATA_CONNECT_EMULATOR_HOST) throw new Error('Quite la configuracion de emuladores para esta migracion remota.');
const dc = getDataConnect({serviceId:'cetprosmp-2026-service',location:'us-central1'},initializeApp({projectId:'cetprosmp-2026'}));
const query = async (source,variables) => (await dc.executeGraphql(source,{variables})).data;
const backupPath = path.join(root,'tmp','competencia-unidades-backup-20261005.json');
const reportPath = path.join(root,'tmp','competencia-unidades-report-20261005.json');
const write = (file,data) => { fs.mkdirSync(path.dirname(file),{recursive:true}); fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n','utf8'); };
const snapshotQuery = `query CompetenciaUnidadBackup {
  modulos(limit:10000) { id titulo horas planId plan { carrera { tipoCarrera { nombre } } } }
  planModulos(limit:50000) { id planId moduloId plan { carrera { tipoCarrera { nombre } } } }
  competencias(limit:10000) { id nombre tipo moduloId }
  competenciaCapacidades(limit:50000) { id competenciaId capacidadTerminalId }
  unidadDidacticaModulos(limit:50000) { id moduloId unidadDidacticaId orden }
  unidadesDidacticas(limit:50000) { id nombre duracion creditos sigla comun }
  capacidadesTerminales(limit:50000) { id descripcion sigla orden unidadDidacticaId }
  indicadoresCapacidad(limit:100000) { id descripcion sigla orden capacidadTerminalId }
  grupoModuloUnidadesDidacticas(limit:50000) { id grupoModuloId unidadDidacticaId orden }
  capacidadesTerminalesEstudiantes(limit:100000) { id matriculaId capacidadTerminalId promedio }
  indicadoresCapacidadEstudiantes(limit:100000) { id matriculaId indicadorCapacidadId promedio }
  unidadesDidacticasEstudiantes(limit:100000) { id matriculaId unidadDidacticaId promedio }
}`;

const preservedQuery = `query PreservedUnidadData {
  modulos(limit:10000) { id titulo horas planId plan { carrera { tipoCarrera { nombre } } } }
  planModulos(limit:50000) { id planId moduloId plan { carrera { tipoCarrera { nombre } } } }
  unidadesDidacticas(limit:50000) { id nombre duracion creditos sigla comun }
  capacidadesTerminales(limit:50000) { id descripcion sigla orden unidadDidacticaId }
  indicadoresCapacidad(limit:100000) { id descripcion sigla orden capacidadTerminalId }
  grupoModuloUnidadesDidacticas(limit:50000) { id grupoModuloId unidadDidacticaId orden }
  capacidadesTerminalesEstudiantes(limit:100000) { id matriculaId capacidadTerminalId promedio }
  indicadoresCapacidadEstudiantes(limit:100000) { id matriculaId indicadorCapacidadId promedio }
  unidadesDidacticasEstudiantes(limit:100000) { id matriculaId unidadDidacticaId promedio }
}`;
const sorted = rows => rows.slice().sort((a,b)=>a.id-b.id);

function buildPlan(data) {
  const XLSX=require(path.join(root,'tmp/oo-xlsx-reader/node_modules/xlsx'));
  const workbook=XLSX.readFile(String.raw`G:\Mi unidad\_Desarrollo2\Files cetprosmp-strapi\Tablas - datos\Programaciones 2026\Semestre2\CONSOLIDADO_PROGRAMAS_DE_ESTUDIO_PERIODO_2.xlsx`);
  const excel=XLSX.utils.sheet_to_json(workbook.Sheets.Consolidado,{header:1,defval:''}).slice(1);
  const sourceName = code => {
    const counts=new Map();
    for(const row of excel) if(new RegExp(`^CE\\s*${code}\\b`,'i').test(String(row[10]))) counts.set(String(row[10]),(counts.get(String(row[10]))??0)+1);
    return [...counts].sort((a,b)=>b[1]-a[1])[0]?.[0] ?? '';
  };
  const modules=[];const unresolved=[];
  for(const modulo of data.modulos) {
    const relations=orderedUnidadRelations(data.unidadDidacticaModulos.filter(r=>r.moduloId===modulo.id));
    const types=[modulo.plan,...data.planModulos.filter(r=>r.moduloId===modulo.id).map(r=>r.plan)].map(p=>p?.carrera?.tipoCarrera?.nombre).filter(Boolean);
    const programa=types.length>0 && types.every(isProgramaEstudio);
    if(relations.length && (!types.length || types.some(isProgramaEstudio)!==types.every(isProgramaEstudio) || (programa && !(modulo.horas>0)))) {
      unresolved.push({moduloId:modulo.id,titulo:modulo.titulo,reason:'Falta tipo de carrera consistente u horas del modulo'});continue;
    }
    if(new Set(relations.map(r=>r.orden)).size!==relations.length || relations.some(r=>r.orden==null)) {
      if(relations.length) { unresolved.push({moduloId:modulo.id,titulo:modulo.titulo,reason:'Orden de unidades ambiguo'});continue; }
    }
    const competencias=data.competencias.filter(c=>c.moduloId===modulo.id);
    const unidadIds=relations.map(r=>r.unidadDidacticaId);
    const assignments=relations.map(relation=>{
      const unidad=data.unidadesDidacticas.find(u=>u.id===relation.unidadDidacticaId);
      const tipo=expectedCompetenciaType(programa,modulo.horas,unidadIds,unidad.id);
      const code=tipo==='EMPLEABILIDAD' ? employabilityCodeForUnidad(unidad.nombre??'') : null;
      let competencia=competencias.find(c=>c.tipo===tipo && code && new RegExp(`^CE\\s*${code}\\b`,'i').test(c.nombre));
      if(!competencia && !code) competencia=competencias.find(c=>c.tipo===tipo);
      if(!competencia) {
        const nombre=code ? sourceName(code) : '';
        competencia=competencias.find(c=>c.tipo===tipo && c.nombre===nombre) ?? {moduloId:modulo.id,nombre,tipo};
        if(!competencias.includes(competencia)) competencias.push(competencia);
      }
      return {id:relation.id,orden:relation.orden,unidadDidacticaId:unidad.id,unidad:unidad.nombre,tipo,competencia};
    });
    modules.push({id:modulo.id,titulo:modulo.titulo,horas:modulo.horas,programa,assignments});
  }
  return {modules,unresolved};
}

async function runMigration(apply) {
  const {data}=JSON.parse(fs.readFileSync(backupPath,'utf8'));
  const plan=buildPlan(data);
  console.log(JSON.stringify({modules:plan.modules.filter(m=>m.assignments.length).length,relaciones:plan.modules.reduce((n,m)=>n+m.assignments.length,0),empleabilidad:plan.modules.reduce((n,m)=>n+m.assignments.filter(a=>a.tipo==='EMPLEABILIDAD').length,0),nuevasCompetencias:plan.modules.flatMap(m=>m.assignments.map(a=>a.competencia)).filter(c=>!c.id).reduce((set,c)=>set.add(`${c.moduloId}:${c.tipo}:${c.nombre}`),new Set()).size,unresolved:plan.unresolved},null,2));
  if(!apply) {write(reportPath,{applied:false,...plan});return;}
  assert.equal(plan.unresolved.length,0,'Hay modulos sin clasificacion segura');
  const before=await query(preservedQuery);
  for(const [key,rows]of Object.entries(before)) assert.deepEqual(sorted(rows),sorted(data[key]),`Datos cambiaron desde el respaldo: ${key}`);
  const existing=await query(`query CurrentCompetenciaUnits {
    competencias(limit:10000) { id nombre tipo moduloId }
    competenciaUnidadesDidacticas(limit:50000) { id competenciaId unidadDidacticaId orden competencia { moduloId tipo } }
  }`);
  for(const module of plan.modules) {
    const definitions=[];const variables={};const fields=[];
    for(const assignment of module.assignments) {
      let competencia=existing.competencias.find(c=>c.moduloId===module.id && c.tipo===assignment.tipo && c.nombre===assignment.competencia.nombre);
      if(!competencia) {
        const created=await query(`mutation MigrationCompetencia($data:Competencia_Data! @allow(fields:"nombre tipo moduloId")) { competencia_insert(data:$data) }`,{data:{moduloId:module.id,tipo:assignment.tipo,nombre:assignment.competencia.nombre}});
        competencia={...assignment.competencia,id:created.competencia_insert.id};existing.competencias.push(competencia);
      }
      assignment.competencia=competencia;
      const previous=existing.competenciaUnidadesDidacticas.find(r=>r.id===assignment.id);
      if(previous) {
        assert.equal(previous.competenciaId,competencia.id);assert.equal(previous.unidadDidacticaId,assignment.unidadDidacticaId);assert.equal(previous.orden,assignment.orden);continue;
      }
      definitions.push(`$u${assignment.id}:CompetenciaUnidadDidactica_Data! @allow(fields:"id competenciaId unidadDidacticaId orden")`);
      variables[`u${assignment.id}`]={id:assignment.id,competenciaId:competencia.id,unidadDidacticaId:assignment.unidadDidacticaId,orden:assignment.orden};
      fields.push(`u${assignment.id}:competenciaUnidadDidactica_insert(data:$u${assignment.id})`);
    }
    if(fields.length) await query(`mutation MigrateUnidadModule${module.id}(${definitions.join(',')}) @transaction {${fields.join('\n')}}`,variables);
    if(module.assignments.length) console.log(`Verificado modulo ${module.id}: ${module.assignments.length} unidades.`);
  }
  await verify(plan,data);
}

async function verify(plan,data) {
  const after=await query(preservedQuery);
  for(const [key,rows]of Object.entries(after)) assert.deepEqual(sorted(rows),sorted(data[key]),`Datos alterados: ${key}`);
  const final=await query(`query VerifyUnidadCompetencias {
    competencias(limit:10000) { id nombre tipo moduloId }
    competenciaUnidadesDidacticas(limit:50000) { id competenciaId unidadDidacticaId orden competencia { moduloId tipo } }
  }`);
  for(const original of data.competencias) assert.deepEqual(final.competencias.find(c=>c.id===original.id),original,'Competencia original alterada');
  assert.equal(final.competenciaUnidadesDidacticas.length,data.unidadDidacticaModulos.length);
  for(const module of plan.modules) for(const assignment of module.assignments) {
    const actual=final.competenciaUnidadesDidacticas.find(r=>r.id===assignment.id);
    assert.ok(actual);assert.equal(actual.unidadDidacticaId,assignment.unidadDidacticaId);assert.equal(actual.orden,assignment.orden);
    assert.equal(actual.competencia.moduloId,module.id);assert.equal(actual.competencia.tipo,assignment.tipo);
  }
  const used=new Set(final.competenciaUnidadesDidacticas.map(r=>r.competenciaId));
  write(reportPath,{applied:true,verifiedAt:new Date().toISOString(),...plan,totals:{competencias:final.competencias.length,relaciones:final.competenciaUnidadesDidacticas.length},competenciasSinUnidades:final.competencias.filter(c=>!used.has(c.id)),preservedCounts:Object.fromEntries(Object.entries(after).map(([key,rows])=>[key,rows.length]))});
  console.log('Verificacion completa: unidades, capacidades, indicadores, grupos y notas conservados.');
}

if(process.argv.includes('--snapshot')) {
  if(fs.existsSync(backupPath)) throw new Error('El respaldo ya existe y no se sobreescribira.');
  const data=await query(snapshotQuery); write(backupPath,{createdAt:new Date().toISOString(),data});
  console.log(JSON.stringify({counts:Object.fromEntries(Object.entries(data).map(([k,v])=>[k,v.length])),modules:data.modulos.map(m=>({id:m.id,titulo:m.titulo,horas:m.horas,tipo:m.plan?.carrera?.tipoCarrera?.nombre,unidades:data.unidadDidacticaModulos.filter(r=>r.moduloId===m.id).sort((a,b)=>(a.orden??a.id)-(b.orden??b.id)||a.unidadDidacticaId-b.unidadDidacticaId||a.id-b.id).map(r=>({id:r.unidadDidacticaId,orden:r.orden,nombre:data.unidadesDidacticas.find(u=>u.id===r.unidadDidacticaId)?.nombre}))}))},null,2));
} else if(process.argv.includes('--preview')||process.argv.includes('--apply')) {
  await runMigration(process.argv.includes('--apply'));
} else if(process.argv.includes('--verify')) {
  const report=JSON.parse(fs.readFileSync(reportPath,'utf8'));
  const {data}=JSON.parse(fs.readFileSync(backupPath,'utf8'));
  await verify(report,data);
} else {
  console.log('Use --snapshot para guardar el respaldo inicial.');
}
