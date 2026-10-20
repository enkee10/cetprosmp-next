const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
// Browser regression with real components and controlled responses; no remote requests or timings.
// Playwright is installed separately under tmp/browser-check for local browser checks.
const {build}=require('esbuild');
const {chromium}=require('../tmp/browser-check/node_modules/playwright');
const root=path.resolve(__dirname,'..');
const mocks={
 'next/navigation':`export const useRouter=()=>({push(){},refresh(){}});export const usePathname=()=>'/intranet/matriculas';export const useSearchParams=()=>new URLSearchParams('grupoModuloId=1');`,
 'next/link':`import React from 'react';export default function Link({href,children,...props}){return <a href={href} {...props}>{children}</a>}`,
 '@/components/intranet/users/UserForm':`export default function UserForm(){return null}`,
 '@/lib/firebase':`export const auth={currentUser:{uid:'test-teacher'}};export const functions={};export const storage={};export const app={};`,
 'firebase/auth':`
 const user={uid:'test-teacher',email:'teacher@example.test',displayName:'Ana',photoURL:null,
 getIdTokenResult:async(force)=>{window.tokens.push(force);return {claims:{role:'4',level:100}};}};
 export const onAuthStateChanged=(_,callback)=>{const timer=setTimeout(()=>callback(user),0);return ()=>clearTimeout(timer);};
 export const getAuth=()=>({currentUser:user});export class GoogleAuthProvider{};
 export const sendEmailVerification=async()=>{};export const sendPasswordResetEmail=async()=>{};
 export const signInWithEmailAndPassword=async()=>({user});export const signInWithPopup=async()=>({user});export const signOut=async()=>{};`,
 'firebase/functions':`
 const groups=[1,2].map(id=>({id,moduloId:id,grupoId:1,nombre:'Módulo '+id,grupo:{id:1,semestreId:1,semestre:{id:1,titulo:'2026-2'}}}));
 const rows=()=>Array.from({length:window.totalRows},(_,i)=>({id:i+1,rowId:(i+1)+':grupo-modulo:1',grupoModuloId:1,moduloEstudianteId:i+1,grupoModuloNombre:'Módulo 1',
 fecha:'2026-09-01T00:00:00Z',semestreId:1,semestre:{id:1,titulo:'2026-2'},user:{id:i+1,nombre:'Alumno '+String(i+1).padStart(3,'0'),apellidoPaterno:'Prueba',dni:'10000000'}}));
 export const httpsCallable=(_,name)=>async(input)=>{
  window.calls.push({name,input});
  if(name==='getMyProfile')return {data:{profile:{rolId:4,rol:{titulo:'Docente',scala:100},blocked:false}}};
  if(name==='getMyAvatar')return new Promise(resolve=>{window.unblockPhoto=()=>resolve({data:{profile:null}})});
  if(name==='getAppSettings')return {data:{settings:{general:{semestreActualId:1,semestresConsultaIds:[1],semestres:[{id:1,titulo:'2026-2'}]}}}};
  if(name==='listMisPermisos')return {data:{permissions:[{entity:'matriculas',canView:true},{entity:'registro-auxiliar',canView:true}]}};
  if(name==='listDocenteMenuModulos')return {data:{modulos:groups,semestre:{id:1,titulo:'2026-2'},semestreTitulo:'2026-2'}};
  if(name==='listMatriculasPage'){
    const response={data:{rows:rows().slice(input.page*input.pageSize,(input.page+1)*input.pageSize),rowCount:window.totalRows}};
    return input.page>0?new Promise(resolve=>{window.releaseRows=()=>resolve(response)}):response;
  }
  if(name==='getMatriculasPageAvatars'){
    const response={data:{avatars:Object.fromEntries(input.matriculaIds.map(id=>[id,{avatarTiny:'/avatars/'+id+'.svg'}]))}};
    if(window.autoPhotos)return response;
    return new Promise(resolve=>{window.photos.push({ids:input.matriculaIds,resolve:()=>resolve(response)})});
  }
  if(name==='listMatriculas')return {data:{matriculas:rows().map(row=>({...row,modulosEstudiantes:[{id:row.id,grupoModuloId:1,grupoId:1,moduloId:1}]}))}};
  throw Error('Unexpected callable '+name);
 };`,
};
(async()=>{
 const result=await build({stdin:{contents:`import React,{useState} from 'react';import{createRoot}from'react-dom/client';
 import{AuthProvider}from'./src/context/AuthContext';import{AppSettingsProvider}from'./src/hooks/useAppSettings';
 import{useIntranetMenuSections}from'./src/hooks/useIntranetMenuSections';import{MatriculasPage}from'./src/components/intranet/matriculas/MatriculasClient';
 function App(){const[show,setShow]=useState(true);const{sections}=useIntranetMenuSections();return <><button onClick={()=>setShow(!show)}>{show?'Otra página':'Volver a matrículas'}</button><output>{sections.flatMap(s=>s.items).map(i=>i.title).join('|')}</output>{show?<MatriculasPage/>:<p>Otra página abierta</p>}</>}
 window.calls=[];window.tokens=[];window.photos=[];window.autoPhotos=false;window.totalRows=150;createRoot(document.getElementById('root')).render(<AuthProvider><AppSettingsProvider><App/></AppSettingsProvider></AuthProvider>);`,resolveDir:root,loader:'tsx'},
 bundle:true,write:false,format:'iife',jsx:'automatic',define:{'process.env.NODE_ENV':'"development"'},
 plugins:[{name:'fixtures',setup(b){b.onResolve({filter:/.*/},args=>mocks[args.path]?{path:args.path,namespace:'fixture'}:undefined);
 b.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:mocks[args.path],loader:'tsx',resolveDir:root}));
 b.onResolve({filter:/^@\//},args=>{const p=path.join(root,'src',args.path.slice(2));for(const suffix of ['.ts','.tsx','/index.ts','/index.tsx'])if(fs.existsSync(p+suffix))return {path:p+suffix};});}}]});
 const server=http.createServer((req,res)=>{if(req.url.startsWith('/avatars/')){res.setHeader('Content-Type','image/svg+xml');res.end('<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="48" height="48" fill="green"/></svg>')}else if(req.url==='/bundle.js'){res.setHeader('Content-Type','text/javascript');res.end(result.outputFiles[0].text)}else{res.setHeader('Content-Type','text/html');res.end('<html><meta charset="utf-8"><div id="root"></div><script src="/bundle.js"></script></html>')}});
 const browser=await chromium.launch({headless:true});await new Promise(resolve=>server.listen(3001,'127.0.0.1',resolve));
 try{const page=await browser.newPage({viewport:{width:1450,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:3001');await page.getByRole('grid').waitFor({timeout:30000});
  await page.waitForFunction(()=>document.querySelectorAll('[role="row"][data-id]').length===50);
  assert((await page.locator('output').innerText()).includes('Lista Módulo 1 26-2'));
  assert.equal(await page.evaluate(()=>window.calls.filter(c=>c.name==='refreshMyClaims').length),0);
  assert.equal(await page.evaluate(()=>window.calls.filter(c=>c.name==='listDocenteMenuModulos').length),1);
  assert.equal(await page.evaluate(()=>window.calls.filter(c=>c.name==='listMatriculasPage').length),1);

  const firstImage=page.locator('[data-id="1:grupo-modulo:1"] img');
  assert.equal(await firstImage.count(),0,'Rows render while photos are pending');
  await page.waitForFunction(()=>window.photos.length>0);
  await page.evaluate(()=>window.photos[0].resolve());
  await firstImage.waitFor();
  await page.waitForFunction(()=>document.querySelector('[data-id="1:grupo-modulo:1"] img')?.naturalWidth>0);
  await page.evaluate(()=>window.autoPhotos=true);
  await page.getByRole('button',{name:/página siguiente/i}).click();
  await page.waitForFunction(()=>typeof window.releaseRows==='function');
  // Let any request using the previous page settle before the new records arrive.
  await page.evaluate(()=>new Promise(resolve=>setTimeout(resolve,50)));
  await page.evaluate(()=>{window.autoPhotos=false;window.releaseRows()});
  await page.locator('[data-id="51:grupo-modulo:1"]').waitFor();
  await page.waitForFunction(()=>window.photos.some(p=>p.ids.includes(51)),{},{timeout:5000});
  assert.equal(await page.locator('[data-id="51:grupo-modulo:1"] img').count(),0,'Second-page rows render before their photos');
  await page.evaluate(()=>window.photos.find(p=>p.ids.includes(51)).resolve());
  await page.waitForFunction(()=>document.querySelector('[data-id="51:grupo-modulo:1"] img')?.naturalWidth>0);
  assert.equal(await page.locator('[data-id="51:grupo-modulo:1"] img').getAttribute('src'),'/avatars/51.svg');
  await page.getByRole('button',{name:/página anterior/i}).click();
  await page.waitForFunction(()=>document.querySelector('[data-id="1:grupo-modulo:1"] img')?.naturalWidth>0);
  assert.equal(await page.evaluate(()=>window.calls.filter(c=>c.name==='listMatriculasPage').length),2,'Returning uses record cache');
  assert.equal(await page.evaluate(()=>window.calls.filter(c=>c.name==='getMatriculasPageAvatars').length),2,'Exactly one photo request for each loaded page');
  // A request for the third page must never be keyed using the second page's IDs.
  await page.getByRole('button',{name:/página siguiente/i}).click();
  await page.waitForFunction(()=>document.querySelector('[data-id="51:grupo-modulo:1"] img')?.naturalWidth>0);
  await page.getByRole('button',{name:/página siguiente/i}).click();
  await page.waitForFunction(()=>window.calls.filter(c=>c.name==='listMatriculasPage').length===3);
  await page.evaluate(()=>window.releaseRows());
  await page.waitForFunction(()=>window.photos.some(p=>p.ids.includes(101)));
  await page.evaluate(()=>window.photos.find(p=>p.ids.includes(101)).resolve());
  await page.waitForFunction(()=>document.querySelector('[data-id="101:grupo-modulo:1"] img')?.naturalWidth>0);
  assert.equal(await page.evaluate(()=>window.calls.filter(c=>c.name==='getMatriculasPageAvatars').length),3);
  assert.deepEqual(errors,[]);
  console.log('Passed: rows render before photos; correct avatars on pages 1, 2 and 3; returning uses cache without duplicate requests.');

 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1});
