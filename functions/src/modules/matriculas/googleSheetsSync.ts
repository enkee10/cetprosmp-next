import { getFirestore } from "firebase-admin/firestore";
import { google, sheets_v4 } from "googleapis";
import { https, runWith } from "firebase-functions/v1";
import { dataConnect } from "../core/dataConnectCore.js";
import { getRequesterRoleId, isSuperUserContext, requirePermission, requireSuperUser } from "../core/permissions.js";
import { getDatosGeneralesGlobales } from "../datos-generales/service.js";

const MATRICULAS_SHEETS_FOLDER_ID = "1RttPJVARZA-KXYtiNG9DrWjTCcHazi9a";
const MATRICULAS_SHEETS_FILE_NAME = "Matriculas 2026-2 (Respuestas)";
const MATRICULAS_GENERAL_LIST_SHEETS_FILE_NAME = "Lista-matricula-26-2";
const MATRICULAS_SHEETS_TAB_NAME = "Respuestas";
const DOCENTE_MATRICULADOS_SHEETS_FOLDER_ID = "0ACqCsSJSoVmTUk9PVA";
const DOCENTE_MATRICULADOS_SHEETS_TAB_NAME = "Matriculados";
const GOOGLE_SHEETS_MIME_TYPE = "application/vnd.google-apps.spreadsheet";
const CURRENT_SEMESTRE_ID_KEY = "general.semestreActualId";
const FORMULARIO_MATRICULA_SEMESTRE_ID_KEY = "formularioMatricula.semestreId";
const MATRICULA_AVATAR_EXTRACTION_COLLECTION = "matriculaAvatarExtractionJobs";
const MATRICULAS_SHEETS_HEADER_PROTECTION_DESCRIPTION = "Encabezados de respuestas de matricula";
const MATRICULAS_SHEETS_LINK_COLUMN_WIDTH = 100;
const MATRICULAS_SHEETS_MIN_ROW_COUNT = 50;
const LIMA_TIME_ZONE = "America/Lima";

const MATRICULAS_SHEETS_HEADERS = [
  "fecha de matricula",
  "docente",
  "especialidad",
  "periodo",
  "codigo modular",
  "tipo documento",
  "numero documento",
  "apellido paterno",
  "apellido materno",
  "nombres",
  "Nombres y apellidos",
  "fecha nacimiento",
  "edad",
  "sexo (F/M)",
  "Rol",
  "correo institucional",
  "celular",
  "programa de estudio",
  "plan",
  "grupo",
  "grado de Instruccion",
  "estado civil",
  "direccion",
  "distrito",
  "responsable (llenado del formulario)",
  "avatar mediano",
  "dni-procesado-frente",
  "dni-procesado-reverso",
] as const;

type MatriculasSheetHeader = typeof MATRICULAS_SHEETS_HEADERS[number];

const MATRICULAS_SHEETS_LINK_HEADERS = new Set<MatriculasSheetHeader>([
  "avatar mediano",
  "dni-procesado-frente",
  "dni-procesado-reverso",
]);

const DOCENTE_MATRICULADOS_SHEETS_HEADERS = [
  "fecha matricula",
  "numero matricula - recibo",
  "apellido paterno",
  "apellido materno",
  "nombres",
  "Apellidos y Nombres",
  "fecha de nacimiento",
  "edad anos",
  "estado civil",
  "numero celular",
  "grado de instruccion",
  "domicilio",
  "distrito domicilio",
  "numero fijo",
  "correo electronico",
  "avatar (mediano)",
  "dni-procesado-frente",
  "dni-procesado-reverso",
] as const;

type SheetsFileInfo = {
  spreadsheetId: string;
  spreadsheetUrl: string;
};

type SheetsUserRow = {
  id?: number | null;
  dni?: string | null;
  tipoDocumento?: string | null;
  nombre?: string | null;
  apellidoPaterno?: string | null;
  apellidoMaterno?: string | null;
  sexo?: string | null;
  estadoCivil?: string | null;
  instruccion?: string | null;
  fechaNacimiento?: string | null;
  direccion?: string | null;
  distrito?: string | null;
  telefono?: string | null;
  celular?: string | null;
  email?: string | null;
  correoInstitucional?: string | null;
  avatar?: string | null;
  dniImagenFrenteProcesadaUrl?: string | null;
  dniImagenReversoProcesadaUrl?: string | null;
  rol?: {
    titulo?: string | null;
  } | null;
};

type SheetsPersonalRow = {
  displayName?: string | null;
  user?: {
    username?: string | null;
    nombre?: string | null;
    apellidoPaterno?: string | null;
    apellidoMaterno?: string | null;
    correoInstitucional?: string | null;
    email?: string | null;
  } | null;
};

type SheetsAcademicModuloRow = {
  id?: number | null;
  titulo?: string | null;
  tituloComercial?: string | null;
  orden?: number | null;
  plan?: {
    id?: number | null;
    planEstudio?: string | null;
    tituloComercial?: string | null;
    carrera?: {
      id?: number | null;
      nombre?: string | null;
      titulo?: string | null;
      tituloComercial?: string | null;
      especialidad?: {
        id?: number | null;
        titulo?: string | null;
        tituloComercial?: string | null;
        orden?: number | null;
      } | null;
    } | null;
  } | null;
};

type SheetsGrupoRow = {
  id?: number | null;
  nombreDisplay?: string | null;
  personal?: SheetsPersonalRow | null;
};

type SheetsModuloEstudianteRow = {
  id?: number | null;
  grupoId?: number | null;
  grupoModuloId?: number | null;
  moduloId?: number | null;
  grupo?: SheetsGrupoRow | null;
  modulo?: SheetsAcademicModuloRow | null;
  grupoModulo?: {
    id?: number | null;
    nombre?: string | null;
    orden?: number | null;
    grupo?: SheetsGrupoRow | null;
    modulo?: SheetsAcademicModuloRow | null;
  } | null;
};

type SheetsMatriculaRow = {
  id: number;
  recibo?: string | null;
  fecha?: string | null;
  semestreId?: number | null;
  archivado?: boolean | null;
  semestre?: {
    id?: number | null;
    titulo?: string | null;
  } | null;
  user?: SheetsUserRow | null;
  responsable?: SheetsPersonalRow | null;
  responsableUser?: SheetsPersonalRow["user"] | null;
  modulosEstudiantes?: SheetsModuloEstudianteRow[] | null;
};

type SheetWritableRow = {
  valuesByHeader: Partial<Record<MatriculasSheetHeader, string>>;
  especialidad: string;
  docente: string;
  fechaMs: number;
  grupo: string;
};

type MatriculasSheetLayout = {
  sheetId: number;
  headers: string[];
  columnByHeader: Map<MatriculasSheetHeader, number>;
};

type DocenteGrupoModuloSheetRow = {
  id: number;
  nombre?: string | null;
  orden?: number | null;
  instancia?: number | null;
  sufijo?: string | null;
  grupoId?: number | null;
  moduloId?: number | null;
  grupo?: {
    id?: number | null;
    nombreDisplay?: string | null;
    semestreId?: number | null;
    personalId?: number | null;
    semestre?: {
      id?: number | null;
      titulo?: string | null;
      inicio?: string | null;
      fin?: string | null;
    } | null;
  } | null;
  modulo?: {
    id?: number | null;
    titulo?: string | null;
    tituloComercial?: string | null;
    orden?: number | null;
  } | null;
};

type DocenteModuloEstudianteSheetRow = {
  id?: number | null;
  matriculaId?: number | null;
  grupoId?: number | null;
  grupoModuloId?: number | null;
  moduloId?: number | null;
  matricula?: SheetsMatriculaRow | null;
};

