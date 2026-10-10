// Local migration: retain every existing session link and build the reusable catalog.
const fs=require('node:fs');
process.env.GCLOUD_PROJECT='cetprosmp-2026';
process.env.DATA_CONNECT_EMULATOR_HOST='127.0.0.1:9399';
const {dataConnect}=require('../functions/lib/modules/core/dataConnectCore.js');
const {materialKey,getOrCreateMaterial}=require('../functions/lib/modules/materiales/handlers.js');
const graph=async(source,variables={})=>(await dataConnect.executeGraphql(source,{variables})).data;
(async()=>{
 const snapshot=await graph('query MaterialCatalogMigrationSnapshot { materiales(limit:10000){id nombre clave} actividadMateriales(limit:50000){id actividadId orden texto materialId} }');
 const byKey=new Map(snapshot.materiales.map(row=>[row.clave,row]));
 const missing=new Map();
 for(const row of snapshot.actividadMateriales){const clave=materialKey(row.texto);if(clave&&!byKey.has(clave))missing.set(clave,{nombre:row.texto.trim(),clave});}
 const pending=snapshot.actividadMateriales.filter(row=>!row.materialId);
 if(!process.argv.includes('--apply')){console.log(JSON.stringify({localOnly:true,newMaterials:missing.size,linksToAssociate:pending.length}));return;}
 fs.mkdirSync('tmp/material-catalog',{recursive:true});
 const backup='tmp/material-catalog/before-'+Date.now()+'.json';fs.writeFileSync(backup,JSON.stringify(snapshot,null,2));
 const rows=[...missing.values()];
 for(let start=0;start<rows.length;start+=12)await Promise.all(rows.slice(start,start+12).map(row=>getOrCreateMaterial(row.nombre)));
 const catalog=(await graph('query MigratedMaterialCatalog { materiales(limit:10000){id nombre clave} }')).materiales;
 const ids=new Map(catalog.map(row=>[row.clave,row.id]));
 for(let start=0;start<pending.length;start+=25){
  const chunk=pending.slice(start,start+25);
  const fields=chunk.map(row=>`m${row.id}:actividadMaterial_update(id:${row.id},data:{materialId:${ids.get(materialKey(row.texto))}})`);
  await graph(`mutation MigrateSessionMaterialLinks @transaction { ${fields.join('\n')} }`);
 }
 const after=await graph('query VerifyMaterialMigration { actividadMateriales(limit:50000){id actividadId orden texto materialId} }');
 if(after.actividadMateriales.length!==snapshot.actividadMateriales.length||after.actividadMateriales.some(row=>!row.materialId))throw Error('Material migration verification failed');
 const originals=new Map(snapshot.actividadMateriales.map(row=>[row.id,row]));
 for(const row of after.actividadMateriales){const original=originals.get(row.id);for(const field of ['actividadId','orden','texto'])if(original[field]!==row[field])throw Error('An existing link changed unexpectedly');}
 console.log(JSON.stringify({localOnly:true,created:missing.size,catalog:catalog.length,associated:pending.length,linksPreserved:after.actividadMateriales.length,backup}));
})().catch(error=>{console.error(error.message);process.exitCode=1;});
