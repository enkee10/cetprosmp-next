const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module');
process.env.GOOGLE_CLOUD_PROJECT = 'cetprosmp-2026';
const filename = path.resolve(process.argv[2] || 'functions', 'lib/modules/reportes/handlers.js');
const loaded = new Module(filename, module);
loaded.filename = filename; loaded.paths = Module._nodeModulePaths(path.dirname(filename));
const saves = [], records = [];
const originalRequire = loaded.require.bind(loaded);
loaded.require = name => {
  if (name === 'firebase-admin/storage') return {getStorage: () => ({bucket: () => ({name:'test-bucket',file: objectPath => ({save: async (buffer,options) => saves.push({objectPath,buffer,options})})})})};
  if (name === '../core/dataConnectCore.js') return {dataConnect:{executeGraphql:async()=>{throw Error('Unexpected database request');}}};
  if (name === '../core/permissions.js') return {requirePermission:async()=>{}};
  if (name === '../datos-generales/service.js') return {getDatosGeneralesGlobales:async()=>({})};
  return originalRequire(name);
};
loaded._compile(fs.readFileSync(filename,'utf8') + `
exports.testHelpers = {registroAcademicoFileName, uploadBuffer, generateReporteDocumentoInternal,
 setup(fixture, documents) {
   buildReporteData = async()=>fixture;
   ensureTemplateInStorage = async()=>({buffer:Buffer.from('template')});
   fillReporte = ()=>{};
   applyExcelUpdates = async()=>Buffer.from('excel');
   convertXlsxToPdf = async()=>Buffer.from('pdf');
   upsertRegistroAcademicoDocumento = async data=>data;
   listRegistrosAcademicosDocumentos = async()=>documents;
   docenteNameByGrupoModuloId = async()=>new Map();
 }};`, filename);
const {registroAcademicoFileName,uploadBuffer,generateReporteDocumentoInternal,setup} = loaded.exports.testHelpers;
const nombre = 'técnicas_de_tizado_tendido_y_corte_de_prendas_de_vestir_[Noche] Lun-Vie_(Liliana Millán)';
const fixture = {semestre:{titulo:'2026-1'},grupoModulo:{id:12,nombre,grupo:{semestre:{titulo:'2026-2'}},modulo:{}},estudiantes:[],unidades:[],opcionOcupacional:false};
const plain = nombre.replaceAll('_',' ');
function downloadedName(save) {
  const disposition=save.options.metadata.contentDisposition;
  assert(!/[\r\n]/.test(disposition));
  return decodeURIComponent(disposition.split("filename*=UTF-8''")[1]);
}
(async()=>{
  assert.equal(registroAcademicoFileName('acta',fixture),`Acta-26-1 ${plain}`);
  assert.equal(registroAcademicoFileName('nomina',{...fixture,semestre:null}),`Nomina-26-2 ${plain}`);
  assert.equal(registroAcademicoFileName('acta',{grupoModulo:{id:3,modulo:{titulo:'Sin grupo'}}}),'Acta-Sin grupo');
  assert.equal(registroAcademicoFileName('nomina',{semestre:{titulo:'2026-2'},grupoModulo:{id:3,nombre:'  Corte_/ "Barba"\r\n. '}}),'Nomina-26-2 Corte Barba');
  setup(fixture,records);
  for (const tipoDocumento of ['acta','nomina']) {
    const result = await generateReporteDocumentoInternal({tipoDocumento,grupoModuloId:12});
    const prefix=tipoDocumento==='acta'?'Acta':'Nomina';
    for (const extension of ['pdf','xlsx']) {
      const save=saves.findLast(row=>row.objectPath.endsWith(`${tipoDocumento}-12.${extension}`));
      assert.equal(downloadedName(save),`${prefix}-26-1 ${plain}.${extension}`);
      assert(save.options.metadata.metadata.firebaseStorageDownloadTokens);
      assert(save.buffer.equals(Buffer.from(extension==='pdf'?'pdf':'excel')));
    }
    records.push({...result.documento,id:records.length+1,pdfPath:result.pdf.path,pdfUrl:result.pdf.url,excelPath:result.excel.path,excelUrl:result.excel.url});
    for (const formato of ['pdf','excel']) {
      const saveCount=saves.length;
      const download=await loaded.exports.descargarRegistrosAcademicosSeleccionados.run({tipoDocumento,grupoModuloIds:[12],formato},{});
      assert.equal(download.file.url,result[formato].url);
      assert.equal(saves.length,saveCount,'Single download reuses the named document');
    }
  }
  await uploadBuffer('certificado.pdf',Buffer.from('other'),'application/pdf');
  assert.equal(saves.at(-1).options.metadata.contentDisposition,undefined,'Other reports retain their download behavior');
  console.log('Correcto: nombres de Acta/Nomina, semestre, PDF/Excel, tildes, descarga individual, fallback y otros reportes. Sin acceso a datos ni almacenamiento reales.');
})().catch(error=>{console.error(error);process.exitCode=1;});
