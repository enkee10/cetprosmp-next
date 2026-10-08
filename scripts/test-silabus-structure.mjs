import assert from 'node:assert/strict';
import { missingStructure, structureMutation, assertPreserved } from './silabus-structure.mjs';

const state = {
  modulos: [{ id: 38, plan: { carrera: { tipoCarrera: { nombre: 'Programa de estudio' } } } }], planModulos: [],
  competencias: [], unidadesDidacticas: [], competenciaUnidadesDidacticas: [], capacidadesTerminales: [], indicadoresCapacidad: [],
};
const rows = [
  { module: 'Modulo', unit: '1. UNIDAD', unitHours: 32, unitCredits: 1, capacity: 'UC4 C1 Capacidad', indicator: 'C1.I1 Indicador' },
  { module: 'Modulo', unit: '1. UNIDAD', unitHours: 32, unitCredits: 1, capacity: 'UC4 C1 Capacidad', indicator: 'C1.I2 Otro indicador' },
  { module: 'Modulo', unit: 'ETICA', unitHours: 48, unitCredits: 2, capacity: 'CE4 C1 Capacidad etica', indicator: 'C1 I1 Etica' },
];
const mappings = [{ type: 'modulo', id: 38, excel: 'Modulo' }];
const context = { competencias: [], modulos: [{ id: 38, horas: 400 }] };
const plan = missingStructure(rows, mappings, state, context, [38]);
assert.equal(plan.state.unidadesDidacticas[0].nombre, '1. UNIDAD');
assert.equal(plan.state.capacidadesTerminales[0].descripcion, 'UC4 C1 Capacidad');
assert.equal(plan.state.indicadoresCapacidad[0].descripcion, 'C1.I1 Indicador');
assert.equal(plan.state.indicadoresCapacidad.length, 3);
assert.deepEqual(plan.state.competencias.map(v => v.tipo), ['TECNICA', 'EMPLEABILIDAD']);
assert.equal(state.unidadesDidacticas.length, 0);
const repeated = missingStructure(rows, mappings, plan.state, { ...context, competencias: plan.state.competencias }, [38]);
assert.equal(repeated.additions.length, 0, 'La segunda ejecucion no debe duplicar estructura');
const mutation = structureMutation(plan.additions);
assert.ok(mutation.source.includes('@transaction'));
assert.ok(mutation.source.includes('unidadDidacticaId_expr:"response.s0.id"'));
assert.ok(Object.values(mutation.variables).includes('C1.I1 Indicador'));
assertPreserved(state, plan.state);
assertPreserved({ planModulos: [{ planId: 1, moduloId: 2 }, { planId: 1, moduloId: 3 }] }, { planModulos: [{ planId: 1, moduloId: 3 }, { planId: 1, moduloId: 2 }] });
assert.throws(() => assertPreserved({ units: [{ id: 1, nombre: 'Original' }] }, { units: [{ id: 1, nombre: 'Cambio' }] }));
const occupational = structuredClone(state);
occupational.modulos[0].plan.carrera.tipoCarrera.nombre = 'Opcion ocupacional';
assert.deepEqual(missingStructure(rows, mappings, occupational, context, [38]).state.competencias.map(v => v.tipo), ['TECNICA']);
assert.throws(() => missingStructure([...rows, { ...rows[0], unitHours: 64 }], mappings, state, context, [38]), /contradictorios/);
console.log('Estructura: textos intactos, relaciones, tipos, preservacion y repeticion verificados.');
