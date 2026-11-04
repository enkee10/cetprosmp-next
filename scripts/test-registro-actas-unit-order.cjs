const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
process.env.GOOGLE_CLOUD_PROJECT='cetprosmp-2026';
const {curricularUnitIdsInOrder}=require('../functions/lib/modules/academico/curricularUnitOrder.js');
const compiled=ts.transpileModule(fs.readFileSync('src/lib/curricularCodes.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const front={exports:{}};new Function('module','exports',compiled)(front,front.exports);
const audited=JSON.parse(fs.readFileSync('tmp/orden-unidades-cabello-20261103/audit.json','utf8')).data;
const relations=audited.units;
const snapshot=structuredClone(relations);
const expected=[53,54,55,98,97];
assert.deepEqual(curricularUnitIdsInOrder({competenciaUnidadesDidacticas:relations}),expected);
const curriculumModule={competencias:relations.map(row=>row.competencia),unidadesDidacticas:relations.map(row=>({id:row.unidadDidacticaId,orden:row.orden,competenciaId:row.competenciaId,competencia:row.competencia}))};
assert.deepEqual(front.exports.curricularUnitsInOrder(curriculumModule).map(row=>row.id),expected);
assert.deepEqual(relations,snapshot,'Ordering must not change persisted positions');
assert.deepEqual(curricularUnitIdsInOrder({grupoModuloUnidadesDidacticas:[{unidadDidacticaId:9,orden:null},{unidadDidacticaId:4,orden:1},{unidadDidacticaId:4,orden:2}]}),[4,9],'Historical group links remain the fallback');
const explicit=[{unidadDidacticaId:1,orden:1,competencia:{id:3,orden:20}},{unidadDidacticaId:2,orden:9,competencia:{id:9,orden:1}},{unidadDidacticaId:3,orden:1,competencia:{id:9,orden:1}}];
assert.deepEqual(curricularUnitIdsInOrder({competenciaUnidadesDidacticas:explicit}),[3,2,1],'Competency position takes precedence over unit position and numeric ID');
const group={id:193,grupoId:200,moduloId:1,grupo:{semestreId:4},modulo:{titulo:audited.modulo.titulo,plan:{carrera:{tipoCarrera:{nombre:'Programa de Estudios'}}}}};
const fixture={grupoModulo:group,grupoModulos:[group],semestres:[{id:4,titulo:'2026-2'}],competenciaUnidadesDidacticas:relations,
 grupoModuloUnidadesDidacticas:[],unidadesDidacticas:relations.map(row=>({id:row.unidadDidacticaId,nombre:row.unidadDidactica.nombre,creditos:1,duracion:20})),
 capacidadesTerminales:relations.map(row=>({id:row.unidadDidacticaId+1000,unidadDidacticaId:row.unidadDidacticaId,descripcion:'Capacidad '+row.unidadDidactica.nombre,orden:1})),
 indicadoresCapacidad:relations.map(row=>({id:row.unidadDidacticaId+2000,capacidadTerminalId:row.unidadDidacticaId+1000,descripcion:'Indicador '+row.unidadDidactica.nombre,orden:1})),
 modulosEstudiantesByGrupoModulo:[{id:1,matriculaId:10,moduloId:1,grupoModuloId:193,matricula:{id:10,user:{nombre:'Estudiante de prueba'}}}],modulosEstudiantesLegacy:[],
 indicadorCapacidadEstudiantes:[{matriculaId:10,indicadorCapacidadId:2098,promedio:18},{matriculaId:10,indicadorCapacidadId:2097,promedio:12}],
 capacidadTerminalEstudiantes:[{matriculaId:10,capacidadTerminalId:1098,promedio:18},{matriculaId:10,capacidadTerminalId:1097,promedio:12}],
 unidadesDidacticasEstudiantes:[{matriculaId:10,unidadDidacticaId:98,promedio:18},{matriculaId:10,unidadDidacticaId:97,promedio:12}],
 efsrtPppEstudiantes:[],sesionesCurriculares:[],practicasProgramadas:[],jornadasProgramadas:[]};
const queries=[];
const dataConnect={executeGraphql:async source=>{
 assert(source.trim().startsWith('query'),'The test must not write data');queries.push(source);
 if(/query (RegistroAuxiliarContext|ReporteGrupoModuloSeed)/.test(source))return {data:{grupoModulo:group}};
 if(/query (RegistroAuxiliarDetail|ReporteDocumentoDetalle)/.test(source))return {data:structuredClone({...fixture,capacidadesTerminalesEstudiantes:fixture.capacidadTerminalEstudiantes})};
 throw Error('Unexpected database request: '+source.slice(0,100));
}};
function load(modulePath,extra=''){
 const filename=path.resolve(modulePath),loaded=new Module(filename,module);loaded.filename=filename;loaded.paths=Module._nodeModulePaths(path.dirname(filename));
 const originalRequire=loaded.require.bind(loaded);loaded.require=name=>{
  if(name==='../core/dataConnectCore.js')return {dataConnect};
  if(name==='../planes/periodSelection.js')return {applyPeriodSelection:async()=>{}};
  if(name==='../core/permissions.js')return {requirePermission:async()=>{},isSuperUserContext:()=>true,getRequesterRoleId:()=>600};
  return originalRequire(name);
 };
 loaded._compile(fs.readFileSync(filename,'utf8')+'\n'+extra,filename);return loaded.exports;
}
(async()=>{
 const registry=load('functions/lib/modules/registro-auxiliar/handlers.js');
 const register=await registry.getRegistroAuxiliar.run({grupoModuloId:193},{auth:{uid:'local-order-test',token:{level:600}}});
 assert.deepEqual(register.estructura.map(unit=>unit.id),expected);
 assert.deepEqual(register.notas.map(row=>[row.indicadorCapacidadId,row.promedio]),[[2098,18],[2097,12]]);
 const reports=load('functions/lib/modules/reportes/handlers.js','exports.testHelpers={buildReporteData,fillProgramaActa,fillOpcionActa};').testHelpers;
 const report=await reports.buildReporteData(193);assert.deepEqual(report.unidades.map(unit=>unit.id),expected);
 const updates=[];reports.fillProgramaActa(updates,'Acta',report);
 const findCell=address=>updates.find(update=>update.range.endsWith('!'+address))?.values[0][0];
 assert.equal(findCell('AA6'),'HABILIDADES COMUNICATIVAS');assert.equal(findCell('AB6'),'HERRAMIENTAS DE OFICINA Y APLICACIONES DE INTERNET');
 assert.equal(Number(findCell('AA14')),18);assert.equal(Number(findCell('AB14')),12,'Grades stay attached to their unit IDs');
 const option=[];reports.fillOpcionActa(option,'Acta',report);
 assert.equal(option.find(update=>update.range.endsWith('!O7')).values[0][0],'Capacidad HABILIDADES COMUNICATIVAS');
 assert.equal(Number(option.find(update=>update.range.endsWith('!O20')).values[0][0]),18);
 assert.equal(Number(option.find(update=>update.range.endsWith('!P20')).values[0][0]),12);
 assert(queries.filter(query=>/Detail|Detalle/.test(query)).every(query=>/competencia\s*\{[^}]*\borden\b/.test(query)),'Consumers must request competency order');
 console.log('Correcto: orden idéntico a Programación Curricular, Registro Auxiliar real, actas de Programa y Opción, columnas y notas por ID conservadas, fallback histórico.');
})().catch(error=>{console.error(error);process.exitCode=1;});
