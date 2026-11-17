const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { build } = require('esbuild');
const { chromium } = require('../tmp/browser-check/node_modules/playwright');
const root = path.resolve(__dirname, '..');
const fixture = {
  grupo: { id: 40, semestre: { titulo: '2026-2' } },
  grupoModulo: { id: 50, nombre: 'Grupo de prueba', modulo: { id: 10, titulo: 'Módulo de prueba', plan: { carrera: { tipoCarrera: { nombre: 'Programa de Estudios' } } } } },
  estructura: [{ id: 1, nombre: 'Unidad', capacidadesTerminales: [{ id: 2, descripcion: 'Capacidad', indicadoresCapacidad: [{ id: 3, codigo: 'I1', descripcion: 'Indicador' }] }] }],
  estudiantes: [{ id: 301, matriculaId: 201, matricula: { id: 201, user: { id: 1, dni: '12345678', nombre: 'ALUMNO', apellidoPaterno: 'PRUEBA', apellidoMaterno: 'LOCAL' } } }],
  notas: [], promediosEfsrtPpp: [],
};
const mocks = {
  '@/lib/firebase': `export const app={options:{projectId:'document-fixture'}};`,
  '@/context/AuthContext': `const user={uid:'teacher-fixture',level:600,role:'admin'};export const useAuth=()=>({user});`,
  '@/hooks/useIntranetPermissions': `import{useState}from'react';export const useIntranetPermissions=()=>{const [canEditUsers,setCanEditUsers]=useState(true);window.setCanEditUsers=setCanEditUsers;return{can:(entity,action)=>entity!=='users'||action!=='edit'||canEditUsers};};`,
  '@/hooks/useCurrentSemestreFilter': `import{useState}from'react';export const useCurrentSemestreFilter=()=>useState('1');`,
  '@/hooks/useAppSettings': `import{useState}from'react';import{defaultAppSettings}from'@/lib/appSettings';const settings={...defaultAppSettings,general:{...defaultAppSettings.general,semestres:[{id:1,titulo:'2026-2',fin:'2099-12-23'}],semestreActualId:1}};export const useAppSettings=()=>{const [visible,setVisible]=useState(settings.registroAuxiliar.mostrarBotonEditarEstudiantes);window.setStudentEditButtonVisible=setVisible;return{settings:{...settings,registroAuxiliar:{mostrarBotonEditarEstudiantes:visible}}};};`,
  '@/lib/matriculasListCache': `export const invalidateMatriculaLists=()=>{};`,
  'next/navigation': `const params=new URLSearchParams('grupoModuloId=50');export const useSearchParams=()=>params;`,
  'next/dynamic': `import React,{lazy,Suspense}from'react';export default function dynamic(loader){const View=lazy(loader);return props=><Suspense fallback={null}><View {...props}/></Suspense>;}`,
  'firebase/auth': `const auth={currentUser:{uid:'teacher-fixture',getIdToken:async()=>''}};export const getAuth=()=>auth;`,
  'firebase/functions': `export const getFunctions=()=>({});export const httpsCallable=(_,name)=>async input=>{
    window.calls.push({name,input});
    if(name==='getDatosGeneralesGlobales')return{data:{}};
    if(name==='getRegistroAuxiliar')return{data:window.fixture};
    if(name==='getRegistroAuxiliarEstudianteDatos')return{data:{user:{...window.fixture.estudiantes[0].matricula.user,sexo:'M',fechaNacimiento:'2010-01-01T05:00:00Z'}}};
    if(name==='updateRegistroAuxiliarEstudianteDatos')return{data:{user:{...window.fixture.estudiantes[0].matricula.user,...input.user}}};
    if(name==='createRegistroAuxiliarMatricula'){
      if(!input.manual){const error=new Error('Completa la matrícula manualmente.');error.details={manualEntryRequired:true};throw error;}
      return{data:{estudiante:{id:302,matriculaId:202,matricula:{id:202,user:{id:2,dni:input.dni,...input.manual}}}}};
    }
    return{data:{}};
  };`,
};
(async () => {
  const bundle = await build({ stdin: { contents: `import React from'react';import{createRoot}from'react-dom/client';import View from'./src/app/(aplicacion)/intranet/registro-auxiliar/page';window.fixture=${JSON.stringify(fixture)};window.calls=[];createRoot(document.getElementById('root')).render(<View/>);`, resolveDir: root, loader: 'tsx' },
    bundle: true, write: false, jsx: 'automatic', format: 'iife', define: { 'process.env.NODE_ENV': '"development"' }, plugins: [{ name: 'fixtures', setup(builder) {
      builder.onResolve({ filter: /.*/ }, args => mocks[args.path] ? { path: args.path, namespace: 'mock' } : undefined);
      builder.onLoad({ filter: /.*/, namespace: 'mock' }, args => ({ contents: mocks[args.path], loader: 'tsx', resolveDir: root }));
      builder.onResolve({ filter: /^@\// }, args => { const base = path.join(root, 'src', args.path.slice(2)); for (const suffix of ['.ts', '.tsx']) if (fs.existsSync(base + suffix)) return { path: base + suffix }; });
    } }] });
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const page = await browser.newPage({ viewport: { width: 1500, height: 1100 } });
    const errors = [];
    page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
    page.on('console', message => { if (message.type() === 'error') console.error(message.text().slice(0, 1000)); });
    await page.route('http://127.0.0.1:3001/**', route => route.fulfill({
      contentType: route.request().url().endsWith('/bundle.js') ? 'text/javascript' : 'text/html',
      body: route.request().url().endsWith('/bundle.js') ? bundle.outputFiles[0].text : '<div id="root"></div><script src="/bundle.js"></script>',
    }));
    await page.goto('http://127.0.0.1:3001/');
    const studentEditButton = page.getByRole('button', { name: 'Editar datos del estudiante' });
    await studentEditButton.waitFor();
    await page.evaluate(() => window.setCanEditUsers(false));
    await studentEditButton.waitFor({ state: 'hidden' });
    assert.equal(await page.getByTitle('Doble clic para editar nombres').count(), 0);
    await page.locator('[data-registro-student-id="301"]').getByText('PRUEBA LOCAL, Alumno', { exact: true }).dblclick();
    assert.equal(await page.getByRole('textbox', { name: 'Nombres', exact: true }).count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Retirar de este grupo-módulo' }).count(), 1);
    await page.evaluate(() => window.setCanEditUsers(true));
    await studentEditButton.waitFor();
    await page.evaluate(() => window.setStudentEditButtonVisible(false));
    await studentEditButton.waitFor({ state: 'hidden' });
    assert.equal(await page.getByRole('button', { name: 'Retirar de este grupo-módulo' }).count(), 1);
    assert.equal(await page.getByTitle('Doble clic para editar nombres').count(), 1);
    await page.evaluate(() => window.setStudentEditButtonVisible(true));
    await studentEditButton.click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Guardar cambios' }).waitFor();
    const editFields = await dialog.locator('input[name]').evaluateAll(inputs => inputs.map(input => input.name).sort());
    assert.equal(await dialog.locator('input[required]').count(), 0, 'Editar no exige campos obligatorios');
    await dialog.locator('input[name="nombre"]').fill('');
    await dialog.locator('input[name="dni"]').fill('');
    await dialog.locator('input[name="fechaNacimiento"]').fill('');
    await dialog.getByRole('button', { name: 'Guardar cambios' }).click();
    await dialog.waitFor({ state: 'hidden' });
    const edited = await page.evaluate(() => window.calls.find(call => call.name === 'updateRegistroAuxiliarEstudianteDatos'));
    assert.equal(edited.input.user.nombre, '');
    assert.equal(edited.input.user.dni, '');
    assert.equal(edited.input.moduloEstudianteId, 301);
    await page.getByText('Doble clic para agregar estudiante por documento').dblclick();
    const documentInput = page.getByRole('textbox', { name: 'DNI', exact: true });
    const enrollButton = page.getByRole('button', { name: 'MATRICULAR', exact: true });
    await documentInput.fill('0012345678');
    await enrollButton.click();
    await dialog.getByRole('button', { name: 'Crear matrícula', exact: true }).waitFor();
    assert.equal(await dialog.locator('input[name="dni"]').inputValue(), '0012345678', 'El ingreso largo se conserva completo');
    assert.equal(await page.getByRole('alert').count(), 0, 'Abrir el modal no muestra un error');
    assert.equal(await page.evaluate(() => window.calls.filter(call => call.name === 'createRegistroAuxiliarMatricula').length), 0);
    await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await documentInput.fill('01234567');
    await enrollButton.click();
    await dialog.getByRole('button', { name: 'Crear matrícula', exact: true }).waitFor();
    assert.equal(await dialog.locator('input[name="dni"]').inputValue(), '01234567');
    const consulted = await page.evaluate(() => window.calls.find(call => call.name === 'createRegistroAuxiliarMatricula'));
    assert.equal(consulted.input.dni, '01234567');
    assert.equal(consulted.input.manual, undefined);
    await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await documentInput.fill('001234567');
    await enrollButton.click();
    await dialog.getByRole('button', { name: 'Crear matrícula', exact: true }).waitFor();
    assert.equal(await dialog.locator('input[name="dni"]').inputValue(), '001234567');
    await dialog.getByText('CE', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.calls.filter(call => call.name === 'createRegistroAuxiliarMatricula').length), 1);
    const createFields = await dialog.locator('input[name]').evaluateAll(inputs => inputs.map(input => input.name).sort());
    assert.deepEqual(createFields, editFields, 'El lápiz y matrícula muestran los mismos campos');
    assert.equal(await dialog.locator('input[required]').count(), 6);
    assert.equal(await dialog.locator('input[type="file"]').count(), 0);
    assert.equal(await dialog.getByText(/Seleccione un Modulo|Responsable|Periodo/, { exact: true }).count(), 0);
    await dialog.getByLabel('Grado de instrucción').click();
    await page.getByRole('option', { name: 'Secundaria en curso..', exact: true }).click();
    assert.equal(await dialog.locator('input[name="nombreColegio"]').getAttribute('required'), '');
    await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await page.getByRole('button', { name: 'Abrir formulario de matrícula' }).click();
    await dialog.getByRole('button', { name: 'Crear matrícula', exact: true }).waitFor();
    assert.equal(await dialog.locator('input[name="dni"]').inputValue(), '001234567');
    for (const [name, value] of Object.entries({ nombre: 'NUEVO', apellidoPaterno: 'PRUEBA', apellidoMaterno: 'LOCAL', fechaNacimiento: '2010-01-01' })) {
      await dialog.locator(`input[name="${name}"]`).fill(value);
    }
    await dialog.getByLabel(/^Sexo/).click();
    await page.getByRole('option', { name: 'Masculino', exact: true }).click();
    await dialog.getByRole('button', { name: 'Crear matrícula', exact: true }).click();
    await dialog.waitFor({ state: 'hidden' });
    const created = await page.evaluate(() => window.calls.filter(call => call.name === 'createRegistroAuxiliarMatricula').at(-1));
    assert.equal(created.input.dni, '001234567');
    assert.equal(created.input.grupoModuloId, 50);
    assert.equal(created.input.manual.nombre, 'NUEVO');
    assert.equal(created.input.manual.celular, undefined, 'Los datos opcionales vacíos no bloquean la matrícula');
    await page.getByText(/LOCAL PRUEBA|PRUEBA LOCAL/).first().waitFor();
    assert.deepEqual(errors, []);
    console.log('Navegador: campo DNI, apertura manual con más de ocho caracteres, matrícula manual con CE y consulta automática con DNI.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
