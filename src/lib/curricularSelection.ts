import type { ModuloDetalle } from './curricularReassignment';
import type { CurricularPlan } from './curricularFilters';

export function canHideCurricularPlan(plan?: CurricularPlan | null, occupationalEnabled = false) {
  const type = (plan?.carrera?.tipoCarrera?.nombre ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ');
  return occupationalEnabled || !/\bopcion(?:es)? ocupacional(?:es)?\b/.test(type);
}

export interface PlanSelection {
  id: number; planId: number; semestreId: number; revision: number;
  competenciaIds: number[]; unidadIds: number[]; capacidadIds: number[]; indicadorIds: number[];
}
export interface SelectionSemester { id: number; titulo?: string | null; inicio?: string | null; archivado?: boolean | null }
export interface PeriodNode { periodActive?: boolean; periodSelected?: boolean }
export const selectionColumns = { competencia: 'competenciaIds', unidadDidactica: 'unidadIds', capacidadTerminal: 'capacidadIds', indicadorCapacidad: 'indicadorIds' } as const;
export type SelectionEntity = keyof typeof selectionColumns;

export function withPeriodSelection(module: ModuloDetalle, selection?: PlanSelection): ModuloDetalle {
  const includes = (field: keyof typeof selectionColumns, id: number) => !selection || selection[selectionColumns[field]].includes(id);
  const comps = new Map(module.competencias.map(c => [c.id, includes('competencia', c.id)]));
  return { ...module,
    competencias: module.competencias.map(c => ({ ...c, periodSelected: comps.get(c.id), periodActive: comps.get(c.id) })),
    unidadesDidacticas: module.unidadesDidacticas.map(u => {
      const selected = includes('unidadDidactica', u.id), active = selected && comps.get(u.competenciaId) === true;
      return { ...u, periodSelected: selected, periodActive: active,
        capacidadesTerminales: u.capacidadesTerminales.map(c => {
          const selectedCap = includes('capacidadTerminal', c.id), activeCap = active && selectedCap;
          return { ...c, periodSelected: selectedCap, periodActive: activeCap,
            indicadoresCapacidad: c.indicadoresCapacidad.map(i => ({ ...i, periodSelected: includes('indicadorCapacidad', i.id), periodActive: activeCap && includes('indicadorCapacidad', i.id) })),
          };
        }),
      };
    }),
  };
}
