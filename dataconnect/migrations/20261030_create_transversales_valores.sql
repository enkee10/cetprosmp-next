-- Independent catalogs; relationships will be defined separately.
CREATE TABLE IF NOT EXISTS public.transversales (
  id serial PRIMARY KEY,
  nombre text,
  descripcion text
);

CREATE TABLE IF NOT EXISTS public.valores (
  id serial PRIMARY KEY,
  nombre text,
  descripcion text
);
