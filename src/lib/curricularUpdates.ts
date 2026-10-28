import type { AprendizajeDetalle, CapacidadDetalle, CompetenciaDetalle, IndicadorDetalle, ModuloDetalle, SesionDetalle, UnidadDidacticaDetalle, AcademicDragEntity } from './curricularReassignment';
import type { CurricularPlan } from './curricularFilters';

export interface UnitAssignment { id: number; orden: number | null; unidadDidacticaId: number; competenciaId: number; competencia: CompetenciaDetalle & { moduloId: number } }
export interface AcademicCreationResult { id: number; entity: string; item: Record<string, unknown>; unitAssignments?: UnitAssignment[] }
export interface AcademicRemovalResult { id: number; unitAssignments?: UnitAssignment[] }
export type AcademicRemoval =
  | { entity: 'modulo'; moduloId: number; planId: number }
  | { entity: 'competencia'; competenciaId: number }
  | { entity: 'unidadDidactica'; relacionId: number }
  | { entity: 'capacidadTerminal'; capacidadTerminalId: number }
  | { entity: 'indicadorCapacidad'; indicadorCapacidadId: number }
  | { entity: 'actividad'; actividadId: number };
type Visitors = {
  modulo?: (item: ModuloDetalle) => ModuloDetalle;
  unidad?: (item: UnidadDidacticaDetalle) => UnidadDidacticaDetalle;
  capacidad?: (item: CapacidadDetalle) => CapacidadDetalle;
  indicador?: (item: IndicadorDetalle) => IndicadorDetalle;
  aprendizaje?: (item: AprendizajeDetalle) => AprendizajeDetalle;
  actividad?: (item: SesionDetalle) => SesionDetalle;
};
function mapChanged<T>(items: T[], fn: (item: T) => T) {
  const next = items.map(fn);
  return next.some((item, index) => item !== items[index]) ? next : items;
}
function updateTree(modules: ModuloDetalle[], visit: Visitors): ModuloDetalle[] {
  return mapChanged(modules, modulo => {
    const unidadesDidacticas = mapChanged(modulo.unidadesDidacticas, unidad => {
      const capacidadesTerminales = mapChanged(unidad.capacidadesTerminales, capacidad => {
        const indicadoresCapacidad = mapChanged(capacidad.indicadoresCapacidad, indicador => {
          const aprendizajes = indicador.aprendizajes && mapChanged(indicador.aprendizajes, aprendizaje => {
            const actividades = visit.actividad ? mapChanged(aprendizaje.actividades, visit.actividad) : aprendizaje.actividades;
            const next = actividades === aprendizaje.actividades ? aprendizaje : { ...aprendizaje, actividades };
            return visit.aprendizaje?.(next) ?? next;
          });
          const next = aprendizajes === indicador.aprendizajes ? indicador : { ...indicador, aprendizajes };
          return visit.indicador?.(next) ?? next;
        });
        const next = indicadoresCapacidad === capacidad.indicadoresCapacidad ? capacidad : { ...capacidad, indicadoresCapacidad };
        return visit.capacidad?.(next) ?? next;
      });
      const next = capacidadesTerminales === unidad.capacidadesTerminales ? unidad : { ...unidad, capacidadesTerminales };
      return visit.unidad?.(next) ?? next;
    });
    const next = unidadesDidacticas === modulo.unidadesDidacticas ? modulo : { ...modulo, unidadesDidacticas };
    return visit.modulo?.(next) ?? next;
  });
}
const ordered = <T extends { id: number; orden?: number | null }>(items: T[], fallback: (item: T) => number = item => item.id) => {
  const next = items.slice().sort((a, b) => (a.orden ?? fallback(a)) - (b.orden ?? fallback(b)) || a.id - b.id);
  return next.every((item, index) => item === items[index]) ? items : next;
};

export function applyUnitAssignments(modules: ModuloDetalle[], assignments: UnitAssignment[]) {
  const byUnit = new Map(assignments.map(item => [item.unidadDidacticaId, item]));
  return updateTree(modules, {
    unidad: item => {
      const assignment = byUnit.get(item.id);
      return !assignment || (assignment.id === item.relacionId && assignment.orden === item.orden && assignment.competenciaId === item.competenciaId) ? item : {
        ...item, relacionId: assignment.id, orden: assignment.orden, competenciaId: assignment.competenciaId, competencia: assignment.competencia,
        capacidadesTerminales: item.capacidadesTerminales.map(cap => ({ ...cap, competencias: [assignment.competencia] })),
      };
    },
    modulo: item => {
      const relevant = assignments.filter(row => row.competencia.moduloId === item.id);
      if (!relevant.length) return item;
      const missing = relevant.map(row => row.competencia).filter((comp, index, all) => !item.competencias.some(row => row.id === comp.id) && all.findIndex(row => row.id === comp.id) === index);
      const units = ordered(item.unidadesDidacticas, unit => unit.relacionId);
      return missing.length || units !== item.unidadesDidacticas ? { ...item, competencias: missing.length ? [...item.competencias, ...missing] : item.competencias, unidadesDidacticas: units } : item;
    },
  });
}

