const assert = require('node:assert/strict');
process.env.GCLOUD_PROJECT = 'demo-registro-close-test';
const permissions = require('../functions/lib/modules/core/permissions.js');
const { dataConnect } = require('../functions/lib/modules/core/dataConnectCore.js');
const handlers = require('../functions/lib/modules/registro-auxiliar/handlers.js');
const RealDate = Date;
let clock = RealDate.parse('2026-12-24T04:59:59.999Z');
global.Date = class extends RealDate {
  constructor(...args) { super(...(args.length ? args : [clock])); }
  static now() { return clock; }
};
const teacher = { auth: { uid: 'teacher', token: { role: 4, level: 100 } } };
const admin = { auth: { uid: 'admin', token: { role: 600, level: 600 } } };
const calls = [];
let assigned = true, current = 4;
permissions.requirePermission = async () => {};
dataConnect.executeGraphql = async query => {
  calls.push(query);
  if (query.includes('query CurrentSemestreSetting')) return { data: { appSettings: [{ settingKey: 'general.semestreActualId', intValue: current }] } };
  if (query.includes('query RegistroAuxiliarAccess')) return { data: {
    users: [{ id: 1 }], personals: [{ id: 10, userId: 1 }],
    grupoModulo: { id: 50, grupo: { personalId: assigned ? 10 : 20, semestreId: 4, semestre: { fin: '2026-12-23T00:00:00.000000Z' } } },
  } };
  if (query.includes('query RegistroAuxiliarContext')) return { data: { grupoModulo: null } };
  if (query.includes('query RegistroAuxiliarSaveGrupoModulo')) return { data: { grupoModulo: null } };
  throw Error('Unexpected database operation');
};
(async () => {
  // Reaching not-found proves authorization allowed the operation before the cutoff.
  await assert.rejects(handlers.saveRegistroAuxiliar.run({ grupoModuloId: 50, notas: [] }, teacher), error => error.code === 'not-found');
  clock = RealDate.parse('2026-12-24T05:00:00Z');
  calls.length = 0;
  const endpoints = [
    [handlers.saveRegistroAuxiliar, { grupoModuloId: 50, notas: [] }],
    [handlers.updateRegistroAuxiliarGrupoModuloFechas, { grupoModuloId: 50, fin: '2027-12-31' }],
    [handlers.updateRegistroAuxiliarEstudianteNombre, { grupoModuloId: 50, moduloEstudianteId: 1 }],
  ];
  for (const [endpoint, input] of endpoints) await assert.rejects(endpoint.run(input, teacher), error => error.code === 'failed-precondition' && error.message.includes('Modulo Finalizado'));
  assert(calls.every(query => !query.includes('mutation')), 'No writes after the cutoff');
  await assert.rejects(handlers.getRegistroAuxiliar.run({ grupoModuloId: 50 }, teacher), error => error.code === 'not-found', 'Read access remains available');
  await assert.rejects(handlers.saveRegistroAuxiliar.run({ grupoModuloId: 50, notas: [] }, admin), error => error.code === 'not-found', 'Administrators retain their normal permissions');
  assigned = false;
  await assert.rejects(handlers.getRegistroAuxiliar.run({ grupoModuloId: 50 }, teacher), error => error.code === 'permission-denied');
  assigned = true; current = 5;
  await assert.rejects(handlers.getRegistroAuxiliar.run({ grupoModuloId: 50 }, teacher), error => error.code === 'permission-denied');
  console.log('Registro: cierre a medianoche de Lima, consulta posterior, asignación, semestre actual y administradores verificados.');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => { global.Date = RealDate; });