const MATRICULAS_SHEET_MATRICULA_FIELDS = `
      id
      recibo
      fecha
      semestreId
      semestre {
        id
        titulo
      }
      user {
        id
        dni
        tipoDocumento
        nombre
        apellidoPaterno
        apellidoMaterno
        sexo
        estadoCivil
        instruccion
        fechaNacimiento
        direccion
        distrito
        telefono
        celular
        email
        correoInstitucional
        avatar
        dniImagenFrenteProcesadaUrl
        dniImagenReversoProcesadaUrl
        rol {
          titulo
        }
      }
      responsable {
        displayName
        user {
          username
          nombre
          apellidoPaterno
          apellidoMaterno
          correoInstitucional
          email
        }
      }
      responsableUser {
        username
        nombre
        apellidoPaterno
        apellidoMaterno
        correoInstitucional
        email
      }
`;

const LIST_MATRICULAS_FOR_SHEETS_QUERY = `
  query ListMatriculasForSheets($semestreId: Int!) {
    matriculas(where: { semestreId: { eq: $semestreId }, archivado: { ne: true } }, limit: 5000) {
      ${MATRICULAS_SHEET_MATRICULA_FIELDS}
    }
  }
`;

const LIST_MATRICULAS_BY_IDS_FOR_SHEETS_QUERY = `
  query ListMatriculasByIdsForSheets($matriculaIds: [Int!]!) {
    matriculas(where: { id: { in: $matriculaIds }, archivado: { ne: true } }, limit: 1000) {
      ${MATRICULAS_SHEET_MATRICULA_FIELDS}
    }
  }
`;

const LIST_MODULO_ESTUDIANTES_FOR_SHEETS_QUERY = `
  query ListModuloEstudiantesForSheets($matriculaIds: [Int!]!) {
    modulosEstudiantes(limit: 200000, where: { matriculaId: { in: $matriculaIds } }) {
      id
      matriculaId
      grupoId
      grupoModuloId
      moduloId
      grupo {
        id
        nombreDisplay
        personal {
          displayName
          user {
            username
            nombre
            apellidoPaterno
            apellidoMaterno
            correoInstitucional
            email
          }
        }
      }
      modulo {
        id
        titulo
        tituloComercial
        orden
        plan {
          id
          planEstudio
          tituloComercial
          carrera {
            id
            nombre
            titulo
            tituloComercial
            especialidad {
              id
              titulo
              tituloComercial
              orden
            }
          }
        }
      }
      grupoModulo {
        id
        nombre
        orden
        grupo {
          id
          nombreDisplay
          personal {
            displayName
            user {
              username
              nombre
              apellidoPaterno
              apellidoMaterno
              correoInstitucional
              email
            }
          }
        }
        modulo {
          id
          titulo
          tituloComercial
          orden
          plan {
            id
            planEstudio
            tituloComercial
            carrera {
              id
              nombre
              titulo
              tituloComercial
              especialidad {
                id
                titulo
                tituloComercial
                orden
              }
            }
          }
        }
      }
    }
  }
`;

const DOCENTE_MATRICULADO_SHEET_MATRICULA_FIELDS = `
  id
  recibo
  fecha
  semestreId
  archivado
  semestre {
    id
    titulo
  }
  user {
    id
    dni
    tipoDocumento
    nombre
    apellidoPaterno
    apellidoMaterno
    estadoCivil
    instruccion
    fechaNacimiento
    direccion
    distrito
    telefono
    celular
    email
    correoInstitucional
    avatar
    dniImagenFrenteProcesadaUrl
    dniImagenReversoProcesadaUrl
  }
`;

const GET_DOCENTE_GRUPO_MODULO_FOR_SHEETS_QUERY = `
  query GetDocenteGrupoModuloForSheets($grupoModuloId: Int!, $uid: String!) {
    users(where: { documentId: { eq: $uid } }, limit: 1) {
      id
    }
    personals(limit: 10000) {
      id
      userId
    }
    grupoModulo(id: $grupoModuloId) {
      id
      nombre
      orden
      instancia
      sufijo
      grupoId
      moduloId
      grupo {
        id
        nombreDisplay
        semestreId
        personalId
        semestre {
          id
          titulo
          inicio
          fin
        }
      }
      modulo {
        id
        titulo
        tituloComercial
        orden
      }
    }
  }
`;

const LIST_DOCENTE_MATRICULADOS_BY_GRUPO_MODULO_FOR_SHEETS_QUERY = `
  query ListDocenteMatriculadosByGrupoModuloForSheets($grupoModuloId: Int!) {
    modulosEstudiantes(where: { grupoModuloId: { eq: $grupoModuloId } }, limit: 5000) {
      id
      matriculaId
      grupoId
      grupoModuloId
      moduloId
      matricula {
        ${DOCENTE_MATRICULADO_SHEET_MATRICULA_FIELDS}
      }
    }
  }
`;

const LIST_DOCENTE_MATRICULADOS_BY_GROUP_MODULE_FOR_SHEETS_QUERY = `
  query ListDocenteMatriculadosByGroupModuleForSheets($grupoId: Int!, $moduloId: Int!) {
    modulosEstudiantes(where: { grupoId: { eq: $grupoId }, moduloId: { eq: $moduloId } }, limit: 5000) {
      id
      matriculaId
      grupoId
      grupoModuloId
      moduloId
      matricula {
        ${DOCENTE_MATRICULADO_SHEET_MATRICULA_FIELDS}
      }
    }
  }
`;

const LIST_MATRICULAS_BY_IDS_FOR_DOCENTE_SHEET_QUERY = `
  query ListMatriculasByIdsForDocenteSheet($matriculaIds: [Int!]!) {
    matriculas(where: { id: { in: $matriculaIds }, archivado: { ne: true } }, limit: 1000) {
      ${DOCENTE_MATRICULADO_SHEET_MATRICULA_FIELDS}
    }
  }
`;

const GET_CURRENT_SEMESTRE_SETTING_QUERY = `
  query GetCurrentSemestreForSheets {
    current: appSettings(where: { settingKey: { eq: "${CURRENT_SEMESTRE_ID_KEY}" } }, limit: 1) {
      intValue
      stringValue
    }
    formulario: appSettings(where: { settingKey: { eq: "${FORMULARIO_MATRICULA_SEMESTRE_ID_KEY}" } }, limit: 1) {
      intValue
      stringValue
    }
  }
`;

