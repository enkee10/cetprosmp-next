const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { build } = require('esbuild');
const { chromium } = require('../tmp/browser-check/node_modules/playwright');
const root = path.resolve(__dirname, '..');
const plan = { id: 5, planEstudio: 'Plan 2026', carrera: { nombre: 'Carrera', tipoCarrera: { nombre: 'Opciones Ocupacionales' } } };
const competencia = { id: 10, nombre: 'Competencia inicial', tipo: 'TECNICA', orden: 1, moduloId: 1 };
const selection = { id: 1, planId: 5, semestreId: 1, revision: 0, competenciaIds: [10], unidadIds: [20], capacidadIds: [30], indicadorIds: [40] };
const fixture = {
  planes: [plan], semestreId: 1, semestres: [{ id: 1, titulo: '2026-2' }], selecciones: [selection],
  modulos: [{ id: 1, titulo: 'Módulo inicial', orden: 1, planId: 5, plan, competencias: [competencia], unidadesDidacticas: [
    { id: 20, relacionId: 21, nombre: 'Unidad inicial', orden: 1, competenciaId: 10, competencia, capacidadesTerminales: [
      { id: 30, descripcion: 'Capacidad inicial', orden: 1, unidadDidacticaId: 20, indicadoresCapacidad: [
        { id: 40, descripcion: 'Indicador inicial', orden: 1, capacidadTerminalId: 30, contenidos: [], aprendizajes: [
          { id: 50, orden: 1, actividades: [{ id: 60, nombre: 'Sesión inicial', orden: 1, aprendizajeId: 50, moduloId: 1, materiales: [] }] },
        ] },
      ] },
    ] },
  ] }],
};
const mocks = {
  '@/context/AuthContext': `const user={level:600,email:'admin@example.test',profileResolved:true}; export const useAuth=()=>({user});`,
  '@/lib/firebase': `export const app={};`,
  'firebase/auth': `const auth={currentUser:{getIdToken:async()=>{if(window.holdToken)await new Promise(resolve=>window.releaseToken=resolve);return 'test';}}};export const getAuth=()=>auth;`,
  'firebase/functions': `
    const functions={};export const getFunctions=()=>functions;
    export const httpsCallable=(_,name)=>async input=>{
      window.calls.push({name,input});
      if(name==='listEstructuraAcademica')return {data:window.fixture};
      if(input.previewOnly){if(window.previewFailure)throw Error('Falló la consulta de notas');return {data:{notasAsociadas:0}};}
      if(name==='continueEstructuraAcademicaCompetencia'||name==='deleteEstructuraAcademicaCompetenciaContinuacion'||name==='createEstructuraAcademicaItem'||name==='detachEstructuraAcademicaItem'||name==='setPlanSemesterVisibility'||name==='saveEstructuraAcademicaIndicadorContenido'||name==='reassignEstructuraAcademicaItem'){
        return new Promise((resolve,reject)=>window.requests.push({name,input,resolve:data=>resolve({data}),reject:()=>reject(Error('Falló la solicitud'))}));
      }
      if(name==='updateEstructuraAcademicaCell')return {data:{id:input.id}};
      throw Error('Unexpected callable '+name);
    };`,
  '@/hooks/useAppSettings': `
    import{defaultAppSettings}from'@/lib/appSettings';
    const settings={...defaultAppSettings,programacionCurricular:{...defaultAppSettings.programacionCurricular,mostrarContenidoEnCuadroEmergente:false},general:{...defaultAppSettings.general,semestreActualId:1}};
    export const useAppSettings=()=>({settings,loading:false});`,
  '@/components/intranet/IntranetListLayout': `export default function Layout({children,commands,message}){return <main>{commands}{message&&<div role="alert">{message}</div>}{children}</main>}`,
};
const cases = [
  { entity: 'modulo', card: 'modulo', id: 1, panel: 'Módulos', create: 'Crear modulo', remove: 'Quitar modulo del plan' },
  { entity: 'competencia', card: 'competencia', id: 10, panel: 'Competencias', create: 'Crear competencia', remove: 'Eliminar competencia' },
  { entity: 'unidadDidactica', card: 'competenciaUnidadDidactica', id: 21, panel: 'Unidades', create: 'Crear unidad', remove: 'Quitar unidad del modulo' },
  { entity: 'capacidadTerminal', card: 'capacidadTerminal', id: 30, panel: 'Capacidades', create: 'Crear capacidad', remove: 'Quitar capacidad' },
  { entity: 'indicadorCapacidad', card: 'indicadorCapacidad', id: 40, panel: 'Indicadores', create: 'Crear indicador', remove: 'Quitar indicador' },
  { entity: 'actividad', card: 'actividad', id: 60, panel: 'Sesiones', create: 'Crear sesión', remove: 'Eliminar sesión' },
];
function creation(entity) {
  const base = { id: 100, orden: 2 };
  const items = {
    modulo: { ...base, titulo: 'Nuevo módulo', planId: 5, plan },
    competencia: { ...base, nombre: 'Nueva competencia', tipo: 'TECNICA', moduloId: 1 },
    unidadDidactica: { ...base, nombre: 'Nueva unidad' },
    capacidadTerminal: { ...base, descripcion: 'Nueva capacidad', unidadDidacticaId: 20 },
    indicadorCapacidad: { ...base, descripcion: 'Nuevo indicador', capacidadTerminalId: 30 },
    actividad: { ...base, nombre: 'Nueva sesión', aprendizajeId: 50, moduloId: 1 },
  };
  return { id: 100, entity, item: items[entity], ...(entity === 'unidadDidactica' ? {
    unitAssignments: [{ id: 101, orden: 2, unidadDidacticaId: 100, competenciaId: 10, competencia }],
  } : {}) };
}
(async () => {
  const bundled = await build({
    stdin: { contents: `import React from 'react';import{createRoot}from'react-dom/client';
      import View from './src/components/intranet/academico/EstructuraAcademicaMasterDetail';
      window.fixture=${JSON.stringify(fixture)};
      if(location.search.includes('continuation')){
        const original={id:110,nombre:'Competencia anterior',tipo:'TECNICA',orden:1,moduloId:2};
        window.fixture.modulos[0].competencias.push({...original,esContinuacion:true,continuacionId:70,continuacionPlanId:5,moduloOrigenId:2});
        window.fixture.modulos.push({id:2,titulo:'Modulo anterior',orden:0,planId:5,plan:window.fixture.planes[0],competencias:[original],
          unidadesDidacticas:[{id:220,relacionId:221,nombre:'Unidad anterior intacta',orden:1,competenciaId:110,competencia:original,capacidadesTerminales:[]}]});
        window.fixture.modulos[0].planModuloId=6;
        if(location.search.includes('create'))window.fixture.modulos[0].competencias.pop();
      }
      if(location.search.includes('grades'))window.fixture.gradeUsage={modules:[],units:[],capacities:[],indicators:[40]};
      if(location.search.includes('own-averages'))window.fixture.gradeUsage={modules:[],units:[20],capacities:[30],indicators:[]};
      if(location.search.includes('hidden'))window.fixture.selecciones[0].indicadorIds=[];
      if(location.search.includes('ancestor')){
        const comp={id:110,nombre:'Competencia destino',tipo:'TECNICA',orden:1,moduloId:2};
        window.fixture.modulos.push({id:2,titulo:'Módulo destino',orden:2,planId:5,plan:window.fixture.planes[0],
          competencias:location.search.includes('filled')?[comp]:[],
          unidadesDidacticas:location.search.includes('filled')?[{id:120,relacionId:121,nombre:'Unidad destino',orden:1,competenciaId:110,competencia:comp,capacidadesTerminales:[
            {id:130,descripcion:'Capacidad destino',orden:1,unidadDidacticaId:120,indicadoresCapacidad:[
              {id:140,descripcion:'Indicador destino',orden:1,capacidadTerminalId:130,contenidos:[],aprendizajes:[{id:150,descripcion:'',orden:1,indicadorCapacidadId:140,actividades:[]}]}]}]}]:[]});
      }
      if(location.search.includes('period'))window.fixture.planes[0].carrera.tipoCarrera.nombre='Programa de Estudios';
      window.calls=[];window.requests=[];window.confirmations=[];
      window.confirm=message=>{window.confirmations.push({message,busy:document.querySelectorAll('[data-academic-card][aria-busy="true"]').length});return !window.cancelDelete;};
      createRoot(document.getElementById('root')).render(<View/>);`, resolveDir: root, loader: 'tsx' },
    bundle: true, write: false, format: 'iife', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"development"' },
    plugins: [{ name: 'fixtures', setup(builder) {
      builder.onResolve({ filter: /.*/ }, args => mocks[args.path] ? { path: args.path, namespace: 'fixture' } : undefined);
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: mocks[args.path], loader: 'tsx', resolveDir: root }));
      builder.onResolve({ filter: /^@\// }, args => {
        const filename = path.join(root, 'src', args.path.slice(2));
        for (const suffix of ['.ts', '.tsx', '/index.ts', '/index.tsx']) if (fs.existsSync(filename + suffix)) return { path: filename + suffix };
      });
    } }],
  });
  const server = http.createServer((request, response) => {
    response.setHeader('Content-Type', request.url === '/bundle.js' ? 'text/javascript' : 'text/html');
    response.end(request.url === '/bundle.js' ? bundled.outputFiles[0].text : '<html><meta charset="utf-8"><div id="root"></div><script src="/bundle.js"></script></html>');
  });
  let browser;
  try {
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(3001, '127.0.0.1', resolve); });
    const executablePath = process.env.CURRICULAR_BROWSER_PATH || [
      'C:/Program Files/Google/Chrome/Application/chrome.exe',
      'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    ].find(filename => fs.existsSync(filename));
    browser = await chromium.launch({ headless: true, executablePath });
    const page = await browser.newPage({ viewport: { width: 1450, height: 1100 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const load = async (period = false) => {
      await page.goto('http://127.0.0.1:3001/' + (period ? '?period' : ''));
      await page.locator('[data-academic-entity="actividad"][data-academic-id="60"]').waitFor();
    };
    const card = (entity, id) => page.locator(`[data-academic-entity="${entity}"][data-academic-id="${id}"]`);
    const resolve = async data => page.evaluate(data => window.requests.at(-1).resolve(data), data);
    const reject = async () => page.evaluate(() => window.requests.at(-1).reject());
    for (const entry of cases) {
      for (const fail of [false, true]) {
        await load();
        const panel = page.getByRole('region', { name: entry.panel, exact: true });
        await panel.getByRole('button', { name: entry.create, exact: true }).click();
        await panel.locator('[data-academic-creation-pending] [role="progressbar"]').waitFor();
        await page.waitForFunction(() => window.requests.length === 1);
        assert.equal(await panel.locator('[data-academic-card]').count(), 2, 'The placeholder appears alongside existing cards');
        if (fail) await reject(); else await resolve(creation(entry.entity));
        await panel.locator('[data-academic-creation-pending]').waitFor({ state: 'detached' });
        if (fail) {
          assert.equal(await panel.locator('[data-academic-card]').count(), 1);
          await page.getByRole('alert').filter({ hasText: 'Falló la solicitud' }).waitFor();
        } else {
          const created = card(entry.card, entry.entity === 'unidadDidactica' ? 101 : 100);
          await created.waitFor();
          assert.equal(await created.getAttribute('aria-busy'), null);
          await created.locator('span[title="Doble clic para editar"]').first().dblclick();
          await created.locator('textarea').first().waitFor();
        }

        await load();
        await page.getByRole('region', { name: entry.panel, exact: true }).getByRole('button', { name: entry.remove, exact: true }).click();
        const deleting = card(entry.card, entry.id);
        await deleting.locator('[role="progressbar"]').waitFor();
        assert.equal(await deleting.getAttribute('aria-busy'), 'true');
        assert.equal(await deleting.locator('[inert]').evaluate(element => getComputedStyle(element).opacity), '0.35');
        assert.equal(await page.locator('[data-academic-card][aria-busy="true"]').count(), 1, 'Only the requested card is busy');
        assert.equal(await page.evaluate(() => window.confirmations.at(-1).busy), 0, 'The spinner begins after confirmation');
        if (fail) await reject(); else await resolve({ id: entry.id });
        if (fail) {
          await deleting.locator('[role="progressbar"]').waitFor({ state: 'detached' });
          assert.equal(await deleting.getAttribute('aria-busy'), null);
          assert.equal(await deleting.locator('[inert]').count(), 0);
        } else await deleting.waitFor({ state: 'detached' });
      }
    }

    // Empty sections need a first placeholder, even while refreshing the auth token.
    await load();
    await page.getByRole('region', { name: 'Competencias', exact: true }).getByRole('button', { name: 'Crear competencia', exact: true }).click();
    await page.waitForFunction(() => window.requests.length === 1);
    await resolve(creation('competencia'));
    await card('competencia', 100).waitFor();
    await page.evaluate(() => { window.holdToken = true; window.requests = []; });
    await page.getByRole('region', { name: 'Unidades', exact: true }).getByRole('button', { name: 'Crear unidad', exact: true }).click();
    await page.getByRole('region', { name: 'Unidades', exact: true }).locator('[data-academic-creation-pending]').waitFor();
    assert.equal(await page.evaluate(() => window.requests.length), 0, 'The placeholder renders before token refresh completes');
    await page.evaluate(() => { window.holdToken = false; window.releaseToken(); });
    await page.waitForFunction(() => window.requests.length === 1);
    await reject();
    await page.getByRole('region', { name: 'Unidades', exact: true }).getByText('Sin unidades.', { exact: true }).waitFor();

    // Keep the real card busy until period activation also finishes.
    await load(true);
    await page.getByRole('region', { name: 'Capacidades', exact: true }).getByRole('button', { name: 'Crear capacidad', exact: true }).click();
    await page.waitForFunction(() => window.requests.length === 1);
    await resolve(creation('capacidadTerminal'));
    await page.waitForFunction(() => window.requests.length === 2);
    await card('capacidadTerminal', 100).locator('[role="progressbar"]').waitFor();
    assert.equal(await page.locator('[data-academic-creation-pending]').count(), 0);
    assert.equal(await page.evaluate(() => window.requests.at(-1).name), 'setPlanSemesterVisibility');
    await resolve({ selection: { ...selection, capacidadIds: [30, 100], revision: 1 } });
    await card('capacidadTerminal', 100).locator('[role="progressbar"]').waitFor({ state: 'detached' });

    await load();
    await page.evaluate(() => { window.cancelDelete = true; });
    await page.getByRole('region', { name: 'Indicadores', exact: true }).getByRole('button', { name: 'Quitar indicador', exact: true }).click();
    assert.equal(await page.evaluate(() => window.requests.length), 0);
    assert.equal(await page.locator('[data-academic-card][aria-busy="true"]').count(), 0);
    await card('indicadorCapacidad', 40).waitFor();
    await require('./check-content-tree-browser.cjs')({ page, load, card, resolve, reject });
    await require('./check-curricular-ancestor-browser.cjs')({ page, card, resolve, reject });
    await require('./check-curricular-continuation-browser.cjs')({ page, card, resolve, reject });
    await require('./check-curricular-protection-browser.cjs')({ page, card, resolve, reject });
    assert.deepEqual(errors, []);
    console.log('Correcto en navegador: seis secciones, creación y eliminación pendientes, tarjetas translúcidas, fallos, cancelación, sección vacía, token y activación de semestre.');
  } finally {
    await browser?.close();
    if (server.listening) await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
