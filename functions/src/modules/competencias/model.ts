export type TipoCompetencia = "TECNICA" | "EMPLEABILIDAD";

export function normalizeAcademicText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function isProgramaEstudio(tipoCarrera: string) {
  return normalizeAcademicText(tipoCarrera).includes("programa de estudio");
}

export function expectedCompetenciaType(programa: boolean, horasModulo: number | null | undefined, unidadIds: number[], unidadId: number): TipoCompetencia {
  if (!programa) return "TECNICA";
  if (typeof horasModulo !== "number" || !Number.isFinite(horasModulo) || horasModulo <= 0) {
    throw new Error("El modulo necesita una duracion en horas valida para clasificar sus unidades.");
  }
  const cantidad = horasModulo > 400 ? 2 : 1;
  return unidadIds.slice(-cantidad).includes(unidadId) ? "EMPLEABILIDAD" : "TECNICA";
}

export function orderedUnidadRelations<T extends { id: number; unidadDidacticaId: number; orden?: number | null }>(relations: T[]) {
  return relations.slice().sort((a,b) => (a.orden ?? a.id) - (b.orden ?? b.id) || a.unidadDidacticaId - b.unidadDidacticaId || a.id - b.id);
}

export function projectUnidadRelations<T extends { competencia: { moduloId: number } }>(relations: T[]) {
  return relations.map(relation => ({ ...relation, moduloId: relation.competencia.moduloId }));
}

export function employabilityCodeForUnidad(nombre: string) {
  const normalized = normalizeAcademicText(nombre);
  if (normalized.includes("etic")) return "4";
  if (normalized.includes("comunic")) return "1";
  if (normalized.includes("informatic") || /\btic(?:s)?\b/.test(normalized)) return "2";
  if (normalized.includes("negocio") || normalized.includes("emprend")) return "3";
  return null;
}

export function orderedCapacidadIds(
  relations: Array<{ unidadDidacticaId: number; orden?: number | null; id: number }>,
  capacidades: Array<{ id: number; unidadDidacticaId?: number | null; orden?: number | null }>,
) {
  const compare = (a: { orden?: number | null; id: number }, b: { orden?: number | null; id: number }) =>
    (a.orden ?? a.id) - (b.orden ?? b.id) || a.id - b.id;
  return [...new Set(relations.slice().sort((a,b) =>
    (a.orden ?? a.id) - (b.orden ?? b.id) || a.unidadDidacticaId - b.unidadDidacticaId || a.id - b.id).flatMap(r => capacidades
    .filter(c => c.unidadDidacticaId === r.unidadDidacticaId).sort(compare).map(c => c.id)))];
}