function asCleanString(value: unknown): string | null {
  const text = String(value ?? "").trim().replace(/\s+/g, " ");
  return text ? text : null;
}

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeForSort(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function formatLimaDateTime(value: unknown): string {
  const text = asCleanString(value);
  if (!text) return "";
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: LIMA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatLimaDate(value: unknown): string {
  const text = asCleanString(value);
  if (!text) return "";
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: LIMA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getDateMs(value: unknown): number {
  const text = asCleanString(value);
  if (!text) return 0;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function normalizeSex(value: unknown): string {
  const text = normalizeForSort(asCleanString(value) ?? "");
  if (!text) return "";
  if (text === "f" || text.startsWith("fem")) return "F";
  if (text === "m" || text.startsWith("mas")) return "M";
  return text.slice(0, 1).toUpperCase();
}

function joinNameParts(parts: Array<unknown>): string {
  return parts.map((part) => asCleanString(part)).filter(Boolean).join(" ");
}

function toUpperName(value: unknown): string {
  return asCleanString(value)?.toLocaleUpperCase("es-PE") ?? "";
}

function toTitleName(value: unknown): string {
  const text = asCleanString(value);
  if (!text) return "";
  return text
    .toLocaleLowerCase("es-PE")
    .replace(/(^|[\s'-])(\p{L})/gu, (_match, prefix: string, letter: string) =>
      `${prefix}${letter.toLocaleUpperCase("es-PE")}`,
    );
}

function buildApellidosYNombres(user: SheetsUserRow | null | undefined): string {
  const apellidos = joinNameParts([user?.apellidoPaterno, user?.apellidoMaterno]).toLocaleUpperCase("es-PE");
  const nombres = toTitleName(user?.nombre);
  return [apellidos, nombres].filter(Boolean).join(", ");
}

function escapeSheetFormulaString(value: string): string {
  return value.replace(/"/g, "\"\"");
}

function buildHyperlinkFormula(url: unknown, label: string): string {
  const cleanUrl = asCleanString(url);
  if (!cleanUrl) return "";
  return `=HYPERLINK("${escapeSheetFormulaString(cleanUrl)}","${escapeSheetFormulaString(label)}")`;
}

function columnIndexToA1(index: number): string {
  let column = "";
  let value = index + 1;
  while (value > 0) {
    const remainder = (value - 1) % 26;
    column = String.fromCharCode(65 + remainder) + column;
    value = Math.floor((value - 1) / 26);
  }
  return column;
}

function buildAgeFormulaForCell(cell: string): string {
  return `=IF(${cell}="","",DATEDIF(IF(ISNUMBER(${cell}),${cell},DATE(VALUE(RIGHT(${cell},4)),VALUE(MID(${cell},4,2)),VALUE(LEFT(${cell},2)))),TODAY(),"Y"))`;
}

function buildAgeFormula(rowNumber: number): string {
  const cell = `G${rowNumber}`;
  return buildAgeFormulaForCell(cell);
}

function normalizeSheetHeaderLabel(value: unknown): string {
  return normalizeForSort(asCleanString(value) ?? "")
    .replace(/[().:/\\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getMatriculasHeaderForLabel(value: unknown): MatriculasSheetHeader | null {
  const normalized = normalizeSheetHeaderLabel(value);
  if (!normalized) return null;

  const exact = MATRICULAS_SHEETS_HEADERS.find((header) => normalizeSheetHeaderLabel(header) === normalized);
  if (exact) return exact;

  switch (normalized) {
  case "fecha matricula":
  case "fecha de matricula":
    return "fecha de matricula";
  case "fecha de nacimiento":
  case "fecha nacimiento":
    return "fecha nacimiento";
  case "edad anos":
  case "edad anios":
  case "edad":
    return "edad";
  case "apellidos y nombres":
  case "nombres y apellidos":
    return "Nombres y apellidos";
  case "avatar mediano":
  case "avatar medio":
  case "avatar":
    return "avatar mediano";
  default:
    return null;
  }
}

function buildMatriculasHeaderMap(headers: string[]): Map<MatriculasSheetHeader, number> {
  const map = new Map<MatriculasSheetHeader, number>();
  headers.forEach((header, index) => {
    const expectedHeader = getMatriculasHeaderForLabel(header);
    if (!expectedHeader || map.has(expectedHeader)) return;
    map.set(expectedHeader, index);
  });
  return map;
}

function buildHeaderLookupFormula(header: MatriculasSheetHeader): string {
  return `INDEX($A:$ZZ,ROW(),MATCH("${escapeSheetFormulaString(header)}",$1:$1,0))`;
}

function buildNombresApellidosFormula(): string {
  const paterno = buildHeaderLookupFormula("apellido paterno");
  const materno = buildHeaderLookupFormula("apellido materno");
  const nombres = buildHeaderLookupFormula("nombres");
  return `=LET(apellidos,TRIM(${paterno}&" "&${materno}),nombres,TRIM(${nombres}),IF(apellidos&nombres="","",IF(apellidos="",PROPER(nombres),UPPER(apellidos)&IF(nombres="","",", "&PROPER(nombres)))))`;
}

function buildMatriculasAgeFormula(): string {
  const fecha = buildHeaderLookupFormula("fecha nacimiento");
  return `=LET(fecha,${fecha},IF(fecha="","",DATEDIF(IF(ISNUMBER(fecha),fecha,DATE(VALUE(RIGHT(fecha,4)),VALUE(MID(fecha,4,2)),VALUE(LEFT(fecha,2)))),TODAY(),"Y")))`;
}

function buildMatriculasSheetValues(
  row: SheetWritableRow,
  layout: MatriculasSheetLayout,
): string[] {
  const values = new Array<string>(layout.headers.length).fill("");
  for (const header of MATRICULAS_SHEETS_HEADERS) {
    const columnIndex = layout.columnByHeader.get(header);
    if (columnIndex == null) continue;
    if (header === "Nombres y apellidos") {
      values[columnIndex] = buildNombresApellidosFormula();
    } else if (header === "edad") {
      values[columnIndex] = buildMatriculasAgeFormula();
    } else {
      values[columnIndex] = row.valuesByHeader[header] ?? "";
    }
  }
  return values;
}

function getPersonDisplayName(person: SheetsPersonalRow | null | undefined): string {
  return asCleanString(person?.displayName)
    ?? getUserDisplayName(person?.user)
    ?? "";
}

function getUserDisplayName(user: SheetsPersonalRow["user"] | null | undefined): string {
  return asCleanString(user?.username)
    ?? asCleanString(joinNameParts([user?.apellidoPaterno, user?.apellidoMaterno, user?.nombre]))
    ?? asCleanString(user?.correoInstitucional)
    ?? asCleanString(user?.email)
    ?? "";
}

function pickModuloEstudiante(items: SheetsModuloEstudianteRow[]): SheetsModuloEstudianteRow | null {
  if (items.length === 0) return null;
  return items
    .slice()
    .sort((a, b) =>
      (a.grupoModulo?.orden ?? a.modulo?.orden ?? 0) - (b.grupoModulo?.orden ?? b.modulo?.orden ?? 0)
      || (a.grupoModuloId ?? 0) - (b.grupoModuloId ?? 0)
      || (a.moduloId ?? 0) - (b.moduloId ?? 0),
    )[0] ?? null;
}

function getAcademicContext(moduloEstudiante: SheetsModuloEstudianteRow | null) {
  const grupo = moduloEstudiante?.grupoModulo?.grupo ?? moduloEstudiante?.grupo ?? null;
  const modulo = moduloEstudiante?.grupoModulo?.modulo ?? moduloEstudiante?.modulo ?? null;
  const carrera = modulo?.plan?.carrera ?? null;
  const especialidad = carrera?.especialidad ?? null;
  return {
    docente: getPersonDisplayName(grupo?.personal),
    especialidad: asCleanString(especialidad?.tituloComercial) ?? asCleanString(especialidad?.titulo) ?? "",
    programa: asCleanString(carrera?.tituloComercial) ?? asCleanString(carrera?.titulo) ?? asCleanString(carrera?.nombre) ?? "",
    plan: asCleanString(modulo?.plan?.planEstudio) ?? asCleanString(modulo?.plan?.tituloComercial) ?? "",
    grupo: asCleanString(grupo?.nombreDisplay) ?? asCleanString(moduloEstudiante?.grupoModulo?.nombre) ?? "",
  };
}

async function getCurrentSemestreId(): Promise<number> {
  const response = await dataConnect.executeGraphql<{
    current?: Array<{ intValue?: number | null; stringValue?: string | null }> | null;
    formulario?: Array<{ intValue?: number | null; stringValue?: string | null }> | null;
  }, Record<string, never>>(GET_CURRENT_SEMESTRE_SETTING_QUERY);
  const current = response.data.current?.[0] ?? null;
  const formulario = response.data.formulario?.[0] ?? null;
  const semestreId =
    toNumberOrNull(current?.intValue)
    ?? toNumberOrNull(current?.stringValue)
    ?? toNumberOrNull(formulario?.intValue)
    ?? toNumberOrNull(formulario?.stringValue);
  if (!semestreId || semestreId <= 0) {
    throw new https.HttpsError("failed-precondition", "No se encontro el semestre actual configurado.");
  }
  return semestreId;
}

function getWorkspaceSubjectEmail(): string {
  const subject = asCleanString(process.env.WORKSPACE_SUBJECT_EMAIL);
  if (!subject) {
    throw new https.HttpsError(
      "failed-precondition",
      "Falta WORKSPACE_SUBJECT_EMAIL para sincronizar Google Sheets.",
    );
  }
  return subject;
}

function getSheetsAuth() {
  const email = asCleanString(process.env.GOOGLE_CLIENT_EMAIL);
  const key = String(process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n").trim();
  const subject = getWorkspaceSubjectEmail();
  if (!email || !key) {
    throw new https.HttpsError(
      "failed-precondition",
      "Faltan GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY o WORKSPACE_SUBJECT_EMAIL para sincronizar Google Sheets.",
    );
  }
  return new google.auth.JWT({
    email,
    key,
    scopes: [
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/spreadsheets",
    ],
    subject,
  });
}

async function ensureSpreadsheetFile(fileName: string, folderId: string): Promise<SheetsFileInfo> {
  const auth = getSheetsAuth();
  const drive = google.drive({ version: "v3", auth });
  const escapedName = fileName.replace(/'/g, "\\'");
  const response = await drive.files.list({
    q: [
      `'${folderId}' in parents`,
      `name = '${escapedName}'`,
      `mimeType = '${GOOGLE_SHEETS_MIME_TYPE}'`,
      "trashed = false",
    ].join(" and "),
    fields: "files(id, webViewLink)",
    pageSize: 1,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  const existing = response.data.files?.[0];
  if (existing?.id) {
    return {
      spreadsheetId: existing.id,
      spreadsheetUrl: existing.webViewLink ?? `https://docs.google.com/spreadsheets/d/${existing.id}/edit`,
    };
  }

  const created = await drive.files.create({
    requestBody: {
      name: fileName,
      mimeType: GOOGLE_SHEETS_MIME_TYPE,
      parents: [folderId],
    },
    fields: "id, webViewLink",
    supportsAllDrives: true,
  });
  const spreadsheetId = created.data.id;
  if (!spreadsheetId) {
    throw new https.HttpsError("internal", "Google Drive no devolvio el ID de la hoja creada.");
  }

  const domain = asCleanString(process.env.WORKSPACE_PRIMARY_DOMAIN);
  if (domain) {
    try {
      await drive.permissions.create({
        fileId: spreadsheetId,
        requestBody: { type: "domain", role: "reader", domain },
        supportsAllDrives: true,
      });
    } catch (error) {
      console.warn("No se pudo compartir la hoja con el dominio de Workspace:", error);
    }
  }

  return {
    spreadsheetId,
    spreadsheetUrl: created.data.webViewLink ?? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
  };
}

async function ensureSpreadsheet(): Promise<SheetsFileInfo> {
  return ensureSpreadsheetFile(MATRICULAS_SHEETS_FILE_NAME, MATRICULAS_SHEETS_FOLDER_ID);
}

async function ensureResponsesTab(spreadsheetId: string): Promise<number> {
  const sheets = google.sheets({ version: "v4", auth: getSheetsAuth() });
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets(properties(sheetId,title))",
  });
  const existing = spreadsheet.data.sheets?.find((sheet) => sheet.properties?.title === MATRICULAS_SHEETS_TAB_NAME);
  if (existing?.properties?.sheetId != null) return existing.properties.sheetId;

  const created = await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          addSheet: {
            properties: {
              title: MATRICULAS_SHEETS_TAB_NAME,
            },
          },
        },
      ],
    },
  });
  const sheetId = created.data.replies?.[0]?.addSheet?.properties?.sheetId;
  if (sheetId == null) {
    throw new https.HttpsError("internal", "No se pudo crear la pestana Respuestas en Google Sheets.");
  }
  return sheetId;
}

async function getResponsesSheetState(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
): Promise<sheets_v4.Schema$Sheet> {
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets(properties(sheetId,title,gridProperties(rowCount,columnCount)),protectedRanges(protectedRangeId,description,range))",
  });
  const sheet = spreadsheet.data.sheets?.find((item) =>
    item.properties?.title === MATRICULAS_SHEETS_TAB_NAME,
  );
  if (sheet?.properties?.sheetId == null) {
    throw new https.HttpsError("not-found", "No se encontro la pestana Respuestas en Google Sheets.");
  }
  return sheet;
}

async function readMatriculasSheetHeaders(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
): Promise<string[]> {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${MATRICULAS_SHEETS_TAB_NAME}!1:1`,
    majorDimension: "ROWS",
  });
  return (response.data.values?.[0] ?? []).map((value) => String(value ?? "").trim());
}

function getMatriculasHeaderInsertIndex(header: MatriculasSheetHeader, headers: string[]): number {
  const currentMap = buildMatriculasHeaderMap(headers);
  const expectedIndex = MATRICULAS_SHEETS_HEADERS.indexOf(header);
  for (let index = expectedIndex - 1; index >= 0; index -= 1) {
    const previousHeader = MATRICULAS_SHEETS_HEADERS[index];
    const previousIndex = currentMap.get(previousHeader);
    if (previousIndex != null) return previousIndex + 1;
  }
  return headers.length;
}

async function insertMatriculasSheetColumn(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetId: number,
  headers: string[],
  header: MatriculasSheetHeader,
): Promise<string[]> {
  const insertIndex = getMatriculasHeaderInsertIndex(header, headers);
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          insertDimension: {
            range: {
              sheetId,
              dimension: "COLUMNS",
              startIndex: insertIndex,
              endIndex: insertIndex + 1,
            },
            inheritFromBefore: insertIndex > 0,
          },
        },
      ],
    },
  });
  const nextHeaders = [...headers];
  nextHeaders.splice(insertIndex, 0, header);
  return nextHeaders;
}

async function applyMatriculasSheetFormatting(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  layout: MatriculasSheetLayout,
  minimumRows: number,
): Promise<void> {
  const sheet = await getResponsesSheetState(sheets, spreadsheetId);
  const rowCount = sheet.properties?.gridProperties?.rowCount ?? 0;
  const columnCount = sheet.properties?.gridProperties?.columnCount ?? 0;
  const protectedRanges = sheet.protectedRanges ?? [];
  const requests: sheets_v4.Schema$Request[] = [];
  const targetRowCount = Math.max(rowCount, minimumRows, MATRICULAS_SHEETS_MIN_ROW_COUNT);
  const targetColumnCount = Math.max(columnCount, layout.headers.length);

  requests.push({
    updateSheetProperties: {
      properties: {
        sheetId: layout.sheetId,
        gridProperties: {
          frozenRowCount: 1,
          rowCount: targetRowCount,
          columnCount: targetColumnCount,
        },
      },
      fields: "gridProperties.frozenRowCount,gridProperties.rowCount,gridProperties.columnCount",
    },
  });

  if (layout.headers.length > 0) {
    requests.push({
      autoResizeDimensions: {
        dimensions: {
          sheetId: layout.sheetId,
          dimension: "COLUMNS",
          startIndex: 0,
          endIndex: layout.headers.length,
        },
      },
    });
  }

  for (const header of MATRICULAS_SHEETS_LINK_HEADERS) {
    const columnIndex = layout.columnByHeader.get(header);
    if (columnIndex == null) continue;
    requests.push({
      updateDimensionProperties: {
        range: {
          sheetId: layout.sheetId,
          dimension: "COLUMNS",
          startIndex: columnIndex,
          endIndex: columnIndex + 1,
        },
        properties: { pixelSize: MATRICULAS_SHEETS_LINK_COLUMN_WIDTH },
        fields: "pixelSize",
      },
    });
  }

  const hasHeaderProtection = protectedRanges.some((protectedRange) =>
    protectedRange.description === MATRICULAS_SHEETS_HEADER_PROTECTION_DESCRIPTION
    || (
      protectedRange.range?.sheetId === layout.sheetId
      && (protectedRange.range.startRowIndex ?? 0) === 0
      && protectedRange.range.endRowIndex === 1
    ),
  );

  if (!hasHeaderProtection) {
    requests.push({
      addProtectedRange: {
        protectedRange: {
          description: MATRICULAS_SHEETS_HEADER_PROTECTION_DESCRIPTION,
          range: {
            sheetId: layout.sheetId,
            startRowIndex: 0,
            endRowIndex: 1,
          },
          editors: {
            users: [getWorkspaceSubjectEmail()],
          },
          warningOnly: false,
        },
      },
    });
  }

  if (requests.length === 0) return;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests },
  });
}

async function ensureMatriculasSheetLayout(
  spreadsheetId: string,
  options: { resetHeaders?: boolean; minimumRows?: number } = {},
): Promise<MatriculasSheetLayout> {
  const sheets = google.sheets({ version: "v4", auth: getSheetsAuth() });
  const sheetId = await ensureResponsesTab(spreadsheetId);
  let headers = options.resetHeaders
    ? [...MATRICULAS_SHEETS_HEADERS]
    : await readMatriculasSheetHeaders(sheets, spreadsheetId);

  if (headers.every((header) => !asCleanString(header))) {
    headers = [...MATRICULAS_SHEETS_HEADERS];
  }

  for (const expectedHeader of MATRICULAS_SHEETS_HEADERS) {
    const currentMap = buildMatriculasHeaderMap(headers);
    if (currentMap.has(expectedHeader)) continue;
    headers = await insertMatriculasSheetColumn(sheets, spreadsheetId, sheetId, headers, expectedHeader);
  }

  const canonicalMap = buildMatriculasHeaderMap(headers);
  for (const expectedHeader of MATRICULAS_SHEETS_HEADERS) {
    const index = canonicalMap.get(expectedHeader);
    if (index != null) headers[index] = expectedHeader;
  }

  const layout: MatriculasSheetLayout = {
    sheetId,
    headers,
    columnByHeader: buildMatriculasHeaderMap(headers),
  };
  const lastColumn = columnIndexToA1(Math.max(headers.length - 1, 0));
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${MATRICULAS_SHEETS_TAB_NAME}!A1:${lastColumn}1`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [headers],
    },
  });
  await applyMatriculasSheetFormatting(sheets, spreadsheetId, layout, options.minimumRows ?? 0);
  return layout;
}

async function getMatriculasSheetLastRow(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  layout: MatriculasSheetLayout,
): Promise<number> {
  const lastColumn = columnIndexToA1(Math.max(layout.headers.length - 1, 0));
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${MATRICULAS_SHEETS_TAB_NAME}!A:${lastColumn}`,
    majorDimension: "ROWS",
  });
  return response.data.values?.length ?? 0;
}

async function ensureSheetTab(spreadsheetId: string, title: string): Promise<number> {
  const sheets = google.sheets({ version: "v4", auth: getSheetsAuth() });
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets(properties(sheetId,title))",
  });
  const existing = spreadsheet.data.sheets?.find((sheet) => sheet.properties?.title === title);
  if (existing?.properties?.sheetId != null) return existing.properties.sheetId;

  const created = await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          addSheet: {
            properties: { title },
          },
        },
      ],
    },
  });
  const sheetId = created.data.replies?.[0]?.addSheet?.properties?.sheetId;
  if (sheetId == null) {
    throw new https.HttpsError("internal", `No se pudo crear la pestana ${title} en Google Sheets.`);
  }
  return sheetId;
}

async function hydrateAvatarMediano(userIds: number[]): Promise<Map<number, string>> {
  const uniqueUserIds = new Set(userIds.filter((id) => Number.isFinite(id) && id > 0));
  const result = new Map<number, string>();
  if (uniqueUserIds.size === 0) return result;

  const snapshot = await getFirestore()
    .collection(MATRICULA_AVATAR_EXTRACTION_COLLECTION)
    .orderBy("updatedAt", "desc")
    .limit(1500)
    .get();

  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    const userId = toNumberOrNull(data.userId);
    if (!userId || !uniqueUserIds.has(userId) || result.has(userId) || data.status !== "completed") return;

    const avatarTamanos = data.avatarTamanos as {
      mediano?: { url?: unknown } | null;
      grande?: { url?: unknown } | null;
    } | null;
    const avatar = data.avatar as { url?: unknown } | null;
    const url = asCleanString(avatarTamanos?.mediano?.url)
      ?? asCleanString(avatarTamanos?.grande?.url)
      ?? asCleanString(avatar?.url);
    if (url) result.set(userId, url);
  });

  return result;
}

function buildWritableRows(
  matriculas: SheetsMatriculaRow[],
  modulosEstudiantesByMatriculaId: Map<number, SheetsModuloEstudianteRow[]>,
  avatarMedianoByUserId: Map<number, string>,
  codigoModular: string,
): SheetWritableRow[] {
  return matriculas.map((matricula) => {
    const user = matricula.user ?? null;
    const moduloEstudiante = pickModuloEstudiante(modulosEstudiantesByMatriculaId.get(matricula.id) ?? []);
    const academic = getAcademicContext(moduloEstudiante);
    const responsable = getPersonDisplayName(matricula.responsable) || getUserDisplayName(matricula.responsableUser);
    const avatarMediano = user?.id ? avatarMedianoByUserId.get(user.id) : null;
    const fechaMs = getDateMs(matricula.fecha);
    return {
      especialidad: academic.especialidad,
      docente: academic.docente,
      fechaMs,
      grupo: academic.grupo,
      valuesByHeader: {
        "fecha de matricula": formatLimaDateTime(matricula.fecha),
        docente: academic.docente,
        especialidad: academic.especialidad,
        periodo: asCleanString(matricula.semestre?.titulo) ?? "",
        "codigo modular": codigoModular,
        "tipo documento": asCleanString(user?.tipoDocumento) ?? "",
        "numero documento": asCleanString(user?.dni) ?? "",
        "apellido paterno": asCleanString(user?.apellidoPaterno) ?? "",
        "apellido materno": asCleanString(user?.apellidoMaterno) ?? "",
        nombres: asCleanString(user?.nombre) ?? "",
        "fecha nacimiento": formatLimaDate(user?.fechaNacimiento),
        "sexo (F/M)": normalizeSex(user?.sexo),
        Rol: asCleanString(user?.rol?.titulo) ?? "",
        "correo institucional": asCleanString(user?.correoInstitucional) ?? "",
        celular: asCleanString(user?.celular) ?? "",
        "programa de estudio": academic.programa,
        plan: academic.plan,
        grupo: academic.grupo,
        "grado de Instruccion": asCleanString(user?.instruccion) ?? "",
        "estado civil": asCleanString(user?.estadoCivil) ?? "",
        direccion: asCleanString(user?.direccion) ?? "",
        distrito: asCleanString(user?.distrito) ?? "",
        "responsable (llenado del formulario)": responsable,
        "avatar mediano": buildHyperlinkFormula(avatarMediano ?? user?.avatar, "avatar"),
        "dni-procesado-frente": buildHyperlinkFormula(user?.dniImagenFrenteProcesadaUrl, "frente"),
        "dni-procesado-reverso": buildHyperlinkFormula(user?.dniImagenReversoProcesadaUrl, "reverso"),
      },
    };
  }).sort((a, b) =>
    normalizeForSort(a.especialidad).localeCompare(normalizeForSort(b.especialidad), "es", { numeric: true })
    || normalizeForSort(a.docente).localeCompare(normalizeForSort(b.docente), "es", { numeric: true })
    || normalizeForSort(a.grupo).localeCompare(normalizeForSort(b.grupo), "es", { numeric: true })
    || a.fechaMs - b.fechaMs,
  );
}

function buildDocenteMatriculadosFileName(grupoModulo: DocenteGrupoModuloSheetRow): string {
  const semestreTitulo = asCleanString(grupoModulo.grupo?.semestre?.titulo);
  const semestrePrefix = semestreTitulo ? semestreTitulo.slice(-4) : "";
  const baseName =
    asCleanString(grupoModulo.nombre)
    ?? asCleanString(grupoModulo.grupo?.nombreDisplay)
    ?? asCleanString(grupoModulo.modulo?.titulo)
    ?? `Grupo ${grupoModulo.id}`;
  if (!semestrePrefix) return baseName;
  return normalizeForSort(baseName).startsWith(normalizeForSort(semestrePrefix))
    ? baseName
    : `${semestrePrefix} ${baseName}`;
}

async function loadDocenteGrupoModuloForSheet(
  grupoModuloId: number,
  context: https.CallableContext,
): Promise<DocenteGrupoModuloSheetRow> {
  const uid = context.auth?.uid;
  if (!uid) {
    throw new https.HttpsError("unauthenticated", "Debes iniciar sesion.");
  }

  const response = await dataConnect.executeGraphql<{
    users: Array<{ id: number }>;
    personals: Array<{ id: number; userId?: number | null }>;
    grupoModulo?: DocenteGrupoModuloSheetRow | null;
  }, { grupoModuloId: number; uid: string }>(
    GET_DOCENTE_GRUPO_MODULO_FOR_SHEETS_QUERY,
    { variables: { grupoModuloId, uid } },
  );

  const grupoModulo = response.data.grupoModulo ?? null;
  if (!grupoModulo) {
    throw new https.HttpsError("not-found", "No se encontro el grupo-modulo indicado.");
  }

  if (isSuperUserContext(context)) {
    return grupoModulo;
  }

  if (getRequesterRoleId(context) !== 4) {
    throw new https.HttpsError("permission-denied", "Solo el docente asignado puede exportar esta lista.");
  }

  const requesterUserId = response.data.users?.[0]?.id ?? null;
  const personalIds = new Set(
    (response.data.personals ?? [])
      .filter((personal) => personal.userId === requesterUserId)
      .map((personal) => personal.id),
  );
  const grupoPersonalId = toNumberOrNull(grupoModulo.grupo?.personalId);
  if (!grupoPersonalId || !personalIds.has(grupoPersonalId)) {
    throw new https.HttpsError("permission-denied", "No tienes acceso a este grupo.");
  }

  return grupoModulo;
}

async function listDocenteMatriculadosForSheet(
  grupoModulo: DocenteGrupoModuloSheetRow,
): Promise<SheetsMatriculaRow[]> {
  const grupoModuloId = Number(grupoModulo.id);
  const grupoId = toNumberOrNull(grupoModulo.grupoId);
  const moduloId = toNumberOrNull(grupoModulo.moduloId);

  const [byGrupoModulo, byPair] = await Promise.all([
    dataConnect.executeGraphql<{
      modulosEstudiantes: DocenteModuloEstudianteSheetRow[];
    }, { grupoModuloId: number }>(
      LIST_DOCENTE_MATRICULADOS_BY_GRUPO_MODULO_FOR_SHEETS_QUERY,
      { variables: { grupoModuloId } },
    ),
    grupoId && moduloId
      ? dataConnect.executeGraphql<{
        modulosEstudiantes: DocenteModuloEstudianteSheetRow[];
      }, { grupoId: number; moduloId: number }>(
        LIST_DOCENTE_MATRICULADOS_BY_GROUP_MODULE_FOR_SHEETS_QUERY,
        { variables: { grupoId, moduloId } },
      )
      : Promise.resolve({ data: { modulosEstudiantes: [] } }),
  ]);

  const byMatriculaId = new Map<number, SheetsMatriculaRow>();
  for (const item of [...(byGrupoModulo.data.modulosEstudiantes ?? []), ...(byPair.data.modulosEstudiantes ?? [])]) {
    const itemGrupoModuloId = toNumberOrNull(item.grupoModuloId);
    const belongsToGrupoModulo = itemGrupoModuloId
      ? itemGrupoModuloId === grupoModuloId
      : toNumberOrNull(item.grupoId) === grupoId && toNumberOrNull(item.moduloId) === moduloId;
    const matricula = item.matricula ?? null;
    if (!belongsToGrupoModulo || !matricula || matricula.archivado === true) continue;
    if (grupoModulo.grupo?.semestreId && Number(matricula.semestreId) !== Number(grupoModulo.grupo.semestreId)) continue;
    byMatriculaId.set(matricula.id, matricula);
  }

  return Array.from(byMatriculaId.values()).sort((a, b) =>
    getDateMs(a.fecha) - getDateMs(b.fecha) || a.id - b.id,
  );
}

function buildDocenteSheetRows(
  matriculas: SheetsMatriculaRow[],
  avatarMedianoByUserId: Map<number, string>,
): string[][] {
  return matriculas.map((matricula, index) => {
    const user = matricula.user ?? null;
    const rowNumber = index + 2;
    const recibo = asCleanString(matricula.recibo);
    const avatarMediano = user?.id ? avatarMedianoByUserId.get(user.id) : null;
    return [
      formatLimaDate(matricula.fecha),
      recibo ? `${matricula.id} - ${recibo}` : String(matricula.id),
      toUpperName(user?.apellidoPaterno),
      toUpperName(user?.apellidoMaterno),
      toTitleName(user?.nombre),
      buildApellidosYNombres(user),
      formatLimaDate(user?.fechaNacimiento),
      buildAgeFormula(rowNumber),
      asCleanString(user?.estadoCivil) ?? "",
      asCleanString(user?.celular) ?? "",
      asCleanString(user?.instruccion) ?? "",
      asCleanString(user?.direccion) ?? "",
      asCleanString(user?.distrito) ?? "",
      asCleanString(user?.telefono) ?? "",
      asCleanString(user?.email) ?? asCleanString(user?.correoInstitucional) ?? "",
      buildHyperlinkFormula(avatarMediano ?? user?.avatar, "avatar"),
      buildHyperlinkFormula(user?.dniImagenFrenteProcesadaUrl, "frente"),
      buildHyperlinkFormula(user?.dniImagenReversoProcesadaUrl, "reverso"),
    ];
  });
}

async function writeDocenteMatriculadosSheet(params: {
  fileInfo: SheetsFileInfo;
  rows: string[][];
}) {
  const sheets = google.sheets({ version: "v4", auth: getSheetsAuth() });
  const sheetId = await ensureSheetTab(params.fileInfo.spreadsheetId, DOCENTE_MATRICULADOS_SHEETS_TAB_NAME);
  const rowCount = params.rows.length + 1;
  const columnCount = DOCENTE_MATRICULADOS_SHEETS_HEADERS.length;

  await sheets.spreadsheets.values.clear({
    spreadsheetId: params.fileInfo.spreadsheetId,
    range: `${DOCENTE_MATRICULADOS_SHEETS_TAB_NAME}!A:R`,
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId: params.fileInfo.spreadsheetId,
    range: `${DOCENTE_MATRICULADOS_SHEETS_TAB_NAME}!A1:R${rowCount}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[...DOCENTE_MATRICULADOS_SHEETS_HEADERS], ...params.rows],
    },
  });

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: params.fileInfo.spreadsheetId,
    requestBody: {
      requests: [
        {
          updateSheetProperties: {
            properties: {
              sheetId,
              gridProperties: {
                frozenRowCount: 1,
                rowCount: Math.max(rowCount, 50),
                columnCount,
              },
            },
            fields: "gridProperties.frozenRowCount,gridProperties.rowCount,gridProperties.columnCount",
          },
        },
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: 0,
              endRowIndex: 1,
              startColumnIndex: 0,
              endColumnIndex: columnCount,
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.1, green: 0.34, blue: 0.62 },
                horizontalAlignment: "CENTER",
                textFormat: {
                  bold: true,
                  foregroundColor: { red: 1, green: 1, blue: 1 },
                },
              },
            },
            fields: "userEnteredFormat(backgroundColor,horizontalAlignment,textFormat)",
          },
        },
        {
          updateBorders: {
            range: {
              sheetId,
              startRowIndex: 0,
              endRowIndex: rowCount,
              startColumnIndex: 0,
              endColumnIndex: columnCount,
            },
            top: { style: "SOLID", width: 1, color: { red: 0.74, green: 0.78, blue: 0.84 } },
            bottom: { style: "SOLID", width: 1, color: { red: 0.74, green: 0.78, blue: 0.84 } },
            left: { style: "SOLID", width: 1, color: { red: 0.74, green: 0.78, blue: 0.84 } },
            right: { style: "SOLID", width: 1, color: { red: 0.74, green: 0.78, blue: 0.84 } },
            innerHorizontal: { style: "SOLID", width: 1, color: { red: 0.88, green: 0.9, blue: 0.94 } },
            innerVertical: { style: "SOLID", width: 1, color: { red: 0.88, green: 0.9, blue: 0.94 } },
          },
        },
        {
          setBasicFilter: {
            filter: {
              range: {
                sheetId,
                startRowIndex: 0,
                endRowIndex: rowCount,
                startColumnIndex: 0,
                endColumnIndex: columnCount,
              },
            },
          },
        },
        {
          autoResizeDimensions: {
            dimensions: {
              sheetId,
              dimension: "COLUMNS",
              startIndex: 0,
              endIndex: 15,
            },
          },
        },
        {
          updateDimensionProperties: {
            range: {
              sheetId,
              dimension: "COLUMNS",
              startIndex: 15,
              endIndex: 18,
            },
            properties: { pixelSize: 100 },
            fields: "pixelSize",
          },
        },
      ],
    },
  });
}

