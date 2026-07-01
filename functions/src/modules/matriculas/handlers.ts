import { getStorage } from "firebase-admin/storage";
import { https } from "firebase-functions/v1";
import { documentai_v1, google } from "googleapis";
import {
  buildMatriculaDataFromInput,
  buildModuloEstudianteDataFromInput,
  buildUserDataFromInput,
  getIdFromKeyOutput,
  toNumber,
  toNumberOrNull,
} from "../core/userMappers.js";
import { dataConnect } from "../core/dataConnectCore.js";
import {
  DataConnectMatriculaInput,
  DataConnectModuloEstudianteInput,
  DataConnectPaquete,
  DataConnectPaqueteModulo,
  DataConnectUserInput,
} from "../core/types.js";
import {
  DELETE_MATRICULA_MUTATION,
  DELETE_MODULO_ESTUDIANTES_BY_MATRICULA_MUTATION,
  INSERT_MATRICULA_MUTATION,
  INSERT_MODULO_ESTUDIANTE_MUTATION,
  INSERT_USER_MUTATION,
  UPDATE_USER_MUTATION,
} from "../../dataconnectOperations.js";

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
  rolId?: number | null;
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
  estadoCivil?: string | null;
  direccion?: string | null;
  distrito?: string | null;
}

interface UploadedDocumentImage {
  path?: string | null;
  url?: string | null;
  contentType?: string | null;
}

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

