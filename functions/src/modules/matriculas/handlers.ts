import { getStorage } from "firebase-admin/storage";
import { getFirestore } from "firebase-admin/firestore";
import { firestore as functionsFirestore, https, runWith } from "firebase-functions/v1";
import { randomUUID } from "crypto";
import sharp from "sharp";
import { google } from "googleapis";
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
  INSERT_MATRICULA_CAMBIO_MODULO_MUTATION,
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
import {
  getConfiguredSemestreConsultaIds,
  getDocenteMenuSemestreSelection,
} from "../settings/handlers.js";
import {
  appendMatriculaCurrentSemesterSheetBestEffort,
  syncMatriculasCurrentSemesterSheetBestEffort,
} from "./googleSheetsSync.js";

interface MatriculaUserRow {
  id: number;
  documentId?: string | null;
  username?: string | null;
  nickName?: string | null;
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
  nombreColegio?: string | null;
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
  avatarMediano?: string | null;
  avatarPequeno?: string | null;
  avatarTiny?: string | null;
  recorteFotografia?: string | null;
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
  monitoreadoPor?: MatriculaResponsableRow | null;
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

interface MatriculaCambioModuloRow {
  id?: number | null;
  fechaCambio?: string | null;
  grupoModuloAnterior?: {
    id?: number | null;
    nombre?: string | null;
  } | null;
  grupoModuloNuevo?: {
    id?: number | null;
    nombre?: string | null;
  } | null;
  grupoAnterior?: {
    id?: number | null;
    nombreDisplay?: string | null;
  } | null;
  grupoNuevo?: {
    id?: number | null;
    nombreDisplay?: string | null;
  } | null;
  moduloAnterior?: {
    id?: number | null;
    titulo?: string | null;
    tituloComercial?: string | null;
  } | null;
  moduloNuevo?: {
    id?: number | null;
    titulo?: string | null;
    tituloComercial?: string | null;
  } | null;
  semestre?: {
    id?: number | null;
    titulo?: string | null;
  } | null;
  registradoPor?: {
    id?: number | null;
    nombre?: string | null;
    apellidoPaterno?: string | null;
    apellidoMaterno?: string | null;
    username?: string | null;
    email?: string | null;
    correoInstitucional?: string | null;
  } | null;
}

interface MatriculaRow {
  id: number;
  recibo?: string | null;
  fecha?: string | null;
  fechaActualizacion?: string | null;
  codigoInscripcion?: string | null;
  archivado?: boolean | null;
  paqueteId?: number | null;
  grupoId?: number | null;
  semestreId?: number | null;
  userId?: number | null;
  responsableId?: number | null;
  responsableUserId?: number | null;
  user?: MatriculaUserRow | null;
  responsable?: MatriculaResponsableRow | null;
  responsableUser?: MatriculaResponsableUserRow | null;
  modulosEstudiantes?: MatriculaModuloLinkRow[];
  cambiosModulo?: MatriculaCambioModuloRow[];
  fichaUnidadesDidacticas?: MatriculaFichaUnidadDidactica[];
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
    inicio?: string | null;
    fin?: string | null;
    archivado?: boolean | null;
    director?: {
      id?: number | null;
      displayName?: string | null;
      user?: {
        username?: string | null;
        nombre?: string | null;
        apellidoPaterno?: string | null;
        apellidoMaterno?: string | null;
      } | null;
    } | null;
  } | null;
}

interface MatriculaFichaPlan {
  id?: number | null;
  planEstudio?: string | null;
  carrera?: {
    id?: number | null;
    nombre?: string | null;
    titulo?: string | null;
    nivel?: string | null;
    ciclo?: string | null;
    tipoCarrera?: {
      nombre?: string | null;
    } | null;
  } | null;
}

interface MatriculaFichaPlanModulo {
  id?: number | null;
  orden?: number | null;
  planId?: number | null;
  moduloId?: number | null;
  plan?: MatriculaFichaPlan | null;
}

interface MatriculaFichaUnidadDidactica {
  id: number;
  nombre?: string | null;
  duracion?: number | null;
  creditos?: number | null;
  orden?: number | null;
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
  coordinador1?: MatriculaResponsableRow | null;
}

interface MatriculaDocenteGrupoModulo {
  id: number;
  nombre?: string | null;
  orden?: number | null;
  instancia?: number | null;
  sufijo?: string | null;
  grupoId: number;
  moduloId: number;
  grupo?: {
    id?: number | null;
    nombreDisplay?: string | null;
    semestreId?: number | null;
    personalId?: number | null;
    personal?: MatriculaResponsableRow | null;
    semestre?: {
      id?: number | null;
      titulo?: string | null;
      inicio?: string | null;
      fin?: string | null;
      coordinador1?: MatriculaResponsableRow | null;
    } | null;
  } | null;
  modulo?: {
    titulo?: string | null;
    tituloComercial?: string | null;
  } | null;
}

interface MatriculaDocenteModuloEstudiante {
  matriculaId?: number | null;
  grupoModuloId?: number | null;
  grupoId?: number | null;
  moduloId?: number | null;
}

type MatriculaFichaModulo = {
  id?: number | null;
  titulo?: string | null;
  tituloComercial?: string | null;
  horas?: number | null;
  creditos?: number | null;
  duracionEfsrt?: number | null;
  creditosEfsrt?: number | null;
  plan?: MatriculaFichaPlan | null;
};

type MatriculaFichaGrupoModulo = {
  id?: number | null;
  nombre?: string | null;
  inicio?: string | null;
  fin?: string | null;
  grupo?: {
    id?: number | null;
    nombreDisplay?: string | null;
    turnoNombre?: string | null;
    semestre?: {
      id?: number | null;
      titulo?: string | null;
      inicio?: string | null;
      fin?: string | null;
    } | null;
    turno?: {
      nombre?: string | null;
    } | null;
  } | null;
  modulo?: MatriculaFichaModulo | null;
  moduloId?: number | null;
  grupoId?: number | null;
};

interface MatriculaModuloLinkRow {
  id?: number | null;
  matriculaId?: number | null;
  grupoModuloId?: number | null;
  grupoId?: number | null;
  moduloId?: number | null;
  promedio?: number | null;
  puntaje?: number | null;
  grupoModulo?: MatriculaFichaGrupoModulo | null;
}

type MatriculaSaveUserResult = {
  userId: number;
  workspacePrimaryEmail: string | null;
  workspaceWarning?: string | null;
};

type GrupoModuloMapping = {
  grupoId: number;
  semestreId: number;
  paqueteId: number;
  workspaceCorreo?: string | null;
  moduloGrupos: Array<{ grupoModuloId: number; moduloId: number; grupoId: number }>;
};

type MatriculaWorkspaceGroup = {
  grupoId: number;
  workspaceCorreo?: string | null;
};

const getPaqueteModuloMultiplicador = (paqueteModulo: DataConnectPaqueteModulo) =>
  Math.max(1, Math.min(6, paqueteModulo.multiplicador ?? 1));

const sleep = (milliseconds: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

function getErrorStatus(error: unknown) {
  const err = error as {
    code?: number | string;
    status?: number | string;
    response?: { status?: number | string };
  } | null;
  return Number(err?.code) || Number(err?.status) || Number(err?.response?.status) || 0;
}

function isTransientWorkspaceError(error: unknown) {
  const status = getErrorStatus(error);
  const message = JSON.stringify({
    message: (error as { message?: string } | null)?.message || "",
    errors: (error as { errors?: unknown } | null)?.errors || "",
    responseData: (error as { response?: { data?: unknown } } | null)?.response?.data || "",
  }).toLowerCase();
  return (
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    message.includes("backend error") ||
    message.includes("backenderror") ||
    message.includes("service unavailable") ||
    message.includes("timeout") ||
    message.includes("temporarily unavailable") ||
    message.includes("rate limit") ||
    message.includes("econnreset")
  );
}

function getWorkspaceWarningMessage(error: unknown) {
  const message = String((error as { message?: string } | null)?.message || "").trim();
  return message || "Google Workspace no respondio temporalmente; la matricula se guardo y la sincronizacion puede reintentarse luego.";
}

async function retryTransientWorkspace<T>(operation: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let index = 0; index < attempts; index += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isTransientWorkspaceError(error) || index === attempts - 1) break;
      await sleep(600 * (index + 1));
    }
  }
  throw lastError;
}

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
  instruccion?: string | null;
  nombreColegio?: string | null;
  celular?: string | null;
  telefono?: string | null;
  email?: string | null;
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

type SimpleOcrImageInput = {
  data?: unknown;
  mimeType?: unknown;
  name?: unknown;
};

type GeminiMatriculaArchivoResult = {
  indice?: number | null;
  nombreArchivo?: string | null;
  tipoLado?: string | null;
  areaLectura?: string | null;
  tieneDosCuerpos?: boolean | null;
  textoReconocido?: string | null;
  senalesReverso?: string[] | null;
  fragmentosReverso?: string[] | null;
  contieneDireccion?: boolean | null;
  contieneDomicilio?: boolean | null;
  contieneDistrito?: boolean | null;
  contienePerMrz?: boolean | null;
};

type GeminiMatriculaResult = {
  tipoDocumento?: string | null;
  numeroDocumento?: string | null;
  documentoCoincide?: boolean | null;
  contieneReverso?: boolean | null;
  archivos?: GeminiMatriculaArchivoResult[] | null;
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
  textoReconocido?: string | null;
  observaciones?: string | null;
};

class GeminiJsonParseError extends Error {
  preview: string;

  constructor(message: string, preview: string) {
    super(message);
    this.name = "GeminiJsonParseError";
    this.preview = preview;
  }
}

const GEMINI_MATRICULA_RESPONSE_SCHEMA = {
  type: "OBJECT",
  required: [
    "tipoDocumento",
    "numeroDocumento",
    "documentoCoincide",
    "contieneReverso",
    "archivos",
    "nombre",
    "apellidoPaterno",
    "apellidoMaterno",
    "sexo",
    "nacionalidad",
    "fechaNacimiento",
    "fechaVencimiento",
    "estadoCivil",
    "direccion",
    "distrito",
  ],
  properties: {
    tipoDocumento: { type: "STRING", nullable: true, enum: ["DNI", "CE"] },
    numeroDocumento: { type: "STRING", nullable: true },
    documentoCoincide: { type: "BOOLEAN" },
    contieneReverso: { type: "BOOLEAN" },
    archivos: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        required: [
          "indice",
          "tipoLado",
          "areaLectura",
          "tieneDosCuerpos",
          "contieneDireccion",
          "contieneDomicilio",
          "contieneDistrito",
          "contienePerMrz",
        ],
        properties: {
          indice: { type: "INTEGER" },
          tipoLado: { type: "STRING", enum: ["frente", "reverso", "desconocido"] },
          areaLectura: { type: "STRING", enum: ["superior", "inferior", "completa"] },
          tieneDosCuerpos: { type: "BOOLEAN" },
          contieneDireccion: { type: "BOOLEAN" },
          contieneDomicilio: { type: "BOOLEAN" },
          contieneDistrito: { type: "BOOLEAN" },
          contienePerMrz: { type: "BOOLEAN" },
        },
      },
    },
    nombre: { type: "STRING", nullable: true },
    apellidoPaterno: { type: "STRING", nullable: true },
    apellidoMaterno: { type: "STRING", nullable: true },
    sexo: { type: "STRING", nullable: true, enum: ["F", "M"] },
    nacionalidad: { type: "STRING", nullable: true },
    fechaNacimiento: { type: "STRING", nullable: true },
    fechaVencimiento: { type: "STRING", nullable: true },
    estadoCivil: { type: "STRING", nullable: true },
    direccion: { type: "STRING", nullable: true },
    distrito: { type: "STRING", nullable: true },
  },
} as const;

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
  orientation: string | null;
  rotationClockwise: number | null;
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
const DEFAULT_AVATAR_IMAGE_SETTING = "gemini-3.1-flash-image-512";
const DEFAULT_AVATAR_IMAGE_LOCATION = "global";
const DNI_RECOGNITION_ENABLED_KEY = "formularioMatricula.activarReconocimientoDni";
const DNI_RECOGNITION_ENABLED_LEGACY_KEY = "general.activarReconocimientoDni";
const AVATAR_GENERATION_ENABLED_KEY = "visualizaciones.usarGeneradorImagenesAvatar";
const AVATAR_GENERATION_MODEL_KEY = "visualizaciones.modeloGeneradorImagenesAvatar";
const FORMULARIO_MATRICULA_ACEPTA_RESPUESTAS_KEY = "formularioMatricula.aceptaRespuestas";
const FORMULARIO_MATRICULA_SIGUIENTE_ACEPTA_RESPUESTAS_KEY = "formularioMatricula.siguienteAceptaRespuestas";
const FORMULARIO_MATRICULA_FONDO_COLOR_KEY = "formularioMatricula.fondoColor";
const FORMULARIO_MATRICULA_SIGUIENTE_FONDO_COLOR_KEY = "formularioMatricula.siguienteFondoColor";
const FORMULARIO_MATRICULA_ACEPTA_RESPUESTAS_LEGACY_KEY = "general.formularioMatriculaAceptaRespuestas";
const FORMULARIO_MATRICULA_SEMESTRE_ID_KEY = "formularioMatricula.semestreId";
const CURRENT_SEMESTRE_ID_KEY = "general.semestreActualId";

const USER_FIELDS = `
  id
  documentId
  username
  nickName
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
  nombreColegio
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
  recorteFotografia
  dniImagenFrenteUrl
  dniImagenReversoUrl
  dniImagenFrenteProcesadaUrl
  dniImagenReversoProcesadaUrl
  rolId
`;

const MATRICULA_LIST_USER_FIELDS = `
  id
  documentId
  username
  email
  dni
  tipoDocumento
  nombre
  apellidos
  apellidoPaterno
  apellidoMaterno
  fechaNacimiento
  celular
  correoInstitucional
  avatar
  rolId
`;

const GET_PAQUETE_MODULOS_FOR_MATRICULA_QUERY = `
  query GetPaqueteModulosForMatricula($paqueteId: Int!) {
    paquete(id: $paqueteId) {
      id
      archivado
    }
    paqueteModulos(where: { paqueteId: { eq: $paqueteId } }, limit: 50) {
      id
      orden
      obligatorio
      multiplicador
      sufijos
      paqueteId
      moduloId
    }
  }
`;

const FIND_STUDENT_USER_BY_DOCUMENT_QUERY = `
  query FindStudentUserByDocumentForMatricula($tipoDocumento: String!, $dni: String!, $rolId: Int!) {
    users(where: { tipoDocumento: { eq: $tipoDocumento }, dni: { eq: $dni }, rolId: { eq: $rolId } }, limit: 1) {
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
  fechaActualizacion
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
    inicio
    fin
    archivado
    director {
      id
      displayName
      user {
        username
        nombre
        apellidoPaterno
        apellidoMaterno
      }
    }
  }
`;

const MATRICULA_LIST_FIELDS = `
  id
  recibo
  fecha
  fechaActualizacion
  codigoInscripcion
  archivado
  paqueteId
  semestreId
  userId
  responsableId
  responsableUserId
  user {
    ${MATRICULA_LIST_USER_FIELDS}
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
    archivado
  }
  semestre {
    id
    titulo
    inicio
    fin
    archivado
  }
`;

const MATRICULA_LIST_QUERY_LIMIT = 5000;

const LIST_MATRICULAS_BY_SEMESTRE_QUERY = `
  query ListMatriculasBySemestreManual($semestreId: Int!) {
    matriculas(where: { semestreId: { eq: $semestreId } }, limit: ${MATRICULA_LIST_QUERY_LIMIT}, orderBy: [{id: DESC}]) {
      ${MATRICULA_LIST_FIELDS}
    }
  }
`;

const LIST_MATRICULAS_BY_IDS_QUERY = `
  query ListMatriculasByIdsManual($matriculaIds: [Int!]!, $semestreId: Int!) {
    matriculas(where: { id: { in: $matriculaIds }, semestreId: { eq: $semestreId } }, limit: ${MATRICULA_LIST_QUERY_LIMIT}, orderBy: [{id: DESC}]) {
      ${MATRICULA_LIST_FIELDS}
    }
  }
`;

const EDITOR_DOCUMENTOS_MATRICULA_FIELDS = `
  id
  fecha
  semestreId
  userId
  responsableUserId
  user {
    id
    documentId
    dni
    tipoDocumento
    nombre
    apellidoPaterno
    apellidoMaterno
    email
    correoInstitucional
    avatar
    dniImagenFrenteUrl
    dniImagenReversoUrl
    dniImagenFrenteProcesadaUrl
    dniImagenReversoProcesadaUrl
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
  semestre {
    id
    titulo
  }
`;

const LIST_EDITOR_DOCUMENTOS_MATRICULAS_QUERY = `
  query ListEditorDocumentosMatriculas($semestreId: Int!) {
    matriculas(where: { semestreId: { eq: $semestreId } }, limit: 30, orderBy: [{id: DESC}]) {
      ${EDITOR_DOCUMENTOS_MATRICULA_FIELDS}
    }
  }
`;

const GET_EDITOR_DOCUMENTO_MATRICULA_QUERY = `
  query GetEditorDocumentoMatricula($id: Int!) {
    matricula(id: $id) {
      ${EDITOR_DOCUMENTOS_MATRICULA_FIELDS}
    }
  }
`;

const GET_EDITOR_DOCUMENTO_USER_BY_ID_QUERY = `
  query GetEditorDocumentoUserById($id: Int!) {
    user(id: $id) {
      ${USER_FIELDS}
    }
  }
`;

const GET_EDITOR_DOCUMENTO_USER_BY_DOCUMENT_ID_QUERY = `
  query GetEditorDocumentoUserByDocumentId($documentId: String!) {
    users(where: { documentId: { eq: $documentId } }, limit: 1) {
      ${USER_FIELDS}
    }
  }
`;

const LIST_MATRICULA_DOCENTE_PERSONALS_BY_USER_ID_QUERY = `
  query ListMatriculaDocentePersonalsByUserId($userId: Int!) {
    personals(where: { userId: { eq: $userId } }, limit: 50) {
      id
      userId
    }
  }
`;

const LIST_MATRICULA_DOCENTE_SEMESTRES_QUERY = `
  query ListMatriculaDocenteSemestres {
    semestres(limit: 500) {
      id
      titulo
      inicio
      fin
      archivado
      coordinador1 {
        id
        displayName
        user {
          username
          nombre
          apellidoPaterno
          apellidoMaterno
          email
          correoInstitucional
        }
      }
    }
  }
`;

const LIST_MATRICULA_GRUPOS_BY_SEMESTRE_IDS_QUERY = `
  query ListMatriculaGruposBySemestreIds($semestreIds: [Int!]!) {
    grupos(where: { semestreId: { in: $semestreIds }, archivado: { ne: true } }, limit: 5000) {
      id
      nombreDisplay
      semestreId
      personalId
      personal {
        id
        displayName
        monitoreadoPor {
          id
          displayName
          user {
            username
            nombre
            apellidoPaterno
            apellidoMaterno
            email
            correoInstitucional
          }
        }
        user {
          username
          nombre
          apellidoPaterno
          apellidoMaterno
          email
          correoInstitucional
        }
      }
      semestre {
        id
        titulo
        inicio
        fin
        coordinador1 {
          id
          displayName
          user {
            username
            nombre
            apellidoPaterno
            apellidoMaterno
            email
            correoInstitucional
          }
        }
      }
    }
  }
`;

const LIST_MATRICULA_GRUPO_MODULOS_BY_GRUPO_IDS_QUERY = `
  query ListMatriculaGrupoModulosByGrupoIds($grupoIds: [Int!]!) {
    grupoModulos(where: { grupoId: { in: $grupoIds } }, limit: 5000) {
      id
      nombre
      orden
      instancia
      sufijo
      grupoId
      moduloId
      modulo {
        titulo
        tituloComercial
      }
    }
  }
`;

