import type { CurricularPlan } from './curricularFilters';
import type { PeriodNode } from './curricularSelection';

export interface SesionDetalle {
  id: number;
  nombre: string | null;
  numeroSesion: number | null;
  duracion?: number | null;
  fecha?: string | null;
  orden: number | null;
  moduloId?: number | null;
  aprendizajeId?: number;
  materiales: Array<{ id: number; orden: number; texto: string }>;
}
export interface AprendizajeDetalle { id: number; descripcion: string | null; indicadorCapacidadId?: number; orden?: number | null; actividades: SesionDetalle[] }
export interface IndicadorDetalle extends PeriodNode {
  id: number; descripcion: string | null; sigla: string | null; orden: number | null;
  capacidadTerminalId: number | null;
  contenidos: Array<{ id: number; orden: number; texto: string }>;
  aprendizajes?: AprendizajeDetalle[];
}
export interface CapacidadDetalle extends PeriodNode {
  id: number; descripcion: string | null; sigla: string | null; orden: number | null;
  unidadDidacticaId: number | null;
  competencias?: Array<{ id: number; nombre: string; tipo: 'TECNICA' | 'EMPLEABILIDAD'; moduloId: number }>;
  indicadoresCapacidad: IndicadorDetalle[];
}
export interface CompetenciaDetalle extends PeriodNode { id: number; nombre: string; tipo: 'TECNICA' | 'EMPLEABILIDAD'; orden?: number | null }
export interface UnidadDidacticaDetalle extends PeriodNode {
  id: number; relacionId: number; competenciaId: number;
  competencia: CompetenciaDetalle & { moduloId: number };
  orden: number | null; nombre: string | null; duracion: number | null; creditos: number | null; sigla: string | null;
  capacidadesTerminales: CapacidadDetalle[];
}
export interface ModuloDetalle {
  id: number; titulo: string | null; tituloComercial: string | null; orden: number | null; descripcion: string | null;
  competencias: CompetenciaDetalle[]; horas: number | null; creditos: number | null; metas: number | null;
  activo: boolean | null; slug: string | null; comun: boolean | null; planModuloId?: number | null;
  planId: number | null; planIds?: number[]; plan: CurricularPlan | null;
  planModulos?: Array<{ id: number; planId: number; orden?: number | null; plan?: CurricularPlan | null }>;
  unidadesDidacticas: UnidadDidacticaDetalle[];
}
export type ReassignEntity = 'competencia' | 'competenciaUnidadDidactica' | 'capacidadTerminal' | 'indicadorCapacidad' | 'aprendizaje' | 'actividad';
export type AcademicDragEntity = ReassignEntity | 'modulo';
export interface AcademicDrag { entity: AcademicDragEntity; id: number }
export interface Reassignment {
  entity: ReassignEntity; id: number; parentId: number; previousParentId: number; orden?: number | null;
  targetIndicatorId?: number; targetSiblingId?: number; position?: 'before' | 'after';
  learning?: AprendizajeDetalle;
  orders?: Array<{ id: number; orden: number }>;
}

export const academicParent: Record<ReassignEntity, AcademicDragEntity> = {
  competencia: 'modulo', competenciaUnidadDidactica: 'competencia', capacidadTerminal: 'competenciaUnidadDidactica',
  indicadorCapacidad: 'capacidadTerminal', aprendizaje: 'indicadorCapacidad', actividad: 'aprendizaje',
};
export const academicLabels: Record<AcademicDragEntity, string> = {
  modulo: 'Módulo', competencia: 'Competencia', competenciaUnidadDidactica: 'Unidad didáctica',
  capacidadTerminal: 'Capacidad', indicadorCapacidad: 'Indicador', aprendizaje: 'Aprendizaje', actividad: 'Sesión',
};

