const normalizeSpaces = (value: string | null | undefined) => String(value ?? '').trim().replace(/\s+/g, ' ');

const normalizeComparable = (value: string | null | undefined) =>
  normalizeSpaces(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const SECOND_NAME_EXCEPTIONS = new Set(['evans', 'grijalba']);

const toTitleToken = (value: string) => {
  const normalized = normalizeSpaces(value).toLocaleLowerCase('es-PE');
  if (!normalized) return '';
  return normalized.charAt(0).toLocaleUpperCase('es-PE') + normalized.slice(1);
};

const inferApellidoPaterno = (tokens: string[]) => {
  const exceptionToken = tokens.find((token) => SECOND_NAME_EXCEPTIONS.has(normalizeComparable(token)));
  if (exceptionToken) return exceptionToken;
  return tokens.length >= 3 ? tokens[2] : '';
};

export const getPersonalShortName = (
  value: string | null | undefined,
  apellidoPaternoValue?: string | null,
) => {
  const normalized = normalizeSpaces(value);
  if (!normalized) return '';

  const tokens = normalized.split(' ').filter(Boolean);
  if (tokens.length === 0) return '';

  const apellidoPaterno = normalizeSpaces(apellidoPaternoValue) || inferApellidoPaterno(tokens);
  const usesSecondName = SECOND_NAME_EXCEPTIONS.has(normalizeComparable(apellidoPaterno));

  const nameTokens = tokens.slice(0, Math.min(2, tokens.length));
  const nombre = usesSecondName && nameTokens[1] ? nameTokens[1] : nameTokens[0];

  return [nombre, apellidoPaterno].filter(Boolean).map(toTitleToken).join(' ');
};
