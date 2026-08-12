import { getFirestore } from "firebase-admin/firestore";
import { google } from "googleapis";
import { https, runWith } from "firebase-functions/v1";
import { dataConnect } from "../core/dataConnectCore.js";
import { getRequesterRoleId, isSuperUserContext, requirePermission, requireSuperUser } from "../core/permissions.js";
import { getDatosGeneralesGlobales } from "../datos-generales/service.js";

const MATRICULAS_SHEETS_FOLDER_ID = "1RttPJVARZA-KXYtiNG9DrWjTCcHazi9a";
const MATRICULAS_SHEETS_FILE_NAME = "Matriculas 2026-2 (Respuestas)";
const MATRICULAS_SHEETS_TAB_NAME = "Respuestas";
const DOCENTE_MATRICULADOS_SHEETS_FOLDER_ID = "0ACqCsSJSoVmTUk9PVA";
const DOCENTE_MATRICULADOS_SHEETS_TAB_NAME = "Matriculados";
const GOOGLE_SHEETS_MIME_TYPE = "application/vnd.google-apps.spreadsheet";
const CURRENT_SEMESTRE_ID_KEY = "general.semestreActualId";
const FORMULARIO_MATRICULA_SEMESTRE_ID_KEY = "formularioMatricula.semestreId";
const MATRICULA_AVATAR_EXTRACTION_COLLECTION = "matriculaAvatarExtractionJobs";
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
  "fecha nacimiento",
  "sexo (F/M)",
  "Rol",
  "correo institucional",
  "celular",
  "programa de estudio",
  "plan",
  "grupo",
  "avatar mediano",
  "dni-procesado-frente",
  "dni-procesado-reverso",
  "grado de Instruccion",
  "estado civil",
  "direccion",
  "distrito",
  "responsable (llenado del formulario)",
] as const;

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
  values: string[];
  especialidad: string;
  docente: string;
  fechaMs: number;
  grupo: string;
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

const LIST_MATRICULAS_FOR_SHEETS_QUERY = `
  query ListMatriculasForSheets($semestreId: Int!) {
    matriculas(where: { semestreId: { eq: $semestreId }, archivado: { ne: true } }, limit: 5000) {
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

function buildAgeFormula(rowNumber: number): string {
  const cell = `G${rowNumber}`;
  return `=IF(${cell}="","",DATEDIF(DATE(VALUE(RIGHT(${cell},4)),VALUE(MID(${cell},4,2)),VALUE(LEFT(${cell},2))),TODAY(),"Y"))`;
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

function getSheetsAuth() {
  const email = asCleanString(process.env.GOOGLE_CLIENT_EMAIL);
  const key = String(process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n").trim();
  const subject = asCleanString(process.env.WORKSPACE_SUBJECT_EMAIL);
  if (!email || !key || !subject) {
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
      values: [
        formatLimaDateTime(matricula.fecha),
        academic.docente,
        academic.especialidad,
        asCleanString(matricula.semestre?.titulo) ?? "",
        codigoModular,
        asCleanString(user?.tipoDocumento) ?? "",
        asCleanString(user?.dni) ?? "",
        asCleanString(user?.apellidoPaterno) ?? "",
        asCleanString(user?.apellidoMaterno) ?? "",
        asCleanString(user?.nombre) ?? "",
        formatLimaDate(user?.fechaNacimiento),
        normalizeSex(user?.sexo),
        asCleanString(user?.rol?.titulo) ?? "",
        asCleanString(user?.correoInstitucional) ?? "",
        asCleanString(user?.celular) ?? "",
        academic.programa,
        academic.plan,
        academic.grupo,
        avatarMediano ?? asCleanString(user?.avatar) ?? "",
        asCleanString(user?.dniImagenFrenteProcesadaUrl) ?? "",
        asCleanString(user?.dniImagenReversoProcesadaUrl) ?? "",
        asCleanString(user?.instruccion) ?? "",
        asCleanString(user?.estadoCivil) ?? "",
        asCleanString(user?.direccion) ?? "",
        asCleanString(user?.distrito) ?? "",
        responsable,
      ],
    };
  }).sort((a, b) =>
    normalizeForSort(a.especialidad).localeCompare(normalizeForSort(b.especialidad), "es", { numeric: true })
    || normalizeForSort(a.docente).localeCompare(normalizeForSort(b.docente), "es", { numeric: true })
    || a.fechaMs - b.fechaMs
    || normalizeForSort(a.grupo).localeCompare(normalizeForSort(b.grupo), "es", { numeric: true }),
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
  const rows = buildWritableRows(
    matriculas,
    modulosEstudiantesByMatriculaId,
    avatarMedianoByUserId,
    asCleanString(datosGenerales.codigoModular) ?? "",
  );

  const sheets = google.sheets({ version: "v4", auth: getSheetsAuth() });
  const sheetId = await ensureResponsesTab(fileInfo.spreadsheetId);
  await sheets.spreadsheets.values.clear({
    spreadsheetId: fileInfo.spreadsheetId,
    range: `${MATRICULAS_SHEETS_TAB_NAME}!A:Z`,
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId: fileInfo.spreadsheetId,
    range: `${MATRICULAS_SHEETS_TAB_NAME}!A1:Z${rows.length + 1}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[...MATRICULAS_SHEETS_HEADERS], ...rows.map((row) => row.values)],
    },
  });
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: fileInfo.spreadsheetId,
    requestBody: {
      requests: [
        {
          updateSheetProperties: {
            properties: {
              sheetId,
              gridProperties: { frozenRowCount: 1 },
            },
            fields: "gridProperties.frozenRowCount",
          },
        },
        {
          autoResizeDimensions: {
            dimensions: {
              sheetId,
              dimension: "COLUMNS",
              startIndex: 0,
              endIndex: MATRICULAS_SHEETS_HEADERS.length,
            },
          },
        },
      ],
    },
  });

  return {
    ok: true,
    semestreId,
    rows: rows.length,
    spreadsheetId: fileInfo.spreadsheetId,
    spreadsheetUrl: fileInfo.spreadsheetUrl,
  };
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
    await syncMatriculasCurrentSemesterSheet();
  });
