const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { build } = require('esbuild');
const { chromium } = require('../tmp/browser-check/node_modules/playwright');
const root = path.resolve(__dirname, '..');
const fixture = {
  grupo: { id: 40, semestre: { titulo: '2026-2' } },
  grupoModulo: { id: 50, nombre: 'Grupo de prueba', modulo: { id: 10, titulo: 'Módulo de prueba', creditosEfsrt: 2, plan: { carrera: { nombre: 'Carrera', tipoCarrera: { nombre: 'Programa de Estudios' } } } } },
  estructura: [{ id: 1, nombre: 'Unidad', creditos: 1, capacidadesTerminales: [{ id: 2, codigo: 'C1', competenciaCodigo: 'UC1', descripcion: 'Descripción completa de capacidad', indicadoresCapacidad: [
    { id: 3, codigo: 'I1', descripcion: 'Descripción completa de indicador' }, { id: 4, codigo: 'I2', descripcion: 'Segundo indicador' },
  ] }] }],
  estudiantes: [1, 2, 3].map(id => ({ id: id + 300, matriculaId: id + 200, matricula: { id: id + 200, codigoInscripcion: `2600${id}`, user: { nombre: `Alumno ${id}`, apellidoPaterno: 'Prueba' } } })),
  notas: [{ id: 1, matriculaId: 201, indicadorCapacidadId: 3, promedio: 14 }], promediosEfsrtPpp: [],
};
const mocks = {
  '@/lib/firebase': `export const app={options:{projectId:'grade-fixture'}};`,
  '@/context/AuthContext': `const teacher=location.search.includes('docente');const user={uid:'teacher-fixture',level:teacher?100:600,role:teacher?4:'admin'};export const useAuth=()=>({user});`,
  '@/hooks/useIntranetPermissions': `export const useIntranetPermissions=()=>({can:()=>true});`,
  '@/hooks/useCurrentSemestreFilter': `import{useState}from'react';export const useCurrentSemestreFilter=()=>useState('1');`,
  '@/hooks/useAppSettings': `import{defaultAppSettings}from'@/lib/appSettings';const settings={...defaultAppSettings,general:{...defaultAppSettings.general,semestres:[{id:1,titulo:'2026-2'}],semestreActualId:1}};export const useAppSettings=()=>({settings});`,
  '@/lib/matriculasListCache': `export const invalidateMatriculaLists=()=>{};`,
  'next/navigation': `const params=new URLSearchParams('grupoModuloId=50');export const useSearchParams=()=>params;`,
  'firebase/auth': `const auth={currentUser:{uid:'teacher-fixture',getIdToken:async()=>''}};export const getAuth=()=>auth;`,
  'firebase/functions': `const f={};export const getFunctions=()=>f;export const httpsCallable=(_,name)=>async input=>{
    window.calls.push({name,input});
    if(name==='getDatosGeneralesGlobales')return{data:{}};
    if(name==='getRegistroAuxiliar')return{data:window.fixture};
    return new Promise((resolve,reject)=>window.requests.push({name,input,resolve:data=>resolve({data}),reject:()=>reject(Error('Sin conexión de prueba'))}));
  };`,
};
(async () => {
  const bundle = await build({ stdin: { contents: `import React from'react';import{createRoot}from'react-dom/client';import View from'./src/app/(aplicacion)/intranet/registro-auxiliar/page';import PrintView from'./src/app/(sueltos)/intranet/registro-auxiliar/imprimir/page';window.fixture=${JSON.stringify(fixture)};window.calls=[];window.requests=[];createRoot(document.getElementById('root')).render(location.search.includes('print')?<PrintView/>:<View/>);`, resolveDir: root, loader: 'tsx' }, bundle: true, write: false, jsx: 'automatic', format: 'iife', define: { 'process.env.NODE_ENV': '"development"' }, plugins: [{ name: 'fixtures', setup(builder) {
    builder.onResolve({ filter: /.*/ }, args => mocks[args.path] ? { path: args.path, namespace: 'mock' } : undefined);
    builder.onLoad({ filter: /.*/, namespace: 'mock' }, args => ({ contents: mocks[args.path], loader: 'tsx', resolveDir: root }));
    builder.onResolve({ filter: /^@\// }, args => { const base = path.join(root, 'src', args.path.slice(2)); for (const suffix of ['.ts', '.tsx']) if (fs.existsSync(base + suffix)) return { path: base + suffix }; });
  } }] });
  let browser;
  try {
    browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
    const page = await browser.newPage({ viewport: { width: 1500, height: 1100 } }), errors = [];
    await page.route('http://127.0.0.1:3001/**', route => route.fulfill({
      contentType: new URL(route.request().url()).pathname === '/bundle.js' ? 'text/javascript' : 'text/html',
      body: new URL(route.request().url()).pathname === '/bundle.js' ? bundle.outputFiles[0].text : '<meta charset="utf-8"><div id="root"></div><script src="/bundle.js"></script>',
    }));
    page.on('pageerror', error => errors.push(error.message));
    const cell = (student, indicator) => page.locator(`[data-nota-key="${student}:${indicator}"]`);
    const resolveSave = async index => page.evaluate(index => { const request = window.requests[index]; request.resolve({ saved: request.input.notas.length, efsrtPppSaved: request.input.efsrtPppPromedios.length }); }, index);
    const noReload = async () => assert.equal(await page.evaluate(() => window.calls.filter(call => call.name === 'getRegistroAuxiliar').length), 1);
    await page.goto('http://127.0.0.1:3001/?docente'); await cell(201, 3).waitFor();
    const teacherTitle = fixture.grupoModulo.modulo.titulo.toLocaleUpperCase('es-PE');
    const teacherHeading = page.getByRole('heading', { level: 1, name: teacherTitle, exact: true });
    await teacherHeading.waitFor();
    assert.equal(await page.title(), teacherTitle);
    for (const width of [390, 700, 1000]) {
      await page.setViewportSize({ width, height: 1100 });
      const titleBox = await teacherHeading.boundingBox();
      const status = teacherHeading.locator('..').getByRole('status');
      const statusBox = await status.boundingBox();
      const buttonBox = await page.getByRole('button', { name: 'Vista previa de impresion', exact: true }).boundingBox();
      assert(buttonBox.y < statusBox.y + statusBox.height, `At ${width}px the buttons stay alongside the title`);
      assert(Math.abs(statusBox.y - titleBox.y - titleBox.height) < 1, 'Save status sits directly below the title');
      assert.equal(await status.evaluate(element => getComputedStyle(element).marginBottom), '0px');
    }
    await page.setViewportSize({ width: 1500, height: 1100 });
    assert.equal(await page.getByText(`REGISTRO AUXILIAR DE EVALUACION ${fixture.grupo.semestre.titulo}`, { exact: true }).count(), 1, 'The table keeps its register heading for teachers');
    await page.goto('http://127.0.0.1:3001/'); await cell(201, 3).waitFor();
    const registerHeading = page.getByRole('heading', { level: 1, name: 'Registro Auxiliar de Evaluación', exact: true });
    const saveStatus = registerHeading.locator('..').getByRole('status');
    assert.equal(await saveStatus.innerText(), 'Listo');
    assert.deepEqual(await page.locator('thead strong').allTextContents(), ['C1:', 'I1:', 'I2:']);
    const expectedDescriptions = [fixture.estructura[0].capacidadesTerminales[0].descripcion,
      ...fixture.estructura[0].capacidadesTerminales[0].indicadoresCapacidad.map(row => row.descripcion)];
    for (let index = 0; index < expectedDescriptions.length; index++) {
      const code = page.locator('thead strong').nth(index);
      assert.equal(await code.evaluate(element => getComputedStyle(element).fontWeight), '700');
      const parent = code.locator('..');
      assert((await parent.innerText()).includes(expectedDescriptions[index]), 'Descriptions must appear in the header, not only the tooltip');
      assert.equal(await parent.evaluate(element => getComputedStyle(element).fontWeight), '400');
    }
    assert.equal(await page.getByRole('button', { name: 'Guardar', exact: true }).count(), 0);
    const original = await cell(201, 3).elementHandle();
    await cell(201, 3).fill('16');
    await page.waitForFunction(() => window.requests.length === 1);
    assert.equal(await saveStatus.innerText(), 'Guardando…', 'Saving status appears below the register title');
    const titleBox = await registerHeading.boundingBox(), statusBox = await saveStatus.boundingBox();
    assert(statusBox.y >= titleBox.y + titleBox.height, 'Save status belongs below the heading');
    await cell(201, 3).fill('19'); await cell(201, 4).fill('18');
    assert.equal(await cell(201, 3).inputValue(), '19');
    assert.equal(await cell(201, 4).isEnabled(), true);
    assert.equal(await page.evaluate(() => window.requests.length), 1, 'Only one writer runs while typing continues');
    await resolveSave(0); await page.waitForFunction(() => window.requests.length === 2);
    const newer = await page.evaluate(() => window.requests[1].input);
    assert.equal(newer.partial, true); assert.equal(newer.notas.find(row => row.indicadorCapacidadId === 3).nota, 19);
    await resolveSave(1);
    await page.waitForFunction(() => !Object.keys(localStorage).some(key => key.startsWith('cetpro.registro-notas')));
    assert.equal(await saveStatus.innerText(), 'Listo');
    assert.equal(await original.evaluate(element => element === document.querySelector('[data-nota-key="201:3"]')), true, 'Saving preserves the exact input DOM node');
    await noReload();
    // Pasted blank rows retain their original row positions and include EFSRT/PPP.
    await cell(201, 3).evaluate(element => { const data = new DataTransfer(); data.setData('text', '10\t11\t12\n\n18\t19\t20\n'); element.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true })); });
    await page.waitForFunction(() => window.requests.length === 3);
    assert.equal(await cell(202, 3).inputValue(), ''); assert.equal(await cell(203, 3).inputValue(), '18');
    assert.equal(await page.locator('[data-efsrt-key="303"]').inputValue(), '20');
    await page.evaluate(() => window.requests[2].reject());
    await page.getByRole('button', { name: 'Reintentar', exact: true }).waitFor();
    await cell(201, 4).fill('17');
    assert.equal(await cell(201, 4).inputValue(), '17');
    // A reload recovers unsaved edits from persistent storage over the server's older values.
    await page.reload(); await cell(201, 4).waitFor();
    assert.equal(await cell(201, 4).inputValue(), '17');
    await page.waitForFunction(() => window.requests.length === 1); await resolveSave(0);
    await page.waitForFunction(() => !Object.keys(localStorage).some(key => key.startsWith('cetpro.registro-notas')));
    // Enrollment keeps the table and edited inputs mounted while the last row spins.
    await page.getByText('Doble clic para agregar estudiante por DNI', { exact: true }).dblclick();
    await page.getByPlaceholder('DNI', { exact: true }).fill('12345678');
    await page.getByRole('button', { name: 'Crear matricula', exact: true }).click();
    await page.getByRole('status').filter({ hasText: 'Matriculando estudiante' }).locator('[role="progressbar"]').waitFor();
    await cell(201, 3).fill('15');
    const sameCell = await cell(201, 3).elementHandle();
    await page.evaluate(() => window.requests.find(row => row.name === 'createRegistroAuxiliarMatricula').resolve({ matriculaId: 204, moduloEstudianteId: 304, estudiante: { id: 304, matriculaId: 204, matricula: { id: 204, user: { nombre: 'Estudiante nuevo', apellidoPaterno: 'Álvarez' } } } }));
    await page.locator('[data-registro-student-id="304"]').waitFor();
    assert.deepEqual(await page.locator('[data-registro-student-id]').evaluateAll(rows => rows.map(row => row.getAttribute('data-registro-student-id'))), ['304', '301', '302', '303'], 'New enrollment takes its alphabetical position, including accented surnames');
    assert.equal(await cell(201, 3).inputValue(), '15');
    assert.equal(await sameCell.evaluate(element => element === document.querySelector('[data-nota-key="201:3"]')), true);
    await noReload();
    page.on('dialog', dialog => dialog.accept());
    const retiringRow = page.locator('[data-registro-student-id="304"]');
    const retireButton = () => retiringRow.getByRole('button', { name: 'Retirar de este grupo-módulo', exact: true });
    await retireButton().click();
    await retiringRow.getByRole('progressbar', { name: 'Retirando matrícula' }).waitFor();
    assert.equal(await retiringRow.getAttribute('aria-busy'), 'true');
    assert.equal(await page.locator('[data-registro-student-id="304"]').count(), 1, 'The row remains until deletion is confirmed');
    assert.equal(await sameCell.evaluate(element => element === document.querySelector('[data-nota-key="201:3"]')), true, 'Other cells remain mounted during deletion');
    await noReload();
    await page.evaluate(() => window.requests.filter(row => row.name === 'retireRegistroAuxiliarMatricula').at(-1).reject());
    await retiringRow.getByRole('progressbar').waitFor({ state: 'detached' });
    assert.equal(await retiringRow.getAttribute('aria-busy'), null, 'A failed deletion restores the row');
    await retireButton().click();
    await retiringRow.getByRole('progressbar', { name: 'Retirando matrícula' }).waitFor();
    await page.evaluate(() => window.requests.filter(row => row.name === 'retireRegistroAuxiliarMatricula').at(-1).resolve({ matriculaId: 204, userBlocked: false }));
    await retiringRow.waitFor({ state: 'detached' });
    assert.equal(await sameCell.evaluate(element => element === document.querySelector('[data-nota-key="201:3"]')), true, 'Successful deletion removes only the affected row');
    await noReload();
    await page.goto('http://127.0.0.1:3001/?print');
    await page.locator('.capacity-header-content strong').first().waitFor();
    assert.equal(await page.locator('.capacity-header-content strong').first().innerText(), 'C1:');
    assert.deepEqual(await page.locator('.indicator-header strong').allTextContents(), ['I1:', 'I2:']);
    for (const selector of ['.capacity-header-content', '.indicator-header > span']) {
      const heading = page.locator(selector).first();
      assert.equal(await heading.evaluate(element => getComputedStyle(element).fontWeight), '400');
      assert.equal(await heading.locator('strong').evaluate(element => getComputedStyle(element).fontWeight), '700');
      assert((await heading.innerText()).includes(expectedDescriptions[selector.includes('capacity') ? 0 : 1]));
    }
    assert.deepEqual(errors, []);
    console.log('Navegador: códigos en negrita, guardado continuo sin desmontar celdas, pegado con vacíos/EFSRT, fallo y recuperación tras recarga; matrícula con rueda e inserción sin recargar.');
  } finally { await browser?.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
