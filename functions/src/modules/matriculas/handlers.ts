import { getStorage } from "firebase-admin/storage";
import { getFirestore } from "firebase-admin/firestore";
import { firestore as functionsFirestore, https } from "firebase-functions/v1";
import { randomUUID } from "crypto";
import sharp from "sharp";
import { documentai_v1, google } from "googleapis";
import {
  buildMatriculaDataFromInput,
  buildModuloEstudianteDataFromInput,
  buildUserDataFromInput,
  getIdFromKeyOutput,
  toNumber,
  toNumberOrNull,
} from "../core/userMappers.js";
import { authAdmin, DEFAULT_LEVEL, STUDENT_ROLE_ID } from "../core/authCore.js";
import {
  dataConnect,
  getRoleById,
  upsertDataConnectUserByDocumentId,
} from "../core/dataConnectCore.js";
import { deleteMatriculaTree } from "../core/matriculaDeletion.js";
import {
  getNextCodigoInscripcionForCurrentYear,
  regenerateCodigosInscripcionForCurrentYear,
} from "../core/matriculaCodigoInscripcion.js";
import { getRequesterRoleId, hasPermission, isSuperUserContext, requirePermission, requireSuperUser } from "../core/permissions.js";
import {
  DataConnectMatriculaInput,
  DataConnectModuloEstudianteInput,
  DataConnectPaquete,
  DataConnectPaqueteModulo,
  DataConnectUserInput,
} from "../core/types.js";
import {
  DELETE_MODULO_ESTUDIANTES_BY_MATRICULA_MUTATION,
  INSERT_MATRICULA_MUTATION,
  INSERT_MODULO_ESTUDIANTE_MUTATION,
  UPDATE_MATRICULA_MUTATION,
  UPDATE_USER_MUTATION,
} from "../../dataconnectOperations.js";
import {
  addWorkspaceGroupMember,
  removeWorkspaceGroupMember,
  WorkspaceSyncError,
} from "../../workspace/groupWorkspaceSync.js";
import {
  resolveWorkspacePrimaryEmail,
  shouldSyncStudentWorkspace,
  syncStudentToWorkspace,
} from "../../workspace/studentWorkspaceSync.js";

interface MatriculaUserRow {
  id: number;
  documentId?: string | null;
  username?: string | null;
  email?: string | null;
  provider?: string | null;
  confirmed?: boolean | null;
  blocked?: boolean | null;
  dni?: string | null;
  tipoDocumento?: string | null;
  nombre?: string | null;
  apellidos?: string | null;
  apellidoPaterno?: string | null;
  apellidoMaterno?: string | null;
  sexo?: string | null;
  nacionalidad?: string | null;
  estadoCivil?: string | null;
  instruccion?: string | null;
  fechaNacimiento?: string | null;
  fechaVencimiento?: string | null;
  direccion?: string | null;
  distrito?: string | null;
  telefono?: string | null;
  celular?: string | null;
  correoInstitucional?: string | null;
  fechaCreacion?: string | null;
  fechaModificacion?: string | null;
  emailCreador?: string | null;
  avatar?: string | null;
  dniImagenFrenteUrl?: string | null;
  dniImagenReversoUrl?: string | null;
  dniImagenFrenteProcesadaUrl?: string | null;
  dniImagenReversoProcesadaUrl?: string | null;
  rolId?: number | null;
}

interface MatriculaResponsableRow {
  id: number;
  displayName?: string | null;
  userId?: number | null;
  user?: {
    id?: number | null;
    documentId?: string | null;
    username?: string | null;
    nombre?: string | null;
    apellidoPaterno?: string | null;
    apellidoMaterno?: string | null;
    email?: string | null;
    correoInstitucional?: string | null;
  } | null;
}

interface MatriculaResponsableUserRow {
  id: number;
  documentId?: string | null;
  username?: string | null;
  nombre?: string | null;
  apellidoPaterno?: string | null;
  apellidoMaterno?: string | null;
  email?: string | null;
  correoInstitucional?: string | null;
}

interface MatriculaRow {
  id: number;
  recibo?: string | null;
  fecha?: string | null;
  codigoInscripcion?: string | null;
  archivado?: boolean | null;
  paqueteId?: number | null;
  semestreId?: number | null;
  userId?: number | null;
  responsableId?: number | null;
  responsableUserId?: number | null;
  user?: MatriculaUserRow | null;
  responsable?: MatriculaResponsableRow | null;
  responsableUser?: MatriculaResponsableUserRow | null;
  paquete?: {
    id?: number | null;
    titulo?: string | null;
    descripcion?: string | null;
    archivado?: boolean | null;
  } | null;
  semestre?: {
    id?: number | null;
    titulo?: string | null;
    descripcion?: string | null;
    archivado?: boolean | null;
  } | null;
}

interface MatriculaSemestreOption {
  id: number;
  titulo?: string | null;
  inicio?: string | null;
  fin?: string | null;
  archivado?: boolean | null;
  anio?: {
    id?: number | null;
    nombre?: string | null;
    titulo?: string | null;
  } | null;
  anioTitulo?: string | null;
}

interface MatriculaDocenteGrupoModulo {
  id: number;
  nombre?: string | null;
  orden?: number | null;
  grupoId: number;
  moduloId: number;
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
    titulo?: string | null;
    tituloComercial?: string | null;
  } | null;
}

interface MatriculaDocenteModuloEstudiante {
  matriculaId?: number | null;
  grupoId?: number | null;
  moduloId?: number | null;
}

type MatriculaSaveUserResult = {
  userId: number;
  workspacePrimaryEmail: string | null;
};

type GrupoModuloMapping = {
  grupoId: number;
  workspaceCorreo?: string | null;
  moduloGrupos: Array<{ moduloId: number; grupoId: number }>;
};

type MatriculaWorkspaceGroup = {
  grupoId: number;
  workspaceCorreo?: string | null;
};

interface OcrIdentityData {
  tipoDocumento?: string | null;
  dni?: string | null;
  nombre?: string | null;
  apellidoPaterno?: string | null;
  apellidoMaterno?: string | null;
  sexo?: string | null;
  nacionalidad?: string | null;
  fechaNacimiento?: string | null;
  fechaVencimiento?: string | null;
  estadoCivil?: string | null;
  direccion?: string | null;
  distrito?: string | null;
}

type PeruDevsDniResult = {
  id?: string;
  nombres?: string;
  apellido_paterno?: string;
  apellido_materno?: string;
  fecha_nacimiento?: string;
  genero?: string;
  nombre_completo?: string;
  codigo_verificacion?: string;
};

type PeruDevsDniResponse = {
  estado?: boolean;
  mensaje?: string;
  resultado?: PeruDevsDniResult | null;
};

interface OcrDebugEntity {
  type?: string | null;
  mentionText?: string | null;
  normalizedText?: string | null;
  confidence?: number | null;
  properties?: OcrDebugEntity[];
}

type OcrIdentityResult = OcrIdentityData & {
  text: string;
  entities: OcrDebugEntity[];
};

interface UploadedDocumentImage {
  path?: string | null;
  url?: string | null;
  contentType?: string | null;
  isNewUpload?: boolean;
}

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

interface DocumentoArchivoMetadata {
  indice?: number | null;
  nombreArchivo?: string | null;
  ladoAsignado?: string | null;
  gemini?: {
    indice?: number | null;
    tipoLado?: string | null;
    areaLectura?: string | null;
    tieneDosCuerpos?: boolean | null;
    senalesReverso?: string[] | null;
    fragmentosReverso?: string[] | null;
    contieneDireccion?: boolean | null;
    contieneDomicilio?: boolean | null;
    contieneDistrito?: boolean | null;
    contienePerMrz?: boolean | null;
  } | null;
}

interface DocumentoAnalisisMetadata {
  motor?: string | null;
  pdfDuplicadoConDeteccionDeCuerpos?: boolean | null;
  archivos?: DocumentoArchivoMetadata[] | null;
  respuestaGemini?: Record<string, unknown> | null;
}

interface MatriculaDocumentProcessingSide {
  side: "frente" | "reverso";
  source: UploadedDocumentImage;
  metadata: DocumentoArchivoMetadata | null;
  hasTwoBodies: boolean;
  selectedArea: string;
  instructions: {
    twoBodies: string;
    orientation: string;
    perspective: string;
    crop: string;
    enhancement: string;
    output: string;
  };
}

interface ProcessedDocumentOutput {
  path?: string | null;
  url?: string | null;
  bucket?: string | null;
  contentType?: string | null;
}

interface AvatarCropBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

const MATRICULA_DOCUMENT_PROCESSING_COLLECTION = "matriculaDocumentoProcessingJobs";
const MATRICULA_AVATAR_EXTRACTION_COLLECTION = "matriculaAvatarExtractionJobs";
const DEFAULT_AVATAR_IMAGE_MODEL = "gemini-3.1-flash-image";
const DEFAULT_AVATAR_IMAGE_LOCATION = "global";
const FORMULARIO_MATRICULA_ACEPTA_RESPUESTAS_KEY = "formularioMatricula.aceptaRespuestas";
const FORMULARIO_MATRICULA_ACEPTA_RESPUESTAS_LEGACY_KEY = "general.formularioMatriculaAceptaRespuestas";
const FORMULARIO_MATRICULA_SEMESTRE_ID_KEY = "formularioMatricula.semestreId";

const USER_FIELDS = `
  id
  documentId
  username
  email
  provider
  confirmed
  blocked
  dni
  tipoDocumento
  nombre
  apellidos
  apellidoPaterno
  apellidoMaterno
  sexo
  nacionalidad
  estadoCivil
  instruccion
  fechaNacimiento
  fechaVencimiento
  direccion
  distrito
  telefono
  celular
  correoInstitucional
  fechaCreacion
  fechaModificacion
  emailCreador
  avatar
  dniImagenFrenteUrl
  dniImagenReversoUrl
  dniImagenFrenteProcesadaUrl
  dniImagenReversoProcesadaUrl
  rolId
`;

const GET_PAQUETE_MODULOS_FOR_MATRICULA_QUERY = `
  query GetPaqueteModulosForMatricula($paqueteId: Int!) {
    paquete(id: $paqueteId) {
      id
      archivado
    }
    paqueteModulos(where: { paqueteId: { eq: $paqueteId } }, limit: 10) {
      id
      orden
      obligatorio
      paqueteId
      moduloId
    }
  }
`;

const FIND_USER_BY_DOCUMENT_QUERY = `
  query FindUserByDocumentForMatricula($tipoDocumento: String!, $dni: String!) {
    users(where: { tipoDocumento: { eq: $tipoDocumento }, dni: { eq: $dni } }, limit: 1) {
      ${USER_FIELDS}
    }
  }
`;

const FIND_USER_BY_DOCUMENT_ID_FOR_MATRICULA_QUERY = `
  query FindUserByDocumentIdForMatricula($documentId: String!) {
    users(where: { documentId: { eq: $documentId } }, limit: 1) {
      id
      documentId
      username
      nombre
      apellidoPaterno
      apellidoMaterno
      email
      correoInstitucional
    }
  }
`;

const GET_PERSONAL_BY_USER_ID_FOR_MATRICULA_QUERY = `
  query GetPersonalByUserIdForMatricula($userId: Int!) {
    personals(where: { userId: { eq: $userId } }, limit: 1) {
      id
      displayName
      userId
      user {
        id
        documentId
        username
        nombre
        apellidoPaterno
        apellidoMaterno
        email
        correoInstitucional
      }
    }
  }
`;

const MATRICULA_FIELDS = `
  id
  recibo
  fecha
  codigoInscripcion
  archivado
  paqueteId
  semestreId
  userId
  responsableId
  responsableUserId
  user {
    ${USER_FIELDS}
  }
  responsable {
    id
    displayName
    userId
    user {
      id
      documentId
      username
      nombre
      apellidoPaterno
      apellidoMaterno
      email
      correoInstitucional
    }
  }
  responsableUser {
    id
    documentId
    username
    nombre
    apellidoPaterno
    apellidoMaterno
    email
    correoInstitucional
  }
  paquete {
    id
    titulo
    descripcion
    archivado
  }
  semestre {
    id
    titulo
    descripcion
    archivado
  }
`;

const LIST_MATRICULAS_QUERY = `
  query ListMatriculasManual {
    matriculas(limit: 500) {
      ${MATRICULA_FIELDS}
    }
  }
`;

const LIST_MATRICULA_DOCENTE_GRUPOS_QUERY = `
  query ListMatriculaDocenteGrupos($uid: String!) {
    users(where: { documentId: { eq: $uid } }, limit: 1) {
      id
    }
    personals(limit: 10000) {
      id
      userId
    }
    semestres(limit: 500) {
      id
      titulo
      inicio
      fin
    }
    grupoModulos(limit: 3000) {
      id
      nombre
      orden
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
        titulo
        tituloComercial
      }
    }
  }
`;

const LIST_MODULO_ESTUDIANTES_FOR_MATRICULAS_QUERY = `
  query ListModuloEstudiantesForMatriculas {
    modulosEstudiantes(limit: 200000) {
      matriculaId
      grupoId
      moduloId
    }
  }
`;

const GET_MATRICULA_QUERY = `
  query GetMatriculaManual($id: Int!) {
    matricula(id: $id) {
      ${MATRICULA_FIELDS}
    }
  }
`;

const LIST_MATRICULA_PAQUETES_BY_SEMESTRE_QUERY = `
  query ListMatriculaPaquetesBySemestre($semestreId: Int!) {
    grupos(where: { semestreId: { eq: $semestreId }, archivado: { ne: true } }, limit: 500) {
      id
      nombreDisplay
      grupoOrd
      paqueteId
      paquete {
        id
        titulo
        descripcion
        archivado
      }
    }
  }
`;

const LIST_MATRICULA_SEMESTRES_QUERY = `
  query ListMatriculaSemestres {
    semestres(limit: 500) {
      id
      titulo
      inicio
      fin
      archivado
      anio {
        id
        nombre
        titulo
      }
    }
  }
`;

const GET_FORMULARIO_MATRICULA_SETTING_QUERY = `
  query GetFormularioMatriculaSetting($settingKey: String!) {
    appSettings(where: { settingKey: { eq: $settingKey } }, limit: 1) {
      id
      settingKey
      boolValue
      intValue
    }
  }
`;

const GET_GRUPOS_BY_SEMESTRE_PAQUETE_QUERY = `
  query GetGruposBySemestrePaquete($semestreId: Int!, $paqueteId: Int!) {
    grupos(where: { semestreId: { eq: $semestreId }, paqueteId: { eq: $paqueteId }, archivado: { ne: true } }, limit: 20) {
      id
      grupoOrd
      workspaceCorreo
      paqueteId
      paquete {
        id
        archivado
      }
    }
  }
`;

const GET_GRUPO_MODULOS_FOR_MATRICULA_QUERY = `
  query GetGrupoModulosForMatricula($grupoId: Int!) {
    grupoModulos(where: { grupoId: { eq: $grupoId } }, limit: 10) {
      id
      nombre
      orden
      obligatorio
      grupoId
      moduloId
      modulo {
        titulo
        tituloComercial
        orden
      }
    }
  }
`;

const GET_MATRICULA_WORKSPACE_GROUPS_QUERY = `
  query GetMatriculaWorkspaceGroups($matriculaId: Int!) {
    modulosEstudiantes(where: { matriculaId: { eq: $matriculaId } }, limit: 20) {
      grupoId
      grupo {
        id
        workspaceCorreo
      }
    }
  }
`;

const LIST_MODULO_ESTUDIANTES_BY_GROUP_QUERY = `
  query ListModuloEstudiantesByGroup($grupoId: Int!) {
    modulosEstudiantes(where: { grupoId: { eq: $grupoId } }, limit: 500) {
      matriculaId
      matricula {
        id
        userId
        archivado
      }
    }
  }
`;

const CHECK_RECIBO_MATRICULA_QUERY = `
  query CheckReciboMatricula($recibo: String!) {
    matriculas(where: { recibo: { eq: $recibo } }, limit: 1) {
      id
    }
  }
`;

const CHECK_DUPLICATE_MATRICULA_QUERY = `
  query CheckDuplicateMatricula($userId: Int!, $semestreId: Int!, $paqueteId: Int!) {
    matriculas(where: { userId: { eq: $userId }, semestreId: { eq: $semestreId }, paqueteId: { eq: $paqueteId } }, limit: 1) {
      id
    }
  }
`;

const VALID_RECIBO_TEXT_VALUES = new Set(["CONADIS", "BECADO"]);

