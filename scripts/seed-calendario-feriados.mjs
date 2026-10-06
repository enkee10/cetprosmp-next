import fs from 'node:fs';
import assert from 'node:assert/strict';

const remote = process.argv.includes('--remote');
const apply = process.argv.includes('--apply');
process.env.GOOGLE_CLOUD_PROJECT = 'cetprosmp-2026';
if (remote) {
  delete process.env.DATA_CONNECT_EMULATOR_HOST;
  delete process.env.FIREBASE_DATA_CONNECT_EMULATOR_HOST;
} else {
  process.env.DATA_CONNECT_EMULATOR_HOST = '127.0.0.1:9399';
  process.env.FIREBASE_DATA_CONNECT_EMULATOR_HOST = '127.0.0.1:9399';
}
const { dataConnect } = await import('../functions/lib/modules/core/dataConnectCore.js');
const seed = JSON.parse(fs.readFileSync(new URL('./data/feriados-peru-2026.json', import.meta.url), 'utf8'));
assert.equal(seed.feriados.length, 16);
const now = new Date().toISOString();
const existing = (await dataConnect.executeGraphql(`query SeedHolidayCalendar($titulo:String!) {
  calendarios(where:{titulo:{eq:$titulo}},limit:2) { id }
}`, { variables: { titulo: seed.titulo } })).data.calendarios;
assert.ok(existing.length <= 1, 'Hay calendarios duplicados con el título de la semilla.');
const calendarId = existing[0]?.id;
const events = calendarId ? (await dataConnect.executeGraphql(`query ExistingHolidays($id:Int!) {
  eventos(where:{calendarioId:{eq:$id}},limit:1000) { id titulo fechaInicio tipoEvento }
}`, { variables: { id: calendarId } })).data.eventos : [];
const missing = seed.feriados.filter(holiday => !events.some(event => event.tipoEvento === 'feriado'
  && event.titulo === holiday.nombre && Date.parse(event.fechaInicio) === Date.parse(`${holiday.fecha}T00:00:00-05:00`)));
if (!apply) {
  console.log(JSON.stringify({ destino: remote ? 'produccion' : 'emulador', calendarioId: calendarId ?? null, faltantes: missing.length, aplicar: 'Añadir --apply' }));
  process.exit(0);
}
const calendar = { titulo: seed.titulo, descripcion: `Feriados nacionales del Perú de 2026. Fuente: ${seed.fuentes.join(' · ')}`,
  inicio: '2026-01-01T05:00:00.000Z', fin: '2027-01-01T05:00:00.000Z', color: '#b33838', activo: true,
  tipo: 'general', fechaCreacion: now, fechaActualizacion: now };
const variables = { now, ...(calendarId ? { id: calendarId } : { calendar }) };
const insertLines = missing.map((_, index) => `h${index}:evento_insert(data:{
  ${calendarId ? 'calendarioId:$id' : 'calendarioId_expr:"response.calendar.id"'}, titulo:$t${index}, descripcion:$d${index},tipoEvento:"feriado",
  fechaInicio:$s${index},fechaFin:$f${index},todoElDia:true,estado:"confirmado",color:"#b33838",fechaCreacion:$now,fechaActualizacion:$now
  ${remote ? '' : ',computaHoras:false,minutosHoraAcademica:60'}
})`);
const declarations = ['$now:Timestamp!', calendarId ? '$id:Int!' : '$calendar:Calendario_Data! @allow(fields:"titulo descripcion inicio fin color activo tipo fechaCreacion fechaActualizacion")'];
missing.forEach((holiday, index) => {
  Object.assign(variables, { [`t${index}`]: holiday.nombre, [`d${index}`]: `Feriado nacional del Perú. Fuente: ${seed.fuentes[1]}`,
    [`s${index}`]: `${holiday.fecha}T05:00:00.000Z`, [`f${index}`]: new Date(Date.parse(`${holiday.fecha}T00:00:00-05:00`) + 86400000).toISOString() });
  declarations.push(`$t${index}:String!,$d${index}:String!,$s${index}:Timestamp!,$f${index}:Timestamp!`);
});
if (missing.length || !calendarId) {
  const operation = `mutation SeedHolidays(${declarations.join(',')}) @transaction {
    ${calendarId ? 'query { calendario(id:$id) @check(expr:"this != null") { id } }' : 'calendar:calendario_insert(data:$calendar)'}
    ${insertLines.join('\n')}
  }`;
  const result = await dataConnect.executeGraphql(operation, { variables });
  console.log(JSON.stringify({ destino: remote ? 'produccion' : 'emulador', calendarioId: calendarId ?? result.data.calendar.id, feriadosAñadidos: missing.length }));
} else console.log(JSON.stringify({ destino: remote ? 'produccion' : 'emulador', calendarioId: calendarId, feriadosAñadidos: 0, mensaje: 'Ya está completo.' }));