/** Indexes visible objects without copying their subtrees. Unit drag IDs are relation IDs. */
export function academicLocations(modules: ModuloDetalle[]) {
  const result = new Map<string, { parentId: number | null; module: ModuloDetalle; text: string; tipo?: CompetenciaDetalle['tipo']; unitId?: number; orden?: number | null; numeroSesion?: number | null }>();
  for (const modulo of modules) {
    result.set(`modulo:${modulo.id}`, { parentId: null, module: modulo, text: modulo.titulo || modulo.tituloComercial || `Módulo ${modulo.id}`, orden: modulo.orden });
    for (const comp of modulo.competencias) result.set(`competencia:${comp.id}`, { parentId: modulo.id, module: modulo, text: comp.nombre, tipo: comp.tipo, orden: comp.orden });
    for (const unit of modulo.unidadesDidacticas) {
      result.set(`competenciaUnidadDidactica:${unit.relacionId}`, { parentId: unit.competenciaId, module: modulo, text: unit.nombre || '', tipo: unit.competencia.tipo, unitId: unit.id, orden: unit.orden });
      for (const capacity of unit.capacidadesTerminales) {
        result.set(`capacidadTerminal:${capacity.id}`, { parentId: unit.id, module: modulo, text: capacity.descripcion || '', orden: capacity.orden });
        for (const indicator of capacity.indicadoresCapacidad) {
          result.set(`indicadorCapacidad:${indicator.id}`, { parentId: capacity.id, module: modulo, text: indicator.descripcion || '', orden: indicator.orden });
          for (const learning of indicator.aprendizajes || []) {
            result.set(`aprendizaje:${learning.id}`, { parentId: indicator.id, module: modulo, text: learning.descripcion || '', orden: learning.orden });
            for (const activity of learning.actividades) result.set(`actividad:${activity.id}`, { parentId: learning.id, module: modulo, text: activity.nombre || '', orden: activity.orden, numeroSesion: activity.numeroSesion });
          }
        }
      }
    }
  }
  return result;
}

/** Reorder full siblings, including hidden items, without changing their parent. */
export function academicReorderItems(
  modules: ModuloDetalle[], entity: AcademicDragEntity, sourceId: number, targetId: number,
  position: 'before' | 'after', planId?: number | null,
): Array<{ id: number; orden: number }> {
  if (sourceId === targetId) return [];
  let siblings: Array<{ id: number; orden?: number | null; numeroSesion?: number | null }>;
  if (entity === 'modulo') {
    siblings = modules.flatMap(modulo => {
      const relation = modulo.planModulos?.find(row => row.planId === planId);
      return relation || modulo.planId === planId
        ? [{ id: modulo.id, orden: relation?.orden ?? modulo.orden }] : [];
    });
  } else {
    const locations = academicLocations(modules);
    const source = locations.get(`${entity}:${sourceId}`), target = locations.get(`${entity}:${targetId}`);
    if (!source || !target || source.parentId !== target.parentId) return [];
    siblings = [...locations].flatMap(([key, row]) => key.startsWith(`${entity}:`) && row.parentId === source.parentId
      ? [{ id: Number(key.slice(entity.length + 1)), orden: row.orden, numeroSesion: row.numeroSesion }] : []);
  }
  siblings.sort((a, b) => (a.orden ?? a.numeroSesion ?? a.id) - (b.orden ?? b.numeroSesion ?? b.id) || a.id - b.id);
  const from = siblings.findIndex(item => item.id === sourceId), to = siblings.findIndex(item => item.id === targetId);
  if (from < 0 || to < 0) return [];
  // Preserve missing module positions when a teacher can only access part of a plan.
  const moduleSlots = entity === 'modulo' && siblings.every(item => Number.isInteger(item.orden) && Number(item.orden) > 0)
    && new Set(siblings.map(item => item.orden)).size === siblings.length ? siblings.map(item => item.orden!) : null;
  const [moving] = siblings.splice(from, 1);
  const insertion = to + (position === 'after' ? 1 : 0) - (from < to ? 1 : 0);
  siblings.splice(insertion, 0, moving);
  return siblings.map((item, index) => ({ id: item.id, orden: moduleSlots?.[index] ?? index + 1 }));
}

