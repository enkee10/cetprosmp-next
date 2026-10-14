-- Fusion of the offer configuration into Grupo. Run before activating the new schema.
-- Grupo values and all GrupoModulo identifiers remain unchanged.
-- The backup is deliberately outside the application schema.
BEGIN;
LOCK TABLE public.grupos, public.grupo_modulos, public.matriculas, public.modulos_estudiantes IN SHARE ROW EXCLUSIVE MODE;

CREATE SCHEMA IF NOT EXISTS codex_backups;
CREATE TABLE IF NOT EXISTS codex_backups.fusion_paquetes_grupos_20261013 (
  tabla text NOT NULL,
  clave text NOT NULL,
  registro jsonb NOT NULL,
  respaldado_en timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tabla, clave)
);

DO $$
DECLARE tabla text;
BEGIN
  FOREACH tabla IN ARRAY ARRAY['paquetes','paquete_modulos','paquete_grupos','matricula_paquetes','grupos','grupo_modulos','matriculas','modulos_estudiantes'] LOOP
    IF to_regclass('public.' || tabla) IS NOT NULL THEN
      EXECUTE format(
        'INSERT INTO codex_backups.fusion_paquetes_grupos_20261013(tabla,clave,registro) SELECT %L, t.id::text, to_jsonb(t) FROM public.%I t ON CONFLICT DO NOTHING',
        tabla, tabla
      );
    END IF;
  END LOOP;
END $$;

ALTER TABLE public.grupo_modulos ADD COLUMN IF NOT EXISTS sufijo text;
ALTER TABLE public.matriculas ADD COLUMN IF NOT EXISTS grupo_id integer;

CREATE TEMP TABLE fusion_grupos_por_matricula ON COMMIT DROP AS
SELECT me.matricula_id,
       min(COALESCE(gm.grupo_id, me.grupo_id)) AS grupo_id,
       count(DISTINCT COALESCE(gm.grupo_id, me.grupo_id)) AS cantidad
FROM public.modulos_estudiantes me
LEFT JOIN public.grupo_modulos gm ON gm.id = me.grupo_modulo_id
GROUP BY me.matricula_id;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.matriculas m
    LEFT JOIN fusion_grupos_por_matricula f ON f.matricula_id = m.id
    LEFT JOIN public.grupos g ON g.id = COALESCE(m.grupo_id, f.grupo_id)
    WHERE COALESCE(f.cantidad,0) <> 1 OR g.id IS NULL
       OR (m.grupo_id IS NOT NULL AND m.grupo_id <> f.grupo_id)
       OR m.semestre_id IS DISTINCT FROM g.semestre_id
  ) THEN
    RAISE EXCEPTION 'Fusion aborted: an enrollment has missing, multiple, conflicting groups or a different semester. No changes were committed.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.modulos_estudiantes me
    JOIN public.grupo_modulos gm ON gm.id = me.grupo_modulo_id
    WHERE (me.grupo_id IS NOT NULL AND me.grupo_id <> gm.grupo_id)
       OR me.modulo_id IS DISTINCT FROM gm.modulo_id
  ) THEN
    RAISE EXCEPTION 'Fusion aborted: a student module has conflicting group/module references.';
  END IF;
END $$;

UPDATE public.matriculas m
SET grupo_id = f.grupo_id
FROM fusion_grupos_por_matricula f
WHERE f.matricula_id = m.id AND m.grupo_id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.matriculas'::regclass AND conname='matriculas_grupo_id_fkey') THEN
    ALTER TABLE public.matriculas ADD CONSTRAINT matriculas_grupo_id_fkey FOREIGN KEY(grupo_id) REFERENCES public.grupos(id);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS matriculas_grupo_id_idx ON public.matriculas(grupo_id);

-- Never copy package names, descriptions or archive flags onto existing groups.
ALTER TABLE public.grupos DROP COLUMN IF EXISTS paquete_id;
ALTER TABLE public.matriculas DROP COLUMN IF EXISTS paquete_id;
DROP TABLE IF EXISTS public.matricula_paquetes;
DROP TABLE IF EXISTS public.paquete_grupos;
DROP TABLE IF EXISTS public.paquete_modulos;
DROP TABLE IF EXISTS public.paquetes;

INSERT INTO codex_backups.fusion_paquetes_grupos_20261013(tabla,clave,registro)
SELECT 'role_permissions',id::text,to_jsonb(r) FROM public.role_permissions r WHERE entity='paquetes'
ON CONFLICT DO NOTHING;
DELETE FROM public.role_permissions WHERE entity='paquetes';

COMMIT;
