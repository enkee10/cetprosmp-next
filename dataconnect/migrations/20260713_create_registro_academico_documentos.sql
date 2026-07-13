CREATE TABLE IF NOT EXISTS public.registro_academico_documentos (
  id serial PRIMARY KEY,
  tipo_documento text NOT NULL,
  pdf_path text,
  pdf_url text,
  excel_path text,
  excel_url text,
  generado_en timestamp with time zone,
  grupo_modulo_id integer NOT NULL,
  CONSTRAINT registro_academico_documentos_grupo_modulo_id_fkey
    FOREIGN KEY (grupo_modulo_id)
    REFERENCES public.grupo_modulos(id)
    ON DELETE CASCADE,
  CONSTRAINT registro_academico_documentos_tipo_grupo_key
    UNIQUE (tipo_documento, grupo_modulo_id)
);

CREATE INDEX IF NOT EXISTS registro_academico_documentos_grupo_modulo_id_idx
  ON public.registro_academico_documentos (grupo_modulo_id);
