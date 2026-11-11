const assert = require('node:assert/strict');
const ExcelJS = require('../functions/node_modules/exceljs');
const JSZip = require('../functions/node_modules/jszip');
const { fitCertificateTable, certificateTextHeight, certificateMinimumRowHeights } = require('../functions/lib/modules/reportes/certificateTableLayout.js');

async function makeWorkbook(long = false) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Certificado');
  [25, 13.21875, 16.21875, 10.5546875, 10.5546875, 23.109375, 12.44140625, 14.33203125, 13.33203125]
    .forEach((width, index) => { sheet.getColumn(index + 1).width = width; });
  sheet.getCell('A1').value = 'Fuera de la tabla';
  sheet.getCell('A1').font = {name:'Calibri',size:18,bold:true};
  for (let row = 38; row <= 44; row++) {
    for (let col = 1; col <= 9; col++) {
      sheet.getCell(row, col).font = {name:'Calibri',size:8};
      sheet.getCell(row, col).alignment = {wrapText:true,vertical:'middle'};
    }
    sheet.getRow(row).height = 24;
  }
  for(let row=39;row<=43;row++) {
    sheet.mergeCells(`B${row}:C${row}`); sheet.mergeCells(`F${row}:H${row}`);
    sheet.getCell(`B${row}`).value = `UNIDAD DIDACTICA ${row-38}`;
    sheet.getCell(`D${row}`).value = 4; sheet.getCell(`E${row}`).value = 96;
    sheet.getCell(`I${row}`).value = 18;
    sheet.getCell(`F${row}`).value = `UC1 C${row-38} ${'Ejecutar procedimientos técnicos según las especificaciones establecidas. '.repeat(long ? 12 : 1)}\n\nUC1 C${row-37} Verificar el resultado y registrar las incidencias.`;
  }
  sheet.mergeCells('A39:A41'); sheet.mergeCells('A42:A43');
  sheet.getCell('A39').value = 'UC1 '+ 'Desarrollar y evaluar procesos con responsabilidad según los requerimientos del servicio. '.repeat(long?8:1);
  sheet.getCell('A42').value = 'CE1 Comunicar información con claridad y trabajar en equipo.';
  sheet.getCell('A38').value = 'COMPETENCIAS'; sheet.getCell('F38').value = 'CAPACIDADES';
  sheet.getCell('A44').value = 'TOTALES';
  return {workbook, input:await workbook.xlsx.writeBuffer()};
}

async function check(long) {
  const { input } = await makeWorkbook(long);
  const zip=await JSZip.loadAsync(input);
  const originalStyles=await zip.file('xl/styles.xml').async('string');
  const result=await fitCertificateTable(zip,'xl/worksheets/sheet1.xml','Certificado',39,5);
  const workbook=new ExcelJS.Workbook();
  await workbook.xlsx.load(await zip.generateAsync({type:'nodebuffer'}));
  const sheet=workbook.getWorksheet('Certificado');
  assert.equal(Math.round(result.heights.reduce((a,b)=>a+b,0)*100),31000,'The body remains exactly 310 points');
  assert.deepEqual([39,40,41,42,43].map(row=>sheet.getRow(row).height),result.heights);
  assert(long ? result.reduction>=1 : result.reduction===0,'Font size only decreases when necessary');
  assert.equal(sheet.getCell('F39').font.size,Math.max(1,8-result.reduction));
  assert.equal(sheet.getCell('A38').font.size,Math.max(1,8-result.reduction),'Headers use the same font decrement');
  assert.equal(sheet.getCell('A44').font.size,Math.max(1,8-result.reduction),'Totals use the same font decrement');
  assert.equal(sheet.getCell('A1').font.size,18,'Fonts outside the table never change');
  assert.equal(sheet.getCell('A1').font.bold,true);
  for(const [ref,lastRow,width] of [['A39',41,175],['A42',43,175],...Array.from({length:5},(_,i)=>[`F${39+i}`,39+i,Math.floor(23.109375*7)+Math.floor(12.44140625*7)+Math.floor(14.33203125*7)])]) {
    const cell=sheet.getCell(ref);
    const height=await certificateTextHeight(cell.text,width,cell.font,0,ref.startsWith('F'));
    const available=Array.from({length:lastRow-cell.row+1},(_,i)=>sheet.getRow(cell.row+i).height).reduce((a,b)=>a+b,0);
    assert(height<=available+0.02,`${ref}: all wrapped text fits after the final full recalculation`);
  }
  assert(sheet.getCell('F39').text.includes('\n\nUC1 C2'),'The blank line separating capacities is retained');
  const runs=sheet.getCell('F39').value.richText;
  assert(Array.isArray(runs),'Capacity cells contain formatted text');
  const blank=runs.find(run=>run.text==='\n');
  assert.equal(blank.font.size,Math.max(1,sheet.getCell('F39').font.size/2),'The separator uses half the final text size');
  assert(runs.filter(run=>run.text.trim()).every(run=>run.font.size===sheet.getCell('F39').font.size),'All actual capacity text retains the final table font');
  assert(!sheet.getCell('F39').text.includes('•'),'There are no bullet points');
  assert((await zip.file('xl/styles.xml').async('string')).includes(originalStyles.match(/<font>[\s\S]*?<\/font>/)[0]),'Original shared font styles are preserved');
  return result;
}

(async()=>{
  assert.deepEqual(certificateMinimumRowHeights(39,3,[{row:39,lastRow:39,height:10},{row:40,lastRow:40,height:20},{row:39,lastRow:41,height:90}]),[29.67,39.67,20.67]);
  const single=await certificateTextHeight('Primera capacidad\nSegunda capacidad',300,{name:'Calibri',size:8},0);
  const separated=await certificateTextHeight('Primera capacidad\n\nSegunda capacidad',300,{name:'Calibri',size:8},0);
  const compact=await certificateTextHeight('Primera capacidad\n\nSegunda capacidad',300,{name:'Calibri',size:8},0,true);
  assert(separated>single,'Empty separator lines consume actual height');
  assert(compact>single && compact<separated,'A half-line separator is shorter but keeps capacities apart');
  await check(false);
  const long=await check(true);
  console.log(`Certificados: todas las celdas, competencias combinadas, separadores de media línea, 310 puntos y reducción de ${long.reduction} puntos verificados.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