export function reassignmentFor(modules: ModuloDetalle[], source: AcademicDrag, target: AcademicDrag, locations = academicLocations(modules)): Reassignment | null {
  if (source.entity === 'actividad' && target.entity === 'indicadorCapacidad') {
    const from = locations.get(`actividad:${source.id}`), to = locations.get(`indicadorCapacidad:${target.id}`);
    if (!from || !to || from.parentId == null || locations.get(`aprendizaje:${from.parentId}`)?.parentId === target.id) return null;
    const indicator = to.module.unidadesDidacticas.flatMap(u => u.capacidadesTerminales).flatMap(c => c.indicadoresCapacidad).find(i => i.id === target.id);
    const last = [...(indicator?.aprendizajes ?? [])].sort((a, b) => (a.orden ?? a.id) - (b.orden ?? b.id) || a.id - b.id).at(-1);
    return { entity: 'actividad', id: source.id, previousParentId: from.parentId, parentId: last?.id ?? target.id,
      ...(last ? {} : { targetIndicatorId: target.id }) };
  }
  if (source.entity === 'modulo' || academicParent[source.entity] !== target.entity) return null;
  const from = locations.get(`${source.entity}:${source.id}`), to = locations.get(`${target.entity}:${target.id}`);
  if (!from || !to || from.parentId == null) return null;
  const parentId = target.entity === 'competenciaUnidadDidactica' ? to.unitId! : target.id;
  if (from.parentId === parentId) return null;
  if (source.entity === 'competenciaUnidadDidactica' && from.tipo !== to.tipo) return null;
  if (source.entity === 'competencia' && from.tipo === 'EMPLEABILIDAD') {
    const plans = [to.module.plan, ...(to.module.planModulos || []).map(row => row.plan)].filter(Boolean);
    if (plans.some(plan => {
      const tipo = (plan?.carrera as { tipoCarrera?: { nombre?: string } } | undefined)?.tipoCarrera?.nombre;
      return tipo && !tipo.normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase().includes('PROGRAMA DE ESTUDIO');
    })) return null;
  }
  return { entity: source.entity, id: source.id, parentId, previousParentId: from.parentId };
}

