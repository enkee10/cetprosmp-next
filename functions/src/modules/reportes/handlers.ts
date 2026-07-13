import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { basename, join } from "path";
import { Readable } from "stream";
import { promisify } from "util";
import JSZip from "jszip";
import ExcelJS from "exceljs";
import { PDFDocument } from "pdf-lib";
import { getStorage } from "firebase-admin/storage";
import { https, runWith } from "firebase-functions/v1";
import { drive_v3, google } from "googleapis";
import { dataConnect } from "../core/dataConnectCore.js";
import { getDatosGeneralesGlobales } from "../datos-generales/service.js";
import { requirePermission } from "../core/permissions.js";

type ReportDocumentType = "acta" | "nomina";

type ReportInput = {
  tipoDocumento?: unknown;
  semestreId?: unknown;
  grupoModuloId?: unknown;
  pdfProvider?: unknown;
};

type DownloadRegistrosAcademicosInput = {
  tipoDocumento?: unknown;
  grupoModuloIds?: unknown;
  formato?: unknown;
};

type ReporteSemestre = {
  id: number;
  titulo?: string | null;
  inicio?: string | null;
  fin?: string | null;
  director?: ReportePersonal | null;
  coordinador1?: ReportePersonal | null;
};

type ReportePersonal = {
  id?: number | null;
  displayName?: string | null;
  user?: {
    username?: string | null;
    nombre?: string | null;
    apellidoPaterno?: string | null;
    apellidoMaterno?: string | null;
  } | null;
};

type ReporteGrupoModuloOption = {
  id: number;
  nombre?: string | null;
  orden?: number | null;
  inicio?: string | null;
  fin?: string | null;
  grupoId: number;
  moduloId: number;
  grupo?: {
    id: number;
    nombreDisplay?: string | null;
    turnoNombre?: string | null;
    semestreId?: number | null;
    semestre?: { id: number; titulo?: string | null } | null;
    personal?: ReportePersonal | null;
    turno?: { nombre?: string | null } | null;
    horario?: { nombre?: string | null; diasSemana?: string | null } | null;
  } | null;
  modulo?: {
    id: number;
    titulo?: string | null;
    tituloComercial?: string | null;
    horas?: number | null;
    creditos?: number | null;
    duracionEfsrt?: number | null;
    creditosEfsrt?: number | null;
    plan?: {
      planEstudio?: string | null;
      resolucionTipo?: string | null;
      nro?: string | null;
      anio?: number | null;
      genera?: string | null;
      carrera?: {
        nombre?: string | null;
        titulo?: string | null;
        tituloComercial?: string | null;
        nivel?: string | null;
        tipoCarrera?: { nombre?: string | null } | null;
        especialidad?: { titulo?: string | null; tituloComercial?: string | null } | null;
      } | null;
    } | null;
  } | null;
};

type ReporteUnidad = {
  id: number;
  nombre?: string | null;
  sigla?: string | null;
  duracion?: number | null;
  creditos?: number | null;
};

type ReporteCapacidad = {
  id: number;
  descripcion?: string | null;
  sigla?: string | null;
  unidadDidacticaId?: number | null;
};

type ReporteEstudiante = {
  id: number;
  promedio?: number | null;
  puntaje?: number | null;
  matriculaId: number;
  moduloId: number;
  grupoId?: number | null;
  matricula?: {
    id: number;
    codigoInscripcion?: string | null;
    archivado?: boolean | null;
    user?: {
      id: number;
      username?: string | null;
      nombre?: string | null;
      apellidos?: string | null;
      apellidoPaterno?: string | null;
      apellidoMaterno?: string | null;
      dni?: string | null;
      sexo?: string | null;
      fechaNacimiento?: string | null;
    } | null;
  } | null;
};

type ReportePromedioUnidad = {
  promedio?: number | null;
  matriculaId: number;
  unidadDidacticaId?: number | null;
};

type ReportePromedioCapacidad = {
  promedio?: number | null;
  matriculaId: number;
  capacidadTerminalId?: number | null;
};

type ReporteEfsrt = {
  promedioFinal?: number | null;
  grupoModuloId: number;
  moduloEstudianteId: number;
};

type ReporteDetalleData = {
  grupoModulo: ReporteGrupoModuloOption | null;
  grupoModuloUnidadesDidacticas: Array<{ orden?: number | null; unidadDidacticaId: number }>;
  unidadDidacticaModulos: Array<{ orden?: number | null; unidadDidacticaId: number }>;
  unidadesDidacticas: ReporteUnidad[];
  capacidadesTerminales: ReporteCapacidad[];
  modulosEstudiantes: ReporteEstudiante[];
  unidadesDidacticasEstudiantes: ReportePromedioUnidad[];
  capacidadesTerminalesEstudiantes: ReportePromedioCapacidad[];
  efsrtPppEstudiantes: ReporteEfsrt[];
};

type ReporteDocumentoData = {
  grupoModulo: ReporteGrupoModuloOption;
  semestre: ReporteSemestre | null;
  unidades: ReporteUnidad[];
  capacidades: ReporteCapacidad[];
  estudiantes: ReporteEstudiante[];
  promediosUnidad: ReportePromedioUnidad[];
  promediosCapacidad: ReportePromedioCapacidad[];
  promediosEfsrt: ReporteEfsrt[];
  seccion: string;
  opcionOcupacional: boolean;
};

type SpreadsheetUpdate = {
  range: string;
  values: Array<Array<string | number>>;
};

type RegistroAcademicoDocumento = {
  id: number;
  tipoDocumento: string;
  grupoModuloId: number;
  pdfPath?: string | null;
  pdfUrl?: string | null;
  excelPath?: string | null;
  excelUrl?: string | null;
  generadoEn?: string | null;
};

type SharedStringWriter = (value: string) => number;

type ReportPdfProvider = "office" | "google" | "auto";

const FONT_XML_REGEX = /<font\b[^>]*\/>|<font\b[^>]*>[\s\S]*?<\/font>/gi;
const XF_XML_REGEX = /<xf\b[^>]*\/>|<xf\b[^>]*>[\s\S]*?<\/xf>/gi;

type ReportTemplate = {
  name: string;
  storageName: string;
};

const execFileAsync = promisify(execFile);

const TEMPLATES = {
  actaOpcion: {
    name: "Acta - Opcion Ocupacional",
    storageName: "acta-opcion-ocupacional",
  },
  actaPrograma: {
    name: "Acta - Programa de Estudios",
    storageName: "acta-programa-estudios",
  },
  nomina: {
    name: "Nomina - todos",
    storageName: "nomina-todos",
  },
};

const REPORTE_OPTIONS_QUERY = `
  query ReporteDocumentosOptions {
    semestres(limit: 200) {
      id
      titulo
      inicio
      fin
      archivado
    }
    grupoModulos(limit: 5000) {
      id
      nombre
      orden
      inicio
      fin
      grupoId
      moduloId
      grupo {
        id
        nombreDisplay
        turnoNombre
        semestreId
        semestre { id titulo }
        personal {
          displayName
          user { username nombre apellidoPaterno apellidoMaterno }
        }
        turno { nombre }
        horario { nombre diasSemana }
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
          planEstudio
          resolucionTipo
          nro
          anio
          genera
          carrera {
            nombre
            titulo
            tituloComercial
            nivel
            tipoCarrera { nombre }
            especialidad { titulo tituloComercial }
          }
        }
      }
    }
  }
`;

const REPORTE_DETALLE_QUERY = `
  query ReporteDocumentoDetalle($grupoModuloId: Int!, $grupoId: Int!, $moduloId: Int!, $semestreId: Int!) {
    grupoModulo(id: $grupoModuloId) {
      id
      nombre
      orden
      inicio
      fin
      grupoId
      moduloId
      grupo {
        id
        nombreDisplay
        turnoNombre
        semestreId
        semestre {
          id
          titulo
          inicio
          fin
          director {
            displayName
            user { username nombre apellidoPaterno apellidoMaterno }
          }
          coordinador1 {
            displayName
            user { username nombre apellidoPaterno apellidoMaterno }
          }
        }
        personal {
          displayName
          user { username nombre apellidoPaterno apellidoMaterno }
        }
        turno { nombre }
        horario { nombre diasSemana }
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
          planEstudio
          resolucionTipo
          nro
          anio
          genera
          carrera {
            nombre
            titulo
            tituloComercial
            nivel
            tipoCarrera { nombre }
            especialidad { titulo tituloComercial }
          }
        }
      }
    }
    grupoModulos(limit: 5000) {
      id
      nombre
      orden
      grupoId
      moduloId
      grupo {
        id
        nombreDisplay
        turnoNombre
        semestreId
        personal {
          displayName
          user { username nombre apellidoPaterno apellidoMaterno }
        }
        turno { nombre }
      }
    }
    grupoModuloUnidadesDidacticas(where: { grupoModuloId: { eq: $grupoModuloId } }, limit: 500) {
      orden
      unidadDidacticaId
    }
    unidadDidacticaModulos(where: { moduloId: { eq: $moduloId } }, limit: 500) {
      orden
      unidadDidacticaId
    }
    unidadesDidacticas(limit: 50000) {
      id
      nombre
      sigla
      duracion
      creditos
    }
    capacidadesTerminales(limit: 50000) {
      id
      descripcion
      sigla
      unidadDidacticaId
    }
    modulosEstudiantes(where: { grupoId: { eq: $grupoId }, moduloId: { eq: $moduloId } }, limit: 1000) {
      id
      promedio
      puntaje
      matriculaId
      moduloId
      grupoId
      matricula {
        id
        codigoInscripcion
        archivado
        user {
          id
          username
          nombre
          apellidos
          apellidoPaterno
          apellidoMaterno
          dni
          sexo
          fechaNacimiento
        }
      }
    }
    unidadesDidacticasEstudiantes(limit: 200000) {
      promedio
      matriculaId
      unidadDidacticaId
    }
    capacidadesTerminalesEstudiantes(limit: 200000) {
      promedio
      matriculaId
      capacidadTerminalId
    }
    efsrtPppEstudiantes(where: { grupoModuloId: { eq: $grupoModuloId } }, limit: 2000) {
      promedioFinal
      grupoModuloId
      moduloEstudianteId
    }
    semestres(where: { id: { eq: $semestreId } }, limit: 1) {
      id
      titulo
      inicio
      fin
      director {
        displayName
        user { username nombre apellidoPaterno apellidoMaterno }
      }
      coordinador1 {
        displayName
        user { username nombre apellidoPaterno apellidoMaterno }
      }
    }
  }
`;

const LIST_REGISTROS_ACADEMICOS_DOCUMENTOS_QUERY = `
  query ListRegistrosAcademicosDocumentosManual {
    registroAcademicoDocumentos(limit: 10000) {
      id
      tipoDocumento
      grupoModuloId
      pdfPath
      pdfUrl
      excelPath
      excelUrl
      generadoEn
    }
  }
`;

const GET_REGISTRO_ACADEMICO_DOCUMENTO_QUERY = `
  query GetRegistroAcademicoDocumentoManual($tipoDocumento: String!, $grupoModuloId: Int!) {
    registroAcademicoDocumentos(where: { tipoDocumento: { eq: $tipoDocumento }, grupoModuloId: { eq: $grupoModuloId } }, limit: 1) {
      id
      tipoDocumento
      grupoModuloId
      pdfPath
      pdfUrl
      excelPath
      excelUrl
      generadoEn
    }
  }
`;

const INSERT_REGISTRO_ACADEMICO_DOCUMENTO_MUTATION = `
  mutation InsertRegistroAcademicoDocumento($data: RegistroAcademicoDocumento_Data! @allow(fields: "tipoDocumento grupoModuloId pdfPath pdfUrl excelPath excelUrl generadoEn")) {
    registroAcademicoDocumento_insert(data: $data)
  }
`;

const UPDATE_REGISTRO_ACADEMICO_DOCUMENTO_MUTATION = `
  mutation UpdateRegistroAcademicoDocumento($id: Int!, $data: RegistroAcademicoDocumento_Data! @allow(fields: "pdfPath pdfUrl excelPath excelUrl generadoEn")) {
    registroAcademicoDocumento_update(id: $id, data: $data)
  }
`;

