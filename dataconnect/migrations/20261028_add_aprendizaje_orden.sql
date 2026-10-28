-- Local schema support for ordering curricular learning items; existing IDs/texts stay intact.
ALTER TABLE aprendizajes ADD COLUMN IF NOT EXISTS orden integer;
