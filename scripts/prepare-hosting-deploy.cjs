const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');

// Firebase prepares its SSR copy before running Hosting predeploy hooks.
// Keep the source build cache and runtime image cache; omit only compiler caches.
const workspace=path.resolve(__dirname,'..');
const generated=path.resolve(workspace,'.firebase','cetprosmp-2026','functions','.next');
assert(generated.startsWith(workspace+path.sep));
if(fs.existsSync(generated)){
  assert(fs.existsSync(path.join(generated,'BUILD_ID')),'The generated production build is incomplete.');
  for(const name of ['webpack','swc','eslint']){
    const target=path.resolve(generated,'cache',name);
    assert(target.startsWith(generated+path.sep));
    if(fs.existsSync(target))fs.rmSync(target,{recursive:true,force:true});
  }
  console.log('Hosting: compiler caches excluded from the generated server package.');
}