function normalizeMatriculaRecibo(value: unknown): string | null {
  const text = asCleanString(value)?.toUpperCase().replace(/\s+/g, "") ?? null;
  if (!text) return null;
  if (VALID_RECIBO_TEXT_VALUES.has(text)) return text;
  if (/^\d{1,5}$/.test(text)) return text;
  throw new https.HttpsError("invalid-argument", "El recibo debe ser CONADIS, BECADO o un numero de hasta 5 digitos.");
}

const sortPaqueteModulos = (items: DataConnectPaqueteModulo[]) =>
  items
    .slice()
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || a.moduloId - b.moduloId);

const normalizeText = (value: unknown): string =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const normalizeDocumentType = (value: unknown): "DNI" | "CE" | null => {
  const text = normalizeText(value).replace(/[^a-z0-9]/g, "");
  if (!text) return null;
  if (text.includes("extranjeria") || text === "ce" || text.includes("carnet")) return "CE";
  if (text.includes("dni") || text.includes("documentonacional") || text.includes("cui")) return "DNI";
  return null;
};

const normalizeDocumentNumber = (value: unknown): string =>
  String(value ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

const asCleanString = (value: unknown): string | null => {
  const text = String(value ?? "").trim().replace(/\s+/g, " ");
  return text ? text : null;
};

const normalizeDate = (value: unknown): string | null => {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(raw);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  return null;
};

function parseDateOnly(value: unknown): Date | null {
  const normalized = normalizeDate(value);
  if (!normalized) return null;
  const [year, month, day] = normalized.split("-").map((item) => Number(item));
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function todayDateOnly(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function isExpiredDate(value: unknown, now = new Date()): boolean {
  const date = parseDateOnly(value);
  if (!date) return false;
  return date.getTime() < todayDateOnly(now).getTime();
}

function assertDocumentNotExpired(fechaVencimiento: unknown) {
  if (isExpiredDate(fechaVencimiento)) {
    throw new https.HttpsError("failed-precondition", "Documento vencido.");
  }
}

const normalizePeruDevsSexo = (value: unknown): "F" | "M" | null => {
  const text = String(value ?? "").trim().toUpperCase();
  if (text === "M" || text.startsWith("MASC")) return "M";
  if (text === "F" || text.startsWith("FEM")) return "F";
  return null;
};

function getPeruDevsDniApiKey() {
  const configured = String(process.env.PERUDEVS_DNI_API_KEY || "").trim();
  if (configured) return configured;
  return [
    "cGVydWRldnMucHJvZHVjdGlvbi5maXRjb2RlcnMu",
    "NjlmOTVkMTcxYzlhY2M1YmI0MjI2YWYz",
  ].join("");
}

async function fetchPeruDevsDni(dni: string) {
  const key = getPeruDevsDniApiKey();
  if (!key) {
    throw new https.HttpsError("failed-precondition", "No esta configurado el token para consultar DNI.");
  }

  const url = new URL("https://api.perudevs.com/api/v1/dni/complete");
  url.searchParams.set("document", dni);
  url.searchParams.set("key", key);

  const response = await fetch(url);
  if (!response.ok) {
    throw new https.HttpsError("unavailable", "No se pudo consultar el DNI en este momento.");
  }

  const payload = await response.json() as PeruDevsDniResponse;
  if (!payload.estado || !payload.resultado?.id) {
    throw new https.HttpsError("not-found", "No se encontraron datos para el DNI ingresado.");
  }
  return payload.resultado;
}

const isEmptyValue = (value: unknown): boolean => {
  if (value === undefined || value === null) return true;
  return String(value).trim() === "";
};

function mergeSavedUserWithOcr(saved: MatriculaUserRow | null, ocr: OcrIdentityData): OcrIdentityData {
  const result: OcrIdentityData = { ...ocr };
  const keys: Array<keyof OcrIdentityData> = [
    "tipoDocumento",
    "dni",
    "nombre",
    "apellidoPaterno",
    "apellidoMaterno",
    "sexo",
    "nacionalidad",
    "fechaNacimiento",
    "estadoCivil",
    "direccion",
    "distrito",
  ];

  for (const key of keys) {
    const savedValue = saved?.[key];
    if (!isEmptyValue(savedValue)) {
      result[key] = String(savedValue);
    }
  }

  return result;
}

async function findUserByDocument(tipoDocumento: string, dni: string): Promise<MatriculaUserRow | null> {
  const response = await dataConnect.executeGraphql<{
    users: MatriculaUserRow[];
  }, { tipoDocumento: string; dni: string }>(
    FIND_USER_BY_DOCUMENT_QUERY,
    { variables: { tipoDocumento, dni } },
  );

  return response.data.users?.[0] ?? null;
}

const sortMatriculaSemestres = (items: MatriculaSemestreOption[]) =>
  items
    .slice()
    .sort((a, b) =>
      String(a.anio?.nombre ?? a.anio?.titulo ?? "").localeCompare(
        String(b.anio?.nombre ?? b.anio?.titulo ?? ""),
        "es",
        { numeric: true },
      ) ||
      String(a.titulo ?? "").localeCompare(String(b.titulo ?? ""), "es", { numeric: true }) ||
      a.id - b.id,
    );

const addMatriculaSemestreDerivedFields = (semestre: MatriculaSemestreOption): MatriculaSemestreOption => ({
  ...semestre,
  anioTitulo: semestre.anio?.nombre ?? semestre.anio?.titulo ?? null,
});

async function requireMatriculaSemestreAccess(context: https.CallableContext) {
  if (await hasPermission(context, "matriculas", "view")) return;
  if (await hasPermission(context, "matriculas", "create")) return;
  throw new https.HttpsError("permission-denied", "No tienes permiso para cargar periodos de matricula.");
}

async function hasMatriculaPermissionSafe(context: https.CallableContext, action: "view" | "create" | "edit" | "delete") {
  try {
    return await hasPermission(context, "matriculas", action);
  } catch (error) {
    if (error instanceof https.HttpsError && error.code === "unauthenticated") return false;
    throw error;
  }
}

async function requireFormularioMatriculaAccess(context: https.CallableContext) {
  await getMatriculaResponsableFromContext(context);
}

async function requireMatriculaPermissionOrFormularioAccess(context: https.CallableContext, action: "view" | "create") {
  if (await hasMatriculaPermissionSafe(context, action)) return;
  await requireFormularioMatriculaAccess(context);
}

async function requireFormularioMatriculaOpen() {
  const response = await dataConnect.executeGraphql<{
    appSettings: Array<{ id: number; boolValue?: boolean | null }>;
  }, { settingKey: string }>(
    GET_FORMULARIO_MATRICULA_SETTING_QUERY,
    { variables: { settingKey: FORMULARIO_MATRICULA_ACEPTA_RESPUESTAS_KEY } },
  );
  if (!Boolean(response.data.appSettings?.[0]?.boolValue)) {
    throw new https.HttpsError("failed-precondition", "El formulario no acepta respuestas en este momento.");
  }
}

async function getFormularioMatriculaSettingsData() {
  const [acceptsResponse, legacyAcceptsResponse, semestreResponse] = await Promise.all([
    dataConnect.executeGraphql<{
      appSettings: Array<{ id: number; boolValue?: boolean | null }>;
    }, { settingKey: string }>(
      GET_FORMULARIO_MATRICULA_SETTING_QUERY,
      { variables: { settingKey: FORMULARIO_MATRICULA_ACEPTA_RESPUESTAS_KEY } },
    ),
    dataConnect.executeGraphql<{
      appSettings: Array<{ id: number; boolValue?: boolean | null }>;
    }, { settingKey: string }>(
      GET_FORMULARIO_MATRICULA_SETTING_QUERY,
      { variables: { settingKey: FORMULARIO_MATRICULA_ACEPTA_RESPUESTAS_LEGACY_KEY } },
    ),
    dataConnect.executeGraphql<{
      appSettings: Array<{ id: number; intValue?: number | null }>;
    }, { settingKey: string }>(
      GET_FORMULARIO_MATRICULA_SETTING_QUERY,
      { variables: { settingKey: FORMULARIO_MATRICULA_SEMESTRE_ID_KEY } },
    ),
  ]);
  const acceptsResponses = acceptsResponse.data.appSettings?.length
    ? Boolean(acceptsResponse.data.appSettings[0]?.boolValue)
    : Boolean(legacyAcceptsResponse.data.appSettings?.[0]?.boolValue);
  const semestreId = Number(semestreResponse.data.appSettings?.[0]?.intValue);

  return {
    formularioMatricula: {
      aceptaRespuestas: acceptsResponses,
      semestreId: Number.isFinite(semestreId) && semestreId > 0 ? semestreId : null,
    },
  };
}

function toTimestamp(value: string | null | undefined) {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function resolveMatriculaSemestreTitulo(
  semestres: MatriculaSemestreOption[],
  requestedTitulo?: string | null,
) {
  const explicitTitulo = String(requestedTitulo ?? "").trim();
  if (explicitTitulo) return explicitTitulo;

  const now = Date.now();
  const datedSemestres = semestres
    .map((semestre) => ({
      semestre,
      inicio: toTimestamp(semestre.inicio),
      fin: toTimestamp(semestre.fin),
    }))
    .filter((item) => item.semestre.titulo);

  const active = datedSemestres
    .filter((item) =>
      (item.inicio != null || item.fin != null) &&
      (item.inicio == null || item.inicio <= now) &&
      (item.fin == null || item.fin >= now),
    )
    .sort((a, b) => (b.inicio ?? 0) - (a.inicio ?? 0))[0]?.semestre.titulo;
  if (active) return active;

  return semestres
    .slice()
    .sort((a, b) =>
      String(b.titulo ?? "").localeCompare(String(a.titulo ?? ""), "es", { numeric: true }) ||
      b.id - a.id,
    )[0]?.titulo ?? "";
}

function matchesSemestreTitulo(value: string | null | undefined, expected: string | null | undefined) {
  const left = normalizeText(value);
  const right = normalizeText(expected);
  return Boolean(left && right && left === right);
}

function isDocenteMatriculaRequester(context: https.CallableContext) {
  return !isSuperUserContext(context) && getRequesterRoleId(context) === 4;
}

function getPersonalIdsForMatriculaUser(
  userId: number | null | undefined,
  personals: Array<{ id: number; userId?: number | null }>,
) {
  if (!userId) return new Set<number>();
  return new Set(
    personals
      .filter((personal) => personal.userId === userId)
      .map((personal) => personal.id),
  );
}

function sortMatriculaDocenteGrupoModulos(items: MatriculaDocenteGrupoModulo[]) {
  return items
    .slice()
    .sort((a, b) =>
      String(a.grupo?.semestre?.titulo ?? "").localeCompare(String(b.grupo?.semestre?.titulo ?? ""), "es", { numeric: true }) ||
      String(a.grupo?.nombreDisplay ?? "").localeCompare(String(b.grupo?.nombreDisplay ?? ""), "es", { numeric: true }) ||
      String(a.nombre || a.modulo?.titulo || a.modulo?.tituloComercial || "").localeCompare(
        String(b.nombre || b.modulo?.titulo || b.modulo?.tituloComercial || ""),
        "es",
        { numeric: true },
      ) ||
      (a.orden ?? 0) - (b.orden ?? 0) ||
      a.id - b.id,
    );
}

function filterMatriculaDocenteGrupoModulos(params: {
  context: https.CallableContext;
  userId?: number | null;
  personals: Array<{ id: number; userId?: number | null }>;
  grupoModulos: MatriculaDocenteGrupoModulo[];
  semestreTitulo?: string | null;
}) {
  const semestreTitulo = String(params.semestreTitulo ?? "").trim();
  const bySemestre = semestreTitulo
    ? params.grupoModulos.filter((item) => matchesSemestreTitulo(item.grupo?.semestre?.titulo, semestreTitulo))
    : params.grupoModulos;

  if (!isDocenteMatriculaRequester(params.context)) {
    return bySemestre;
  }

  const personalIds = getPersonalIdsForMatriculaUser(params.userId, params.personals);
  return bySemestre.filter((item) =>
    Boolean(item.grupo?.personalId && personalIds.has(item.grupo.personalId)),
  );
}

async function loadMatriculaDocenteGrupoModulos(context: https.CallableContext, semestreTituloInput?: string | null) {
  const uid = context.auth?.uid;
  if (!uid) {
    throw new https.HttpsError("unauthenticated", "Debes iniciar sesion.");
  }

  const response = await dataConnect.executeGraphql<{
    users: Array<{ id: number }>;
    personals: Array<{ id: number; userId?: number | null }>;
    semestres: MatriculaSemestreOption[];
    grupoModulos: MatriculaDocenteGrupoModulo[];
  }, { uid: string }>(
    LIST_MATRICULA_DOCENTE_GRUPOS_QUERY,
    { variables: { uid } },
  );

  const semestreTitulo = resolveMatriculaSemestreTitulo(response.data.semestres ?? [], semestreTituloInput);
  const grupoModulos = sortMatriculaDocenteGrupoModulos(filterMatriculaDocenteGrupoModulos({
    context,
    userId: response.data.users?.[0]?.id,
    personals: response.data.personals ?? [],
    grupoModulos: response.data.grupoModulos ?? [],
    semestreTitulo,
  }));

  return { grupoModulos, semestreTitulo };
}

function getResponsableDisplayName(responsable: MatriculaResponsableRow | null | undefined) {
  return asCleanString(responsable?.displayName)
    ?? asCleanString(responsable?.user?.username)
    ?? asCleanString([responsable?.user?.apellidoPaterno, responsable?.user?.apellidoMaterno, responsable?.user?.nombre]
      .filter(Boolean)
      .join(" "))
    ?? asCleanString(responsable?.user?.correoInstitucional)
    ?? asCleanString(responsable?.user?.email)
    ?? null;
}

function getResponsableUserDisplayName(user: MatriculaResponsableUserRow | null | undefined) {
  return asCleanString(user?.username)
    ?? asCleanString([user?.apellidoPaterno, user?.apellidoMaterno, user?.nombre].filter(Boolean).join(" "))
    ?? asCleanString(user?.correoInstitucional)
    ?? asCleanString(user?.email)
    ?? null;
}

async function getMatriculaResponsableFromContext(context: https.CallableContext): Promise<{
  responsable: MatriculaResponsableRow | null;
  responsableUser: MatriculaResponsableUserRow;
}> {
  const documentId = asCleanString(context.auth?.uid);
  if (!documentId) {
    throw new https.HttpsError("unauthenticated", "Debes iniciar sesion para registrar matriculas.");
  }

  const userResponse = await dataConnect.executeGraphql<{
    users: MatriculaResponsableUserRow[];
  }, { documentId: string }>(
    FIND_USER_BY_DOCUMENT_ID_FOR_MATRICULA_QUERY,
    { variables: { documentId } },
  );
  const responsableUser = userResponse.data.users?.[0] ?? null;
  if (!responsableUser?.id) {
    throw new https.HttpsError("failed-precondition", "Tu usuario no esta registrado en la aplicacion.");
  }

  const personalResponse = await dataConnect.executeGraphql<{
    personals: MatriculaResponsableRow[];
  }, { userId: number }>(
    GET_PERSONAL_BY_USER_ID_FOR_MATRICULA_QUERY,
    { variables: { userId: responsableUser.id } },
  );
  const responsable = personalResponse.data.personals?.[0] ?? null;
  if (!responsable?.id && !isSuperUserContext(context)) {
    throw new https.HttpsError("permission-denied", "Solo el personal o superusuario puede llenar matriculas.");
  }

  return { responsable, responsableUser };
}

export const getMatriculaResponsableActual = https.onCall(async (_data, context) => {
  await requirePermission(context, "matriculas", "create");

  try {
    const { responsable, responsableUser } = await getMatriculaResponsableFromContext(context);
    return {
      responsable: responsable ? {
        ...responsable,
        displayName: getResponsableDisplayName(responsable),
      } : null,
      responsableUser: {
        ...responsableUser,
        username: getResponsableUserDisplayName(responsableUser),
      },
    };
  } catch (error) {
    if (error instanceof https.HttpsError) throw error;
    console.error("Error in getMatriculaResponsableActual:", error);
    throw new https.HttpsError("internal", "No se pudo cargar el responsable de la matricula.");
  }
});

export const getFormularioMatriculaResponsableActual = https.onCall(async (_data, context) => {
  try {
    const { responsable, responsableUser } = await getMatriculaResponsableFromContext(context);
    return {
      responsable: responsable ? {
        ...responsable,
        displayName: getResponsableDisplayName(responsable),
      } : null,
      responsableUser: {
        ...responsableUser,
        username: getResponsableUserDisplayName(responsableUser),
      },
    };
  } catch (error) {
    if (error instanceof https.HttpsError) throw error;
    console.error("Error in getFormularioMatriculaResponsableActual:", error);
    throw new https.HttpsError("internal", "No se pudo cargar el responsable de la matricula.");
  }
});

export const getFormularioMatriculaConfiguracion = https.onCall(async (_data, context) => {
  await requireFormularioMatriculaAccess(context);

  try {
    const [settings, semestresResponse] = await Promise.all([
      getFormularioMatriculaSettingsData(),
      dataConnect.executeGraphql<{
        semestres: MatriculaSemestreOption[];
      }, Record<string, never>>(
        LIST_MATRICULA_SEMESTRES_QUERY,
      ),
    ]);

    return {
      settings,
      semestres: sortMatriculaSemestres(semestresResponse.data.semestres ?? []).map(addMatriculaSemestreDerivedFields),
    };
  } catch (error) {
    console.error("Error in getFormularioMatriculaConfiguracion:", error);
    throw new https.HttpsError("internal", "No se pudo cargar la configuracion del formulario de matricula.");
  }
});

export const listMatriculaSemestres = https.onCall(async (_data, context) => {
  await requireMatriculaSemestreAccess(context);

  try {
    const response = await dataConnect.executeGraphql<{
      semestres: MatriculaSemestreOption[];
    }, Record<string, never>>(
      LIST_MATRICULA_SEMESTRES_QUERY,
    );
    return {
      semestres: sortMatriculaSemestres(response.data.semestres ?? []).map(addMatriculaSemestreDerivedFields),
    };
  } catch (error) {
    console.error("Error in listMatriculaSemestres:", error);
    throw new https.HttpsError("internal", "No se pudieron cargar los periodos de matricula.");
  }
});

export const listFormularioMatriculaSemestres = https.onCall(async (_data, context) => {
  await requireFormularioMatriculaAccess(context);

  try {
    const response = await dataConnect.executeGraphql<{
      semestres: MatriculaSemestreOption[];
    }, Record<string, never>>(
      LIST_MATRICULA_SEMESTRES_QUERY,
    );
    return {
      semestres: sortMatriculaSemestres(response.data.semestres ?? []).map(addMatriculaSemestreDerivedFields),
    };
  } catch (error) {
    console.error("Error in listFormularioMatriculaSemestres:", error);
    throw new https.HttpsError("internal", "No se pudieron cargar los periodos de matricula.");
  }
});

async function getMatriculaById(matriculaId: number): Promise<MatriculaRow | null> {
  const response = await dataConnect.executeGraphql<{
    matricula: MatriculaRow | null;
  }, { id: number }>(
    GET_MATRICULA_QUERY,
    { variables: { id: matriculaId } },
  );

  return response.data.matricula ?? null;
}

function getStoragePathFromDownloadUrl(value: string | null | undefined): string | undefined {
  const raw = asCleanString(value);
  if (!raw) return undefined;

  try {
    const url = new URL(raw);
    const marker = "/o/";
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex < 0) return undefined;
    const encodedPath = url.pathname.slice(markerIndex + marker.length);
    return decodeURIComponent(encodedPath);
  } catch {
    return undefined;
  }
}

function isLocalStorageUrl(value: string | null | undefined): boolean {
  const raw = asCleanString(value);
  if (!raw) return false;
  try {
    const hostname = new URL(raw).hostname.toLowerCase();
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname.startsWith("127.");
  } catch {
    return false;
  }
}

function hasUsableStoredDocumentImages(user: MatriculaUserRow | null): boolean {
  const frontUrl = asCleanString(user?.dniImagenFrenteUrl);
  const backUrl = asCleanString(user?.dniImagenReversoUrl);
  return Boolean(
    frontUrl
    && backUrl
    && !isLocalStorageUrl(frontUrl)
    && !isLocalStorageUrl(backUrl),
  );
}

function getDocumentImagePolicy(user: MatriculaUserRow | null) {
  const userHasStoredImages = hasUsableStoredDocumentImages(user);
  const fechaVencimiento = normalizeDate(user?.fechaVencimiento);
  const storedDocumentExpired = Boolean(fechaVencimiento && isExpiredDate(fechaVencimiento));
  const shouldPersistDocumentImages = !userHasStoredImages || !fechaVencimiento || storedDocumentExpired;
  let reason = "existing_images_current";
  if (!userHasStoredImages) {
    reason = "missing_stored_images";
  } else if (!fechaVencimiento) {
    reason = "missing_stored_expiration";
  } else if (storedDocumentExpired) {
    reason = "stored_document_expired";
  }

  return {
    userHasStoredImages,
    fechaVencimiento,
    storedDocumentExpired,
    shouldPersistDocumentImages,
    reason,
  };
}

function hasUploadedDocumentImageInput(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const raw = value as Record<string, unknown>;
  return Boolean(asCleanString(raw.path) || asCleanString(raw.url));
}

function getUploadedImage(value: unknown, fallbackUrl?: string | null): UploadedDocumentImage {
  if (!value || typeof value !== "object") {
    const fallback = asCleanString(fallbackUrl);
    if (!fallback) return {};
    const path = getStoragePathFromDownloadUrl(fallback);
    return {
      path,
      url: fallback,
      contentType: detectDocumentContentType(path ?? fallback),
      isNewUpload: false,
    };
  }

  const raw = value as Record<string, unknown>;
  const path = asCleanString(raw.path) ?? getStoragePathFromDownloadUrl(asCleanString(raw.url));
  const url = asCleanString(raw.url) ?? asCleanString(fallbackUrl);
  return {
    path,
    url,
    contentType: asCleanString(raw.contentType) ?? detectDocumentContentType(path ?? url ?? ""),
    isNewUpload: hasUploadedDocumentImageInput(value),
  };
}

function toJsonValue(value: unknown): JsonValue {
  if (value === undefined || value === null) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map(toJsonValue);
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entryValue]) => entryValue !== undefined)
        .map(([key, entryValue]) => [key, toJsonValue(entryValue)]),
    );
  }
  return String(value);
}

