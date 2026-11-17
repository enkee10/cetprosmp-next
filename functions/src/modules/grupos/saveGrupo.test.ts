import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { dataConnect } from '../core/dataConnectCore.js';
import { DataConnectGrupoInput } from '../core/types.js';
import { DetalleInstancia, saveGrupoWithModulos } from './saveGrupo.js';

test('creating and editing a group names each group-module from its academic title, suffix and current group fields', async () => {
  const client = dataConnect as unknown as {
    executeGraphql: (query: string, options?: { variables?: Record<string, unknown> }) => Promise<{ data: Record<string, unknown> }>;
  };
  const original = client.executeGraphql;
  const mutations: Record<string, unknown>[] = [];
  const catalog = {
    modulos: [
      { id: 32, titulo: 'Confecciones de Muebles en Melamine', tituloComercial: 'Carpintería en Melamina' },
      { id: 31, titulo: 'Mantenimiento de Carpintería', tituloComercial: 'Carpintería en Madera' },
    ],
    competenciaUnidadesDidacticas: [],
    personal: { displayName: 'Richard Ramos Ipanaque', user: { username: 'Richard Ramos Ipanaque', apellidoPaterno: 'Ramos' } },
    turno: { nombre: 'Noche' },
    horario: { nombre: 'Lun - Vie' },
    semestre: { titulo: '2026-2' },
  };
  const previous = {
    grupo: { id: 165 },
    grupoModulos: [
      { id: 155, grupoId: 165, moduloId: 32, instancia: 1, nombre: 'Carpintería en Melamina [Noche] Lun, Mie, @Vie (Richard Ramos)', sufijo: null, orden: 1 },
      { id: 157, grupoId: 165, moduloId: 31, instancia: 1, nombre: 'Carpintería en Madera [Noche] Lun, Mie, @Vie (Richard Ramos) (ago-oct)', sufijo: '(ago-oct)', orden: 2 },
    ],
    grupoModuloUnidadesDidacticas: [],
  };
  client.executeGraphql = async (query, options) => {
    if (query.includes('query GrupoModuleCatalog')) return { data: catalog };
    if (query.includes('query PreviousGrupoConfiguration')) return { data: previous };
    assert.match(query, /mutation SaveGrupoConfiguration/);
    mutations.push(options?.variables ?? {});
    return { data: { savedGrupo: { id: 165 } } };
  };
  const payload = {
    nombreDisplay: 'Grupo de Richard', turnoNombre: 'Noche', personalId: 24, turnoId: 3, horarioId: 5, semestreId: 4,
  } as DataConnectGrupoInput;
  const detail = (moduloId: number, sufijo: string | null, orden: number): DetalleInstancia => ({
    moduloId, instancia: 1, sufijo, orden, obligatorio: true,
    hasInicio: false, hasFin: false, hasCalendarioId: false, hasSufijo: true, unidadDidacticas: [],
  });
  try {
    await saveGrupoWithModulos(null, payload, [detail(32, '(ago-oct)', 1), detail(31, '(oct-dic)', 2)]);
    assert.equal(mutations[0].gm0Nombre, 'Confecciones de Muebles en Melamine (ago-oct) [Noche] Lun - Vie (Richard Ramos)');
    assert.equal(mutations[0].gm1Nombre, 'Mantenimiento de Carpintería (oct-dic) [Noche] Lun - Vie (Richard Ramos)');

    catalog.horario.nombre = 'Mar - Vie';
    await saveGrupoWithModulos(165, { ...payload, nombreDisplay: 'Grupo de Richard actualizado' }, [detail(32, '(ago-oct)', 1), detail(31, '(oct-dic)', 2)]);
    const edited = mutations[1] as { gm0: { nombre: string }; gm1: { nombre: string } };
    assert.equal(edited.gm0.nombre, 'Confecciones de Muebles en Melamine (ago-oct) [Noche] Mar - Vie (Richard Ramos)');
    assert.equal(edited.gm1.nombre, 'Mantenimiento de Carpintería (oct-dic) [Noche] Mar - Vie (Richard Ramos)');
  } finally {
    client.executeGraphql = original;
  }
});

