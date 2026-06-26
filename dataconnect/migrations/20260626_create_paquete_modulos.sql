-- Create paquete_modulos as the canonical package composition table.
-- Existing grupos.paquete_id + grupos.modulo_id links are copied as a compatibility seed.

CREATE TABLE IF NOT EXISTS public.paquete_modulos (
  id serial PRIMARY KEY,
  orden integer,
  obligatorio boolean,
  paquete_id integer NOT NULL,
  modulo_id integer NOT NULL,
  CONSTRAINT paquete_modulos_paquete_id_fkey
    FOREIGN KEY (paquete_id) REFERENCES public.paquetes(id),
  CONSTRAINT paquete_modulos_modulo_id_fkey
    FOREIGN KEY (modulo_id) REFERENCES public.modulos(id),
  CONSTRAINT paquete_modulos_paquete_id_modulo_id_key
    UNIQUE (paquete_id, modulo_id)
);

CREATE INDEX IF NOT EXISTS paquete_modulos_paquete_id_idx ON public.paquete_modulos (paquete_id);
CREATE INDEX IF NOT EXISTS paquete_modulos_modulo_id_idx ON public.paquete_modulos (modulo_id);

INSERT INTO public.paquete_modulos (paquete_id, modulo_id, orden, obligatorio)
SELECT
  g.paquete_id,
  g.modulo_id,
  COALESCE(g.grupo_ord, row_number() OVER (PARTITION BY g.paquete_id ORDER BY g.grupo_ord NULLS LAST, g.id)) AS orden,
  true AS obligatorio
FROM public.grupos g
WHERE g.paquete_id IS NOT NULL
  AND g.modulo_id IS NOT NULL
ON CONFLICT (paquete_id, modulo_id) DO UPDATE SET
  orden = COALESCE(public.paquete_modulos.orden, EXCLUDED.orden),
  obligatorio = COALESCE(public.paquete_modulos.obligatorio, EXCLUDED.obligatorio);