export async function exportDocenteMatriculadosGrupoSheet(
  grupoModuloId: number,
  context: https.CallableContext,
) {
  if (!grupoModuloId || grupoModuloId <= 0) {
    throw new https.HttpsError("invalid-argument", "Debes indicar el grupo-modulo.");
  }

  const grupoModulo = await loadDocenteGrupoModuloForSheet(grupoModuloId, context);
  const fileName = buildDocenteMatriculadosFileName(grupoModulo);
  const [fileInfo, matriculas] = await Promise.all([
    ensureSpreadsheetFile(fileName, DOCENTE_MATRICULADOS_SHEETS_FOLDER_ID),
    listDocenteMatriculadosForSheet(grupoModulo),
  ]);
  const userIds = matriculas
    .map((matricula) => toNumberOrNull(matricula.user?.id))
    .filter((id): id is number => Boolean(id && id > 0));
  const avatarMedianoByUserId = await hydrateAvatarMediano(userIds);
  const rows = buildDocenteSheetRows(matriculas, avatarMedianoByUserId);
  await writeDocenteMatriculadosSheet({ fileInfo, rows });

  return {
    ok: true,
    name: fileName,
    rows: rows.length,
    spreadsheetId: fileInfo.spreadsheetId,
    spreadsheetUrl: fileInfo.spreadsheetUrl,
  };
}

