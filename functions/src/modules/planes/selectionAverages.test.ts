import assert from 'node:assert/strict';
import test from 'node:test';
import { recalculateSelectionAverages } from './selectionAverages.js';

const caps = [{ id: 1, unidadDidacticaId: 10 }, { id: 2, unidadDidacticaId: 10 }];
const indicators = [{ id: 11, capacidadTerminalId: 1, orden: 1 }, { id: 12, capacidadTerminalId: 1, orden: 2 }, { id: 21, capacidadTerminalId: 2, orden: 1 }];
function fixture(): Record<string, Array<Record<string, unknown>>> {
  return {
    capacidadesTerminales: caps, indicadoresCapacidad: indicators, unidadesDidacticas: [{ id: 10 }],
    indicadorCapacidadEstudiantes: [{ matriculaId: 100, indicadorCapacidadId: 11, promedio: 18 }, { matriculaId: 100, indicadorCapacidadId: 12, promedio: 8 }, { matriculaId: 100, indicadorCapacidadId: 21, promedio: 10 }],
    capacidadesTerminalesEstudiantes: [{ matriculaId: 100, capacidadTerminalId: 1, promedio: 13 }, { matriculaId: 100, capacidadTerminalId: 2, promedio: 10 }],
    unidadesDidacticasEstudiantes: [{ matriculaId: 100, unidadDidacticaId: 10, promedio: 12 }],
  };
}

test('hidden indicators and capacities do not affect averages; restoring them uses retained grades', () => {
  const data = fixture(), grades = structuredClone(data.indicadorCapacidadEstudiantes);
  data.capacidadesTerminales = [caps[0]];
  data.indicadoresCapacidad = [indicators[0]];
  recalculateSelectionAverages(data, caps, indicators, false);
  assert.equal(data.capacidadesTerminalesEstudiantes[0].promedio, 18);
  assert.equal(data.unidadesDidacticasEstudiantes[0].promedio, 18);
  assert.deepEqual(data.indicadorCapacidadEstudiantes, grades);
  // A save during the reduced selection may have persisted that aggregate.
  // Restoring the selection must recalculate from the original indicator grades.
  data.capacidadesTerminales = caps;
  data.indicadoresCapacidad = indicators;
  recalculateSelectionAverages(data, caps, indicators, false);
  assert.equal(data.capacidadesTerminalesEstudiantes[0].promedio, 13);
  assert.equal(data.unidadesDidacticasEstudiantes[0].promedio, 12);
});

test('occupational programs use the last active indicator, including its missing grade', () => {
  const data = fixture();
  recalculateSelectionAverages(data, caps, indicators, true);
  assert.equal(data.capacidadesTerminalesEstudiantes[0].promedio, 8);
  data.indicadoresCapacidad = [indicators[0], indicators[2]];
  recalculateSelectionAverages(data, caps, indicators, true);
  assert.equal(data.capacidadesTerminalesEstudiantes[0].promedio, 18);
  data.indicadorCapacidadEstudiantes = data.indicadorCapacidadEstudiantes.filter(row => row.indicadorCapacidadId !== 11);
  recalculateSelectionAverages(data, caps, indicators, true);
  assert.equal(data.capacidadesTerminalesEstudiantes[0].promedio, null);
});

test('legacy averages without indicator grades survive an unchanged selection', () => {
  const data = fixture();
  data.indicadorCapacidadEstudiantes = [];
  recalculateSelectionAverages(data, caps, indicators, false);
  assert.equal(data.capacidadesTerminalesEstudiantes[0].promedio, 13);
  assert.equal(data.unidadesDidacticasEstudiantes[0].promedio, 12);
});