test('transitabilidad persists on edits, uses the marker, and rejects occupational modules before any write', async () => {
  const original = dataConnect.executeGraphql;
  const variables: Array<Record<string, unknown>> = [];
  const queries: string[] = [];
  let previous: unknown[] = [];
  let tipo = 'Programa de estudio (alineado al CNOF)';
  (dataConnect as unknown as {executeGraphql: unknown}).executeGraphql = async (query: string, options: {variables: Record<string, unknown>}) => {
    if (query.includes('query GrupoModuleCatalog')) return { data: {
      modulos: [{id: 25, titulo: 'Panadería', plan: {carrera: {tipoCarrera: {nombre: tipo}}}}],
      competenciaUnidadesDidacticas: [], turno: {nombre: 'Mañana'}, horario: {nombre: 'Lun - Vie'},
    } };
    if (query.includes('query PreviousGrupoConfiguration')) return {data: {grupo: {id: 1}, grupoModulos: previous, grupoModuloUnidadesDidacticas: []}};
    variables.push(options.variables);
    queries.push(query);
    return {data: {savedGrupo: {id: 1}}};
  };
  const detail: DetalleInstancia = {moduloId: 25, instancia: 1, transitabilidad: true, hasInicio: false, hasFin: false, hasCalendarioId: false, hasSufijo: false, unidadDidacticas: []};
  try {
    await saveGrupoWithModulos(null, {nombreDisplay: 'Panadería'}, [detail]);
    assert.equal(variables[0].gm0Transitabilidad, true);
    assert.equal(variables[0].gm0Nombre, 'Panadería (Trans.) [Mañana] Lun - Vie');
    previous = [{id: 5, grupoId: 1, moduloId: 25, instancia: 1, transitabilidad: true}];
    await saveGrupoWithModulos(1, {nombreDisplay: 'Panadería'}, [{...detail, transitabilidad: undefined}]);
    assert.equal((variables[1].gm0 as {transitabilidad: boolean}).transitabilidad, true);
    assert.equal((variables[1].gm0 as {nombre: string}).nombre, 'Panadería (Trans.) [Mañana] Lun - Vie');
    await saveGrupoWithModulos(1, {nombreDisplay: 'Panadería'}, [detail, {...detail, instancia:2}]);
    assert.equal((variables[2].gm0 as {numeroTransitabilidad:number}).numeroTransitabilidad, 1);
    assert.equal((variables[2].gm0 as {nombre:string}).nombre, 'Panadería (Trans. 1) [Mañana] Lun - Vie');
    assert.equal(variables[2].gm1NumeroTransitabilidad, 2);
    assert.equal(variables[2].gm1Nombre, 'Panadería (Trans. 2) [Mañana] Lun - Vie');
    assert.match(queries[2], /registroAcademicoDocumentos/);
    assert.match(queries[2], /@check/);
    previous = [{id:5,grupoId:1,moduloId:25,instancia:1,transitabilidad:true,numeroTransitabilidad:1},{id:6,grupoId:1,moduloId:25,instancia:2,transitabilidad:true,numeroTransitabilidad:2}];
    await saveGrupoWithModulos(1, {nombreDisplay:'Panadería'}, [{...detail,instancia:2}]);
    assert.equal((variables[3].gm0 as {numeroTransitabilidad:number}).numeroTransitabilidad, 2, 'Removing one instance preserves the other number');
    tipo = 'Opción ocupacional';
    await assert.rejects(() => saveGrupoWithModulos(null, {nombreDisplay: 'Inválido'}, [detail]), /solo está disponible/);
    assert.equal(variables.length, 4, 'Invalid transitabilidad never writes data');
  } finally {
    dataConnect.executeGraphql = original;
  }
});
