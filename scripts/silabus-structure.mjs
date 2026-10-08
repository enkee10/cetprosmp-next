import assert from 'node:assert/strict';
import { normalize } from './silabus-model.mjs';
import { expectedCompetenciaType, isProgramaEstudio } from '../functions/lib/modules/competencias/model.js';

const tables = {
  competencias: { mutation: 'competencia_insert', type: 'Competencia_Data', fields: 'nombre tipo moduloId' },
  unidadesDidacticas: { mutation: 'unidadDidactica_insert', type: 'UnidadDidactica_Data', fields: 'nombre duracion creditos comun' },
  capacidadesTerminales: { mutation: 'capacidadTerminal_insert', parent: 'unidadDidacticaId' },
  indicadoresCapacidad: { mutation: 'indicadorCapacidad_insert', parent: 'capacidadTerminalId' },
  competenciaUnidadesDidacticas: { mutation: 'competenciaUnidadDidactica_insert' },
};

export function missingStructure(rows, mappings, state, context, moduleIds) {
  const simulated = structuredClone(state);
  simulated.competencias = structuredClone(context.competencias);
  const additions = [];
  let nextId = -1;
  const insert = (table, data, moduloId) => {
    const record = { id: nextId--, ...data };
    additions.push({ table, moduloId, record });
    simulated[table].push(record);
    return record;
  };
  for (const moduloId of moduleIds) {
    const sourceModules = mappings.filter(v => v.type === 'modulo' && v.id === moduloId).map(v => normalize(v.excel));
    const sourceRows = rows.filter(v => sourceModules.includes(normalize(v.module)));
    assert.ok(sourceRows.length, `No hay filas para el modulo ${moduloId}`);
    const module = state.modulos.find(v => v.id === moduloId);
    const types = [module.plan, ...state.planModulos.filter(v => v.moduloId === moduloId).map(v => v.plan)]
      .map(v => v?.carrera?.tipoCarrera?.nombre).filter(Boolean);
    assert.ok(types.length && types.every(isProgramaEstudio) === types.some(isProgramaEstudio), 'Tipo de carrera inconsistente');
    const unitNames = [...new Set(sourceRows.map(v => v.unit))];
    const units = unitNames.map(nombre => {
      const links = simulated.competenciaUnidadesDidacticas.filter(v => v.competencia.moduloId === moduloId);
      const existing = simulated.unidadesDidacticas.find(v => normalize(v.nombre) === normalize(nombre) && links.some(l => l.unidadDidacticaId === v.id));
      if (existing) return existing;
      const source = sourceRows.filter(v => v.unit === nombre);
      const uniqueValue = key => {
        const values = [...new Set(source.map(v => v[key]).filter(v => v != null))];
        assert.ok(values.length <= 1, `Datos de unidad contradictorios: ${nombre}/${key}`);
        const value = values[0] ?? null;
        assert.ok(value == null || Number.isInteger(value) && value > 0, `Valor no entero: ${nombre}/${key}`);
        return value;
      };
      return insert('unidadesDidacticas', { nombre, duracion: uniqueValue('unitHours'), creditos: uniqueValue('unitCredits'), comun: false }, moduloId);
    });
    units.forEach((unit, index) => {
      const existingLink = simulated.competenciaUnidadesDidacticas.find(v => v.competencia.moduloId === moduloId && v.unidadDidacticaId === unit.id);
      const tipo = expectedCompetenciaType(types.every(isProgramaEstudio), context.modulos.find(v => v.id === moduloId)?.horas, units.map(v => v.id), unit.id);
      if (!existingLink) {
        // The syllabus has no competency column. Follow the existing pending-competency convention.
        const competence = simulated.competencias.find(v => v.moduloId === moduloId && v.tipo === tipo)
          ?? insert('competencias', { nombre: '', tipo, moduloId }, moduloId);
        insert('competenciaUnidadesDidacticas', { orden: index + 1, competenciaId: competence.id, unidadDidacticaId: unit.id, competencia: { moduloId } }, moduloId);
      }
      const source = sourceRows.filter(v => v.unit === unitNames[index]);
      const capacityNames = [...new Set(source.map(v => v.capacity))];
      capacityNames.forEach((descripcion, capacityIndex) => {
        assert.ok(descripcion, `Capacidad vacia: ${unit.nombre}`);
        const capacity = simulated.capacidadesTerminales.find(v => v.unidadDidacticaId === unit.id && normalize(v.descripcion) === normalize(descripcion))
          ?? insert('capacidadesTerminales', { descripcion, orden: capacityIndex + 1, unidadDidacticaId: unit.id }, moduloId);
        const indicators = [...new Set(source.filter(v => v.capacity === descripcion).map(v => v.indicator))];
        indicators.forEach((indicator, indicatorIndex) => {
          assert.ok(indicator, `Indicador vacio: ${descripcion}`);
          if (!simulated.indicadoresCapacidad.some(v => v.capacidadTerminalId === capacity.id && normalize(v.descripcion) === normalize(indicator))) {
            insert('indicadoresCapacidad', { descripcion: indicator, orden: indicatorIndex + 1, capacidadTerminalId: capacity.id }, moduloId);
          }
        });
      });
    });
  }
  return { state: simulated, additions };
}

export function structureMutation(additions) {
  const aliases = new Map(), variables = {}, definitions = [], fields = [];
  const reference = (field, id) => id > 0 ? `${field}:${id}` : `${field}_expr:"response.${aliases.get(id)}.id"`;
  additions.forEach(({ table, record }, i) => {
    const alias = `s${i}`, spec = tables[table];
    aliases.set(record.id, alias);
    if (spec.type) {
      const { id, ...data } = record;
      variables[alias] = data;
      definitions.push(`$${alias}:${spec.type}! @allow(fields:"${spec.fields}")`);
      fields.push(`${alias}:${spec.mutation}(data:$${alias})`);
    } else if (spec.parent) {
      const variable = `text${i}`;
      definitions.push(`$${variable}:String!`); variables[variable] = record.descripcion;
      fields.push(`${alias}:${spec.mutation}(data:{descripcion:$${variable},orden:${record.orden},${reference(spec.parent, record[spec.parent])}})`);
    } else {
      fields.push(`${alias}:${spec.mutation}(data:{orden:${record.orden},${reference('competenciaId', record.competenciaId)},${reference('unidadDidacticaId', record.unidadDidacticaId)}})`);
    }
  });
  assert.ok(fields.length);
  return { source: `mutation CompleteSilabusStructure(${definitions.join(',')}) @transaction {${fields.join('\n')}}`, variables, aliases };
}

export function assertPreserved(before, after, keys = Object.keys(before)) {
  for (const key of keys) {
    const recordKey = record => {
      if (record.id != null) return record.id;
      assert.equal(key, 'planModulos', `Falta la clave primaria: ${key}`);
      return `${record.planId}:${record.moduloId}`;
    };
    const current = new Map(after[key].map(v => [recordKey(v), v]));
    for (const record of before[key]) assert.deepEqual(current.get(recordKey(record)), record, `Registro existente alterado: ${key}/${recordKey(record)}`);
  }
}
