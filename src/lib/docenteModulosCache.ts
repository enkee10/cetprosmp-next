export type DocentePersonal = {
  id: number;
  displayName?: string | null;
  user?: { username?: string | null; nombre?: string | null; apellidoPaterno?: string | null;
    apellidoMaterno?: string | null; email?: string | null; correoInstitucional?: string | null } | null;
  monitoreadoPor?: DocentePersonal | null;
};

export type DocenteModulo = {
  id: number; moduloId: number; grupoId: number; nombre?: string | null; docenteNombre?: string | null;
  orden?: number | null;
  grupo: {
    id: number; nombreDisplay?: string | null; turnoNombre?: string | null; semestreId?: number | null;
    semestre?: { id: number; titulo?: string | null; inicio?: string | null; fin?: string | null;
      coordinador1?: DocentePersonal | null } | null;
    personal?: DocentePersonal | null;
  };
  modulo?: { titulo?: string | null; tituloComercial?: string | null } | null;
};

export type DocenteModulosData = {
  modulos: DocenteModulo[];
  semestre?: { id: number; titulo?: string | null } | null;
  semestreTitulo?: string | null;
};
export type DocenteModulosRequest = {
  uid: string; semestreId: number; matriculas?: boolean; notas?: boolean; estructura?: boolean;
};

// Share raw groups as well as in-flight requests across menu and list consumers.
export function createDocenteModulosLoader(fetch: (request: DocenteModulosRequest) => Promise<DocenteModulosData>) {
  const cache = new Map<string, DocenteModulosData>();
  const pending = new Map<string, Promise<DocenteModulosData>>();
  return async (request: DocenteModulosRequest) => {
    const key = `${request.uid}|${request.semestreId}`;
    const cached = cache.get(key);
    if (cached) return cached;
    const existing = pending.get(key);
    if (existing) return existing;
    const promise = Promise.resolve().then(() => fetch(request)).then((data) => {
      // A concurrent semester change must never cache new groups under the old semester.
      if (data.semestre?.id === request.semestreId) {
        if (cache.size >= 8) cache.delete(cache.keys().next().value!);
        cache.set(key, data);
      }
      return data;
    });
    pending.set(key, promise);
    try { return await promise; } finally { pending.delete(key); }
  };
}
