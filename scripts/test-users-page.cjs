const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { build } = require('esbuild');
const { chromium } = require('../tmp/browser-check/node_modules/playwright');
const root = path.resolve(__dirname, '..');
const mocks = {
  '@/lib/firebase': `export const functions={};export const app={};export const storage={};`,
  'firebase/auth': `export const getAuth=()=>({currentUser:{uid:'local-test',email:'admin@example.test'}});`,
  'firebase/storage': `export const ref=()=>{};export const uploadBytes=()=>{};export const getDownloadURL=()=>{};`,
  '@/context/AuthContext': `const user={uid:'local-test',role:'1',level:1000};export const useAuth=()=>({user,loading:false});`,
  '@/hooks/useIntranetPermissions': `export const useIntranetPermissions=()=>({can:()=>true,isSuperUser:true});`,
  '@/hooks/useAppSettings': `const settings={visualizaciones:{mostrarImagenAvatarEstudiantesEnListas:true,usarRecorteFotografiaComoAvatarEstudiantes:false}};export const useAppSettings=()=>({settings});`,
  '@/components/intranet/matriculas/MatriculasClient': `export const MatriculaForm=()=>null;`,
  '@/components/intranet/editor-documentos/EditorDocumentosClient': `export const EditorImagenesModal=()=>null;`,
  'firebase/functions': `
    const rows=Array.from({length:95},(_,i)=>({id:i+1,documentId:'user-'+(i+1),username:'Usuario '+(i+1),nombre:'Ana',
      apellidoPaterno:'Rios',apellidoMaterno:'Perez',rolId:3,email:'user'+(i+1)+'@example.test',
      celular:'987654321',nacionalidad:'PERUANA',dni:'12345678'}));
    export const httpsCallable=(_,name)=>async(input)=>{
      window.calls.push({name,input});
      if(name==='listUsersPage'){
        const response={data:{rows:rows.slice(input.page*input.pageSize,(input.page+1)*input.pageSize),rowCount:rows.length}};
        return input.page>0?new Promise(resolve=>{window.releaseRows=()=>resolve(response)}):response;
      }
      if(name==='getUsersPageAvatars')return new Promise(resolve=>window.photos.push({ids:input.userIds,
        release:()=>resolve({data:{avatars:Object.fromEntries(input.userIds.map(id=>[id,{avatarTiny:'/avatars/'+id+'.svg'}]))}})}));
      if(name==='getUserDetails'){
        const row=rows.find(row=>row.documentId===input.documentId);
        return new Promise((resolve,reject)=>window.details.push({release:()=>resolve({data:{user:{...row,nombre:'Datos completos '+row.id,
          telefono:'7654321',direccion:'Direccion completa '+row.id,sexo:'F',fechaNacimiento:'2001-02-03T00:00:00Z',
          tipoDocumento:'DNI',instruccion:'Secundaria',estadoCivil:'Soltero',correoInstitucional:'12345678@cetprosmp.edu.pe',
          dniImagenFrenteUrl:'/avatars/documento.svg'}}}),fail:()=>reject(Error('Fallo local de prueba'))}));
      }
      if(name==='listRoles')return {data:{roles:[{id:3,titulo:'Estudiante',scala:10}]}};
      if(name==='listUserGrupoModuloHistorial')return {data:{historial:[]}};
      if(name==='updateUserProfile')return {data:{}};
      throw Error('Unexpected callable '+name);
    };`,
};