export function applyAcademicCreation(modules: ModuloDetalle[], result: AcademicCreationResult) {
  const { entity, item, id } = result;
  if (!Number.isSafeInteger(id) || id <= 0 || item.id !== id) throw new Error('La creación no devolvió un identificador válido.');
  if (entity === 'modulo') {
    const relations = (item.planModulos || []) as NonNullable<ModuloDetalle['planModulos']>;
    const created = { titulo: null, tituloComercial: null, descripcion: null, horas: null, creditos: null, metas: null, activo: true, slug: null, comun: false,
      plan: null, planId: null, ...item, competencias: [], unidadesDidacticas: [], planModuloId: relations.find(row => row.planId === item.planId)?.id ?? null,
      planIds: relations.map(row => row.planId) } as unknown as ModuloDetalle;
    return modules.some(row => row.id === id) ? modules : [...modules, created];
  }
  const updated = updateTree(modules, {
    modulo: modulo => {
      if (entity === 'competencia' && modulo.id === item.moduloId && !modulo.competencias.some(row => row.id === id)) return { ...modulo, competencias: [...modulo.competencias, item as unknown as CompetenciaDetalle] };
      const assignment = result.unitAssignments?.find(row => row.unidadDidacticaId === id);
      if (entity !== 'unidadDidactica' || assignment?.competencia.moduloId !== modulo.id || modulo.unidadesDidacticas.some(row => row.id === id)) return modulo;
      return { ...modulo, unidadesDidacticas: [...modulo.unidadesDidacticas, { ...item, relacionId: assignment.id, orden: assignment.orden,
        competenciaId: assignment.competenciaId, competencia: assignment.competencia, capacidadesTerminales: [] } as unknown as UnidadDidacticaDetalle] };
    },
    unidad: unidad => entity === 'capacidadTerminal' && unidad.id === item.unidadDidacticaId && !unidad.capacidadesTerminales.some(row => row.id === id)
      ? { ...unidad, capacidadesTerminales: [...unidad.capacidadesTerminales, { ...item, competencias: [unidad.competencia], indicadoresCapacidad: [] } as unknown as CapacidadDetalle] } : unidad,
    capacidad: capacidad => entity === 'indicadorCapacidad' && capacidad.id === item.capacidadTerminalId && !capacidad.indicadoresCapacidad.some(row => row.id === id)
      ? { ...capacidad, indicadoresCapacidad: [...capacidad.indicadoresCapacidad, { ...item, aprendizajes: [] } as unknown as IndicadorDetalle] } : capacidad,
    indicador: indicador => {
      const learning = entity === 'aprendizaje' ? item : entity === 'actividad' ? item.aprendizaje as Record<string, unknown> : null;
      if (!learning || learning.indicadorCapacidadId !== indicador.id || indicador.aprendizajes?.some(row => row.id === learning.id)) return indicador;
      const activities = entity === 'actividad' ? [{ ...item, contenidos: [], materiales: [] } as unknown as SesionDetalle] : [];
      return { ...indicador, aprendizajes: [...(indicador.aprendizajes || []), { ...learning, actividades: activities } as unknown as AprendizajeDetalle] };
    },
    aprendizaje: aprendizaje => entity === 'actividad' && aprendizaje.id === item.aprendizajeId && !aprendizaje.actividades.some(row => row.id === id)
      ? { ...aprendizaje, actividades: [...aprendizaje.actividades, { ...item, contenidos: [], materiales: [] } as unknown as SesionDetalle] } : aprendizaje,
  });
  return result.unitAssignments ? applyUnitAssignments(updated, result.unitAssignments) : updated;
}

