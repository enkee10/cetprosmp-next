CREATE TABLE IF NOT EXISTS "public"."certificados" (
  "id" serial NOT NULL,
  "carrera_id" integer NULL,
  "docente_id" integer NULL,
  "estudiante_id" integer NULL,
  "grupo_modulo_id" integer NOT NULL,
  "matricula_id" integer NOT NULL,
  "modulo_estudiante_id" integer NOT NULL,
  "semestre_id" integer NOT NULL,
  "actualizado_en" timestamptz NULL,
  "anio" integer NULL,
  "codigo_institucional" character varying(20) NOT NULL,
  "codigo_lag" integer NULL,
  "correlativo" integer NOT NULL,
  "creado_en" timestamptz NULL,
  "generado_en" timestamptz NULL,
  "periodo_numero" integer NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "certificados_carrera_id_fkey" FOREIGN KEY ("carrera_id") REFERENCES "public"."carreras" ("id") ON DELETE SET NULL,
  CONSTRAINT "certificados_docente_id_fkey" FOREIGN KEY ("docente_id") REFERENCES "public"."personales" ("id") ON DELETE SET NULL,
  CONSTRAINT "certificados_estudiante_id_fkey" FOREIGN KEY ("estudiante_id") REFERENCES "public"."users" ("id") ON DELETE SET NULL,
  CONSTRAINT "certificados_grupo_modulo_id_fkey" FOREIGN KEY ("grupo_modulo_id") REFERENCES "public"."grupo_modulos" ("id") ON DELETE CASCADE,
  CONSTRAINT "certificados_matricula_id_fkey" FOREIGN KEY ("matricula_id") REFERENCES "public"."matriculas" ("id") ON DELETE CASCADE,
  CONSTRAINT "certificados_modulo_estudiante_id_fkey" FOREIGN KEY ("modulo_estudiante_id") REFERENCES "public"."modulos_estudiantes" ("id") ON DELETE CASCADE,
  CONSTRAINT "certificados_semestre_id_fkey" FOREIGN KEY ("semestre_id") REFERENCES "public"."semestres" ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "certificados_semestreId_idx"
  ON "public"."certificados" ("semestre_id");

CREATE INDEX IF NOT EXISTS "certificados_estudianteId_idx"
  ON "public"."certificados" ("estudiante_id");

CREATE INDEX IF NOT EXISTS "certificados_matriculaId_idx"
  ON "public"."certificados" ("matricula_id");

CREATE INDEX IF NOT EXISTS "certificados_carreraId_idx"
  ON "public"."certificados" ("carrera_id");

CREATE INDEX IF NOT EXISTS "certificados_docenteId_idx"
  ON "public"."certificados" ("docente_id");

CREATE INDEX IF NOT EXISTS "certificados_grupoModuloId_idx"
  ON "public"."certificados" ("grupo_modulo_id");

CREATE INDEX IF NOT EXISTS "certificados_moduloEstudianteId_idx"
  ON "public"."certificados" ("modulo_estudiante_id");

CREATE UNIQUE INDEX IF NOT EXISTS "certificados_grupoModuloId_moduloEstudianteId_uidx"
  ON "public"."certificados" ("grupo_modulo_id", "modulo_estudiante_id");

CREATE UNIQUE INDEX IF NOT EXISTS "certificados_codigoInstitucional_uidx"
  ON "public"."certificados" ("codigo_institucional");
