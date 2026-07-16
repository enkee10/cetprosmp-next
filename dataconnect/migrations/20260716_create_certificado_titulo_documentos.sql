CREATE TABLE IF NOT EXISTS public.certificado_titulo_documentos (
  id serial PRIMARY KEY,
  tipo_documento text NOT NULL,
  semestre_codigo varchar(10),
  pdf_path text,
  pdf_url text,
  excel_path text,
  excel_url text,
  generado_en timestamp with time zone,
  grupo_modulo_id integer NOT NULL,
  modulo_estudiante_id integer NOT NULL,
  CONSTRAINT certificado_titulo_documentos_grupo_modulo_id_fkey
    FOREIGN KEY (grupo_modulo_id)
    REFERENCES public.grupo_modulos(id)
    ON DELETE CASCADE,
  CONSTRAINT certificado_titulo_documentos_modulo_estudiante_id_fkey
    FOREIGN KEY (modulo_estudiante_id)
    REFERENCES public.modulos_estudiantes(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "certificado_titulo_documentos_grupoModuloId_idx"
  ON public.certificado_titulo_documentos (grupo_modulo_id);

CREATE INDEX IF NOT EXISTS "certificado_titulo_documentos_moduloEstudianteId_idx"
  ON public.certificado_titulo_documentos (modulo_estudiante_id);

CREATE UNIQUE INDEX IF NOT EXISTS "certificado_titulo_documentos_tipoDocumemoduloEstudianteId_uidx"
  ON public.certificado_titulo_documentos (tipo_documento, grupo_modulo_id, modulo_estudiante_id);