const LIST_MATRICULA_GRUPO_MODULOS_BY_IDS_QUERY = `
  query ListMatriculaGrupoModulosByIds($grupoModuloIds: [Int!]!) {
    grupoModulos(where: { id: { in: $grupoModuloIds } }, limit: 500) {
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
        personal {
          id
          displayName
          monitoreadoPor {
            id
            displayName
            user {
              username
              nombre
              apellidoPaterno
              apellidoMaterno
              email
              correoInstitucional
            }
          }
          user {
            username
            nombre
            apellidoPaterno
            apellidoMaterno
            email
            correoInstitucional
          }
        }
        semestre {
          id
          titulo
          inicio
          fin
          coordinador1 {
            id
            displayName
            user {
              username
              nombre
              apellidoPaterno
              apellidoMaterno
              email
              correoInstitucional
            }
          }
        }
      }
      modulo {
        titulo
        tituloComercial
      }
    }
  }
`;

const LIST_MODULO_ESTUDIANTES_BY_GRUPO_MODULO_IDS_QUERY = `
  query ListModuloEstudiantesByGrupoModuloIdsForMatriculas($grupoModuloIds: [Int!]!) {
    modulosEstudiantes(where: { grupoModuloId: { in: $grupoModuloIds } }, limit: 200000) {
      matriculaId
      grupoModuloId
      grupoId
      moduloId
    }
  }
`;

const LIST_MODULO_ESTUDIANTES_BY_GRUPO_IDS_QUERY = `
  query ListModuloEstudiantesByGrupoIdsForMatriculas($grupoIds: [Int!]!) {
    modulosEstudiantes(where: { grupoId: { in: $grupoIds } }, limit: 200000) {
      matriculaId
      grupoModuloId
      grupoId
      moduloId
    }
  }
`;

const LIST_MODULO_ESTUDIANTES_BY_MATRICULA_IDS_FOR_LIST_QUERY = `
  query ListModuloEstudiantesByMatriculaIdsForMatriculas($matriculaIds: [Int!]!) {
    modulosEstudiantes(where: { matriculaId: { in: $matriculaIds } }, limit: 10000) {
      id
      matriculaId
      grupoModuloId
      grupoId
      moduloId
      promedio
      puntaje
      grupoModulo {
        id
        nombre
        inicio
        fin
        grupoId
        moduloId
        grupo {
          id
          nombreDisplay
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
        }
      }
    }
  }
`;

const GET_MATRICULA_QUERY = `
  query GetMatriculaManual($id: Int!) {
    matricula(id: $id) {
      ${MATRICULA_FIELDS}
    }
    modulosEstudiantes(where: { matriculaId: { eq: $id } }, limit: 10) {
      id
      matriculaId
      moduloId
      grupoId
      grupoModuloId
      promedio
      puntaje
      grupoModulo {
        id
        nombre
        inicio
        fin
        grupo {
          id
          nombreDisplay
          turnoNombre
          turno { nombre }
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
          horas
          creditos
          duracionEfsrt
          creditosEfsrt
          plan {
            id
            planEstudio
            carrera {
              id
              nombre
              titulo
              nivel
              ciclo
              tipoCarrera { nombre }
            }
          }
        }
      }
    }
    grupoModulos(limit: 50000) {
      id
      nombre
      inicio
      fin
      grupoId
      moduloId
      grupo {
        id
        nombreDisplay
        turnoNombre
        turno { nombre }
        semestre {
          id
          titulo
          inicio
          fin
        }
      }
    }
    modulos(limit: 5000) {
      id
      titulo
      tituloComercial
      horas
      creditos
      duracionEfsrt
      creditosEfsrt
      plan {
        id
        planEstudio
        carrera {
          id
          nombre
          titulo
          nivel
          ciclo
          tipoCarrera { nombre }
        }
      }
    }
    grupoModuloUnidadesDidacticas(limit: 50000) {
      orden
      grupoModuloId
      unidadDidacticaId
    }
    unidadDidacticaModulos(limit: 50000) {
      orden
      moduloId
      unidadDidacticaId
    }
    unidadesDidacticas(limit: 50000) {
      id
      nombre
      duracion
      creditos
    }
    planModulos(limit: 5000) {
      id
      orden
      planId
      moduloId
      plan {
        id
        planEstudio
        carrera {
          id
          nombre
          titulo
          nivel
          ciclo
          tipoCarrera { nombre }
        }
      }
    }
    matriculaCambiosModulo(where: { matriculaId: { eq: $id } }, limit: 100, orderBy: [{ id: DESC }]) {
      id
      fechaCambio
      grupoModuloAnterior {
        id
        nombre
      }
      grupoModuloNuevo {
        id
        nombre
      }
      grupoAnterior {
        id
        nombreDisplay
      }
      grupoNuevo {
        id
        nombreDisplay
      }
      moduloAnterior {
        id
        titulo
        tituloComercial
      }
      moduloNuevo {
        id
        titulo
        tituloComercial
      }
      semestre {
        id
        titulo
      }
      registradoPor {
        id
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
      coordinador1 {
        id
        displayName
        user {
          username
          nombre
          apellidoPaterno
          apellidoMaterno
          email
          correoInstitucional
        }
      }
      anio {
        id
        nombre
        titulo
      }
    }
    grupos(limit: 10000) {
      id
      semestreId
      archivado
    }
    matriculas(limit: 10000) {
      id
      semestreId
      archivado
    }
  }
`;

const LIST_MATRICULA_SEMESTRES_BY_IDS_QUERY = `
  query ListMatriculaSemestresByIds($semestreIds: [Int!]!) {
    semestres(where: { id: { in: $semestreIds } }, limit: 500) {
      id
      titulo
      inicio
      fin
      archivado
      coordinador1 {
        id
        displayName
        user {
          username
          nombre
          apellidoPaterno
          apellidoMaterno
          email
          correoInstitucional
        }
      }
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
      stringValue
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

const GET_GRUPO_FOR_MATRICULA_QUERY = `
  query GetGrupoForMatricula($grupoId: Int!) {
    grupo(id: $grupoId) {
      id
      semestreId
      paqueteId
      workspaceCorreo
      archivado
      paquete {
        id
        archivado
      }
    }
  }
`;

const GET_GRUPO_MODULOS_FOR_MATRICULA_QUERY = `
  query GetGrupoModulosForMatricula($grupoId: Int!) {
    grupoModulos(where: { grupoId: { eq: $grupoId } }, limit: 50) {
      id
      nombre
      orden
      obligatorio
      inicio
      fin
      grupoId
      moduloId
      instancia
      sufijo
      modulo {
        titulo
        tituloComercial
        orden
        plan {
          carrera {
            especialidad {
              orden
            }
          }
        }
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

const LIST_RECIBOS_MATRICULA_QUERY = `
  query ListRecibosMatricula {
    matriculas(limit: 50000) {
      id
      recibo
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

const HALF_BECA_RECIBO_LABEL = "1/2 BECA";
const HALF_BECA_RECIBO_REGULARIZAR = `${HALF_BECA_RECIBO_LABEL} - POR REGULARIZAR`;
const VALID_RECIBO_TEXT_VALUES = new Set(["CONADIS", "BECADO", "POR REGULARIZAR", HALF_BECA_RECIBO_REGULARIZAR]);

function isRepeatableMatriculaRecibo(recibo: string) {
  return VALID_RECIBO_TEXT_VALUES.has(recibo);
}

function normalizeMatriculaReciboNumber(compactText: string): string | null {
  if (!/^\d{1,6}$/.test(compactText)) return null;
  return compactText.replace(/^0+(?=\d)/, "");
}

function normalizeMatriculaRecibo(value: unknown): string | null {
  const text = asCleanString(value)?.toUpperCase().replace(/\s+/g, " ") ?? null;
  if (!text) return null;
  if (VALID_RECIBO_TEXT_VALUES.has(text)) return text;
  const halfBecaMatch = /^1\/2\s*BECA(?:\s*-\s*(.+))?$/.exec(text);
  if (halfBecaMatch) {
    const detail = asCleanString(halfBecaMatch[1]);
    if (!detail) {
      throw new https.HttpsError("invalid-argument", "Completa el numero de recibo o POR REGULARIZAR para 1/2 BECA.");
    }
    const detailCompactText = detail.toUpperCase().replace(/\s+/g, "");
    if (detailCompactText === "PORREGULARIZAR") return HALF_BECA_RECIBO_REGULARIZAR;
    const detailNumber = normalizeMatriculaReciboNumber(detailCompactText);
    if (detailNumber) return `${HALF_BECA_RECIBO_LABEL} - ${detailNumber}`;
    throw new https.HttpsError("invalid-argument", "El recibo de 1/2 BECA debe ser POR REGULARIZAR o un numero de hasta 6 digitos.");
  }
  const compactText = text.replace(/\s+/g, "");
  if (compactText === "PORREGULARIZAR") return "POR REGULARIZAR";
  const reciboNumber = normalizeMatriculaReciboNumber(compactText);
  if (reciboNumber) return reciboNumber;
  throw new https.HttpsError("invalid-argument", "El recibo debe ser CONADIS, BECADO, POR REGULARIZAR, 1/2 BECA con detalle, o un numero de hasta 6 digitos.");
}

function getMatriculaReciboNumericKey(value: unknown): string | null {
  const text = asCleanString(value)?.toUpperCase().replace(/\s+/g, " ") ?? null;
  if (!text) return null;
  const halfBecaMatch = /^1\/2\s*BECA\s*-\s*(.+)$/.exec(text);
  const numericCandidate = halfBecaMatch?.[1] ?? text;
  return normalizeMatriculaReciboNumber(numericCandidate.replace(/\s+/g, ""));
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

function documentFilePrefix(value: unknown): "dni" | "ce" {
  return normalizeDocumentType(value) === "CE" ? "ce" : "dni";
}

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

function normalizeOcrTextForSearch(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function normalizeOcrCompact(value: unknown): string {
  return normalizeOcrTextForSearch(value).replace(/[^A-Z0-9<]/g, "");
}

function getSimpleOcrImageInput(value: unknown, label: string): {
  data: string;
  mimeType: string;
  name: string | null;
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new https.HttpsError("invalid-argument", `Envia la imagen ${label}.`);
  }
  const raw = value as SimpleOcrImageInput;
  const dataUrlOrBase64 = asCleanString(raw.data);
  const mimeType = asCleanString(raw.mimeType) ?? "image/jpeg";
  const name = asCleanString(raw.name);
  if (!dataUrlOrBase64) {
    throw new https.HttpsError("invalid-argument", `Envia la imagen ${label}.`);
  }
  if (!mimeType.startsWith("image/")) {
    throw new https.HttpsError("invalid-argument", `La imagen ${label} debe ser un archivo de imagen.`);
  }
  const data = dataUrlOrBase64.includes(",")
    ? dataUrlOrBase64.split(",").pop() ?? ""
    : dataUrlOrBase64;
  if (!data) {
    throw new https.HttpsError("invalid-argument", `La imagen ${label} esta vacia.`);
  }
  return { data, mimeType, name };
}

async function runSimpleVisionOcr(images: Array<{ data: string; mimeType: string; name: string | null }>) {
  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const vision = google.vision({ version: "v1", auth });
  const response = await vision.images.annotate({
    requestBody: {
      requests: images.map((image) => ({
        image: { content: image.data },
        features: [{ type: "TEXT_DETECTION" }],
        imageContext: { languageHints: ["es"] },
      })),
    },
  });
  const responses = response.data.responses ?? [];
  return images.map((image, index) => ({
    name: image.name,
    text: responses[index]?.fullTextAnnotation?.text
      ?? responses[index]?.textAnnotations?.[0]?.description
      ?? "",
    error: responses[index]?.error?.message ?? null,
  }));
}

function validateSimpleOcrFront(text: string, expectedDni: string) {
  const normalized = normalizeOcrTextForSearch(text);
  const compact = normalizeOcrCompact(text);
  const expectedCompact = normalizeOcrCompact(expectedDni);
  const keywords = ["DOCUMENTO", "REGISTRO", "NACIONAL", "IDENTIDAD", "CUI", "REPUBLICA", "PERU"];
  return Boolean(
    (expectedCompact && compact.includes(expectedCompact))
    || keywords.some((keyword) => normalized.includes(keyword)),
  );
}

function validateSimpleOcrBack(text: string) {
  const normalized = normalizeOcrTextForSearch(text);
  const compact = normalizeOcrCompact(text);
  return normalized.includes("DISTRITO")
    || normalized.includes("DOMICILIO")
    || normalized.includes("DIRECCION")
    || compact.includes("PER<")
    || compact.includes("<PER");
}

function getGeminiDocumentInput(value: unknown, label: string): {
  data: string;
  mimeType: string;
  name: string | null;
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new https.HttpsError("invalid-argument", `Envia el archivo ${label}.`);
  }
  const raw = value as SimpleOcrImageInput;
  const dataUrlOrBase64 = asCleanString(raw.data);
  const mimeType = asCleanString(raw.mimeType) ?? "image/jpeg";
  const name = asCleanString(raw.name);
  if (!dataUrlOrBase64) {
    throw new https.HttpsError("invalid-argument", `Envia el archivo ${label}.`);
  }
  if (!mimeType.startsWith("image/") && mimeType !== "application/pdf") {
    throw new https.HttpsError("invalid-argument", `El archivo ${label} debe ser imagen o PDF.`);
  }
  const data = dataUrlOrBase64.includes(",")
    ? dataUrlOrBase64.split(",").pop() ?? ""
    : dataUrlOrBase64;
  if (!data) {
    throw new https.HttpsError("invalid-argument", `El archivo ${label} esta vacio.`);
  }
  return { data, mimeType, name };
}

function resolveMatriculaGeminiProjectId(): string {
  return asCleanString(process.env.MATRICULA_GEMINI_PROJECT_ID)
    ?? asCleanString(process.env.GCLOUD_PROJECT)
    ?? asCleanString(process.env.GOOGLE_CLOUD_PROJECT)
    ?? "cetprosmp-2026";
}

function resolveMatriculaGeminiLocation(): string {
  return asCleanString(process.env.MATRICULA_GEMINI_LOCATION) ?? DEFAULT_AVATAR_IMAGE_LOCATION;
}

function resolveMatriculaGeminiModel(): string {
  return asCleanString(process.env.MATRICULA_GEMINI_MODEL) ?? "gemini-2.5-flash";
}

function buildMatriculaGeminiPrompt(tipoDocumento: string, dni: string): string {
  const documentReadingInstructions = `
Estrategia de lectura:
- Primero revisa la primera imagen para determinar si contiene los dos cuerpos completos del documento, Si el archivo 1 no tiene dos cuerpos revisa el archivo 2 y determina si tiene 2 cuerpos
- Dos cuerpos significa que se ven claramente dos lados separados del documento, por ejemplo frente arriba y reverso abajo, o reverso arriba y frente abajo.
- Si cualquiera de los dos archivos contiene los dos cuerpos completos del documento, trabaja solo con ese archivo y descartar el otro.
- En caso el archivo tenga los dos cuerpos, lee los dos cuerpos del archivo elegido y de ahi extrae todos los datos, determina el tipo y numero de documento, determina cual cuerpo es frente y cual es reverso, y prepara la metadata para OpenCV.
- Si el archivo elegido contiene los dos cuerpos completos pero no logras validar algun dato, devuelve el dato como null; no uses el otro archivo como respaldo.
- Cuando uses un solo archivo con dos cuerpos, devuelve dos elementos en "archivos" con el mismo "indice" del archivo elegido: uno para el cuerpo "superior" y otro para el cuerpo "inferior"; en cada elemento indica "tipoLado" frente/reverso y "areaLectura" superior/inferior.
- Solo si ningun archivo contiene dos cuerpos completos, analiza ambos archivos con el flujo normal de frente/reverso.
- Si un archivo tiene un solo cuerpo, reporta "areaLectura": "completa" y "tieneDosCuerpos": false.
- Si un archivo tiene dos cuerpos, reporta "areaLectura": "superior" o "inferior" segun el cuerpo que estes clasificando en ese elemento de "archivos".
`.trim();

  return `
Datos a Validar
tipo documento = ${tipoDocumento}
numero documento = ${dni}

Eres un extractor de datos para matriculas de un CETPRO en Peru.
Analiza los archivos adjuntos de un DNI peruano o carnet de extranjeria. Pueden estar en cualquier orden: frente/reverso, reverso/frente, imagen o PDF.

${documentReadingInstructions}

Reglas:
- El primer adjunto es archivo 1, el segundo adjunto es archivo 2. Si la estrategia de lectura indica usar solo un archivo, no reportes datos extraidos del otro archivo.
- Si es DNI, identifica "documento nacional de identidad" o "nacional" y extrae el numero con formato ########-#. Para comparar, usa los 8 digitos antes del guion.
- Si es carnet de extranjeria, identifica "carnet" o "extranjeria" y extrae el numero con formato #########.
- Para reverso, basta encontrar alguna palabra o dato equivalente a direccion, domicilio, distrito o el fragmento "PER<".
- valida si los datos a validar corresponden al de los archivos, colocar en documentoCoincide true o false segun corresponda.
- En "archivos", devuelve solo datos compactos para clasificar cada archivo o cuerpo: indice, tipoLado, areaLectura, tieneDosCuerpos y flags booleanos de evidencias del reverso.
- No determines ni devuelvas orientacion, giro, rotacion, direccion de texto ni grados de correccion. La orientacion visual sera corregida por OpenCV despues del recorte.
- Extrae nombres, apellido paterno y apellido materno desde el documento, no desde texto inferido.
- La direccion debe ser solo la direccion o domicilio. El distrito debe ir separado, sin provincia ni departamento cuando sea posible.
- Las fechas deben devolverse en YYYY-MM-DD. Si el documento muestra formato DD/MM/YYYY o DD-MM-YYYY, conviertelo.
- Sexo debe ser "F" o "M".
- Estado civil puede ser texto completo o una letra: "S" soltero/soltera, "C" casado/casada, "D" divorciado/divorciada, "V" viudo/viuda.
- Nacionalidad debe ser el texto del documento, por ejemplo "PERUANA".
- Fecha de vencimiento debe venir del campo de vencimiento, caducidad o expiracion del documento.
- No inventes datos. Si no estas seguro, usa null.
- No devuelvas texto reconocido completo. Solo campos estructurados.
- Devuelve SOLO JSON valido, sin markdown.

Formato exacto:
{
  "tipoDocumento": "DNI|CE|null",
  "numeroDocumento": "string|null",
  "documentoCoincide": true,
  "contieneReverso": true,
  "archivos": [
    {
      "indice": 1,
      "tipoLado": "frente|reverso|desconocido",
      "areaLectura": "superior|inferior|completa",
      "tieneDosCuerpos": true,
      "contieneDireccion": true,
      "contieneDomicilio": true,
      "contieneDistrito": true,
      "contienePerMrz": true
    }
  ],
  "nombre": "string|null",
  "apellidoPaterno": "string|null",
  "apellidoMaterno": "string|null",
  "sexo": "F|M|null",
  "nacionalidad": "string|null",
  "fechaNacimiento": "YYYY-MM-DD|null",
  "fechaVencimiento": "YYYY-MM-DD|null",
  "estadoCivil": "S|C|D|V|string|null",
  "direccion": "string|null",
  "distrito": "string|null"
}
`.trim();
}

function extractGeminiTextFromResponse(payload: unknown): string {
  const response = payload as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: unknown }>;
      };
    }>;
  } | null;
  const parts = response?.candidates?.[0]?.content?.parts ?? [];
  return parts
    .map((part) => (typeof part.text === "string" ? part.text : ""))
    .filter(Boolean)
    .join("\n")
    .trim();
}

function parseGeminiMatriculaJson(text: string): GeminiMatriculaResult {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new GeminiJsonParseError("Gemini devolvio una respuesta vacia. Intenta nuevamente.", "");
  }
  const fenced = /```(?:json)?\s*([\s\S]*?)\s*```/i.exec(trimmed)?.[1];
  const candidate = (fenced || trimmed).trim();
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");
  const jsonText = firstBrace >= 0 && lastBrace > firstBrace
    ? candidate.slice(firstBrace, lastBrace + 1)
    : candidate;

  try {
    return JSON.parse(jsonText) as GeminiMatriculaResult;
  } catch (error) {
    const preview = candidate.slice(0, 600);
    const detail = String((error as { message?: string } | null)?.message || error);
    throw new GeminiJsonParseError(`Gemini devolvio JSON incompleto o invalido: ${detail}`, preview);
  }
}

async function runMatriculaGeminiRecognition(params: {
  tipoDocumento: string;
  dni: string;
  archivos: Array<{ data: string; mimeType: string; name: string | null }>;
}): Promise<GeminiMatriculaResult> {
  const projectId = resolveMatriculaGeminiProjectId();
  const location = resolveMatriculaGeminiLocation();
  const model = resolveMatriculaGeminiModel();
  const prompt = buildMatriculaGeminiPrompt(params.tipoDocumento, params.dni);
  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  const accessToken = typeof token === "string" ? token : token?.token;
  if (!accessToken) {
    throw new Error("No se pudo obtener token de acceso para Gemini.");
  }

  const host = location === "global" ? "aiplatform.googleapis.com" : `${location}-aiplatform.googleapis.com`;
  const endpoint = `https://${host}/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`;
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
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
                ...params.archivos.map((archivo) => ({
                  inlineData: {
                    mimeType: archivo.mimeType,
                    data: archivo.data,
                  },
                })),
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: GEMINI_MATRICULA_RESPONSE_SCHEMA,
            temperature: 0,
            maxOutputTokens: 4096,
          },
        }),
      });
      const responseText = await response.text();
      if (!response.ok) {
        throw new Error(`Gemini DNI recognition fallo (${response.status}): ${responseText.slice(0, 500)}`);
      }
      const payload = JSON.parse(responseText) as unknown;
      return parseGeminiMatriculaJson(extractGeminiTextFromResponse(payload));
    } catch (error) {
      lastError = error;
      const canRetry = error instanceof GeminiJsonParseError && attempt < 3;
      if (!canRetry) break;
      await sleep(600 * attempt);
    }
  }

  if (lastError instanceof GeminiJsonParseError) {
    throw new https.HttpsError(
      "internal",
      [
        lastError.message,
        lastError.preview ? `Respuesta recibida: ${lastError.preview}` : null,
        "Vuelve a intentarlo; si se repite, reduce el peso/resolucion de los archivos.",
      ].filter(Boolean).join("\n"),
    );
  }
  throw lastError;
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
    "instruccion",
    "nombreColegio",
    "celular",
    "telefono",
    "email",
  ];

  for (const key of keys) {
    const savedValue = saved?.[key];
    if (isEmptyValue(result[key]) && !isEmptyValue(savedValue)) {
      result[key] = String(savedValue);
    }
  }

  if (isEmptyValue(result.email) && !isEmptyValue(saved?.correoInstitucional)) {
    result.email = String(saved?.correoInstitucional);
  }

  return result;
}