const LIST_MATRICULA_PAQUETES_BY_SEMESTRE_QUERY = `
  query ListMatriculaPaquetesBySemestre($semestreId: Int!) {
    grupos(where: { semestreId: { eq: $semestreId }, archivado: { ne: true } }, limit: 500) {
      id
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

const GET_GRUPOS_BY_SEMESTRE_PAQUETE_QUERY = `
  query GetGruposBySemestrePaquete($semestreId: Int!, $paqueteId: Int!) {
    grupos(where: { semestreId: { eq: $semestreId }, paqueteId: { eq: $paqueteId }, archivado: { ne: true } }, limit: 20) {
      id
      grupoOrd
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
      orden
      obligatorio
      grupoId
      moduloId
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

function requireLevel(context: https.CallableContext, action: string) {
  const requesterLevel = context.auth?.token?.level ?? 0;
  if (requesterLevel < 600) {
    throw new https.HttpsError("permission-denied", `You do not have permission to ${action}.`);
  }
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

function getUploadedImage(value: unknown): UploadedDocumentImage {
  if (!value || typeof value !== "object") return {};
  const raw = value as Record<string, unknown>;
  return {
    path: asCleanString(raw.path),
    url: asCleanString(raw.url),
    contentType: asCleanString(raw.contentType),
  };
}

function requireStoragePath(image: UploadedDocumentImage, label: string): string {
  const path = asCleanString(image.path);
  if (!path) {
    throw new https.HttpsError("invalid-argument", `Sube la imagen ${label} del documento.`);
  }
  if (!path.startsWith("matriculas/documentos/")) {
    throw new https.HttpsError("invalid-argument", `La imagen ${label} no esta en una ruta permitida.`);
  }
  return path;
}

async function readStorageImage(image: UploadedDocumentImage, label: string) {
  const path = requireStoragePath(image, label);
  const [buffer] = await getStorage().bucket().file(path).download();
  const contentType = image.contentType || (path.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg");
  return { buffer, contentType };
}

async function processIdentityDocumentImage(image: UploadedDocumentImage, label: string): Promise<OcrIdentityData & { text: string }> {
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

function extractIdentityData(
  document: documentai_v1.Schema$GoogleCloudDocumentaiV1Document | undefined,
): OcrIdentityData & { text: string } {
  const text = document?.text ?? "";
  const entities = flattenEntities(document?.entities);
  const dniFromEntity = findEntityValue(entities, ["document_id", "document_number", "id_number", "cui", "numero_documento"]);
  const dniFromText = /\b\d{8}\b/.exec(text)?.[0] ?? null;
  const typeFromEntity = findEntityValue(entities, ["document_type", "tipo_documento", "documento"]);
  const fullSurname = findEntityValue(entities, ["surname", "surnames", "last_name", "family_name"]);
  const surnameParts = fullSurname?.split(/\s+/).filter(Boolean) ?? [];
  const address = findEntityValue(entities, ["address", "domicilio", "direccion"]);
  const district = findEntityValue(entities, ["district", "distrito"]);

  return {
    text,
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
    estadoCivil: front.estadoCivil ?? back.estadoCivil ?? null,
    direccion: back.direccion ?? front.direccion ?? null,
    distrito: back.distrito ?? front.distrito ?? null,
  };
}

function validateOcrMatch(inputTipoDocumento: string, inputDni: string, ocr: OcrIdentityData, back: OcrIdentityData) {
  const expectedType = normalizeDocumentType(inputTipoDocumento);
  const foundType = normalizeDocumentType(ocr.tipoDocumento);
  const expectedNumber = normalizeDocumentNumber(inputDni);
  const foundNumber = normalizeDocumentNumber(ocr.dni);

  if (!expectedType || !foundType || expectedType !== foundType || !foundNumber || expectedNumber !== foundNumber) {
    throw new https.HttpsError(
      "failed-precondition",
      "No coincide el numero ingresado con las imagenes ingresadas.",
    );
  }

  if (!asCleanString(back.direccion) && !asCleanString(back.distrito)) {
    throw new https.HttpsError(
      "failed-precondition",
      "No se ha detectado el lado reverso del documento.",
    );
  }
}

async function cleanupMatricula(matriculaId: number) {
  try {
    await dataConnect.executeGraphql<
      { moduloEstudiante_deleteMany: number },
      { matriculaId: number }
    >(DELETE_MODULO_ESTUDIANTES_BY_MATRICULA_MUTATION, { variables: { matriculaId } });
    await dataConnect.executeGraphql<{ matricula_delete: unknown }, { id: number }>(
      DELETE_MATRICULA_MUTATION,
      { variables: { id: matriculaId } },
    );
  } catch (error) {
    console.error("Error cleaning up failed matricula:", error);
  }
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

    await Promise.all(
      paqueteModulos.map((paqueteModulo) => {
        const moduloEstudiante = buildModuloEstudianteDataFromInput({
          matriculaId,
          moduloId: paqueteModulo.moduloId,
          grupoId: grupoIdByModuloId.get(paqueteModulo.moduloId) ?? fallbackGrupoId,
          promedio: null,
        });
        return dataConnect.executeGraphql<
          { moduloEstudiante_insert: unknown },
          { data: DataConnectModuloEstudianteInput }
        >(INSERT_MODULO_ESTUDIANTE_MUTATION, { variables: { data: moduloEstudiante } });
      }),
    );

    return {
      id: matriculaId,
      paqueteId,
      userId,
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

export const verificarDocumentoMatricula = https.onCall(async (data, context) => {
  requireLevel(context, "verify matricula documents");

  const tipoDocumento = normalizeDocumentType(data?.tipoDocumento);
  const dni = normalizeDocumentNumber(data?.dni);
  if (!tipoDocumento || !dni) {
    throw new https.HttpsError("invalid-argument", "Ingresa tipo y numero de documento.");
  }

  try {
    const existingUser = await findUserByDocument(tipoDocumento, dni);
    const hasStoredImages = Boolean(existingUser?.dniImagenFrenteUrl && existingUser?.dniImagenReversoUrl);
    if (existingUser && hasStoredImages) {
      return {
        userExists: true,
        userHasStoredImages: true,
        user: existingUser,
        datos: mergeSavedUserWithOcr(existingUser, { tipoDocumento, dni }),
        ocr: null,
      };
    }

    const frontImage = getUploadedImage(data?.frente);
    const backImage = getUploadedImage(data?.reverso);
    const [frontOcr, backOcr] = await Promise.all([
      processIdentityDocumentImage(frontImage, "frontal"),
      processIdentityDocumentImage(backImage, "reverso"),
    ]);
    const ocr = combineOcrData(frontOcr, backOcr);
    validateOcrMatch(tipoDocumento, dni, ocr, backOcr);

    return {
      userExists: Boolean(existingUser),
      userHasStoredImages: false,
      user: existingUser,
      datos: mergeSavedUserWithOcr(existingUser, ocr),
      ocr,
    };
  } catch (error) {
    if (error instanceof https.HttpsError) throw error;
    console.error("Error in verificarDocumentoMatricula:", error);
    throw new https.HttpsError("internal", "No se pudo verificar el documento.");
  }
});

export const listMatriculaPaquetesBySemestre = https.onCall(async (data, context) => {
  requireLevel(context, "list matricula packages");

  const semestreId = toNumber(data?.semestreId, -1);
  if (semestreId <= 0) {
    throw new https.HttpsError("invalid-argument", "Selecciona un periodo.");
  }

  try {
    const response = await dataConnect.executeGraphql<{
      grupos: Array<{
        id: number;
        paqueteId?: number | null;
        paquete?: { id?: number | null; titulo?: string | null; descripcion?: string | null; archivado?: boolean | null } | null;
      }>;
    }, { semestreId: number }>(
      LIST_MATRICULA_PAQUETES_BY_SEMESTRE_QUERY,
      { variables: { semestreId } },
    );

    const byPaqueteId = new Map<number, { id: number; titulo?: string | null; descripcion?: string | null; grupoIds: number[] }>();
    for (const grupo of response.data.grupos ?? []) {
      const paqueteId = grupo.paqueteId ?? grupo.paquete?.id ?? null;
      if (!paqueteId || grupo.paquete?.archivado) continue;
      const current = byPaqueteId.get(paqueteId) ?? {
        id: paqueteId,
        titulo: grupo.paquete?.titulo ?? `Modulo ${paqueteId}`,
        descripcion: grupo.paquete?.descripcion ?? null,
        grupoIds: [],
      };
      current.grupoIds.push(grupo.id);
      byPaqueteId.set(paqueteId, current);
    }

    return {
      paquetes: Array.from(byPaqueteId.values()).sort((a, b) =>
        String(a.titulo ?? "").localeCompare(String(b.titulo ?? ""), "es", { numeric: true }),
      ),
    };
  } catch (error) {
    console.error("Error in listMatriculaPaquetesBySemestre:", error);
    throw new https.HttpsError("internal", "No se pudieron cargar los modulos del periodo.");
  }
});

async function getGrupoModuloMapping(semestreId: number, paqueteId: number) {
  const gruposResponse = await dataConnect.executeGraphql<{
    grupos: Array<{ id: number; grupoOrd?: number | null; paquete?: { id?: number | null; archivado?: boolean | null } | null }>;
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
    moduloGrupos: (modulosResponse.data.grupoModulos ?? []).map((item) => ({
      moduloId: item.moduloId,
      grupoId: item.grupoId,
    })),
  };
}

async function ensureNoMatriculaDuplicates(userId: number, semestreId: number, paqueteId: number, recibo: string) {
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

  if ((reciboResponse.data.matriculas ?? []).length > 0) {
    throw new https.HttpsError("already-exists", "El numero de recibo ya fue registrado.");
  }
  if ((duplicateResponse.data.matriculas ?? []).length > 0) {
    throw new https.HttpsError("already-exists", "El usuario ya esta matriculado en este modulo durante el periodo seleccionado.");
  }
}

async function saveUserForMatricula(
  existingUser: MatriculaUserRow | null,
  data: Record<string, unknown>,
): Promise<number> {
  const now = new Date().toISOString();
  const imageFront = getUploadedImage(data.dniImagenFrente);
  const imageBack = getUploadedImage(data.dniImagenReverso);
  const payload = buildUserDataFromInput({
    ...data,
    tipoDocumento: normalizeDocumentType(data.tipoDocumento),
    dni: normalizeDocumentNumber(data.dni),
    username: [
      asCleanString(data.nombre),
      asCleanString(data.apellidoPaterno),
      asCleanString(data.apellidoMaterno),
    ].filter(Boolean).join(" "),
    nacionalidad: asCleanString(data.nacionalidad) ?? "PERUANA",
    provider: existingUser?.provider ?? "matricula",
    confirmed: existingUser?.confirmed ?? true,
    blocked: existingUser?.blocked ?? false,
    documentId: existingUser?.documentId ?? `matricula:${normalizeDocumentType(data.tipoDocumento)}:${normalizeDocumentNumber(data.dni)}`,
    fechaCreacion: existingUser?.fechaCreacion ?? now,
    fechaModificacion: now,
    dniImagenFrenteUrl: existingUser?.dniImagenFrenteUrl ?? imageFront.url ?? null,
    dniImagenReversoUrl: existingUser?.dniImagenReversoUrl ?? imageBack.url ?? null,
  });

  if (existingUser) {
    const updated = await dataConnect.executeGraphql<{ user_update: unknown }, { id: number; data: DataConnectUserInput }>(
      UPDATE_USER_MUTATION,
      { variables: { id: existingUser.id, data: payload } },
    );
    return getIdFromKeyOutput(updated.data.user_update) ?? existingUser.id;
  }

  const created = await dataConnect.executeGraphql<{ user_insert: unknown }, { data: DataConnectUserInput }>(
    INSERT_USER_MUTATION,
    { variables: { data: payload } },
  );
  const createdId = getIdFromKeyOutput(created.data.user_insert);
  if (!createdId) {
    throw new Error("No se pudo crear el usuario para la matricula.");
  }
  return createdId;
}

export const crearMatriculaFormulario = https.onCall(async (data, context) => {
  requireLevel(context, "create matricula form");

  const tipoDocumento = normalizeDocumentType(data?.tipoDocumento);
  const dni = normalizeDocumentNumber(data?.dni);
  const semestreId = toNumber(data?.semestreId, -1);
  const paqueteId = toNumber(data?.paqueteId, -1);
  const recibo = asCleanString(data?.recibo);

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
    const existingUser = await findUserByDocument(tipoDocumento, dni);
    const userId = await saveUserForMatricula(existingUser, {
      ...(data as Record<string, unknown>),
      tipoDocumento,
      dni,
    });
    await ensureNoMatriculaDuplicates(userId, semestreId, paqueteId, recibo);
    const grupoMapping = await getGrupoModuloMapping(semestreId, paqueteId);
    const matricula = await createMatriculaWithModuloEstudiantes({
      ...(data as Record<string, unknown>),
      userId,
      paqueteId,
      semestreId,
      recibo,
      grupoId: grupoMapping.grupoId,
      moduloGrupos: grupoMapping.moduloGrupos,
      fecha: new Date().toISOString(),
      archivado: false,
    });

    return { ...matricula, semestreId };
  } catch (error) {
    if (error instanceof https.HttpsError) throw error;
    console.error("Error in crearMatriculaFormulario:", error);
    throw new https.HttpsError("internal", "No se pudo registrar la matricula.");
  }
});

export const createMatriculaDesdePaquete = https.onCall(async (data, context) => {
  requireLevel(context, "create matriculas");

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
