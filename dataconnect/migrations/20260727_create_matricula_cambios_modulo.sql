CREATE TABLE IF NOT EXISTS public.matricula_cambios_modulo (
  id serial PRIMARY KEY,
  fecha_cambio timestamp with time zone,
  matricula_id integer NOT NULL REFERENCES public.matriculas(id) ON DELETE CASCADE,
  user_id integer REFERENCES public.users(id) ON DELETE SET NULL,
  semestre_id integer REFERENCES public.semestres(id) ON DELETE SET NULL,
  grupo_modulo_anterior_id integer REFERENCES public.grupo_modulos(id) ON DELETE SET NULL,
  grupo_modulo_nuevo_id integer REFERENCES public.grupo_modulos(id) ON DELETE SET NULL,
  grupo_anterior_id integer REFERENCES public.grupos(id) ON DELETE SET NULL,
  grupo_nuevo_id integer REFERENCES public.grupos(id) ON DELETE SET NULL,
  modulo_anterior_id integer REFERENCES public.modulos(id) ON DELETE SET NULL,
  modulo_nuevo_id integer REFERENCES public.modulos(id) ON DELETE SET NULL,
  registrado_por_id integer REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "matricula_cambios_modulo_matriculaId_idx"
  ON public.matricula_cambios_modulo (matricula_id);

CREATE INDEX IF NOT EXISTS "matricula_cambios_modulo_userId_idx"
  ON public.matricula_cambios_modulo (user_id);

CREATE INDEX IF NOT EXISTS "matricula_cambios_modulo_grupoAnteriorId_idx"
  ON public.matricula_cambios_modulo (grupo_anterior_id);

CREATE INDEX IF NOT EXISTS "matricula_cambios_modulo_grupoModuloAnteriorId_idx"
  ON public.matricula_cambios_modulo (grupo_modulo_anterior_id);

CREATE INDEX IF NOT EXISTS "matricula_cambios_modulo_grupoModuloNuevoId_idx"
  ON public.matricula_cambios_modulo (grupo_modulo_nuevo_id);

CREATE INDEX IF NOT EXISTS "matricula_cambios_modulo_grupoNuevoId_idx"
  ON public.matricula_cambios_modulo (grupo_nuevo_id);

CREATE INDEX IF NOT EXISTS "matricula_cambios_modulo_moduloAnteriorId_idx"
  ON public.matricula_cambios_modulo (modulo_anterior_id);

CREATE INDEX IF NOT EXISTS "matricula_cambios_modulo_moduloNuevoId_idx"
  ON public.matricula_cambios_modulo (modulo_nuevo_id);

CREATE INDEX IF NOT EXISTS "matricula_cambios_modulo_registradoPorId_idx"
  ON public.matricula_cambios_modulo (registrado_por_id);

CREATE INDEX IF NOT EXISTS "matricula_cambios_modulo_semestreId_idx"
  ON public.matricula_cambios_modulo (semestre_id);