function getDocumentoAnalisisMetadata(value: unknown): DocumentoAnalisisMetadata | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const archivos = Array.isArray(raw.archivos)
    ? raw.archivos
      .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
      .map((item) => item as unknown as DocumentoArchivoMetadata)
    : [];

  return {
    motor: asCleanString(raw.motor),
    pdfDuplicadoConDeteccionDeCuerpos: Boolean(raw.pdfDuplicadoConDeteccionDeCuerpos),
    archivos,
    respuestaGemini: raw.respuestaGemini && typeof raw.respuestaGemini === "object"
      ? raw.respuestaGemini as Record<string, unknown>
      : null,
  };
}

function getDocumentoArchivoMetadata(
  metadata: DocumentoAnalisisMetadata | null,
  side: "frente" | "reverso",
): DocumentoArchivoMetadata | null {
  const expected = side === "frente" ? "frente" : "reverso";
  return (metadata?.archivos ?? []).find((archivo) =>
    normalizeText(archivo.ladoAsignado).includes(expected)
    || normalizeText(archivo.gemini?.tipoLado).includes(expected),
  ) ?? null;
}

function buildDocumentProcessingSide(
  side: "frente" | "reverso",
  source: UploadedDocumentImage,
  metadata: DocumentoArchivoMetadata | null,
): MatriculaDocumentProcessingSide | null {
  if (!source.url && !source.path) return null;

  const hasTwoBodies = Boolean(metadata?.gemini?.tieneDosCuerpos);
  const selectedArea = asCleanString(metadata?.gemini?.areaLectura) ?? "completa";

  return {
    side,
    source,
    metadata,
    hasTwoBodies,
    selectedArea,
    instructions: {
      twoBodies: hasTwoBodies
        ? `El archivo tiene dos cuerpos. Trabaja solo con el cuerpo del area '${selectedArea}' asignado a '${side}' y descarta visualmente el otro cuerpo.`
        : "El archivo tiene un solo cuerpo. Procesa el documento completo.",
      orientation: "Corrige la orientacion del DNI para dejarlo perfectamente horizontal.",
      perspective: "Corrige la perspectiva para obtener un rectangulo proporcional 8.6:5.4, conservando la mayor resolucion posible.",
      crop: "Recorta perfectamente el DNI detectando sus bordes.",
      enhancement: "Mejora brillo, contraste y nitidez sin perder legibilidad.",
      output: `Guarda la imagen procesada del lado '${side}' y devuelve su nuevo vinculo si se genera.`,
    },
  };
}

async function enqueueMatriculaDocumentProcessingJob(params: {
  matriculaId: number | null;
  userId: number;
  tipoDocumento: string;
  dni: string;
  fechaNacimiento?: string | null;
  frente: UploadedDocumentImage;
  reverso: UploadedDocumentImage;
  dniImagenFrenteProcesadaUrl?: string | null;
  dniImagenReversoProcesadaUrl?: string | null;
  analisisDocumentoTemporal: DocumentoAnalisisMetadata | null;
}) {
  const frontMetadata = getDocumentoArchivoMetadata(params.analisisDocumentoTemporal, "frente");
  const backMetadata = getDocumentoArchivoMetadata(params.analisisDocumentoTemporal, "reverso");
  const shouldProcessFront = params.frente.isNewUpload || !asCleanString(params.dniImagenFrenteProcesadaUrl);
  const shouldProcessBack = params.reverso.isNewUpload || !asCleanString(params.dniImagenReversoProcesadaUrl);
  const sides = [
    shouldProcessFront ? buildDocumentProcessingSide("frente", params.frente, frontMetadata) : null,
    shouldProcessBack ? buildDocumentProcessingSide("reverso", params.reverso, backMetadata) : null,
  ].filter((side): side is MatriculaDocumentProcessingSide => Boolean(side));

  if (!sides.length) {
    console.info("matricula_document_processing_skipped", {
      matriculaId: params.matriculaId,
      userId: params.userId,
      dni: params.dni,
      frenteIsNewUpload: Boolean(params.frente.isNewUpload),
      reversoIsNewUpload: Boolean(params.reverso.isNewUpload),
      hasFrenteProcesada: Boolean(asCleanString(params.dniImagenFrenteProcesadaUrl)),
      hasReversoProcesada: Boolean(asCleanString(params.dniImagenReversoProcesadaUrl)),
    });
    return null;
  }

  const now = new Date().toISOString();
  const job = {
    status: "queued",
    createdAt: now,
    updatedAt: now,
    source: "matricula",
    matriculaId: params.matriculaId,
    userId: params.userId,
    tipoDocumento: params.tipoDocumento,
    dni: params.dni,
    fechaNacimiento: normalizeDate(params.fechaNacimiento),
    analisisDocumentoTemporal: params.analisisDocumentoTemporal,
    sides,
    processor: {
      target: "cloud-run-opencv",
      urlConfigured: Boolean(asCleanString(process.env.MATRICULA_DOCUMENT_PROCESSOR_URL)),
      expectedOutput: {
        frente: "imagen DNI frente recortada, rectangular, alineada y mejorada",
        reverso: "imagen DNI reverso recortada, rectangular, alineada y mejorada",
      },
    },
  };

  const ref = await getFirestore()
    .collection(MATRICULA_DOCUMENT_PROCESSING_COLLECTION)
    .add(toJsonValue(job) as FirebaseFirestore.DocumentData);
  console.info("matricula_document_processing_queued", {
    jobId: ref.id,
    matriculaId: params.matriculaId,
    userId: params.userId,
    dni: params.dni,
    sides: sides.map((item) => ({
      side: item.side,
      hasPath: Boolean(asCleanString(item.source.path)),
      hasUrl: Boolean(asCleanString(item.source.url)),
      contentType: item.source.contentType ?? null,
      isNewUpload: Boolean(item.source.isNewUpload),
      hasTwoBodies: item.hasTwoBodies,
      selectedArea: item.selectedArea,
    })),
  });
  return ref.id;
}

function getProcessedImageUrls(processorResult: JsonValue): {
  dniImagenFrenteProcesadaUrl?: string;
  dniImagenReversoProcesadaUrl?: string;
} {
  if (!processorResult || typeof processorResult !== "object" || Array.isArray(processorResult)) return {};
  const outputs = Array.isArray(processorResult.outputs) ? processorResult.outputs : [];
  const result: {
    dniImagenFrenteProcesadaUrl?: string;
    dniImagenReversoProcesadaUrl?: string;
  } = {};

  for (const output of outputs) {
    if (!output || typeof output !== "object" || Array.isArray(output)) continue;
    const side = normalizeText(output.side);
    const outputImage = output.output;
    if (!outputImage || typeof outputImage !== "object" || Array.isArray(outputImage)) continue;
    const url = asCleanString(outputImage.url);
    if (!url) continue;

    if (side.includes("frente")) {
      result.dniImagenFrenteProcesadaUrl = url;
    } else if (side.includes("reverso")) {
      result.dniImagenReversoProcesadaUrl = url;
    }
  }

  return result;
}

function getProcessedDocumentOutput(
  processorResult: JsonValue,
  expectedSide: "frente" | "reverso",
): ProcessedDocumentOutput | null {
  if (!processorResult || typeof processorResult !== "object" || Array.isArray(processorResult)) return null;
  const outputs = Array.isArray(processorResult.outputs) ? processorResult.outputs : [];

  for (const output of outputs) {
    if (!output || typeof output !== "object" || Array.isArray(output)) continue;
    if (!normalizeText(output.side).includes(expectedSide)) continue;
    const outputImage = output.output;
    if (!outputImage || typeof outputImage !== "object" || Array.isArray(outputImage)) continue;
    const raw = outputImage as Record<string, unknown>;
    return {
      path: asCleanString(raw.path),
      url: asCleanString(raw.url),
      bucket: asCleanString(raw.bucket),
      contentType: asCleanString(raw.contentType),
    };
  }

  return null;
}

async function enqueueMatriculaAvatarExtractionJob(params: {
  userId: unknown;
  dni: string;
  fechaNacimiento?: string | null;
  documentProcessingJobId: string;
  frenteProcesado: ProcessedDocumentOutput | null;
}) {
  const userId = toNumberOrNull(params.userId);
  if (!userId || !params.frenteProcesado?.path) return null;

  const now = new Date().toISOString();
  const ref = await getFirestore()
    .collection(MATRICULA_AVATAR_EXTRACTION_COLLECTION)
    .add(toJsonValue({
      status: "queued",
      createdAt: now,
      updatedAt: now,
      source: "matricula_document_processing",
      userId,
      dni: params.dni,
      fechaNacimiento: normalizeDate(params.fechaNacimiento),
      documentProcessingJobId: params.documentProcessingJobId,
      frenteProcesado: params.frenteProcesado,
    }) as FirebaseFirestore.DocumentData);

  console.info("matricula_avatar_extraction_queued", {
    jobId: ref.id,
    userId,
    dni: params.dni,
    fechaNacimiento: normalizeDate(params.fechaNacimiento),
    sourcePath: params.frenteProcesado.path,
  });
  return ref.id;
}

async function downloadProcessedImage(source: ProcessedDocumentOutput): Promise<{
  buffer: Buffer;
  bucketName: string;
}> {
  const bucketName = source.bucket ?? getStorage().bucket().name;
  const path = asCleanString(source.path);
  if (path) {
    const [buffer] = await getStorage().bucket(bucketName).file(path).download();
    return { buffer, bucketName };
  }

  const url = asCleanString(source.url);
  if (!url) throw new Error("No se encontro path ni url del frente procesado.");
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`No se pudo descargar el frente procesado (${response.status}).`);
  }
  return { buffer: Buffer.from(await response.arrayBuffer()), bucketName };
}

function verticesToCropBox(
  vertices: Array<{ x?: number | null; y?: number | null }> | null | undefined,
  imageWidth: number,
  imageHeight: number,
): AvatarCropBox | null {
  const xs = (vertices ?? []).map((vertex) => Number(vertex.x ?? 0));
  const ys = (vertices ?? []).map((vertex) => Number(vertex.y ?? 0));
  if (!xs.length || !ys.length) return null;

  const minX = Math.max(0, Math.min(...xs));
  const maxX = Math.min(imageWidth, Math.max(...xs));
  const minY = Math.max(0, Math.min(...ys));
  const maxY = Math.min(imageHeight, Math.max(...ys));
  const faceWidth = maxX - minX;
  const faceHeight = maxY - minY;
  if (faceWidth < 20 || faceHeight < 20) return null;

  const centerX = minX + faceWidth / 2;
  const centerY = minY + faceHeight / 2;
  const squareSize = Math.min(
    Math.max(faceWidth, faceHeight) * 2.25,
    Math.min(imageWidth, imageHeight),
  );
  const left = Math.max(0, Math.min(imageWidth - squareSize, centerX - squareSize / 2));
  const top = Math.max(0, Math.min(imageHeight - squareSize, centerY - squareSize * 0.45));

  return {
    left: Math.round(left),
    top: Math.round(top),
    width: Math.round(squareSize),
    height: Math.round(squareSize),
  };
}

