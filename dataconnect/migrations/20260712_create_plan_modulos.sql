ALTER TABLE public.modulos
  ADD COLUMN IF NOT EXISTS comun boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.plan_modulos (
  id serial PRIMARY KEY,
  plan_id integer NOT NULL,
  modulo_id integer NOT NULL,
  orden integer,
  CONSTRAINT plan_modulos_plan_id_fkey
    FOREIGN KEY (plan_id)
    REFERENCES public.planes(id)
    ON DELETE CASCADE,
  CONSTRAINT plan_modulos_modulo_id_fkey
    FOREIGN KEY (modulo_id)
    REFERENCES public.modulos(id)
    ON DELETE CASCADE,
  CONSTRAINT plan_modulos_plan_id_modulo_id_key
    UNIQUE (plan_id, modulo_id)
);

CREATE INDEX IF NOT EXISTS plan_modulos_plan_id_idx
  ON public.plan_modulos (plan_id);

CREATE INDEX IF NOT EXISTS plan_modulos_modulo_id_idx
  ON public.plan_modulos (modulo_id);

INSERT INTO public.plan_modulos (plan_id, modulo_id, orden)
SELECT m.plan_id, m.id, m.orden
FROM public.modulos m
WHERE m.plan_id IS NOT NULL
ON CONFLICT (plan_id, modulo_id) DO UPDATE
SET orden = COALESCE(public.plan_modulos.orden, EXCLUDED.orden);

UPDATE public.modulos m
SET comun = true
FROM (
  SELECT modulo_id
  FROM public.plan_modulos
  GROUP BY modulo_id
  HAVING COUNT(DISTINCT plan_id) > 1
) comunes
WHERE m.id = comunes.modulo_id
  AND m.comun IS DISTINCT FROM true;
