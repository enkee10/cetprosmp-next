ALTER TABLE public.grupo_modulos
  ADD COLUMN IF NOT EXISTS nombre text;

UPDATE public.grupo_modulos gm
SET nombre = CASE
  WHEN g.nombre_display IS NULL OR btrim(g.nombre_display) = '' THEN
    NULLIF(btrim(COALESCE(NULLIF(m.titulo, ''), m.titulo_comercial, '')), '')
  WHEN p.titulo IS NOT NULL AND btrim(p.titulo) <> '' AND strpos(g.nombre_display, p.titulo) > 0 THEN
    replace(g.nombre_display, p.titulo, COALESCE(NULLIF(m.titulo, ''), m.titulo_comercial, p.titulo))
  WHEN g.nombre_display ~ '^[^ ]+ .+ \[[^]]+\].*$' THEN
    regexp_replace(
      g.nombre_display,
      '^([^ ]+ )(.+?)( \[[^]]+\].*)$',
      '\1' || COALESCE(NULLIF(m.titulo, ''), m.titulo_comercial, '') || '\3'
    )
  ELSE
    btrim(concat_ws(' - ', g.nombre_display, COALESCE(NULLIF(m.titulo, ''), m.titulo_comercial)))
END
FROM public.grupos g
LEFT JOIN public.paquetes p ON p.id = g.paquete_id
LEFT JOIN public.modulos m ON m.id = gm.modulo_id
WHERE gm.grupo_id = g.id
  AND (
    gm.nombre IS NULL
    OR btrim(gm.nombre) = ''
  );

CREATE INDEX IF NOT EXISTS grupo_modulos_nombre_idx ON public.grupo_modulos (nombre);