async function detectAvatarCropBox(buffer: Buffer): Promise<AvatarCropBox> {
  const metadata = await sharp(buffer).metadata();
  const imageWidth = metadata.width ?? 0;
  const imageHeight = metadata.height ?? 0;
  if (imageWidth <= 0 || imageHeight <= 0) {
    throw new Error("No se pudo leer dimensiones del frente procesado.");
  }

  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const vision = google.vision({ version: "v1", auth });
  const response = await vision.images.annotate({
    requestBody: {
      requests: [
        {
          image: { content: buffer.toString("base64") },
          features: [{ type: "FACE_DETECTION", maxResults: 3 }],
        },
      ],
    },
  });

  const annotations = response.data.responses?.[0]?.faceAnnotations ?? [];
  const bestFace = annotations
    .slice()
    .sort((a, b) => Number(b.detectionConfidence ?? 0) - Number(a.detectionConfidence ?? 0))[0];
  const cropBox = verticesToCropBox(
    bestFace?.fdBoundingPoly?.vertices ?? bestFace?.boundingPoly?.vertices,
    imageWidth,
    imageHeight,
  );
  if (!cropBox) {
    throw new Error("Vision AI no detecto una fotografia/rostro claro en el DNI frente procesado.");
  }
  return cropBox;
}

function resolveAvatarImageProjectId(): string {
  return asCleanString(process.env.MATRICULA_AVATAR_GEMINI_PROJECT_ID)
    ?? asCleanString(process.env.GCLOUD_PROJECT)
    ?? asCleanString(process.env.GOOGLE_CLOUD_PROJECT)
    ?? asCleanString(process.env.DOCUMENT_AI_PROJECT_ID)
    ?? "cetprosmp-2026";
}

function resolveAvatarImageModel(): string {
  return asCleanString(process.env.MATRICULA_AVATAR_GEMINI_IMAGE_MODEL) ?? DEFAULT_AVATAR_IMAGE_MODEL;
}

function resolveAvatarImageLocation(): string {
  return asCleanString(process.env.MATRICULA_AVATAR_GEMINI_LOCATION) ?? DEFAULT_AVATAR_IMAGE_LOCATION;
}

function isGenerativeAvatarEnabled(): boolean {
  const value = normalizeText(process.env.MATRICULA_AVATAR_GENERATIVE_ENABLED);
  return value === "true" || value === "1" || value === "yes" || value === "si";
}

function getLimaDateParts(now = new Date()): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const getPart = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return {
    year: getPart("year"),
    month: getPart("month"),
    day: getPart("day"),
  };
}

function calculateCurrentAge(fechaNacimiento: unknown, now = new Date()): number | null {
  const normalized = normalizeDate(fechaNacimiento);
  if (!normalized) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);
  if (!match) return null;

  const birthYear = Number(match[1]);
  const birthMonth = Number(match[2]);
  const birthDay = Number(match[3]);
  const today = getLimaDateParts(now);
  if (!birthYear || !birthMonth || !birthDay || birthYear > today.year) return null;

  let age = today.year - birthYear;
  if (today.month < birthMonth || (today.month === birthMonth && today.day < birthDay)) {
    age -= 1;
  }
  return age >= 0 && age <= 120 ? age : null;
}

function extractGeneratedImageFromInteraction(interaction: unknown): Buffer {
  const raw = interaction as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          inlineData?: { data?: string | null; mimeType?: string | null } | null;
          inline_data?: { data?: string | null; mime_type?: string | null } | null;
        }> | null;
      } | null;
    }> | null;
  };

  for (const candidate of raw.candidates ?? []) {
    for (const part of candidate.content?.parts ?? []) {
      const data = asCleanString(part.inlineData?.data ?? part.inline_data?.data);
      if (data) return Buffer.from(data, "base64");
    }
  }

  throw new Error("Gemini no devolvio una imagen para el avatar.");
}

async function buildAvatarReferenceImage(params: {
  sourceBuffer: Buffer;
  cropBox: AvatarCropBox;
}): Promise<Buffer> {
  return sharp(params.sourceBuffer)
    .extract(params.cropBox)
    .resize(600, 800, { fit: "cover" })
    .jpeg({ quality: 94 })
    .toBuffer();
}

async function buildDirectCropAvatarImage(params: {
  sourceBuffer: Buffer;
  cropBox: AvatarCropBox;
}): Promise<Buffer> {
  return sharp(params.sourceBuffer)
    .extract(params.cropBox)
    .resize(512, 512, { fit: "cover" })
    .jpeg({ quality: 92 })
    .toBuffer();
}

async function buildOriginalPhotoCropImage(params: {
  sourceBuffer: Buffer;
  cropBox: AvatarCropBox;
}): Promise<Buffer> {
  return sharp(params.sourceBuffer)
    .extract(params.cropBox)
    .jpeg({ quality: 94 })
    .toBuffer();
}

function isWhiteAvatarBackgroundPixel(data: Buffer, index: number): boolean {
  return data[index] >= 242 && data[index + 1] >= 242 && data[index + 2] >= 242;
}

