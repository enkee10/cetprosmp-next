const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(file, imports = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  new Function('module','exports','require',code)(module,module.exports,name=>{assert(name in imports, name);return imports[name];});
  return module.exports;
}
const valuations = load('functions/src/modules/parte-diario/valuations.ts');
const parte = load('src/lib/parteDiario.ts', {'../../functions/src/modules/parte-diario/valuations':valuations});
const drafts = load('src/lib/parteDiarioDrafts.ts');
const analytics = load('functions/src/modules/parte-diario/reportAnalytics.ts', {'./valuations':valuations, './valuations.js':valuations});
const values = new Map(), storage = { getItem:key=>values.get(key)??null, setItem:(k,v)=>values.set(k,v), removeItem:k=>values.delete(k) };
const author = {uid:'coordinador-a',nombre:'Coordinadora A',avatar:'/avatar-a.png'};
const row = {key:'10:a:20',grupoModuloId:10,version:'2026-10-16T12:00:00Z',recordId:1,tipoUnidad:'curricular',unidadDidacticaId:1,actividadId:20,asistentes:0,firma:'firma-aceptada',observaciones:[]};
assert(parte.isParteSaved(row));
const edited = drafts.editedParteDraft({...row,asistentes:4},row,author);
assert.equal(edited.firma,null,'Editing must revoke the previous signature in the draft.');
assert(!parte.isParteSaved(edited));assert(parte.isParteDraft(edited));
drafts.writeParteDraft(storage,'2026-10-16',edited,{text:'Observación sin agregar',editing:null},author);
const restored = drafts.readParteDraft(storage,'2026-10-16',row);
assert.equal(restored.row.asistentes,4);assert.equal(restored.observation.text,'Observación sin agregar');assert.equal(restored.row.editor.uid,author.uid);
assert.equal(drafts.readParteDraft(storage,'2026-10-15',row),null,'Dates must be isolated.');
const other = drafts.readParteDraft(storage,'2026-10-16',{...row,version:'2026-10-16T14:00:00Z'});
assert(other.row.borradorConflicto);assert.equal(other.row.version,row.version,'A stale draft cannot silently overwrite a newer signed record.');
assert(!parte.isParteSaved({...restored.row,firma:'firma-pendiente'}),'A pending signature is still a draft.');
drafts.clearParteDraft(storage,'2026-10-16',row);assert.equal(drafts.readParteDraft(storage,'2026-10-16',row),null);
storage.setItem(drafts.parteDraftKey('2026-10-16',10),'{invalid');assert.equal(drafts.readParteDraft(storage,'2026-10-16',row),null);
// Local drafts are never submitted as report records; unsigned legacy records also contribute nothing.
const metrics=analytics.aggregateParte([{...row,id:1,fecha:'2026-10-16',docenteId:1,docente:'Docente',familia:'Familia',familiaId:1,fechaActualizacion:row.version,firma:null}],[]);
assert.equal(metrics.registros,0);assert.equal(metrics.asistentesAcumulados,0);
console.log('Borradores: persistencia, observación pendiente, autor, fechas, firma pendiente, conflictos, limpieza y exclusión de informes: correctos.');