export async function exportListaMatriculasGeneralSheet(matriculaIds: number[]) {
  const ids = Array.from(new Set(
    matriculaIds
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id) && id > 0),
  )).slice(0, 1000);
  if (ids.length === 0) {
    throw new https.HttpsError("invalid-argument", "Debes indicar matriculas para exportar.");
  }

  const [fileInfo, response] = await Promise.all([
    ensureSpreadsheetFile(MATRICULAS_GENERAL_LIST_SHEETS_FILE_NAME, DOCENTE_MATRICULADOS_SHEETS_FOLDER_ID),
    dataConnect.executeGraphql<{ matriculas: SheetsMatriculaRow[] }, { matriculaIds: number[] }>(
      LIST_MATRICULAS_BY_IDS_FOR_DOCENTE_SHEET_QUERY,
      { variables: { matriculaIds: ids } },
    ),
  ]);
  const orderById = new Map(ids.map((id, index) => [id, index]));
  const matriculas = (response.data.matriculas ?? [])
    .slice()
    .sort((a, b) => (orderById.get(a.id) ?? 0) - (orderById.get(b.id) ?? 0));
  const userIds = matriculas
    .map((matricula) => toNumberOrNull(matricula.user?.id))
    .filter((id): id is number => Boolean(id && id > 0));
  const avatarMedianoByUserId = await hydrateAvatarMediano(userIds);
  const rows = buildDocenteSheetRows(matriculas, avatarMedianoByUserId);
  await writeDocenteMatriculadosSheet({ fileInfo, rows });

  return {
    ok: true,
    name: MATRICULAS_GENERAL_LIST_SHEETS_FILE_NAME,
    rows: rows.length,
    spreadsheetId: fileInfo.spreadsheetId,
    spreadsheetUrl: fileInfo.spreadsheetUrl,
  };
}

