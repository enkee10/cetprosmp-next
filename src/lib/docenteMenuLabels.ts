export type DocenteMenuModulo = {
  id: number;
  nombre?: string | null;
  docenteNombre?: string | null;
  moduloId: number;
  grupo?: {
    semestreId?: number | null;
    semestre?: { id?: number | null; titulo?: string | null } | null;
  } | null;
  modulo?: { titulo?: string | null; tituloComercial?: string | null } | null;
};

export function docenteMenuModuloName(modulo: DocenteMenuModulo) {
  let name = String(modulo.nombre ?? '').trim();
  const teacher = String(modulo.docenteNombre ?? '').trim();
  if (teacher && name.toLocaleLowerCase('es-PE').endsWith(`(${teacher})`.toLocaleLowerCase('es-PE'))) {
    name = name.slice(0, -(teacher.length + 2)).trim();
  }
  // Only the known teacher suffix is removed; schedule and custom text stay intact.
  return name.replace(/\s+/g, ' ').trim()
    || modulo.modulo?.titulo || modulo.modulo?.tituloComercial || `Modulo ${modulo.moduloId}`;
}

export function docenteMenuPeriodo(titulo: string | null | undefined) {
  return String(titulo ?? '').trim().slice(-4);
}
