const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');

// Firebase prepares its SSR copy before running Hosting predeploy hooks.
// Keep the source build cache and runtime image cache; omit only compiler caches.
const workspace=path.resolve(__dirname,'..');
const generated=path.resolve(workspace,'.firebase','cetprosmp-2026','functions','.next');
assert(generated.startsWith(workspace+path.sep));
assert(fs.existsSync(generated),'The generated production package is missing.');
if(fs.existsSync(generated)){
  assert(fs.existsSync(path.join(generated,'BUILD_ID')),'The generated production build is incomplete.');
  const buildConfig=JSON.parse(fs.readFileSync(path.join(generated,'required-server-files.json'),'utf8'));
  assert(buildConfig.config.distDir==='.next','Firebase Hosting requires the standard .next production directory.');
  for(const entry of ['_document.js','_app.js','_error.js']){
    const file=path.join(generated,'server','pages',entry);
    if(fs.existsSync(file)){
      assert(!fs.readFileSync(file,'utf8').includes('[turbopack]_runtime.js'),
        `Hosting: ${entry} contains development output. Rebuild production before deploying.`);
    }
  }
  for(const name of ['webpack','swc','eslint']){
    const target=path.resolve(generated,'cache',name);
    assert(target.startsWith(generated+path.sep));
    if(fs.existsSync(target))fs.rmSync(target,{recursive:true,force:true});
  }
  console.log('Hosting: compiler caches excluded from the generated server package.');
}
