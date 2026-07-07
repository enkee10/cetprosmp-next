WITH restored_carreras(id, act_economica_id, especialidad_id) AS (
  VALUES
    (1, 1, 1),
    (4, 4, 3),
    (5, 4, 3),
    (6, 5, 4),
    (7, 5, 4),
    (8, 5, 4),
    (9, 5, 4),
    (10, 6, 5),
    (11, 6, 5),
    (12, 7, 6),
    (13, 8, 7),
    (15, 9, 8),
    (16, 8, 7)
)
UPDATE public.carreras c
SET
  act_economica_id = COALESCE(c.act_economica_id, r.act_economica_id),
  especialidad_id = COALESCE(c.especialidad_id, r.especialidad_id)
FROM restored_carreras r
WHERE c.id = r.id;
