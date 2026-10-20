const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { Module } = require('node:module');
const { buildSync } = require('esbuild');
function load(file) {
  const code=buildSync({entryPoints:[file],bundle:true,write:false,format:'cjs',platform:'node'}).outputFiles[0].text;
  const mod=new Module(path.resolve(file));mod._compile(code,file);return mod.exports;
}
async function authentication(source, options={}) {
  const file=ts.createSourceFile('AuthContext.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const names=new Set(['cleanUrl','cleanText','resolveProfilePhotoURL','resolveProfileRoleTitle','resolveProfileRole','resolveProfileLevel',
    'withTimeout','isExpectedAuthError','createIntranetAccessDeniedError','loadUserDataFromFirebaseUser']);
  const code=file.statements.filter(n=>ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>names.has(d.name.getText(file))))
    .map(n=>n.getText(file)).join('\n');
  const calls=[],tokens=[];
  const profile=options.noProfile ? null : {rolId:options.role??4,rol:{titulo:'Docente',scala:100},nombre:'Ana',blocked:options.blocked??false};
  const fn=vm.runInNewContext(ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText+'\nloadUserDataFromFirebaseUser',{
    setTimeout,clearTimeout,Promise,console,functions:{},
    httpsCallable:(_,name)=>async(input)=>{calls.push({name,input});return {data:name==='getMyProfile'?{profile}:{}};},
  });
  const user={uid:'user-a',email:'user@example.test',displayName:'Ana',photoURL:null,getIdTokenResult:async(force)=>{
    tokens.push(force);return {claims:options.missingClaims && !force ? {} : {role:'4',level:100}};
  }};
  try { const result=await fn(user);return {calls,tokens,result}; } catch(error){return {calls,tokens,error};}
}
(async()=>{
  const cache=load('src/lib/matriculasListCache.ts');let calls=0;
  const fetch=async()=>{calls++;return {rows:[{id:1}],rowCount:1};};
  const [a,b]=await Promise.all([cache.loadMatriculaPage('uid-a|sem4|group1|page0',fetch),cache.loadMatriculaPage('uid-a|sem4|group1|page0',fetch)]);
  assert.equal(a,b);assert.equal(calls,1);
  await cache.loadMatriculaPage('uid-a|sem4|group1|page0',fetch);assert.equal(calls,1);
  await cache.loadMatriculaPage('uid-b|sem4|group1|page0',fetch);assert.equal(calls,2);
  await cache.loadMatriculaPage('uid-a|sem5|group1|page0',fetch);assert.equal(calls,3);
  await cache.loadMatriculaPage('uid-a|sem4|group1|page1',fetch);assert.equal(calls,4);
  let resolve;const pending=cache.loadMatriculaPage('stale',()=>new Promise(r=>{resolve=r;}));await Promise.resolve();
  cache.invalidateMatriculaLists();resolve({rows:['stale']});await pending;assert.equal(cache.peekMatriculaPage('stale'),undefined);
  await cache.loadMatriculaPage('uid-a|sem4|group1|page0',fetch);assert.equal(calls,5);
  const originalNow=Date.now;let now=originalNow();Date.now=()=>now;
  try {await cache.loadMatriculaPage('expiry',fetch);now+=31000;await cache.loadMatriculaPage('expiry',fetch);assert.equal(calls,7);}finally{Date.now=originalNow;}
  const before=JSON.parse(fs.readFileSync('tmp/performance-local/before-sources.json','utf8'))['src/context/AuthContext.tsx'];
  const old=await authentication(before),current=await authentication(fs.readFileSync('src/context/AuthContext.tsx','utf8'));
  assert.equal(old.error,undefined);assert.equal(current.error,undefined);
  assert.deepEqual(old.calls.map(c=>c.name),['refreshMyClaims','getMyProfile']);
  assert.deepEqual(current.calls.map(c=>c.name),['getMyProfile']);
  assert.equal(current.calls[0].input.includeAvatar,false);
  assert.deepEqual(current.tokens,[false]);assert.deepEqual(old.tokens,[true]);
  const changed=await authentication(fs.readFileSync('src/context/AuthContext.tsx','utf8'),{role:5});
  assert.deepEqual(changed.calls.map(c=>c.name),['getMyProfile','refreshMyClaims']);assert.deepEqual(changed.tokens,[false,true]);
  const blocked=await authentication(fs.readFileSync('src/context/AuthContext.tsx','utf8'),{blocked:true});assert.equal(blocked.error.code,'auth/intranet-access-denied');
  const bootstrap=await authentication(fs.readFileSync('src/context/AuthContext.tsx','utf8'),{noProfile:true,missingClaims:true});
  assert.equal(bootstrap.error,undefined);assert.equal(bootstrap.result.role,'4');assert.deepEqual(bootstrap.tokens,[false,true]);
  console.log('Passed: page cache TTL, request deduplication, user/semester/page isolation, mutation invalidation, stale-response protection, token reuse, role changes and blocked accounts.');
})().catch(error=>{console.error(error);process.exitCode=1;});