/** Apply a confirmed deletion without replacing unrelated branches or fetching the tree. */
export function applyAcademicRemoval(modules: ModuloDetalle[], removal: AcademicRemoval, result: AcademicRemovalResult, plans: CurricularPlan[] = []) {
  const without = <T>(items: T[], matches: (item: T) => boolean) => items.some(matches) ? items.filter(item => !matches(item)) : items;
  let updated: ModuloDetalle[];
  if (removal.entity === 'modulo') {
    updated = modules.flatMap(modulo => {
      if (modulo.id !== removal.moduloId) return [modulo];
      const relations = (modulo.planModulos || []).filter(row => row.planId !== removal.planId)
        .sort((a, b) => (a.orden ?? Number.MAX_SAFE_INTEGER) - (b.orden ?? Number.MAX_SAFE_INTEGER) || a.planId - b.planId || a.id - b.id);
      const planId = modulo.planId === removal.planId ? relations[0]?.planId ?? null : modulo.planId;
      if (!planId && !relations.length) return [];
      const primary = relations.find(row => row.planId === planId);
      return [{ ...modulo, planId, plan: modulo.planId === planId ? modulo.plan : primary?.plan ?? plans.find(plan => plan.id === planId) ?? null,
        planModuloId: primary?.id ?? null, planModulos: relations,
        planIds: [...new Set([...relations.map(row => row.planId), ...(planId ? [planId] : [])])] }];
    });
  } else {
    updated = updateTree(modules, {
      modulo: modulo => {
        if (removal.entity === 'competencia') {
          const competencies = without(modulo.competencias, row => row.id === removal.competenciaId);
          return competencies === modulo.competencias ? modulo : { ...modulo, competencias: competencies };
        }
        if (removal.entity !== 'unidadDidactica') return modulo;
        const units = without(modulo.unidadesDidacticas, row => row.relacionId === removal.relacionId);
        return units === modulo.unidadesDidacticas ? modulo : { ...modulo, unidadesDidacticas: units };
      },
      unidad: unidad => {
        if (removal.entity !== 'capacidadTerminal') return unidad;
        const capacities = without(unidad.capacidadesTerminales, row => row.id === removal.capacidadTerminalId);
        return capacities === unidad.capacidadesTerminales ? unidad : { ...unidad, capacidadesTerminales: capacities };
      },
      capacidad: capacidad => {
        if (removal.entity !== 'indicadorCapacidad') return capacidad;
        const indicators = without(capacidad.indicadoresCapacidad, row => row.id === removal.indicadorCapacidadId);
        return indicators === capacidad.indicadoresCapacidad ? capacidad : { ...capacidad, indicadoresCapacidad: indicators };
      },
      aprendizaje: aprendizaje => {
        if (removal.entity !== 'actividad') return aprendizaje;
        const activities = without(aprendizaje.actividades, row => row.id === removal.actividadId);
        return activities === aprendizaje.actividades ? aprendizaje : { ...aprendizaje, actividades: activities };
      },
    });
  }
  return result.unitAssignments ? applyUnitAssignments(updated, result.unitAssignments) : updated;
}

export function applyAcademicOrder(modules: ModuloDetalle[], entity: AcademicDragEntity, items: Array<{ id: number; orden: number | null | undefined }>, planId?: number | null) {
  const positions = new Map(items.map(item => [item.id, item.orden]));
  const patch = <T extends { id: number; orden?: number | null }>(item: T, id = item.id): T => positions.has(id) && positions.get(id) !== item.orden ? { ...item, orden: positions.get(id) } : item;
  return updateTree(modules, {
    modulo: modulo => {
      if (entity === 'modulo') {
        if (!positions.has(modulo.id)) return modulo;
        return { ...modulo, ...(modulo.planId === planId ? { orden: positions.get(modulo.id) } : {}),
          planModulos: modulo.planModulos?.map(row => row.planId === planId ? { ...row, orden: positions.get(modulo.id) } : row) } as ModuloDetalle;
      }
      if (entity === 'competencia') { const competencias = mapChanged(modulo.competencias, item => patch(item)); return competencias === modulo.competencias ? modulo : { ...modulo, competencias }; }
      const units = entity === 'competenciaUnidadDidactica' ? ordered(modulo.unidadesDidacticas, unit => unit.relacionId) : modulo.unidadesDidacticas;
      return units === modulo.unidadesDidacticas ? modulo : { ...modulo, unidadesDidacticas: units };
    },
    unidad: unidad => {
      if (entity === 'competenciaUnidadDidactica') return patch(unidad, unidad.relacionId);
      const capacities = entity === 'capacidadTerminal' ? ordered(unidad.capacidadesTerminales) : unidad.capacidadesTerminales;
      return capacities === unidad.capacidadesTerminales ? unidad : { ...unidad, capacidadesTerminales: capacities };
    },
    capacidad: capacidad => {
      if (entity === 'capacidadTerminal') return patch(capacidad);
      const indicators = entity === 'indicadorCapacidad' ? ordered(capacidad.indicadoresCapacidad) : capacidad.indicadoresCapacidad;
      return indicators === capacidad.indicadoresCapacidad ? capacidad : { ...capacidad, indicadoresCapacidad: indicators };
    },
    indicador: indicador => {
      if (entity === 'indicadorCapacidad') return patch(indicador);
      const learnings = entity === 'aprendizaje' && indicador.aprendizajes ? ordered(indicador.aprendizajes) : indicador.aprendizajes;
      return learnings === indicador.aprendizajes ? indicador : { ...indicador, aprendizajes: learnings };
    },
    aprendizaje: aprendizaje => {
      if (entity === 'aprendizaje') return patch(aprendizaje);
      const activities = entity === 'actividad' ? ordered(aprendizaje.actividades) : aprendizaje.actividades;
      return activities === aprendizaje.actividades ? aprendizaje : { ...aprendizaje, actividades: activities };
    },
    actividad: actividad => entity === 'actividad' ? patch(actividad) : actividad,
  });
}
