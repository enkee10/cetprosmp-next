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
  if (teacher && name.endsWith(`(${teacher})`)) {
    name = name.slice(0, -(teacher.length + 2)).trim();
  } else if (name.includes(']') && name.lastIndexOf('(') > name.lastIndexOf(']')) {
    // Older generated names can retain the teacher's former display name.
    name = name.replace(/\s+\([^()]*\)\s*$/, '').trim();
  }
  // Preserve the schedule and custom module suffixes, removing only the shift.
  return name.replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim()
    || modulo.modulo?.titulo || modulo.modulo?.tituloComercial || `Modulo ${modulo.moduloId}`;
}

export function docenteMenuPeriodo(titulo: string | null | undefined) {
  return String(titulo ?? '').trim().slice(-4);
}
