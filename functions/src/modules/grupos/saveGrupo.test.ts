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
