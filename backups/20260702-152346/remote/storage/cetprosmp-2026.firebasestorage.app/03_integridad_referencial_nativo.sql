-- Integridad referencial para base nativa Firebase Data Connect
-- Ejecutar DESPUÉS de cargar los datos.

BEGIN;

ALTER TABLE public."familias"
  ADD CONSTRAINT familias_sector_fk
  FOREIGN KEY (sector_id) REFERENCES public."sectores"(id)
  ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public."act_economicas"
  ADD CONSTRAINT act_economicas_familia_fk
  FOREIGN KEY (familia_id) REFERENCES public."familias"(id)
  ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public."act_economicas"
  ADD CONSTRAINT act_economicas_especialidad_fk
  FOREIGN KEY (especialidad_id) REFERENCES public."especialidades"(id)
  ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public."especialidades"
  ADD CONSTRAINT especialidades_act_economica_fk
  FOREIGN KEY (act_economica_id) REFERENCES public."act_economicas"(id)
  ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public."carreras"
  ADD CONSTRAINT carreras_act_economica_fk
  FOREIGN KEY (act_economica_id) REFERENCES public."act_economicas"(id)
  ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public."modulos"
  ADD CONSTRAINT modulos_carrera_fk
  FOREIGN KEY (carrera_id) REFERENCES public."carreras"(id)
  ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public."personales"
  ADD CONSTRAINT personales_user_fk
  FOREIGN KEY (user_id) REFERENCES public."users"(id)
  ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public."personal_especialidades"
  ADD CONSTRAINT personal_especialidades_personal_fk
  FOREIGN KEY (personal_id) REFERENCES public."personales"(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public."personal_especialidades"
  ADD CONSTRAINT personal_especialidades_especialidad_fk
  FOREIGN KEY (especialidad_id) REFERENCES public."especialidades"(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public."semestres"
  ADD CONSTRAINT semestres_director_fk
  FOREIGN KEY (director_id) REFERENCES public."personales"(id)
  ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public."semestres"
  ADD CONSTRAINT semestres_coordinador_1_fk
  FOREIGN KEY (coordinador_1_id) REFERENCES public."personales"(id)
  ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public."semestres"
  ADD CONSTRAINT semestres_coordinador_2_fk
  FOREIGN KEY (coordinador_2_id) REFERENCES public."personales"(id)
  ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public."calendarios"
  ADD CONSTRAINT calendarios_semestre_fk
  FOREIGN KEY (semestre_id) REFERENCES public."semestres"(id)
  ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public."grupos"
  ADD CONSTRAINT grupos_modulo_fk
  FOREIGN KEY (modulo_id) REFERENCES public."modulos"(id)
  ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public."grupos"
  ADD CONSTRAINT grupos_calendario_fk
  FOREIGN KEY (calendario_id) REFERENCES public."calendarios"(id)
  ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public."grupos"
  ADD CONSTRAINT grupos_personal_fk
  FOREIGN KEY (personal_id) REFERENCES public."personales"(id)
  ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public."paquete_grupos"
  ADD CONSTRAINT paquete_grupos_paquete_fk
  FOREIGN KEY (paquete_id) REFERENCES public."paquetes"(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public."paquete_grupos"
  ADD CONSTRAINT paquete_grupos_grupo_fk
  FOREIGN KEY (grupo_id) REFERENCES public."grupos"(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public."matricula_users"
  ADD CONSTRAINT matricula_users_matricula_fk
  FOREIGN KEY (matricula_id) REFERENCES public."matriculas"(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public."matricula_users"
  ADD CONSTRAINT matricula_users_user_fk
  FOREIGN KEY (user_id) REFERENCES public."users"(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public."matricula_grupos"
  ADD CONSTRAINT matricula_grupos_matricula_fk
  FOREIGN KEY (matricula_id) REFERENCES public."matriculas"(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public."matricula_grupos"
  ADD CONSTRAINT matricula_grupos_grupo_fk
  FOREIGN KEY (grupo_id) REFERENCES public."grupos"(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public."matricula_paquetes"
  ADD CONSTRAINT matricula_paquetes_matricula_fk
  FOREIGN KEY (matricula_id) REFERENCES public."matriculas"(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public."matricula_paquetes"
  ADD CONSTRAINT matricula_paquetes_paquete_fk
  FOREIGN KEY (paquete_id) REFERENCES public."paquetes"(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public."modulo_videos"
  ADD CONSTRAINT modulo_videos_modulo_fk
  FOREIGN KEY (modulo_id) REFERENCES public."modulos"(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public."modulo_videos"
  ADD CONSTRAINT modulo_videos_video_fk
  FOREIGN KEY (video_id) REFERENCES public."videos_youtube"(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public."publicacion_videos"
  ADD CONSTRAINT publicacion_videos_publicacion_fk
  FOREIGN KEY (publicacion_id) REFERENCES public."publicaciones"(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public."publicacion_videos"
  ADD CONSTRAINT publicacion_videos_video_fk
  FOREIGN KEY (video_id) REFERENCES public."videos_youtube"(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

COMMIT;