/** Only replaces the source/destination branches. All IDs and descendant content survive. */
export function applyAcademicReassignment(modules: ModuloDetalle[], move: Reassignment): ModuloDetalle[] {
  // An empty indicator needs its real learning ID from the atomic server operation.
  if (move.targetIndicatorId) return modules;
  const locations = academicLocations(modules);
  const source = locations.get(`${move.entity}:${move.id}`);
  const parentEntity = academicParent[move.entity];
  const destinationExists = parentEntity === 'competenciaUnidadDidactica'
    ? [...locations.values()].some(row => row.unitId === move.parentId)
    : locations.has(`${parentEntity}:${move.parentId}`);
  if (!source || source.parentId !== move.previousParentId || !destinationExists || move.parentId === move.previousParentId) return modules;
  type Node = CompetenciaDetalle | UnidadDidacticaDetalle | CapacidadDetalle | IndicadorDetalle | AprendizajeDetalle | SesionDetalle;
  let moving: Node | undefined;
  const movedActivityIds = new Set<number>();
  const mapChanged = <T>(items: T[], fn: (item: T) => T): T[] => {
    const next = items.map(fn);
    return next.some((item, index) => item !== items[index]) ? next : items;
  };
  const transfer = <T extends Node>(items: T[], parentId: number, entity: ReassignEntity, getId: (item: T) => number = item => item.id): T[] => {
    if (move.entity !== entity) return items;
    if (parentId === move.previousParentId) {
      const found = items.find(item => getId(item) === move.id);
      if (found) { moving = found; return items.filter(item => item !== found); }
    }
    return items;
  };
  // Removal and insertion are separate passes, so the destination can precede the source.
  const visit = (insert: boolean) => (modulo: ModuloDetalle): ModuloDetalle => {
    const list = <T extends Node>(items: T[], parentId: number, entity: ReassignEntity, getId?: (item: T) => number): T[] => {
      if (!insert) return transfer(items, parentId, entity, getId);
      if (!moving || move.entity !== entity || parentId !== move.parentId) return items;
      const siblings = entity === 'competenciaUnidadDidactica'
        ? items.filter(item => 'competenciaId' in item && item.competenciaId === parentId) : items;
      const nextOrder = Math.max(0, ...siblings.map(item =>
        ('orden' in item ? item.orden : undefined) ?? ('numeroSesion' in item ? item.numeroSesion : undefined) ?? item.id,
      )) + 1;
      let added = { ...moving, orden: move.orden === undefined ? nextOrder : move.orden } as T;
      if (entity === 'competenciaUnidadDidactica') {
        const comp = modulo.competencias.find(row => row.id === move.parentId)!;
        added = { ...added, competenciaId: comp.id, competencia: { ...comp, moduloId: modulo.id } };
      } else if (entity === 'capacidadTerminal') added = { ...added, unidadDidacticaId: parentId };
      else if (entity === 'indicadorCapacidad') added = { ...added, capacidadTerminalId: parentId };
      else if (entity === 'aprendizaje' && 'indicadorCapacidadId' in added) added = { ...added, indicadorCapacidadId: parentId };
      else if (entity === 'actividad' && 'aprendizajeId' in added) added = { ...added, aprendizajeId: parentId };
      return [...items, added].sort((a, b) => ('orden' in a ? a.orden ?? a.id : a.id) - ('orden' in b ? b.orden ?? b.id : b.id) || a.id - b.id);
    };
    const competencias = list(modulo.competencias, modulo.id, 'competencia');
    let units = modulo.unidadesDidacticas;
    if (move.entity === 'competencia') {
      if (!insert && modulo.id === move.previousParentId) units = units.filter(unit => unit.competenciaId !== move.id);
      if (insert && modulo.id === move.parentId) {
        const original = modules.find(row => row.id === move.previousParentId)!;
        units = [...units, ...original.unidadesDidacticas.filter(unit => unit.competenciaId === move.id).map(unit => ({ ...unit, competencia: { ...unit.competencia, moduloId: modulo.id } }))];
      }
    } else if (move.entity === 'competenciaUnidadDidactica') {
      // Units are stored once per module, rather than nested under their competency.
      if (!insert) {
        const original = units.find(unit => unit.relacionId === move.id && unit.competenciaId === move.previousParentId);
        if (original) { moving = original; units = units.filter(unit => unit !== original); }
      } else if (modulo.competencias.some(comp => comp.id === move.parentId)) units = list(units, move.parentId, 'competenciaUnidadDidactica');
    }
    units = mapChanged(units, unit => {
      const capacities = mapChanged(list(unit.capacidadesTerminales, unit.id, 'capacidadTerminal'), originalCapacity => {
        const capacity = insert && originalCapacity.competencias && originalCapacity.competencias.some(comp => comp.id !== unit.competencia.id || comp.moduloId !== modulo.id)
          ? { ...originalCapacity, competencias: [unit.competencia] } : originalCapacity;
        const indicators = mapChanged(list(capacity.indicadoresCapacidad, capacity.id, 'indicadorCapacidad'), indicator => {
          const learnings = mapChanged(list(indicator.aprendizajes || [], indicator.id, 'aprendizaje'), learning => {
            const activities = mapChanged(list(learning.actividades, learning.id, 'actividad'), activity =>
              insert && movedActivityIds.has(activity.id) && 'moduloId' in activity && (source.module.id !== modulo.id || move.entity === 'actividad')
                ? { ...activity, moduloId: modulo.id } : activity);
            return activities === learning.actividades ? learning : { ...learning, actividades: activities };
          });
          return learnings === indicator.aprendizajes || (!indicator.aprendizajes && !learnings.length) ? indicator : { ...indicator, aprendizajes: learnings };
        });
        return indicators === capacity.indicadoresCapacidad ? capacity : { ...capacity, indicadoresCapacidad: indicators };
      });
      return capacities === unit.capacidadesTerminales ? unit : { ...unit, capacidadesTerminales: capacities };
    });
    return competencias === modulo.competencias && units === modulo.unidadesDidacticas ? modulo : { ...modulo, competencias, unidadesDidacticas: units };
  };
  const removed = mapChanged(modules, visit(false));
  if (!moving) return modules;
  const collectActivities = (node: Node) => {
    if ('materiales' in node) movedActivityIds.add(node.id);
    for (const key of ['capacidadesTerminales', 'indicadoresCapacidad', 'aprendizajes', 'actividades'] as const) {
      if (key in node) for (const child of (node as unknown as Record<string, Node[]>)[key] || []) collectActivities(child);
    }
  };
  if (move.entity === 'competencia') for (const unit of source.module.unidadesDidacticas.filter(unit => unit.competenciaId === move.id)) collectActivities(unit);
  else collectActivities(moving);
  return mapChanged(removed, visit(true));
}
