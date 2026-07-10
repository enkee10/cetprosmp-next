import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { basename, join } from "path";
import { promisify } from "util";
import JSZip from "jszip";
import { getStorage } from "firebase-admin/storage";
import { https } from "firebase-functions/v1";
import { dataConnect } from "../core/dataConnectCore.js";
import { getDatosGeneralesGlobales } from "../datos-generales/service.js";

type ReportDocumentType = "acta" | "nomina";

type ReportInput = {
  tipoDocumento?: unknown;
  semestreId?: unknown;
  grupoModuloId?: unknown;
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

type SharedStringWriter = (value: string) => number;

type ReportTemplate = {
  name: string;
  storageName: string;
};

const execFileAsync = promisify(execFile);

const REPORT_ROLE_IDS = new Set<number>([5, 6, 7, 8, 600]);

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

function roleId(context: https.CallableContext) {
  const value = Number(context.auth?.token?.role);
  return Number.isFinite(value) ? value : 0;
}

function roleLevel(context: https.CallableContext) {
  const value = Number(context.auth?.token?.level);
  return Number.isFinite(value) ? value : 0;
}

function requireReportesAccess(context: https.CallableContext, action: string) {
  if (!context.auth?.uid) {
    throw new https.HttpsError("unauthenticated", "Debes iniciar sesion.");
  }
  if (roleLevel(context) >= 600 || REPORT_ROLE_IDS.has(roleId(context))) return;
  throw new https.HttpsError("permission-denied", `No tienes permiso para ${action}.`);
}

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
  if (uniqueGroups.size <= 1) return "";
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

function ensureWorksheetPageMargins(xml: string, topCm = 2) {
  const marginAttrs = [
    `left="${(0.8 / 2.54).toFixed(12)}"`,
    `right="${(0.8 / 2.54).toFixed(12)}"`,
    `top="${(topCm / 2.54).toFixed(12)}"`,
    `bottom="${(1 / 2.54).toFixed(12)}"`,
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

function ensureWorksheetPrintSetup(xml: string, maxScale = 83) {
  const setupRegex = /<pageSetup\b[^>]*(?:\/>|>[\s\S]*?<\/pageSetup>)/i;
  if (setupRegex.test(xml)) {
    return xml.replace(setupRegex, (tag) => {
      const attrs = parseAttributes(tag);
      const currentScale = Number(attrs.get("scale"));
      const nextScale = Number.isFinite(currentScale) && currentScale > 0
        ? Math.min(currentScale, maxScale)
        : maxScale;
      const withoutFit = removeXmlAttribute(removeXmlAttribute(tag, "fitToWidth"), "fitToHeight");
      return setXmlAttribute(setXmlAttribute(withoutFit, "scale", String(nextScale)), "paperSize", "9");
    });
  }

  const pageSetup = `<pageSetup paperSize="9" scale="${maxScale}"/>`;
  if (/<pageMargins\b/i.test(xml)) {
    return xml.replace(/(<pageMargins\b[^>]*(?:\/>|>[\s\S]*?<\/pageMargins>))/i, `$1${pageSetup}`);
  }
  return xml.replace(/<\/worksheet>$/i, `${pageSetup}</worksheet>`);
}

function printableScaleForDocument(tipoDocumento: ReportDocumentType) {
  return tipoDocumento === "nomina" ? 93 : 83;
}

function printableTopMarginForDocument(tipoDocumento: ReportDocumentType) {
  return tipoDocumento === "nomina" ? 1 : 2;
}

function cellAddress(cell: string) {
  const { column, row } = cellParts(cell);
  return { column, columnIndex: columnIndex(column), row };
}

function mergeRangeForCell(xml: string, cell: string) {
  const address = cellAddress(cell);
  for (const merge of xml.match(/<mergeCell\b[^>]*>/g) ?? []) {
    const ref = parseAttributes(merge).get("ref");
    if (!ref) continue;
    const [startRef, endRef = startRef] = ref.split(":");
    const start = cellAddress(startRef);
    const end = cellAddress(endRef);
    if (
      address.columnIndex >= start.columnIndex
      && address.columnIndex <= end.columnIndex
      && address.row >= start.row
      && address.row <= end.row
    ) {
      return { start: start.columnIndex, end: end.columnIndex };
    }
  }
  return { start: address.columnIndex, end: address.columnIndex };
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
      before.set("min", String(min));
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
      after.set("max", String(max));
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

function estimateExcelTextWidth(value: string) {
  const normalized = cleanText(value);
  if (!normalized) return 0;
  const longestWord = normalized.split(/\s+/).reduce((max, word) => Math.max(max, word.length), 0);
  const preferredLine = Math.min(normalized.length, Math.max(18, longestWord + 4));
  return preferredLine * 1.05 + 2;
}

function optionCapacityColumnWidth(cell: string, value: string, currentWidth: number) {
  const { columnIndex: currentColumn, row } = cellAddress(cell);
  const isOptionCapacity = (row === 7 || row === 41) && currentColumn >= columnIndex("L") && currentColumn <= columnIndex("U");
  if (!isOptionCapacity) return null;

  const normalized = cleanText(value);
  if (!normalized) return currentWidth;
  const longestWord = normalized.split(/\s+/).reduce((max, word) => Math.max(max, word.length), 0);
  const pressure = Math.max(
    0,
    (normalized.length - 30) / 24,
    (longestWord - 11) / 10,
  );
  if (pressure <= 0) return currentWidth;

  const extraWidth = Math.min(1.2, 0.45 + pressure * 0.45);
  return Math.min(5.2, Math.max(currentWidth, currentWidth + extraWidth));
}

function programUnitColumnWidth(cell: string, value: string, currentWidth: number) {
  const { columnIndex: currentColumn, row } = cellAddress(cell);
  const isProgramUnit = (row === 6 || row === 35) && currentColumn >= columnIndex("X") && currentColumn <= columnIndex("AC");
  if (!isProgramUnit) return null;

  const normalized = cleanText(value);
  if (!normalized) return currentWidth;
  const longestWord = normalized.split(/\s+/).reduce((max, word) => Math.max(max, word.length), 0);
  const pressure = Math.max(
    0,
    (normalized.length - 28) / 24,
    (longestWord - 10) / 10,
  );
  if (pressure <= 0) return currentWidth;

  const extraWidth = Math.min(1.05, 0.35 + pressure * 0.4);
  return Math.min(5.6, Math.max(currentWidth, currentWidth + extraWidth));
}

function autofitUpdatedTextColumns(
  xml: string,
  updates: Array<{ cell: string; value: string }>,
  maxTotalWidth = 52,
) {
  let nextXml = xml;
  for (const update of updates) {
    const textWidth = estimateExcelTextWidth(update.value);
    if (textWidth <= 0) continue;

    const range = mergeRangeForCell(nextXml, update.cell);
    const columnCount = range.end - range.start + 1;
    let currentTotal = 0;
    for (let column = range.start; column <= range.end; column += 1) {
      currentTotal += columnWidth(nextXml, column);
    }

    const capacityWidth = columnCount === 1
      ? optionCapacityColumnWidth(update.cell, update.value, currentTotal)
      : null;
    if (capacityWidth !== null) {
      if (capacityWidth > currentTotal + 0.05) {
        nextXml = setColumnWidth(nextXml, range.start, capacityWidth);
      }
      continue;
    }

    const unitWidth = columnCount === 1
      ? programUnitColumnWidth(update.cell, update.value, currentTotal)
      : null;
    if (unitWidth !== null) {
      if (unitWidth > currentTotal + 0.05) {
        nextXml = setColumnWidth(nextXml, range.start, unitWidth);
      }
      continue;
    }

    if (columnCount === 1 && currentTotal < 10) continue;
    const maxWidth = columnCount > 1 ? maxTotalWidth : Math.min(maxTotalWidth, 28);
    const targetTotal = Math.min(maxWidth, textWidth);
    if (targetTotal <= currentTotal + 0.5) continue;

    const increment = (targetTotal - currentTotal) / columnCount;
    for (let column = range.start; column <= range.end; column += 1) {
      const current = columnWidth(nextXml, column);
      nextXml = setColumnWidth(nextXml, column, current + increment);
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
      .replace(/<sst\b[^>]*>/i, (tag) =>
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
) {
  const zip = await JSZip.loadAsync(templateBuffer);
  const worksheet = await getFirstVisibleWorksheet(zip);
  const sharedStrings = await createSharedStringWriter(zip);
  const sheetFile = zip.file(worksheet.path);
  const originalXml = await sheetFile?.async("string");
  if (!sheetFile || !originalXml) throw new Error(`No se pudo leer la hoja ${worksheet.path}.`);

  let nextXml = originalXml;
  const textUpdates: Array<{ cell: string; value: string }> = [];
  for (const update of updates) {
    const cell = a1CellFromRange(update.range);
    const value = update.values[0]?.[0] ?? "";
    nextXml = setSheetCellValue(nextXml, cell, value, sharedStrings.add);
    if (typeof value === "string" && cleanText(value)) {
      textUpdates.push({ cell, value });
    }
  }
  nextXml = autofitUpdatedTextColumns(nextXml, textUpdates);
  if (normalizeProgramaStyles) {
    nextXml = normalizeProgramaActaStudentStyles(nextXml);
  }
  nextXml = ensureWorksheetPageMargins(nextXml, topMarginCm);
  nextXml = ensureWorksheetPrintSetup(nextXml, printScale);
  zip.file(worksheet.path, nextXml);
  sharedStrings.save();
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

async function convertXlsxToPdf(xlsxBuffer: Buffer, baseName: string) {
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
    }
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
    addCell(updates, sheetName, "Y6", carrera);
    addCell(updates, sheetName, "AE7", nivel);
    addCell(updates, sheetName, "AE8", modulo);
    addCell(updates, sheetName, "Z11", resolucion);
    addCell(updates, sheetName, "AF12", turno);
    addCell(updates, sheetName, "AF13", data.seccion);
    addCell(updates, sheetName, "AF14", horas);
    addCell(updates, sheetName, "AF15", formatDate(inicio));
    addCell(updates, sheetName, "AJ15", formatDate(fin));
    addCell(updates, sheetName, "B67", modulo);
    addCell(updates, sheetName, "J67", docente);
    addCell(updates, sheetName, "C77", `${distrito}, ${formatDateLong()}`);
    addCell(updates, sheetName, "L78", docente);
    addCell(updates, sheetName, "W78", director);
    return;
  }

  addCell(updates, sheetName, "AO7", nivel);
  addCell(updates, sheetName, "AO8", semestre);
  addCell(updates, sheetName, "AO9", data.seccion);
  addCell(updates, sheetName, "AO10", turno);
  addCell(updates, sheetName, "AO11", formatDate(inicio));
  addCell(updates, sheetName, "AO12", formatDate(fin));
  addCell(updates, sheetName, "W42", creditos);
  addCell(updates, sheetName, "W43", horas);
  addCell(updates, sheetName, "AH12", data.grupoModulo.modulo?.creditosEfsrt ?? "");
  addCell(updates, sheetName, "AH13", data.grupoModulo.modulo?.duracionEfsrt ?? "");
  addCell(updates, sheetName, "AG13", "");
  addCell(updates, sheetName, "AG42", data.grupoModulo.modulo?.creditosEfsrt ?? "");
  addCell(updates, sheetName, "AG43", data.grupoModulo.modulo?.duracionEfsrt ?? "");
  addCell(updates, sheetName, "AA71", `${distrito}, ${formatDateLong()}`);
  addCell(updates, sheetName, "C75", director ? `LIC. ${director}\nDIRECTOR(A)` : "DIRECTOR(A)");
  addCell(updates, sheetName, "R75", coordinador ? `LIC. ${coordinador}\nCOORDINADOR(A)` : "COORDINADOR(A)");
  addCell(updates, sheetName, "AI75", docente ? `LIC. ${docente}` : "DOCENTE");
}

const dataHelpers: { datosGenerales: Awaited<ReturnType<typeof getDatosGeneralesGlobales>> } = {
  datosGenerales: {} as Awaited<ReturnType<typeof getDatosGeneralesGlobales>>,
};

function fillNomina(updates: SpreadsheetUpdate[], sheetName: string, data: ReporteDocumentoData) {
  fillInstitutionHeader(updates, sheetName, data, "nomina");
  const students = data.estudiantes.slice(0, 30);
  let men = 0;
  let women = 0;
  students.forEach((student, index) => {
    const row = 16 + index;
    const sex = studentSex(student);
    if (sex === "M") men += 1;
    if (sex === "F") women += 1;
    addCell(updates, sheetName, `A${row}`, index + 1);
    addCell(updates, sheetName, `B${row}`, student.matricula?.codigoInscripcion || "");
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
    addCell(updates, sheetName, `${column}42`, unit.creditos ?? "");
    addCell(updates, sheetName, `${column}43`, unit.duracion ?? "");
  });

  const students = data.estudiantes.slice(0, 40);
  students.forEach((student, index) => {
    const row = index < 20 ? 14 + index : 44 + (index - 20);
    addCell(updates, sheetName, `A${row}`, index + 1);
    addCell(updates, sheetName, `B${row}`, student.matricula?.user?.dni || student.matricula?.codigoInscripcion || "");
    addCell(updates, sheetName, `F${row}`, getStudentName(student));
    units.forEach((unit, unitIndex) => {
      const promedio = unitMap.get(`${student.matriculaId}:${unit.id}`);
      addCell(updates, sheetName, `${unitColumns[unitIndex]}${row}`, formatGrade(promedio));
    });
    const efsrt = efsrtMap.get(student.id);
    addCell(updates, sheetName, `AF${row}`, "");
    addCell(updates, sheetName, `AG${row}`, "");
    addCell(updates, sheetName, `AH${row}`, formatGrade(efsrt));
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
    const row = index < 20 ? 14 + index : 44 + (index - 20);
    clearStudentRow(row);
  }

  units.forEach((unit, unitIndex) => {
    const column = unitColumns[unitIndex];
    const values = data.estudiantes
      .map((student) => unitMap.get(`${student.matriculaId}:${unit.id}`))
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    addCell(updates, sheetName, `${column}66`, values.filter((value) => value >= 13).length);
    addCell(updates, sheetName, `${column}67`, values.filter((value) => value < 13).length);
    addCell(updates, sheetName, `${column}68`, 0);
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
    capacidades.forEach((capacidad, capacidadIndex) => {
      const promedio = capacidadMap.get(`${student.matriculaId}:${capacidad.id}`);
      addCell(updates, sheetName, `${capacidadColumns[capacidadIndex]}${row}`, formatGrade(promedio));
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

async function generateReporteDocumentoInternal(input: {
  tipoDocumento: ReportDocumentType;
  semestreId?: number;
  grupoModuloId?: number;
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

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const updates: SpreadsheetUpdate[] = [];
  fillReporte(updates, "Hoja1", input.tipoDocumento, reportes[0]);

  const xlsxBuffer = await applyExcelUpdates(
    templateBuffer,
    updates,
    printableScaleForDocument(input.tipoDocumento),
    printableTopMarginForDocument(input.tipoDocumento),
    input.tipoDocumento === "acta" && !reportes[0].opcionOcupacional,
  );
  const semestreTitle = cleanText(reportes[0].semestre?.titulo || String(input.semestreId || ""));
  const baseName = `${input.tipoDocumento}-${semestreTitle}-${input.grupoModuloId ? reportes[0].grupoModulo.id : "todos"}-${timestamp}`
    .replace(/[^\w.-]+/g, "-")
    .toLowerCase();
  const pdfBuffer = await convertXlsxToPdf(xlsxBuffer, baseName);
  const pdf = await uploadBuffer(`documentos/generados/${baseName}.pdf`, pdfBuffer, "application/pdf");
  const excel = await uploadBuffer(
    `documentos/generados/${baseName}.xlsx`,
    xlsxBuffer,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );

  return {
    tipoDocumento: input.tipoDocumento,
    semestreId: input.semestreId ?? reportes[0].grupoModulo.grupo?.semestreId ?? null,
    grupoModuloId: input.grupoModuloId ?? null,
    totalReportes: reportes.length,
    pdf,
    excel,
  };
}

function getReporteGenerationErrorMessage(error: unknown) {
  const message = String((error as { message?: string } | null)?.message || "");
  const reason = JSON.stringify({
    message,
    errors: (error as { errors?: unknown } | null)?.errors,
    responseData: (error as { response?: { data?: unknown } } | null)?.response?.data,
  }).toLowerCase();

  if (reason.includes("libreoffice") || reason.includes("openoffice") || reason.includes("soffice") || reason.includes("convertir el excel a pdf")) {
    return "No se pudo convertir el Excel a PDF. Instala LibreOffice/OpenOffice o configura REPORTES_OFFICE_BIN con la ruta de soffice.";
  }
  return message || "No se pudo generar el documento.";
}

export const listReporteDocumentosOptions = https.onCall(async (_data, context) => {
  requireReportesAccess(context, "listar reportes");

  try {
    await ensureAllTemplatesInStorage();

    const response = await dataConnect.executeGraphql<{
      semestres: Array<ReporteSemestre & { archivado?: boolean | null }>;
      grupoModulos: ReporteGrupoModuloOption[];
    }, Record<string, never>>(REPORTE_OPTIONS_QUERY, {});

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

    return { semestres, grupoModulos };
  } catch (error) {
    if (error instanceof https.HttpsError) throw error;
    console.error("Error in listReporteDocumentosOptions:", error);
    throw new https.HttpsError("internal", "No se pudieron cargar las opciones de reportes.");
  }
});

export const generateReporteDocumento = https.onCall(async (data: ReportInput, context) => {
  requireReportesAccess(context, "generar reportes");

  const tipoDocumento = String(data?.tipoDocumento || "acta").toLowerCase() === "nomina" ? "nomina" : "acta";
  const semestreId = toNumber(data?.semestreId, 0);
  const grupoModuloId = data?.grupoModuloId === "todos" || data?.grupoModuloId === null || data?.grupoModuloId === undefined
    ? 0
    : toNumber(data.grupoModuloId, 0);

  if (!grupoModuloId && !semestreId) {
    throw new https.HttpsError("invalid-argument", "Selecciona un semestre o un grupo-modulo.");
  }

  try {
    return await generateReporteDocumentoInternal({
      tipoDocumento,
      semestreId: semestreId > 0 ? semestreId : undefined,
      grupoModuloId: grupoModuloId > 0 ? grupoModuloId : undefined,
    });
  } catch (error) {
    if (error instanceof https.HttpsError) throw error;
    console.error("Error in generateReporteDocumento:", error);
    throw new https.HttpsError("failed-precondition", getReporteGenerationErrorMessage(error));
  }
});