(async () => {
  const bundle = await build({
    stdin: { contents: `import React,{useState} from 'react';import{createRoot}from'react-dom/client';
      import UsersPage from './src/app/(aplicacion)/intranet/users/page';
      import {invalidateLists} from './src/lib/intranetListCache';window.invalidateLists=invalidateLists;
      function App(){const[show,setShow]=useState(true);return <><button onClick={()=>setShow(!show)}>Cambiar vista</button>{show?<UsersPage/>:<p>Otra vista</p>}</>}
      window.calls=[];window.photos=[];window.details=[];createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);`, resolveDir: root, loader: 'tsx' },
    bundle: true, write: false, format: 'iife', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"development"' },
    plugins: [{ name: 'local-responses', setup(b) {
      b.onResolve({ filter: /.*/ }, args => mocks[args.path] ? { path: args.path, namespace: 'fixture' } : undefined);
      b.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: mocks[args.path], loader: 'tsx', resolveDir: root }));
      b.onResolve({ filter: /^@\// }, args => {
        const file = path.join(root, 'src', args.path.slice(2));
        for (const suffix of ['.ts', '.tsx', '/index.ts', '/index.tsx']) if (fs.existsSync(file + suffix)) return { path: file + suffix };
      });
    } }],
  });
  const server = http.createServer((req, res) => {
    if (req.url.startsWith('/avatars/')) { res.setHeader('Content-Type', 'image/svg+xml'); res.end('<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="48" height="48" fill="green"/></svg>'); }
    else if (req.url === '/bundle.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(bundle.outputFiles[0].text); }
    else { res.setHeader('Content-Type', 'text/html'); res.end('<html><meta charset="utf-8"><div id="root"></div><script src="/bundle.js"></script></html>'); }
  });
  const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge' });
  await new Promise(resolve => server.listen(3001, '127.0.0.1', resolve));
  try {
    const page = await browser.newPage({ viewport: { width: 1550, height: 1000 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:3001');
    await page.waitForFunction(() => document.querySelectorAll('[role="row"][data-id]').length === 30);
    await page.waitForFunction(() => window.photos.length === 1);
    assert.equal(await page.locator('[data-id="1"] img').count(), 0, 'Rows appear while photos wait');
    assert.equal(await page.evaluate(() => window.calls.filter(c => c.name === 'listUsersPage').length), 1, 'StrictMode shares pending reads');
    await page.evaluate(() => window.photos[0].release());
    await page.waitForFunction(() => document.querySelector('[data-id="1"] img')?.naturalWidth > 0);
    await page.getByRole('button', { name: /página siguiente/i }).click();
    await page.waitForFunction(() => typeof window.releaseRows === 'function');
    await page.evaluate(() => window.releaseRows());
    await page.locator('[data-id="31"]').waitFor();
    await page.waitForFunction(() => window.photos.length === 2);
    assert.equal(await page.locator('[data-id="31"] img').count(), 0);
    assert.deepEqual(await page.evaluate(() => window.photos[1].ids), Array.from({ length: 30 }, (_, i) => i + 31));
    await page.evaluate(() => window.photos[1].release());
    await page.waitForFunction(() => document.querySelector('[data-id="31"] img')?.naturalWidth > 0);
    await page.getByRole('button', { name: /página anterior/i }).click();
    await page.waitForFunction(() => document.querySelector('[data-id="1"] img')?.naturalWidth > 0);
    assert.equal(await page.evaluate(() => window.calls.filter(c => c.name === 'listUsersPage').length), 2, 'Returning uses cached rows');
    assert.equal(await page.evaluate(() => window.calls.filter(c => c.name === 'getUsersPageAvatars').length), 2, 'Returning uses cached photos');

    await page.getByRole('button', { name: 'Usuario 1', exact: true }).click();
    await page.getByRole('progressbar', { name: 'Cargando datos del usuario' }).waitFor();
    assert.equal(await page.locator('#user-form').count(), 0, 'Incomplete records cannot be submitted');
    await page.evaluate(() => window.details[0].release());
    await page.waitForFunction(() => document.querySelector('[name="telefono"]')?.value === '7654321');
    assert.equal(await page.getByLabel('Nombre', { exact: true }).inputValue(), 'Datos completos 1');
    assert.equal(await page.getByLabel('Dirección', { exact: true }).inputValue(), 'Direccion completa 1');
    assert.equal(await page.getByLabel('Fecha de Nacimiento').inputValue(), '2001-02-03');
    await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await page.getByRole('button', { name: 'Abrir usuario Usuario 2', exact: true }).click();
    await page.waitForFunction(() => window.details.length === 2);
    await page.evaluate(() => window.details[1].release());
    await page.waitForFunction(() => document.querySelector('[name="nombre"]')?.value === 'Datos completos 2');
    await page.getByRole('button', { name: 'Guardar Cambios', exact: false }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await page.waitForFunction(() => window.calls.filter(c => c.name === 'listUsersPage').length === 3);
    await page.waitForFunction(() => window.photos.length === 3);
    await page.evaluate(() => window.photos[2].release());
    await page.waitForFunction(() => document.querySelector('[data-id="1"] img')?.naturalWidth > 0);
    assert.equal(await page.evaluate(() => window.calls.find(c => c.name === 'updateUserProfile').input.telefono), '7654321');
    await page.getByRole('button', { name: 'Cambiar vista' }).click();
    await page.getByText('Otra vista').waitFor();
    await page.getByRole('button', { name: 'Cambiar vista' }).click();
    await page.waitForFunction(() => document.querySelector('[data-id="1"] img')?.naturalWidth > 0);
    assert.equal(await page.evaluate(() => window.calls.filter(c => c.name === 'listUsersPage').length), 3);
    assert.deepEqual(errors, []);
    console.log('Passed: real grid and UserForm, delayed page photos, cached navigation, avatar/name clicks, complete data and save refresh.');
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