function isStudentMatriculaUser(user: MatriculaUserRow | null | undefined): user is MatriculaUserRow {
  return Number(user?.rolId) === STUDENT_ROLE_ID;
}

async function findStudentUserByDocument(tipoDocumento: string, dni: string): Promise<MatriculaUserRow | null> {
  const response = await dataConnect.executeGraphql<{
    users: MatriculaUserRow[];
  }, { tipoDocumento: string; dni: string; rolId: number }>(
    FIND_STUDENT_USER_BY_DOCUMENT_QUERY,
    { variables: { tipoDocumento, dni, rolId: STUDENT_ROLE_ID } },
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

const buildGroupCountBySemestre = (
  grupos: Array<{ semestreId?: number | null; archivado?: boolean | null }>,
) => {
  const countBySemestre = new Map<number, number>();
  grupos.forEach((grupo) => {
    if (grupo.archivado || !grupo.semestreId) return;
    countBySemestre.set(grupo.semestreId, (countBySemestre.get(grupo.semestreId) ?? 0) + 1);
  });
  return countBySemestre;
};

const buildMatriculaCountBySemestre = (
  matriculas: Array<{ semestreId?: number | null; archivado?: boolean | null }>,
) => {
  const countBySemestre = new Map<number, number>();
  matriculas.forEach((matricula) => {
    if (matricula.archivado || !matricula.semestreId) return;
    countBySemestre.set(matricula.semestreId, (countBySemestre.get(matricula.semestreId) ?? 0) + 1);
  });
  return countBySemestre;
};

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

const normalizeFormularioHexColor = (value: unknown, fallback = "#ffffff") => {
  const text = String(value ?? "").trim();
  return /^#[0-9a-f]{6}$/i.test(text) ? text : fallback;
};

async function requireFormularioMatriculaOpen(kind?: unknown) {
  const settingKey = kind === "siguiente"
    ? FORMULARIO_MATRICULA_SIGUIENTE_ACEPTA_RESPUESTAS_KEY
    : FORMULARIO_MATRICULA_ACEPTA_RESPUESTAS_KEY;
  const response = await dataConnect.executeGraphql<{
    appSettings: Array<{ id: number; boolValue?: boolean | null }>;
  }, { settingKey: string }>(
    GET_FORMULARIO_MATRICULA_SETTING_QUERY,
    { variables: { settingKey } },
  );
  if (!Boolean(response.data.appSettings?.[0]?.boolValue)) {
    throw new https.HttpsError("failed-precondition", "El formulario no acepta respuestas en este momento.");
  }
}

async function getFormularioMatriculaSettingsData() {
  const [
    recognitionResponse,
    legacyRecognitionResponse,
    acceptsResponse,
    nextAcceptsResponse,
    currentBackgroundResponse,
    nextBackgroundResponse,
    legacyAcceptsResponse,
    currentSemestreResponse,
    semestreResponse,
  ] = await Promise.all([
    dataConnect.executeGraphql<{
      appSettings: Array<{ id: number; boolValue?: boolean | null }>;
    }, { settingKey: string }>(
      GET_FORMULARIO_MATRICULA_SETTING_QUERY,
      { variables: { settingKey: DNI_RECOGNITION_ENABLED_KEY } },
    ),
    dataConnect.executeGraphql<{
      appSettings: Array<{ id: number; boolValue?: boolean | null }>;
    }, { settingKey: string }>(
      GET_FORMULARIO_MATRICULA_SETTING_QUERY,
      { variables: { settingKey: DNI_RECOGNITION_ENABLED_LEGACY_KEY } },
    ),
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
      { variables: { settingKey: FORMULARIO_MATRICULA_SIGUIENTE_ACEPTA_RESPUESTAS_KEY } },
    ),
    dataConnect.executeGraphql<{
      appSettings: Array<{ id: number; stringValue?: string | null }>;
    }, { settingKey: string }>(
      GET_FORMULARIO_MATRICULA_SETTING_QUERY,
      { variables: { settingKey: FORMULARIO_MATRICULA_FONDO_COLOR_KEY } },
    ),
    dataConnect.executeGraphql<{
      appSettings: Array<{ id: number; stringValue?: string | null }>;
    }, { settingKey: string }>(
      GET_FORMULARIO_MATRICULA_SETTING_QUERY,
      { variables: { settingKey: FORMULARIO_MATRICULA_SIGUIENTE_FONDO_COLOR_KEY } },
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
      { variables: { settingKey: CURRENT_SEMESTRE_ID_KEY } },
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
  const recognitionEnabled = recognitionResponse.data.appSettings?.length
    ? Boolean(recognitionResponse.data.appSettings[0]?.boolValue)
    : legacyRecognitionResponse.data.appSettings?.length
      ? Boolean(legacyRecognitionResponse.data.appSettings[0]?.boolValue)
      : true;
  const currentSemestreId = Number(currentSemestreResponse.data.appSettings?.[0]?.intValue);
  const legacySemestreId = Number(semestreResponse.data.appSettings?.[0]?.intValue);
  const semestreId = Number.isFinite(currentSemestreId) && currentSemestreId > 0
    ? currentSemestreId
    : legacySemestreId;

  return {
    general: {
      activarReconocimientoDni: recognitionEnabled,
      semestreActualId: Number.isFinite(semestreId) && semestreId > 0 ? semestreId : null,
    },
    formularioMatricula: {
      aceptaRespuestas: acceptsResponses,
      siguienteAceptaRespuestas: Boolean(nextAcceptsResponse.data.appSettings?.[0]?.boolValue),
      semestreId: Number.isFinite(semestreId) && semestreId > 0 ? semestreId : null,
      activarReconocimientoDni: recognitionEnabled,
      fondoColor: normalizeFormularioHexColor(currentBackgroundResponse.data.appSettings?.[0]?.stringValue),
      siguienteFondoColor: normalizeFormularioHexColor(nextBackgroundResponse.data.appSettings?.[0]?.stringValue),
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

function getMatriculaGrupoModuloSemestreId(item: MatriculaDocenteGrupoModulo) {
  const semestreId = item.grupo?.semestre?.id ?? item.grupo?.semestreId;
  return Number.isFinite(Number(semestreId)) ? Number(semestreId) : null;
}

function uniquePositiveNumbers(values: unknown[]) {
  return Array.from(new Set(
    values
      .map((value) => toNumberOrNull(value))
      .filter((value): value is number => Boolean(value && value > 0)),
  ));
}

function sortMatriculaDocenteGrupoModulos(
  items: MatriculaDocenteGrupoModulo[],
  semestreOrderById?: Map<number, number> | null,
) {
  return items
    .slice()
    .sort((a, b) =>
      (semestreOrderById
        ? (semestreOrderById.get(getMatriculaGrupoModuloSemestreId(a) ?? -1) ?? Number.MAX_SAFE_INTEGER)
          - (semestreOrderById.get(getMatriculaGrupoModuloSemestreId(b) ?? -1) ?? Number.MAX_SAFE_INTEGER)
        : 0) ||
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

async function loadMatriculaDocenteSemestres(semestreConsultaIds: number[]) {
  const response = semestreConsultaIds.length > 0
    ? await dataConnect.executeGraphql<{
      semestres: MatriculaSemestreOption[];
    }, { semestreIds: number[] }>(
      LIST_MATRICULA_SEMESTRES_BY_IDS_QUERY,
      { variables: { semestreIds: semestreConsultaIds } },
    )
    : await dataConnect.executeGraphql<{
      semestres: MatriculaSemestreOption[];
    }, Record<string, never>>(
      LIST_MATRICULA_DOCENTE_SEMESTRES_QUERY,
    );

  return (response.data.semestres ?? []).map(addMatriculaSemestreDerivedFields);
}

async function loadMatriculaRequesterPersonalIds(context: https.CallableContext) {
  const uid = context.auth?.uid;
  if (!uid) {
    throw new https.HttpsError("unauthenticated", "Debes iniciar sesion.");
  }

  const userResponse = await dataConnect.executeGraphql<{
    users: Array<{ id: number }>;
  }, { documentId: string }>(
    FIND_USER_BY_DOCUMENT_ID_FOR_MATRICULA_QUERY,
    { variables: { documentId: uid } },
  );
  const userId = toNumberOrNull(userResponse.data.users?.[0]?.id);
  if (!userId) return new Set<number>();

  const personalResponse = await dataConnect.executeGraphql<{
    personals: Array<{ id: number; userId?: number | null }>;
  }, { userId: number }>(
    LIST_MATRICULA_DOCENTE_PERSONALS_BY_USER_ID_QUERY,
    { variables: { userId } },
  );

  return new Set(
    (personalResponse.data.personals ?? [])
      .map((personal) => toNumberOrNull(personal.id))
      .filter((id): id is number => Boolean(id && id > 0)),
  );
}

async function loadMatriculaGruposBySemestreIds(semestreIds: number[]) {
  const gruposById = new Map<number, NonNullable<MatriculaDocenteGrupoModulo["grupo"]>>();
  const chunks = chunkArray(uniquePositiveNumbers(semestreIds), 100);
  await Promise.all(chunks.map(async (chunk) => {
    const response = await dataConnect.executeGraphql<{
      grupos: Array<NonNullable<MatriculaDocenteGrupoModulo["grupo"]>>;
    }, { semestreIds: number[] }>(
      LIST_MATRICULA_GRUPOS_BY_SEMESTRE_IDS_QUERY,
      { variables: { semestreIds: chunk } },
    );
    (response.data.grupos ?? []).forEach((grupo) => {
      const id = toNumberOrNull(grupo.id);
      if (id) gruposById.set(id, grupo);
    });
  }));
  return Array.from(gruposById.values());
}

async function loadMatriculaGrupoModulosByGrupos(
  grupos: Array<NonNullable<MatriculaDocenteGrupoModulo["grupo"]>>,
) {
  const grupoById = new Map(
    grupos
      .map((grupo) => [toNumberOrNull(grupo.id), grupo] as const)
      .filter((item): item is readonly [number, NonNullable<MatriculaDocenteGrupoModulo["grupo"]>] => Boolean(item[0])),
  );
  const grupoIds = Array.from(grupoById.keys());
  if (grupoIds.length === 0) return [];

  const grupoModulosById = new Map<number, MatriculaDocenteGrupoModulo>();
  const chunks = chunkArray(grupoIds, 100);
  await Promise.all(chunks.map(async (chunk) => {
    const response = await dataConnect.executeGraphql<{
      grupoModulos: MatriculaDocenteGrupoModulo[];
    }, { grupoIds: number[] }>(
      LIST_MATRICULA_GRUPO_MODULOS_BY_GRUPO_IDS_QUERY,
      { variables: { grupoIds: chunk } },
    );
    (response.data.grupoModulos ?? []).forEach((item) => {
      const id = toNumberOrNull(item.id);
      const grupo = grupoById.get(toNumberOrNull(item.grupoId) ?? 0) ?? item.grupo ?? null;
      if (id) grupoModulosById.set(id, { ...item, grupo });
    });
  }));

  return Array.from(grupoModulosById.values());
}

async function loadMatriculaGrupoModulosByIds(grupoModuloIdsInput: Iterable<unknown>) {
  const grupoModuloIds = uniquePositiveNumbers(Array.from(grupoModuloIdsInput));
  if (grupoModuloIds.length === 0) return [];

  const grupoModulosById = new Map<number, MatriculaDocenteGrupoModulo>();
  const chunks = chunkArray(grupoModuloIds, 100);
  await Promise.all(chunks.map(async (chunk) => {
    const response = await dataConnect.executeGraphql<{
      grupoModulos: MatriculaDocenteGrupoModulo[];
    }, { grupoModuloIds: number[] }>(
      LIST_MATRICULA_GRUPO_MODULOS_BY_IDS_QUERY,
      { variables: { grupoModuloIds: chunk } },
    );
    (response.data.grupoModulos ?? []).forEach((item) => {
      const id = toNumberOrNull(item.id);
      if (id) grupoModulosById.set(id, item);
    });
  }));

  return Array.from(grupoModulosById.values());
}

async function loadMatriculaGrupoModulosByIdsForRequester(
  context: https.CallableContext,
  grupoModuloIds: Set<number>,
  semestreId: number,
) {
  const isDocenteRequester = isDocenteMatriculaRequester(context);
  const [grupoModulos, semestreConsultaIds, personalIds] = await Promise.all([
    loadMatriculaGrupoModulosByIds(grupoModuloIds),
    getConfiguredSemestreConsultaIds(),
    isDocenteRequester ? loadMatriculaRequesterPersonalIds(context) : Promise.resolve(new Set<number>()),
  ]);
  const allowedSemestreIds = semestreConsultaIds.length > 0 ? new Set(semestreConsultaIds) : null;
  if (isDocenteRequester && personalIds.size === 0) return [];

  return sortMatriculaDocenteGrupoModulos(
    grupoModulos.filter((item) => {
      const itemSemestreId = getMatriculaGrupoModuloSemestreId(item);
      if (!itemSemestreId || itemSemestreId !== semestreId) return false;
      if (allowedSemestreIds && !allowedSemestreIds.has(itemSemestreId)) return false;
      if (isDocenteRequester) {
        const personalId = toNumberOrNull(item.grupo?.personalId);
        return Boolean(personalId && personalIds.has(personalId));
      }
      return true;
    }),
  );
}

async function loadMatriculaDocenteGrupoModulos(context: https.CallableContext, semestreTituloInput?: string | null) {
  if (!context.auth?.uid) {
    throw new https.HttpsError("unauthenticated", "Debes iniciar sesion.");
  }

  const semestreConsultaIds = await getConfiguredSemestreConsultaIds();
  const semestres = await loadMatriculaDocenteSemestres(semestreConsultaIds);

  const isDocenteRequester = isDocenteMatriculaRequester(context);
  const hasExplicitSemestre = Boolean(String(semestreTituloInput ?? "").trim());
  const docenteSemestreSelection = isDocenteRequester && !hasExplicitSemestre
    ? await getDocenteMenuSemestreSelection(semestres)
    : null;
  const semestreTitulo = docenteSemestreSelection?.currentSemestreTitulo
    ?? resolveMatriculaSemestreTitulo(semestres, semestreTituloInput);
  const docenteSemestreIds = docenteSemestreSelection
    ? new Set(docenteSemestreSelection.semestreIds)
    : null;

  const targetSemestres = semestres.filter((semestre) => {
    if (docenteSemestreIds) return docenteSemestreIds.has(semestre.id);
    if (hasExplicitSemestre) return matchesSemestreTitulo(semestre.titulo, semestreTitulo);
    return true;
  });
  const targetSemestreIds = uniquePositiveNumbers(targetSemestres.map((semestre) => semestre.id));
  if (targetSemestreIds.length === 0) return { grupoModulos: [], semestreTitulo };

  const [personalIds, grupos] = await Promise.all([
    isDocenteRequester ? loadMatriculaRequesterPersonalIds(context) : Promise.resolve(new Set<number>()),
    loadMatriculaGruposBySemestreIds(targetSemestreIds),
  ]);
  if (isDocenteRequester && personalIds.size === 0) return { grupoModulos: [], semestreTitulo };

  const gruposByRequester = isDocenteRequester
    ? grupos.filter((grupo) => {
      const personalId = toNumberOrNull(grupo.personalId);
      return Boolean(personalId && personalIds.has(personalId));
    })
    : grupos;
  const grupoModulosInput = await loadMatriculaGrupoModulosByGrupos(gruposByRequester);
  const grupoModulos = sortMatriculaDocenteGrupoModulos(grupoModulosInput, docenteSemestreSelection?.orderById);

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
        grupos: Array<{ id: number; semestreId?: number | null; archivado?: boolean | null }>;
      }, Record<string, never>>(
        LIST_MATRICULA_SEMESTRES_QUERY,
      ),
    ]);
    const groupCountBySemestre = buildGroupCountBySemestre(semestresResponse.data.grupos ?? []);

    return {
      settings,
      semestres: sortMatriculaSemestres(semestresResponse.data.semestres ?? [])
        .map((semestre) => ({
          ...addMatriculaSemestreDerivedFields(semestre),
          grupoCount: groupCountBySemestre.get(semestre.id) ?? 0,
        })),
    };
  } catch (error) {
    console.error("Error in getFormularioMatriculaConfiguracion:", error);
    throw new https.HttpsError("internal", "No se pudo cargar la configuracion del formulario de matricula.");
  }
});

export const listMatriculaSemestres = https.onCall(async (data, context) => {
  await requireMatriculaSemestreAccess(context);
  const soloConMatriculas = Boolean(data?.soloConMatriculas);
  const semestreIds = Array.from(toNumberSetFromInput(data?.semestreIds));

  try {
    if (semestreIds.length > 0 && !soloConMatriculas) {
      const response = await dataConnect.executeGraphql<{
        semestres: MatriculaSemestreOption[];
      }, { semestreIds: number[] }>(
        LIST_MATRICULA_SEMESTRES_BY_IDS_QUERY,
        { variables: { semestreIds } },
      );
      const orderById = new Map(semestreIds.map((id, index) => [id, index]));
      return {
        semestres: (response.data.semestres ?? [])
          .slice()
          .sort((a, b) => (orderById.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (orderById.get(b.id) ?? Number.MAX_SAFE_INTEGER))
          .map((semestre) => addMatriculaSemestreDerivedFields(semestre)),
      };
    }

    const response = await dataConnect.executeGraphql<{
      semestres: MatriculaSemestreOption[];
      grupos: Array<{ id: number; semestreId?: number | null; archivado?: boolean | null }>;
      matriculas: Array<{ id: number; semestreId?: number | null; archivado?: boolean | null }>;
    }, Record<string, never>>(
      LIST_MATRICULA_SEMESTRES_QUERY,
    );
    const groupCountBySemestre = buildGroupCountBySemestre(response.data.grupos ?? []);
    const matriculaCountBySemestre = buildMatriculaCountBySemestre(response.data.matriculas ?? []);
    return {
      semestres: sortMatriculaSemestres(response.data.semestres ?? [])
        .filter((semestre) => !soloConMatriculas || (matriculaCountBySemestre.get(semestre.id) ?? 0) > 0)
        .map((semestre) => ({
          ...addMatriculaSemestreDerivedFields(semestre),
          grupoCount: groupCountBySemestre.get(semestre.id) ?? 0,
          matriculaCount: matriculaCountBySemestre.get(semestre.id) ?? 0,
        })),
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
      grupos: Array<{ id: number; semestreId?: number | null; archivado?: boolean | null }>;
    }, Record<string, never>>(
      LIST_MATRICULA_SEMESTRES_QUERY,
    );
    const groupCountBySemestre = buildGroupCountBySemestre(response.data.grupos ?? []);
    return {
      semestres: sortMatriculaSemestres(response.data.semestres ?? [])
        .map((semestre) => ({
          ...addMatriculaSemestreDerivedFields(semestre),
          grupoCount: groupCountBySemestre.get(semestre.id) ?? 0,
        })),
    };
  } catch (error) {
    console.error("Error in listFormularioMatriculaSemestres:", error);
    throw new https.HttpsError("internal", "No se pudieron cargar los periodos de matricula.");
  }
});

function isMatriculaProgramaPlan(plan: MatriculaFichaPlan | null | undefined) {
  const tipoCarrera = normalizeText(plan?.carrera?.tipoCarrera?.nombre);
  const planEstudio = normalizeText(plan?.planEstudio);
  return tipoCarrera.includes("programa de estudio") || planEstudio.includes("programa");
}

function resolveMatriculaFichaPlanForModulo(params: {
  moduloId?: number | null;
  plan?: MatriculaFichaPlan | null;
  planModulos: MatriculaFichaPlanModulo[];
}) {
  if (params.plan?.id) return params.plan;
  const moduloId = toNumberOrNull(params.moduloId);
  if (!moduloId) return params.plan ?? null;

  const relations = params.planModulos
    .filter((item) => Number(item.moduloId) === moduloId)
    .slice()
    .sort((a, b) =>
      (a.orden ?? Number.MAX_SAFE_INTEGER) - (b.orden ?? Number.MAX_SAFE_INTEGER) ||
      (a.planId ?? 0) - (b.planId ?? 0),
    );

  return relations.find((item) => isMatriculaProgramaPlan(item.plan))?.plan
    ?? relations[0]?.plan
    ?? params.plan
    ?? null;
}

async function getMatriculaById(matriculaId: number): Promise<MatriculaRow | null> {
  const response = await dataConnect.executeGraphql<{
    matricula: MatriculaRow | null;
    modulosEstudiantes?: MatriculaModuloLinkRow[];
    grupoModulos?: MatriculaFichaGrupoModulo[];
    modulos?: MatriculaFichaModulo[];
    grupoModuloUnidadesDidacticas?: Array<{ orden?: number | null; grupoModuloId?: number | null; unidadDidacticaId: number }>;
    unidadDidacticaModulos?: Array<{ orden?: number | null; moduloId?: number | null; unidadDidacticaId: number }>;
    unidadesDidacticas?: MatriculaFichaUnidadDidactica[];
    planModulos?: MatriculaFichaPlanModulo[];
    matriculaCambiosModulo?: MatriculaCambioModuloRow[];
  }, { id: number }>(
    GET_MATRICULA_QUERY,
    { variables: { id: matriculaId } },
  );

  const matricula = response.data.matricula ?? null;
  if (!matricula) return null;
  const planModulos = response.data.planModulos ?? [];
  const grupoModuloById = new Map((response.data.grupoModulos ?? []).map((item) => [Number(item.id), item]));
  const moduloById = new Map((response.data.modulos ?? []).map((item) => [Number(item.id), item]));
  const modulosEstudiantes = (response.data.modulosEstudiantes ?? []).map((item) => {
    const fallbackGrupoModulo = item.grupoModuloId ? grupoModuloById.get(Number(item.grupoModuloId)) : null;
    const sourceGrupoModulo = item.grupoModulo ?? fallbackGrupoModulo ?? null;
    const modulo = sourceGrupoModulo?.modulo ?? (item.moduloId ? moduloById.get(Number(item.moduloId)) : null);
    if (!modulo) return item;
    return {
      ...item,
      grupoModulo: {
        ...sourceGrupoModulo,
        id: sourceGrupoModulo?.id ?? item.grupoModuloId,
        grupoId: sourceGrupoModulo?.grupoId ?? item.grupoId,
        moduloId: sourceGrupoModulo?.moduloId ?? item.moduloId,
        modulo: {
          ...modulo,
          plan: resolveMatriculaFichaPlanForModulo({
            moduloId: item.moduloId ?? modulo.id,
            plan: modulo.plan,
            planModulos,
          }),
        },
      },
    };
  });
  const programaModulo =
    modulosEstudiantes.find((item) =>
      normalizeText(item.grupoModulo?.modulo?.plan?.carrera?.tipoCarrera?.nombre).includes("programa de estudio"),
    ) ?? modulosEstudiantes[0] ?? null;
  const grupoModuloId = programaModulo?.grupoModuloId ?? programaModulo?.grupoModulo?.id ?? null;
  const moduloId = programaModulo?.moduloId ?? programaModulo?.grupoModulo?.modulo?.id ?? null;
  const unidadesById = new Map((response.data.unidadesDidacticas ?? []).map((unidad) => [unidad.id, unidad]));
  const grupoModuloUnidadLinks = (response.data.grupoModuloUnidadesDidacticas ?? [])
    .filter((item) => grupoModuloId && Number(item.grupoModuloId) === Number(grupoModuloId));
  const moduloUnidadLinks = (response.data.unidadDidacticaModulos ?? [])
    .filter((item) => moduloId && Number(item.moduloId) === Number(moduloId));
  const unidadLinks = grupoModuloUnidadLinks.length > 0 ? grupoModuloUnidadLinks : moduloUnidadLinks;
  const fichaUnidadesDidacticas: MatriculaFichaUnidadDidactica[] = unidadLinks
    .flatMap((item) => {
      const unidad = unidadesById.get(item.unidadDidacticaId);
      return unidad ? [{ ...unidad, orden: item.orden ?? unidad.id }] : [];
    })
    .sort((a, b) => (a.orden ?? a.id) - (b.orden ?? b.id) || a.id - b.id);

  return hydrateMatriculaUserAvatarThumbnails({
    ...matricula,
    grupoId: modulosEstudiantes.find((item) => item.grupoId)?.grupoId ?? null,
    modulosEstudiantes,
    cambiosModulo: response.data.matriculaCambiosModulo ?? [],
    fichaUnidadesDidacticas,
  });
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

function hasUsableProcessedDocumentImage(value: string | null | undefined): boolean {
  const url = asCleanString(value);
  return Boolean(url && !isLocalStorageUrl(url));
}

function getDocumentImagePolicy(user: MatriculaUserRow | null) {
  const hasStoredFrontImage = hasUsableProcessedDocumentImage(user?.dniImagenFrenteProcesadaUrl);
  const hasStoredBackImage = hasUsableProcessedDocumentImage(user?.dniImagenReversoProcesadaUrl);
  const userHasStoredImages = hasStoredFrontImage && hasStoredBackImage;
  const fechaVencimiento = normalizeDate(user?.fechaVencimiento);
  const storedDocumentExpired = Boolean(fechaVencimiento && isExpiredDate(fechaVencimiento));
  const shouldPersistDocumentImages = !userHasStoredImages || !fechaVencimiento || storedDocumentExpired;
  let reason = "existing_processed_images_current";
  if (!userHasStoredImages) {
    reason = "missing_processed_images";
  } else if (!fechaVencimiento) {
    reason = "missing_stored_expiration";
  } else if (storedDocumentExpired) {
    reason = "stored_document_expired";
  }

  return {
    userHasStoredImages,
    hasStoredFrontImage,
    hasStoredBackImage,
    fechaVencimiento,
    storedDocumentExpired,
    shouldPersistDocumentImages,
    reason,
  };
}

function shouldProcessDocumentSide(params: {
  existingProcessedUrl?: string | null;
  source: UploadedDocumentImage;
  storedExpiration?: string | null;
  newExpiration?: string | null;
}): boolean {
  const hasProcessed = hasUsableProcessedDocumentImage(params.existingProcessedUrl);
  const sourceAvailable = Boolean(params.source.path || params.source.url);
  if (!sourceAvailable) return false;

  if (!hasProcessed) {
    return true;
  }

  const storedExpiration = normalizeDate(params.storedExpiration);
  const newExpiration = normalizeDate(params.newExpiration);
  const storedExpired = Boolean(storedExpiration && isExpiredDate(storedExpiration));

  if (storedExpiration && !storedExpired) {
    return false;
  }

  if (storedExpired) {
    const newDocumentIsCurrent = Boolean(newExpiration && !isExpiredDate(newExpiration));
    return Boolean(params.source.isNewUpload && newDocumentIsCurrent);
  }

  return Boolean(params.source.isNewUpload);
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
    orientation: null,
    rotationClockwise: null,
    instructions: {
      twoBodies: hasTwoBodies
        ? `El archivo tiene dos cuerpos. Trabaja solo con el cuerpo del area '${selectedArea}' asignado a '${side}' y descarta visualmente el otro cuerpo.`
        : "El archivo tiene un solo cuerpo. Procesa el documento completo.",
      orientation: "No uses orientacion declarada por IA. Detecta y corrige automaticamente la orientacion visual del DNI despues del recorte.",
      perspective: "Corrige la perspectiva usando la proporcion 8.6:5.4 solo como referencia para detectar bordes; conserva la proporcion real detectada al guardar.",
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
  fechaVencimientoAnterior?: string | null;
  fechaVencimientoNueva?: string | null;
  frente: UploadedDocumentImage;
  reverso: UploadedDocumentImage;
  dniImagenFrenteProcesadaUrl?: string | null;
  dniImagenReversoProcesadaUrl?: string | null;
  avatarUrl?: string | null;
  recorteFotografiaUrl?: string | null;
  analisisDocumentoTemporal: DocumentoAnalisisMetadata | null;
}) {
  const frontMetadata = getDocumentoArchivoMetadata(params.analisisDocumentoTemporal, "frente");
  const backMetadata = getDocumentoArchivoMetadata(params.analisisDocumentoTemporal, "reverso");
  const shouldProcessFront = shouldProcessDocumentSide({
    existingProcessedUrl: params.dniImagenFrenteProcesadaUrl,
    source: params.frente,
    storedExpiration: params.fechaVencimientoAnterior,
    newExpiration: params.fechaVencimientoNueva,
  });
  const shouldProcessBack = shouldProcessDocumentSide({
    existingProcessedUrl: params.dniImagenReversoProcesadaUrl,
    source: params.reverso,
    storedExpiration: params.fechaVencimientoAnterior,
    newExpiration: params.fechaVencimientoNueva,
  });
  const newDocumentIsCurrent = Boolean(
    normalizeDate(params.fechaVencimientoNueva)
    && !isExpiredDate(params.fechaVencimientoNueva),
  );
  const storedDocumentExpired = Boolean(
    normalizeDate(params.fechaVencimientoAnterior)
    && isExpiredDate(params.fechaVencimientoAnterior),
  );
  const forceAvatarRefresh = storedDocumentExpired && newDocumentIsCurrent && (shouldProcessFront || shouldProcessBack);
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
    fechaVencimientoAnterior: normalizeDate(params.fechaVencimientoAnterior),
    fechaVencimientoNueva: normalizeDate(params.fechaVencimientoNueva),
    analisisDocumentoTemporal: params.analisisDocumentoTemporal,
    existingAvatarUrl: asCleanString(params.avatarUrl) ?? null,
    existingRecorteFotografiaUrl: asCleanString(params.recorteFotografiaUrl) ?? null,
    forceAvatarRefresh,
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
  tipoDocumento?: string | null;
  dni: string;
  fechaNacimiento?: string | null;
  documentProcessingJobId: string;
  frenteProcesado: ProcessedDocumentOutput | null;
  existingAvatarUrl?: string | null;
  existingRecorteFotografiaUrl?: string | null;
  forceRegenerate?: boolean;
}) {
  const userId = toNumberOrNull(params.userId);
  if (!userId || !params.frenteProcesado?.path) return null;
  const existingAvatarUrl = asCleanString(params.existingAvatarUrl);
  const existingRecorteFotografiaUrl = asCleanString(params.existingRecorteFotografiaUrl);
  const forceRegenerate = Boolean(params.forceRegenerate);
  if (!forceRegenerate && existingAvatarUrl && existingRecorteFotografiaUrl) {
    console.info("matricula_avatar_extraction_skipped_existing_assets", {
      userId,
      dni: params.dni,
      documentProcessingJobId: params.documentProcessingJobId,
    });
    return null;
  }

  const now = new Date().toISOString();
  const ref = await getFirestore()
    .collection(MATRICULA_AVATAR_EXTRACTION_COLLECTION)
    .add(toJsonValue({
      status: "queued",
      createdAt: now,
      updatedAt: now,
      source: "matricula_document_processing",
      userId,
      tipoDocumento: normalizeDocumentType(params.tipoDocumento) ?? null,
      dni: params.dni,
      fechaNacimiento: normalizeDate(params.fechaNacimiento),
      documentProcessingJobId: params.documentProcessingJobId,
      frenteProcesado: params.frenteProcesado,
      existingAvatarUrl: existingAvatarUrl ?? null,
      existingRecorteFotografiaUrl: existingRecorteFotografiaUrl ?? null,
      forceRegenerate,
    }) as FirebaseFirestore.DocumentData);

  console.info("matricula_avatar_extraction_queued", {
    jobId: ref.id,
    userId,
    dni: params.dni,
      fechaNacimiento: normalizeDate(params.fechaNacimiento),
      sourcePath: params.frenteProcesado.path,
      forceRegenerate,
    });
  return ref.id;
}

async function enqueueMatriculaAvatarExtractionFromExistingProcessed(params: {
  user: MatriculaUserRow | null;
  userId: number;
  dni: string;
  fechaNacimiento?: string | null;
  source: string;
}) {
  const frontUrl = asCleanString(params.user?.dniImagenFrenteProcesadaUrl);
  if (!frontUrl || isLocalStorageUrl(frontUrl)) return null;

  return enqueueMatriculaAvatarExtractionJob({
    userId: params.userId,
    tipoDocumento: params.user?.tipoDocumento,
    dni: params.dni,
    fechaNacimiento: params.fechaNacimiento ?? params.user?.fechaNacimiento,
    documentProcessingJobId: params.source,
    frenteProcesado: {
      path: getStoragePathFromDownloadUrl(frontUrl),
      url: frontUrl,
      contentType: detectDocumentContentType(frontUrl),
    },
    existingAvatarUrl: params.user?.avatar,
    existingRecorteFotografiaUrl: params.user?.recorteFotografia,
    forceRegenerate: false,
  });
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
    ?? "cetprosmp-2026";
}

function resolveAvatarImageLocation(): string {
  return DEFAULT_AVATAR_IMAGE_LOCATION;
}

type AvatarGenerationSettings = {
  enabled: boolean;
  model: string;
  imageSize: "512" | "1024";
  settingModel: string;
};

function normalizeAvatarGenerationModel(value: unknown): AvatarGenerationSettings {
  const settingModel = asCleanString(value) ?? DEFAULT_AVATAR_IMAGE_SETTING;
  if (settingModel === "gemini-3.1-flash-lite-image-1024") {
    return {
      enabled: true,
      model: "gemini-3.1-flash-lite-image",
      imageSize: "1024",
      settingModel,
    };
  }
  return {
    enabled: true,
    model: DEFAULT_AVATAR_IMAGE_MODEL,
    imageSize: "512",
    settingModel: DEFAULT_AVATAR_IMAGE_SETTING,
  };
}

async function getAvatarGenerationSettings(): Promise<AvatarGenerationSettings> {
  const [recognitionResponse, enabledResponse, modelResponse] = await Promise.all([
    dataConnect.executeGraphql<{
      appSettings: Array<{ id: number; boolValue?: boolean | null }>;
    }, { settingKey: string }>(
      GET_FORMULARIO_MATRICULA_SETTING_QUERY,
      { variables: { settingKey: DNI_RECOGNITION_ENABLED_KEY } },
    ),
    dataConnect.executeGraphql<{
      appSettings: Array<{ id: number; boolValue?: boolean | null }>;
    }, { settingKey: string }>(
      GET_FORMULARIO_MATRICULA_SETTING_QUERY,
      { variables: { settingKey: AVATAR_GENERATION_ENABLED_KEY } },
    ),
    dataConnect.executeGraphql<{
      appSettings: Array<{ id: number; stringValue?: string | null }>;
    }, { settingKey: string }>(
      GET_FORMULARIO_MATRICULA_SETTING_QUERY,
      { variables: { settingKey: AVATAR_GENERATION_MODEL_KEY } },
    ),
  ]);
  const configuredModel = normalizeAvatarGenerationModel(modelResponse.data.appSettings?.[0]?.stringValue);
  const hasRecognitionSetting = Boolean(recognitionResponse.data.appSettings?.length);
  const recognitionEnabled = hasRecognitionSetting
    ? Boolean(recognitionResponse.data.appSettings?.[0]?.boolValue)
    : true;
  const hasEnabledSetting = Boolean(enabledResponse.data.appSettings?.length);
  const avatarEnabled = hasEnabledSetting
    ? Boolean(enabledResponse.data.appSettings?.[0]?.boolValue)
    : true;
  return {
    ...configuredModel,
    enabled: recognitionEnabled && avatarEnabled,
  };
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
  return data[index] >= 239 && data[index + 1] >= 239 && data[index + 2] >= 239;
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
  model: string;
  imageSize: "512" | "1024";
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
  const model = params.model;
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
    "Objetivo: mejorar la visualizacion, nitidez, iluminacion y color solamente, mantener la apariencia fisica exactamente a la fotografia.",
    "Manten fielmente los rasgos faciales, identidad, expresion neutral, tono de piel, marcas visibles, edad aparente y proporciones naturales de la referencia.",
    "El cabello y el peinado son parte de la identidad: manten exactamente el mismo cabello, largo, volumen, silueta, raya, flequillo, recogido, linea de cabello y color de la referencia.",
    "No alises, no rices, no ordenes, no estilices, no cambies volumen, no cambies direccion del cabello ni inventes un peinado nuevo aunque la referencia sea borrosa.",
    ageInstruction,
    "No embellezcas, no retoques la piel, no cambies facciones principales, estructura facial, nariz, ojos, boca, cejas, mandibula, forma del rostro, tono de piel, edad, genero, peso aparente ni expresion; no agregues maquillaje ni accesorios nuevos.",
    "La indicacion de ropa formal aplica exclusivamente a la vestimenta visible debajo del cuello y hombros; no autoriza cambios de peinado, cabello, color de cabello, frente, orejas, cabeza, rostro, piel, edad aparente, expresion, contextura ni identidad facial.",
    "Coloca unicamente ropa formal conservadora y sobria, varones con saco y corbata, damas saco y blusa, preferentemente en tonos medios u oscuros para separarla claramente del fondo blanco; la ropa puede reemplazar la vestimenta original, pero debe conservar exactamente el mismo peinado y color de cabello, sin modificarlos de ninguna forma; bajo ninguna circunstancia debe modificar, estilizar, rejuvenecer, embellecer o reinterpretar la apariencia fisica exacta del rostro, cabeza, cuello, cabello, tono de piel, edad aparente, expresion ni las caracteristicas de identidad indicadas en las reglas anteriores.",
    "Encuadre: rostro y hombros, frontal, estilo documento oficial, con el rostro ocupando una proporcion ligeramente mayor en la composicion final; mostrar hombros solo de forma minima, sin alejar la camara para destacar la ropa, sin textos, sin logos, sin bordes, sin elementos del DNI.",
    "Composicion: centra a la persona en la imagen final; la cabeza, rostro, cuello y hombros deben quedar alineados al eje vertical central.",
    "Fondo obligatorio: toda el area de fondo debe ser blanco puro exacto #FFFFFF, completamente uniforme de borde a borde.",
    "No uses ningun gris, blanco humo, beige, celeste, sombra, degradado, viñeta, iluminacion ambiental, textura ni variacion tonal en el fondo.",
    "El fondo debe mantenerse plano y solido con valores RGB 255,255,255 en toda zona que no sea persona o ropa, hasta los bordes de la imagen, para que pueda ser removido automaticamente.",
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
        temperature: 0.1,
        imageConfig: {
          aspectRatio: "3:4",
          imageSize: params.imageSize,
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
  sourceMode: "generado" | "recorte";
  width?: number;
  height?: number;
  bucketName: string;
  userId: number;
  dni: string;
  tipoDocumento?: string | null;
  jobId: string;
}): Promise<{ path: string; url: string; bucket: string; contentType: string }> {
  const safeDni = normalizeDocumentNumber(params.dni) || String(params.userId);
  const prefix = documentFilePrefix(params.tipoDocumento);
  const contentType = params.contentType ?? "image/jpeg";
  const extension = params.extension ?? (contentType === "image/png" ? "png" : "jpg");
  const sizeLabel = asCleanString(params.sizeLabel) ?? "grande";
  const sizeSuffix = sizeLabel === "grande" ? "" : `-${sizeLabel}`;
  const path = `usuarios/avatars/${safeDni}/avatar-${params.sourceMode}-${prefix}-${safeDni}${sizeSuffix}.${extension}`;
  const token = randomUUID();
  const bucket = getStorage().bucket(params.bucketName);
  const file = bucket.file(path);
  const shouldResize = Boolean(params.width || params.height);
  const outputBuffer = shouldResize
    ? await sharp(params.avatarBuffer)
      .resize({
        width: params.width,
        height: params.height,
        fit: params.width && params.height ? "cover" : "inside",
        withoutEnlargement: true,
      })
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
  tipoDocumento?: string | null;
  sourceMode: "generado" | "recorte";
  jobId: string;
}): Promise<{
  grande: { path: string; url: string; bucket: string; contentType: string };
  mediano: { path: string; url: string; bucket: string; contentType: string };
  pequeno: { path: string; url: string; bucket: string; contentType: string };
  tiny: { path: string; url: string; bucket: string; contentType: string };
}> {
  const base = {
    avatarBuffer: params.avatarBuffer,
    contentType: params.contentType,
    extension: params.extension,
    bucketName: params.bucketName,
    userId: params.userId,
    dni: params.dni,
    tipoDocumento: params.tipoDocumento,
    sourceMode: params.sourceMode,
    jobId: params.jobId,
  };
  const [grande, mediano, pequeno, tiny] = await Promise.all([
    uploadAvatarImage({ ...base, sizeLabel: "grande" }),
    uploadAvatarImage({ ...base, sizeLabel: "mediano", width: 200, height: 267 }),
    uploadAvatarImage({ ...base, sizeLabel: "pequeno", width: 96, height: 128 }),
    uploadAvatarImage({ ...base, sizeLabel: "tiny", width: 48 }),
  ]);
  return { grande, mediano, pequeno, tiny };
}

async function uploadRecorteFotografiaImage(params: {
  cropBuffer: Buffer;
  bucketName: string;
  userId: number;
  dni: string;
  tipoDocumento?: string | null;
  jobId: string;
}): Promise<{ path: string; url: string; bucket: string; contentType: string }> {
  const safeDni = normalizeDocumentNumber(params.dni) || String(params.userId);
  const prefix = documentFilePrefix(params.tipoDocumento);
  const path = `usuarios/avatars/${safeDni}/fotorecortada-${prefix}-${safeDni}.jpg`;
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
    const forceRegenerate = Boolean(job.forceRegenerate);
    const existingAvatarUrl = asCleanString(job.existingAvatarUrl);
    const existingRecorteFotografiaUrl = asCleanString(job.existingRecorteFotografiaUrl);
    const shouldRefreshAvatar = forceRegenerate || !existingAvatarUrl;
    const shouldRefreshRecorte = forceRegenerate || !existingRecorteFotografiaUrl;
    if (!shouldRefreshAvatar && !shouldRefreshRecorte) {
      await ref.update({
        status: "skipped_existing_assets",
        updatedAt: new Date().toISOString(),
        message: "El usuario ya tiene avatar y recorte de fotografia.",
      });
      return;
    }

    const { buffer, bucketName } = await downloadProcessedImage(source);
    const cropBox = await detectAvatarCropBox(buffer);
    const avatarGenerationSettings = await getAvatarGenerationSettings();
    const currentAge = calculateCurrentAge(job.fechaNacimiento);
    const referenceBuffer = await buildAvatarReferenceImage({ sourceBuffer: buffer, cropBox });
    const recorteFotografiaBuffer = await buildOriginalPhotoCropImage({ sourceBuffer: buffer, cropBox });
    const generatedAvatar = shouldRefreshAvatar && avatarGenerationSettings.enabled
      ? await generateCarnetAvatarImage({
        referenceBuffer,
        currentAge,
        model: avatarGenerationSettings.model,
        imageSize: avatarGenerationSettings.imageSize,
      })
      : null;
    const avatarBuffer = shouldRefreshAvatar
      ? (generatedAvatar?.buffer ?? await buildDirectCropAvatarImage({ sourceBuffer: buffer, cropBox }))
      : null;
    const avatar = avatarBuffer
      ? await uploadAvatarImages({
        avatarBuffer,
        contentType: generatedAvatar?.contentType,
        extension: generatedAvatar?.extension,
        bucketName,
        userId,
        dni: asCleanString(job.dni) ?? "",
        tipoDocumento: asCleanString(job.tipoDocumento),
        sourceMode: generatedAvatar ? "generado" : "recorte",
        jobId,
      })
      : null;
    const recorteFotografia = shouldRefreshRecorte
      ? await uploadRecorteFotografiaImage({
        cropBuffer: recorteFotografiaBuffer,
        bucketName,
        userId,
        dni: asCleanString(job.dni) ?? "",
        tipoDocumento: asCleanString(job.tipoDocumento),
        jobId,
      })
      : null;
    const userUpdateData: DataConnectUserInput = {};
    if (avatar?.grande.url) userUpdateData.avatar = avatar.grande.url;
    if (recorteFotografia?.url) userUpdateData.recorteFotografia = recorteFotografia.url;
    await dataConnect.executeGraphql<{ user_update: unknown }, { id: number; data: DataConnectUserInput }>(
      UPDATE_USER_MUTATION,
      { variables: { id: userId, data: userUpdateData } },
    );
    await ref.update({
      status: "completed",
      updatedAt: new Date().toISOString(),
      avatar: avatar?.grande ?? null,
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
        generativeAvatarEnabled: avatarGenerationSettings.enabled,
        settingModel: avatarGenerationSettings.settingModel,
        imageSize: avatarGenerationSettings.imageSize,
      },
      updatedUserId: userId,
    });
    console.info("matricula_avatar_extraction_completed", {
      jobId,
      userId,
      avatarPath: avatar?.grande.path ?? null,
      avatarMedianoPath: avatar?.mediano.path ?? null,
      avatarPequenoPath: avatar?.pequeno.path ?? null,
      avatarTinyPath: avatar?.tiny.path ?? null,
      recorteFotografiaPath: recorteFotografia?.path ?? null,
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

function parseStoragePathFromUrl(value: unknown): string | null {
  const raw = asCleanString(value);
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    const marker = "/o/";
    const markerIndex = parsed.pathname.indexOf(marker);
    if (markerIndex >= 0) {
      return decodeURIComponent(parsed.pathname.slice(markerIndex + marker.length));
    }
  } catch {
    if (!raw.startsWith("http") && raw.includes("/")) return raw;
  }
  return null;
}

function buildDocumentOriginalPath(params: {
  dni: string;
  tipoDocumento?: string | null;
  side: "frente" | "reverso";
}) {
  const safeDni = normalizeDocumentNumber(params.dni) || "documento";
  const prefix = documentFilePrefix(params.tipoDocumento);
  return `matriculas/documentos/${safeDni}/${prefix}-${safeDni}-original-${params.side}`;
}

function buildDocumentProcessedPaths(params: {
  dni: string;
  tipoDocumento?: string | null;
  side: "frente" | "reverso";
}) {
  const safeDni = normalizeDocumentNumber(params.dni) || "documento";
  const prefix = documentFilePrefix(params.tipoDocumento);
  const base = `matriculas/documentos-procesados/${safeDni}/${prefix}-${safeDni}-procesado-${params.side}`;
  return {
    processedPath: `${base}.jpg`,
    smallPath: `${base}-small.jpg`,
  };
}

function parseDataUrl(value: unknown): { buffer: Buffer; contentType: string } {
  const text = String(value ?? "").trim();
  const commaIndex = text.indexOf(",");
  const header = commaIndex >= 0 ? text.slice(0, commaIndex) : "";
  const payload = commaIndex >= 0 ? text.slice(commaIndex + 1) : "";
  if (!header.toLowerCase().startsWith("data:") || !payload) {
    throw new https.HttpsError("invalid-argument", "La imagen editada no tiene un formato valido.");
  }
  const contentType = header.slice(5).split(";")[0] || "image/jpeg";
  const buffer = Buffer.from(payload, "base64");
  if (!buffer.length) {
    throw new https.HttpsError("invalid-argument", "La imagen editada esta vacia.");
  }
  return { buffer, contentType };
}

async function overwriteStorageImage(params: {
  path: string;
  buffer: Buffer;
  contentType: string;
  bucketName?: string | null;
}) {
  const bucket = params.bucketName ? getStorage().bucket(params.bucketName) : getStorage().bucket();
  const token = randomUUID();
  await bucket.file(params.path).save(params.buffer, {
    contentType: params.contentType,
    metadata: {
      metadata: { firebaseStorageDownloadTokens: token },
    },
  });
  return {
    path: params.path,
    url: buildFirebaseStorageUrl(bucket.name, params.path, token),
    bucket: bucket.name,
    contentType: params.contentType,
  };
}

async function downloadStorageImageAsDataUrl(params: {
  path: string;
  url?: string | null;
}) {
  const parsedUrlPath = parseStoragePathFromUrl(params.url);
  const path = asCleanString(params.path) ?? parsedUrlPath;
  if (path) {
    const bucket = getStorage().bucket();
    const file = bucket.file(path);
    const [buffer] = await file.download();
    const [metadata] = await file.getMetadata();
    const contentType = asCleanString(metadata.contentType) ?? "image/jpeg";
    return {
      dataUrl: `data:${contentType};base64,${buffer.toString("base64")}`,
      contentType,
      path,
      url: asCleanString(params.url) ?? null,
    };
  }

  const url = asCleanString(params.url);
  if (!url) {
    throw new https.HttpsError("not-found", "No se encontro la ruta de la imagen.");
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new https.HttpsError("internal", `No se pudo descargar la imagen (${response.status}).`);
  }
  const contentType = response.headers.get("content-type") || "image/jpeg";
  const buffer = Buffer.from(await response.arrayBuffer());
  return {
    dataUrl: `data:${contentType};base64,${buffer.toString("base64")}`,
    contentType,
    path: null,
    url,
  };
}

function processorManualEditUrl(processorUrl: string) {
  const normalized = processorUrl.endsWith("/") ? processorUrl : `${processorUrl}/`;
  return new URL("manual-edit", normalized).toString();
}

async function callDocumentProcessorManualEdit(payload: Record<string, unknown>) {
  const processorUrl = asCleanString(process.env.MATRICULA_DOCUMENT_PROCESSOR_URL);
  if (!processorUrl) {
    throw new https.HttpsError("failed-precondition", "Configura MATRICULA_DOCUMENT_PROCESSOR_URL para guardar desde el editor.");
  }
  const url = processorManualEditUrl(processorUrl);
  const headers: Record<string, string> = { "content-type": "application/json" };
  const processorToken = asCleanString(process.env.MATRICULA_DOCUMENT_PROCESSOR_TOKEN);
  if (processorToken) headers.authorization = `Bearer ${processorToken}`;

  let responseOk = false;
  let responseStatus = 0;
  let responseText = "";
  if (processorToken) {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    responseOk = response.ok;
    responseStatus = response.status;
    responseText = await response.text();
  } else {
    const client = await google.auth.getIdTokenClient(processorUrl);
    const response = await client.request({
      url,
      method: "POST",
      headers,
      data: payload,
      validateStatus: () => true,
    });
    responseOk = response.status >= 200 && response.status < 300;
    responseStatus = response.status;
    responseText = typeof response.data === "string"
      ? response.data
      : JSON.stringify(response.data ?? {});
  }

  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = JSON.parse(responseText) as Record<string, unknown>;
  } catch {
    parsed = null;
  }
  if (!responseOk) {
    const message = asCleanString(parsed?.message) ?? `El procesador devolvio error ${responseStatus}.`;
    throw new https.HttpsError("internal", message);
  }
  return parsed;
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
        tipoDocumento: asCleanString(job.tipoDocumento),
        dni: asCleanString(job.dni) ?? "",
        fechaNacimiento: asCleanString(job.fechaNacimiento),
        documentProcessingJobId: jobId,
        frenteProcesado: getProcessedDocumentOutput(processorResult, "frente"),
        existingAvatarUrl: asCleanString(job.existingAvatarUrl),
        existingRecorteFotografiaUrl: asCleanString(job.existingRecorteFotografiaUrl),
        forceRegenerate: Boolean(job.forceAvatarRefresh),
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

function detectDocumentContentType(path: string, contentType?: string | null): string {
  const cleanContentType = asCleanString(contentType);
  if (cleanContentType) return cleanContentType;
  const lowerPath = path.toLowerCase();
  if (lowerPath.endsWith(".pdf")) return "application/pdf";
  if (lowerPath.endsWith(".png")) return "image/png";
  return "image/jpeg";
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
  moduloGrupos: Array<{ grupoModuloId?: number | null; moduloId: number; grupoId?: number | null }>,
  fallbackGrupoId: number | null,
) {
  await dataConnect.executeGraphql<
    { moduloEstudiante_deleteMany: number },
    { matriculaId: number }
  >(DELETE_MODULO_ESTUDIANTES_BY_MATRICULA_MUTATION, { variables: { matriculaId } });

  await Promise.all(
    moduloGrupos.map((moduloGrupo) => {
      const moduloEstudiante = buildModuloEstudianteDataFromInput({
        matriculaId,
        moduloId: moduloGrupo.moduloId,
        grupoId: moduloGrupo.grupoId ?? fallbackGrupoId,
        grupoModuloId: moduloGrupo.grupoModuloId ?? null,
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

const COURSE_CHANGE_WINDOW_DAYS = 21;
const DOCENTE_MAX_MODULO_CHANGE_EVENTS = 3;

function getModuloChangeKey(item: { grupoModuloId?: number | null; grupoId?: number | null; moduloId?: number | null }) {
  return [
    item.grupoModuloId ?? 0,
    item.grupoId ?? 0,
    item.moduloId ?? 0,
  ].join(":");
}

function sortModuloChangeItems<T extends { grupoModuloId?: number | null; grupoId?: number | null; moduloId?: number | null }>(items: T[]) {
  return items
    .slice()
    .sort((a, b) =>
      (a.grupoModuloId ?? 0) - (b.grupoModuloId ?? 0) ||
      (a.grupoId ?? 0) - (b.grupoId ?? 0) ||
      (a.moduloId ?? 0) - (b.moduloId ?? 0),
    );
}

function hasGrupoModuloSelectionChanged(
  previousItems: Array<{ grupoModuloId?: number | null; grupoId?: number | null; moduloId?: number | null }>,
  nextItems: Array<{ grupoModuloId?: number | null; grupoId?: number | null; moduloId?: number | null }>,
) {
  const previousKeys = sortModuloChangeItems(previousItems).map(getModuloChangeKey);
  const nextKeys = sortModuloChangeItems(nextItems).map(getModuloChangeKey);
  if (previousKeys.length !== nextKeys.length) return true;
  return previousKeys.some((key, index) => key !== nextKeys[index]);
}

function isGrupoModuloChangeExpired(item: MatriculaModuloLinkRow, now = new Date()) {
  const inicio = parseDateOnly(item.grupoModulo?.inicio);
  if (!inicio) return false;
  const today = todayDateOnly(now);
  const elapsedDays = Math.floor((today.getTime() - inicio.getTime()) / 86_400_000);
  return elapsedDays > COURSE_CHANGE_WINDOW_DAYS;
}

function countModuloChangeEvents(changes: MatriculaCambioModuloRow[] | null | undefined) {
  const keys = new Set<string>();
  for (const change of changes ?? []) {
    const hasPrevious = Boolean(
      change.grupoModuloAnterior?.id
      || asCleanString(change.grupoModuloAnterior?.nombre)
      || change.moduloAnterior?.id
      || asCleanString(change.moduloAnterior?.titulo)
      || asCleanString(change.moduloAnterior?.tituloComercial)
      || change.grupoAnterior?.id
      || asCleanString(change.grupoAnterior?.nombreDisplay),
    );
    if (!hasPrevious) continue;
    const fechaCambio = asCleanString(change.fechaCambio);
    keys.add(fechaCambio || `id:${change.id ?? keys.size}`);
  }
  return keys.size;
}

async function getRequesterDataConnectUserId(context: https.CallableContext) {
  const uid = asCleanString(context.auth?.uid);
  if (!uid) return null;
  const response = await dataConnect.executeGraphql<{
    users: Array<{ id: number }>;
  }, { documentId: string }>(
    FIND_USER_BY_DOCUMENT_ID_FOR_MATRICULA_QUERY,
    { variables: { documentId: uid } },
  );
  return response.data.users?.[0]?.id ?? null;
}

async function recordMatriculaModuloChanges(params: {
  matriculaId: number;
  userId?: number | null;
  semestreId?: number | null;
  previousItems: MatriculaModuloLinkRow[];
  nextItems: Array<{ grupoModuloId?: number | null; moduloId: number; grupoId?: number | null }>;
  fechaCambio: string;
  registradoPorId?: number | null;
}) {
  if (!hasGrupoModuloSelectionChanged(params.previousItems, params.nextItems)) return;

  const previousItems = sortModuloChangeItems(params.previousItems);
  const nextItems = sortModuloChangeItems(params.nextItems);
  const max = Math.max(previousItems.length, nextItems.length);
  const changedPairs: Array<{
    previous: MatriculaModuloLinkRow | null;
    next: { grupoModuloId?: number | null; moduloId: number; grupoId?: number | null } | null;
  }> = [];
  for (let index = 0; index < max; index += 1) {
    const previousCandidate = previousItems[index] ?? null;
    const nextCandidate = nextItems[index] ?? null;
    if (previousCandidate && nextCandidate && getModuloChangeKey(previousCandidate) === getModuloChangeKey(nextCandidate)) continue;
    changedPairs.push({ previous: previousCandidate, next: nextCandidate });
  }
  const selectedChange =
    changedPairs.find((change) => change.previous && change.next)
    ?? changedPairs.find((change) => change.previous)
    ?? null;
  if (!selectedChange?.previous) return;
  const { previous, next } = selectedChange;

  await dataConnect.executeGraphql<
    { matriculaCambioModulo_insert: unknown },
    { data: Record<string, unknown> }
  >(INSERT_MATRICULA_CAMBIO_MODULO_MUTATION, {
    variables: {
      data: {
        fechaCambio: params.fechaCambio,
        matriculaId: params.matriculaId,
        userId: params.userId ?? null,
        semestreId: params.semestreId ?? null,
        grupoModuloAnteriorId: previous?.grupoModuloId ?? null,
        grupoModuloNuevoId: next?.grupoModuloId ?? null,
        grupoAnteriorId: previous?.grupoId ?? null,
        grupoNuevoId: next?.grupoId ?? null,
        moduloAnteriorId: previous?.moduloId ?? null,
        moduloNuevoId: next?.moduloId ?? null,
        registradoPorId: params.registradoPorId ?? null,
      },
    },
  });
}

function buildModuloGruposForMatricula(data: unknown, paqueteModulos: DataConnectPaqueteModulo[]) {
  const record = data as Record<string, unknown> | null;
  const input = record?.moduloGrupos;
  if (Array.isArray(input)) {
    const result: Array<{ grupoModuloId: number | null; moduloId: number; grupoId: number | null }> = [];
    for (const item of input) {
      if (typeof item !== "object" || item === null) continue;
      const raw = item as Record<string, unknown>;
      const moduloId = toNumber(raw.moduloId, -1);
      if (moduloId <= 0) continue;
      result.push({
        grupoModuloId: toNumberOrNull(raw.grupoModuloId) ?? null,
        moduloId,
        grupoId: toNumberOrNull(raw.grupoId) ?? null,
      });
    }
    if (result.length > 0) return result;
  }

  const { result: grupoIdByModuloId, fallbackGrupoId } = buildGrupoIdByModuloId(data);
  return paqueteModulos.flatMap((paqueteModulo) =>
    Array.from({ length: getPaqueteModuloMultiplicador(paqueteModulo) }, () => ({
      grupoModuloId: null,
      moduloId: paqueteModulo.moduloId,
      grupoId: grupoIdByModuloId.get(paqueteModulo.moduloId) ?? fallbackGrupoId,
    })),
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
  const precomputedModuloGrupos = Array.isArray(data.moduloGrupos)
    ? data.moduloGrupos as Array<{ grupoModuloId?: number | null; moduloId: number; grupoId?: number | null }>
    : null;
  if (userId <= 0) {
    throw new https.HttpsError("invalid-argument", "userId is required.");
  }
  if (paqueteId <= 0) {
    throw new https.HttpsError("invalid-argument", "paqueteId is required.");
  }

  let matriculaId: number | null = null;

  try {
    let moduloGrupos = precomputedModuloGrupos;
    if (!moduloGrupos) {
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
      moduloGrupos = buildModuloGruposForMatricula(data, paqueteModulos);
    }
    if (moduloGrupos.length < 1 || moduloGrupos.length > 6) {
      throw new https.HttpsError(
        "failed-precondition",
        "El paquete debe tener entre 1 y 6 instancias de modulos antes de matricular.",
      );
    }
    const fallbackGrupoId = toNumberOrNull(data.grupoId) ?? null;

    const now = new Date().toISOString();
    const matriculaPayload = buildMatriculaDataFromInput({
      ...data,
      userId,
      paqueteId,
      fecha: data.fecha ?? now,
      fechaActualizacion: data.fechaActualizacion ?? data.fecha ?? now,
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
      moduloGrupos,
      fallbackGrupoId,
    );

    return {
      id: matriculaId,
      paqueteId,
      userId,
      responsableId,
      responsableUserId,
      modulos: moduloGrupos.map((item) => ({
        moduloId: item.moduloId,
        grupoId: item.grupoId ?? fallbackGrupoId,
        grupoModuloId: item.grupoModuloId ?? null,
      })),
    };
  } catch (error) {
    if (matriculaId) {
      await cleanupMatricula(matriculaId);
    }
    throw error;
  }
}

function toNumberSetFromInput(value: unknown) {
  const values = Array.isArray(value) ? value : value == null ? [] : [value];
  return new Set(
    values
      .map((item) => toNumberOrNull(item))
      .filter((item): item is number => Boolean(item && item > 0)),
  );
}

async function listMatriculasForList(semestreId: number) {
  return dataConnect.executeGraphql<{
    matriculas: MatriculaRow[];
  }, { semestreId: number }>(
    LIST_MATRICULAS_BY_SEMESTRE_QUERY,
    { variables: { semestreId } },
  );
}

async function listMatriculasByIdsForList(matriculaIdsInput: Iterable<unknown>, semestreId: number) {
  const matriculaIds = uniquePositiveNumbers(Array.from(matriculaIdsInput));
  if (matriculaIds.length === 0) return [];

  const matriculasById = new Map<number, MatriculaRow>();
  const chunks = chunkArray(matriculaIds, 100);
  await Promise.all(chunks.map(async (chunk) => {
    const response = await dataConnect.executeGraphql<{
      matriculas: MatriculaRow[];
    }, { matriculaIds: number[]; semestreId: number }>(
      LIST_MATRICULAS_BY_IDS_QUERY,
      { variables: { matriculaIds: chunk, semestreId } },
    );
    (response.data.matriculas ?? []).forEach((matricula) => {
      matriculasById.set(matricula.id, matricula);
    });
  }));

  return Array.from(matriculasById.values());
}

async function hydrateMatriculaListModuloLinks(matriculas: MatriculaRow[]): Promise<MatriculaRow[]> {
  const matriculaIds = uniquePositiveNumbers(matriculas.map((matricula) => matricula.id));
  if (matriculaIds.length === 0) return matriculas;

  const linksByMatriculaId = new Map<number, MatriculaModuloLinkRow[]>();
  await Promise.all(chunkArray(matriculaIds, 100).map(async (chunk) => {
    const response = await dataConnect.executeGraphql<{
      modulosEstudiantes: MatriculaModuloLinkRow[];
    }, { matriculaIds: number[] }>(
      LIST_MODULO_ESTUDIANTES_BY_MATRICULA_IDS_FOR_LIST_QUERY,
      { variables: { matriculaIds: chunk } },
    );
    (response.data.modulosEstudiantes ?? []).forEach((link) => {
      const matriculaId = toNumberOrNull(link.matriculaId);
      if (!matriculaId) return;
      const current = linksByMatriculaId.get(matriculaId) ?? [];
      current.push(link);
      linksByMatriculaId.set(matriculaId, current);
    });
  }));

  if (linksByMatriculaId.size === 0) return matriculas;
  return matriculas.map((matricula) => ({
    ...matricula,
    modulosEstudiantes: linksByMatriculaId.get(matricula.id) ?? matricula.modulosEstudiantes ?? [],
  }));
}

async function listEditorDocumentosMatriculasForList(semestreId: number) {
  return dataConnect.executeGraphql<{
    matriculas: MatriculaRow[];
  }, { semestreId: number }>(
    LIST_EDITOR_DOCUMENTOS_MATRICULAS_QUERY,
    { variables: { semestreId } },
  );
}

async function getEditorDocumentoMatriculaById(matriculaId: number) {
  const response = await dataConnect.executeGraphql<{
    matricula?: MatriculaRow | null;
  }, { id: number }>(
    GET_EDITOR_DOCUMENTO_MATRICULA_QUERY,
    { variables: { id: matriculaId } },
  );
  return response.data.matricula ?? null;
}

async function getEditorDocumentoUserById(userId: number) {
  const response = await dataConnect.executeGraphql<{
    user?: MatriculaUserRow | null;
  }, { id: number }>(
    GET_EDITOR_DOCUMENTO_USER_BY_ID_QUERY,
    { variables: { id: userId } },
  );
  return response.data.user ?? null;
}

async function getEditorDocumentoUserByDocumentId(documentId: string) {
  const response = await dataConnect.executeGraphql<{
    users: MatriculaUserRow[];
  }, { documentId: string }>(
    GET_EDITOR_DOCUMENTO_USER_BY_DOCUMENT_ID_QUERY,
    { variables: { documentId } },
  );
  return response.data.users?.[0] ?? null;
}

async function getEditorDocumentoTargetFromInput(data: any): Promise<{
  matricula: MatriculaRow | null;
  user: MatriculaUserRow;
  userId: number;
}> {
  const matriculaId = toNumberOrNull(data?.matriculaId);
  if (matriculaId) {
    const matricula = await getEditorDocumentoMatriculaById(matriculaId);
    const user = matricula?.user ?? null;
    const userId = toNumberOrNull(user?.id ?? matricula?.userId);
    if (!matricula || !user || !userId) {
      throw new https.HttpsError("not-found", "No se encontro el usuario de la matricula.");
    }
    return { matricula, user, userId };
  }

  const userId = toNumberOrNull(data?.userId);
  const documentId = asCleanString(data?.documentId);
  const user = userId
    ? await getEditorDocumentoUserById(userId)
    : documentId
      ? await getEditorDocumentoUserByDocumentId(documentId)
      : null;
  const resolvedUserId = toNumberOrNull(user?.id);
  if (!user || !resolvedUserId) {
    throw new https.HttpsError("not-found", "No se encontro el usuario del documento.");
  }
  return { matricula: null, user, userId: resolvedUserId };
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

type MatriculaAvatarThumbnails = {
  avatarTiny?: string;
  avatarPequeno?: string;
  avatarMediano?: string;
};

const AVATAR_THUMBNAIL_CACHE_TTL_MS = 5 * 60 * 1000;
const avatarThumbnailCache = new Map<number, {
  expiresAt: number;
  thumbnails: MatriculaAvatarThumbnails | null;
}>();

function timestampToMillis(value: unknown): number {
  if (!value) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  const timestamp = value as { toMillis?: () => number; seconds?: number; _seconds?: number };
  if (typeof timestamp.toMillis === "function") {
    const millis = timestamp.toMillis();
    return Number.isFinite(millis) ? millis : 0;
  }

  const seconds = Number(timestamp.seconds ?? timestamp._seconds);
  return Number.isFinite(seconds) ? seconds * 1000 : 0;
}

async function getLatestUserAvatarThumbnails(userIds: Set<number>): Promise<Map<number, MatriculaAvatarThumbnails>> {
  if (userIds.size === 0) return new Map();

  const now = Date.now();
  const result = new Map<number, MatriculaAvatarThumbnails>();
  const missingUserIds = new Set<number>();
  userIds.forEach((userId) => {
    const cached = avatarThumbnailCache.get(userId);
    if (cached && cached.expiresAt > now) {
      if (cached.thumbnails) result.set(userId, cached.thumbnails);
      return;
    }
    missingUserIds.add(userId);
  });
  if (missingUserIds.size === 0) return result;

  const userIdChunks = chunkArray(Array.from(missingUserIds), 30);
  const snapshots = await Promise.all(
    userIdChunks.map((chunk) =>
      getFirestore()
        .collection(MATRICULA_AVATAR_EXTRACTION_COLLECTION)
        .where("userId", "in", chunk)
        .get(),
    ),
  );

  const latestByUserId = new Map<number, {
    data: Record<string, unknown>;
    updatedAt: number;
  }>();
  snapshots.forEach((snapshot) => {
    snapshot.docs.forEach((doc) => {
      const data = doc.data() as Record<string, unknown>;
      const userId = toNumber(data.userId, 0);
      if (!userIds.has(userId) || data.status !== "completed") return;

      const updatedAt = timestampToMillis(data.updatedAt);
      const previous = latestByUserId.get(userId);
      if (!previous || updatedAt > previous.updatedAt) {
        latestByUserId.set(userId, { data, updatedAt });
      }
    });
  });

  const thumbnailByUserId = new Map<number, MatriculaAvatarThumbnails>();
  latestByUserId.forEach(({ data }, userId) => {
    const avatarTamanos = data.avatarTamanos as {
      tiny?: { url?: unknown } | null;
      pequeno?: { url?: unknown } | null;
      mediano?: { url?: unknown } | null;
      grande?: { url?: unknown } | null;
    } | null;
    const avatar = data.avatar as { url?: unknown } | null;
    const tiny =
      asCleanString(avatarTamanos?.tiny?.url)
      ?? asCleanString(avatarTamanos?.pequeno?.url)
      ?? asCleanString(avatarTamanos?.grande?.url)
      ?? asCleanString(avatar?.url);
    const pequeno =
      asCleanString(avatarTamanos?.pequeno?.url)
      ?? asCleanString(avatarTamanos?.grande?.url)
      ?? asCleanString(avatar?.url);
    const mediano =
      asCleanString(avatarTamanos?.mediano?.url)
      ?? asCleanString(avatarTamanos?.grande?.url)
      ?? asCleanString(avatar?.url);

    if (tiny || pequeno || mediano) {
      thumbnailByUserId.set(userId, {
        avatarTiny: tiny ?? undefined,
        avatarPequeno: pequeno ?? undefined,
        avatarMediano: mediano ?? undefined,
      });
    }
  });

  const expiresAt = Date.now() + AVATAR_THUMBNAIL_CACHE_TTL_MS;
  missingUserIds.forEach((userId) => {
    const thumbnails = thumbnailByUserId.get(userId) ?? null;
    avatarThumbnailCache.set(userId, { expiresAt, thumbnails });
    if (thumbnails) result.set(userId, thumbnails);
  });

  return result;
}

async function hydrateMatriculaListAvatarTiny(matriculas: MatriculaRow[]): Promise<MatriculaRow[]> {
  const userIds = new Set(
    matriculas
      .map((matricula) => toNumber(matricula.user?.id ?? matricula.userId, 0))
      .filter((id) => id > 0),
  );
  if (userIds.size === 0) return matriculas;

  const avatarByUserId = await getLatestUserAvatarThumbnails(userIds);
  if (avatarByUserId.size === 0) return matriculas;

  return matriculas.map((matricula) => {
    if (!matricula.user) return matricula;
    const userId = toNumber(matricula.user.id ?? matricula.userId, 0);
    const avatar = avatarByUserId.get(userId);
    return avatar?.avatarTiny ? { ...matricula, user: { ...matricula.user, avatarTiny: avatar.avatarTiny } } : matricula;
  });
}

async function hydrateMatriculaUserAvatarThumbnails(matricula: MatriculaRow | null): Promise<MatriculaRow | null> {
  const userId = toNumber(matricula?.user?.id ?? matricula?.userId, 0);
  if (!matricula || !matricula.user || userId <= 0) return matricula;

  const avatars = (await getLatestUserAvatarThumbnails(new Set([userId]))).get(userId);
  return avatars ? { ...matricula, user: { ...matricula.user, ...avatars } } : matricula;
}

async function listModuloEstudiantesForAllowedGrupoModulos(
  grupoModulos: MatriculaDocenteGrupoModulo[],
): Promise<MatriculaDocenteModuloEstudiante[]> {
  const grupoModuloIds = uniquePositiveNumbers(grupoModulos.map((item) => item.id));
  if (grupoModuloIds.length === 0) return [];

  const byGrupoModuloChunks = await Promise.all(
    chunkArray(grupoModuloIds, 100).map((chunk) =>
      dataConnect.executeGraphql<{
        modulosEstudiantes: MatriculaDocenteModuloEstudiante[];
      }, { grupoModuloIds: number[] }>(
        LIST_MODULO_ESTUDIANTES_BY_GRUPO_MODULO_IDS_QUERY,
        { variables: { grupoModuloIds: chunk } },
      ),
    ),
  );
  const byGrupoModulo = byGrupoModuloChunks.flatMap((response) => response.data.modulosEstudiantes ?? []);
  const grupoModuloIdsWithRows = new Set(
    byGrupoModulo
      .map((item) => toNumberOrNull(item.grupoModuloId))
      .filter((id): id is number => Boolean(id && id > 0)),
  );
  const legacyFallbackGrupoModulos = grupoModulos.length <= 10
    ? grupoModulos
    : grupoModulos.filter((item) => !grupoModuloIdsWithRows.has(item.id));
  const fallbackGrupoIds = uniquePositiveNumbers(
    legacyFallbackGrupoModulos.map((item) => item.grupoId),
  );
  const byGrupoChunks = fallbackGrupoIds.length > 0
    ? await Promise.all(
      chunkArray(fallbackGrupoIds, 100).map((chunk) =>
        dataConnect.executeGraphql<{
        modulosEstudiantes: MatriculaDocenteModuloEstudiante[];
      }, { grupoIds: number[] }>(
          LIST_MODULO_ESTUDIANTES_BY_GRUPO_IDS_QUERY,
          { variables: { grupoIds: chunk } },
        ),
      ),
    )
    : [];
  const byGrupo = byGrupoChunks.flatMap((response) => response.data.modulosEstudiantes ?? []);

  const byKey = new Map<string, MatriculaDocenteModuloEstudiante>();
  [...byGrupoModulo, ...byGrupo].forEach((item) => {
    byKey.set(
      [
        item.matriculaId ?? "",
        item.grupoModuloId ?? "",
        item.grupoId ?? "",
        item.moduloId ?? "",
      ].join(":"),
      item,
    );
  });

  return Array.from(byKey.values());
}

export const listMatriculas = https.onCall(async (data, context) => {
  await requirePermission(context, "matriculas", "view");
  const grupoModuloId = toNumberOrNull(data?.grupoModuloId);
  const grupoModuloIds = toNumberSetFromInput(data?.grupoModuloIds);
  if (grupoModuloId) grupoModuloIds.add(grupoModuloId);
  const semestreId = toNumberOrNull(data?.semestreId);
  const semestreTitulo = String(data?.semestreTitulo ?? "").trim() || null;
  if (!semestreId || semestreId <= 0) {
    throw new https.HttpsError("invalid-argument", "Debes seleccionar un semestre para cargar matriculas.");
  }

  try {
    const shouldFilterByDocente = isDocenteMatriculaRequester(context);
    let matriculas: MatriculaRow[] = [];
    if (grupoModuloIds.size > 0 || shouldFilterByDocente) {
      const allowedGrupoModulosInput = grupoModuloIds.size > 0
        ? await loadMatriculaGrupoModulosByIdsForRequester(context, grupoModuloIds, semestreId)
        : (await loadMatriculaDocenteGrupoModulos(context, semestreTitulo)).grupoModulos;
      const allowedGrupoModulos = allowedGrupoModulosInput.filter((item) =>
        getMatriculaGrupoModuloSemestreId(item) === semestreId,
      );
      if (allowedGrupoModulos.length === 0) {
        return { matriculas: [] };
      }
      const allowedGrupoModuloIds = new Set(
        allowedGrupoModulos.map((item) => String(item.id)),
      );
      const allowedPairs = new Set(
        allowedGrupoModulos.map((item) => `${item.grupoId}:${item.moduloId}`),
      );
      const moduloEstudiantes = await listModuloEstudiantesForAllowedGrupoModulos(allowedGrupoModulos);
      const allowedMatriculaIds = new Set<number>(
        moduloEstudiantes
          .filter((item) =>
            item.grupoModuloId
              ? allowedGrupoModuloIds.has(String(item.grupoModuloId))
              : allowedPairs.has(`${item.grupoId ?? 0}:${item.moduloId ?? 0}`),
          )
          .map((item) => item.matriculaId)
          .filter((id): id is number => Boolean(id)),
      );
      if (allowedMatriculaIds.size === 0) {
        return { matriculas: [] };
      }
      matriculas = (await listMatriculasByIdsForList(allowedMatriculaIds, semestreId))
        .filter((matricula) => allowedMatriculaIds.has(matricula.id));
    } else {
      const semestreConsultaIds = await getConfiguredSemestreConsultaIds();
      const allowedSemestreIds = semestreConsultaIds.length > 0 ? new Set(semestreConsultaIds) : null;
      if (allowedSemestreIds && !allowedSemestreIds.has(semestreId)) {
        return { matriculas: [] };
      }
      const matriculasResponse = await listMatriculasForList(semestreId);
      matriculas = matriculasResponse.data.matriculas ?? [];
    }

    const sortedMatriculas = matriculas
      .filter((matricula) => !semestreId || Number(matricula.semestreId) === semestreId)
      .slice()
      .sort((a, b) => {
        const dateCompare = String(b.fecha ?? "").localeCompare(String(a.fecha ?? ""));
        return dateCompare || b.id - a.id;
      });

    const matriculasWithModuloLinks = await hydrateMatriculaListModuloLinks(sortedMatriculas);
    return { matriculas: await hydrateMatriculaListAvatarTiny(matriculasWithModuloLinks) };
  } catch (error) {
    console.error("Error in listMatriculas:", error);
    throw new https.HttpsError("internal", "No se pudieron cargar las matriculas.");
  }
});

export const listEditorDocumentosMatriculas = https.onCall(async (data, context) => {
  await requirePermission(context, "editor-documentos", "view");

  const requestedSemestreId = toNumberOrNull(data?.semestreId);
  const settings = requestedSemestreId ? null : await getFormularioMatriculaSettingsData();
  const semestreId = requestedSemestreId ?? settings?.general.semestreActualId ?? null;
  if (!semestreId || semestreId <= 0) {
    throw new https.HttpsError("invalid-argument", "No se encontro el semestre actual para cargar documentos.");
  }

  try {
    const response = await listEditorDocumentosMatriculasForList(semestreId);
    const matriculas = (response.data.matriculas ?? [])
      .filter((matricula) => Number(matricula.semestreId) === semestreId)
      .slice()
      .sort((a, b) => b.id - a.id)
      .slice(0, 30);
    const matriculasWithModuloLinks = await hydrateMatriculaListModuloLinks(matriculas);
    return { matriculas: await hydrateMatriculaListAvatarTiny(matriculasWithModuloLinks), semestreId };
  } catch (error) {
    console.error("Error in listEditorDocumentosMatriculas:", error);
    throw new https.HttpsError("internal", "No se pudieron cargar los documentos.");
  }
});

export const getEditorDocumentoMatricula = https.onCall(async (data, context) => {
  await requirePermission(context, "editor-documentos", "view");
  const matriculaId = toNumberOrNull(data?.matriculaId);
  if (!matriculaId) {
    throw new https.HttpsError("invalid-argument", "Debes indicar una matricula.");
  }

  try {
    const matricula = await getEditorDocumentoMatriculaById(matriculaId);
    if (!matricula) {
      throw new https.HttpsError("not-found", "No se encontro la matricula.");
    }
    return { matricula: await hydrateMatriculaUserAvatarThumbnails(matricula) };
  } catch (error) {
    if (error instanceof https.HttpsError) throw error;
    console.error("Error in getEditorDocumentoMatricula:", error);
    throw new https.HttpsError("internal", "No se pudo cargar el documento.");
  }
});

export const getEditorDocumentoImageData = runWith({ timeoutSeconds: 120, memory: "512MB" }).https.onCall(async (data, context) => {
  await requirePermission(context, "editor-documentos", "view");
  const matriculaId = toNumberOrNull(data?.matriculaId);
  const userId = toNumberOrNull(data?.userId);
  const documentId = asCleanString(data?.documentId);
  const sideRaw = normalizeText(data?.side);
  const sourceRaw = normalizeText(data?.source);
  const side = sideRaw.includes("reverso") ? "reverso" : sideRaw.includes("frente") ? "frente" : null;
  const source = sourceRaw.includes("proces") ? "procesada" : "original";
  if ((!matriculaId && !userId && !documentId) || !side) {
    throw new https.HttpsError("invalid-argument", "Debes indicar matricula o usuario y lado del documento.");
  }

  try {
    const { matricula, user } = await getEditorDocumentoTargetFromInput(data);

    const dni = normalizeDocumentNumber(user.dni) || String(user.id ?? matricula?.userId ?? "documento");
    const tipoDocumento = asCleanString(user.tipoDocumento) ?? "DNI";
    const url = side === "frente"
      ? source === "procesada" ? user.dniImagenFrenteProcesadaUrl : user.dniImagenFrenteUrl
      : source === "procesada" ? user.dniImagenReversoProcesadaUrl : user.dniImagenReversoUrl;
    const fallbackPath = source === "procesada"
      ? buildDocumentProcessedPaths({ dni, tipoDocumento, side }).processedPath
      : buildDocumentOriginalPath({ dni, tipoDocumento, side });
    const path = parseStoragePathFromUrl(url) ?? fallbackPath;
    const image = await downloadStorageImageAsDataUrl({ path, url });
    return { ...image, side, source };
  } catch (error) {
    if (error instanceof https.HttpsError) throw error;
    console.error("Error in getEditorDocumentoImageData:", error);
    throw new https.HttpsError("internal", "No se pudo cargar la imagen del documento.");
  }
});

export const regenerateEditorDocumentoAvatar = runWith({ timeoutSeconds: 120, memory: "512MB" }).https.onCall(async (data, context) => {
  await requirePermission(context, "editor-documentos", "edit");

  try {
    const { user, userId } = await getEditorDocumentoTargetFromInput(data);
    const existingAvatarUrl = asCleanString(user.avatar);
    if (existingAvatarUrl) {
      return {
        ok: true,
        skipped: true,
        message: "El usuario ya tiene avatar.",
      };
    }
    const dni = normalizeDocumentNumber(user.dni) || String(userId);
    const tipoDocumento = asCleanString(user.tipoDocumento) ?? "DNI";
    const frenteProcesadoUrl = asCleanString(user.dniImagenFrenteProcesadaUrl);
    const frenteProcesadoPath = parseStoragePathFromUrl(frenteProcesadoUrl);
    if (!frenteProcesadoUrl || !frenteProcesadoPath) {
      throw new https.HttpsError("failed-precondition", "El usuario no tiene DNI frente procesado para generar avatar.");
    }

    const jobId = await enqueueMatriculaAvatarExtractionJob({
      userId,
      tipoDocumento,
      dni,
      fechaNacimiento: user.fechaNacimiento,
      documentProcessingJobId: `editor-documentos-regenerate-avatar-${Date.now()}`,
      frenteProcesado: {
        path: frenteProcesadoPath,
        url: frenteProcesadoUrl,
        contentType: detectDocumentContentType(frenteProcesadoUrl),
      },
      existingAvatarUrl: user.avatar,
      existingRecorteFotografiaUrl: user.recorteFotografia,
      forceRegenerate: false,
    });
    if (!jobId) {
      throw new https.HttpsError("internal", "No se pudo crear el job para regenerar avatar.");
    }

    return { ok: true, jobId };
  } catch (error) {
    if (error instanceof https.HttpsError) throw error;
    console.error("Error in regenerateEditorDocumentoAvatar:", error);
    throw new https.HttpsError("internal", "No se pudo regenerar el avatar.");
  }
});

export const saveEditorDocumentoImage = runWith({ timeoutSeconds: 180, memory: "1GB" }).https.onCall(async (data, context) => {
  await requirePermission(context, "editor-documentos", "edit");

  const matriculaId = toNumberOrNull(data?.matriculaId);
  const userIdInput = toNumberOrNull(data?.userId);
  const documentId = asCleanString(data?.documentId);
  const sideRaw = normalizeText(data?.side);
  const side = sideRaw.includes("reverso") ? "reverso" : sideRaw.includes("frente") ? "frente" : null;
  if ((!matriculaId && !userIdInput && !documentId) || !side) {
    throw new https.HttpsError("invalid-argument", "Debes indicar matricula o usuario y lado del documento.");
  }
  const imageDataUrl = asCleanString(data?.imageDataUrl);
  if (!imageDataUrl) {
    throw new https.HttpsError("invalid-argument", "Debes enviar la imagen editada.");
  }

  try {
    const { user, userId } = await getEditorDocumentoTargetFromInput(data);

    const dni = normalizeDocumentNumber(user.dni) || String(userId);
    const tipoDocumento = asCleanString(user.tipoDocumento) ?? "DNI";
    const originalUrl = side === "frente" ? user.dniImagenFrenteUrl : user.dniImagenReversoUrl;
    const processedUrl = side === "frente" ? user.dniImagenFrenteProcesadaUrl : user.dniImagenReversoProcesadaUrl;
    const originalPath = parseStoragePathFromUrl(originalUrl) ?? buildDocumentOriginalPath({ dni, tipoDocumento, side });
    const parsedProcessedPath = parseStoragePathFromUrl(processedUrl);
    const fallbackProcessedPaths = buildDocumentProcessedPaths({ dni, tipoDocumento, side });
    const processedPath = parsedProcessedPath ?? fallbackProcessedPaths.processedPath;
    const smallPath = processedPath.endsWith(".jpg")
      ? processedPath.replace(/\.jpg$/i, "-small.jpg")
      : fallbackProcessedPaths.smallPath;

    const updateData: DataConnectUserInput = {};
    const replacementOriginalDataUrl = asCleanString(data?.replacementOriginalDataUrl);
    if (replacementOriginalDataUrl) {
      const original = parseDataUrl(replacementOriginalDataUrl);
      const savedOriginal = await overwriteStorageImage({
        path: originalPath,
        buffer: original.buffer,
        contentType: original.contentType,
      });
      if (side === "frente") {
        updateData.dniImagenFrenteUrl = savedOriginal.url;
      } else {
        updateData.dniImagenReversoUrl = savedOriginal.url;
      }
    }

    const processorResult = await callDocumentProcessorManualEdit({
      imageDataUrl,
      perspectivePoints: Array.isArray(data?.perspectivePoints) ? data.perspectivePoints : null,
      side,
      dni,
      tipoDocumento,
      outputPath: processedPath,
      smallPath,
    }) ?? {};
    const outputRaw = processorResult.output;
    const output = outputRaw && typeof outputRaw === "object" && !Array.isArray(outputRaw)
      ? outputRaw as Record<string, unknown>
      : null;
    const processedOutputUrl = asCleanString(output?.url);
    const smallOutput = output?.small && typeof output.small === "object" && !Array.isArray(output.small)
      ? output.small as Record<string, unknown>
      : null;
    const smallOutputUrl = asCleanString(smallOutput?.url);
    if (!processedOutputUrl) {
      throw new https.HttpsError("internal", "El procesador no devolvio la imagen procesada.");
    }

    if (side === "frente") {
      updateData.dniImagenFrenteProcesadaUrl = processedOutputUrl;
    } else {
      updateData.dniImagenReversoProcesadaUrl = processedOutputUrl;
    }

    await dataConnect.executeGraphql<{ user_update: unknown }, { id: number; data: DataConnectUserInput }>(
      UPDATE_USER_MUTATION,
      { variables: { id: userId, data: updateData } },
    );

    if (side === "frente" && !asCleanString(user.avatar)) {
      await enqueueMatriculaAvatarExtractionJob({
        userId,
        tipoDocumento,
        dni,
        fechaNacimiento: user.fechaNacimiento,
        documentProcessingJobId: `editor-documentos-save-avatar-${Date.now()}`,
        frenteProcesado: {
          path: processedPath,
          url: processedOutputUrl,
          contentType: detectDocumentContentType(processedOutputUrl),
        },
        existingAvatarUrl: user.avatar,
        existingRecorteFotografiaUrl: user.recorteFotografia,
        forceRegenerate: false,
      });
    }

    return {
      ok: true,
      side,
      processedUrl: processedOutputUrl,
      smallUrl: smallOutputUrl,
      originalUrl: side === "frente" ? updateData.dniImagenFrenteUrl ?? originalUrl : updateData.dniImagenReversoUrl ?? originalUrl,
    };
  } catch (error) {
    if (error instanceof https.HttpsError) throw error;
    console.error("Error in saveEditorDocumentoImage:", error);
    throw new https.HttpsError("internal", "No se pudo guardar la imagen editada.");
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

export const getMatriculaDocumentoEstado = https.onCall(async (data, context) => {
  await requireMatriculaPermissionOrFormularioAccess(context, "view");

  const tipoDocumento = normalizeDocumentType(data?.tipoDocumento);
  const dni = normalizeDocumentNumber(data?.dni);
  if (!tipoDocumento || !dni) {
    throw new https.HttpsError("invalid-argument", "Ingresa tipo y numero de documento.");
  }

  try {
    const existingUser = await findStudentUserByDocument(tipoDocumento, dni);
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
  const documentNumber = normalizeDocumentNumber(data?.dni)
    .replace(/\D/g, "")
    .slice(0, tipoDocumento === "CE" ? 9 : 8);
  if (!tipoDocumento || !documentNumber) {
    throw new https.HttpsError("invalid-argument", "Ingresa tipo y numero de documento.");
  }
  if (tipoDocumento !== "DNI") {
    const existingUser = await findStudentUserByDocument(tipoDocumento, documentNumber);
    return {
      userExists: Boolean(existingUser),
      datos: mergeSavedUserWithOcr(existingUser, {
        tipoDocumento,
        dni: documentNumber,
      }),
      documentImagePolicy: getDocumentImagePolicy(existingUser),
    };
  }
  if (!/^\d{8}$/.test(documentNumber)) {
    throw new https.HttpsError("invalid-argument", "Ingresa un DNI valido de 8 digitos.");
  }

  try {
    const [existingUser, dniDataResult] = await Promise.allSettled([
      findStudentUserByDocument("DNI", documentNumber),
      fetchPeruDevsDni(documentNumber),
    ]);
    const existingUserValue = existingUser.status === "fulfilled" ? existingUser.value : null;
    if (existingUser.status === "rejected") {
      console.error("Error finding existing user for matricula verification:", existingUser.reason);
    }
    if (dniDataResult.status === "rejected" && !existingUserValue) {
      throw dniDataResult.reason;
    }
    const dniData = dniDataResult.status === "fulfilled" ? dniDataResult.value : null;
    const reniecData: OcrIdentityData = dniData ? {
      tipoDocumento: "DNI",
      dni: documentNumber,
      nombre: asCleanString(dniData.nombres),
      apellidoPaterno: asCleanString(dniData.apellido_paterno),
      apellidoMaterno: asCleanString(dniData.apellido_materno),
      sexo: normalizePeruDevsSexo(dniData.genero),
      nacionalidad: "PERUANA",
      fechaNacimiento: normalizeDate(dniData.fecha_nacimiento),
    } : {
      tipoDocumento: "DNI",
      dni: documentNumber,
    };

    return {
      userExists: Boolean(existingUserValue),
      datos: mergeSavedUserWithOcr(existingUserValue, reniecData),
      documentImagePolicy: getDocumentImagePolicy(existingUserValue),
    };
  } catch (error) {
    if (error instanceof https.HttpsError) throw error;
    console.error("Error in verificarMatriculaReniec:", error);
    throw new https.HttpsError("internal", "No se pudo consultar RENIEC.");
  }
});

export const verificarMatriculaOcrSimple = https.onCall(async (data, context) => {
  await requireMatriculaPermissionOrFormularioAccess(context, "create");

  const tipoDocumento = normalizeDocumentType(data?.tipoDocumento);
  const dni = normalizeDocumentNumber(data?.dni);
  if (!tipoDocumento || !dni) {
    throw new https.HttpsError("invalid-argument", "Ingresa tipo y numero de documento.");
  }

  try {
    const frente = getSimpleOcrImageInput(data?.frente, "frente");
    const reverso = getSimpleOcrImageInput(data?.reverso, "reverso");
    const [frontOcr, backOcr] = await runSimpleVisionOcr([frente, reverso]);
    if (frontOcr.error || backOcr.error) {
      throw new https.HttpsError(
        "failed-precondition",
        [frontOcr.error, backOcr.error].filter(Boolean).join(" / ") || "No se pudo leer el documento.",
      );
    }

    const frontValid = validateSimpleOcrFront(frontOcr.text, dni);
    const backValid = validateSimpleOcrBack(backOcr.text);
    return {
      frontValid,
      backValid,
      frontError: frontValid ? null : "No se encontro lado de frente del DNI.",
      backError: backValid ? null : "No se encontro el lado reverso del DNI.",
      debug: {
        frente: {
          nombreArchivo: frente.name,
          textoPreview: frontOcr.text.slice(0, 500),
        },
        reverso: {
          nombreArchivo: reverso.name,
          textoPreview: backOcr.text.slice(0, 500),
        },
      },
    };
  } catch (error) {
    if (error instanceof https.HttpsError) throw error;
    console.error("Error in verificarMatriculaOcrSimple:", error);
    throw new https.HttpsError("internal", "No se pudo hacer la validacion OCR simple.");
  }
});

export const verificarMatriculaGemini = runWith({ timeoutSeconds: 120, memory: "512MB" }).https.onCall(async (data, context) => {
  await requireMatriculaPermissionOrFormularioAccess(context, "create");

  const tipoDocumento = normalizeDocumentType(data?.tipoDocumento);
  const dni = normalizeDocumentNumber(data?.dni);
  if (!tipoDocumento || !dni) {
    throw new https.HttpsError("invalid-argument", "Ingresa tipo y numero de documento.");
  }

  try {
    const rawArchivos: unknown[] = Array.isArray(data?.archivos) ? data.archivos : [];
    const archivos = rawArchivos
      .slice(0, 2)
      .map((archivo, index) => getGeminiDocumentInput(archivo, `archivo ${index + 1}`));
    if (archivos.length === 0) {
      throw new https.HttpsError("invalid-argument", "Sube al menos un archivo del documento.");
    }
    return await runMatriculaGeminiRecognition({
      tipoDocumento,
      dni,
      archivos,
    });
  } catch (error) {
    if (error instanceof https.HttpsError) throw error;
    console.error("Error in verificarMatriculaGemini:", error);
    throw new https.HttpsError("internal", "No se pudo verificar el documento con Gemini.");
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
      modulo?: {
        titulo?: string | null;
        tituloComercial?: string | null;
        orden?: number | null;
        plan?: {
          carrera?: {
            especialidad?: {
              orden?: number | null;
            } | null;
          } | null;
        } | null;
      } | null;
    };

    const buildGrupoModuloTitulo = (
      grupo: { nombreDisplay?: string | null; paquete?: { titulo?: string | null } | null },
      grupoModulos: GrupoModuloLabelRow[],
    ) => {
      const grupoNombre = asCleanString(grupo.nombreDisplay);
      if (grupoNombre) return grupoNombre;

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
          (a.modulo?.plan?.carrera?.especialidad?.orden ?? Number.MAX_SAFE_INTEGER) - (b.modulo?.plan?.carrera?.especialidad?.orden ?? Number.MAX_SAFE_INTEGER) ||
          (a.modulo?.orden ?? Number.MAX_SAFE_INTEGER) - (b.modulo?.orden ?? Number.MAX_SAFE_INTEGER) ||
          (a.orden ?? Number.MAX_SAFE_INTEGER) - (b.orden ?? Number.MAX_SAFE_INTEGER) ||
          a.id - b.id,
        );
      const first = ordered[0];
      return {
        especialidadOrden: first?.modulo?.plan?.carrera?.especialidad?.orden ?? null,
        moduloOrden: first?.modulo?.orden ?? null,
        grupoModuloOrden: first?.orden ?? null,
      };
    };

    const byGrupoId = new Map<number, {
      id: number;
      grupoId: number;
      paqueteId: number;
      titulo?: string | null;
      descripcion?: string | null;
      grupoModuloTitulo?: string | null;
      especialidadOrden?: number | null;
      moduloOrden?: number | null;
      grupoModuloOrden?: number | null;
      grupoIds: number[];
    }>();
    const labelGroups = new Array<{
      paqueteId: number;
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
      const current = {
        id: grupo.id,
        grupoId: grupo.id,
        paqueteId,
        titulo: grupo.paquete?.titulo ?? `Modulo ${paqueteId}`,
        descripcion: grupo.paquete?.descripcion ?? null,
        grupoModuloTitulo: null,
        especialidadOrden: null,
        moduloOrden: null,
        grupoModuloOrden: null,
        grupoIds: [grupo.id],
      };
      byGrupoId.set(grupo.id, current);
      labelGroups.push({ ...grupo, paqueteId });
    }

    const labelEntries = await Promise.all(
      labelGroups.map(async (grupo) => {
        const grupoModulosResponse = await dataConnect.executeGraphql<{
          grupoModulos: Array<GrupoModuloLabelRow & { moduloId: number; grupoId: number }>;
        }, { grupoId: number }>(
          GET_GRUPO_MODULOS_FOR_MATRICULA_QUERY,
          { variables: { grupoId: grupo.id } },
        );
        const grupoModulos = grupoModulosResponse.data.grupoModulos ?? [];
        return [grupo.id, buildGrupoModuloTitulo(grupo, grupoModulos), getGrupoModuloSort(grupoModulos)] as const;
      }),
    );
    for (const [grupoId, grupoModuloTitulo, sortInfo] of labelEntries) {
      const current = byGrupoId.get(grupoId);
      if (current) {
        current.grupoModuloTitulo = grupoModuloTitulo;
        current.especialidadOrden = sortInfo.especialidadOrden;
        current.moduloOrden = sortInfo.moduloOrden;
        current.grupoModuloOrden = sortInfo.grupoModuloOrden;
      }
    }

    return {
      paquetes: Array.from(byGrupoId.values()).sort((a, b) =>
        (a.especialidadOrden ?? Number.MAX_SAFE_INTEGER) - (b.especialidadOrden ?? Number.MAX_SAFE_INTEGER) ||
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

async function getGrupoModuloMapping(
  semestreId: number,
  paqueteId: number,
  grupoId?: number | null,
  options?: { syncPaqueteFromGrupo?: boolean },
): Promise<GrupoModuloMapping> {
  if (grupoId && grupoId > 0) {
    const grupoResponse = await dataConnect.executeGraphql<{
      grupo: {
        id: number;
        semestreId?: number | null;
        paqueteId?: number | null;
        workspaceCorreo?: string | null;
        archivado?: boolean | null;
        paquete?: { id?: number | null; archivado?: boolean | null } | null;
      } | null;
    }, { grupoId: number }>(
      GET_GRUPO_FOR_MATRICULA_QUERY,
      { variables: { grupoId } },
    );
    const selectedGrupo = grupoResponse.data.grupo;
    if (!selectedGrupo || selectedGrupo.archivado || selectedGrupo.paquete?.archivado) {
      throw new https.HttpsError("failed-precondition", "El grupo seleccionado no esta disponible.");
    }
    if (selectedGrupo.semestreId !== semestreId) {
      throw new https.HttpsError("failed-precondition", "El grupo seleccionado no corresponde al periodo y modulo seleccionados.");
    }
    const selectedPaqueteId = selectedGrupo.paqueteId ?? null;
    if (!selectedPaqueteId || selectedPaqueteId <= 0) {
      throw new https.HttpsError("failed-precondition", "El grupo seleccionado no tiene un modulo asociado.");
    }
    if (selectedPaqueteId !== paqueteId && !options?.syncPaqueteFromGrupo) {
      throw new https.HttpsError("failed-precondition", "El grupo seleccionado no corresponde al periodo y modulo seleccionados.");
    }

    const modulosResponse = await dataConnect.executeGraphql<{
      grupoModulos: Array<{ id: number; moduloId: number; grupoId: number }>;
    }, { grupoId: number }>(
      GET_GRUPO_MODULOS_FOR_MATRICULA_QUERY,
      { variables: { grupoId: selectedGrupo.id } },
    );

    return {
      grupoId: selectedGrupo.id,
      semestreId,
      paqueteId: selectedPaqueteId,
      workspaceCorreo: selectedGrupo.workspaceCorreo ?? null,
      moduloGrupos: (modulosResponse.data.grupoModulos ?? []).map((item) => ({
        grupoModuloId: item.id,
        moduloId: item.moduloId,
        grupoId: item.grupoId,
      })),
    };
  }

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
    grupoModulos: Array<{ id: number; moduloId: number; grupoId: number }>;
  }, { grupoId: number }>(
    GET_GRUPO_MODULOS_FOR_MATRICULA_QUERY,
    { variables: { grupoId: grupo.id } },
  );

  return {
    grupoId: grupo.id,
    semestreId,
    paqueteId,
    workspaceCorreo: grupo.workspaceCorreo ?? null,
    moduloGrupos: (modulosResponse.data.grupoModulos ?? []).map((item) => ({
      grupoModuloId: item.id,
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
  const reciboNumericKey = getMatriculaReciboNumericKey(recibo);
  const [duplicateResponse, reciboResponse] = await Promise.all([
    dataConnect.executeGraphql<
      { matriculas: Array<{ id: number }> },
      { userId: number; semestreId: number; paqueteId: number }
    >(
      CHECK_DUPLICATE_MATRICULA_QUERY,
      { variables: { userId, semestreId, paqueteId } },
    ),
    reciboNumericKey
      ? dataConnect.executeGraphql<{ matriculas: Array<{ id: number; recibo?: string | null }> }, Record<string, never>>(
        LIST_RECIBOS_MATRICULA_QUERY,
        { variables: {} },
      )
      : isRepeatableMatriculaRecibo(recibo)
      ? Promise.resolve(null)
      : dataConnect.executeGraphql<{ matriculas: Array<{ id: number; recibo?: string | null }> }, { recibo: string }>(
        CHECK_RECIBO_MATRICULA_QUERY,
        { variables: { recibo } },
      ),
  ]);

  const hasSameRecibo = reciboNumericKey
    ? (reciboResponse?.data.matriculas ?? []).some((item) =>
      item.id !== currentMatriculaId && getMatriculaReciboNumericKey(item.recibo) === reciboNumericKey,
    )
    : (reciboResponse?.data.matriculas ?? []).some((item) => item.id !== currentMatriculaId);
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

function buildMatriculaNickName(data: Record<string, unknown>): string {
  const firstName = asCleanString(data.nombre)?.split(/\s+/)[0] ?? "";
  return [
    firstName,
    asCleanString(data.apellidoPaterno),
  ].filter(Boolean).join(" ").trim() || buildMatriculaUsername(data);
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
    const updated = await authAdmin.updateUser(existingAuthUser.uid, {
      email: institutionalEmail,
      displayName: username,
      emailVerified: true,
      disabled: blockedForAuth,
    });
    const desiredClaims = { role: String(roleId), level: permissionLevel };
    const currentClaims = updated.customClaims ?? {};
    if (currentClaims.role !== desiredClaims.role || currentClaims.level !== desiredClaims.level) {
      await authAdmin.setCustomUserClaims(updated.uid, desiredClaims);
    }
    return {
      authUser: updated,
      authPassword: null,
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
  await authAdmin.setCustomUserClaims(created.uid, { role: String(roleId), level: permissionLevel });

  return {
    authUser: created,
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
    nickName: buildMatriculaNickName(data),
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

  let workspaceWarning: string | null = null;
  if (shouldSyncStudentWorkspace(authStudent.roleId, authStudent.roleTitle)) {
    if (!workspacePrimaryEmail) {
      throw new https.HttpsError(
        "failed-precondition",
        "No se pudo resolver el correo institucional del estudiante para Workspace.",
      );
    }

    try {
      await retryTransientWorkspace(
        () => syncStudentToWorkspace(
          {
            email: workspacePrimaryEmail,
            institutionalEmail: payload.correoInstitucional ?? authStudent.institutionalEmail,
            formEmail: payload.email ?? personalEmail,
            avatar: avatarForWorkspace,
            password: authStudent.authPassword ?? undefined,
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
            createPassword: authStudent.authPassword,
            preferPatchFirst: Boolean(existingUser || authStudent.authAlreadyExisted),
          },
        ),
      );
    } catch (workspaceError: unknown) {
      const rawMessage = String((workspaceError as { message?: string } | null)?.message || "");
      console.error("Workspace sync failed in saveUserForMatricula:", workspaceError);
      if (isTransientWorkspaceError(workspaceError)) {
        workspaceWarning = getWorkspaceWarningMessage(workspaceError);
      } else {
      throw new https.HttpsError(
        "failed-precondition",
        rawMessage || "No se pudo sincronizar el estudiante con Google Workspace.",
      );
      }
    }
  }

  return { userId, workspacePrimaryEmail, workspaceWarning };
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
    return await retryTransientWorkspace(
      () => addWorkspaceGroupMember(grupoMapping.workspaceCorreo ?? null, workspacePrimaryEmail),
    );
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
  const grupoId = toNumberOrNull(data?.grupoId);
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
    const [{ responsable, responsableUser }, existingUser] = await Promise.all([
      getMatriculaResponsableFromContext(context),
      findStudentUserByDocument(tipoDocumento, dni),
    ]);
    const savedUser = await saveUserForMatricula(existingUser, {
      ...(data as Record<string, unknown>),
      tipoDocumento,
      dni,
    }, context);
    const userId = savedUser.userId;
    const [, grupoMapping] = await Promise.all([
      ensureNoMatriculaDuplicates(userId, semestreId, paqueteId, recibo),
      getGrupoModuloMapping(semestreId, paqueteId, grupoId),
    ]);
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
    let workspaceGroup: Awaited<ReturnType<typeof syncMatriculaStudentToWorkspaceGroup>> | { warning: string; skipped: true } | null = null;
    const workspaceWarnings = [savedUser.workspaceWarning].filter((item): item is string => Boolean(item));
    try {
      workspaceGroup = await syncMatriculaStudentToWorkspaceGroup(grupoMapping, savedUser.workspacePrimaryEmail);
    } catch (workspaceGroupError) {
      if (isTransientWorkspaceError(workspaceGroupError)) {
        const warning = getWorkspaceWarningMessage(workspaceGroupError);
        workspaceWarnings.push(warning);
        workspaceGroup = { warning, skipped: true };
      } else {
        if (matricula.id) {
          await cleanupMatricula(matricula.id);
        }
        throw workspaceGroupError;
      }
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
          fechaVencimientoAnterior: existingUser?.fechaVencimiento,
          fechaVencimientoNueva: data?.fechaVencimiento,
          frente: getUploadedImage(data?.dniImagenFrente, existingUser?.dniImagenFrenteUrl),
          reverso: getUploadedImage(data?.dniImagenReverso, existingUser?.dniImagenReversoUrl),
          dniImagenFrenteProcesadaUrl: existingUser?.dniImagenFrenteProcesadaUrl,
          dniImagenReversoProcesadaUrl: existingUser?.dniImagenReversoProcesadaUrl,
          avatarUrl: existingUser?.avatar,
          recorteFotografiaUrl: existingUser?.recorteFotografia,
          analisisDocumentoTemporal: getDocumentoAnalisisMetadata(data?.analisisDocumentoTemporal),
        });
      } catch (jobError) {
        console.warn("No se pudo encolar el procesamiento de documentos de matricula:", jobError);
      }
    }
    if (!documentProcessingJobId) {
      await enqueueMatriculaAvatarExtractionFromExistingProcessed({
        user: existingUser,
        userId,
        dni,
        fechaNacimiento: data?.fechaNacimiento,
        source: `matricula-${matricula.id ?? "nueva"}-existing-processed`,
      });
    }
    await appendMatriculaCurrentSemesterSheetBestEffort(matricula.id, "crear matricula");

    return { ...matricula, semestreId, documentProcessingJobId, workspaceGroup, workspaceWarnings };
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
  await requireFormularioMatriculaOpen(data?.formularioMatriculaTipo);
  return crearMatriculaFormularioData(data, context);
});

export const updateMatriculaFormulario = https.onCall(async (data, context) => {
  await requirePermission(context, "matriculas", "edit");

  const matriculaId = toNumber(data?.id, -1);
  const tipoDocumento = normalizeDocumentType(data?.tipoDocumento);
  const dni = normalizeDocumentNumber(data?.dni);
  const semestreId = toNumber(data?.semestreId, -1);
  const paqueteId = toNumber(data?.paqueteId, -1);
  const grupoId = toNumberOrNull(data?.grupoId);
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
    const previousModuloItems = currentMatricula.modulosEstudiantes ?? [];
    const previousWorkspaceEmail = resolveWorkspaceEmailForMatriculaUser(currentMatricula.user);
    const [previousWorkspaceGroups, documentUser] = await Promise.all([
      getMatriculaWorkspaceGroups(matriculaId),
      findStudentUserByDocument(tipoDocumento, dni),
    ]);
    const currentStudentUser = isStudentMatriculaUser(currentMatricula.user)
      ? currentMatricula.user
      : null;
    const userToSave = documentUser ?? currentStudentUser;
    const savedUser = await saveUserForMatricula(userToSave, {
      ...(data as Record<string, unknown>),
      tipoDocumento,
      dni,
    }, context);
    const userId = savedUser.userId;

    const grupoMapping = await getGrupoModuloMapping(semestreId, paqueteId, grupoId, { syncPaqueteFromGrupo: true });
    const effectivePaqueteId = grupoMapping.paqueteId;
    await ensureNoMatriculaDuplicates(userId, semestreId, effectivePaqueteId, recibo, matriculaId);
    const moduloGrupos = grupoMapping.moduloGrupos;
    if (moduloGrupos.length < 1 || moduloGrupos.length > 6) {
      throw new https.HttpsError(
        "failed-precondition",
        "El paquete debe tener entre 1 y 6 instancias de modulos antes de matricular.",
      );
    }
    const moduloSelectionChanged = hasGrupoModuloSelectionChanged(previousModuloItems, moduloGrupos);
    if (moduloSelectionChanged && isDocenteMatriculaRequester(context)) {
      if (previousModuloItems.some((item) => isGrupoModuloChangeExpired(item))) {
        throw new https.HttpsError("failed-precondition", "Fecha de cambios vencida.");
      }
      if (countModuloChangeEvents(currentMatricula.cambiosModulo) >= DOCENTE_MAX_MODULO_CHANGE_EVENTS) {
        throw new https.HttpsError("failed-precondition", "Limite de cambios de modulo alcanzado.");
      }
    }

    const fechaCambio = new Date().toISOString();
    const matriculaPayload = buildMatriculaDataFromInput({
      ...data,
      userId,
      paqueteId: effectivePaqueteId,
      semestreId,
      recibo,
      fecha: currentMatricula.fecha ?? data?.fecha ?? fechaCambio,
      fechaActualizacion: fechaCambio,
      archivado: data?.archivado ?? currentMatricula.archivado ?? false,
      responsableId: undefined,
      responsableUserId: undefined,
    });

    const updated = await dataConnect.executeGraphql<
      { matricula_update: unknown },
      { id: number; data: DataConnectMatriculaInput }
    >(UPDATE_MATRICULA_MUTATION, { variables: { id: matriculaId, data: matriculaPayload } });

    const savedMatriculaId = getIdFromKeyOutput(updated.data.matricula_update) ?? matriculaId;
    await recordMatriculaModuloChanges({
      matriculaId: savedMatriculaId,
      userId,
      semestreId,
      previousItems: previousModuloItems,
      nextItems: moduloGrupos,
      fechaCambio,
      registradoPorId: await getRequesterDataConnectUserId(context),
    });
    await replaceModuloEstudiantesForMatricula(
      savedMatriculaId,
      moduloGrupos,
      grupoMapping.grupoId,
    );
    let workspaceGroup: Awaited<ReturnType<typeof syncMatriculaWorkspaceGroupChange>> | { warning: string; skipped: true } | null = null;
    const workspaceWarnings = [savedUser.workspaceWarning].filter((item): item is string => Boolean(item));
    try {
      workspaceGroup = await syncMatriculaWorkspaceGroupChange({
        previousGroups: previousWorkspaceGroups,
        newGroup: grupoMapping,
        previousUserId: currentMatricula.userId ?? userId,
        currentMatriculaId: savedMatriculaId,
        previousWorkspaceEmail,
        newWorkspaceEmail: savedUser.workspacePrimaryEmail,
      });
    } catch (workspaceGroupError) {
      if (!isTransientWorkspaceError(workspaceGroupError)) throw workspaceGroupError;
      const warning = getWorkspaceWarningMessage(workspaceGroupError);
      workspaceWarnings.push(warning);
      workspaceGroup = { warning, skipped: true };
    }

    let documentProcessingJobId: string | null = null;
    if (data?.procesarImagenesDni !== false) {
      try {
        documentProcessingJobId = await enqueueMatriculaDocumentProcessingJob({
          matriculaId: savedMatriculaId,
          userId,
          tipoDocumento,
          dni,
          fechaNacimiento: data?.fechaNacimiento ?? userToSave?.fechaNacimiento,
          fechaVencimientoAnterior: userToSave?.fechaVencimiento,
          fechaVencimientoNueva: data?.fechaVencimiento,
          frente: getUploadedImage(data?.dniImagenFrente, userToSave?.dniImagenFrenteUrl),
          reverso: getUploadedImage(data?.dniImagenReverso, userToSave?.dniImagenReversoUrl),
          dniImagenFrenteProcesadaUrl: userToSave?.dniImagenFrenteProcesadaUrl,
          dniImagenReversoProcesadaUrl: userToSave?.dniImagenReversoProcesadaUrl,
          avatarUrl: userToSave?.avatar,
          recorteFotografiaUrl: userToSave?.recorteFotografia,
          analisisDocumentoTemporal: getDocumentoAnalisisMetadata(data?.analisisDocumentoTemporal),
        });
      } catch (jobError) {
        console.warn("No se pudo encolar el procesamiento de documentos de matricula actualizada:", jobError);
      }
    }
    if (!documentProcessingJobId) {
      await enqueueMatriculaAvatarExtractionFromExistingProcessed({
        user: userToSave,
        userId,
        dni,
        fechaNacimiento: data?.fechaNacimiento ?? userToSave?.fechaNacimiento,
        source: `matricula-${savedMatriculaId}-existing-processed`,
      });
    }
    await syncMatriculasCurrentSemesterSheetBestEffort("actualizar matricula");

    return { id: savedMatriculaId, semestreId, paqueteId: effectivePaqueteId, userId, documentProcessingJobId, workspaceGroup, workspaceWarnings };
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
    const deletedId = await deleteMatriculaTree(matriculaId);
    await syncMatriculasCurrentSemesterSheetBestEffort("eliminar matricula");
    return { id: deletedId };
  } catch (error) {
    console.error("Error in deleteMatricula:", error);
    throw new https.HttpsError("internal", "No se pudo eliminar la matricula.");
  }
});

export const createMatriculaDesdePaquete = https.onCall(async (data, context) => {
  await requirePermission(context, "matriculas", "create");

  try {
    const matricula = await createMatriculaWithModuloEstudiantes(data as Record<string, unknown>);
    await appendMatriculaCurrentSemesterSheetBestEffort(matricula.id, "crear matricula desde paquete");
    return matricula;
  } catch (error) {
    if (error instanceof https.HttpsError) {
      throw error;
    }
    console.error("Error in createMatriculaDesdePaquete:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while creating matricula.");
  }
});