function toNumber(value: unknown, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function isOpcionOcupacional(value: unknown) {
  return normalizeText(value).includes("opcion ocupacional");
}

function cleanText(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function toTitleCase(value: string | null | undefined) {
  return cleanText(value)
    .toLocaleLowerCase("es-PE")
    .replace(/\b([\p{L}])/gu, (letter) => letter.toLocaleUpperCase("es-PE"));
}

function getPersonalName(personal?: ReportePersonal | null) {
  const user = personal?.user;
  return cleanText(
    personal?.displayName
      || [user?.nombre, user?.apellidoPaterno, user?.apellidoMaterno].filter(Boolean).join(" ")
      || user?.username
      || "",
  );
}

function getStudentName(student: ReporteEstudiante) {
  const user = student.matricula?.user;
  const apellidos = [user?.apellidoPaterno, user?.apellidoMaterno].filter(Boolean).join(" ");
  const nombres = cleanText(user?.nombre || user?.apellidos || user?.username || "");
  if (apellidos && nombres) return `${cleanText(apellidos).toLocaleUpperCase("es-PE")}, ${toTitleCase(nombres)}`;
  if (apellidos) return cleanText(apellidos).toLocaleUpperCase("es-PE");
  if (nombres) return toTitleCase(nombres);
  return `Matricula ${student.matriculaId}`;
}

function getModuloName(grupoModulo: ReporteGrupoModuloOption) {
  return cleanText(grupoModulo.nombre || grupoModulo.modulo?.titulo || grupoModulo.modulo?.tituloComercial || "");
}

function getModuloDocumentName(grupoModulo: ReporteGrupoModuloOption) {
  return cleanText(grupoModulo.modulo?.titulo || grupoModulo.modulo?.tituloComercial || "");
}

function getCarreraName(grupoModulo: ReporteGrupoModuloOption) {
  const carrera = grupoModulo.modulo?.plan?.carrera;
  return cleanText(carrera?.nombre || carrera?.titulo || carrera?.tituloComercial || carrera?.especialidad?.tituloComercial || carrera?.especialidad?.titulo || "");
}

function getDateValue(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value: string | null | undefined) {
  const date = getDateValue(value);
  return date ? date.toLocaleDateString("es-PE", { timeZone: "America/Lima" }) : "";
}

function formatDateLong(value: Date = new Date()) {
  const day = value.toLocaleDateString("es-PE", { day: "numeric", timeZone: "America/Lima" });
  const month = value.toLocaleDateString("es-PE", { month: "long", timeZone: "America/Lima" });
  const year = value.toLocaleDateString("es-PE", { year: "numeric", timeZone: "America/Lima" });
  return `${day} de ${month} del ${year}`;
}

function calculateAge(dateValue?: string | null, at = new Date()) {
  if (!dateValue) return "";
  const birthDate = new Date(dateValue);
  if (Number.isNaN(birthDate.getTime())) return "";
  let age = at.getFullYear() - birthDate.getFullYear();
  const monthDelta = at.getMonth() - birthDate.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && at.getDate() < birthDate.getDate())) age -= 1;
  return age >= 0 && age < 130 ? age : "";
}

function normalizeSex(value?: string | null) {
  const text = cleanText(value).toLocaleUpperCase("es-PE");
  if (!text) return "";
  if (text.startsWith("M")) return "M";
  if (text.startsWith("F")) return "F";
  return text.slice(0, 1);
}

function studentSex(student: ReporteEstudiante) {
  return normalizeSex(student.matricula?.user?.sexo);
}

function formatGrade(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "";
  return Math.round(value);
}

function formatHoras(value: unknown) {
  const text = cleanText(value);
  if (!text) return "";
  return normalizeText(text).includes("hora") ? text : `${text} horas`;
}

function formatPlanResolucion(plan?: {
  resolucionTipo?: string | null;
  nro?: string | null;
  anio?: number | null;
  genera?: string | null;
} | null) {
  if (!plan) return "";
  return [
    cleanText(plan.resolucionTipo),
    cleanText(plan.nro),
    plan.anio != null ? String(plan.anio) : "",
    cleanText(plan.genera),
  ].filter(Boolean).join("_");
}

function getCondition(promedio: number | null | undefined) {
  if (typeof promedio !== "number" || !Number.isFinite(promedio)) return "";
  return promedio >= 13 ? "A" : "D";
}

function buildUnidadIds(response: {
  grupoModuloUnidadesDidacticas?: Array<{ orden?: number | null; unidadDidacticaId: number }>;
  unidadDidacticaModulos?: Array<{ orden?: number | null; unidadDidacticaId: number }>;
}) {
  const groupUnits = (response.grupoModuloUnidadesDidacticas ?? [])
    .slice()
    .sort((a, b) => (a.orden ?? Number.MAX_SAFE_INTEGER) - (b.orden ?? Number.MAX_SAFE_INTEGER));
  const source = groupUnits.length > 0
    ? groupUnits
    : (response.unidadDidacticaModulos ?? []).slice().sort((a, b) => (a.orden ?? Number.MAX_SAFE_INTEGER) - (b.orden ?? Number.MAX_SAFE_INTEGER));
  return Array.from(new Set(source.map((item) => item.unidadDidacticaId)));
}

function turnoRank(value: string | null | undefined) {
  const normalized = normalizeText(value);
  if (normalized.includes("manana") || normalized.includes("mañana")) return 1;
  if (normalized.includes("tarde")) return 2;
  if (normalized.includes("noche")) return 3;
  return 9;
}

function computeSection(item: ReporteGrupoModuloOption, allItems: ReporteGrupoModuloOption[]) {
  const semestreId = item.grupo?.semestreId;
  const uniqueGroups = new Map<number, ReporteGrupoModuloOption>();
  for (const candidate of allItems) {
    if (candidate.grupo?.semestreId !== semestreId || candidate.moduloId !== item.moduloId) continue;
    if (!uniqueGroups.has(candidate.grupoId)) uniqueGroups.set(candidate.grupoId, candidate);
  }
  if (uniqueGroups.size <= 1) return "Unica";
  const ordered = Array.from(uniqueGroups.values()).sort((a, b) =>
    turnoRank(a.grupo?.turno?.nombre || a.grupo?.turnoNombre) - turnoRank(b.grupo?.turno?.nombre || b.grupo?.turnoNombre)
    || cleanText(a.grupo?.nombreDisplay).localeCompare(cleanText(b.grupo?.nombreDisplay), "es", { numeric: true })
    || a.grupoId - b.grupoId,
  );
  const index = Math.max(0, ordered.findIndex((candidate) => candidate.grupoId === item.grupoId));
  return String.fromCharCode("A".charCodeAt(0) + index);
}

function storageUrl(bucketName: string, path: string, token: string) {
  const emulatorHost = String(process.env.FIREBASE_STORAGE_EMULATOR_HOST || "").trim();
  if (emulatorHost) {
    const normalizedHost = emulatorHost.startsWith("http://") || emulatorHost.startsWith("https://")
      ? emulatorHost
      : `http://${emulatorHost}`;
    return `${normalizedHost}/v0/b/${bucketName}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
  }
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}

async function uploadBuffer(path: string, buffer: Buffer, contentType: string) {
  const token = randomUUID();
  const bucket = getStorage().bucket();
  await bucket.file(path).save(buffer, {
    contentType,
    metadata: {
      metadata: { firebaseStorageDownloadTokens: token },
    },
  });
  return {
    path,
    url: storageUrl(bucket.name, path, token),
    contentType,
  };
}

async function downloadStorageBuffer(path: string) {
  const [buffer] = await getStorage().bucket().file(path).download();
  return buffer;
}

async function listRegistrosAcademicosDocumentos() {
  const response = await dataConnect.executeGraphql<{
    registroAcademicoDocumentos: RegistroAcademicoDocumento[];
  }, Record<string, never>>(LIST_REGISTROS_ACADEMICOS_DOCUMENTOS_QUERY);
  return response.data.registroAcademicoDocumentos ?? [];
}

async function upsertRegistroAcademicoDocumento(input: {
  tipoDocumento: ReportDocumentType;
  grupoModuloId: number;
  pdf: { path: string; url: string };
  excel: { path: string; url: string };
  generadoEn: string;
}) {
  const existing = await dataConnect.executeGraphql<{
    registroAcademicoDocumentos: RegistroAcademicoDocumento[];
  }, { tipoDocumento: string; grupoModuloId: number }>(
    GET_REGISTRO_ACADEMICO_DOCUMENTO_QUERY,
    { variables: { tipoDocumento: input.tipoDocumento, grupoModuloId: input.grupoModuloId } },
  );
  const current = existing.data.registroAcademicoDocumentos?.[0] ?? null;
  const data = {
    pdfPath: input.pdf.path,
    pdfUrl: input.pdf.url,
    excelPath: input.excel.path,
    excelUrl: input.excel.url,
    generadoEn: input.generadoEn,
  };

  if (current?.id) {
    await dataConnect.executeGraphql<
      { registroAcademicoDocumento_update: unknown },
      { id: number; data: typeof data }
    >(
      UPDATE_REGISTRO_ACADEMICO_DOCUMENTO_MUTATION,
      { variables: { id: current.id, data } },
    );
    return { ...current, ...data } satisfies RegistroAcademicoDocumento;
  }

  const insertData = {
    tipoDocumento: input.tipoDocumento,
    grupoModuloId: input.grupoModuloId,
    ...data,
  };
  const inserted = await dataConnect.executeGraphql<
    { registroAcademicoDocumento_insert: unknown },
    { data: typeof insertData }
  >(
    INSERT_REGISTRO_ACADEMICO_DOCUMENTO_MUTATION,
    { variables: { data: insertData } },
  );
  return {
    id: Number((inserted.data.registroAcademicoDocumento_insert as { id?: number } | null)?.id ?? 0),
    ...insertData,
  } satisfies RegistroAcademicoDocumento;
}

function templateStoragePath(template: ReportTemplate) {
  return `documentos/${template.storageName}.xlsx`;
}

async function ensureTemplateInStorage(template: ReportTemplate) {
  const path = templateStoragePath(template);
  const file = getStorage().bucket().file(path);
  const [exists] = await file.exists();
  if (exists) {
    const [buffer] = await file.download();
    return { path, buffer };
  }

  throw new https.HttpsError(
    "failed-precondition",
    `No se encontro la plantilla ${path} en Storage. Sube el archivo Excel antes de generar reportes.`,
  );
}

async function ensureAllTemplatesInStorage() {
  await Promise.all([
    ensureTemplateInStorage(TEMPLATES.actaOpcion),
    ensureTemplateInStorage(TEMPLATES.actaPrograma),
    ensureTemplateInStorage(TEMPLATES.nomina),
  ]);
}

function quoteSheetName(sheetName: string) {
  return `'${sheetName.replace(/'/g, "''")}'`;
}

function cellRange(sheetName: string, cell: string) {
  return `${quoteSheetName(sheetName)}!${cell}`;
}

function addCell(updates: SpreadsheetUpdate[], sheetName: string, cell: string, value: string | number | null | undefined) {
  updates.push({
    range: cellRange(sheetName, cell),
    values: [[value === null || value === undefined ? "" : value]],
  });
}

function xmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function columnIndex(column: string) {
  return column
    .toUpperCase()
    .split("")
    .reduce((total, char) => total * 26 + char.charCodeAt(0) - 64, 0);
}

function cellParts(ref: string) {
  const match = /^([A-Z]+)(\d+)$/i.exec(ref);
  if (!match) throw new Error(`Referencia de celda invalida: ${ref}`);
  return { column: match[1].toUpperCase(), row: Number(match[2]) };
}

const cellXmlRegex = /<c\b[^>]*\/>|<c\b[^>]*>[\s\S]*?<\/c>/gi;

