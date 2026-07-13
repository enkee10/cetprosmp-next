type NombrePersonal = {
  displayName?: string | null;
  user?: {
    username?: string | null;
    apellidoPaterno?: string | null;
  } | null;
} | null;

export type GrupoModuloNombreContext = {
  semestre?: { titulo?: string | null } | null;
  turnoNombre?: string | null;
  turno?: { nombre?: string | null } | null;
  horario?: { nombre?: string | null } | null;
  personal?: NombrePersonal;
} | null;

export type GrupoModuloNombreModulo = {
  id?: number | null;
  titulo?: string | null;
  tituloComercial?: string | null;
} | null | undefined;

const SECOND_NAME_EXCEPTIONS = new Set(["evans", "grijalba"]);

function normalizeSpaces(value: string | null | undefined) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function normalizeComparable(value: string | null | undefined) {
  return normalizeSpaces(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function toTitleToken(value: string) {
  const normalized = normalizeSpaces(value).toLocaleLowerCase("es-PE");
  if (!normalized) return "";
  return normalized.charAt(0).toLocaleUpperCase("es-PE") + normalized.slice(1);
}

function inferApellidoPaterno(tokens: string[]) {
  const exceptionToken = tokens.find((token) => SECOND_NAME_EXCEPTIONS.has(normalizeComparable(token)));
  if (exceptionToken) return exceptionToken;
  return tokens.length >= 3 ? tokens[2] : "";
}

function getPersonalShortName(value: string | null | undefined, apellidoPaternoValue?: string | null) {
  const normalized = normalizeSpaces(value);
  if (!normalized) return "";

  const tokens = normalized.split(" ").filter(Boolean);
  if (tokens.length === 0) return "";

  const apellidoPaterno = normalizeSpaces(apellidoPaternoValue) || inferApellidoPaterno(tokens);
  const usesSecondName = SECOND_NAME_EXCEPTIONS.has(normalizeComparable(apellidoPaterno));
  const nameTokens = tokens.slice(0, Math.min(2, tokens.length));
  const nombre = usesSecondName && nameTokens[1] ? nameTokens[1] : nameTokens[0];

  return [nombre, apellidoPaterno].filter(Boolean).map(toTitleToken).join(" ");
}

export function getSemestreCodigoForGrupoModulo(titulo: string | null | undefined) {
  const semestre = normalizeSpaces(titulo);
  return semestre.length <= 4 ? semestre : semestre.slice(-4);
}

export function getModuloNombreForGrupoModulo(modulo: GrupoModuloNombreModulo) {
  return normalizeSpaces(modulo?.titulo || modulo?.tituloComercial || (modulo?.id ? `Modulo ${modulo.id}` : ""));
}

export function getDocenteNombreForGrupoModulo(personal: NombrePersonal) {
  return getPersonalShortName(personal?.user?.username || personal?.displayName || "", personal?.user?.apellidoPaterno);
}

export function buildGrupoModuloNombreRelacional(
  grupo: GrupoModuloNombreContext,
  modulo: GrupoModuloNombreModulo,
) {
  const semestreCodigo = getSemestreCodigoForGrupoModulo(grupo?.semestre?.titulo);
  const moduloNombre = getModuloNombreForGrupoModulo(modulo);
  const turnoNombre = normalizeSpaces(grupo?.turno?.nombre || grupo?.turnoNombre);
  const horarioNombre = normalizeSpaces(grupo?.horario?.nombre);
  const docenteNombre = getDocenteNombreForGrupoModulo(grupo?.personal ?? null);

  return [
    semestreCodigo,
    moduloNombre,
    turnoNombre ? `[${turnoNombre}]` : "",
    horarioNombre,
    docenteNombre ? `(${docenteNombre})` : "",
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}
