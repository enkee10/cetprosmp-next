export interface CurricularUnitRelation {
  unidadDidacticaId: number;
  orden?: number | null;
  competenciaId?: number;
  competenciaContinuacionId?: number | null;
  competencia?: { id: number; orden?: number | null; tipo?: string } | null;
}

/** Match Programación Curricular: competency first, then its units. */
export function curricularUnitIdsInOrder(response: {
  competenciaUnidadesDidacticas?: CurricularUnitRelation[];
  grupoModuloUnidadesDidacticas?: CurricularUnitRelation[];
}) {
  const moduleUnits = response.competenciaUnidadesDidacticas ?? [];
  const source = moduleUnits.length ? moduleUnits : response.grupoModuloUnidadesDidacticas ?? [];
  const units = new Map(source.map(row => [row.unidadDidacticaId, row]));
  return [...units.values()].sort((a, b) => {
    if (moduleUnits.length) {
      const aId = a.competencia?.id ?? a.competenciaId ?? 0;
      const bId = b.competencia?.id ?? b.competenciaId ?? 0;
      const byCompetency = Number(a.competencia?.tipo === "EMPLEABILIDAD") - Number(b.competencia?.tipo === "EMPLEABILIDAD")
        || Number(Boolean(b.competenciaContinuacionId)) - Number(Boolean(a.competenciaContinuacionId))
        || (a.competencia?.orden ?? aId) - (b.competencia?.orden ?? bId) || aId - bId;
      if (byCompetency) return byCompetency;
    }
    return (a.orden ?? a.unidadDidacticaId) - (b.orden ?? b.unidadDidacticaId) || a.unidadDidacticaId - b.unidadDidacticaId;
  }).map(row => row.unidadDidacticaId);
}