function cellRefFromCellXml(cellXml: string) {
  const tag = cellXml.match(/^<c\b[^>]*>/i)?.[0] ?? "";
  return parseAttributes(tag).get("r") ?? "";
}

function cellAttributesWithoutValueAttrs(cellXml: string, ref: string) {
  const tag = cellXml.match(/^<c\b[^>]*>/i)?.[0] ?? `<c r="${ref}">`;
  const attrs = parseAttributes(tag);
  attrs.set("r", ref);
  attrs.delete("t");
  const attrText = Array.from(attrs.entries())
    .map(([key, value]) => ` ${key}="${xmlEscape(value)}"`)
    .join("");
  return attrText || ` r="${ref}"`;
}

function buildCellXml(ref: string, value: string | number, attributes = ` r="${ref}"`, sharedStringWriter?: SharedStringWriter) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `<c${attributes}><v>${value}</v></c>`;
  }
  const text = String(value ?? "");
  if (sharedStringWriter) {
    return `<c${attributes} t="s"><v>${sharedStringWriter(text)}</v></c>`;
  }
  const space = /^\s|\s$|\n/.test(text) ? ' xml:space="preserve"' : "";
  return `<c${attributes} t="inlineStr"><is><t${space}>${xmlEscape(text)}</t></is></c>`;
}

function insertCellIntoRow(rowXml: string, ref: string, value: string | number, sharedStringWriter?: SharedStringWriter) {
  const { column } = cellParts(ref);
  const newColumnIndex = columnIndex(column);
  const cellRegex = new RegExp(cellXmlRegex.source, "gi");
  let insertAt = -1;
  let match: RegExpExecArray | null;
  while ((match = cellRegex.exec(rowXml))) {
    const cellRef = cellRefFromCellXml(match[0]);
    const cellColumn = /^([A-Z]+)/i.exec(cellRef)?.[1];
    if (cellColumn && columnIndex(cellColumn) > newColumnIndex) {
      insertAt = match.index;
      break;
    }
  }
  const newCell = buildCellXml(ref, value, undefined, sharedStringWriter);
  if (insertAt >= 0) {
    return `${rowXml.slice(0, insertAt)}${newCell}${rowXml.slice(insertAt)}`;
  }
  return rowXml.replace(/<\/row>$/, `${newCell}</row>`);
}

function setSheetCellValue(xml: string, ref: string, value: string | number, sharedStringWriter?: SharedStringWriter) {
  const { row } = cellParts(ref);
  const cellRegex = new RegExp(cellXmlRegex.source, "gi");
  let match: RegExpExecArray | null;
  while ((match = cellRegex.exec(xml))) {
    const existingCell = match[0];
    if (cellRefFromCellXml(existingCell).toUpperCase() !== ref.toUpperCase()) continue;
    return `${xml.slice(0, match.index)}${buildCellXml(ref, value, cellAttributesWithoutValueAttrs(existingCell, ref), sharedStringWriter)}${xml.slice(match.index + existingCell.length)}`;
  }

  const rowRegex = new RegExp(`<row\\b[^>]*\\br="${row}"[^>]*(?:/>|>[\\s\\S]*?</row>)`, "i");
  const existingRow = xml.match(rowRegex)?.[0];
  if (existingRow) {
    const nextRow = existingRow.endsWith("/>")
      ? existingRow.replace(/\/>$/, `>${buildCellXml(ref, value, undefined, sharedStringWriter)}</row>`)
      : insertCellIntoRow(existingRow, ref, value, sharedStringWriter);
    return xml.replace(rowRegex, nextRow);
  }

  const newRow = `<row r="${row}">${buildCellXml(ref, value, undefined, sharedStringWriter)}</row>`;
  return xml.replace(/<\/sheetData>/, `${newRow}</sheetData>`);
}

function getCellStyle(xml: string, ref: string) {
  const cellRegex = new RegExp(cellXmlRegex.source, "gi");
  let match: RegExpExecArray | null;
  while ((match = cellRegex.exec(xml))) {
    const cell = match[0];
    if (cellRefFromCellXml(cell).toUpperCase() !== ref.toUpperCase()) continue;
    const style = parseAttributes(cell.match(/^<c\b[^>]*>/i)?.[0] ?? "").get("s");
    return style ? Number(style) : null;
  }
  return null;
}

function setCellStyle(xml: string, ref: string, styleIndex: number) {
  const cellRegex = new RegExp(cellXmlRegex.source, "gi");
  let match: RegExpExecArray | null;
  while ((match = cellRegex.exec(xml))) {
    const cell = match[0];
    if (cellRefFromCellXml(cell).toUpperCase() !== ref.toUpperCase()) continue;
    const tag = cell.match(/^<c\b[^>]*>/i)?.[0] ?? "";
    const nextTag = setXmlAttribute(tag, "s", String(styleIndex));
    const nextCell = cell.replace(/^<c\b[^>]*>/i, nextTag);
    return `${xml.slice(0, match.index)}${nextCell}${xml.slice(match.index + cell.length)}`;
  }
  return xml;
}

function buildLeftIndentStyleXml(baseStyleXml: string, fontId?: number) {
  const applyAlignmentStyle = (tag: string) => setXmlAttribute(tag, "applyAlignment", "1");
  const applyFontStyle = (tag: string) => {
    if (fontId === undefined) return tag;
    return setXmlAttribute(setXmlAttribute(tag, "applyFont", "1"), "fontId", String(fontId));
  };
  const alignmentAttrs = (tag: string) => {
    const attrs = parseAttributes(tag);
    attrs.set("horizontal", "left");
    attrs.set("vertical", "center");
    attrs.set("textRotation", "0");
    attrs.delete("indent");
    return Array.from(attrs.entries())
      .map(([key, value]) => ` ${key}="${xmlEscape(value)}"`)
      .join("");
  };

  if (/\/>\s*$/i.test(baseStyleXml)) {
    const openTag = applyFontStyle(applyAlignmentStyle(baseStyleXml)).replace(/\/>\s*$/i, ">");
    return `${openTag}<alignment horizontal="left" vertical="center" textRotation="0"/></xf>`;
  }

  const openTag = baseStyleXml.match(/^<xf\b[^>]*>/i)?.[0] ?? "<xf>";
  let nextStyle = baseStyleXml.replace(/^<xf\b[^>]*>/i, applyFontStyle(applyAlignmentStyle(openTag)));
  if (/<alignment\b[^>]*(?:\/>|>[\s\S]*?<\/alignment>)/i.test(nextStyle)) {
    return nextStyle.replace(
      /<alignment\b[^>]*(?:\/>|>[\s\S]*?<\/alignment>)/i,
      (tag) => `<alignment${alignmentAttrs(tag)}/>`,
    );
  }
  return nextStyle.replace(/<\/xf>\s*$/i, '<alignment horizontal="left" vertical="center" textRotation="0"/></xf>');
}

function buildFontSizeXml(baseFontXml: string, size: number) {
  const sizeTag = `<sz val="${xmlEscape(String(size))}"/>`;
  if (/<sz\b[^>]*(?:\/>|>[\s\S]*?<\/sz>)/i.test(baseFontXml)) {
    return baseFontXml.replace(/<sz\b[^>]*(?:\/>|>[\s\S]*?<\/sz>)/i, sizeTag);
  }
  if (/^<font\b[^>]*\/>\s*$/i.test(baseFontXml)) {
    return baseFontXml.replace(/\/>\s*$/i, `>${sizeTag}</font>`);
  }
  return baseFontXml.replace(/^<font\b[^>]*>/i, (tag) => `${tag}${sizeTag}`);
}

function addFontSize(stylesXml: string, baseFontIndex: number, size: number) {
  const fontsMatch = stylesXml.match(/<fonts\b[^>]*>[\s\S]*?<\/fonts>/i);
  if (!fontsMatch?.[0]) return { xml: stylesXml, fontIndex: undefined };

  const fontTags = fontsMatch[0].match(FONT_XML_REGEX) ?? [];
  const baseFontXml = fontTags[baseFontIndex];
  if (!baseFontXml) return { xml: stylesXml, fontIndex: undefined };

  const nextFontIndex = fontTags.length;
  const nextFontXml = buildFontSizeXml(baseFontXml, size);
  const nextFonts = fontsMatch[0]
    .replace(/<fonts\b[^>]*>/i, (tag) => setXmlAttribute(tag, "count", String(nextFontIndex + 1)))
    .replace(/<\/fonts>\s*$/i, `${nextFontXml}</fonts>`);

  return {
    xml: `${stylesXml.slice(0, fontsMatch.index)}${nextFonts}${stylesXml.slice((fontsMatch.index ?? 0) + fontsMatch[0].length)}`,
    fontIndex: nextFontIndex,
  };
}

function addLeftIndentStyle(stylesXml: string, baseStyleIndex: number) {
  const cellXfsMatch = stylesXml.match(/<cellXfs\b[^>]*>[\s\S]*?<\/cellXfs>/i);
  if (!cellXfsMatch?.[0]) return { xml: stylesXml, styleIndex: baseStyleIndex };

  const xfTags = cellXfsMatch[0].match(XF_XML_REGEX) ?? [];
  const baseStyleXml = xfTags[baseStyleIndex];
  if (!baseStyleXml) return { xml: stylesXml, styleIndex: baseStyleIndex };

  let nextStylesXml = stylesXml;
  const baseFontId = Number(parseAttributes(baseStyleXml.match(/^<xf\b[^>]*>/i)?.[0] ?? "").get("fontId") ?? "0");
  const fontResult = addFontSize(nextStylesXml, Number.isFinite(baseFontId) ? baseFontId : 0, 9);
  nextStylesXml = fontResult.xml;

  const nextCellXfsMatch = nextStylesXml.match(/<cellXfs\b[^>]*>[\s\S]*?<\/cellXfs>/i);
  if (!nextCellXfsMatch?.[0]) return { xml: nextStylesXml, styleIndex: baseStyleIndex };
  const nextXfTags = nextCellXfsMatch[0].match(XF_XML_REGEX) ?? [];
  const nextStyleIndex = nextXfTags.length;
  const nextStyleXml = buildLeftIndentStyleXml(baseStyleXml, fontResult.fontIndex);
  const nextCellXfs = nextCellXfsMatch[0]
    .replace(/<cellXfs\b[^>]*>/i, (tag) => setXmlAttribute(tag, "count", String(nextStyleIndex + 1)))
    .replace(/<\/cellXfs>\s*$/i, `${nextStyleXml}</cellXfs>`);

  return {
    xml: `${nextStylesXml.slice(0, nextCellXfsMatch.index)}${nextCellXfs}${nextStylesXml.slice((nextCellXfsMatch.index ?? 0) + nextCellXfsMatch[0].length)}`,
    styleIndex: nextStyleIndex,
  };
}

async function createLeftIndentStyleWriter(zip: JSZip) {
  const stylesFile = zip.file("xl/styles.xml");
  let stylesXml = await stylesFile?.async("string");
  const styleCache = new Map<number, number>();

  const ensure = (baseStyleIndex: number | null) => {
    if (!stylesFile || !stylesXml || baseStyleIndex === null) return baseStyleIndex;
    const cached = styleCache.get(baseStyleIndex);
    if (cached !== undefined) return cached;
    const result = addLeftIndentStyle(stylesXml, baseStyleIndex);
    stylesXml = result.xml;
    styleCache.set(baseStyleIndex, result.styleIndex);
    return result.styleIndex;
  };

  const save = () => {
    if (!stylesFile || !stylesXml || styleCache.size === 0) return;
    zip.file("xl/styles.xml", stylesXml);
  };

  return { ensure, save };
}

function parseAttributes(xml: string) {
  const attrs = new Map<string, string>();
  const attrRegex = /([\w:]+)="([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = attrRegex.exec(xml))) {
    attrs.set(match[1], match[2]);
  }
  return attrs;
}

