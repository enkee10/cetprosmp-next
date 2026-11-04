import type { CurriculumGraph, CurriculumRow } from "./curriculumGraph.js";

type DescendantCodeMaps = {
  competencias: Map<number, string>;
  unidades: Map<number, string>;
  capacidades: Map<number, string>;
  indicadores: Map<number, string>;
};

const numericField = (row: CurriculumRow, field: string) => {
  const rawValue = row[field];
  if (rawValue == null) return null;
  const value = Number(rawValue);
  return Number.isFinite(value) ? value : null;
};

const academicOrder = (row: CurriculumRow) => numericField(row, "orden") ?? row.id;

const compareAcademicRows = (a: CurriculumRow, b: CurriculumRow) =>
  academicOrder(a) - academicOrder(b) || a.id - b.id;

/**
 * Builds the same UD/C/I sequence used by Programacion Curricular from the
 * complete plan graph. Hidden descendants therefore keep their position and
 * a continued competency keeps its capacity sequence in later modules.
 */
export function buildCurriculumDescendantCodes(graph: CurriculumGraph): DescendantCodeMaps {
  const competencias = new Map<number, string>();
  const unidades = new Map<number, string>();
  const capacidades = new Map<number, string>();
  const indicadores = new Map<number, string>();
  const capacityCounts = new Map<number, number>();

  const planModuleById = new Map(graph.planModulos.map((item) => [item.id, item]));
  const moduleOrder = new Map<number, number>();
  for (const item of [...graph.planModulos].sort(compareAcademicRows)) {
    const moduleId = numericField(item, "moduloId");
    if (moduleId != null && !moduleOrder.has(moduleId)) moduleOrder.set(moduleId, academicOrder(item));
  }

  const orderedModuleIds = [...new Set([
    ...graph.planModulos.map((item) => numericField(item, "moduloId")),
    ...graph.modulos.map((item) => item.id),
  ].filter((id): id is number => id != null))].sort((a, b) =>
    (moduleOrder.get(a) ?? graph.modulos.find((item) => item.id === a)?.id ?? a)
      - (moduleOrder.get(b) ?? graph.modulos.find((item) => item.id === b)?.id ?? b)
      || a - b,
  );

  const competenciaById = new Map(graph.competencias.map((item) => [item.id, item]));
  const continuacionById = new Map(graph.continuaciones.map((item) => [item.id, item]));
  const capacidadesByUnidad = new Map<number, CurriculumRow[]>();
  const indicadoresByCapacidad = new Map<number, CurriculumRow[]>();

  for (const capacidad of graph.capacidades) {
    const unidadId = numericField(capacidad, "unidadDidacticaId");
    if (unidadId == null) continue;
    const items = capacidadesByUnidad.get(unidadId) ?? [];
    items.push(capacidad);
    capacidadesByUnidad.set(unidadId, items);
  }
  for (const indicador of graph.indicadores) {
    const capacidadId = numericField(indicador, "capacidadTerminalId");
    if (capacidadId == null) continue;
    const items = indicadoresByCapacidad.get(capacidadId) ?? [];
    items.push(indicador);
    indicadoresByCapacidad.set(capacidadId, items);
  }

  const effectiveModuleId = (relation: CurriculumRow) => {
    const continuationId = numericField(relation, "competenciaContinuacionId");
    if (continuationId != null) {
      const continuation = continuacionById.get(continuationId);
      const planModule = continuation && planModuleById.get(numericField(continuation, "planModuloId") ?? -1);
      return planModule ? numericField(planModule, "moduloId") : null;
    }
    const competencia = competenciaById.get(numericField(relation, "competenciaId") ?? -1);
    return competencia ? numericField(competencia, "moduloId") : null;
  };

  const relationsByModule = new Map<number, CurriculumRow[]>();
  for (const relation of graph.relaciones) {
    const moduleId = effectiveModuleId(relation);
    if (moduleId == null) continue;
    const items = relationsByModule.get(moduleId) ?? [];
    items.push(relation);
    relationsByModule.set(moduleId, items);
  }

  const competencyCounts = new Map<string, number>();
  for (const moduleId of orderedModuleIds) {
    const moduleCompetencies = graph.competencias
      .filter((item) => numericField(item, "moduloId") === moduleId)
      .sort(compareAcademicRows);
    for (const competencia of moduleCompetencies) {
      if (competencias.has(competencia.id)) continue;
      const type = competencia.tipo === "EMPLEABILIDAD" ? "EMPLEABILIDAD" : "TECNICA";
      const position = (competencyCounts.get(type) ?? 0) + 1;
      competencyCounts.set(type, position);
      competencias.set(competencia.id, `${type === "TECNICA" ? "UC" : "CE"}${position}`);
    }
  }

  let unitCount = 0;
  for (const moduleId of orderedModuleIds) {
    const relations = [...(relationsByModule.get(moduleId) ?? [])].sort((a, b) => {
      const competenciaA = competenciaById.get(numericField(a, "competenciaId") ?? -1);
      const competenciaB = competenciaById.get(numericField(b, "competenciaId") ?? -1);
      const isEmploymentA = competenciaA?.tipo === "EMPLEABILIDAD" ? 1 : 0;
      const isEmploymentB = competenciaB?.tipo === "EMPLEABILIDAD" ? 1 : 0;
      const isContinuationA = numericField(a, "competenciaContinuacionId") != null ? 1 : 0;
      const isContinuationB = numericField(b, "competenciaContinuacionId") != null ? 1 : 0;
      return isEmploymentA - isEmploymentB
        || isContinuationB - isContinuationA
        || (competenciaA ? academicOrder(competenciaA) : 0) - (competenciaB ? academicOrder(competenciaB) : 0)
        || compareAcademicRows(a, b);
    });

    for (const relation of relations) {
      const unidadId = numericField(relation, "unidadDidacticaId");
      const competenciaId = numericField(relation, "competenciaId");
      if (unidadId == null || competenciaId == null || unidades.has(unidadId)) continue;
      unidades.set(unidadId, `UD${++unitCount}`);

      let capacityCount = capacityCounts.get(competenciaId) ?? 0;
      for (const capacidad of [...(capacidadesByUnidad.get(unidadId) ?? [])].sort(compareAcademicRows)) {
        capacidades.set(capacidad.id, `C${++capacityCount}`);
        [...(indicadoresByCapacidad.get(capacidad.id) ?? [])]
          .sort(compareAcademicRows)
          .forEach((indicador, index) => indicadores.set(indicador.id, `I${index + 1}`));
      }
      capacityCounts.set(competenciaId, capacityCount);
    }
  }

  return { competencias, unidades, capacidades, indicadores };
}
