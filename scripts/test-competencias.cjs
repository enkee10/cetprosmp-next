const assert = require('node:assert/strict');
const { expectedCompetenciaType, orderedUnidadRelations, isProgramaEstudio, employabilityCodeForUnidad, projectUnidadRelations } = require('../functions/lib/modules/competencias/model.js');
assert.equal(isProgramaEstudio('Programa de estudio (alineado al CNOF)'), true);
assert.equal(isProgramaEstudio('Opcion ocupacional'), false);
const units = [1, 2, 3, 4];
for (const hours of [399, 400, 401, 1056]) {
  for (const id of units) assert.equal(expectedCompetenciaType(false, hours, units, id), 'TECNICA');
  assert.equal(expectedCompetenciaType(true, hours, units, 1), 'TECNICA');
  assert.equal(expectedCompetenciaType(true, hours, units, 3), hours > 400 ? 'EMPLEABILIDAD' : 'TECNICA');
  assert.equal(expectedCompetenciaType(true, hours, units, 4), 'EMPLEABILIDAD');
}
assert.throws(() => expectedCompetenciaType(true, null, units, 1));
assert.equal(expectedCompetenciaType(true, 400, [7], 7), 'EMPLEABILIDAD');
assert.equal(expectedCompetenciaType(false, null, [7], 7), 'TECNICA');
assert.equal(employabilityCodeForUnidad('Comportamiento etico'), '4');
assert.equal(employabilityCodeForUnidad('TIC'), '2');
const shared = [{ id: 1, unidadDidacticaId: 7, orden: 2, competencia: { moduloId: 3 } }, { id: 2, unidadDidacticaId: 7, orden: 1, competencia: { moduloId: 4 } }];
assert.deepEqual(projectUnidadRelations(shared).map(x => x.moduloId), [3, 4]);
assert.deepEqual(orderedUnidadRelations(shared).map(x => x.id), [2, 1]);
console.log('Horas 399/400/401, tipos, unidades compartidas y codigos CE: correctos.');
