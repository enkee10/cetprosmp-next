-- Move the module assignment out of grupos into grupo_modulos.
-- grupos now represents the package-level cohort; grupo_modulos carries module-level operation.

CREATE TABLE IF NOT EXISTS public.grupo_modulos (
  id serial PRIMARY KEY,
  orden integer,
  obligatorio boolean,
  grupo_id integer NOT NULL,
  modulo_id integer NOT NULL,
  CONSTRAINT grupo_modulos_grupo_id_fkey
    FOREIGN KEY (grupo_id) REFERENCES public.grupos(id),
  CONSTRAINT grupo_modulos_modulo_id_fkey
    FOREIGN KEY (modulo_id) REFERENCES public.modulos(id),
  CONSTRAINT grupo_modulos_grupo_id_modulo_id_key
    UNIQUE (grupo_id, modulo_id)
);

CREATE INDEX IF NOT EXISTS grupo_modulos_grupo_id_idx ON public.grupo_modulos (grupo_id);
CREATE INDEX IF NOT EXISTS grupo_modulos_modulo_id_idx ON public.grupo_modulos (modulo_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'grupos'
      AND column_name = 'modulo_id'
  ) THEN
    INSERT INTO public.grupo_modulos (grupo_id, modulo_id, orden, obligatorio)
    SELECT
      g.id,
      g.modulo_id,
      COALESCE(g.grupo_ord, 1),
      true
    FROM public.grupos g
    WHERE g.modulo_id IS NOT NULL
    ON CONFLICT (grupo_id, modulo_id) DO UPDATE SET
      orden = COALESCE(public.grupo_modulos.orden, EXCLUDED.orden),
      obligatorio = COALESCE(public.grupo_modulos.obligatorio, EXCLUDED.obligatorio);

    ALTER TABLE public.grupos DROP COLUMN modulo_id;
  END IF;
END $$;

SELECT 'grupo_modulos' AS table_name, count(*) AS total
FROM public.grupo_modulos;
