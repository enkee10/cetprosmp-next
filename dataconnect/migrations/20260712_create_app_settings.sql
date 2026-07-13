CREATE TABLE IF NOT EXISTS app_settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(120) NOT NULL UNIQUE,
  section VARCHAR(80) NOT NULL,
  label TEXT NOT NULL,
  bool_value BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at timestamptz DEFAULT now()
);

INSERT INTO app_settings (setting_key, section, label, bool_value)
VALUES (
  'visualizaciones.usarRecorteFotografiaComoAvatarEstudiantes',
  'visualizaciones',
  'Usar la foto imagen recortada como el avatar para Estudiantes',
  FALSE
)
ON CONFLICT (setting_key) DO NOTHING;
