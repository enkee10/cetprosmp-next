const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');

function load(file,names,dependencies){
 const ast=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);
 const statements=ast.statements.filter(node=>ts.isFunctionDeclaration(node)&&names.includes(node.name?.text)
  ||ts.isVariableStatement(node)&&node.declarationList.declarations.some(item=>names.includes(item.name.getText(ast))));
 assert.equal(statements.length,names.length,'All tested production functions must be found');
 const code=ts.transpileModule(statements.map(node=>node.getText(ast)).join('\n'),{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
 return vm.runInNewContext(`${code}\n({${names.join(',')}})`,dependencies);
}

(async()=>{
 const writes=[];
 const previous=[{id:101,nombre:'Hilanderia inicial',moduloId:7,instancia:1,inicio:'2026-03-02T00:00:00.000Z',fin:'2026-05-30T00:00:00.000Z',calendarioId:11},
  {id:102,nombre:'Hilanderia avanzada',moduloId:7,instancia:2,inicio:null,fin:null,calendarioId:null}];
 const dependencies={Map,Set,Promise,Error,
  buildGrupoModuloNombreRelacional:()=> 'Nombre generado para nuevo modulo',
  buildGrupoModuloDataFromInput:require('../functions/lib/modules/core/userMappers.js').buildGrupoModuloDataFromInput,
  getIdFromKeyOutput:value=>value?.id,
  GET_GRUPO_MODULOS_CALENDARIOS_QUERY:'read',UPDATE_GRUPO_MODULO_MUTATION:'update',INSERT_GRUPO_MODULO_MUTATION:'insert',
  DELETE_GRUPO_MODULO_MUTATION:'delete',DELETE_GRUPO_MODULO_UNIDAD_DIDACTICA_MUTATION:'delete-unit',
  INSERT_GRUPO_MODULO_UNIDAD_DIDACTICA_MUTATION:'insert-unit',UPDATE_GRUPO_MODULO_UNIDAD_DIDACTICA_MUTATION:'update-unit',
  dataConnect:{executeGraphql:async(query,{variables})=>{
   if(query==='read')return{data:{grupo:{id:1},grupoModulos:previous,grupoModuloUnidadesDidacticas:[]}};
   writes.push({query,variables});return{data:{[query==='update'?'grupoModulo_update':'grupoModulo_insert']:{id:variables.id??103}}};
  }}
 };
 const helpers=load('functions/src/modules/grupos/handlers.ts',['expandedGrupoModuloKey','expandPaqueteModulos','syncGrupoModulos'],dependencies);
 dependencies.getPaqueteModulosOrThrow=async()=>({paqueteModulos:helpers.expandPaqueteModulos([{moduloId:7,multiplicador:3,orden:2,obligatorio:true}]),competenciaUnidadesDidacticas:[]});
 await helpers.syncGrupoModulos(1,9);
 assert.equal(writes.length,3,'Saving a group reuses two modules and creates only the new instance');
 for(const row of previous){const write=writes.find(item=>item.variables.id===row.id);assert.equal(write.query,'update');assert.equal(write.variables.data.nombre,row.nombre);assert.equal(write.variables.data.inicio,row.inicio);assert.equal(write.variables.data.calendarioId,row.calendarioId);}
 const added=writes.find(item=>item.query==='insert');assert.equal(added.variables.data.instancia,3);assert.equal(added.variables.data.orden,23);assert.equal(added.variables.data.nombre,'Nombre generado para nuevo modulo');
 assert.ok(writes.every(item=>!Object.hasOwn(item.variables.data,'sufijo')));

 const renamed=[];
 const modulos=load('functions/src/modules/modulos/handlers.ts',['syncGrupoModulosNombreForModulo'],{
  Promise,buildGrupoModuloNombreRelacional:()=> 'Nuevo nombre base',LIST_GRUPO_MODULOS_FOR_MODULO_RENAME_QUERY:'read',UPDATE_GRUPO_MODULO_MUTATION:'update',
  dataConnect:{executeGraphql:async(query,options)=>{
   if(query==='read')return{data:{grupoModulos:[...previous,{id:103,nombre:'',grupo:{id:1},modulo:{id:7}}]}};
   renamed.push(options.variables);return{data:{}};
  }}
 });
 await modulos.syncGrupoModulosNombreForModulo(7);
 assert.equal(renamed.length,1,'Renaming a module preserves existing group-module names');assert.equal(renamed[0].id,103);assert.equal(renamed[0].data.nombre,'Nuevo nombre base');
 console.log('Passed: repeated instances, existing IDs/names/dates/calendar preserved, new names generated, no suffix payload, module rename preserves names.');
})().catch(error=>{console.error(error);process.exitCode=1;});