async function buildWritableRowsForSheet(
  matriculas: SheetsMatriculaRow[],
  codigoModular: string,
): Promise<SheetWritableRow[]> {
  const matriculaIds = matriculas.map((matricula) => matricula.id).filter((id) => Number.isFinite(id) && id > 0);
  const modulosResponse = matriculaIds.length > 0
    ? await dataConnect.executeGraphql<{
      modulosEstudiantes: Array<SheetsModuloEstudianteRow & { matriculaId?: number | null }>;
    }, { matriculaIds: number[] }>(
      LIST_MODULO_ESTUDIANTES_FOR_SHEETS_QUERY,
      { variables: { matriculaIds } },
    )
    : { data: { modulosEstudiantes: [] } };

  const modulosEstudiantesByMatriculaId = new Map<number, SheetsModuloEstudianteRow[]>();
  for (const item of modulosResponse.data.modulosEstudiantes ?? []) {
    const matriculaId = toNumberOrNull(item.matriculaId);
    if (!matriculaId) continue;
    const existing = modulosEstudiantesByMatriculaId.get(matriculaId) ?? [];
    existing.push(item);
    modulosEstudiantesByMatriculaId.set(matriculaId, existing);
  }

  const userIds = matriculas
    .map((matricula) => toNumberOrNull(matricula.user?.id))
    .filter((id): id is number => Boolean(id && id > 0));
  const avatarMedianoByUserId = await hydrateAvatarMediano(userIds);
  return buildWritableRows(
    matriculas,
    modulosEstudiantesByMatriculaId,
    avatarMedianoByUserId,
    codigoModular,
  );
}

