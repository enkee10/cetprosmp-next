ALTER TABLE public.matriculas
  ADD COLUMN IF NOT EXISTS codigo_inscripcion varchar(13);
