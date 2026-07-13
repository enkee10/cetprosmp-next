import { dataConnect } from "./dataConnectCore.js";

const CODIGO_INSCRIPCION_PREFIX = "0437863";
const CODIGO_INSCRIPCION_SEQUENCE_WIDTH = 4;
const LIMA_TIME_ZONE = "America/Lima";

type MatriculaCodigoRow = {
  id: number;
  fecha?: string | null;
  codigoInscripcion?: string | null;
};

type CodigoInscripcionSummary = {
  year: number;
  total: number;
  updated: number;
  unchanged: number;
  firstCodigo: string | null;
  lastCodigo: string | null;
};

const LIST_MATRICULAS_CODIGO_INSCRIPCION_QUERY = `
  query ListMatriculasCodigoInscripcionManual {
    matriculas(limit: 50000) {
      id
      fecha
      codigoInscripcion
    }
  }
`;

const UPDATE_MATRICULA_CODIGO_INSCRIPCION_MUTATION = `
  mutation UpdateMatriculaCodigoInscripcion($id: Int!, $data: Matricula_Data! @allow(fields: "codigoInscripcion")) {
    matricula_update(id: $id, data: $data)
  }
`;

function getLimaYear(value: Date | string | null | undefined) {
  const date = value instanceof Date ? value : value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return null;
  return Number(new Intl.DateTimeFormat("en-US", {
    timeZone: LIMA_TIME_ZONE,
    year: "numeric",
  }).format(date));
}

function currentLimaYear() {
  return getLimaYear(new Date()) ?? new Date().getFullYear();
}

function buildCodigoInscripcion(year: number, sequence: number) {
  const yearSuffix = String(year).slice(-2);
  const sequenceText = String(sequence).padStart(CODIGO_INSCRIPCION_SEQUENCE_WIDTH, "0");
  if (sequenceText.length > CODIGO_INSCRIPCION_SEQUENCE_WIDTH) {
    throw new Error("El correlativo anual de matriculas supero los 4 digitos disponibles.");
  }
  return `${CODIGO_INSCRIPCION_PREFIX}${sequenceText}${yearSuffix}`;
}

function parseCodigoInscripcionSequence(value: unknown, year: number) {
  const text = String(value ?? "").trim();
  const yearSuffix = String(year).slice(-2);
  if (!text.startsWith(CODIGO_INSCRIPCION_PREFIX) || !text.endsWith(yearSuffix)) return null;
  const sequenceText = text.slice(CODIGO_INSCRIPCION_PREFIX.length, -yearSuffix.length);
  if (!/^\d+$/.test(sequenceText)) return null;
  const sequence = Number(sequenceText);
  return Number.isFinite(sequence) ? sequence : null;
}

function sortMatriculasByFechaAsc(items: MatriculaCodigoRow[]) {
  return items.slice().sort((a, b) => {
    const aTime = a.fecha ? new Date(a.fecha).getTime() : Number.POSITIVE_INFINITY;
    const bTime = b.fecha ? new Date(b.fecha).getTime() : Number.POSITIVE_INFINITY;
    const safeATime = Number.isFinite(aTime) ? aTime : Number.POSITIVE_INFINITY;
    const safeBTime = Number.isFinite(bTime) ? bTime : Number.POSITIVE_INFINITY;
    return safeATime - safeBTime || a.id - b.id;
  });
}

async function listMatriculasCodigoInscripcion() {
  const response = await dataConnect.executeGraphql<{
    matriculas: MatriculaCodigoRow[];
  }, Record<string, never>>(LIST_MATRICULAS_CODIGO_INSCRIPCION_QUERY);
  return response.data.matriculas ?? [];
}

function filterMatriculasByYear(items: MatriculaCodigoRow[], year: number) {
  return items.filter((item) => getLimaYear(item.fecha) === year);
}

export async function getNextCodigoInscripcionForCurrentYear() {
  const year = currentLimaYear();
  const currentYearMatriculas = filterMatriculasByYear(await listMatriculasCodigoInscripcion(), year);
  const maxExistingSequence = currentYearMatriculas.reduce((max, item) => {
    const sequence = parseCodigoInscripcionSequence(item.codigoInscripcion, year);
    return sequence && sequence > max ? sequence : max;
  }, 0);
  const nextSequence = Math.max(maxExistingSequence, currentYearMatriculas.length) + 1;
  return buildCodigoInscripcion(year, nextSequence);
}

export async function regenerateCodigosInscripcionForCurrentYear(): Promise<CodigoInscripcionSummary> {
  const year = currentLimaYear();
  const currentYearMatriculas = sortMatriculasByFechaAsc(
    filterMatriculasByYear(await listMatriculasCodigoInscripcion(), year),
  );

  let updated = 0;
  let unchanged = 0;
  let firstCodigo: string | null = null;
  let lastCodigo: string | null = null;

  for (const [index, matricula] of currentYearMatriculas.entries()) {
    const codigoInscripcion = buildCodigoInscripcion(year, index + 1);
    if (!firstCodigo) firstCodigo = codigoInscripcion;
    lastCodigo = codigoInscripcion;

    if (matricula.codigoInscripcion === codigoInscripcion) {
      unchanged += 1;
      continue;
    }

    await dataConnect.executeGraphql<
      { matricula_update: unknown },
      { id: number; data: { codigoInscripcion: string } }
    >(
      UPDATE_MATRICULA_CODIGO_INSCRIPCION_MUTATION,
      { variables: { id: matricula.id, data: { codigoInscripcion } } },
    );
    updated += 1;
  }

  return {
    year,
    total: currentYearMatriculas.length,
    updated,
    unchanged,
    firstCodigo,
    lastCodigo,
  };
}
