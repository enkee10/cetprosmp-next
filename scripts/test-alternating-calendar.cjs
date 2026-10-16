const assert = require('node:assert/strict');
const { scheduleDay, rebalanceSlots } = require('./alternating-calendar.cjs');
const { scheduleActivities } = require('./plan-calendarizacion-2026.cjs');
const { isParteCoordinator } = require('../functions/lib/modules/parte-diario/eligibility.js');
const start = '2026-08-10';
const lmv = date => scheduleDay(date, [1,3,5], start, '2026-2');
const mjv = date => scheduleDay(date, [2,4,5], start, '2026-2');
assert(lmv('2026-10-16') && !mjv('2026-10-16'));
assert(!lmv('2026-10-23') && mjv('2026-10-23'));
assert(!mjv('2026-10-30') && mjv('2026-11-06'), 'Changing modules must not reset alternation.');
assert(scheduleDay('2026-03-20',[1,3,5],'2026-03-16','2026-1'));
assert(!scheduleDay('2026-03-20',[2,4,5],'2026-03-16','2026-1'));
assert(scheduleDay('2026-08-14',[1,3,5],start,'2026-2','primer'));
assert(!mjv('2026-09-30'), 'Practice also respects weekdays.');
const original = [
  {date:'2026-10-13',offset:0,minutes:270,phase:'ppp'},
  {date:'2026-10-15',offset:0,minutes:270,phase:'ppp'},
  {date:'2026-10-16',offset:0,minutes:135,phase:'ppp'},
];
const repaired = rebalanceSlots(original,mjv,'2026-10-16');
assert.deepEqual(repaired.slots.map(s=>s.minutes),[337.5,337.5], 'A closing Friday is recovered equally before the deadline.');
assert.deepEqual(original.map(s=>s.minutes),[270,270,135], 'Planning is pure.');
const fractional = rebalanceSlots([
  ...['2026-10-20','2026-10-22','2026-10-27','2026-10-29','2026-11-03','2026-11-05','2026-11-10'].map(date=>({date,offset:0,minutes:270,phase:'tecnica'})),
  {date:'2026-10-30',offset:0,minutes:270,phase:'tecnica'},
],mjv);
const extra = fractional.extensions.map(e=>e.extraSeconds);
assert(Math.max(...extra)-Math.min(...extra)<=1);
assert.equal(extra.reduce((n,x)=>n+x,0),270*60);
const scheduled = scheduleActivities([{id:1,unitId:1}],new Map([[1,8*270]]),fractional.slots,{id:1},{hora_inicio:'1970-01-01T08:30:00Z'});
assert.equal(scheduled.reduce((n,s)=>n+Date.parse(s.end)-Date.parse(s.start),0),8*270*60000);
assert(scheduled.every(s=>mjv(s.start.slice(0,10))));
assert(isParteCoordinator({id:13,user:{rol:{titulo:'Docente'}}},{coordinador2Id:13}));
assert(isParteCoordinator({id:37,user:{rol:{titulo:'Coordinador'}}}));
assert(!isParteCoordinator({id:14,user:{rol:{titulo:'Docente'}}},{coordinador2Id:13}));
assert(!isParteCoordinator(null));
console.log('Secuencia semestral, cambio de módulo, cierre PPP, horas exactas, recuperación equitativa y exclusión de coordinadores: correctos.');
