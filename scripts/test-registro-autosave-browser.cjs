const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { build } = require('esbuild');
const { chromium } = require('../tmp/browser-check/node_modules/playwright');
const { PDFDocument } = require('../functions/node_modules/pdf-lib');
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
const navigationFixture = structuredClone(fixture);
navigationFixture.estructura = Array.from({ length: 7 }, (_, unit) => ({
  id: unit + 1, nombre: `Unidad ${unit + 1}`, creditos: 1,
  capacidadesTerminales: unit === 2 || unit === 3 ? [] : Array.from({ length: unit === 4 || unit === 5 ? 3 : 1 }, (_, cap) => ({
    id: 100 + unit * 10 + cap, codigo: `C${cap + 1}`, descripcion: 'Capacidad de prueba',
    indicadoresCapacidad: Array.from({ length: unit === 6 ? 1 : 3 }, (_, indicator) => ({
      id: 1000 + unit * 100 + cap * 10 + indicator, codigo: `I${indicator + 1}`, descripcion: 'Indicador de prueba',
    })),
  })),
}));
const sizingFixture = structuredClone(fixture);
sizingFixture.estructura = [
  { id: 1, nombre: 'Unidad de textos variados', capacidadesTerminales: [
    { id: 101, codigo: 'C1', descripcion: 'Capacidad breve', indicadoresCapacidad: [
      { id: 501, codigo: 'I1', descripcion: 'Identifica herramientas.' },
      { id: 502, codigo: 'I2', descripcion: 'Organiza y prepara los materiales necesarios para realizar el trabajo con seguridad, siguiendo las indicaciones y verificando previamente las condiciones de cada herramienta. '.repeat(2) },
      { id: 503, codigo: 'I3', descripcion: 'Comprueba los resultados obtenidos, identifica las diferencias y propone mejoras respetando las instrucciones y los procedimientos establecidos para cada situación de trabajo. '.repeat(5) },
    ] },
    { id: 102, codigo: 'C2', descripcion: 'Desarrolla las tareas de preparación, ejecución, evaluación y mejora de los procedimientos de trabajo, justificando cada decisión y comprobando sus resultados. '.repeat(6), indicadoresCapacidad: [
      { id: 504, codigo: 'I1', descripcion: 'Organiza.' }, { id: 505, codigo: 'I2', descripcion: 'Evalúa.' },
    ] },
  ] },
  { id: 2, nombre: 'Segunda unidad', capacidadesTerminales: [
    { id: 103, codigo: 'C1', descripcion: 'Capacidad de la segunda unidad', indicadoresCapacidad: [
      { id: 506, codigo: 'I1', descripcion: 'ResponsabilidadProfesional'.repeat(12) },
      { id: 507, codigo: 'I2', descripcion: 'Termina el trabajo.' },
    ] },
  ] },
  { id: 3, nombre: 'Tercera unidad', capacidadesTerminales: [
    { id: 104, codigo: 'C1', descripcion: 'Capacidad final', indicadoresCapacidad: [{ id: 508, codigo: 'I1', descripcion: 'Entrega.' }] },
  ] },
];
const printFixture = structuredClone(fixture);
const unitAverageFixture = structuredClone(sizingFixture);
unitAverageFixture.estructura = unitAverageFixture.estructura.slice(0, 2);
unitAverageFixture.notas = [12, 14, 16, 18, 20, 10, 10].map((promedio, index) => ({ id: index + 1, matriculaId: 201, indicadorCapacidadId: 501 + index, promedio }));
printFixture.estructura = Array.from({ length: 4 }, (_, unit) => ({
  id: unit + 1, nombre: `Unidad de impresión ${unit + 1}`, capacidadesTerminales: [{
    id: 100 + unit, codigo: 'C1', descripcion: 'Organiza los procedimientos y comprueba los resultados del trabajo en cada etapa.',
    indicadoresCapacidad: Array.from({ length: 3 }, (_, indicator) => ({
      id: 2000 + unit * 10 + indicator, codigo: `I${indicator + 1}`,
      descripcion: 'Prepara los materiales, verifica las herramientas y realiza las operaciones indicadas para obtener los resultados previstos. '.repeat(indicator + 1),
    })),
  }],
}));
const mocks = {
  '@/lib/firebase': `export const app={options:{projectId:'grade-fixture'}};`,
  '@/context/AuthContext': `const teacher=location.search.includes('docente');const user={uid:'teacher-fixture',level:teacher?100:600,role:teacher?4:'admin'};export const useAuth=()=>({user});`,
  '@/hooks/useIntranetPermissions': `export const useIntranetPermissions=()=>({can:()=>true});`,
  '@/hooks/useCurrentSemestreFilter': `import{useState}from'react';export const useCurrentSemestreFilter=()=>useState('1');`,
  '@/hooks/useAppSettings': `import{defaultAppSettings}from'@/lib/appSettings';const settings={...defaultAppSettings,general:{...defaultAppSettings.general,semestres:[{id:1,titulo:'2026-2',fin:location.search.includes('finalizado')?'2000-01-01':'2026-12-23'}],semestreActualId:1}};export const useAppSettings=()=>({settings});`,
  '@/lib/matriculasListCache': `export const invalidateMatriculaLists=()=>{};`,
  'next/navigation': `const params=new URLSearchParams(location.search.includes('convencional')?'':'grupoModuloId=50');export const useSearchParams=()=>params;`,
  'firebase/auth': `const auth={currentUser:{uid:'teacher-fixture',getIdToken:async()=>''}};export const getAuth=()=>auth;`,
  'firebase/functions': `const f={};export const getFunctions=()=>f;export const httpsCallable=(_,name)=>async input=>{
    window.calls.push({name,input});
    if(name==='getDatosGeneralesGlobales')return{data:{}};
    if(name==='getRegistroAuxiliar')return{data:window.fixture};
    if(name==='listRegistroAuxiliarOpciones')return{data:{grupos:[{id:40,semestreId:1,nombreDisplay:'Mi grupo',grupoModulos:[{id:50,grupoId:40,moduloId:10,nombre:'Primer modulo [Tarde] (Grupo A)',modulo:{titulo:'Nombre oficial del primer modulo'}},{id:51,grupoId:40,moduloId:11,nombre:'Segundo modulo',modulo:{titulo:'Segundo modulo'}}]}],semestres:[{id:1,titulo:'2026-2'}]}};
    return new Promise((resolve,reject)=>window.requests.push({name,input,resolve:data=>resolve({data}),reject:()=>reject(Error('Sin conexión de prueba'))}));
  };`,
};
(async () => {
  const bundle = await build({ stdin: { contents: `import React from'react';import{createRoot}from'react-dom/client';import View from'./src/app/(aplicacion)/intranet/registro-auxiliar/page';import PrintView from'./src/app/(sueltos)/intranet/registro-auxiliar/imprimir/page';window.fixture=location.search.includes('unitAverages')?${JSON.stringify(unitAverageFixture)}:location.search.includes('printLayout')?${JSON.stringify(printFixture)}:location.search.includes('sizing')?${JSON.stringify(sizingFixture)}:location.search.includes('navigation')?${JSON.stringify(navigationFixture)}:${JSON.stringify(fixture)};if(location.search.includes('dense')){window.fixture.estructura=window.fixture.estructura.slice(0,1);window.fixture.estructura[0].capacidadesTerminales[0].indicadoresCapacidad=Array.from({length:25},(_,index)=>({id:6000+index,codigo:'I'+(index+1),descripcion:'Indicador de prueba.'}));}if(location.search.includes('manyStudents'))window.fixture.estudiantes=Array.from({length:90},(_,i)=>({id:i+301,matriculaId:i+201,matricula:{id:i+201,user:{nombre:'Alumno '+(i+1),apellidoPaterno:'Prueba'}}}));if(location.search.includes('stress')){window.fixture.estructura=window.fixture.estructura.slice(0,1);const c=window.fixture.estructura[0].capacidadesTerminales[0];if(!location.search.includes('stressIndicator'))c.descripcion='Capacidad de contenido muy extenso. '.repeat(180);if(!location.search.includes('stressCapacity'))c.indicadoresCapacidad.forEach(i=>i.descripcion='Indicador de contenido muy extenso. '.repeat(180));}if(location.search.includes('occupational'))window.fixture.grupoModulo.modulo.plan.carrera.tipoCarrera.nombre='Opción Ocupacional';window.calls=[];window.requests=[];createRoot(document.getElementById('root')).render(location.search.includes('print')?<PrintView/>:<View/>);`, resolveDir: root, loader: 'tsx' }, bundle: true, write: false, jsx: 'automatic', format: 'iife', define: { 'process.env.NODE_ENV': '"development"' }, plugins: [{ name: 'fixtures', setup(builder) {
    builder.onResolve({ filter: /.*/ }, args => mocks[args.path] ? { path: args.path, namespace: 'mock' } : undefined);
    builder.onLoad({ filter: /.*/, namespace: 'mock' }, args => ({ contents: mocks[args.path], loader: 'tsx', resolveDir: root }));
    builder.onResolve({ filter: /^@\// }, args => { const base = path.join(root, 'src', args.path.slice(2)); for (const suffix of ['.ts', '.tsx']) if (fs.existsSync(base + suffix)) return { path: base + suffix }; });
  } }] });
  let browser;
  try {
    browser = await chromium.launch({ headless: true, ignoreDefaultArgs: ['--hide-scrollbars'], executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
    const page = await browser.newPage({ viewport: { width: 1500, height: 1100 } }), errors = [];
    await page.route('http://127.0.0.1:3001/**', route => route.fulfill({
      contentType: new URL(route.request().url()).pathname === '/bundle.js' ? 'text/javascript' : 'text/html',
      body: new URL(route.request().url()).pathname === '/bundle.js' ? bundle.outputFiles[0].text : '<meta charset="utf-8"><div id="root"></div><script src="/bundle.js"></script>',
    }));
    page.on('pageerror', error => errors.push(error.message));
    const cell = (student, indicator) => page.locator(`[data-nota-key="${student}:${indicator}"]`);
    const resolveSave = async index => page.evaluate(index => { const request = window.requests[index]; request.resolve({ saved: request.input.notas.length, efsrtPppSaved: request.input.efsrtPppPromedios.length }); }, index);
    const noReload = async () => assert.equal(await page.evaluate(() => window.calls.filter(call => call.name === 'getRegistroAuxiliar').length), 1);
    await page.goto('http://127.0.0.1:3001/?deleteRange'); await cell(201, 3).waitFor();
    await cell(201, 3).evaluate(element => {
      const data = new DataTransfer(); data.setData('text', '10\t11\t12\n13\t14\t15\n16\t17\t18');
      element.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
    });
    await page.waitForFunction(() => window.requests.length === 1); await resolveSave(0);
    await page.waitForFunction(() => !Object.keys(localStorage).some(key => key.startsWith('cetpro.registro-notas')));
    const selectedInput = await cell(201, 3).elementHandle();
    await page.locator('[data-efsrt-key="302"]').click();
    await cell(201, 3).click({ modifiers: ['Shift'] });
    await page.keyboard.press('Delete');
    for (const student of [201, 202]) {
      for (const indicator of [3, 4]) assert.equal(await cell(student, indicator).inputValue(), '');
      assert.equal(await page.locator(`[data-efsrt-key="${student + 100}"]`).inputValue(), '');
      assert.equal(await page.locator(`[data-registro-unit-average-key="${student}:1"]`).innerText(), '');
    }
    assert.equal(await cell(203, 3).inputValue(), '16', 'Delete preserves notes outside the selected rectangle');
    assert.equal(await page.locator('[data-efsrt-key="303"]').inputValue(), '18');
    assert.equal(await selectedInput.evaluate(element => element === document.querySelector('[data-nota-key="201:3"]')), true);
    await page.waitForFunction(() => window.requests.length === 2);
    const cleared = await page.evaluate(() => window.requests[1].input);
    assert.equal(cleared.notas.length, 4);
    assert.equal(cleared.efsrtPppPromedios.length, 2);
    assert(cleared.notas.every(row => row.nota === null) && cleared.efsrtPppPromedios.every(row => row.promedioFinal === null));
    await resolveSave(1);
    await page.waitForFunction(() => !Object.keys(localStorage).some(key => key.startsWith('cetpro.registro-notas')));
    // Selecting across noneditable cells also works when no grade input has focus.
    await page.locator('[data-registro-unit-average-key="203:1"]').click();
    await page.locator('[data-registro-student-id="303"] td').nth(1).click({ modifiers: ['Shift'] });
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('tabindex')), '-1');
    await page.keyboard.press('Delete');
    assert.equal(await cell(203, 3).inputValue(), '');
    assert.equal(await cell(203, 4).inputValue(), '');
    assert.equal(await page.locator('[data-efsrt-key="303"]').inputValue(), '18');
    await page.waitForFunction(() => window.requests.length === 3); await resolveSave(2);
    await page.waitForFunction(() => !Object.keys(localStorage).some(key => key.startsWith('cetpro.registro-notas')));
    await noReload();
    await page.goto('http://127.0.0.1:3001/?docente'); await cell(201, 3).waitFor();
    assert.equal(await page.getByRole('heading', { level: 1, name: 'RAE', exact: true }).innerText(), 'RAE');
    const semester = page.getByRole('combobox', {name:'Semestre', exact:true});
    assert.equal(await semester.isDisabled(), true);
    assert.equal(await semester.innerText(), '2026-2');
    for (const width of [390, 700, 1000]) {
      await page.setViewportSize({ width, height: 1100 });
      const status = page.getByRole('status');
      const statusBox = await status.boundingBox(), semesterBox = await semester.boundingBox();
      const buttonBox = await page.getByRole('button', { name: 'Vista previa de impresion', exact: true }).boundingBox();
      assert.equal(await status.innerText(), 'Listo');
      assert(buttonBox.y < statusBox.y + statusBox.height, 'Buttons stay on the toolbar');
      assert(Math.abs(statusBox.y + statusBox.height - semesterBox.y - semesterBox.height) < 2, 'Status stays at the bottom of the toolbar');
      assert.equal(await status.evaluate(element => getComputedStyle(element).marginBottom), '0px');
    }
    await page.setViewportSize({ width: 1500, height: 1100 });
    assert.equal(await page.getByText(`REGISTRO AUXILIAR DE EVALUACION ${fixture.grupo.semestre.titulo}`, { exact: true }).count(), 1, 'The table keeps its register heading for teachers');
    // Teacher uses the conventional entry and chooses only supplied assigned modules.
    await page.goto('http://127.0.0.1:3001/?docente&convencional');
    await cell(201, 3).waitFor();
    const moduleSelector = page.getByRole('combobox', { name: 'Modulo', exact: true });
    assert.equal(await page.getByRole('combobox', {name:'Semestre', exact:true}).isDisabled(), true);
    let previousModuleWidth = Infinity;
    for (const width of [1500, 1200, 1000, 900]) {
      await page.setViewportSize({width,height:1100});
      await page.evaluate(width=>{document.getElementById('root').style.width=(width-250)+'px';},width);
      const semesterBox=await page.getByRole('combobox',{name:'Semestre',exact:true}).locator('..').boundingBox();
      const moduleBox=await moduleSelector.locator('..').boundingBox();
      const actionBox=await page.getByRole('button',{name:'Vista previa de impresion',exact:true}).locator('../..').boundingBox();
      const statusBox=await page.getByRole('status').boundingBox();
      assert(Math.abs(semesterBox.y-moduleBox.y)<2,'Register filters remain on one desktop row');
      assert(Math.abs(actionBox.y+actionBox.height/2-moduleBox.y-moduleBox.height/2)<2,'Register actions remain on the same desktop row');
      assert(Math.abs(actionBox.x-moduleBox.x-moduleBox.width-8)<2,'The register module selector uses all space up to the actions');
      assert(Math.abs(statusBox.width-100)<1,'The RAE title and status keep their fixed 100px width');
      assert(moduleBox.width<previousModuleWidth,'The register selector shrinks with the desktop viewport');
      previousModuleWidth=moduleBox.width;
    }
    await page.setViewportSize({width:1500,height:1100});
    await page.evaluate(()=>{document.getElementById('root').style.width='';});
    await moduleSelector.click();
    assert.equal(await page.getByRole('option').count(), 2);
    assert.deepEqual(await page.getByRole('option').allTextContents(), ['Primer modulo [Tarde] (Grupo A)', 'Segundo modulo'], 'Module labels preserve the saved name without adding the official title');
    await page.getByRole('option').last().click();
    await page.waitForFunction(() => window.calls.some(call => call.name === 'getRegistroAuxiliar' && call.input.grupoModuloId === 51));
    await page.goto('http://127.0.0.1:3001/?docente&finalizado');
    await cell(201, 3).waitFor();
    await page.getByText('(Modulo Finalizado)', {exact:true}).waitFor();
    assert.equal(await cell(201, 3).getAttribute('readonly'), '');
    await cell(201, 3).click(); await cell(202, 4).click({ modifiers: ['Shift'] });
    await page.keyboard.press('Delete');
    assert.equal(await cell(201, 3).inputValue(), '14', 'Delete respects the closed-semester read-only state');
    assert.equal(await page.getByRole('status').count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Vista previa de impresion', exact: true }).isEnabled(), true);
    assert.equal(await page.evaluate(() => window.calls.some(call => call.name === 'saveRegistroAuxiliar')), false);
    // Open register crosses Peru midnight without reloading.
    await page.clock.install({time: new Date('2026-12-24T04:59:59Z')});
    await page.goto('http://127.0.0.1:3001/?docente'); await cell(201, 3).waitFor();
    assert.equal(await cell(201, 3).getAttribute('readonly'), null);
    await page.clock.runFor(1100);
    await page.getByText('(Modulo Finalizado)', {exact:true}).waitFor();
    assert.equal(await cell(201, 3).getAttribute('readonly'), '');
    await page.clock.setFixedTime(new Date());
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
    const scrollbarCases = await page.evaluate(async () => {
      const root = document.getElementById('root');
      const scroll = document.querySelector('[data-nota-key]').closest('table').parentElement.parentElement;
      const paper = scroll.parentElement;
      const originalStyle = paper.getAttribute('style');
      const results = [];
      const frames = async count => { for (let i = 0; i < count; i++) await new Promise(requestAnimationFrame); };
      try {
        paper.style.boxSizing = 'border-box';
        for (const width of [1000.1, 1000.5, 1000.9]) {
          root.style.width = `${width}px`;
          await frames(5);
          const contentHeight = Math.ceil(scroll.firstElementChild.getBoundingClientRect().height);
          for (const offset of [1, 2, 20]) {
            paper.style.height = paper.style.minHeight = paper.style.maxHeight = `${contentHeight + offset}px`;
            const samples = [];
            for (let i = 0; i < 30; i++) {
              await frames(1);
              samples.push([scroll.clientWidth, scroll.clientHeight, scroll.scrollWidth, scroll.scrollHeight]);
            }
            const tail = samples.slice(10);
            results.push({ width, offset, last: tail.at(-1), changes: tail.filter((sample, index) => index && sample.join() !== tail[index - 1].join()).length });
          }
        }
      } finally {
        root.style.removeProperty('width');
        if (originalStyle === null) paper.removeAttribute('style'); else paper.setAttribute('style', originalStyle);
      }
      return results;
    });
    for (const result of scrollbarCases) {
      assert(result.changes <= 1, `Scrollbar layout must settle without oscillating: ${JSON.stringify(result)}`);
      assert(result.last[2] <= result.last[0], `A table that fits must not generate a horizontal scrollbar: ${JSON.stringify(result)}`);
    }
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
    await page.getByRole('button', { name: 'MATRICULAR', exact: true }).click();
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
    for (const occupational of [false, true]) {
      await page.goto(`http://127.0.0.1:3001/?navigation${occupational ? '&occupational' : ''}`);
      await cell(202, 1000).waitFor();
      await cell(202, 1000).focus();
      await page.keyboard.press('ArrowLeft');
      assert(await cell(202, 1000).evaluate(element => element === document.activeElement), 'The first page stays at its first grade');
      await cell(202, 1102).focus();
      await cell(202, 1102).fill('17');
      await page.keyboard.press('ArrowRight');
      await page.waitForFunction(() => document.activeElement?.getAttribute('data-nota-key') === '202:1400');
      assert.equal(await cell(202, 1102).count(), 0, 'The next nonempty page replaces visible grades');
      const averageWidths = [];
      for (const width of [1000, 2200, 3000]) {
        await page.setViewportSize({ width, height: 1100 });
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const averages = await page.locator('thead th').filter({ hasText: /^PROMEDIO UNIDAD$/ }).evaluateAll(cells => cells.map(cell => cell.getBoundingClientRect().width));
        const summaryWidths = await page.locator('thead th').filter({ hasText: /^(EFSRT\/PPP|Puntaje|Promedio General|Promedio)$/ }).evaluateAll(cells => cells.map(cell => cell.getBoundingClientRect().width));
        assert.equal(summaryWidths.length, occupational ? 2 : 3);
        for (const summaryWidth of summaryWidths) assert(Math.abs(summaryWidth - 45) < 0.5, `Summary columns remain fixed at 45px: ${summaryWidth}`);
        const indicatorWidth = (await cell(202, 1400).locator('..').boundingBox()).width;
        assert(averages.length > 1, 'Unit averages are measured');
        for (const average of averages) {
          assert(average >= 39.5 && average <= 70.5, `Average width must remain between 40 and 70px: ${average}`);
          assert(average < indicatorWidth, `Averages stay narrower than indicators: ${average} < ${indicatorWidth}`);
        }
        averageWidths.push(averages[0]);
      }
      assert(averageWidths[0] < averageWidths.at(-1), 'Average width grows with available space');
      await page.keyboard.press('ArrowLeft');
      await page.waitForFunction(() => document.activeElement?.getAttribute('data-nota-key') === '202:1102');
      assert.equal(await cell(202, 1102).inputValue(), '17', 'Changing pages preserves a grade while its save is pending');
      await page.keyboard.press('ArrowRight');
      await page.waitForFunction(() => document.activeElement?.getAttribute('data-nota-key') === '202:1400');
      await cell(202, 1522).focus();
      await page.keyboard.press('ArrowRight');
      await page.waitForFunction(() => document.activeElement?.getAttribute('data-nota-key') === '202:1600');
      await page.keyboard.press('ArrowRight');
      if (occupational) assert(await cell(202, 1600).evaluate(element => element === document.activeElement), 'The last occupational page stops at its last grade');
      else {
        await page.waitForFunction(() => document.activeElement?.getAttribute('data-efsrt-key') === '302');
        await page.keyboard.press('ArrowRight');
        assert(await page.locator('[data-efsrt-key="302"]').evaluate(element => element === document.activeElement), 'EFSRT remains reachable on the last page');
        await page.keyboard.press('ArrowLeft');
        await page.waitForFunction(() => document.activeElement?.getAttribute('data-nota-key') === '202:1600');
      }
      await page.keyboard.press('ArrowLeft');
      await page.waitForFunction(() => document.activeElement?.getAttribute('data-nota-key') === '202:1522');
      await page.keyboard.press('ArrowUp');
      await page.waitForFunction(() => document.activeElement?.getAttribute('data-nota-key') === '201:1522');
      await page.keyboard.press('ArrowDown');
      await page.waitForFunction(() => document.activeElement?.getAttribute('data-nota-key') === '202:1522');
      await noReload();
    }
    await page.goto('http://127.0.0.1:3001/?sizing');
    await cell(202, 501).waitFor();
    const preservedSizingCell = await cell(202, 501).elementHandle();
    const independentWidths = [];
    for (const width of [650, 1800, 4000]) {
      await page.setViewportSize({ width, height: 1100 });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      assert.equal(await page.locator('[data-registro-indicator-label]').count(), 7, 'Exactly the first two units are displayed');
      assert.equal(await cell(202, 508).count(), 0, 'The third unit remains on its own page');
      const geometry = await page.evaluate(() => {
        const labels = [...document.querySelectorAll('[data-registro-indicator-label], [data-registro-capacity-label]')];
        return labels.map(label => {
          const cell = label.closest('th').getBoundingClientRect(), text = label.getBoundingClientRect();
          return {
            id: label.dataset.registroIndicatorLabel || `capacity-${label.dataset.registroCapacityLabel}`,
            cellWidth: cell.width, leftFits: text.left >= cell.left - 0.6, rightFits: text.right <= cell.right + 0.6,
            topFits: text.top >= cell.top - 0.6, bottomFits: text.bottom <= cell.bottom + 0.6,
            noHiddenText: label.scrollWidth <= label.clientWidth + 1,
            textHeight: label.hasAttribute('data-registro-capacity-label') ? label.firstElementChild.getBoundingClientRect().height : null,
          };
        });
      });
      for (const label of geometry) {
        assert(label.leftFits && label.rightFits && label.topFits && label.bottomFits && label.noHiddenText, `Full label fits inside its own cell: ${JSON.stringify(label)}`);
        if (label.textHeight !== null) assert(label.textHeight <= 64.5, `The capacity fits without increasing its header height: ${label.textHeight}`);
      }
      const widths = [501, 502, 503].map(id => geometry.find(label => label.id === String(id)).cellWidth);
      assert(widths[0] < widths[1] && widths[1] < widths[2], `Each indicator has its own measured width: ${widths}`);
      independentWidths.push(widths);
      if (width === 650) {
        assert(Math.abs(widths[0] - 44) < 1, 'Short indicators shrink to the space needed to enter grades');
        const longCapacity = geometry.find(label => label.id === 'capacity-102');
        assert(longCapacity.cellWidth > 2 * 44 + 40, 'A long capacity expands its own group even when its indicators are short');
      }
      const summaryWidths = await page.locator('thead th').filter({ hasText: /^(EFSRT\/PPP|Puntaje|Promedio General)$/ }).evaluateAll(cells => cells.map(cell => cell.getBoundingClientRect().width));
      for (const summaryWidth of summaryWidths) assert(Math.abs(summaryWidth - 45) < 0.5, 'Final columns retain their fixed width');
    }
    const narrowWidths = independentWidths[0], wideWidths = independentWidths.at(-1);
    const added = wideWidths.map((width, index) => width - narrowWidths[index]);
    assert(Math.max(...added) - Math.min(...added) < 1, 'Extra screen space is shared equally while preserving each indicator minimum');
    assert(await preservedSizingCell.evaluate(element => element === document.querySelector('[data-nota-key="202:501"]')), 'Measuring and resizing preserve the original grade input');
    await cell(202, 507).focus();
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => document.activeElement?.getAttribute('data-nota-key') === '202:508');
    assert.equal(await page.locator('[data-registro-capacity-label]').count(), 1, 'Paging still shows only the remaining third unit');
    await page.keyboard.press('ArrowLeft');
    await page.waitForFunction(() => document.activeElement?.getAttribute('data-nota-key') === '202:507');
    await noReload();
    await page.goto('http://127.0.0.1:3001/?sizing&manyStudents');
    await cell(202, 501).waitFor();
    await page.setViewportSize({ width: 650, height: 700 });
    const necessaryScrollbars = await page.evaluate(async () => {
      const scroll = document.querySelector('[data-nota-key]').closest('table').parentElement.parentElement;
      const samples = [];
      for (let i = 0; i < 40; i++) {
        await new Promise(requestAnimationFrame);
        samples.push([scroll.clientWidth, scroll.clientHeight, scroll.scrollWidth, scroll.scrollHeight]);
      }
      const tail = samples.slice(12);
      return { last: tail.at(-1), changes: tail.filter((sample, index) => index && sample.join() !== tail[index - 1].join()).length };
    });
    assert(necessaryScrollbars.last[2] > necessaryScrollbars.last[0] && necessaryScrollbars.last[3] > necessaryScrollbars.last[1], 'Wide content and many students retain both necessary scrollbars');
    assert(necessaryScrollbars.changes <= 1, 'Necessary scrollbars remain stable instead of repeatedly toggling');
    const assertActiveGradeVisible = async () => {
      const bounds = await page.evaluate(() => {
        const input = document.activeElement, cell = input.closest('td'), table = cell.closest('table');
        const scroll = table.parentElement.parentElement, viewport = scroll.getBoundingClientRect();
        const header = table.querySelector('thead').getBoundingClientRect(), rect = cell.getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom, visibleTop: Math.max(viewport.top + scroll.clientTop, header.bottom), visibleBottom: viewport.top + scroll.clientTop + scroll.clientHeight, scrollTop: scroll.scrollTop };
      });
      assert(bounds.top >= bounds.visibleTop - 0.6 && bounds.bottom <= bounds.visibleBottom + 0.6, `The active grade stays below the sticky header and above the horizontal scrollbar: ${JSON.stringify(bounds)}`);
    };
    await cell(201, 501).focus();
    for (let student = 202; student <= 212; student++) {
      await page.keyboard.press('ArrowDown');
      await page.waitForFunction(student => document.activeElement?.getAttribute('data-nota-key') === `${student}:501`, student);
      await assertActiveGradeVisible();
    }
    await cell(289, 501).focus();
    await page.keyboard.press('ArrowDown');
    await page.waitForFunction(() => document.activeElement?.getAttribute('data-nota-key') === '290:501');
    await assertActiveGradeVisible();
    await cell(290, 507).focus();
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => document.activeElement?.getAttribute('data-nota-key') === '290:508');
    await assertActiveGradeVisible();
    await page.keyboard.press('ArrowLeft');
    await page.waitForFunction(() => document.activeElement?.getAttribute('data-nota-key') === '290:507');
    await assertActiveGradeVisible();
    const bottomScroll = await cell(290, 507).evaluate(input => input.closest('table').parentElement.parentElement.scrollTop);
    for (let student = 289; student >= 270; student--) {
      await page.keyboard.press('ArrowUp');
      await page.waitForFunction(student => document.activeElement?.getAttribute('data-nota-key') === `${student}:507`, student);
      await assertActiveGradeVisible();
    }
    await cell(202, 507).focus();
    await page.keyboard.press('ArrowUp');
    await page.waitForFunction(() => document.activeElement?.getAttribute('data-nota-key') === '201:507');
    await assertActiveGradeVisible();
    assert(bottomScroll > 0);
    assert(await cell(201, 507).evaluate(input => input.closest('table').parentElement.parentElement.scrollTop) < bottomScroll, 'Upward navigation scrolls back to show the first student');
    await page.locator('[data-efsrt-key="390"]').focus();
    for (let student = 389; student >= 370; student--) {
      await page.keyboard.press('ArrowUp');
      await page.waitForFunction(student => document.activeElement?.getAttribute('data-efsrt-key') === String(student), student);
      await assertActiveGradeVisible();
    }
    await noReload();
    console.log('Navegación: notas y EFSRT visibles bajo el encabezado fijo, desde la última fila hasta la primera y entre páginas, sin recargar.');
    for (const mode of ['unitAverages', 'unitAverages&print', 'unitAverages&occupational', 'unitAverages&print&occupational']) {
      await page.goto(`http://127.0.0.1:3001/?${mode}`);
      await page.locator('[data-registro-unit-average-key="201:1"]').waitFor();
      const headers = page.locator('[data-registro-unit-average]');
      assert.equal(await headers.count(), 2, 'One average per unit, even with multiple capacities');
      assert((await headers.allTextContents()).every(text => text === 'PROMEDIO UNIDAD'));
      assert.equal((await page.locator('[data-registro-unit-average-key="201:1"]').innerText()).trim(), mode.includes('occupational') ? '18' : '17', 'Unit grades retain capacity-based calculations');
      assert.equal((await page.locator('[data-registro-unit-average-key="201:2"]').innerText()).trim(), '10');
      assert.equal((await page.locator('[data-registro-unit-average-key="202:1"]').innerText()).trim(), '', 'Incomplete unit grades remain empty');
      if (!mode.includes('print')) {
        const bottom = await page.locator('[data-nota-key]').first().evaluate(input => {
          const frame = input.closest('table').parentElement.parentElement;
          return { edge: frame.getBoundingClientRect().bottom, viewport: window.innerHeight };
        });
        assert(Math.abs(bottom.viewport - bottom.edge - 10) < 1.1, 'The register retains its original 10px bottom gap');
      }
    }
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
    assert.equal(await page.getByLabel('Escala', { exact: true }).count(), 0, 'The shared print viewer has no scale control');
    for (const mode of ['', '&manyStudents', '&occupational', '&occupational&manyStudents', '&stressCapacity', '&stressIndicator', '&stressBoth']) {
      await page.goto(`http://127.0.0.1:3001/?printLayout${mode}`);
      await page.locator('.capacity-header-content').first().waitFor();
      await page.evaluate(async () => { await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
      const geometry = await page.locator('[data-print-horizontal-page]').evaluateAll(pages => pages.map(page => {
        const table = page.querySelector('table'), columns = [...table.querySelectorAll('col')];
        const inner = page.querySelector('.print-page-inner').getBoundingClientRect();
        const rows = [...table.querySelectorAll('tbody tr')];
        return {
          horizontal: Number(page.dataset.printHorizontalPage), vertical: Number(page.dataset.printVerticalPage),
          units: [...table.querySelectorAll('.unit-header')].map(header => header.textContent.trim()),
          capacityHeight: parseFloat(getComputedStyle(page).getPropertyValue('--capacity-header-height')),
          indicatorHeight: table.querySelector('.indicator-header').getBoundingClientRect().height,
          widths: columns.map(column => column.getBoundingClientRect().width),
          averageWidths: [...table.querySelectorAll('.unit-grade-header, .summary-header')].filter(header => /PROMEDIO|Promedio/.test(header.textContent)).map(header => header.getBoundingClientRect().width),
          independentWidths: [...table.querySelectorAll('.summary-header')].filter(header => /EFSRT|Puntaje/.test(header.textContent)).map(header => ({ label: header.textContent, width: header.getBoundingClientRect().width })),
          students: rows.map(row => Number(row.querySelector('td').textContent)),
          fitsVertically: !rows.length || rows.at(-1).getBoundingClientRect().bottom <= inner.bottom + 1,
          fitsHorizontally: table.getBoundingClientRect().right <= inner.right + 0.1,
          textFits: [...table.querySelectorAll('.indicator-header > span')].every(label => {
            const text = label.getBoundingClientRect(), cell = label.closest('th').getBoundingClientRect();
            return text.left >= cell.left - 1 && text.right <= cell.right + 1 && text.top >= cell.top - 1 && text.bottom <= cell.bottom + 1 && label.scrollWidth <= label.clientWidth + 1;
          }) && [...table.querySelectorAll('.capacity-header-content')].every(label => label.scrollHeight <= label.clientHeight + 1),
        };
      }));
      const horizontal = [...new Set(geometry.map(page => page.horizontal))];
      assert(horizontal.length <= 2, 'There are never more than two horizontal pages');
      if (mode.includes('occupational')) assert.equal(horizontal.length, 1, 'Occupational programs keep every unit on one horizontal page');
      else if (!mode.includes('stress')) assert.equal(horizontal.length, 2, 'The fixture uses two complete-unit pages');
      for (const printed of geometry) {
        assert(printed.capacityHeight >= 93 && printed.capacityHeight <= 102.3 + 0.01);
        assert(printed.indicatorHeight >= 134.9 && printed.indicatorHeight <= 148.5 + 0.1);
        assert(Math.abs(printed.widths[0] - 8 * 96 / 25.4) < 0.2, 'Nro. stays fixed at 8mm');
        assert(Math.abs(printed.widths[1] - 68 * 96 / 25.4) < 0.2, 'Student names stay fixed at 68mm');
        for (const width of printed.averageWidths) assert(Math.abs(width - 9 * 96 / 25.4) < 0.2, `Averages stay fixed at 9mm: ${width}`);
        for (const { label, width } of printed.independentWidths) assert(Math.abs(width - (label.includes('EFSRT') ? 9 : 10) * 96 / 25.4) < 0.2, 'EFSRT stays at 9mm and score stays at 10mm');
        assert(printed.fitsVertically, 'Student pagination uses the actual header and row heights');
        assert(printed.fitsHorizontally, 'The table fits without applying scale');
        if (!mode.includes('stress') && !mode.includes('occupational')) {
          assert(printed.textFits, 'Capacity and indicator labels fit completely');
          assert.equal(printed.capacityHeight, 93, 'Fitting capacities keep their original height');
          assert(Math.abs(printed.indicatorHeight - 135) < 0.1, 'Fitting indicators keep their original height');
        }
        if (mode === '&stressCapacity') {
          assert.equal(printed.capacityHeight, 93 * 1.1);
          assert(Math.abs(printed.indicatorHeight - 135) < 0.1, 'Only capacities grow for a capacity overflow');
        }
        if (mode === '&stressIndicator') {
          assert.equal(printed.capacityHeight, 93);
          assert(Math.abs(printed.indicatorHeight - 135 * 1.1) < 0.1, 'Only indicators grow for an indicator overflow');
        }
      }
      for (const index of horizontal) {
        const printed = geometry.filter(page => page.horizontal === index);
        assert.deepEqual(printed.flatMap(page => page.students), Array.from({ length: mode.includes('manyStudents') ? 90 : 3 }, (_, i) => i + 1), 'Every student appears once per horizontal section');
      }
      const firstPages = geometry.filter(page => page.vertical === 0);
      const allUnits = firstPages.flatMap(page => page.units);
      assert.equal(new Set(allUnits).size, mode.includes('stress') ? 1 : 4, 'Units remain complete and appear in their original order');
      if (!mode.includes('stress')) {
        const pdf = await PDFDocument.load(await page.pdf({ preferCSSPageSize: true, printBackground: true, scale: 1 }));
        assert.equal(pdf.getPageCount(), geometry.length, 'The PDF contains exactly the planned pages, without blank pages');
      }
    }
    await page.goto('http://127.0.0.1:3001/?printLayout&dense');
    await page.locator('.indicator-header').first().waitFor();
    await page.getByRole('button', { name: 'Config...', exact: true }).click();
    await page.getByRole('dialog').getByRole('combobox').click();
    await page.getByRole('option', { name: 'Vertical', exact: true }).click();
    await page.getByLabel('Izquierdo', { exact: true }).fill('2');
    await page.getByLabel('Derecho', { exact: true }).fill('2');
    await page.getByRole('button', { name: 'Aceptar', exact: true }).click();
    await page.evaluate(async () => { await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
    for (const media of ['screen', 'print']) {
      await page.emulateMedia({ media });
      const bounds = await page.locator('.registro-print-table').first().evaluate(table => {
        const inner = table.closest('.print-page-inner').getBoundingClientRect();
        const last = table.querySelector('tbody tr').lastElementChild.getBoundingClientRect();
        return { width: inner.width, right: inner.right, tableRight: table.getBoundingClientRect().right, lastRight: last.right, columns: table.querySelectorAll('.indicator-header').length };
      });
      assert.equal(bounds.columns, 25);
      assert(Math.abs(bounds.width - 170 * 96 / 25.4) < 0.2, 'Portrait printing subtracts both 2cm margins');
      assert(bounds.tableRight <= bounds.right + 0.1 && bounds.lastRight <= bounds.right + 0.1, `The final column fits the printable area in ${media}: ${JSON.stringify(bounds)}`);
    }
    await page.emulateMedia({ media: 'screen' });
    assert.deepEqual(errors, []);
    console.log('Navegador: códigos en negrita, guardado continuo sin desmontar celdas, pegado con vacíos/EFSRT, fallo y recuperación tras recarga; matrícula con rueda e inserción sin recargar.');
  } finally { await browser?.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