export async function syncMatriculasCurrentSemesterSheet() {
  const [semestreId, fileInfo, datosGenerales] = await Promise.all([
    getCurrentSemestreId(),
    ensureSpreadsheet(),
    getDatosGeneralesGlobales(),
  ]);
  const response = await dataConnect.executeGraphql<{
    matriculas: SheetsMatriculaRow[];
  }, { semestreId: number }>(LIST_MATRICULAS_FOR_SHEETS_QUERY, { variables: { semestreId } });
  const matriculas = response.data.matriculas ?? [];
  const rows = await buildWritableRowsForSheet(
    matriculas,
    asCleanString(datosGenerales.codigoModular) ?? "",
  );

  const sheets = google.sheets({ version: "v4", auth: getSheetsAuth() });
  await sheets.spreadsheets.values.clear({
    spreadsheetId: fileInfo.spreadsheetId,
    range: `${MATRICULAS_SHEETS_TAB_NAME}!A:ZZ`,
  });
  const layout = await ensureMatriculasSheetLayout(fileInfo.spreadsheetId, {
    resetHeaders: true,
    minimumRows: rows.length + 1,
  });
  const values = [
    [...layout.headers],
    ...rows.map((row) => buildMatriculasSheetValues(row, layout)),
  ];
  const lastColumn = columnIndexToA1(Math.max(layout.headers.length - 1, 0));
  await sheets.spreadsheets.values.update({
    spreadsheetId: fileInfo.spreadsheetId,
    range: `${MATRICULAS_SHEETS_TAB_NAME}!A1:${lastColumn}${values.length}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values,
    },
  });
  await applyMatriculasSheetFormatting(sheets, fileInfo.spreadsheetId, layout, rows.length + 1);

  return {
    ok: true,
    semestreId,
    rows: rows.length,
    spreadsheetId: fileInfo.spreadsheetId,
    spreadsheetUrl: fileInfo.spreadsheetUrl,
  };
}

export async function appendMatriculaCurrentSemesterSheet(matriculaId: number) {
  const cleanMatriculaId = toNumberOrNull(matriculaId);
  if (!cleanMatriculaId || cleanMatriculaId <= 0) {
    throw new https.HttpsError("invalid-argument", "matriculaId is required.");
  }

  const [semestreId, fileInfo, datosGenerales, response] = await Promise.all([
    getCurrentSemestreId(),
    ensureSpreadsheet(),
    getDatosGeneralesGlobales(),
    dataConnect.executeGraphql<{
      matriculas: SheetsMatriculaRow[];
    }, { matriculaIds: number[] }>(
      LIST_MATRICULAS_BY_IDS_FOR_SHEETS_QUERY,
      { variables: { matriculaIds: [cleanMatriculaId] } },
    ),
  ]);
  const matricula = response.data.matriculas?.[0] ?? null;
  if (!matricula) {
    return {
      ok: true,
      skipped: "matricula-not-found",
      rows: 0,
      spreadsheetId: fileInfo.spreadsheetId,
      spreadsheetUrl: fileInfo.spreadsheetUrl,
    };
  }
  if (Number(matricula.semestreId) !== Number(semestreId)) {
    return {
      ok: true,
      skipped: "not-current-semester",
      semestreId,
      rows: 0,
      spreadsheetId: fileInfo.spreadsheetId,
      spreadsheetUrl: fileInfo.spreadsheetUrl,
    };
  }

  const rows = await buildWritableRowsForSheet(
    [matricula],
    asCleanString(datosGenerales.codigoModular) ?? "",
  );
  const row = rows[0];
  if (!row) {
    return {
      ok: true,
      skipped: "empty-row",
      semestreId,
      rows: 0,
      spreadsheetId: fileInfo.spreadsheetId,
      spreadsheetUrl: fileInfo.spreadsheetUrl,
    };
  }

  const sheets = google.sheets({ version: "v4", auth: getSheetsAuth() });
  const layout = await ensureMatriculasSheetLayout(fileInfo.spreadsheetId, { minimumRows: 2 });
  const values = [buildMatriculasSheetValues(row, layout)];
  const lastColumn = columnIndexToA1(Math.max(layout.headers.length - 1, 0));
  await sheets.spreadsheets.values.append({
    spreadsheetId: fileInfo.spreadsheetId,
    range: `${MATRICULAS_SHEETS_TAB_NAME}!A:${lastColumn}`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values,
    },
  });

  return {
    ok: true,
    semestreId,
    rows: 1,
    spreadsheetId: fileInfo.spreadsheetId,
    spreadsheetUrl: fileInfo.spreadsheetUrl,
  };
}

export async function sortMatriculasCurrentSemesterSheet() {
  const fileInfo = await ensureSpreadsheet();
  const sheets = google.sheets({ version: "v4", auth: getSheetsAuth() });
  const layout = await ensureMatriculasSheetLayout(fileInfo.spreadsheetId);
  const lastRow = await getMatriculasSheetLastRow(sheets, fileInfo.spreadsheetId, layout);
  if (lastRow <= 2) {
    return {
      ok: true,
      rows: Math.max(lastRow - 1, 0),
      spreadsheetId: fileInfo.spreadsheetId,
      spreadsheetUrl: fileInfo.spreadsheetUrl,
    };
  }

  const sortHeaders: MatriculasSheetHeader[] = [
    "especialidad",
    "docente",
    "grupo",
    "fecha de matricula",
  ];
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: fileInfo.spreadsheetId,
    requestBody: {
      requests: [
        {
          sortRange: {
            range: {
              sheetId: layout.sheetId,
              startRowIndex: 1,
              endRowIndex: lastRow,
              startColumnIndex: 0,
              endColumnIndex: layout.headers.length,
            },
            sortSpecs: sortHeaders.map((header) => ({
              dimensionIndex: layout.columnByHeader.get(header) ?? 0,
              sortOrder: "ASCENDING",
            })),
          },
        },
      ],
    },
  });

  return {
    ok: true,
    rows: lastRow - 1,
    spreadsheetId: fileInfo.spreadsheetId,
    spreadsheetUrl: fileInfo.spreadsheetUrl,
  };
}

export async function appendMatriculaCurrentSemesterSheetBestEffort(matriculaId: number, source: string) {
  try {
    return await appendMatriculaCurrentSemesterSheet(matriculaId);
  } catch (error) {
    console.warn(`No se pudo agregar la matricula a Google Sheets despues de ${source}:`, error);
    return null;
  }
}

export async function syncMatriculasCurrentSemesterSheetBestEffort(source: string) {
  try {
    return await syncMatriculasCurrentSemesterSheet();
  } catch (error) {
    console.warn(`No se pudo sincronizar Google Sheets despues de ${source}:`, error);
    return null;
  }
}

export const getMatriculasGoogleSheetInfo = https.onCall(async (_data, context) => {
  await requirePermission(context, "matriculas", "view");
  const fileInfo = await ensureSpreadsheet();
  return {
    name: MATRICULAS_SHEETS_FILE_NAME,
    ...fileInfo,
  };
});

export const exportMatriculadosDocenteGrupoGoogleSheet = runWith({ timeoutSeconds: 540, memory: "512MB" }).https.onCall(
  async (data, context) => {
    await requirePermission(context, "matriculas", "view");
    return exportDocenteMatriculadosGrupoSheet(toNumberOrNull(data?.grupoModuloId) ?? 0, context);
  },
);

export const exportListaMatriculasGeneralGoogleSheet = runWith({ timeoutSeconds: 540, memory: "512MB" }).https.onCall(
  async (data, context) => {
    await requirePermission(context, "matriculas", "view");
    const matriculaIds = Array.isArray(data?.matriculaIds) ? data.matriculaIds : [];
    return exportListaMatriculasGeneralSheet(matriculaIds);
  },
);

export const syncMatriculasGoogleSheetsCurrentSemester = runWith({ timeoutSeconds: 540, memory: "512MB" }).https.onCall(
  async (_data, context) => {
    await requireSuperUser(context);
    return syncMatriculasCurrentSemesterSheet();
  },
);

export const sortMatriculasGoogleSheetsDaily = runWith({ timeoutSeconds: 540, memory: "512MB" })
  .pubsub.schedule("every 24 hours")
  .timeZone(LIMA_TIME_ZONE)
  .onRun(async () => {
    await sortMatriculasCurrentSemesterSheet();
  });
