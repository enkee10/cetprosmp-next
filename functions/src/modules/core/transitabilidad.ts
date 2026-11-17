/** Shared by the web app and document generators. The catalog title stays unchanged. */
export function nombreConTransitabilidad(nombre: string | null | undefined, transitabilidad?: boolean | null, numero?: number | null) {
  const titulo = String(nombre ?? '').trim();
  if (!transitabilidad || !titulo) return titulo;
  return `${titulo.replace(/\s*\(Trans\.(?:\s+\d+)?\)/gi, '').trim()} (Trans.${numero ? ` ${numero}` : ''})`;
}

type InstanciaTransitabilidad = {
  moduloId: number;
  instancia?: number | null;
  transitabilidad?: boolean | null;
  numeroTransitabilidad?: number | null;
};

/** Keep issued identities stable; allocate only missing numbers when a module repeats. */
export function asignarNumerosTransitabilidad<T extends InstanciaTransitabilidad>(items: T[], anteriores: InstanciaTransitabilidad[] = []): Array<T & { numeroTransitabilidad: number | null }> {
  const result = items.map(item => ({ ...item, numeroTransitabilidad: item.transitabilidad
    ? anteriores.find(old => old.moduloId === item.moduloId && (old.instancia ?? 1) === (item.instancia ?? 1))?.numeroTransitabilidad ?? item.numeroTransitabilidad ?? null
    : null }));
  for (const moduloId of new Set(result.filter(item => item.transitabilidad).map(item => item.moduloId))) {
    const list = result.filter(item => item.moduloId === moduloId && item.transitabilidad)
      .sort((a, b) => (a.instancia ?? 1) - (b.instancia ?? 1));
    if (list.length < 2 && !list.some(item => item.numeroTransitabilidad)) continue;
    let max = Math.max(0, ...anteriores.filter(item => item.moduloId === moduloId).map(item => item.numeroTransitabilidad ?? 0), ...list.map(item => item.numeroTransitabilidad ?? 0));
    for (const item of list) if (!item.numeroTransitabilidad) item.numeroTransitabilidad = ++max;
  }
  return result;
}

export function permiteTransitabilidad(tipoCarrera: string | null | undefined) {
  return String(tipoCarrera ?? '').trim().toLocaleLowerCase('es-PE').startsWith('programa de estudio');
}

/** Run inside the save transaction when an existing group's mode changes. */
export function transitabilidadDocumentGuard(id: number | '$id') {
  const tables = ['registroAcademicoDocumentos', 'certificadoTituloDocumentos', 'certificados'];
  return `query @redact {${tables.map((table, index) =>
    `transitabilidad${index}: ${table}(where:{grupoModuloId:{eq:${id}}},limit:1)
      @check(expr:"this.size() == 0",message:"No se puede cambiar la transitabilidad de un grupo-módulo con documentos emitidos."){id}`,
  ).join('\n')}}`;
}