async function removeWhiteAvatarBackgroundFromTopAndSides(buffer: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(buffer)
    .resize(600, 800, { fit: "cover" })
    .flatten({ background: "#FFFFFF" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const width = info.width;
  const height = info.height;
  const pixelCount = width * height;
  const visited = new Uint8Array(pixelCount);
  const queue = new Int32Array(pixelCount);
  let head = 0;
  let tail = 0;

  const enqueueIfBackground = (x: number, y: number) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const pixelIndex = y * width + x;
    if (visited[pixelIndex]) return;
    const dataIndex = pixelIndex * 4;
    if (!isWhiteAvatarBackgroundPixel(data, dataIndex)) return;
    visited[pixelIndex] = 1;
    queue[tail] = pixelIndex;
    tail += 1;
  };

  for (let x = 0; x < width; x += 1) {
    enqueueIfBackground(x, 0);
  }
  const sideSeedHeight = Math.max(1, Math.floor((height * 3) / 4));
  for (let y = 0; y < sideSeedHeight; y += 1) {
    enqueueIfBackground(0, y);
    enqueueIfBackground(width - 1, y);
  }

  while (head < tail) {
    const pixelIndex = queue[head];
    head += 1;
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);
    const dataIndex = pixelIndex * 4;
    data[dataIndex + 3] = 0;

    enqueueIfBackground(x + 1, y);
    enqueueIfBackground(x - 1, y);
    enqueueIfBackground(x, y + 1);
    enqueueIfBackground(x, y - 1);
  }

  return sharp(data, {
    raw: {
      width,
      height,
      channels: 4,
    },
  })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function generateCarnetAvatarImage(params: {
  referenceBuffer: Buffer;
  currentAge: number | null;
}): Promise<{
  buffer: Buffer;
  contentType: string;
  extension: string;
  model: string;
  location: string;
  projectId: string;
  interactionId: string | null;
}> {
  const projectId = resolveAvatarImageProjectId();
  const location = resolveAvatarImageLocation();
  const model = resolveAvatarImageModel();
  const ageInstruction = params.currentAge !== null
    ? `La edad aparente final debe corresponder a la edad actual calculada del usuario: ${params.currentAge} anos.`
    : "Manten la edad aparente de la referencia porque no se recibio fecha de nacimiento valida.";
  let prompt = [
    "Genera una fotografia tipo carnet/retrato a color usando estrictamente la persona de la imagen de referencia.",
    "Objetivo: mejorar la visualizacion, nitidez, iluminacion y color solamente.",
    "Mantén los rasgos faciales, edad aparente, identidad, expresion neutral y proporciones naturales de la referencia.",
    "No embellezcas, no retoques la piel, no cambies facciones, no cambies edad, no cambies genero, no agregues maquillaje ni accesorios nuevos.",
    "Encuadre: rostro y hombros, frontal, estilo documento oficial, fondo claro liso, sin textos, sin logos, sin bordes, sin elementos del DNI.",
    "Salida: retrato vertical 3:4, apariencia fotografica natural.",
  ].join(" ");
  prompt = [
    "Genera una fotografia tipo carnet/retrato a color usando estrictamente la persona de la imagen de referencia.",
    "Objetivo: mejorar la visualizacion, nitidez, iluminacion y color solamente.",
    "Manten los rasgos faciales, identidad, expresion neutral y proporciones naturales de la referencia.",
    "Manten el mismo cabello, largo, volumen, linea de cabello, peinado y color de cabello de la referencia. No inventes ni estilices el peinado.",
    ageInstruction,
    "No embellezcas, no retoques la piel, no cambies facciones principales, no cambies genero, no agregues maquillaje ni accesorios nuevos.",
    "Encuadre: rostro y hombros, frontal, estilo documento oficial, sin textos, sin logos, sin bordes, sin elementos del DNI.",
    "Fondo: blanco puro #FFFFFF, liso y uniforme, sin sombras fuertes, sin textura, sin degradado y sin patron de transparencia.",
    "No uses fondo verde, no uses color chroma key, no uses transparencia y no simules cuadricula de transparencia.",
    "Salida: retrato vertical 3:4, apariencia fotografica natural.",
  ].join(" ");

  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  const accessToken = typeof token === "string" ? token : token?.token;
  if (!accessToken) {
    throw new Error("No se pudo obtener token de acceso para Gemini image generation.");
  }

  const host = location === "global" ? "aiplatform.googleapis.com" : `${location}-aiplatform.googleapis.com`;
  const endpoint = `https://${host}/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: params.referenceBuffer.toString("base64"),
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
        temperature: 0.2,
        imageConfig: {
          aspectRatio: "3:4",
          imageSize: "512",
        },
      },
    }),
  });
  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(`Gemini image generation fallo (${response.status}): ${responseText.slice(0, 500)}`);
  }
  const interaction = JSON.parse(responseText) as unknown;
  const generatedBuffer = extractGeneratedImageFromInteraction(interaction);
  const normalizedBuffer = await removeWhiteAvatarBackgroundFromTopAndSides(generatedBuffer);

  return {
    buffer: normalizedBuffer,
    contentType: "image/png",
    extension: "png",
    model,
    location,
    projectId,
    interactionId: null,
  };
}

function buildFirebaseStorageUrl(bucketName: string, path: string, token: string): string {
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}

async function uploadAvatarImage(params: {
  avatarBuffer: Buffer;
  contentType?: string;
  extension?: string;
  sizeLabel?: string;
  width?: number;
  height?: number;
  bucketName: string;
  userId: number;
  dni: string;
  jobId: string;
}): Promise<{ path: string; url: string; bucket: string; contentType: string }> {
  const safeDni = normalizeDocumentNumber(params.dni) || String(params.userId);
  const contentType = params.contentType ?? "image/jpeg";
  const extension = params.extension ?? (contentType === "image/png" ? "png" : "jpg");
  const sizeLabel = asCleanString(params.sizeLabel) ?? "grande";
  const path = `usuarios/avatars/${safeDni}/avatar-dni-${params.jobId}-${sizeLabel}.${extension}`;
  const token = randomUUID();
  const bucket = getStorage().bucket(params.bucketName);
  const file = bucket.file(path);
  const outputBuffer = params.width && params.height
    ? await sharp(params.avatarBuffer)
      .resize(params.width, params.height, { fit: "cover" })
      .toFormat(contentType === "image/png" ? "png" : "jpeg", contentType === "image/png"
        ? { compressionLevel: 9 }
        : { quality: 90 })
      .toBuffer()
    : params.avatarBuffer;
  await file.save(outputBuffer, {
    contentType,
    metadata: {
      metadata: { firebaseStorageDownloadTokens: token },
    },
  });

  return {
    path,
    url: buildFirebaseStorageUrl(bucket.name, path, token),
    bucket: bucket.name,
    contentType,
  };
}

async function uploadAvatarImages(params: {
  avatarBuffer: Buffer;
  contentType?: string;
  extension?: string;
  bucketName: string;
  userId: number;
  dni: string;
  jobId: string;
}): Promise<{
  grande: { path: string; url: string; bucket: string; contentType: string };
  mediano: { path: string; url: string; bucket: string; contentType: string };
  pequeno: { path: string; url: string; bucket: string; contentType: string };
}> {
  const base = {
    avatarBuffer: params.avatarBuffer,
    contentType: params.contentType,
    extension: params.extension,
    bucketName: params.bucketName,
    userId: params.userId,
    dni: params.dni,
    jobId: params.jobId,
  };
  const [grande, mediano, pequeno] = await Promise.all([
    uploadAvatarImage({ ...base, sizeLabel: "grande" }),
    uploadAvatarImage({ ...base, sizeLabel: "mediano", width: 300, height: 400 }),
    uploadAvatarImage({ ...base, sizeLabel: "pequeno", width: 96, height: 128 }),
  ]);
  return { grande, mediano, pequeno };
}

async function uploadRecorteFotografiaImage(params: {
  cropBuffer: Buffer;
  bucketName: string;
  userId: number;
  dni: string;
  jobId: string;
}): Promise<{ path: string; url: string; bucket: string; contentType: string }> {
  const safeDni = normalizeDocumentNumber(params.dni) || String(params.userId);
  const path = `usuarios/avatars/${safeDni}/recorte-fotografia-dni-${params.jobId}.jpg`;
  const token = randomUUID();
  const bucket = getStorage().bucket(params.bucketName);
  const file = bucket.file(path);
  await file.save(params.cropBuffer, {
    contentType: "image/jpeg",
    metadata: {
      metadata: { firebaseStorageDownloadTokens: token },
    },
  });

  return {
    path,
    url: buildFirebaseStorageUrl(bucket.name, path, token),
    bucket: bucket.name,
    contentType: "image/jpeg",
  };
}

async function processMatriculaAvatarExtractionJob(
  jobId: string,
  job: FirebaseFirestore.DocumentData,
) {
  const ref = getFirestore().collection(MATRICULA_AVATAR_EXTRACTION_COLLECTION).doc(jobId);
  const userId = toNumberOrNull(job.userId);
  const source = job.frenteProcesado && typeof job.frenteProcesado === "object"
    ? job.frenteProcesado as ProcessedDocumentOutput
    : null;

  if (!userId || !source?.path) {
    await ref.update({
      status: "rejected",
      updatedAt: new Date().toISOString(),
      message: "El job no tiene userId o frenteProcesado.path.",
    });
    return;
  }

  await ref.update({ status: "processing", updatedAt: new Date().toISOString() });
  try {
    const { buffer, bucketName } = await downloadProcessedImage(source);
    const cropBox = await detectAvatarCropBox(buffer);
    const generativeAvatarEnabled = isGenerativeAvatarEnabled();
    const currentAge = calculateCurrentAge(job.fechaNacimiento);
    const referenceBuffer = await buildAvatarReferenceImage({ sourceBuffer: buffer, cropBox });
    const recorteFotografiaBuffer = await buildOriginalPhotoCropImage({ sourceBuffer: buffer, cropBox });
    const generatedAvatar = generativeAvatarEnabled
      ? await generateCarnetAvatarImage({
        referenceBuffer,
        currentAge,
      })
      : null;
    const avatarBuffer = generatedAvatar?.buffer
      ?? await buildDirectCropAvatarImage({ sourceBuffer: buffer, cropBox });
    const avatar = await uploadAvatarImages({
      avatarBuffer,
      contentType: generatedAvatar?.contentType,
      extension: generatedAvatar?.extension,
      bucketName,
      userId,
      dni: asCleanString(job.dni) ?? "",
      jobId,
    });
    const recorteFotografia = await uploadRecorteFotografiaImage({
      cropBuffer: recorteFotografiaBuffer,
      bucketName,
      userId,
      dni: asCleanString(job.dni) ?? "",
      jobId,
    });
    await dataConnect.executeGraphql<{ user_update: unknown }, { id: number; data: DataConnectUserInput }>(
      UPDATE_USER_MUTATION,
      { variables: { id: userId, data: { avatar: avatar.grande.url, recorteFotografia: recorteFotografia.url } } },
    );
    await ref.update({
      status: "completed",
      updatedAt: new Date().toISOString(),
      avatar: avatar.grande,
      avatarTamanos: avatar,
      recorteFotografia,
      cropBox,
      generation: {
        mode: generatedAvatar ? "gemini_carnet_color" : "vision_direct_crop",
        model: generatedAvatar?.model ?? null,
        location: generatedAvatar?.location ?? null,
        projectId: generatedAvatar?.projectId ?? null,
        interactionId: generatedAvatar?.interactionId ?? null,
        currentAge,
        fechaNacimiento: normalizeDate(job.fechaNacimiento),
        reference: generatedAvatar ? "dni_frente_procesado_face_crop" : "dni_frente_procesado",
        generativeAvatarEnabled,
      },
      updatedUserId: userId,
    });
    console.info("matricula_avatar_extraction_completed", {
      jobId,
      userId,
      avatarPath: avatar.grande.path,
      avatarMedianoPath: avatar.mediano.path,
      avatarPequenoPath: avatar.pequeno.path,
      cropBox,
      avatarMode: generatedAvatar ? "gemini_carnet_color" : "vision_direct_crop",
      avatarModel: generatedAvatar?.model ?? null,
    });
  } catch (error) {
    await ref.update({
      status: "failed",
      updatedAt: new Date().toISOString(),
      error: String((error as { message?: string } | null)?.message || error),
    });
    console.warn("matricula_avatar_extraction_failed", { jobId, userId, error });
  }
}

async function updateUserProcessedDocumentImages(
  userId: unknown,
  processorResult: JsonValue,
) {
  const numericUserId = toNumberOrNull(userId);
  if (!numericUserId) return null;

  const data = getProcessedImageUrls(processorResult);
  if (!data.dniImagenFrenteProcesadaUrl && !data.dniImagenReversoProcesadaUrl) return null;

  const updated = await dataConnect.executeGraphql<{ user_update: unknown }, { id: number; data: DataConnectUserInput }>(
    UPDATE_USER_MUTATION,
    { variables: { id: numericUserId, data } },
  );
  return getIdFromKeyOutput(updated.data.user_update) ?? numericUserId;
}

async function dispatchMatriculaDocumentProcessingJob(
  jobId: string,
  job: FirebaseFirestore.DocumentData,
) {
  const firestore = getFirestore();
  const ref = firestore.collection(MATRICULA_DOCUMENT_PROCESSING_COLLECTION).doc(jobId);
  const processorUrl = asCleanString(process.env.MATRICULA_DOCUMENT_PROCESSOR_URL);
  const now = new Date().toISOString();

  if (!processorUrl) {
    await ref.update({
      status: "waiting_processor_configuration",
      updatedAt: now,
      message: "Configura MATRICULA_DOCUMENT_PROCESSOR_URL para enviar este job a Cloud Run.",
    });
    return;
  }

  await ref.update({
    status: "dispatching",
    updatedAt: now,
    processorUrl,
  });
  console.info("matricula_document_processing_dispatching", {
    jobId,
    userId: job.userId ?? null,
    dni: job.dni ?? null,
    sides: Array.isArray(job.sides)
      ? job.sides.map((item: unknown) => {
        const side = item && typeof item === "object" ? item as Record<string, unknown> : {};
        const source = side.source && typeof side.source === "object"
          ? side.source as Record<string, unknown>
          : {};
        return {
          side: side.side ?? null,
          hasPath: Boolean(asCleanString(source.path)),
          hasUrl: Boolean(asCleanString(source.url)),
          contentType: source.contentType ?? null,
          hasTwoBodies: side.hasTwoBodies ?? null,
          selectedArea: side.selectedArea ?? null,
        };
      })
      : [],
  });

  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  const processorToken = asCleanString(process.env.MATRICULA_DOCUMENT_PROCESSOR_TOKEN);
  if (processorToken) {
    headers.authorization = `Bearer ${processorToken}`;
  }

  try {
    let responseOk = false;
    let responseStatus = 0;
    let responseText = "";
    const body = {
      jobId,
      ...job,
    };

    if (processorToken) {
      const response = await fetch(processorUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      responseOk = response.ok;
      responseStatus = response.status;
      responseText = await response.text();
    } else {
      const client = await google.auth.getIdTokenClient(processorUrl);
      const response = await client.request({
        url: processorUrl,
        method: "POST",
        headers,
        data: body,
        validateStatus: () => true,
      });
      responseOk = response.status >= 200 && response.status < 300;
      responseStatus = response.status;
      responseText = typeof response.data === "string"
        ? response.data
        : JSON.stringify(response.data ?? {});
    }

    let processorResult: JsonValue = null;
    try {
      processorResult = toJsonValue(JSON.parse(responseText));
    } catch {
      processorResult = null;
    }
    const updatedProcessedImageUserId = responseOk
      ? await updateUserProcessedDocumentImages(job.userId, processorResult)
      : null;
    const avatarExtractionJobId = responseOk
      ? await enqueueMatriculaAvatarExtractionJob({
        userId: job.userId,
        dni: asCleanString(job.dni) ?? "",
        fechaNacimiento: asCleanString(job.fechaNacimiento),
        documentProcessingJobId: jobId,
        frenteProcesado: getProcessedDocumentOutput(processorResult, "frente"),
      })
      : null;
    console.info("matricula_document_processing_response", {
      jobId,
      responseOk,
      responseStatus,
      updatedProcessedImageUserId,
      avatarExtractionJobId,
      responsePreview: responseText.slice(0, 1000),
    });

    await ref.update({
      status: responseOk
        ? (processorResult && typeof processorResult === "object"
          && !Array.isArray(processorResult)
          && processorResult.status === "completed"
          ? "processor_completed"
          : "sent_to_processor")
        : "processor_rejected",
      updatedAt: new Date().toISOString(),
      processorHttpStatus: responseStatus,
      processorResponse: responseText.slice(0, 4000),
      processorResult,
      updatedProcessedImageUserId,
      avatarExtractionJobId,
    });
  } catch (error) {
    const errorResponse = (error as { response?: { status?: number; data?: unknown }; message?: string } | null)?.response;
    const errorData = errorResponse?.data;
    await ref.update({
      status: "processor_dispatch_error",
      updatedAt: new Date().toISOString(),
      processorHttpStatus: errorResponse?.status ?? null,
      processorResponse: typeof errorData === "string"
        ? errorData.slice(0, 4000)
        : errorData
          ? JSON.stringify(errorData).slice(0, 4000)
          : null,
      processorError: String((error as { message?: string } | null)?.message || error),
    });
  }
}

export const onMatriculaDocumentoProcessingJobCreated = functionsFirestore
  .document(`${MATRICULA_DOCUMENT_PROCESSING_COLLECTION}/{jobId}`)
  .onCreate(async (snapshot, context) => {
    await dispatchMatriculaDocumentProcessingJob(context.params.jobId, snapshot.data());
  });

export const onMatriculaAvatarExtractionJobCreated = functionsFirestore
  .document(`${MATRICULA_AVATAR_EXTRACTION_COLLECTION}/{jobId}`)
  .onCreate(async (snapshot, context) => {
    await processMatriculaAvatarExtractionJob(context.params.jobId, snapshot.data());
  });

function requireStoragePath(image: UploadedDocumentImage, label: string): string {
  const path = asCleanString(image.path);
  if (!path) {
    throw new https.HttpsError("invalid-argument", `Sube el archivo ${label} del documento.`);
  }
  if (!path.startsWith("matriculas/documentos/")) {
    throw new https.HttpsError("invalid-argument", `El archivo ${label} no esta en una ruta permitida.`);
  }
  return path;
}

function detectDocumentContentType(path: string, contentType?: string | null): string {
  const cleanContentType = asCleanString(contentType);
  if (cleanContentType) return cleanContentType;
  const lowerPath = path.toLowerCase();
  if (lowerPath.endsWith(".pdf")) return "application/pdf";
  if (lowerPath.endsWith(".png")) return "image/png";
  return "image/jpeg";
}

async function readStorageImage(image: UploadedDocumentImage, label: string) {
  const path = requireStoragePath(image, label);
  const [buffer] = await getStorage().bucket().file(path).download();
  const contentType = detectDocumentContentType(path, image.contentType);
  return { buffer, contentType };
}

async function processIdentityDocumentImage(image: UploadedDocumentImage, label: string): Promise<OcrIdentityResult> {
  const projectId = process.env.DOCUMENT_AI_PROJECT_ID;
  const location = process.env.DOCUMENT_AI_LOCATION;
  const processorId = process.env.DOCUMENT_AI_PROCESSOR_ID;

  if (!projectId || !location || !processorId) {
    throw new https.HttpsError(
      "failed-precondition",
      "Configura DOCUMENT_AI_PROJECT_ID, DOCUMENT_AI_LOCATION y DOCUMENT_AI_PROCESSOR_ID para usar Document AI.",
    );
  }

  const { buffer, contentType } = await readStorageImage(image, label);
  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const documentai = google.documentai({ version: "v1", auth });
  const name = `projects/${projectId}/locations/${location}/processors/${processorId}`;
  const response = await documentai.projects.locations.processors.process({
    name,
    requestBody: {
      rawDocument: {
        content: buffer.toString("base64"),
        mimeType: contentType,
      },
    },
  });

  return extractIdentityData(response.data.document);
}

function entityText(entity: documentai_v1.Schema$GoogleCloudDocumentaiV1DocumentEntity): string | null {
  return asCleanString(entity.normalizedValue?.text ?? entity.mentionText);
}

function flattenEntities(
  entities: documentai_v1.Schema$GoogleCloudDocumentaiV1DocumentEntity[] | undefined,
): documentai_v1.Schema$GoogleCloudDocumentaiV1DocumentEntity[] {
  const result: documentai_v1.Schema$GoogleCloudDocumentaiV1DocumentEntity[] = [];
  for (const entity of entities ?? []) {
    result.push(entity);
    result.push(...flattenEntities(entity.properties));
  }
  return result;
}

function debugEntity(entity: documentai_v1.Schema$GoogleCloudDocumentaiV1DocumentEntity): OcrDebugEntity {
  return {
    type: asCleanString(entity.type),
    mentionText: asCleanString(entity.mentionText),
    normalizedText: asCleanString(entity.normalizedValue?.text),
    confidence: typeof entity.confidence === "number" ? entity.confidence : null,
    properties: (entity.properties ?? []).map(debugEntity),
  };
}

function findEntityValue(
  entities: documentai_v1.Schema$GoogleCloudDocumentaiV1DocumentEntity[],
  aliases: string[],
): string | null {
  const normalizedAliases = aliases.map((alias) => normalizeText(alias).replace(/[^a-z0-9]/g, ""));
  for (const entity of entities) {
    const type = normalizeText(entity.type).replace(/[^a-z0-9]/g, "");
    if (normalizedAliases.some((alias) => type.includes(alias) || alias.includes(type))) {
      const text = entityText(entity);
      if (text) return text;
    }
  }
  return null;
}

function findDateNearKeywords(text: string, keywords: string[]): string | null {
  const lines = text.split(/\r?\n/);
  const normalizedKeywords = keywords.map((keyword) => normalizeText(keyword));
  const datePattern = /(\d{1,2}[/-]\d{1,2}[/-]\d{4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})/;
  for (const line of lines) {
    const normalizedLine = normalizeText(line);
    if (!normalizedKeywords.some((keyword) => normalizedLine.includes(keyword))) continue;
    const match = datePattern.exec(line);
    const date = normalizeDate(match?.[1]);
    if (date) return date;
  }
  return null;
}

function extractIdentityData(
  document: documentai_v1.Schema$GoogleCloudDocumentaiV1Document | undefined,
): OcrIdentityResult {
  const text = document?.text ?? "";
  const entities = flattenEntities(document?.entities);
  const debugEntities = (document?.entities ?? []).map(debugEntity);
  const dniFromEntity = findEntityValue(entities, ["document_id", "document_number", "id_number", "cui", "numero_documento"]);
  const dniFromText = /\b\d{8}\b/.exec(text)?.[0] ?? null;
  const typeFromEntity = findEntityValue(entities, ["document_type", "tipo_documento", "documento"]);
  const fullSurname = findEntityValue(entities, ["surname", "surnames", "last_name", "family_name"]);
  const surnameParts = fullSurname?.split(/\s+/).filter(Boolean) ?? [];
  const address = findEntityValue(entities, ["address", "domicilio", "direccion"]);
  const district = findEntityValue(entities, ["district", "distrito"]);
  const expirationDate =
    normalizeDate(findEntityValue(entities, [
      "expiration_date",
      "expiry_date",
      "date_of_expiry",
      "date_of_expiration",
      "fecha_vencimiento",
      "fecha_caducidad",
      "vencimiento",
      "caducidad",
    ]))
    ?? findDateNearKeywords(text, ["vencimiento", "caducidad", "expiracion", "vence"]);

  return {
    text,
    entities: debugEntities,
    tipoDocumento:
      normalizeDocumentType(typeFromEntity)
      ?? normalizeDocumentType(text)
      ?? null,
    dni: normalizeDocumentNumber(dniFromEntity ?? dniFromText) || null,
    nombre: findEntityValue(entities, ["given_name", "first_name", "names", "nombres", "nombre"]),
    apellidoPaterno:
      findEntityValue(entities, ["apellido_paterno", "first_surname", "primer_apellido"])
      ?? surnameParts[0]
      ?? null,
    apellidoMaterno:
      findEntityValue(entities, ["apellido_materno", "second_surname", "segundo_apellido"])
      ?? (surnameParts.length > 1 ? surnameParts.slice(1).join(" ") : null),
    sexo: normalizeSex(findEntityValue(entities, ["sex", "gender", "sexo"])),
    nacionalidad: findEntityValue(entities, ["nationality", "nacionalidad"]),
    fechaNacimiento: normalizeDate(findEntityValue(entities, ["date_of_birth", "birth_date", "dob", "fecha_nacimiento"])),
    fechaVencimiento: expirationDate,
    estadoCivil: findEntityValue(entities, ["marital_status", "estado_civil"]),
    direccion: address,
    distrito: district,
  };
}

function normalizeSex(value: unknown): string | null {
  const text = normalizeText(value);
  if (!text) return null;
  if (text.startsWith("m")) return "M";
  if (text.startsWith("f")) return "F";
  return asCleanString(value);
}

function combineOcrData(front: OcrIdentityData, back: OcrIdentityData): OcrIdentityData {
  return {
    tipoDocumento: front.tipoDocumento ?? back.tipoDocumento ?? null,
    dni: front.dni ?? back.dni ?? null,
    nombre: front.nombre ?? back.nombre ?? null,
    apellidoPaterno: front.apellidoPaterno ?? back.apellidoPaterno ?? null,
    apellidoMaterno: front.apellidoMaterno ?? back.apellidoMaterno ?? null,
    sexo: front.sexo ?? back.sexo ?? null,
    nacionalidad: front.nacionalidad ?? back.nacionalidad ?? "PERUANA",
    fechaNacimiento: front.fechaNacimiento ?? back.fechaNacimiento ?? null,
    fechaVencimiento: front.fechaVencimiento ?? back.fechaVencimiento ?? null,
    estadoCivil: front.estadoCivil ?? back.estadoCivil ?? null,
    direccion: back.direccion ?? front.direccion ?? null,
    distrito: back.distrito ?? front.distrito ?? null,
  };
}

function parserText(value: unknown): string {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function hasWord(value: unknown, word: string): boolean {
  const text = parserText(value);
  const normalizedWord = parserText(word);
  if (!text || !normalizedWord) return false;
  return new RegExp(`(^|\\s)${normalizedWord}(\\s|$)`).test(text);
}

function hasPhrase(value: unknown, phrase: string): boolean {
  const text = parserText(value);
  const normalizedPhrase = parserText(phrase);
  return Boolean(text && normalizedPhrase && text.includes(normalizedPhrase));
}

function containsNormalizedFragment(value: unknown, fragment: string): boolean {
  const text = normalizeText(value).replace(/\s+/g, "");
  const normalizedFragment = normalizeText(fragment).replace(/\s+/g, "");
  return Boolean(text && normalizedFragment && text.includes(normalizedFragment));
}

function detectPeruDocumentType(text: string): "DNI" | "CE" | null {
  if (hasPhrase(text, "documento nacional de identidad") || hasWord(text, "nacional")) return "DNI";
  if (hasWord(text, "carnet") || hasWord(text, "extranjeria")) return "CE";
  return null;
}

function findPeruDocumentNumber(text: string, documentType: "DNI" | "CE"): string | null {
  if (documentType === "DNI") {
    const match = /(?:^|\D)(\d{8})\s*-\s*\d(?!\d)/.exec(text);
    return match?.[1] ?? null;
  }

  const match = /(?:^|\D)(\d{9})(?!\d)/.exec(text);
  return match?.[1] ?? null;
}

function hasBackSideEvidence(text: string): boolean {
  return hasWord(text, "direccion")
    || hasWord(text, "domicilio")
    || hasWord(text, "distrito")
    || containsNormalizedFragment(text, "per<");
}

function summarizePeruParserForError(
  expectedType: "DNI" | "CE" | null,
  expectedNumber: string,
  parserType: "DNI" | "CE" | null,
  parserNumber: string | null,
  combinedText: string,
): string {
  return [
    "Parser peruano:",
    JSON.stringify({
      tipoEsperado: expectedType,
      numeroEsperado: expectedNumber || null,
      tipoDetectadoPorTexto: parserType,
      numeroDetectadoPorTexto: parserNumber,
      textoCombinadoContieneDireccion: hasWord(combinedText, "direccion"),
      textoCombinadoContieneDomicilio: hasWord(combinedText, "domicilio"),
      textoCombinadoContieneDistrito: hasWord(combinedText, "distrito"),
      textoCombinadoContienePerMenor: containsNormalizedFragment(combinedText, "per<"),
    }, null, 2),
  ].join("\n");
}

function summarizeOcrForError(label: string, result: OcrIdentityResult): string {
  const detected = {
    tipoDocumento: result.tipoDocumento ?? null,
    dni: result.dni ?? null,
    nombre: result.nombre ?? null,
    apellidoPaterno: result.apellidoPaterno ?? null,
    apellidoMaterno: result.apellidoMaterno ?? null,
    sexo: result.sexo ?? null,
    nacionalidad: result.nacionalidad ?? null,
    fechaNacimiento: result.fechaNacimiento ?? null,
    fechaVencimiento: result.fechaVencimiento ?? null,
    estadoCivil: result.estadoCivil ?? null,
    direccion: result.direccion ?? null,
    distrito: result.distrito ?? null,
  };

  return [
    `--- ${label} ---`,
    "Campos normalizados:",
    JSON.stringify(detected, null, 2),
    "Texto crudo:",
    result.text || "(sin texto)",
    "Entidades:",
    JSON.stringify(result.entities, null, 2),
  ].join("\n");
}

function buildOcrDebugMessage(prefix: string, front: OcrIdentityResult, back: OcrIdentityResult): string {
  const message = [
    prefix,
    "",
    summarizeOcrForError("FRENTE", front),
    "",
    summarizeOcrForError("REVERSO", back),
  ].join("\n");

  return message.length > 18000
    ? `${message.slice(0, 18000)}\n\n[Salida OCR recortada por longitud]`
    : message;
}

function validateOcrMatch(
  inputTipoDocumento: string,
  inputDni: string,
  _ocr: OcrIdentityData,
  front: OcrIdentityResult,
  back: OcrIdentityResult,
) {
  const expectedType = normalizeDocumentType(inputTipoDocumento);
  const expectedNumber = normalizeDocumentNumber(inputDni);
  const allText = `${front.text}\n${back.text}`;
  const parserType = detectPeruDocumentType(allText);
  const parserNumber = expectedType ? findPeruDocumentNumber(allText, expectedType) : null;

  if (!expectedType || parserType !== expectedType || !parserNumber || parserNumber !== expectedNumber) {
    throw new https.HttpsError(
      "failed-precondition",
      buildOcrDebugMessage(
        [
          "No coincide el numero ingresado con las imagenes ingresadas.",
          `Esperado: tipo=${expectedType ?? "(sin tipo)"} numero=${expectedNumber || "(sin numero)"}.`,
          `Detectado por parser peruano: tipo=${parserType ?? "(sin tipo)"} numero=${parserNumber || "(sin numero)"}.`,
          summarizePeruParserForError(expectedType, expectedNumber, parserType, parserNumber, allText),
        ].join("\n"),
        front,
        back,
      ),
    );
  }

  if (!hasBackSideEvidence(allText)) {
    throw new https.HttpsError(
      "failed-precondition",
      buildOcrDebugMessage(
        [
          "No se ha detectado informacion del lado reverso del documento en ninguna de las dos imagenes.",
          summarizePeruParserForError(expectedType, expectedNumber, parserType, parserNumber, allText),
        ].join("\n"),
        front,
        back,
      ),
    );
  }
}

async function cleanupMatricula(matriculaId: number) {
  try {
    await deleteMatriculaTree(matriculaId);
  } catch (error) {
    console.error("Error cleaning up failed matricula:", error);
  }
}

async function replaceModuloEstudiantesForMatricula(
  matriculaId: number,
  paqueteModulos: DataConnectPaqueteModulo[],
  grupoIdByModuloId: Map<number, number | null>,
  fallbackGrupoId: number | null,
) {
  await dataConnect.executeGraphql<
    { moduloEstudiante_deleteMany: number },
    { matriculaId: number }
  >(DELETE_MODULO_ESTUDIANTES_BY_MATRICULA_MUTATION, { variables: { matriculaId } });

  await Promise.all(
    paqueteModulos.map((paqueteModulo) => {
      const moduloEstudiante = buildModuloEstudianteDataFromInput({
        matriculaId,
        moduloId: paqueteModulo.moduloId,
        grupoId: grupoIdByModuloId.get(paqueteModulo.moduloId) ?? fallbackGrupoId,
        promedio: null,
        puntaje: null,
      });
      return dataConnect.executeGraphql<
        { moduloEstudiante_insert: unknown },
        { data: DataConnectModuloEstudianteInput }
      >(INSERT_MODULO_ESTUDIANTE_MUTATION, { variables: { data: moduloEstudiante } });
    }),
  );
}

function buildGrupoIdByModuloId(data: unknown) {
  const fallbackGrupoId = toNumberOrNull((data as Record<string, unknown> | null)?.grupoId) ?? null;
  const result = new Map<number, number | null>();
  const moduloGrupos = (data as Record<string, unknown> | null)?.moduloGrupos;
  if (!Array.isArray(moduloGrupos)) return { result, fallbackGrupoId };

  for (const item of moduloGrupos) {
    if (typeof item !== "object" || item === null) continue;
    const moduloId = toNumberOrNull((item as Record<string, unknown>).moduloId);
    if (!moduloId) continue;
    result.set(moduloId, toNumberOrNull((item as Record<string, unknown>).grupoId) ?? null);
  }

  return { result, fallbackGrupoId };
}

async function createMatriculaWithModuloEstudiantes(data: Record<string, unknown>) {
  const userId = toNumber(data.userId, -1);
  const paqueteId = toNumber(data.paqueteId, -1);
  const responsableId = toNumberOrNull(data.responsableId) ?? null;
  const responsableUserId = toNumberOrNull(data.responsableUserId) ?? null;
  if (userId <= 0) {
    throw new https.HttpsError("invalid-argument", "userId is required.");
  }
  if (paqueteId <= 0) {
    throw new https.HttpsError("invalid-argument", "paqueteId is required.");
  }

  let matriculaId: number | null = null;

  try {
    const paqueteResponse = await dataConnect.executeGraphql<{
      paquete: DataConnectPaquete | null;
      paqueteModulos: DataConnectPaqueteModulo[];
    }, { paqueteId: number }>(GET_PAQUETE_MODULOS_FOR_MATRICULA_QUERY, { variables: { paqueteId } });

    if (!paqueteResponse.data.paquete) {
      throw new https.HttpsError("not-found", "El paquete seleccionado no existe.");
    }
    if (paqueteResponse.data.paquete.archivado) {
      throw new https.HttpsError("failed-precondition", "El paquete seleccionado esta archivado.");
    }

    const paqueteModulos = sortPaqueteModulos(paqueteResponse.data.paqueteModulos ?? []);
    if (paqueteModulos.length < 1 || paqueteModulos.length > 3) {
      throw new https.HttpsError(
        "failed-precondition",
        "El paquete debe tener entre 1 y 3 modulos antes de matricular.",
      );
    }
    const { result: grupoIdByModuloId, fallbackGrupoId } = buildGrupoIdByModuloId(data);

    const matriculaPayload = buildMatriculaDataFromInput({
      ...data,
      userId,
      paqueteId,
      fecha: data.fecha ?? new Date().toISOString(),
      codigoInscripcion: data.codigoInscripcion ?? await getNextCodigoInscripcionForCurrentYear(),
      archivado: data.archivado ?? false,
    });

    const created = await dataConnect.executeGraphql<
      { matricula_insert: unknown },
      { data: DataConnectMatriculaInput }
    >(INSERT_MATRICULA_MUTATION, { variables: { data: matriculaPayload } });

    matriculaId = getIdFromKeyOutput(created.data.matricula_insert);
    if (!matriculaId) {
      throw new Error("No se pudo obtener el id de la matricula guardada.");
    }

    await replaceModuloEstudiantesForMatricula(
      matriculaId,
      paqueteModulos,
      grupoIdByModuloId,
      fallbackGrupoId,
    );

    return {
      id: matriculaId,
      paqueteId,
      userId,
      responsableId,
      responsableUserId,
      modulos: paqueteModulos.map((item) => ({
        moduloId: item.moduloId,
        grupoId: grupoIdByModuloId.get(item.moduloId) ?? fallbackGrupoId,
      })),
    };
  } catch (error) {
    if (matriculaId) {
      await cleanupMatricula(matriculaId);
    }
    throw error;
  }
}

export const listMatriculas = https.onCall(async (data, context) => {
  await requirePermission(context, "matriculas", "view");
  const grupoModuloId = toNumberOrNull(data?.grupoModuloId);

  try {
    const [matriculasResponse, moduloEstudiantesResponse] = await Promise.all([
      dataConnect.executeGraphql<{
        matriculas: MatriculaRow[];
      }, Record<string, never>>(LIST_MATRICULAS_QUERY),
      dataConnect.executeGraphql<{
        modulosEstudiantes: MatriculaDocenteModuloEstudiante[];
      }, Record<string, never>>(LIST_MODULO_ESTUDIANTES_FOR_MATRICULAS_QUERY),
    ]);

    const shouldFilterByDocente = isDocenteMatriculaRequester(context);
    let allowedPairs = new Set<string>();
    if (grupoModuloId || shouldFilterByDocente) {
      const { grupoModulos } = await loadMatriculaDocenteGrupoModulos(context);
      const allowedGrupoModulos = grupoModuloId
        ? grupoModulos.filter((item) => item.id === grupoModuloId)
        : grupoModulos;
      allowedPairs = new Set(
        allowedGrupoModulos.map((item) => `${item.grupoId}:${item.moduloId}`),
      );
    }

    const shouldApplyMatriculaFilter = Boolean(grupoModuloId || shouldFilterByDocente);
    const allowedMatriculaIds = shouldApplyMatriculaFilter
      ? new Set<number>(
        (moduloEstudiantesResponse.data.modulosEstudiantes ?? [])
          .filter((item) => allowedPairs.has(`${item.grupoId ?? 0}:${item.moduloId ?? 0}`))
          .map((item) => item.matriculaId)
          .filter((id): id is number => Boolean(id)),
      )
      : null;

    const matriculas = (matriculasResponse.data.matriculas ?? [])
      .filter((matricula) => !allowedMatriculaIds || allowedMatriculaIds.has(matricula.id))
      .slice()
      .sort((a, b) => {
        const dateCompare = String(b.fecha ?? "").localeCompare(String(a.fecha ?? ""));
        return dateCompare || b.id - a.id;
      });

    return { matriculas };
  } catch (error) {
    console.error("Error in listMatriculas:", error);
    throw new https.HttpsError("internal", "No se pudieron cargar las matriculas.");
  }
});

export const listMatriculaDocenteGrupos = https.onCall(async (data, context) => {
  await requirePermission(context, "matriculas", "view");

  try {
    const { grupoModulos, semestreTitulo } = await loadMatriculaDocenteGrupoModulos(
      context,
      String(data?.semestreTitulo ?? "").trim() || null,
    );
    return { grupoModulos, semestreTitulo };
  } catch (error) {
    if (error instanceof https.HttpsError) throw error;
    console.error("Error in listMatriculaDocenteGrupos:", error);
    throw new https.HttpsError("internal", "No se pudieron cargar los grupos de matricula del docente.");
  }
});

export const generarCodigosInscripcionMatriculas = https.onCall(async (_data, context) => {
  requireSuperUser(context, "generar codigos de inscripcion");

  try {
    return await regenerateCodigosInscripcionForCurrentYear();
  } catch (error) {
    console.error("Error in generarCodigosInscripcionMatriculas:", error);
    throw new https.HttpsError("internal", "No se pudieron generar los codigos de inscripcion.");
  }
});

export const getMatricula = https.onCall(async (data, context) => {
  await requirePermission(context, "matriculas", "view");

  const matriculaId = toNumber(data?.id, -1);
  if (matriculaId <= 0) {
    throw new https.HttpsError("invalid-argument", "id is required.");
  }

  try {
    return { matricula: await getMatriculaById(matriculaId) };
  } catch (error) {
    console.error("Error in getMatricula:", error);
    throw new https.HttpsError("internal", "No se pudo cargar la matricula.");
  }
});

export const verificarDocumentoMatricula = https.onCall(async (data, context) => {
  await requireMatriculaPermissionOrFormularioAccess(context, "view");

  const tipoDocumento = normalizeDocumentType(data?.tipoDocumento);
  const dni = normalizeDocumentNumber(data?.dni);
  if (!tipoDocumento || !dni) {
    throw new https.HttpsError("invalid-argument", "Ingresa tipo y numero de documento.");
  }

  try {
    const existingUser = await findUserByDocument(tipoDocumento, dni);
    const frontImage = getUploadedImage(data?.frente);
    const backImage = getUploadedImage(data?.reverso);
    const [frontOcr, backOcr] = await Promise.all([
      processIdentityDocumentImage(frontImage, "frontal"),
      processIdentityDocumentImage(backImage, "reverso"),
    ]);
    const ocr = combineOcrData(frontOcr, backOcr);
    validateOcrMatch(tipoDocumento, dni, ocr, frontOcr, backOcr);
    assertDocumentNotExpired(ocr.fechaVencimiento);
    const documentImagePolicy = getDocumentImagePolicy(existingUser);

    return {
      userExists: Boolean(existingUser),
      userHasStoredImages: documentImagePolicy.userHasStoredImages,
      user: existingUser,
      documentImagePolicy,
      datos: mergeSavedUserWithOcr(existingUser, ocr),
      ocr,
    };
  } catch (error) {
    if (error instanceof https.HttpsError) throw error;
    console.error("Error in verificarDocumentoMatricula:", error);
    throw new https.HttpsError("internal", "No se pudo verificar el documento.");
  }
});

export const getMatriculaDocumentoEstado = https.onCall(async (data, context) => {
  await requireMatriculaPermissionOrFormularioAccess(context, "view");

  const tipoDocumento = normalizeDocumentType(data?.tipoDocumento);
  const dni = normalizeDocumentNumber(data?.dni);
  if (!tipoDocumento || !dni) {
    throw new https.HttpsError("invalid-argument", "Ingresa tipo y numero de documento.");
  }

  try {
    const existingUser = await findUserByDocument(tipoDocumento, dni);
    return {
      userExists: Boolean(existingUser),
      user: existingUser,
      documentImagePolicy: getDocumentImagePolicy(existingUser),
    };
  } catch (error) {
    console.error("Error in getMatriculaDocumentoEstado:", error);
    throw new https.HttpsError("internal", "No se pudo revisar el estado del documento.");
  }
});

export const verificarMatriculaReniec = https.onCall(async (data, context) => {
  await requireMatriculaPermissionOrFormularioAccess(context, "view");

  const tipoDocumento = normalizeDocumentType(data?.tipoDocumento);
  const dni = normalizeDocumentNumber(data?.dni).replace(/\D/g, "").slice(0, 8);
  if (!tipoDocumento || !dni) {
    throw new https.HttpsError("invalid-argument", "Ingresa tipo y numero de documento.");
  }
  if (tipoDocumento !== "DNI") {
    return {
      datos: {
        tipoDocumento,
        dni: normalizeDocumentNumber(data?.dni),
      },
    };
  }
  if (!/^\d{8}$/.test(dni)) {
    throw new https.HttpsError("invalid-argument", "Ingresa un DNI valido de 8 digitos.");
  }

  try {
    const [existingUser, dniData] = await Promise.all([
      findUserByDocument("DNI", dni),
      fetchPeruDevsDni(dni),
    ]);
    const reniecData: OcrIdentityData = {
      tipoDocumento: "DNI",
      dni,
      nombre: asCleanString(dniData.nombres),
      apellidoPaterno: asCleanString(dniData.apellido_paterno),
      apellidoMaterno: asCleanString(dniData.apellido_materno),
      sexo: normalizePeruDevsSexo(dniData.genero),
      nacionalidad: "PERUANA",
      fechaNacimiento: normalizeDate(dniData.fecha_nacimiento),
    };

    return {
      userExists: Boolean(existingUser),
      datos: mergeSavedUserWithOcr(existingUser, reniecData),
    };
  } catch (error) {
    if (error instanceof https.HttpsError) throw error;
    console.error("Error in verificarMatriculaReniec:", error);
    throw new https.HttpsError("internal", "No se pudo consultar RENIEC.");
  }
});

async function listMatriculaPaquetesBySemestreData(semestreId: number) {
  if (semestreId <= 0) {
    throw new https.HttpsError("invalid-argument", "Selecciona un periodo.");
  }

  try {
    const response = await dataConnect.executeGraphql<{
      grupos: Array<{
        id: number;
        nombreDisplay?: string | null;
        grupoOrd?: number | null;
        paqueteId?: number | null;
        paquete?: { id?: number | null; titulo?: string | null; descripcion?: string | null; archivado?: boolean | null } | null;
      }>;
    }, { semestreId: number }>(
      LIST_MATRICULA_PAQUETES_BY_SEMESTRE_QUERY,
      { variables: { semestreId } },
    );

    type GrupoModuloLabelRow = {
      id: number;
      nombre?: string | null;
      orden?: number | null;
      modulo?: { titulo?: string | null; tituloComercial?: string | null; orden?: number | null } | null;
    };

    const buildGrupoModuloTitulo = (
      grupo: { nombreDisplay?: string | null; paquete?: { titulo?: string | null } | null },
      grupoModulos: GrupoModuloLabelRow[],
    ) => {
      const nombres = grupoModulos
        .slice()
        .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || a.id - b.id)
        .map((item) =>
          asCleanString(item.nombre)
          ?? asCleanString(item.modulo?.titulo)
          ?? asCleanString(item.modulo?.tituloComercial),
        )
        .filter((item): item is string => Boolean(item));
      return nombres.join(" / ") || asCleanString(grupo.nombreDisplay) || asCleanString(grupo.paquete?.titulo);
    };

    const getGrupoModuloSort = (grupoModulos: GrupoModuloLabelRow[]) => {
      const ordered = grupoModulos
        .slice()
        .sort((a, b) =>
          (a.modulo?.orden ?? Number.MAX_SAFE_INTEGER) - (b.modulo?.orden ?? Number.MAX_SAFE_INTEGER) ||
          (a.orden ?? Number.MAX_SAFE_INTEGER) - (b.orden ?? Number.MAX_SAFE_INTEGER) ||
          a.id - b.id,
        );
      const first = ordered[0];
      return {
        moduloOrden: first?.modulo?.orden ?? null,
        grupoModuloOrden: first?.orden ?? null,
      };
    };

    const byPaqueteId = new Map<number, {
      id: number;
      titulo?: string | null;
      descripcion?: string | null;
      grupoModuloTitulo?: string | null;
      moduloOrden?: number | null;
      grupoModuloOrden?: number | null;
      grupoIds: number[];
    }>();
    const labelGrupoByPaqueteId = new Map<number, {
      id: number;
      nombreDisplay?: string | null;
      paquete?: { titulo?: string | null } | null;
    }>();
    const sortedGrupos = (response.data.grupos ?? [])
      .slice()
      .sort((a, b) =>
        (a.grupoOrd ?? 0) - (b.grupoOrd ?? 0)
        || String(a.nombreDisplay ?? "").localeCompare(String(b.nombreDisplay ?? ""), "es", { numeric: true })
        || a.id - b.id,
      );
    for (const grupo of sortedGrupos) {
      const paqueteId = grupo.paqueteId ?? grupo.paquete?.id ?? null;
      if (!paqueteId || grupo.paquete?.archivado) continue;
      const current = byPaqueteId.get(paqueteId) ?? {
        id: paqueteId,
        titulo: grupo.paquete?.titulo ?? `Modulo ${paqueteId}`,
        descripcion: grupo.paquete?.descripcion ?? null,
        grupoModuloTitulo: null,
        moduloOrden: null,
        grupoModuloOrden: null,
        grupoIds: [],
      };
      current.grupoIds.push(grupo.id);
      byPaqueteId.set(paqueteId, current);
      if (!labelGrupoByPaqueteId.has(paqueteId)) {
        labelGrupoByPaqueteId.set(paqueteId, grupo);
      }
    }

    const labelEntries = await Promise.all(
      Array.from(labelGrupoByPaqueteId.entries()).map(async ([paqueteId, grupo]) => {
        const grupoModulosResponse = await dataConnect.executeGraphql<{
          grupoModulos: Array<GrupoModuloLabelRow & { moduloId: number; grupoId: number }>;
        }, { grupoId: number }>(
          GET_GRUPO_MODULOS_FOR_MATRICULA_QUERY,
          { variables: { grupoId: grupo.id } },
        );
        const grupoModulos = grupoModulosResponse.data.grupoModulos ?? [];
        return [paqueteId, buildGrupoModuloTitulo(grupo, grupoModulos), getGrupoModuloSort(grupoModulos)] as const;
      }),
    );
    for (const [paqueteId, grupoModuloTitulo, sortInfo] of labelEntries) {
      const current = byPaqueteId.get(paqueteId);
      if (current) {
        current.grupoModuloTitulo = grupoModuloTitulo;
        current.moduloOrden = sortInfo.moduloOrden;
        current.grupoModuloOrden = sortInfo.grupoModuloOrden;
      }
    }

    return {
      paquetes: Array.from(byPaqueteId.values()).sort((a, b) =>
        (a.moduloOrden ?? Number.MAX_SAFE_INTEGER) - (b.moduloOrden ?? Number.MAX_SAFE_INTEGER) ||
        (a.grupoModuloOrden ?? Number.MAX_SAFE_INTEGER) - (b.grupoModuloOrden ?? Number.MAX_SAFE_INTEGER) ||
        String(a.grupoModuloTitulo ?? a.titulo ?? "").localeCompare(
          String(b.grupoModuloTitulo ?? b.titulo ?? ""),
          "es",
          { numeric: true },
        ),
      ),
    };
  } catch (error) {
    console.error("Error in listMatriculaPaquetesBySemestre:", error);
    throw new https.HttpsError("internal", "No se pudieron cargar los modulos del periodo.");
  }
}

export const listMatriculaPaquetesBySemestre = https.onCall(async (data, context) => {
  await requirePermission(context, "matriculas", "view");
  return listMatriculaPaquetesBySemestreData(toNumber(data?.semestreId, -1));
});

export const listFormularioMatriculaPaquetesBySemestre = https.onCall(async (data, context) => {
  await requireFormularioMatriculaAccess(context);
  return listMatriculaPaquetesBySemestreData(toNumber(data?.semestreId, -1));
});

async function getGrupoModuloMapping(semestreId: number, paqueteId: number): Promise<GrupoModuloMapping> {
  const gruposResponse = await dataConnect.executeGraphql<{
    grupos: Array<{
      id: number;
      grupoOrd?: number | null;
      workspaceCorreo?: string | null;
      paquete?: { id?: number | null; archivado?: boolean | null } | null;
    }>;
  }, { semestreId: number; paqueteId: number }>(
    GET_GRUPOS_BY_SEMESTRE_PAQUETE_QUERY,
    { variables: { semestreId, paqueteId } },
  );
  const grupo = (gruposResponse.data.grupos ?? [])
    .filter((item) => !item.paquete?.archivado)
    .sort((a, b) => (a.grupoOrd ?? 0) - (b.grupoOrd ?? 0) || a.id - b.id)[0];

  if (!grupo) {
    throw new https.HttpsError("failed-precondition", "No hay grupos disponibles para el modulo seleccionado en este periodo.");
  }

  const modulosResponse = await dataConnect.executeGraphql<{
    grupoModulos: Array<{ moduloId: number; grupoId: number }>;
  }, { grupoId: number }>(
    GET_GRUPO_MODULOS_FOR_MATRICULA_QUERY,
    { variables: { grupoId: grupo.id } },
  );

  return {
    grupoId: grupo.id,
    workspaceCorreo: grupo.workspaceCorreo ?? null,
    moduloGrupos: (modulosResponse.data.grupoModulos ?? []).map((item) => ({
      moduloId: item.moduloId,
      grupoId: item.grupoId,
    })),
  };
}

async function ensureNoMatriculaDuplicates(
  userId: number,
  semestreId: number,
  paqueteId: number,
  recibo: string,
  currentMatriculaId?: number | null,
) {
  const [reciboResponse, duplicateResponse] = await Promise.all([
    dataConnect.executeGraphql<{ matriculas: Array<{ id: number }> }, { recibo: string }>(
      CHECK_RECIBO_MATRICULA_QUERY,
      { variables: { recibo } },
    ),
    dataConnect.executeGraphql<
      { matriculas: Array<{ id: number }> },
      { userId: number; semestreId: number; paqueteId: number }
    >(
      CHECK_DUPLICATE_MATRICULA_QUERY,
      { variables: { userId, semestreId, paqueteId } },
    ),
  ]);

  const hasSameRecibo = (reciboResponse.data.matriculas ?? []).some((item) => item.id !== currentMatriculaId);
  const hasDuplicateMatricula = (duplicateResponse.data.matriculas ?? []).some((item) => item.id !== currentMatriculaId);

  if (hasSameRecibo) {
    throw new https.HttpsError("already-exists", "El numero de recibo ya fue registrado.");
  }
  if (hasDuplicateMatricula) {
    throw new https.HttpsError("already-exists", "El usuario ya esta matriculado en este modulo durante el periodo seleccionado.");
  }
}

function buildMatriculaUsername(data: Record<string, unknown>): string {
  return [
    asCleanString(data.nombre),
    asCleanString(data.apellidoPaterno),
    asCleanString(data.apellidoMaterno),
  ].filter(Boolean).join(" ").trim() || "Estudiante";
}

function resolveMatriculaInstitutionalEmail(dni: string): string {
  return `${normalizeDocumentNumber(dni).toLowerCase()}@cetprosmp.edu.pe`;
}

async function getAuthUserByEmailOrNull(email: string) {
  return authAdmin
    .getUserByEmail(email)
    .catch((error: unknown) =>
      (error as { code?: string } | null)?.code === "auth/user-not-found" ? null : Promise.reject(error),
    );
}

async function getAuthUserByUidOrNull(uid: string | null | undefined) {
  const value = String(uid || "").trim();
  if (!value || value.startsWith("matricula:")) return null;

  return authAdmin
    .getUser(value)
    .catch((error: unknown) =>
      (error as { code?: string } | null)?.code === "auth/user-not-found" ? null : Promise.reject(error),
    );
}

async function ensureStudentAuthForMatricula(
  existingUser: MatriculaUserRow | null,
  data: Record<string, unknown>,
): Promise<{
  authUser: Awaited<ReturnType<typeof authAdmin.getUser>>;
  authPassword: string | null;
  institutionalEmail: string;
  roleId: number;
  roleTitle: string | null;
  permissionLevel: number;
  username: string;
  authAlreadyExisted: boolean;
}> {
  const roleId = STUDENT_ROLE_ID;
  const role = await getRoleById(roleId);
  if (!role) {
    throw new https.HttpsError("failed-precondition", "No se encontro el rol estudiante para crear la matricula.");
  }

  const institutionalEmail = resolveMatriculaInstitutionalEmail(String(data.dni || ""));
  const username = buildMatriculaUsername(data);
  const blockedForAuth = Boolean(data.bloqueado ?? data.blocked ?? false);
  const existingByEmail = await getAuthUserByEmailOrNull(institutionalEmail);
  const existingByUid = existingByEmail ? null : await getAuthUserByUidOrNull(existingUser?.documentId);
  const existingAuthUser = existingByEmail ?? existingByUid;
  const permissionLevel = role.scala ?? DEFAULT_LEVEL;
  const authPassword = normalizeDocumentNumber(data.dni);

  if (existingAuthUser) {
    await authAdmin.updateUser(existingAuthUser.uid, {
      email: institutionalEmail,
      password: authPassword,
      displayName: username,
      emailVerified: true,
      disabled: blockedForAuth,
    });
    const updated = await authAdmin.getUser(existingAuthUser.uid);
    await authAdmin.setCustomUserClaims(updated.uid, { role: String(roleId), level: permissionLevel });
    return {
      authUser: updated,
      authPassword,
      institutionalEmail,
      roleId,
      roleTitle: role.titulo ?? null,
      permissionLevel,
      username,
      authAlreadyExisted: true,
    };
  }

  const created = await authAdmin.createUser({
    email: institutionalEmail,
    password: authPassword,
    displayName: username,
    emailVerified: true,
    disabled: blockedForAuth,
  });
  await authAdmin.updateUser(created.uid, { emailVerified: true });
  const createdAuthUser = await authAdmin.getUser(created.uid);
  await authAdmin.setCustomUserClaims(createdAuthUser.uid, { role: String(roleId), level: permissionLevel });

  return {
    authUser: createdAuthUser,
    authPassword,
    institutionalEmail,
    roleId,
    roleTitle: role.titulo ?? null,
    permissionLevel,
    username,
    authAlreadyExisted: false,
  };
}

async function saveUserForMatricula(
  existingUser: MatriculaUserRow | null,
  data: Record<string, unknown>,
  context: https.CallableContext,
): Promise<MatriculaSaveUserResult> {
  const now = new Date().toISOString();
  const imageFront = getUploadedImage(data.dniImagenFrente);
  const imageBack = getUploadedImage(data.dniImagenReverso);
  const authStudent = await ensureStudentAuthForMatricula(existingUser, data);
  const requesterEmail = asCleanString(context.auth?.token?.email);
  const personalEmail = asCleanString(data.email) ?? authStudent.institutionalEmail;
  const requestedAvatar = asCleanString(data.avatar ?? data.foto);
  const existingAvatar = asCleanString(existingUser?.avatar) ?? asCleanString(authStudent.authUser.photoURL);
  const avatarForPersist = requestedAvatar ?? existingAvatar ?? undefined;
  const avatarForWorkspace = requestedAvatar && requestedAvatar !== existingAvatar
    ? requestedAvatar
    : undefined;
  const payload = buildUserDataFromInput({
    ...data,
    tipoDocumento: normalizeDocumentType(data.tipoDocumento),
    dni: normalizeDocumentNumber(data.dni),
    username: authStudent.username,
    email: personalEmail,
    correoInstitucional: authStudent.institutionalEmail,
    nacionalidad: asCleanString(data.nacionalidad) ?? "PERUANA",
    provider: "password",
    confirmed: true,
    blocked: Boolean(data.bloqueado ?? data.blocked ?? existingUser?.blocked ?? false),
    documentId: authStudent.authUser.uid,
    fechaCreacion: existingUser?.fechaCreacion ?? now,
    fechaModificacion: now,
    emailCreador: existingUser?.emailCreador ?? requesterEmail ?? null,
    dniImagenFrenteUrl: imageFront.url ?? existingUser?.dniImagenFrenteUrl ?? null,
    dniImagenReversoUrl: imageBack.url ?? existingUser?.dniImagenReversoUrl ?? null,
    rolId: authStudent.roleId,
    avatar: avatarForPersist,
  });
  if (!avatarForPersist && existingUser) {
    delete payload.avatar;
  }

  let userId: number;
  if (existingUser) {
    const updated = await dataConnect.executeGraphql<{ user_update: unknown }, { id: number; data: DataConnectUserInput }>(
      UPDATE_USER_MUTATION,
      { variables: { id: existingUser.id, data: payload } },
    );
    userId = getIdFromKeyOutput(updated.data.user_update) ?? existingUser.id;
  } else {
    userId = await upsertDataConnectUserByDocumentId(authStudent.authUser.uid, payload);
  }

  const workspacePrimaryEmail = shouldSyncStudentWorkspace(authStudent.roleId, authStudent.roleTitle)
    ? resolveWorkspacePrimaryEmail({
      roleId: authStudent.roleId,
      roleTitle: authStudent.roleTitle,
      nombre: payload.nombre ?? null,
      apellidoPaterno: payload.apellidoPaterno ?? null,
      apellidoMaterno: payload.apellidoMaterno ?? null,
      dni: payload.dni ?? null,
      email: payload.email ?? null,
      institutionalEmail: payload.correoInstitucional ?? authStudent.institutionalEmail,
    })
    : null;

  if (shouldSyncStudentWorkspace(authStudent.roleId, authStudent.roleTitle)) {
    if (!workspacePrimaryEmail) {
      throw new https.HttpsError(
        "failed-precondition",
        "No se pudo resolver el correo institucional del estudiante para Workspace.",
      );
    }

    try {
      await syncStudentToWorkspace(
        {
          email: workspacePrimaryEmail,
          institutionalEmail: payload.correoInstitucional ?? authStudent.institutionalEmail,
          formEmail: payload.email ?? personalEmail,
          avatar: avatarForWorkspace,
          password: authStudent.authPassword,
          username: authStudent.username,
          roleId: authStudent.roleId,
          roleTitle: authStudent.roleTitle,
          fechaCreacion: payload.fechaCreacion ?? now,
          fechaModificacion: payload.fechaModificacion ?? now,
          apellidoPaterno: payload.apellidoPaterno ?? null,
          apellidoMaterno: payload.apellidoMaterno ?? null,
          nombre: payload.nombre ?? null,
          direccion: payload.direccion ?? null,
          distrito: payload.distrito ?? null,
          telefono: payload.telefono ?? null,
          celular: payload.celular ?? null,
          dni: payload.dni ?? null,
          tipoDocumento: payload.tipoDocumento ?? null,
          sexo: payload.sexo ?? null,
          fechaNacimiento: payload.fechaNacimiento ?? null,
          instruccion: payload.instruccion ?? null,
          estadoCivil: payload.estadoCivil ?? null,
          blocked: Boolean(payload.blocked),
        },
        {
          previousEmail: existingUser?.correoInstitucional ?? null,
          createPassword: normalizeDocumentNumber(data.dni),
        },
      );
    } catch (workspaceError: unknown) {
      const rawMessage = String((workspaceError as { message?: string } | null)?.message || "");
      console.error("Workspace sync failed in saveUserForMatricula:", workspaceError);
      throw new https.HttpsError(
        "failed-precondition",
        rawMessage || "No se pudo sincronizar el estudiante con Google Workspace.",
      );
    }
  }

  return { userId, workspacePrimaryEmail };
}

async function getMatriculaWorkspaceGroups(matriculaId: number): Promise<MatriculaWorkspaceGroup[]> {
  const response = await dataConnect.executeGraphql<{
    modulosEstudiantes: Array<{
      grupoId?: number | null;
      grupo?: { id?: number | null; workspaceCorreo?: string | null } | null;
    }>;
  }, { matriculaId: number }>(
    GET_MATRICULA_WORKSPACE_GROUPS_QUERY,
    { variables: { matriculaId } },
  );

  const byGrupoId = new Map<number, MatriculaWorkspaceGroup>();
  for (const item of response.data.modulosEstudiantes ?? []) {
    const grupoId = item.grupoId ?? item.grupo?.id ?? null;
    if (!grupoId) continue;
    byGrupoId.set(grupoId, {
      grupoId,
      workspaceCorreo: item.grupo?.workspaceCorreo ?? null,
    });
  }

  return Array.from(byGrupoId.values());
}

async function userHasAnotherMatriculaInWorkspaceGroup(
  userId: number,
  grupoId: number,
  excludeMatriculaId: number,
) {
  const response = await dataConnect.executeGraphql<{
    modulosEstudiantes: Array<{
      matriculaId?: number | null;
      matricula?: { id?: number | null; userId?: number | null; archivado?: boolean | null } | null;
    }>;
  }, { grupoId: number }>(
    LIST_MODULO_ESTUDIANTES_BY_GROUP_QUERY,
    { variables: { grupoId } },
  );

  return (response.data.modulosEstudiantes ?? []).some((item) =>
    item.matriculaId !== excludeMatriculaId
    && item.matricula?.id !== excludeMatriculaId
    && item.matricula?.userId === userId
    && item.matricula?.archivado !== true,
  );
}

async function syncMatriculaStudentToWorkspaceGroup(
  grupoMapping: GrupoModuloMapping,
  workspacePrimaryEmail: string | null,
) {
  try {
    return await addWorkspaceGroupMember(grupoMapping.workspaceCorreo ?? null, workspacePrimaryEmail);
  } catch (error) {
    if (error instanceof WorkspaceSyncError) {
      throw new https.HttpsError("failed-precondition", error.message);
    }
    throw error;
  }
}

function resolveWorkspaceEmailForMatriculaUser(user: MatriculaUserRow | null | undefined) {
  if (!user) return null;
  return resolveWorkspacePrimaryEmail({
    roleId: user.rolId ?? STUDENT_ROLE_ID,
    roleTitle: "estudiante",
    nombre: user.nombre ?? null,
    apellidoPaterno: user.apellidoPaterno ?? null,
    apellidoMaterno: user.apellidoMaterno ?? null,
    dni: user.dni ?? null,
    email: user.email ?? null,
    institutionalEmail: user.correoInstitucional ?? null,
  });
}

async function syncMatriculaWorkspaceGroupChange(params: {
  previousGroups: MatriculaWorkspaceGroup[];
  newGroup: GrupoModuloMapping;
  previousUserId: number;
  currentMatriculaId: number;
  previousWorkspaceEmail: string | null;
  newWorkspaceEmail: string | null;
}) {
  const workspaceGroup = await syncMatriculaStudentToWorkspaceGroup(params.newGroup, params.newWorkspaceEmail);
  const newGrupoIds = new Set<number>([
    params.newGroup.grupoId,
    ...params.newGroup.moduloGrupos.map((item) => item.grupoId),
  ]);

  const removals: Array<{ grupoId: number; workspaceCorreo?: string | null }> = [];
  for (const previousGroup of params.previousGroups) {
    if (newGrupoIds.has(previousGroup.grupoId)) continue;
    const stillHasAnother = await userHasAnotherMatriculaInWorkspaceGroup(
      params.previousUserId,
      previousGroup.grupoId,
      params.currentMatriculaId,
    );
    if (!stillHasAnother) removals.push(previousGroup);
  }

  for (const previousGroup of removals) {
    try {
      await removeWorkspaceGroupMember(previousGroup.workspaceCorreo ?? null, params.previousWorkspaceEmail);
    } catch (error) {
      if (error instanceof WorkspaceSyncError) {
        throw new https.HttpsError("failed-precondition", error.message);
      }
      throw error;
    }
  }

  return {
    ...workspaceGroup,
    removedFromGroups: removals.map((item) => item.grupoId),
  };
}

async function crearMatriculaFormularioData(data: any, context: https.CallableContext) {
  const tipoDocumento = normalizeDocumentType(data?.tipoDocumento);
  const dni = normalizeDocumentNumber(data?.dni);
  const semestreId = toNumber(data?.semestreId, -1);
  const paqueteId = toNumber(data?.paqueteId, -1);
  const recibo = normalizeMatriculaRecibo(data?.recibo);

  if (!tipoDocumento || !dni) {
    throw new https.HttpsError("invalid-argument", "Ingresa tipo y numero de documento.");
  }
  if (semestreId <= 0) {
    throw new https.HttpsError("invalid-argument", "Selecciona un periodo.");
  }
  if (paqueteId <= 0) {
    throw new https.HttpsError("invalid-argument", "Selecciona un modulo.");
  }
  if (!recibo) {
    throw new https.HttpsError("invalid-argument", "Ingresa el numero de recibo.");
  }

  try {
    const { responsable, responsableUser } = await getMatriculaResponsableFromContext(context);
    const existingUser = await findUserByDocument(tipoDocumento, dni);
    const savedUser = await saveUserForMatricula(existingUser, {
      ...(data as Record<string, unknown>),
      tipoDocumento,
      dni,
    }, context);
    const userId = savedUser.userId;
    await ensureNoMatriculaDuplicates(userId, semestreId, paqueteId, recibo);
    const grupoMapping = await getGrupoModuloMapping(semestreId, paqueteId);
    const matricula = await createMatriculaWithModuloEstudiantes({
      ...(data as Record<string, unknown>),
      userId,
      paqueteId,
      semestreId,
      recibo,
      responsableId: responsable?.id ?? null,
      responsableUserId: responsableUser.id,
      grupoId: grupoMapping.grupoId,
      moduloGrupos: grupoMapping.moduloGrupos,
      fecha: new Date().toISOString(),
      archivado: false,
    });
    let workspaceGroup: Awaited<ReturnType<typeof syncMatriculaStudentToWorkspaceGroup>>;
    try {
      workspaceGroup = await syncMatriculaStudentToWorkspaceGroup(grupoMapping, savedUser.workspacePrimaryEmail);
    } catch (workspaceGroupError) {
      if (matricula.id) {
        await cleanupMatricula(matricula.id);
      }
      throw workspaceGroupError;
    }

    let documentProcessingJobId: string | null = null;
    if (data?.procesarImagenesDni !== false) {
      try {
        documentProcessingJobId = await enqueueMatriculaDocumentProcessingJob({
          matriculaId: matricula.id ?? null,
          userId,
          tipoDocumento,
          dni,
          fechaNacimiento: data?.fechaNacimiento,
          frente: getUploadedImage(data?.dniImagenFrente, existingUser?.dniImagenFrenteUrl),
          reverso: getUploadedImage(data?.dniImagenReverso, existingUser?.dniImagenReversoUrl),
          dniImagenFrenteProcesadaUrl: existingUser?.dniImagenFrenteProcesadaUrl,
          dniImagenReversoProcesadaUrl: existingUser?.dniImagenReversoProcesadaUrl,
          analisisDocumentoTemporal: getDocumentoAnalisisMetadata(data?.analisisDocumentoTemporal),
        });
      } catch (jobError) {
        console.warn("No se pudo encolar el procesamiento de documentos de matricula:", jobError);
      }
    }

    return { ...matricula, semestreId, documentProcessingJobId, workspaceGroup };
  } catch (error) {
    if (error instanceof https.HttpsError) throw error;
    console.error("Error in crearMatriculaFormulario:", error);
    throw new https.HttpsError("internal", "No se pudo registrar la matricula.");
  }
}

export const crearMatriculaFormulario = https.onCall(async (data, context) => {
  await requirePermission(context, "matriculas", "create");
  return crearMatriculaFormularioData(data, context);
});

export const crearMatriculaFormularioSuelto = https.onCall(async (data, context) => {
  await requireFormularioMatriculaAccess(context);
  await requireFormularioMatriculaOpen();
  return crearMatriculaFormularioData(data, context);
});

export const updateMatriculaFormulario = https.onCall(async (data, context) => {
  await requirePermission(context, "matriculas", "edit");

  const matriculaId = toNumber(data?.id, -1);
  const tipoDocumento = normalizeDocumentType(data?.tipoDocumento);
  const dni = normalizeDocumentNumber(data?.dni);
  const semestreId = toNumber(data?.semestreId, -1);
  const paqueteId = toNumber(data?.paqueteId, -1);
  const recibo = normalizeMatriculaRecibo(data?.recibo);

  if (matriculaId <= 0) {
    throw new https.HttpsError("invalid-argument", "id is required.");
  }
  if (!tipoDocumento || !dni) {
    throw new https.HttpsError("invalid-argument", "Ingresa tipo y numero de documento.");
  }
  if (semestreId <= 0) {
    throw new https.HttpsError("invalid-argument", "Selecciona un periodo.");
  }
  if (paqueteId <= 0) {
    throw new https.HttpsError("invalid-argument", "Selecciona un modulo.");
  }
  if (!recibo) {
    throw new https.HttpsError("invalid-argument", "Ingresa el numero de recibo.");
  }

  try {
    const currentMatricula = await getMatriculaById(matriculaId);
    if (!currentMatricula) {
      throw new https.HttpsError("not-found", "La matricula no existe.");
    }
    const previousWorkspaceGroups = await getMatriculaWorkspaceGroups(matriculaId);
    const previousWorkspaceEmail = resolveWorkspaceEmailForMatriculaUser(currentMatricula.user);

    const documentUser = await findUserByDocument(tipoDocumento, dni);
    const userToSave = documentUser ?? currentMatricula.user ?? null;
    const savedUser = await saveUserForMatricula(userToSave, {
      ...(data as Record<string, unknown>),
      tipoDocumento,
      dni,
    }, context);
    const userId = savedUser.userId;

    await ensureNoMatriculaDuplicates(userId, semestreId, paqueteId, recibo, matriculaId);
    const grupoMapping = await getGrupoModuloMapping(semestreId, paqueteId);

    const paqueteResponse = await dataConnect.executeGraphql<{
      paquete: DataConnectPaquete | null;
      paqueteModulos: DataConnectPaqueteModulo[];
    }, { paqueteId: number }>(GET_PAQUETE_MODULOS_FOR_MATRICULA_QUERY, { variables: { paqueteId } });

    if (!paqueteResponse.data.paquete) {
      throw new https.HttpsError("not-found", "El paquete seleccionado no existe.");
    }
    if (paqueteResponse.data.paquete.archivado) {
      throw new https.HttpsError("failed-precondition", "El paquete seleccionado esta archivado.");
    }

    const paqueteModulos = sortPaqueteModulos(paqueteResponse.data.paqueteModulos ?? []);
    if (paqueteModulos.length < 1 || paqueteModulos.length > 3) {
      throw new https.HttpsError(
        "failed-precondition",
        "El paquete debe tener entre 1 y 3 modulos antes de matricular.",
      );
    }

    const matriculaPayload = buildMatriculaDataFromInput({
      ...data,
      userId,
      paqueteId,
      semestreId,
      recibo,
      fecha: data?.fecha ?? currentMatricula.fecha ?? new Date().toISOString(),
      archivado: data?.archivado ?? currentMatricula.archivado ?? false,
      responsableId: undefined,
      responsableUserId: undefined,
    });

    const updated = await dataConnect.executeGraphql<
      { matricula_update: unknown },
      { id: number; data: DataConnectMatriculaInput }
    >(UPDATE_MATRICULA_MUTATION, { variables: { id: matriculaId, data: matriculaPayload } });

    const savedMatriculaId = getIdFromKeyOutput(updated.data.matricula_update) ?? matriculaId;
    await replaceModuloEstudiantesForMatricula(
      savedMatriculaId,
      paqueteModulos,
      new Map(grupoMapping.moduloGrupos.map((item) => [item.moduloId, item.grupoId ?? null])),
      grupoMapping.grupoId,
    );
    const workspaceGroup = await syncMatriculaWorkspaceGroupChange({
      previousGroups: previousWorkspaceGroups,
      newGroup: grupoMapping,
      previousUserId: currentMatricula.userId ?? userId,
      currentMatriculaId: savedMatriculaId,
      previousWorkspaceEmail,
      newWorkspaceEmail: savedUser.workspacePrimaryEmail,
    });

    let documentProcessingJobId: string | null = null;
    if (data?.procesarImagenesDni !== false) {
      try {
        documentProcessingJobId = await enqueueMatriculaDocumentProcessingJob({
          matriculaId: savedMatriculaId,
          userId,
          tipoDocumento,
          dni,
          fechaNacimiento: data?.fechaNacimiento ?? userToSave?.fechaNacimiento,
          frente: getUploadedImage(data?.dniImagenFrente, userToSave?.dniImagenFrenteUrl),
          reverso: getUploadedImage(data?.dniImagenReverso, userToSave?.dniImagenReversoUrl),
          dniImagenFrenteProcesadaUrl: userToSave?.dniImagenFrenteProcesadaUrl,
          dniImagenReversoProcesadaUrl: userToSave?.dniImagenReversoProcesadaUrl,
          analisisDocumentoTemporal: getDocumentoAnalisisMetadata(data?.analisisDocumentoTemporal),
        });
      } catch (jobError) {
        console.warn("No se pudo encolar el procesamiento de documentos de matricula actualizada:", jobError);
      }
    }

    return { id: savedMatriculaId, semestreId, paqueteId, userId, documentProcessingJobId, workspaceGroup };
  } catch (error) {
    if (error instanceof https.HttpsError) throw error;
    console.error("Error in updateMatriculaFormulario:", error);
    throw new https.HttpsError("internal", "No se pudo actualizar la matricula.");
  }
});

export const deleteMatricula = https.onCall(async (data, context) => {
  await requirePermission(context, "matriculas", "delete");

  const matriculaId = toNumber(data?.id, -1);
  if (matriculaId <= 0) {
    throw new https.HttpsError("invalid-argument", "id is required.");
  }

  try {
    return { id: await deleteMatriculaTree(matriculaId) };
  } catch (error) {
    console.error("Error in deleteMatricula:", error);
    throw new https.HttpsError("internal", "No se pudo eliminar la matricula.");
  }
});

export const createMatriculaDesdePaquete = https.onCall(async (data, context) => {
  await requirePermission(context, "matriculas", "create");

  try {
    return await createMatriculaWithModuloEstudiantes(data as Record<string, unknown>);
  } catch (error) {
    if (error instanceof https.HttpsError) {
      throw error;
    }
    console.error("Error in createMatriculaDesdePaquete:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while creating matricula.");
  }
});