function normalizeZipPath(basePath: string, target: string) {
  const normalizedTarget = target.startsWith("/") ? target.slice(1) : target;
  if (normalizedTarget.startsWith("xl/")) return normalizedTarget;
  const baseDir = basePath.includes("/") ? basePath.slice(0, basePath.lastIndexOf("/") + 1) : "";
  return `${baseDir}${normalizedTarget}`.replace(/\/\.\//g, "/");
}

async function getFirstVisibleWorksheet(zip: JSZip) {
  const workbookXml = await zip.file("xl/workbook.xml")?.async("string");
  const relsXml = await zip.file("xl/_rels/workbook.xml.rels")?.async("string");
  if (!workbookXml || !relsXml) throw new Error("La plantilla Excel no tiene workbook.xml valido.");

  const rels = new Map<string, string>();
  const relRegex = /<Relationship\b[^>]*>/g;
  for (const rel of relsXml.match(relRegex) ?? []) {
    const attrs = parseAttributes(rel);
    const id = attrs.get("Id");
    const target = attrs.get("Target");
    if (id && target) rels.set(id, normalizeZipPath("xl/workbook.xml", target));
  }

  const sheetRegex = /<sheet\b[^>]*>/g;
  for (const sheet of workbookXml.match(sheetRegex) ?? []) {
    const attrs = parseAttributes(sheet);
    if (attrs.get("state") === "hidden" || attrs.get("state") === "veryHidden") continue;
    const name = attrs.get("name");
    const relId = attrs.get("r:id");
    const path = relId ? rels.get(relId) : undefined;
    if (name && path) return { name, path };
  }
  throw new Error("La plantilla Excel no tiene hojas visibles.");
}

function a1CellFromRange(range: string) {
  const cell = range.includes("!") ? range.slice(range.lastIndexOf("!") + 1) : range;
  return cell.replace(/\$/g, "");
}

function setXmlAttribute(tag: string, name: string, value: string) {
  const attrRegex = new RegExp(`\\s${name}="[^"]*"`, "i");
  if (attrRegex.test(tag)) return tag.replace(attrRegex, ` ${name}="${xmlEscape(value)}"`);
  return tag.replace(/\/?>$/, (end) => ` ${name}="${xmlEscape(value)}"${end}`);
}

function removeXmlAttribute(tag: string, name: string) {
  return tag.replace(new RegExp(`\\s${name}="[^"]*"`, "gi"), "");
}

function ensureWorksheetPageMargins(xml: string, topCm = 2, horizontalCm = 0.8, bottomCm = 1) {
  const marginAttrs = [
    `left="${(horizontalCm / 2.54).toFixed(12)}"`,
    `right="${(horizontalCm / 2.54).toFixed(12)}"`,
    `top="${(topCm / 2.54).toFixed(12)}"`,
    `bottom="${(bottomCm / 2.54).toFixed(12)}"`,
    `header="0"`,
    `footer="0"`,
  ].join(" ");
  const marginsTag = `<pageMargins ${marginAttrs}/>`;
  if (/<pageMargins\b[^>]*(?:\/>|>[\s\S]*?<\/pageMargins>)/i.test(xml)) {
    return xml.replace(/<pageMargins\b[^>]*(?:\/>|>[\s\S]*?<\/pageMargins>)/i, marginsTag);
  }
  if (/<pageSetup\b/i.test(xml)) {
    return xml.replace(/<pageSetup\b/i, `${marginsTag}<pageSetup`);
  }
  return xml.replace(/<\/worksheet>$/i, `${marginsTag}</worksheet>`);
}

function ensureWorksheetFitToPagePr(xml: string) {
  const pageSetupPrTag = '<pageSetUpPr fitToPage="1"/>';
  if (/<pageSetUpPr\b[^>]*(?:\/>|>[\s\S]*?<\/pageSetUpPr>)/i.test(xml)) {
    return xml.replace(
      /<pageSetUpPr\b[^>]*(?:\/>|>[\s\S]*?<\/pageSetUpPr>)/i,
      (tag) => setXmlAttribute(tag, "fitToPage", "1"),
    );
  }
  if (/<sheetPr\b[^>]*\/>/i.test(xml)) {
    return xml.replace(/<sheetPr\b[^>]*\/>/i, (tag) => `${tag.replace(/\/>\s*$/i, ">")}${pageSetupPrTag}</sheetPr>`);
  }
  if (/<sheetPr\b[^>]*>[\s\S]*?<\/sheetPr>/i.test(xml)) {
    return xml.replace(/<\/sheetPr>/i, `${pageSetupPrTag}</sheetPr>`);
  }
  if (/<dimension\b/i.test(xml)) {
    return xml.replace(/<dimension\b/i, `<sheetPr>${pageSetupPrTag}</sheetPr><dimension`);
  }
  return xml.replace(/<worksheet\b[^>]*>/i, (tag) => `${tag}<sheetPr>${pageSetupPrTag}</sheetPr>`);
}

function ensureWorksheetPrintSetup(
  xml: string,
  scale = 83,
  orientation?: "landscape" | "portrait",
  forceScale = false,
  paperSize = "9",
  fitToPageWidth = false,
) {
  let nextXml = fitToPageWidth ? ensureWorksheetFitToPagePr(xml) : xml;
  const setupRegex = /<pageSetup\b[^>]*(?:\/>|>[\s\S]*?<\/pageSetup>)/i;
  if (setupRegex.test(nextXml)) {
    return nextXml.replace(setupRegex, (tag) => {
      if (fitToPageWidth) {
        const withoutScale = removeXmlAttribute(tag, "scale");
        const withPaper = setXmlAttribute(withoutScale, "paperSize", paperSize);
        const withFit = setXmlAttribute(setXmlAttribute(withPaper, "fitToWidth", "1"), "fitToHeight", "0");
        return orientation ? setXmlAttribute(withFit, "orientation", orientation) : withFit;
      }
      const attrs = parseAttributes(tag);
      const currentScale = forceScale ? NaN : Number(attrs.get("scale"));
      const nextScale = Number.isFinite(currentScale) && currentScale > 0
        ? Math.min(currentScale, scale)
        : scale;
      const withoutFit = removeXmlAttribute(removeXmlAttribute(tag, "fitToWidth"), "fitToHeight");
      const withScale = setXmlAttribute(setXmlAttribute(withoutFit, "scale", String(nextScale)), "paperSize", paperSize);
      return orientation ? setXmlAttribute(withScale, "orientation", orientation) : withScale;
    });
  }

  const orientationAttr = orientation ? ` orientation="${orientation}"` : "";
  const pageSetup = fitToPageWidth
    ? `<pageSetup paperSize="${xmlEscape(paperSize)}" fitToWidth="1" fitToHeight="0"${orientationAttr}/>`
    : `<pageSetup paperSize="${xmlEscape(paperSize)}" scale="${scale}"${orientationAttr}/>`;
  if (/<pageMargins\b/i.test(nextXml)) {
    return nextXml.replace(/(<pageMargins\b[^>]*(?:\/>|>[\s\S]*?<\/pageMargins>))/i, `$1${pageSetup}`);
  }
  return nextXml.replace(/<\/worksheet>$/i, `${pageSetup}</worksheet>`);
}

function printableScaleForDocument(tipoDocumento: ReportDocumentType) {
  return tipoDocumento === "nomina" ? 93 : 83;
}

function printableTopMarginForDocument(tipoDocumento: ReportDocumentType) {
  return tipoDocumento === "nomina" ? 1 : 2;
}

function mergeRangeExists(xml: string, range: string) {
  const normalizedRange = range.toUpperCase();
  for (const merge of xml.match(/<mergeCell\b[^>]*>/g) ?? []) {
    if ((parseAttributes(merge).get("ref") || "").toUpperCase() === normalizedRange) return true;
  }
  return false;
}

function addWorksheetMergeRange(xml: string, range: string) {
  if (mergeRangeExists(xml, range)) return xml;

  const mergeCell = `<mergeCell ref="${xmlEscape(range.toUpperCase())}"/>`;
  const mergeCellsRegex = /<mergeCells\b[^>]*>[\s\S]*?<\/mergeCells>/i;
  const mergeCellsMatch = xml.match(mergeCellsRegex);
  if (mergeCellsMatch?.[0]) {
    const currentCount = mergeCellsMatch[0].match(/<mergeCell\b[^>]*>/g)?.length ?? 0;
    const nextMergeCells = mergeCellsMatch[0]
      .replace(/<mergeCells\b[^>]*>/i, (tag) => setXmlAttribute(tag, "count", String(currentCount + 1)))
      .replace(/<\/mergeCells>\s*$/i, `${mergeCell}</mergeCells>`);
    return `${xml.slice(0, mergeCellsMatch.index)}${nextMergeCells}${xml.slice((mergeCellsMatch.index ?? 0) + mergeCellsMatch[0].length)}`;
  }

  const mergeCells = `<mergeCells count="1">${mergeCell}</mergeCells>`;
  if (/<\/sheetData>/i.test(xml)) {
    return xml.replace(/<\/sheetData>/i, `</sheetData>${mergeCells}`);
  }
  return xml.replace(/<\/worksheet>$/i, `${mergeCells}</worksheet>`);
}

function retiredStudentMergeRange(cell: string) {
  const { column, row } = cellParts(cell);
  if (column === "X") return `X${row}:AB${row}`;
  return `L${row}:Q${row}`;
}

function retiredStudentMergeCells(cell: string) {
  const { column, row } = cellParts(cell);
  if (column === "X") return ["X", "Y", "Z", "AA", "AB"].map((mergeColumn) => `${mergeColumn}${row}`);
  return ["L", "M", "N", "O", "P", "Q"].map((column) => `${column}${row}`);
}

function colTag(attrs: Map<string, string>) {
  return `<col${Array.from(attrs.entries()).map(([key, value]) => ` ${key}="${xmlEscape(value)}"`).join("")}/>`;
}

function columnWidth(xml: string, column: number) {
  for (const tag of xml.match(/<col\b[^>]*\/>/g) ?? []) {
    const attrs = parseAttributes(tag);
    const min = Number(attrs.get("min"));
    const max = Number(attrs.get("max"));
    if (column >= min && column <= max) {
      const width = Number(attrs.get("width"));
      return Number.isFinite(width) && width > 0 ? width : 8.43;
    }
  }
  return 8.43;
}

function setColumnWidth(xml: string, column: number, width: number) {
  const colRegex = /<col\b[^>]*\/>/g;
  let match: RegExpExecArray | null;
  while ((match = colRegex.exec(xml))) {
    const attrs = parseAttributes(match[0]);
    const min = Number(attrs.get("min"));
    const max = Number(attrs.get("max"));
    if (column < min || column > max) continue;

    const replacement: string[] = [];
    if (min < column) {
      const before = new Map(attrs);
      before.set("max", String(column - 1));
      replacement.push(colTag(before));
    }

    const current = new Map(attrs);
    current.set("min", String(column));
    current.set("max", String(column));
    current.set("width", width.toFixed(2).replace(/\.?0+$/, ""));
    current.set("customWidth", "1");
    current.delete("bestFit");
    replacement.push(colTag(current));

    if (column < max) {
      const after = new Map(attrs);
      after.set("min", String(column + 1));
      replacement.push(colTag(after));
    }

    return `${xml.slice(0, match.index)}${replacement.join("")}${xml.slice(match.index + match[0].length)}`;
  }

  const newCol = `<col min="${column}" max="${column}" width="${width.toFixed(2).replace(/\.?0+$/, "")}" customWidth="1"/>`;
  if (/<cols>[\s\S]*?<\/cols>/.test(xml)) {
    return xml.replace(/<\/cols>/, `${newCol}</cols>`);
  }
  return xml.replace(/<sheetData\b/, `<cols>${newCol}</cols><sheetData`);
}

function programUnitHeaderColumnWidth(cell: string, value: string, currentWidth: number) {
  const { column, row } = cellParts(cell);
  const currentColumn = columnIndex(column);
  const isProgramUnitHeader = (row === 6 || row === 35)
    && currentColumn >= columnIndex("X")
    && currentColumn <= columnIndex("AG");
  if (!isProgramUnitHeader) return null;

  const normalized = cleanText(value);
  if (!normalized) return currentWidth;
  const longestWord = normalized.split(/\s+/).reduce((max, word) => Math.max(max, word.length), 0);
  const pressure = Math.max(
    0,
    (normalized.length - 68) / 48,
    (longestWord - 16) / 10,
  );
  if (pressure <= 0) return currentWidth;

  const extraWidth = Math.min(1.2, pressure * 0.7);
  return Math.min(5.9, Math.max(currentWidth, currentWidth + extraWidth));
}

function adjustProgramUnitHeaderColumns(xml: string, textUpdates: Array<{ cell: string; value: string }>) {
  let nextXml = xml;
  for (const update of textUpdates) {
    const { column } = cellParts(update.cell);
    const columnNumber = columnIndex(column);
    const currentWidth = columnWidth(nextXml, columnNumber);
    const nextWidth = programUnitHeaderColumnWidth(update.cell, update.value, currentWidth);
    if (nextWidth !== null && nextWidth > currentWidth + 0.05) {
      nextXml = setColumnWidth(nextXml, columnNumber, nextWidth);
    }
  }
  return nextXml;
}

function normalizeProgramaActaStudentStyles(xml: string) {
  const columns = ["B", "F", "X", "Y", "Z", "AA", "AB", "AC", "AF", "AG", "AH", "AI", "AJ", "AK", "AM", "AO"];
  let nextXml = xml;
  for (const column of columns) {
    const sourceStyle = getCellStyle(nextXml, `${column}14`);
    if (sourceStyle === null) continue;
    for (let row = 24; row <= 33; row += 1) {
      nextXml = setCellStyle(nextXml, `${column}${row}`, sourceStyle);
    }
  }
  return nextXml;
}

async function createSharedStringWriter(zip: JSZip) {
  const sharedStringsFile = zip.file("xl/sharedStrings.xml");
  const originalXml = await sharedStringsFile?.async("string");
  if (!sharedStringsFile || !originalXml) {
    return {
      add: undefined as SharedStringWriter | undefined,
      save: () => undefined,
    };
  }

  const existingCount = (originalXml.match(/<si\b/g) ?? []).length;
  const sstTag = originalXml.match(/<sst\b[^>]*>/i)?.[0] ?? "";
  const count = Number(parseAttributes(sstTag).get("count") ?? existingCount);
  const uniqueCount = Number(parseAttributes(sstTag).get("uniqueCount") ?? existingCount);
  const additions: string[] = [];

  const add: SharedStringWriter = (value: string) => {
    const space = /^\s|\s$|\n/.test(value) ? ' xml:space="preserve"' : "";
    additions.push(`<si><t${space}>${xmlEscape(value)}</t></si>`);
    return existingCount + additions.length - 1;
  };

  const save = () => {
    if (additions.length === 0) return;
    const nextXml = originalXml
      .replace(/<sst\b[^>]*>/i, (tag: string) =>
        setXmlAttribute(
          setXmlAttribute(tag, "count", String(count + additions.length)),
          "uniqueCount",
          String(uniqueCount + additions.length),
        ),
      )
      .replace(/<\/sst>\s*$/i, `${additions.join("")}</sst>`);
    zip.file("xl/sharedStrings.xml", nextXml);
  };

  return { add, save };
}

async function applyExcelUpdates(
  templateBuffer: Buffer,
  updates: SpreadsheetUpdate[],
  printScale = 83,
  topMarginCm = 2,
  normalizeProgramaStyles = false,
  horizontalMarginCm = 0.8,
  bottomMarginCm = 1,
  printOrientation?: "landscape" | "portrait",
  forcePrintScale = false,
  paperSize = "9",
  fitToPageWidth = false,
  adjustProgramUnitHeaders = false,
  preservePageLayout = false,
) {
  const zip = await JSZip.loadAsync(templateBuffer);
  const worksheet = await getFirstVisibleWorksheet(zip);
  const sharedStrings = await createSharedStringWriter(zip);
  const leftIndentStyles = await createLeftIndentStyleWriter(zip);
  const sheetFile = zip.file(worksheet.path);
  const originalXml = await sheetFile?.async("string");
  if (!sheetFile || !originalXml) throw new Error(`No se pudo leer la hoja ${worksheet.path}.`);

  let nextXml = originalXml;
  const textUpdates: Array<{ cell: string; value: string }> = [];
  const leftIndentCells: string[] = [];
  for (const update of updates) {
    const cell = a1CellFromRange(update.range);
    const value = update.values[0]?.[0] ?? "";
    nextXml = setSheetCellValue(nextXml, cell, value, sharedStrings.add);
    if (typeof value === "string" && cleanText(value)) {
      textUpdates.push({ cell, value });
      if (normalizeText(value) === "retirado por inasistencia") {
        leftIndentCells.push(cell);
      }
    }
  }
  for (const cell of leftIndentCells) {
    const baseStyle = getCellStyle(nextXml, cell);
    const leftIndentStyle = leftIndentStyles.ensure(baseStyle);
    if (leftIndentStyle !== null) {
      for (const mergeCell of retiredStudentMergeCells(cell)) {
        nextXml = setCellStyle(nextXml, mergeCell, leftIndentStyle);
      }
    }
    nextXml = addWorksheetMergeRange(nextXml, retiredStudentMergeRange(cell));
  }
  if (adjustProgramUnitHeaders) {
    nextXml = adjustProgramUnitHeaderColumns(nextXml, textUpdates);
  }
  if (normalizeProgramaStyles) {
    nextXml = normalizeProgramaActaStudentStyles(nextXml);
  }
  nextXml = ensureWorksheetPageMargins(nextXml, topMarginCm, horizontalMarginCm, bottomMarginCm);
  if (!preservePageLayout) {
    nextXml = ensureWorksheetPrintSetup(nextXml, printScale, printOrientation, forcePrintScale, paperSize, fitToPageWidth);
  }
  zip.file(worksheet.path, nextXml);
  sharedStrings.save();
  leftIndentStyles.save();
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

function officeBinaryCandidates() {
  return [
    String(process.env.REPORTES_OFFICE_BIN || "").trim(),
    "soffice",
    "libreoffice",
    "openoffice",
    "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
    "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
    "C:\\Program Files\\OpenOffice 4\\program\\soffice.exe",
    "C:\\Program Files (x86)\\OpenOffice 4\\program\\soffice.exe",
  ].filter(Boolean);
}

function reportesOfficeConverterUrl() {
  return String(process.env.REPORTES_OFFICE_CONVERTER_URL || "").trim().replace(/\/+$/, "");
}

function reportesOfficeConverterUsesIam() {
  return ["1", "true", "yes", "on"].includes(
    String(process.env.REPORTES_OFFICE_CONVERTER_IAM || "").trim().toLowerCase(),
  );
}

function reportesPdfProvider(input?: unknown): ReportPdfProvider {
  const value = String(input || process.env.REPORTES_PDF_PROVIDER || "office").trim().toLowerCase();
  if (value === "google" || value === "drive" || value === "sheets") return "google";
  if (value === "auto") return "auto";
  return "office";
}

function reportesGoogleKeepTempFile() {
  return ["1", "true", "yes", "on"].includes(
    String(process.env.REPORTES_GOOGLE_KEEP_TEMP || "").trim().toLowerCase(),
  );
}

function reportesGoogleDriveFolderId() {
  return String(process.env.REPORTES_GOOGLE_DRIVE_FOLDER_ID || "").trim();
}

function getReportesGoogleAuth(scopes: string[]) {
  const clientEmail = String(process.env.GOOGLE_CLIENT_EMAIL || "").trim();
  const privateKey = String(process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  const subject = String(process.env.REPORTES_GOOGLE_SUBJECT_EMAIL || "").trim();

  if (!clientEmail || !privateKey) {
    throw new Error("Faltan GOOGLE_CLIENT_EMAIL o GOOGLE_PRIVATE_KEY para convertir reportes con Google Drive/Sheets.");
  }

  return new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes,
    subject: subject || undefined,
  });
}

async function getIdentityToken(audience: string) {
  const metadataUrl = `http://metadata/computeMetadata/v1/instance/service-accounts/default/identity?audience=${encodeURIComponent(audience)}`;
  const response = await fetch(metadataUrl, {
    headers: { "Metadata-Flavor": "Google" },
  });
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`No se pudo obtener identity token para Cloud Run. HTTP ${response.status}: ${message}`);
  }
  return response.text();
}

