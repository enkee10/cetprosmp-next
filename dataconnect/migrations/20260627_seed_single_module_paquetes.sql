-- Create one-module packages for every current module that does not already
-- have an individual package.
--
-- This is idempotent: running it again will skip modules that already belong
-- to a package with exactly one module.

DO $$
DECLARE
  modulo_record record;
  new_paquete_id integer;
BEGIN
  FOR modulo_record IN
    SELECT
      m.id AS modulo_id,
      COALESCE(NULLIF(m.titulo_comercial, ''), NULLIF(m.titulo, ''), 'Modulo ' || m.id::text) AS titulo
    FROM public.modulos m
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.paquete_modulos pm
      WHERE pm.modulo_id = m.id
        AND NOT EXISTS (
          SELECT 1
          FROM public.paquete_modulos pm2
          WHERE pm2.paquete_id = pm.paquete_id
            AND pm2.modulo_id <> m.id
        )
    )
    ORDER BY m.id
  LOOP
    INSERT INTO public.paquetes (
      titulo,
      descripcion,
      archivado
    )
    VALUES (
      modulo_record.titulo,
      'Paquete individual generado para el modulo ' || modulo_record.titulo,
      false
    )
    RETURNING id INTO new_paquete_id;

    INSERT INTO public.paquete_modulos (
      paquete_id,
      modulo_id,
      orden,
      obligatorio
    )
    VALUES (
      new_paquete_id,
      modulo_record.modulo_id,
      1,
      true
    )
    ON CONFLICT (paquete_id, modulo_id) DO NOTHING;
  END LOOP;
END $$;

SELECT
  'single_module_packages' AS metric,
  count(*) AS total
FROM public.paquetes p
WHERE EXISTS (
  SELECT 1
  FROM public.paquete_modulos pm
  WHERE pm.paquete_id = p.id
)
AND NOT EXISTS (
  SELECT 1
  FROM public.paquete_modulos pm_count
  WHERE pm_count.paquete_id = p.id
  GROUP BY pm_count.paquete_id
  HAVING count(*) <> 1
);
