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
    {
      const fillHandle = page.getByTestId('registro-fill-handle');
      const fillValues = (student, first, length) => page.evaluate(({ student, first, length }) =>
        Array.from({ length }, (_, index) => document.querySelector(`[data-nota-key="${student}:${first + index}"]`).value), { student, first, length });
      const point = async locator => { const box = await locator.boundingBox(); assert(box); return { x: box.x + box.width / 2, y: box.y + box.height / 2 }; };
      const beginFill = async () => { await fillHandle.waitFor({ state: 'visible' }); const position = await point(fillHandle); await page.mouse.move(position.x, position.y); await page.mouse.down(); };
      const moveFill = async locator => { const position = await point(locator); await page.mouse.move(position.x, position.y, { steps: 8 }); };
      const waitValue = (student, indicator, value) => page.waitForFunction(({ key, value }) => document.querySelector(`[data-nota-key="${key}"]`)?.value === value, { key: `${student}:${indicator}`, value });
      await page.goto('http://127.0.0.1:3001/?dense&fillHandle'); await cell(201, 6000).waitFor();
      for (const [offset, value] of ['10','20','05','06','07','08'].entries()) await cell(201, 6000 + offset).fill(value);
      await cell(201, 6000).click(); await page.keyboard.press('Shift+ArrowRight');
      await fillHandle.waitFor({ state: 'visible' });
      const handleStyle = await fillHandle.evaluate(element => ({ cursor: getComputedStyle(element).cursor, color: getComputedStyle(element, '::after').backgroundColor }));
      assert(handleStyle.cursor.includes('crosshair') && handleStyle.cursor.includes('data:image/svg+xml')); assert.equal(handleStyle.color, 'rgb(0, 0, 0)');
      const handlePoint = await point(fillHandle), corner = await cell(201, 6001).locator('..').boundingBox();
      assert(Math.abs(handlePoint.x - corner.x - corner.width) < 1 && Math.abs(handlePoint.y - corner.y - corner.height) < 1, 'The black handle sits at the bottom-right corner');
      await beginFill(); await page.mouse.up();
      assert.deepEqual(await fillValues(201, 6000, 6), ['10','20','05','06','07','08'], 'Clicking the handle without dragging changes nothing');
      await beginFill(); await moveFill(cell(201, 6004)); await waitValue(201, 6004, '10');
      assert.deepEqual(await fillValues(201, 6000, 5), ['10','20','10','20','10'], 'Values are copied while the mouse is still down');
      await page.mouse.up();
      assert.equal(await cell(201, 6004).locator('..').evaluate(element => getComputedStyle(element).boxShadow !== 'none'), true, 'The filled range stays selected');
      await page.keyboard.press('Control+z'); assert.deepEqual(await fillValues(201, 6000, 6), ['10','20','05','06','07','08'], 'One undo restores all overwritten values');
      await page.keyboard.press('Control+y'); assert.deepEqual(await fillValues(201, 6000, 5), ['10','20','10','20','10']);
      await cell(201, 6000).click(); await page.keyboard.press('Shift+ArrowRight');
      await beginFill(); await moveFill(cell(201, 6006)); await waitValue(201, 6006, '10');
      await page.keyboard.press('Escape'); await page.mouse.up();
      assert.equal(await cell(201, 6006).inputValue(), '', 'Escape restores the preview without saving it');
      await page.keyboard.press('Control+z'); assert.deepEqual(await fillValues(201, 6000, 6), ['10','20','05','06','07','08'], 'Cancelling adds no history operation');
      await cell(201, 6000).click(); await page.keyboard.press('Shift+ArrowRight');
      await beginFill(); await moveFill(cell(201, 6005)); await waitValue(201, 6005, '20');
      await moveFill(cell(201, 6002)); await waitValue(201, 6003, '06'); await page.mouse.up();
      assert.deepEqual(await fillValues(201, 6000, 6), ['10','20','10','06','07','08'], 'Shrinking a drag restores cells outside the final range');
      await cell(201, 6004).fill('12'); await cell(201, 6005).fill('18');
      await cell(201, 6004).click(); await page.keyboard.press('Shift+ArrowRight');
      await beginFill(); await moveFill(cell(201, 6001)); await waitValue(201, 6001, '18'); await page.mouse.up();
      assert.deepEqual(await fillValues(201, 6001, 5), ['18','12','18','12','18'], 'Left fill preserves the original pattern order');
      await cell(201, 6002).fill('11'); await cell(202, 6002).fill('19'); await cell(203, 6002).fill('04');
      await cell(201, 6002).click(); await page.keyboard.press('Shift+ArrowDown');
      await beginFill(); await moveFill(cell(203, 6002)); await waitValue(203, 6002, '11'); await page.mouse.up();
      assert.equal(await cell(202, 6002).inputValue(), '19');
      await cell(201, 6003).fill('02'); await cell(202, 6003).fill('13'); await cell(203, 6003).fill('17');
      await cell(202, 6003).click(); await page.keyboard.press('Shift+ArrowDown');
      await beginFill(); await moveFill(cell(201, 6003)); await waitValue(201, 6003, '17'); await page.mouse.up();
      assert.equal(await cell(202, 6003).inputValue(), '13'); assert.equal(await cell(203, 6003).inputValue(), '17');
      for (const [student, values] of [[201,['10','20']], [202,['12','18']], [203,['05','06']]]) {
        for (const [offset, value] of values.entries()) await cell(student, 6000 + offset).fill(value);
      }
      await cell(201, 6000).click(); await page.keyboard.press('Shift+ArrowRight'); await page.keyboard.press('Shift+ArrowDown');
      await beginFill(); await moveFill(cell(203, 6001)); await waitValue(203, 6001, '20'); await page.mouse.up();
      assert.deepEqual(await fillValues(203, 6000, 2), ['10','20'], 'A two-dimensional source repeats both columns in order');
      await noReload(); await page.evaluate(() => localStorage.clear());
      await page.goto('http://127.0.0.1:3001/?fillEfsrt'); await cell(201, 3).waitFor();
      await page.locator('[data-efsrt-key="301"]').fill('0');
      await cell(202, 4).fill('17'); await page.locator('[data-efsrt-key="302"]').fill('18');
      await cell(203, 4).fill('19'); await page.locator('[data-efsrt-key="303"]').fill('20');
      await cell(201, 4).click(); await page.keyboard.press('Shift+ArrowRight'); await page.keyboard.press('Shift+ArrowRight');
      await beginFill(); await moveFill(page.locator('[data-efsrt-key="303"]')); await waitValue(203, 4, ''); await page.mouse.up();
      assert.equal(await page.locator('[data-efsrt-key="302"]').inputValue(), '00');
      assert.equal(await page.locator('[data-efsrt-key="303"]').inputValue(), '00');
      assert.equal(await cell(202, 4).inputValue(), ''); assert.equal(await cell(201, 3).inputValue(), '14');
      await page.evaluate(() => localStorage.clear());
      await page.setViewportSize({ width: 800, height: 800 });
      await page.goto('http://127.0.0.1:3001/?dense&fillScrollX'); await cell(201, 6000).waitFor(); await cell(201, 6000).fill('16'); await cell(201, 6000).click();
      await beginFill();
      const horizontalPoint = await cell(201, 6000).evaluate(element => { const scroll = element.closest('[tabindex="-1"]'), bounds = scroll.getBoundingClientRect(), cell = element.getBoundingClientRect(); return { x: bounds.left + scroll.clientWidth - 3, y: cell.top + cell.height / 2 }; });
      await page.mouse.move(horizontalPoint.x, horizontalPoint.y);
      await page.waitForFunction(() => { const input = document.querySelector('[data-nota-key="201:6020"]'); return input.value === '16' && input.closest('[tabindex="-1"]').scrollLeft > 100; });
      await page.mouse.up(); await page.keyboard.press('Control+z'); assert.equal(await cell(201, 6020).inputValue(), '');
      assert.equal(await cell(201, 6000).inputValue(), '16'); await noReload(); await page.evaluate(() => localStorage.clear());
      await page.setViewportSize({ width: 1100, height: 800 });
      await page.goto('http://127.0.0.1:3001/?manyStudents&fillHandle'); await cell(201, 3).waitFor(); await cell(201, 3).click();
      await beginFill();
      const scrollPoint = await cell(201, 3).evaluate(element => { const scroll = element.closest('[tabindex="-1"]'), bounds = scroll.getBoundingClientRect(), cell = element.getBoundingClientRect(); return { x: cell.left + cell.width / 2, y: bounds.top + scroll.clientHeight - 3 }; });
      await page.mouse.move(scrollPoint.x, scrollPoint.y);
      await page.waitForFunction(() => { const input = document.querySelector('[data-nota-key="215:3"]'); return input.value === '14' && input.closest('[tabindex="-1"]').scrollTop > 150; });
      await page.mouse.up();
      await page.keyboard.press('Control+z'); assert.equal(await cell(215, 3).inputValue(), '', 'Auto-scrolled fill is also a single undo operation');
      assert.equal(await cell(201, 3).inputValue(), '14'); await noReload();
      await page.evaluate(() => localStorage.clear());
      await page.setViewportSize({ width: 1500, height: 1100 });
      await page.goto('http://127.0.0.1:3001/?docente&finalizado'); await cell(201, 3).waitFor();
      await cell(201, 3).click(); await page.keyboard.press('Shift+ArrowRight');
      assert.equal(await fillHandle.isVisible(), false, 'Read-only registers do not expose the fill handle');
      console.log('Arrastre: cuadrado y cruz negros, vista previa, cuatro direcciones, reemplazo, deshacer/rehacer, cancelar, reducir y autodesplazamiento. Correcto.');
    }
    {
      await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://127.0.0.1:3001' });
      const clipboard = () => page.evaluate(() => navigator.clipboard.readText());
      const writeClipboard = text => page.evaluate(text => navigator.clipboard.writeText(text), text);
      const values = () => page.locator('[data-nota-key], [data-efsrt-key]').evaluateAll(elements => elements.map(element => element.value));
      const selectRange = async (rows, columns) => {
        await cell(201, 3).click();
        for (let col = 1; col < columns; col++) await page.keyboard.press('Shift+ArrowRight');
        for (let row = 1; row < rows; row++) await page.keyboard.press('Shift+ArrowDown');
      };
      await page.evaluate(() => localStorage.clear());
      await page.goto('http://127.0.0.1:3001/?cutClipboard'); await cell(201, 3).waitFor();
      await cell(201, 3).click(); await page.keyboard.press('Control+x');
      assert.equal(await clipboard(), '14');
      assert.equal(await cell(201, 3).inputValue(), '', 'Ctrl+X immediately clears the source grade');
      await page.waitForFunction(() => window.requests.length === 1);
      assert.deepEqual(await page.evaluate(() => window.requests[0].input.notas), [{ matriculaId: 201, indicadorCapacidadId: 3, nota: null }], 'The cut is queued for saving');
      await resolveSave(0);
      await page.evaluate(() => document.addEventListener('paste', event => {
        window.usedCutClipboard = { text: event.clipboardData.getData('text/plain'), id: event.clipboardData.getData('application/x-cetprosmp-registro-cut') };
      }, { once: true }));
      await cell(202, 3).click(); await page.keyboard.press('Control+v');
      assert.equal(await cell(202, 3).inputValue(), '14');
      assert(await page.evaluate(() => window.usedCutClipboard.id), 'Native paste preserves the cut marker');
      await cell(203, 3).click(); await page.keyboard.press('Control+v');
      assert.equal(await cell(203, 3).inputValue(), '', 'A cut can only be pasted once');
      await page.keyboard.press('Control+v'); assert.equal(await cell(203, 3).inputValue(), '');
      await cell(202, 3).click(); await page.keyboard.press('Control+v');
      assert.equal(await cell(202, 3).inputValue(), '14', 'Repeating a consumed cut does not erase existing values');
      await page.keyboard.press('Control+z'); assert.equal(await cell(202, 3).inputValue(), '');
      await page.keyboard.press('Control+z'); assert.equal(await cell(201, 3).inputValue(), '14', 'Undo restores the cut source');
      await page.keyboard.press('Control+y'); assert.equal(await cell(201, 3).inputValue(), '');
      await page.keyboard.press('Control+y'); assert.equal(await cell(202, 3).inputValue(), '14');
      await cell(203, 3).click(); await page.keyboard.press('Control+v');
      assert.equal(await cell(203, 3).inputValue(), '', 'Undo and redo do not reactivate a consumed cut');
      await cell(202, 3).click(); await page.keyboard.press('Control+c');
      await cell(201, 3).click(); await page.keyboard.press('Control+v');
      await cell(203, 3).click(); await page.keyboard.press('Control+v');
      assert.equal(await cell(201, 3).inputValue(), '14'); assert.equal(await cell(203, 3).inputValue(), '14', 'Copying the same value replaces the cut and permits repeated pastes');
      await selectRange(3, 2); await page.keyboard.press('Delete');

      await cell(201, 3).click(); await writeClipboard('10\t11\n12\t13'); await page.keyboard.press('Control+v');
      await selectRange(2, 2); await page.keyboard.press('Control+x');
      assert.equal(await clipboard(), '10\t11\n12\t13', 'Cut preserves the order and shape of a range');
      assert.deepEqual(await values(), Array(9).fill(''));
      await cell(202, 3).click(); await page.keyboard.press('Control+v');
      assert.deepEqual(await values(), ['', '', '', '10', '11', '', '12', '13', '']);
      assert.equal(await cell(202, 3).evaluate(element => document.activeElement === element), true, 'Paste keeps the active cell at the destination start');
      await page.keyboard.press('Control+v');
      assert.deepEqual(await values(), ['', '', '', '10', '11', '', '12', '13', ''], 'A cut range is consumed as one paste without changing the selected result');
      await page.keyboard.press('Control+z'); assert.deepEqual(await values(), Array(9).fill(''));
      await page.keyboard.press('Control+z'); assert.deepEqual(await values(), ['10','11','','12','13','','','',''], 'A range cut is one undo operation');

      await cell(201, 3).click(); await writeClipboard('10\t11\t12\n13\t14\t15'); await page.keyboard.press('Control+v');
      await selectRange(2, 4); await page.keyboard.press('Control+x');
      assert.deepEqual((await clipboard()).split('\n').map(row => row.split('\t')).map(row => [row[0], row[1], row[3]]), [['10','11','12'], ['13','14','15']]);
      assert.deepEqual(await values(), Array(9).fill(''), 'Cut clears selected EFSRT and grades together');
      await page.keyboard.press('Control+z'); assert.deepEqual(await values(), ['10','11','12','13','14','15','','','']);
      await cell(201, 3).click(); await page.keyboard.press('ArrowRight'); await page.keyboard.press('Control+x');
      assert.equal(await clipboard(), '11'); assert.equal(await cell(201, 4).inputValue(), '', 'Cut works after keyboard navigation without a range selection');
      await page.keyboard.press('Control+z'); assert.equal(await cell(201, 4).inputValue(), '11');

      await selectRange(2, 2);
      await cell(201, 3).locator('..').evaluate(element => {
        element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
        window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      });
      await page.keyboard.press('Shift+ArrowRight'); await page.keyboard.press('Shift+ArrowDown'); await page.keyboard.press('Control+x');
      assert.equal(await clipboard(), '10\t11\n13\t14', 'Cut works with focus on the table container');
      assert.deepEqual(await values(), ['','','12','','','15','','','']);
      assert.equal(await page.getByText(/copiad[oa].*(satisfactoriamente|portapapeles)/i).count(), 0, 'Cut does not show a success alert');
      await noReload();
      await page.evaluate(() => { const input = document.createElement('input'); input.id = 'outside-cut'; input.value = 'Texto externo'; document.body.append(input); input.focus(); input.select(); });
      await page.keyboard.press('Control+x');
      assert.equal(await clipboard(), 'Texto externo'); assert.equal(await page.locator('#outside-cut').inputValue(), '', 'Inputs outside the table retain native cut behavior');
      await page.evaluate(() => localStorage.clear());
      await page.goto('http://127.0.0.1:3001/?docente&finalizado'); await cell(201, 3).waitFor();
      await cell(201, 3).click(); await page.keyboard.press('Control+x');
      assert.equal(await cell(201, 3).inputValue(), '14', 'Read-only grades cannot be cut');
      assert.equal(await page.evaluate(() => window.calls.filter(call => call.name === 'saveRegistroAuxiliar').length), 0);
      console.log('Cortar: Ctrl+X/Ctrl+V reales, celda, rangos, EFSRT, guardado, deshacer/rehacer, foco y solo lectura. Correcto.');
    }
    {
      const pasteRange = (locator, text) => locator.evaluate((element, text) => {
        const data = new DataTransfer(); data.setData('text/plain', text);
        element.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
      }, text);
      const pastedGrid = (height, width) => page.evaluate(({ height, width }) => Array.from({ length: height }, (_, row) =>
        Array.from({ length: width }, (_, col) => document.querySelector(`[data-nota-key="${201 + row}:${6000 + col}"]`).value)), { height, width });
      const selectGrid = async (height, width) => {
        await cell(201, 6000).click();
        for (let col = 1; col < width; col++) await page.keyboard.press('Shift+ArrowRight');
        for (let row = 1; row < height; row++) await page.keyboard.press('Shift+ArrowDown');
      };
      const selectedPositions = () => page.locator('[data-selection-row]').evaluateAll(elements => elements
        .filter(element => getComputedStyle(element).boxShadow !== 'none')
        .map(element => [Number(element.dataset.selectionRow), Number(element.dataset.selectionCol)]));
      const assertPastedRange = async (height, width) => {
        await page.waitForFunction(() => document.activeElement?.getAttribute('data-nota-key') === '201:6000');
        assert.deepEqual(await selectedPositions(), Array.from({ length: height }, (_, row) =>
          Array.from({ length: width }, (_, col) => [8 + row, 3 + col])).flat(), 'The pasted range stays selected at its starting cell');
      };
      await page.goto('http://127.0.0.1:3001/?dense&pasteSelection'); await cell(201, 6000).waitFor();
      await cell(201, 6000).click();
      const originalGrid = Array.from({ length: 3 }, (_, row) => Array.from({ length: 6 }, (_, col) => String(1 + row * 6 + col)));
      await pasteRange(cell(201, 6000), originalGrid.map(row => row.join('\t')).join('\r\n') + '\r\n');
      assert.deepEqual(await pastedGrid(3, 6), originalGrid.map(row => row.map(value => value.padStart(2, '0'))));
      await assertPastedRange(3, 6);
      await cell(201, 6006).fill('17'); await cell(201, 6006).click();
      const copied = await page.evaluate(() => {
        const data = new DataTransfer(); document.dispatchEvent(new ClipboardEvent('copy', { clipboardData: data, bubbles: true, cancelable: true }));
        return data.getData('text/plain');
      });
      assert.equal(copied, '17');
      await selectGrid(3, 6); await pasteRange(cell(201, 6000), copied);
      assert.deepEqual(await pastedGrid(3, 6), Array.from({ length: 3 }, () => Array(6).fill('17')), 'An internal single value overwrites every selected grade');
      await assertPastedRange(3, 6);
      await page.keyboard.press('Control+z');
      assert.deepEqual(await pastedGrid(3, 6), originalGrid.map(row => row.map(value => value.padStart(2, '0'))), 'One undo restores the entire fill');
      await page.keyboard.press('Control+y');
      assert.deepEqual(await pastedGrid(3, 6), Array.from({ length: 3 }, () => Array(6).fill('17')));
      await selectGrid(3, 5); await pasteRange(cell(201, 6000), '10\t11\r\n12\t13\r\n');
      assert.deepEqual(await pastedGrid(3, 5), [['10','11','10','11','10'], ['12','13','12','13','12'], ['10','11','10','11','10']], 'The clipboard block tiles in both directions and clips to the selection');
      await assertPastedRange(3, 5);
      await cell(201, 6000).locator('..').evaluate(element => {
        element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
        window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      });
      await page.keyboard.press('Shift+ArrowRight'); await page.keyboard.press('Shift+ArrowDown');
      await cell(201, 6000).evaluate(element => {
        const data = new DataTransfer(); data.setData('text/plain', '15\r\n');
        element.closest('[tabindex="-1"]').dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
      });
      assert.deepEqual(await pastedGrid(2, 2), [['15','15'], ['15','15']], 'Paste also works when the selected table container has focus');
      await assertPastedRange(2, 2);
      await cell(201, 6000).click(); await pasteRange(cell(201, 6000), '0\t21\ttexto\t7,5\t-1\t');
      assert.deepEqual((await pastedGrid(1, 6))[0], ['00','15','10','07.5','10',''], 'Blank cells clear values, comma decimals work, and invalid grades are skipped');
      await assertPastedRange(1, 6);
      await selectGrid(2, 2); await pasteRange(cell(201, 6000), '');
      assert.deepEqual(await pastedGrid(2, 2), [['',''], ['','']], 'An explicitly copied blank clears the selection');
      await cell(203, 6024).click(); await pasteRange(cell(203, 6024), '12\t13\t14\n15\t16\t17');
      assert.equal(await cell(203, 6024).inputValue(), '12');
      assert.equal(await page.locator('[data-efsrt-key="303"]').inputValue(), '13');
      await page.waitForFunction(() => document.activeElement?.getAttribute('data-nota-key') === '203:6024');
      assert.deepEqual(await selectedPositions(), [[10,27], [10,28], [10,29]], 'The pasted selection stops at table boundaries and includes its calculated average');
      await noReload();
      await page.evaluate(() => localStorage.clear());
      await page.goto('http://127.0.0.1:3001/?docente&finalizado'); await cell(201, 3).waitFor();
      await pasteRange(cell(201, 3), '19');
      assert.equal(await cell(201, 3).inputValue(), '14', 'Read-only grades reject pasted values');
      console.log('Pegado: valor repetido, bloques en dos direcciones, reemplazo, seleccion y foco, vacios, limites, validacion y deshacer/rehacer. Correcto.');
    }
    await page.goto('http://127.0.0.1:3001/?gradeHistory'); await cell(201, 3).waitFor();
    await cell(201, 3).fill('');
    await cell(201, 3).pressSequentially('18');
    await page.waitForFunction(() => window.requests.length === 1);
    await page.keyboard.press('Control+z');
    assert.equal(await cell(201, 3).inputValue(), '14', 'Undo groups the complete cell edit while saving');
    await resolveSave(0);
    await page.waitForFunction(() => window.requests.length === 2);
    assert.equal(await page.evaluate(() => window.requests[1].input.notas[0].nota), 14, 'Undo is saved after the older request');
    await page.keyboard.press('Control+y');
    assert.equal(await cell(201, 3).inputValue(), '18');
    await resolveSave(1);
    await page.waitForFunction(() => window.requests.length === 3);
    assert.equal(await page.evaluate(() => window.requests[2].input.notas[0].nota), 18, 'Redo is also saved');
    await resolveSave(2);
    await page.keyboard.press('Control+z');
    await page.keyboard.press('Control+Shift+z');
    assert.equal(await cell(201, 3).inputValue(), '18');
    await noReload();
    await cell(201, 3).evaluate(element => {
      const data = new DataTransfer(); data.setData('text', '10\t11\t12\n13\t14\t15');
      element.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
    });
    const historyValues = () => page.locator('[data-nota-key], [data-efsrt-key]').evaluateAll(elements => elements.map(el => el.value));
    const pastedValues = ['10', '11', '12', '13', '14', '15', '', '', ''];
    assert.deepEqual(await historyValues(), pastedValues);
    await page.keyboard.press('Control+z');
    assert.deepEqual(await historyValues(), ['18', '', '', '', '', '', '', '', ''], 'Undo restores the entire mixed paste');
    await page.keyboard.press('Control+y');
    assert.deepEqual(await historyValues(), pastedValues);
    await cell(201, 3).click();
    for (let index = 0; index < 3; index++) await page.keyboard.press('Shift+ArrowRight');
    await page.keyboard.press('Shift+ArrowDown');
    await page.keyboard.press('Delete');
    assert.deepEqual(await historyValues(), Array(9).fill(''));
    await page.keyboard.press('Control+z');
    assert.deepEqual(await historyValues(), pastedValues, 'One undo restores the deleted range including EFSRT');
    await page.keyboard.press('Control+y');
    assert.deepEqual(await historyValues(), Array(9).fill(''));
    await page.keyboard.press('Control+z');
    await cell(203, 3).fill('17');
    await page.keyboard.press('Control+y');
    assert.equal(await cell(203, 3).inputValue(), '17', 'A new edit discards redo');
    await page.keyboard.press('Control+z');
    assert.equal(await cell(203, 3).inputValue(), '');
    await page.locator('[data-efsrt-key="301"]').fill('19');
    await page.keyboard.press('Control+z');
    assert.equal(await page.locator('[data-efsrt-key="301"]').inputValue(), '12');
    await page.keyboard.press('Control+y');
    assert.equal(await page.locator('[data-efsrt-key="301"]').inputValue(), '19');
    await page.evaluate(() => localStorage.clear());
    await page.reload(); await cell(201, 3).waitFor();
    await cell(201, 3).focus(); await page.keyboard.press('Control+z');
    assert.equal(await cell(201, 3).inputValue(), '14', 'Reload starts a new history');
    console.log('Historial en navegador: escritura, pegado, rangos, EFSRT, rehacer, guardado en curso y reinicio. Correcto.');

    const waitForGradeFocus = (student, indicator, selected = true) => page.waitForFunction(({ key, selected }) => {
      const input = document.activeElement;
      return input?.getAttribute('data-nota-key') === key && (!selected || getComputedStyle(input.closest('td')).boxShadow !== 'none');
    }, { key: `${student}:${indicator}`, selected });
    const assertHistoryCellVisible = async () => {
      const bounds = await page.evaluate(() => {
        const input = document.activeElement;
        const cell = input.closest('td');
        const container = input.closest('[tabindex="-1"]');
        const viewport = container.getBoundingClientRect();
        const header = container.querySelector('thead').getBoundingClientRect();
        const rect = cell.getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right,
          minTop: header.bottom, maxBottom: viewport.bottom - (container.offsetHeight - container.clientHeight),
          minLeft: viewport.left, maxRight: viewport.left + container.clientWidth,
          selected: getComputedStyle(cell).boxShadow !== 'none' };
      });
      assert(bounds.selected, `The active grade is highlighted: ${JSON.stringify(bounds)}`);
      assert(bounds.top >= bounds.minTop - 1 && bounds.bottom <= bounds.maxBottom + 1, `The active grade is vertically visible: ${JSON.stringify(bounds)}`);
      assert(bounds.left >= bounds.minLeft - 1 && bounds.right <= bounds.maxRight + 1, `The active grade is horizontally visible: ${JSON.stringify(bounds)}`);
    };
    await page.setViewportSize({ width: 800, height: 800 });
    await page.goto('http://127.0.0.1:3001/?historyFocus&manyStudents&dense'); await cell(201, 6000).waitFor();
    await cell(201, 6000).fill('10');
    await cell(290, 6024).fill('19');
    await cell(201, 6000).click();
    await page.keyboard.press('Control+z'); await waitForGradeFocus(290, 6024);
    assert.equal(await cell(290, 6024).inputValue(), ''); await assertHistoryCellVisible();
    await page.keyboard.press('Control+z'); await waitForGradeFocus(201, 6000);
    assert.equal(await cell(201, 6000).inputValue(), ''); await assertHistoryCellVisible();
    await page.keyboard.press('Control+y'); await waitForGradeFocus(201, 6000);
    assert.equal(await cell(201, 6000).inputValue(), '10'); await assertHistoryCellVisible();
    await page.keyboard.press('Control+y'); await waitForGradeFocus(290, 6024);
    assert.equal(await cell(290, 6024).inputValue(), '19'); await assertHistoryCellVisible();
    await noReload();
    await page.setViewportSize({ width: 1500, height: 1100 });
    await page.goto('http://127.0.0.1:3001/?navigation&historyFocus'); await cell(202, 1102).waitFor();
    await cell(202, 1102).fill('17'); await page.keyboard.press('ArrowRight'); await waitForGradeFocus(202, 1400, false);
    await cell(203, 1522).fill('19'); await page.keyboard.press('ArrowRight'); await waitForGradeFocus(203, 1600, false);
    await page.keyboard.press('Control+z'); await waitForGradeFocus(203, 1522);
    assert.equal(await cell(203, 1522).inputValue(), ''); await assertHistoryCellVisible();
    await page.keyboard.press('Control+z'); await waitForGradeFocus(202, 1102);
    assert.equal(await cell(202, 1102).inputValue(), ''); await assertHistoryCellVisible();
    await page.keyboard.press('Control+y'); await waitForGradeFocus(202, 1102);
    assert.equal(await cell(202, 1102).inputValue(), '17'); await assertHistoryCellVisible();
    await page.keyboard.press('Control+y'); await waitForGradeFocus(203, 1522);
    assert.equal(await cell(203, 1522).inputValue(), '19'); await assertHistoryCellVisible();
    await page.getByTestId('ChevronRightIcon').locator('..').click();
    await cell(201, 1600).waitFor();
    await page.keyboard.press('Control+z'); await waitForGradeFocus(203, 1522);
    assert.equal(await cell(203, 1522).inputValue(), ''); await assertHistoryCellVisible();
    const efsrtCell = page.locator('[data-efsrt-key="302"]');
    const waitForEfsrtFocus = () => page.waitForFunction(() => {
      const input = document.activeElement;
      return input?.getAttribute('data-efsrt-key') === '302' && getComputedStyle(input.closest('td')).boxShadow !== 'none';
    });
    await efsrtCell.fill('16');
    await page.getByTestId('ChevronLeftIcon').locator('..').click();
    await page.keyboard.press('Control+z');
    await waitForEfsrtFocus();
    assert.equal(await efsrtCell.inputValue(), ''); await assertHistoryCellVisible();
    assert.equal(await cell(201, 1400).count(), 1, 'EFSRT restores the page on which it was edited');
    await page.keyboard.press('Control+y');
    await waitForEfsrtFocus();
    assert.equal(await efsrtCell.inputValue(), '16'); await assertHistoryCellVisible();
    await noReload();
    await page.evaluate(() => localStorage.clear());
    console.log('Historial y foco: celda activa, desplazamiento, paginas de unidades, botones y EFSRT. Correcto.');

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
