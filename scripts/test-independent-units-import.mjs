import assert from 'node:assert/strict';
import { buildPlan } from './import-academic-excel.mjs';

const source = { color: 'blue', rowNumber: 1, moduleName: 'Modulo A', unitName: 'Emprendimiento',
  capacityDescription: 'Capacidad de emprendimiento', indicatorDescription: 'Indicador de emprendimiento',
  values: { duracion_unidad_didactica: 30, creditos_unidad_didactica: 2 } };
const parsed = { rows: [source, { ...source, color: 'yellow', rowNumber: 2, moduleName: 'Modulo B', capacityDescription: '', indicatorDescription: '' }] };
const mappings = [{ normalized: 'modulo a', matchedModuloId: 1 }, { normalized: 'modulo b', matchedModuloId: 2 }];
const state = { unidadesDidacticas: [], competenciaUnidadesDidacticas: [], capacidadesTerminales: [], indicadoresCapacidad: [] };
const result = await buildPlan(parsed, state, mappings, { apply: false }, null);
const units = result.actions.filter(row => row.action === 'createUnidadDidactica');
const links = result.actions.filter(row => row.action === 'attachUnidadToCompetencia');
assert.equal(units.length, 2);
assert.notEqual(links[0].data.unidadDidacticaId, links[1].data.unidadDidacticaId);
assert.deepEqual(links.map(row => row.data.moduloId), [1, 2]);
assert.equal(result.actions.filter(row => row.action === 'createCapacidadTerminal').length, 2);
assert.equal(result.actions.filter(row => row.action === 'createIndicadorCapacidad').length, 2);
console.log('Importador Excel: unidades, capacidades e indicadores propios para cada modulo, incluso cuando las filas remiten al mismo contenido.');
