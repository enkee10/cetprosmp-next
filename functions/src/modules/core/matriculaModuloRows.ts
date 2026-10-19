interface GrupoModuloReference {
  id?: number | null;
  nombre?: string | null;
  grupoId?: number | null;
  moduloId?: number | null;
  grupo?: { id?: number | null; nombreDisplay?: string | null } | null;
  modulo?: { id?: number | null; titulo?: string | null; tituloComercial?: string | null } | null;
}

interface ModuloLink {
  id?: number | null;
  grupoId?: number | null;
  moduloId?: number | null;
  grupoModuloId?: number | null;
  grupoModulo?: GrupoModuloReference | null;
  grupo?: GrupoModuloReference['grupo'];
  modulo?: GrupoModuloReference['modulo'];
}

interface MatriculaWithModulos {
  id: number;
  grupoId?: number | null;
  modulosEstudiantes?: readonly ModuloLink[] | null;
}

export type MatriculaModuloRow<T> = T & {
  rowId: string;
  grupoModuloId: number | null;
  moduloEstudianteId: number | null;
  grupoModuloNombre: string;
};

const getPair = (grupoId?: number | null, moduloId?: number | null) =>
  grupoId && moduloId ? `${grupoId}:${moduloId}` : '';

function getNombre(grupoModulo: GrupoModuloReference, fallback?: GrupoModuloReference | null) {
  const nombre = grupoModulo.nombre?.trim() || fallback?.nombre?.trim();
  if (nombre) return nombre;
  const modulo = grupoModulo.modulo?.titulo || grupoModulo.modulo?.tituloComercial
    || fallback?.modulo?.titulo || fallback?.modulo?.tituloComercial;
  const grupo = grupoModulo.grupo?.nombreDisplay || fallback?.grupo?.nombreDisplay;
  return [modulo, grupo].filter(Boolean).join(' · ')
    || (grupoModulo.id ? `Grupo-módulo ${grupoModulo.id}` : 'Sin grupo-módulo');
}

// Keep the original matrícula ID and links: every row edits the same enrollment.
// null includes all modules; an empty scope includes none (e.g. a teacher with no groups).
export function buildMatriculaModuloRows<T extends MatriculaWithModulos>(
  matriculas: readonly T[],
  grupoModulos: readonly GrupoModuloReference[],
  visibleGrupoModuloIds: readonly string[] | null = null,
): MatriculaModuloRow<T>[] {
  const byId = new Map(grupoModulos.map((item) => [item.id, item]));
  const byPair = new Map<string, GrupoModuloReference[]>();
  for (const item of grupoModulos) {
    const pair = getPair(item.grupoId ?? item.grupo?.id, item.moduloId ?? item.modulo?.id);
    if (!pair) continue;
    const items = byPair.get(pair) ?? [];
    items.push(item);
    byPair.set(pair, items);
  }
  const visibleIds = visibleGrupoModuloIds === null ? null : new Set(visibleGrupoModuloIds);
  const rows: MatriculaModuloRow<T>[] = [];
  for (const matricula of matriculas) {
    const seen = new Set<string>();
    for (const link of matricula.modulosEstudiantes ?? []) {
      const linked = link.grupoModulo ?? { grupo: link.grupo, modulo: link.modulo };
      const id = link.grupoModuloId || linked?.id;
      const grupoId = link.grupoId ?? linked?.grupoId ?? linked?.grupo?.id ?? matricula.grupoId;
      const moduloId = link.moduloId ?? linked?.moduloId ?? linked?.modulo?.id;
      const pair = getPair(grupoId, moduloId);
      // Only legacy links without an instance ID may match by group and module.
      const candidates = id
        ? [byId.get(id) ?? { ...linked, id }]
        : byPair.get(pair) ?? [linked ?? {}];
      for (const candidate of candidates) {
        const grupoModuloId = candidate.id || null;
        if (visibleIds && !visibleIds.has(String(grupoModuloId))) continue;
        const key = grupoModuloId ? `grupo-modulo:${grupoModuloId}`
          : `grupo-modulo-legacy:${grupoId ?? 0}:${moduloId ?? link.id ?? 0}`;
        if (seen.has(key)) continue;
        seen.add(key);
        rows.push({
          ...matricula,
          rowId: `${matricula.id}:${key}`,
          grupoModuloId,
          moduloEstudianteId: link.id ?? null,
          grupoModuloNombre: getNombre(candidate, linked),
        });
      }
    }
    if (!visibleIds && !matricula.modulosEstudiantes?.length) {
      rows.push({ ...matricula, rowId: `${matricula.id}:sin-modulo`, grupoModuloId: null, moduloEstudianteId: null, grupoModuloNombre: 'Sin grupo-módulo' });
    }
  }
  return rows;
}
