ALTER TABLE users
  ADD COLUMN IF NOT EXISTS nick_name text;

UPDATE users
SET nick_name = initcap(
  btrim(
    concat_ws(
      ' ',
      nullif(split_part(btrim(nombre), ' ', 1), ''),
      nullif(btrim(apellido_paterno), '')
    )
  )
)
WHERE (nick_name IS NULL OR btrim(nick_name) = '')
  AND (
    nullif(btrim(nombre), '') IS NOT NULL
    OR nullif(btrim(apellido_paterno), '') IS NOT NULL
  );