async function convertXlsxToPdfWithService(xlsxBuffer: Buffer, baseName: string, converterUrl: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "X-Report-Name": baseName,
  };
  const token = String(process.env.REPORTES_OFFICE_CONVERTER_TOKEN || "").trim();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else if (reportesOfficeConverterUsesIam()) {
    headers.Authorization = `Bearer ${await getIdentityToken(converterUrl)}`;
  }

  const response = await fetch(`${converterUrl}/convert`, {
    method: "POST",
    headers,
    body: xlsxBuffer as unknown as BodyInit,
  });
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`No se pudo convertir el Excel a PDF en Cloud Run. HTTP ${response.status}: ${message}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function cleanupGoogleTempFile(drive: drive_v3.Drive, fileId: string) {
  if (reportesGoogleKeepTempFile()) return;
  try {
    await drive.files.delete({
      fileId,
      supportsAllDrives: true,
    });
  } catch (error) {
    console.warn("No se pudo eliminar el archivo temporal de Google Drive.", {
      fileId,
      message: String((error as { message?: string } | null)?.message || error),
    });
  }
}

async function exportGoogleSpreadsheetToPdf(auth: InstanceType<typeof google.auth.JWT>, fileId: string) {
  const credentials = await auth.authorize();
  const accessToken = credentials.access_token;
  if (!accessToken) throw new Error("Google no devolvio access token para exportar el PDF.");

  const params = new URLSearchParams({
    format: "pdf",
    size: "A4",
    portrait: "false",
    fitw: "false",
    scale: "1",
    top_margin: (2 / 2.54).toFixed(12),
    bottom_margin: (1 / 2.54).toFixed(12),
    left_margin: (0.8 / 2.54).toFixed(12),
    right_margin: (0.8 / 2.54).toFixed(12),
    sheetnames: "false",
    printtitle: "false",
    pagenumbers: "false",
    gridlines: "false",
    fzr: "false",
  });

  const response = await fetch(`https://docs.google.com/spreadsheets/d/${encodeURIComponent(fileId)}/export?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`Google Sheets no pudo exportar el PDF. HTTP ${response.status}: ${message}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/pdf")) {
    const message = await response.text().catch(() => "");
    throw new Error(`Google Sheets devolvio un contenido que no es PDF (${contentType}). ${message.slice(0, 500)}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function convertXlsxToPdfWithGoogle(xlsxBuffer: Buffer, baseName: string) {
  const auth = getReportesGoogleAuth(["https://www.googleapis.com/auth/drive"]);
  const drive = google.drive({ version: "v3", auth });
  const folderId = reportesGoogleDriveFolderId();
  let fileId = "";

  try {
    const requestBody: drive_v3.Schema$File = {
      name: `${baseName}.xlsx`,
      mimeType: "application/vnd.google-apps.spreadsheet",
    };
    if (folderId) requestBody.parents = [folderId];

    const created = await drive.files.create({
      requestBody,
      media: {
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        body: Readable.from(xlsxBuffer),
      },
      fields: "id",
      supportsAllDrives: true,
    });

    fileId = String(created.data.id || "");
    if (!fileId) throw new Error("Google Drive no devolvio el id del archivo temporal.");

    return await exportGoogleSpreadsheetToPdf(auth, fileId);
  } catch (error) {
    throw new Error(`No se pudo convertir el Excel a PDF con Google Drive/Sheets. ${String((error as { message?: string } | null)?.message || error)}`);
  } finally {
    if (fileId) await cleanupGoogleTempFile(drive, fileId);
  }
}

async function convertXlsxToPdfWithOffice(xlsxBuffer: Buffer, baseName: string) {
  const converterUrl = reportesOfficeConverterUrl();
  if (converterUrl) {
    return convertXlsxToPdfWithService(xlsxBuffer, baseName, converterUrl);
  }

  const dir = await mkdtemp(join(tmpdir(), "reportes-"));
  const xlsxPath = join(dir, `${baseName}.xlsx`);
  const pdfPath = join(dir, `${baseName}.pdf`);
  await writeFile(xlsxPath, xlsxBuffer);

  const errors: string[] = [];
  try {
    for (const binary of officeBinaryCandidates()) {
      try {
        await execFileAsync(binary, [
          "--headless",
          "--convert-to",
          "pdf",
          "--outdir",
          dir,
          xlsxPath,
        ], { timeout: 180000 });
        return await readFile(pdfPath);
      } catch (error) {
        errors.push(`${basename(binary)}: ${String((error as { message?: string } | null)?.message || error)}`);
      }
    }
    throw new Error(`No se pudo convertir el Excel a PDF con LibreOffice/OpenOffice. ${errors.join(" | ")}`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function convertXlsxToPdf(xlsxBuffer: Buffer, baseName: string, providerInput?: unknown) {
  const provider = reportesPdfProvider(providerInput);
  if (provider === "google") {
    return convertXlsxToPdfWithGoogle(xlsxBuffer, baseName);
  }
  if (provider === "auto") {
    try {
      return await convertXlsxToPdfWithGoogle(xlsxBuffer, baseName);
    } catch (error) {
      console.warn("Fallo Google Drive/Sheets para PDF; se usara Office.", {
        message: String((error as { message?: string } | null)?.message || error),
      });
      return convertXlsxToPdfWithOffice(xlsxBuffer, baseName);
    }
  }
  return convertXlsxToPdfWithOffice(xlsxBuffer, baseName);
}

function unidadPromedioMap(data: ReporteDocumentoData) {
  const map = new Map<string, number | null>();
  for (const promedio of data.promediosUnidad) {
    if (!promedio.unidadDidacticaId) continue;
    map.set(`${promedio.matriculaId}:${promedio.unidadDidacticaId}`, promedio.promedio ?? null);
  }
  return map;
}

function capacidadPromedioMap(data: ReporteDocumentoData) {
  const map = new Map<string, number | null>();
  for (const promedio of data.promediosCapacidad) {
    if (!promedio.capacidadTerminalId) continue;
    map.set(`${promedio.matriculaId}:${promedio.capacidadTerminalId}`, promedio.promedio ?? null);
  }
  return map;
}

function efsrtPromedioMap(data: ReporteDocumentoData) {
  const map = new Map<number, number | null>();
  for (const promedio of data.promediosEfsrt) {
    map.set(promedio.moduloEstudianteId, promedio.promedioFinal ?? null);
  }
  return map;
}

function fillInstitutionHeader(updates: SpreadsheetUpdate[], sheetName: string, data: ReporteDocumentoData, mode: ReportDocumentType) {
  const datos = dataHelpers.datosGenerales;
  const carrera = getCarreraName(data.grupoModulo);
  const modulo = getModuloDocumentName(data.grupoModulo).toLocaleUpperCase("es-PE");
  const docente = getPersonalName(data.grupoModulo.grupo?.personal);
  const director = getPersonalName(data.semestre?.director);
  const coordinador = getPersonalName(data.semestre?.coordinador1);
  const distrito = cleanText(datos.distrito || "San Martin de Porres");
  const inicio = data.grupoModulo.inicio || data.semestre?.inicio || null;
  const fin = data.grupoModulo.fin || data.semestre?.fin || null;
  const turno = cleanText(data.grupoModulo.grupo?.turno?.nombre || data.grupoModulo.grupo?.turnoNombre || "");
  const nivel = cleanText(data.grupoModulo.modulo?.plan?.carrera?.nivel || "");
  const semestre = cleanText(data.semestre?.titulo || data.grupoModulo.grupo?.semestre?.titulo || "");
  const resolucion = cleanText(datos.rd || "");
  const horas = data.grupoModulo.modulo?.horas ?? "";
  const creditos = data.grupoModulo.modulo?.creditos ?? "";

  if (mode === "nomina") {
    if (!data.opcionOcupacional) {
      addCell(updates, sheetName, "A11", "PLAN DE ESTUDIO");
      addCell(updates, sheetName, "Y7", "NUMERO DOCUMENTO");
    }
    addCell(updates, sheetName, "F12", modulo);
    addCell(updates, sheetName, "AB12", formatPlanResolucion(data.grupoModulo.modulo?.plan));
    addCell(updates, sheetName, "R11", carrera.toLocaleUpperCase("es-PE"));
    addCell(updates, sheetName, "AJ12", nivel ? nivel.replace(/\s+/g, "\n").toLocaleUpperCase("es-PE") : "");
    addCell(updates, sheetName, "I13", formatDate(inicio));
    addCell(updates, sheetName, "T13", formatDate(fin));
    addCell(updates, sheetName, "Y13", horas);
    addCell(updates, sheetName, "AD13", turno);
    addCell(updates, sheetName, "AJ13", data.seccion);
    addCell(updates, sheetName, "T54", coordinador);
    addCell(updates, sheetName, "AC54", director);
    return;
  }

  if (data.opcionOcupacional) {
    addCell(updates, sheetName, "Y6", carrera.toLocaleUpperCase("es-PE"));
    addCell(updates, sheetName, "AE7", nivel.toLocaleUpperCase("es-PE"));
    addCell(updates, sheetName, "AE8", modulo);
    addCell(updates, sheetName, "Z11", resolucion);
    addCell(updates, sheetName, "AF12", turno);
    addCell(updates, sheetName, "AF13", data.seccion);
    addCell(updates, sheetName, "AF14", formatHoras(horas));
    addCell(updates, sheetName, "AF15", formatDate(inicio));
    addCell(updates, sheetName, "AJ15", formatDate(fin));
    addCell(updates, sheetName, "B67", modulo);
    addCell(updates, sheetName, "J67", docente);
    addCell(updates, sheetName, "C77", `${distrito}, ${formatDateLong()}`);
    addCell(updates, sheetName, "L78", docente);
    addCell(updates, sheetName, "W78", director);
    return;
  }

  addCell(updates, sheetName, "AO7", nivel.toLocaleUpperCase("es-PE"));
  addCell(updates, sheetName, "AO8", semestre);
  addCell(updates, sheetName, "AO9", data.seccion);
  addCell(updates, sheetName, "AO10", turno);
  addCell(updates, sheetName, "AO11", formatDate(inicio));
  addCell(updates, sheetName, "AO12", formatDate(fin));
  addCell(updates, sheetName, "W41", creditos);
  addCell(updates, sheetName, "W42", horas);
  addCell(updates, sheetName, "AG12", data.grupoModulo.modulo?.creditosEfsrt ?? "");
  addCell(updates, sheetName, "AG13", data.grupoModulo.modulo?.duracionEfsrt ?? "");
  addCell(updates, sheetName, "AG41", data.grupoModulo.modulo?.creditosEfsrt ?? "");
  addCell(updates, sheetName, "AG42", data.grupoModulo.modulo?.duracionEfsrt ?? "");
  addCell(updates, sheetName, "AA70", `${distrito}, ${formatDateLong()}`);
  addCell(updates, sheetName, "C74", director ? `LIC. ${director}\nDIRECTOR` : "LIC. \nDIRECTOR");
  addCell(updates, sheetName, "R74", coordinador ? `LIC. ${coordinador}\nCOORDINADORA` : "LIC. \nCOORDINADORA");
  addCell(updates, sheetName, "AI74", docente ? `LIC. ${docente}` : "LIC. ");
}

const dataHelpers: { datosGenerales: Awaited<ReturnType<typeof getDatosGeneralesGlobales>> } = {
  datosGenerales: {} as Awaited<ReturnType<typeof getDatosGeneralesGlobales>>,
};

function fillNomina(updates: SpreadsheetUpdate[], sheetName: string, data: ReporteDocumentoData) {
  fillInstitutionHeader(updates, sheetName, data, "nomina");
  const students = data.estudiantes.slice(0, 30);
  const isPlanEstudios = !data.opcionOcupacional;
  if (isPlanEstudios) {
    addCell(updates, sheetName, "B14", "Documento");
    addCell(updates, sheetName, "B15", "Identidad");
  }
  let men = 0;
  let women = 0;
  students.forEach((student, index) => {
    const row = 16 + index;
    const sex = studentSex(student);
    if (sex === "M") men += 1;
    if (sex === "F") women += 1;
    addCell(updates, sheetName, `A${row}`, index + 1);
    addCell(updates, sheetName, `B${row}`, isPlanEstudios ? student.matricula?.user?.dni || "" : student.matricula?.codigoInscripcion || "");
    addCell(updates, sheetName, `O${row}`, getStudentName(student));
    addCell(updates, sheetName, `AE${row}`, sex);
    addCell(updates, sheetName, `AG${row}`, calculateAge(student.matricula?.user?.fechaNacimiento));
    addCell(updates, sheetName, `AI${row}`, "G");
  });
  addCell(updates, sheetName, "A49", men);
  addCell(updates, sheetName, "E49", women);
  addCell(updates, sheetName, "M49", students.length);
  addCell(updates, sheetName, "R49", students.length);
  addCell(updates, sheetName, "V49", "");
  addCell(updates, sheetName, "W49", "");
  addCell(updates, sheetName, "Y49", students.length);
  addCell(updates, sheetName, "E51", `S.M.P., ${formatDateLong()}`);
}

function fillProgramaActa(updates: SpreadsheetUpdate[], sheetName: string, data: ReporteDocumentoData) {
  fillInstitutionHeader(updates, sheetName, data, "acta");
  const unitColumns = ["X", "Y", "Z", "AA", "AB", "AC"];
  const unitMap = unidadPromedioMap(data);
  const efsrtMap = efsrtPromedioMap(data);
  const units = data.unidades.slice(0, unitColumns.length);
  const clearStudentRow = (row: number) => {
    ["A", "B", "F", ...unitColumns, "AF", "AG", "AH", "AI", "AJ", "AK", "AM", "AO"].forEach((column) => {
      addCell(updates, sheetName, `${column}${row}`, "");
    });
  };

  units.forEach((unit, index) => {
    const column = unitColumns[index];
    addCell(updates, sheetName, `${column}6`, cleanText(unit.sigla || unit.nombre || ""));
    addCell(updates, sheetName, `${column}12`, unit.creditos ?? "");
    addCell(updates, sheetName, `${column}13`, unit.duracion ?? "");
    addCell(updates, sheetName, `${column}35`, cleanText(unit.sigla || unit.nombre || ""));
    addCell(updates, sheetName, `${column}41`, unit.creditos ?? "");
    addCell(updates, sheetName, `${column}42`, unit.duracion ?? "");
  });

  const students = data.estudiantes.slice(0, 40);
  students.forEach((student, index) => {
    const row = index < 20 ? 14 + index : 43 + (index - 20);
    addCell(updates, sheetName, `A${row}`, index + 1);
    addCell(updates, sheetName, `B${row}`, student.matricula?.user?.dni || student.matricula?.codigoInscripcion || "");
    addCell(updates, sheetName, `F${row}`, getStudentName(student));
    const efsrt = efsrtMap.get(student.id);
    const unitGrades = units.map((unit) => unitMap.get(`${student.matriculaId}:${unit.id}`));
    const hasUnitGrades = unitGrades.some((grade) => typeof grade === "number" && Number.isFinite(grade));
    const hasEfsrtGrade = typeof efsrt === "number" && Number.isFinite(efsrt);
    const hasAnyGrade = hasUnitGrades || hasEfsrtGrade;
    units.forEach((_unit, unitIndex) => {
      const column = unitColumns[unitIndex];
      if (!hasAnyGrade && unitIndex === 0) {
        addCell(updates, sheetName, `${column}${row}`, "RETIRADO POR INASISTENCIA");
        return;
      }
      addCell(updates, sheetName, `${column}${row}`, hasAnyGrade ? formatGrade(unitGrades[unitIndex]) : "");
    });
    addCell(updates, sheetName, `AF${row}`, "");
    addCell(updates, sheetName, `AG${row}`, "");
    addCell(updates, sheetName, `AH${row}`, hasAnyGrade ? formatGrade(efsrt) : "");
    const approvedUnits = units.filter((unit) => {
      const value = unitMap.get(`${student.matriculaId}:${unit.id}`);
      return typeof value === "number" && value >= 13;
    }).length;
    const disapprovedUnits = units.filter((unit) => {
      const value = unitMap.get(`${student.matriculaId}:${unit.id}`);
      return typeof value === "number" && value < 13;
    }).length;
    addCell(updates, sheetName, `AI${row}`, approvedUnits);
    addCell(updates, sheetName, `AJ${row}`, disapprovedUnits);
    const condition: string = getCondition(student.promedio);
    addCell(updates, sheetName, `AK${row}`, condition === "A" ? "X" : "");
    addCell(updates, sheetName, `AM${row}`, condition === "D" ? "X" : "");
    addCell(updates, sheetName, `AO${row}`, condition === "R" ? "X" : "");
  });

  for (let index = students.length; index < 40; index += 1) {
    const row = index < 20 ? 14 + index : 43 + (index - 20);
    clearStudentRow(row);
  }

  units.forEach((unit, unitIndex) => {
    const column = unitColumns[unitIndex];
    const values = data.estudiantes
      .map((student) => unitMap.get(`${student.matriculaId}:${unit.id}`))
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    addCell(updates, sheetName, `${column}65`, values.filter((value) => value >= 13).length);
    addCell(updates, sheetName, `${column}66`, values.filter((value) => value < 13).length);
    addCell(updates, sheetName, `${column}67`, 0);
  });
}

function fillOpcionActa(updates: SpreadsheetUpdate[], sheetName: string, data: ReporteDocumentoData) {
  fillInstitutionHeader(updates, sheetName, data, "acta");
  const capacidadColumns = ["L", "M", "N", "O", "P", "Q", "R", "S", "T", "U"];
  const capacidadMap = capacidadPromedioMap(data);
  const capacidades = data.capacidades.slice(0, capacidadColumns.length);

  capacidades.forEach((capacidad, index) => {
    const value = cleanText(capacidad.sigla || capacidad.descripcion || "");
    addCell(updates, sheetName, `${capacidadColumns[index]}7`, value);
    addCell(updates, sheetName, `${capacidadColumns[index]}41`, value);
  });

  const students = data.estudiantes.slice(0, 30);
  students.forEach((student, index) => {
    const row = index < 20 ? 19 + index : 54 + (index - 20);
    addCell(updates, sheetName, `B${row}`, index + 1);
    addCell(updates, sheetName, `C${row}`, "G");
    addCell(updates, sheetName, `D${row}`, student.matricula?.codigoInscripcion || "");
    addCell(updates, sheetName, `G${row}`, getStudentName(student));
    const notas = capacidades.map((capacidad) => capacidadMap.get(`${student.matriculaId}:${capacidad.id}`));
    const hasNotas = notas.some((nota) => typeof nota === "number" && Number.isFinite(nota));
    capacidades.forEach((_capacidad, capacidadIndex) => {
      const column = capacidadColumns[capacidadIndex];
      if (!hasNotas && capacidadIndex === 0) {
        addCell(updates, sheetName, `${column}${row}`, "RETIRADO POR INASISTENCIA");
        return;
      }
      addCell(updates, sheetName, `${column}${row}`, hasNotas ? formatGrade(notas[capacidadIndex]) : "");
    });
    addCell(updates, sheetName, `V${row}`, formatGrade(student.puntaje));
    addCell(updates, sheetName, `W${row}`, formatGrade(student.promedio));
    const condition: string = getCondition(student.promedio);
    addCell(updates, sheetName, `X${row}`, condition === "A" ? "X" : "");
    addCell(updates, sheetName, `Z${row}`, condition === "D" ? "X" : "");
    addCell(updates, sheetName, `AC${row}`, condition === "R" ? "X" : "");
  });
  addCell(updates, sheetName, "AH42", students.length);
  addCell(updates, sheetName, "AH44", students.filter((student) => getCondition(student.promedio) === "A").length);
  addCell(updates, sheetName, "AH46", students.filter((student) => getCondition(student.promedio) === "D").length);
  addCell(updates, sheetName, "AH48", 0);
}

function fillReporte(updates: SpreadsheetUpdate[], sheetName: string, tipoDocumento: ReportDocumentType, data: ReporteDocumentoData) {
  if (tipoDocumento === "nomina") {
    fillNomina(updates, sheetName, data);
  } else if (data.opcionOcupacional) {
    fillOpcionActa(updates, sheetName, data);
  } else {
    fillProgramaActa(updates, sheetName, data);
  }
}

async function buildReporteData(grupoModuloId: number) {
  const contextResponse = await dataConnect.executeGraphql<{
    grupoModulo: Pick<ReporteGrupoModuloOption, "id" | "grupoId" | "moduloId" | "grupo"> | null;
  }, { grupoModuloId: number }>(
    `query ReporteGrupoModuloSeed($grupoModuloId: Int!) {
      grupoModulo(id: $grupoModuloId) {
        id
        grupoId
        moduloId
        grupo { semestreId }
      }
    }`,
    { variables: { grupoModuloId } },
  );
  const seed = contextResponse.data.grupoModulo;
  if (!seed?.grupoId || !seed.moduloId || !seed.grupo?.semestreId) {
    throw new https.HttpsError("not-found", "No se encontro el grupo-modulo solicitado.");
  }

  const response = await dataConnect.executeGraphql<
    ReporteDetalleData & {
      grupoModulos: ReporteGrupoModuloOption[];
      semestres: ReporteSemestre[];
    },
    { grupoModuloId: number; grupoId: number; moduloId: number; semestreId: number }
  >(
    REPORTE_DETALLE_QUERY,
    {
      variables: {
        grupoModuloId,
        grupoId: seed.grupoId,
        moduloId: seed.moduloId,
        semestreId: seed.grupo.semestreId,
      },
    },
  );

  const grupoModulo = response.data.grupoModulo;
  if (!grupoModulo) throw new https.HttpsError("not-found", "No se encontro el grupo-modulo solicitado.");
  const unidadIds = buildUnidadIds(response.data);
  const unidadIdSet = new Set(unidadIds);
  const unidadesById = new Map((response.data.unidadesDidacticas ?? []).map((unidad) => [unidad.id, unidad]));
  const unidades = unidadIds
    .map((id) => unidadesById.get(id))
    .filter((unidad): unidad is ReporteUnidad => Boolean(unidad));
  const capacidades = (response.data.capacidadesTerminales ?? [])
    .filter((capacidad) => capacidad.unidadDidacticaId && unidadIdSet.has(capacidad.unidadDidacticaId))
    .sort((a, b) => a.id - b.id);
  const estudiantes = (response.data.modulosEstudiantes ?? [])
    .filter((student) => !student.matricula?.archivado)
    .sort((a, b) => getStudentName(a).localeCompare(getStudentName(b), "es", { numeric: true }));
  const matriculaIds = new Set(estudiantes.map((student) => student.matriculaId));
  const moduloEstudianteIds = new Set(estudiantes.map((student) => student.id));
  const capacidadIds = new Set(capacidades.map((capacidad) => capacidad.id));

  return {
    grupoModulo,
    semestre: response.data.semestres?.[0] ?? grupoModulo.grupo?.semestre ?? null,
    unidades,
    capacidades,
    estudiantes,
    promediosUnidad: (response.data.unidadesDidacticasEstudiantes ?? [])
      .filter((item) => item.unidadDidacticaId && unidadIdSet.has(item.unidadDidacticaId) && matriculaIds.has(item.matriculaId)),
    promediosCapacidad: (response.data.capacidadesTerminalesEstudiantes ?? [])
      .filter((item) => item.capacidadTerminalId && capacidadIds.has(item.capacidadTerminalId) && matriculaIds.has(item.matriculaId)),
    promediosEfsrt: (response.data.efsrtPppEstudiantes ?? [])
      .filter((item) => moduloEstudianteIds.has(item.moduloEstudianteId)),
    seccion: computeSection(grupoModulo, response.data.grupoModulos ?? []),
    opcionOcupacional: isOpcionOcupacional(grupoModulo.modulo?.plan?.carrera?.tipoCarrera?.nombre),
  } satisfies ReporteDocumentoData;
}

async function getGrupoModuloIdsForSemestre(semestreId: number) {
  const response = await dataConnect.executeGraphql<{
    grupoModulos: ReporteGrupoModuloOption[];
  }, { semestreId: number }>(
    `query ReporteGrupoModulosBySemestre($semestreId: Int!) {
      grupoModulos(limit: 5000) {
        id
        nombre
        orden
        grupoId
        moduloId
        grupo { semestreId turnoNombre turno { nombre } nombreDisplay }
        modulo { titulo tituloComercial }
      }
    }`,
    { variables: { semestreId } },
  );
  return (response.data.grupoModulos ?? [])
    .filter((item) => item.grupo?.semestreId === semestreId)
    .sort((a, b) =>
      turnoRank(a.grupo?.turno?.nombre || a.grupo?.turnoNombre) - turnoRank(b.grupo?.turno?.nombre || b.grupo?.turnoNombre)
      || getModuloName(a).localeCompare(getModuloName(b), "es", { numeric: true })
      || a.id - b.id,
    )
    .map((item) => item.id);
}

function selectTemplate(tipoDocumento: ReportDocumentType, reportes: ReporteDocumentoData[]) {
  if (tipoDocumento === "nomina") return TEMPLATES.nomina;
  const first = reportes[0];
  return first?.opcionOcupacional ? TEMPLATES.actaOpcion : TEMPLATES.actaPrograma;
}

function safeWorksheetName(value: string, used: Set<string>) {
  const base = cleanText(value || "Docente")
    .replace(/[:\\/?*[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 31) || "Docente";
  let name = base;
  let index = 2;
  while (used.has(name.toLocaleLowerCase("es-PE"))) {
    const suffix = ` ${index}`;
    name = `${base.slice(0, Math.max(1, 31 - suffix.length))}${suffix}`;
    index += 1;
  }
  used.add(name.toLocaleLowerCase("es-PE"));
  return name;
}

async function docenteNameByGrupoModuloId() {
  const response = await dataConnect.executeGraphql<{
    grupoModulos: ReporteGrupoModuloOption[];
  }, Record<string, never>>(
    `query ReporteGrupoModuloDocentesManual {
      grupoModulos(limit: 10000) {
        id
        grupo {
          personal {
            displayName
            user { username nombre apellidoPaterno apellidoMaterno }
          }
        }
      }
    }`,
    {},
  );
  return new Map((response.data.grupoModulos ?? []).map((item) => [item.id, getPersonalName(item.grupo?.personal) || "Docente"]));
}

async function combinePdfBuffers(buffers: Buffer[]) {
  const target = await PDFDocument.create();
  for (const buffer of buffers) {
    const source = await PDFDocument.load(buffer);
    const pages = await target.copyPages(source, source.getPageIndices());
    pages.forEach((page) => target.addPage(page));
  }
  return Buffer.from(await target.save());
}

async function combineExcelBuffers(items: Array<{ buffer: Buffer; sheetName: string }>) {
  const target = new ExcelJS.Workbook();
  const usedNames = new Set<string>();

  for (const item of items) {
    const source = new ExcelJS.Workbook();
    const arrayBuffer = item.buffer.buffer.slice(
      item.buffer.byteOffset,
      item.buffer.byteOffset + item.buffer.byteLength,
    ) as ArrayBuffer;
    await source.xlsx.load(arrayBuffer);
    const sourceSheet = source.worksheets[0];
    if (!sourceSheet) continue;

    const targetSheet = target.addWorksheet(safeWorksheetName(item.sheetName, usedNames));
    targetSheet.properties = { ...sourceSheet.properties };
    targetSheet.pageSetup = { ...sourceSheet.pageSetup };
    targetSheet.views = sourceSheet.views.map((view) => ({ ...view }));

    sourceSheet.columns.forEach((column, index) => {
      const targetColumn = targetSheet.getColumn(index + 1);
      if (column.width !== undefined) targetColumn.width = column.width;
      if (column.hidden !== undefined) targetColumn.hidden = column.hidden;
      if (column.outlineLevel !== undefined) targetColumn.outlineLevel = column.outlineLevel;
    });

    sourceSheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      const nextRow = targetSheet.getRow(rowNumber);
      nextRow.height = row.height;
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const nextCell = nextRow.getCell(colNumber);
        nextCell.value = cell.value;
        nextCell.style = JSON.parse(JSON.stringify(cell.style ?? {}));
        nextCell.numFmt = cell.numFmt;
        if (cell.alignment) nextCell.alignment = { ...cell.alignment };
      });
      nextRow.commit();
    });

    const merges = ((sourceSheet as unknown as { model?: { merges?: string[] } }).model?.merges ?? []);
    for (const merge of merges) targetSheet.mergeCells(merge);
  }

  return Buffer.from(await target.xlsx.writeBuffer());
}

async function generateReporteDocumentoInternal(input: {
  tipoDocumento: ReportDocumentType;
  semestreId?: number;
  grupoModuloId?: number;
  pdfProvider?: ReportPdfProvider;
}) {
  const grupoModuloIds = input.grupoModuloId
    ? [input.grupoModuloId]
    : input.semestreId
      ? await getGrupoModuloIdsForSemestre(input.semestreId)
      : [];
  if (grupoModuloIds.length === 0) {
    throw new https.HttpsError("invalid-argument", "Selecciona un modulo o un semestre con grupos-modulo.");
  }

  const reportes: ReporteDocumentoData[] = [];
  for (const id of grupoModuloIds) {
    reportes.push(await buildReporteData(id));
  }

  const hasPrograma = reportes.some((reporte) => !reporte.opcionOcupacional);
  const hasOpcion = reportes.some((reporte) => reporte.opcionOcupacional);
  if (reportes.length > 1) {
    throw new https.HttpsError(
      "failed-precondition",
      "Con la generacion por LibreOffice/OpenOffice, genera por grupo-modulo para conservar la plantilla y la vista de impresion.",
    );
  }
  if (input.tipoDocumento === "acta" && hasPrograma && hasOpcion) {
    throw new https.HttpsError(
      "failed-precondition",
      "El semestre contiene actas de Programa de Estudios y Opcion Ocupacional. Genera el acta por grupo-modulo para conservar su plantilla correcta.",
    );
  }

  dataHelpers.datosGenerales = await getDatosGeneralesGlobales();
  const template = selectTemplate(input.tipoDocumento, reportes);
  const { buffer: templateBuffer } = await ensureTemplateInStorage(template);

  const generatedAt = new Date().toISOString();
  const updates: SpreadsheetUpdate[] = [];
  fillReporte(updates, "Hoja1", input.tipoDocumento, reportes[0]);
  const isActaOpcion = input.tipoDocumento === "acta" && reportes[0].opcionOcupacional;
  const isActaPrograma = input.tipoDocumento === "acta" && !reportes[0].opcionOcupacional;

  const xlsxBuffer = await applyExcelUpdates(
    templateBuffer,
    updates,
    printableScaleForDocument(input.tipoDocumento),
    printableTopMarginForDocument(input.tipoDocumento),
    input.tipoDocumento === "acta" && !reportes[0].opcionOcupacional,
    isActaOpcion ? 0.5 : isActaPrograma ? 0.6 : 0.8,
    isActaPrograma ? 0.6 : 1,
    undefined,
    false,
    "9",
    false,
    isActaPrograma,
    isActaPrograma,
  );
  const grupoModuloId = reportes[0].grupoModulo.id;
  const semestreTitle = cleanText(reportes[0].semestre?.titulo || String(input.semestreId || ""));
  const baseName = `${input.tipoDocumento}-${semestreTitle}-${grupoModuloId}`
    .replace(/[^\w.-]+/g, "-")
    .toLowerCase();
  const pdfBuffer = await convertXlsxToPdf(xlsxBuffer, baseName, input.pdfProvider);
  const pdf = await uploadBuffer(`documentos/registros-academicos/${input.tipoDocumento}-${grupoModuloId}.pdf`, pdfBuffer, "application/pdf");
  const excel = await uploadBuffer(
    `documentos/registros-academicos/${input.tipoDocumento}-${grupoModuloId}.xlsx`,
    xlsxBuffer,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  const documento = await upsertRegistroAcademicoDocumento({
    tipoDocumento: input.tipoDocumento,
    grupoModuloId,
    pdf,
    excel,
    generadoEn: generatedAt,
  });

  return {
    tipoDocumento: input.tipoDocumento,
    semestreId: input.semestreId ?? reportes[0].grupoModulo.grupo?.semestreId ?? null,
    grupoModuloId,
    totalReportes: reportes.length,
    pdf,
    excel,
    documento,
  };
}

function getReporteGenerationErrorMessage(error: unknown) {
  const message = String((error as { message?: string } | null)?.message || "");
  const reason = JSON.stringify({
    message,
    errors: (error as { errors?: unknown } | null)?.errors,
    responseData: (error as { response?: { data?: unknown } } | null)?.response?.data,
  }).toLowerCase();

  if (reason.includes("google drive/sheets") || reason.includes("unauthorized_client") || reason.includes("auth/drive") || reason.includes("drive api")) {
    return message || "No se pudo convertir el Excel a PDF con Google Drive/Sheets.";
  }
  if (reason.includes("libreoffice") || reason.includes("openoffice") || reason.includes("soffice") || reason.includes("convertir el excel a pdf")) {
    return "No se pudo convertir el Excel a PDF. Instala LibreOffice/OpenOffice o configura REPORTES_OFFICE_BIN con la ruta de soffice.";
  }
  return message || "No se pudo generar el documento.";
}

export const listReporteDocumentosOptions = https.onCall(async (_data, context) => {
  await requirePermission(context, "documentos-reportes", "view");

  try {
    await ensureAllTemplatesInStorage();

    const [response, documentos] = await Promise.all([
      dataConnect.executeGraphql<{
      semestres: Array<ReporteSemestre & { archivado?: boolean | null }>;
      grupoModulos: ReporteGrupoModuloOption[];
      }, Record<string, never>>(REPORTE_OPTIONS_QUERY, {}),
      listRegistrosAcademicosDocumentos(),
    ]);

    const semestres = (response.data.semestres ?? [])
      .filter((semestre) => !semestre.archivado)
      .sort((a, b) => cleanText(b.titulo).localeCompare(cleanText(a.titulo), "es", { numeric: true }));
    const grupoModulos = (response.data.grupoModulos ?? [])
      .sort((a, b) =>
        cleanText(a.grupo?.semestre?.titulo).localeCompare(cleanText(b.grupo?.semestre?.titulo), "es", { numeric: true })
        || getModuloName(a).localeCompare(getModuloName(b), "es", { numeric: true })
        || a.id - b.id,
      )
      .map((item) => ({
        id: item.id,
        nombre: item.nombre || getModuloName(item),
        semestreId: item.grupo?.semestreId ?? null,
        semestreTitulo: item.grupo?.semestre?.titulo ?? null,
        grupoNombre: item.grupo?.nombreDisplay ?? null,
        turno: item.grupo?.turno?.nombre || item.grupo?.turnoNombre || null,
        horario: item.grupo?.horario?.nombre || item.grupo?.horario?.diasSemana || null,
        docente: getPersonalName(item.grupo?.personal),
        moduloNombre: getModuloDocumentName(item),
        tipoCarrera: item.modulo?.plan?.carrera?.tipoCarrera?.nombre ?? null,
      }));

    return { semestres, grupoModulos, documentos };
  } catch (error) {
    if (error instanceof https.HttpsError) throw error;
    console.error("Error in listReporteDocumentosOptions:", error);
    throw new https.HttpsError("internal", "No se pudieron cargar las opciones de reportes.");
  }
});

export const generateReporteDocumento = runWith({ timeoutSeconds: 180, memory: "512MB" }).https.onCall(async (data: ReportInput, context) => {
  await requirePermission(context, "documentos-reportes", "create");

  const tipoDocumento = String(data?.tipoDocumento || "acta").toLowerCase() === "nomina" ? "nomina" : "acta";
  const semestreId = toNumber(data?.semestreId, 0);
  const grupoModuloId = data?.grupoModuloId === "todos" || data?.grupoModuloId === null || data?.grupoModuloId === undefined
    ? 0
    : toNumber(data.grupoModuloId, 0);
  const pdfProvider = reportesPdfProvider(data?.pdfProvider);

  if (!grupoModuloId && !semestreId) {
    throw new https.HttpsError("invalid-argument", "Selecciona un semestre o un grupo-modulo.");
  }

  try {
    return await generateReporteDocumentoInternal({
      tipoDocumento,
      semestreId: semestreId > 0 ? semestreId : undefined,
      grupoModuloId: grupoModuloId > 0 ? grupoModuloId : undefined,
      pdfProvider,
    });
  } catch (error) {
    if (error instanceof https.HttpsError) throw error;
    console.error("Error in generateReporteDocumento:", error);
    throw new https.HttpsError("failed-precondition", getReporteGenerationErrorMessage(error));
  }
});

export const descargarRegistrosAcademicosSeleccionados = runWith({ timeoutSeconds: 180, memory: "1GB" }).https.onCall(async (data: DownloadRegistrosAcademicosInput, context) => {
  await requirePermission(context, "documentos-reportes", "view");

  const tipoDocumento = String(data?.tipoDocumento || "acta").toLowerCase() === "nomina" ? "nomina" : "acta";
  const formato = String(data?.formato || "pdf").toLowerCase() === "excel" ? "excel" : "pdf";
  const grupoModuloIds = Array.isArray(data?.grupoModuloIds)
    ? data.grupoModuloIds.map((value) => toNumber(value, 0)).filter((value) => value > 0)
    : [];

  if (grupoModuloIds.length === 0) {
    throw new https.HttpsError("invalid-argument", "Selecciona al menos un grupo-modulo.");
  }

  try {
    const [documentos, docentes] = await Promise.all([
      listRegistrosAcademicosDocumentos(),
      docenteNameByGrupoModuloId(),
    ]);
    const documentoByGrupoModuloId = new Map(
      documentos
        .filter((documento) => documento.tipoDocumento === tipoDocumento)
        .map((documento) => [documento.grupoModuloId, documento]),
    );
    const orderedDocuments = grupoModuloIds.map((grupoModuloId) => documentoByGrupoModuloId.get(grupoModuloId) ?? null);
    const missingIndex = orderedDocuments.findIndex((documento) =>
      !documento || (formato === "pdf" ? !documento.pdfPath : !documento.excelPath),
    );
    if (missingIndex >= 0) {
      throw new https.HttpsError("failed-precondition", "Todos los grupos seleccionados deben tener documento generado.");
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    if (formato === "pdf") {
      const buffers = await Promise.all(orderedDocuments.map((documento) => downloadStorageBuffer(documento?.pdfPath ?? "")));
      const combined = await combinePdfBuffers(buffers);
      const file = await uploadBuffer(
        `documentos/registros-academicos/lotes/${tipoDocumento}-${timestamp}.pdf`,
        combined,
        "application/pdf",
      );
      return { formato, file };
    }

    const excelItems = await Promise.all(orderedDocuments.map(async (documento) => ({
      buffer: await downloadStorageBuffer(documento?.excelPath ?? ""),
      sheetName: docentes.get(documento?.grupoModuloId ?? 0) || "Docente",
    })));
    const combined = await combineExcelBuffers(excelItems);
    const file = await uploadBuffer(
      `documentos/registros-academicos/lotes/${tipoDocumento}-${timestamp}.xlsx`,
      combined,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    return { formato, file };
  } catch (error) {
    if (error instanceof https.HttpsError) throw error;
    console.error("Error in descargarRegistrosAcademicosSeleccionados:", error);
    throw new https.HttpsError("internal", "No se pudo preparar la descarga.");
  }
});
