import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { basename, join } from "path";
import { promisify } from "util";
import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { getStorage } from "firebase-admin/storage";
import { https, runWith } from "firebase-functions/v1";
import { dataConnect } from "../core/dataConnectCore.js";
import { getDatosGeneralesGlobales } from "../datos-generales/service.js";
import { requirePermission } from "../core/permissions.js";
import { getConfiguredSemestreConsultaIds } from "../settings/handlers.js";

type ReportDocumentType = "acta" | "nomina";

const USE_AVATARS_IN_CERTIFICADOS_TITULOS_KEY =
  "general.usarAvataresEnCertificadosTitulos";

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

type CertificadoTituloItemInput = {
  grupoModuloId?: unknown;
  moduloEstudianteId?: unknown;
};

type CertificadoTituloInput = {
  tipoDocumento?: unknown;
  items?: unknown;
  pdfProvider?: unknown;
};

type DownloadCertificadosTitulosInput = {
  tipoDocumento?: unknown;
  items?: unknown;
  formato?: unknown;
};

type ReporteSemestre = {
  id: number;
  titulo?: string | null;
  inicio?: string | null;
  fin?: string | null;
  fechaActa?: string | null;
  fechaCertificado?: string | null;
  fechaNomina?: string | null;
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
    competencia?: string | null;
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
        ciclo?: string | null;
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
  orden?: number | null;
  unidadDidacticaId?: number | null;
};

type ReporteEstudiante = {
  id: number;
  promedio?: number | null;
  puntaje?: number | null;
  matriculaId: number;
  moduloId: number;
  grupoId?: number | null;
  grupoModuloId?: number | null;
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
      avatar?: string | null;
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
  modulosEstudiantesByGrupoModulo: ReporteEstudiante[];
  modulosEstudiantesLegacy: ReporteEstudiante[];
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

type TemplateTokenReplacements = Record<string, string | number | null | undefined>;

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

type CertificadoTituloTipo = "certificado" | "titulo";

type CertificadoTituloDocumento = {
  id: number;
  tipoDocumento: string;
  semestreCodigo?: string | null;
  grupoModuloId: number;
  moduloEstudianteId: number;
  pdfPath?: string | null;
  pdfUrl?: string | null;
  excelPath?: string | null;
  excelUrl?: string | null;
  generadoEn?: string | null;
};

type CertificadoTituloRow = {
  id: string;
  grupoModuloId: number;
  moduloEstudianteId: number;
  matriculaId: number;
  semestreId: number | null;
  semestreTitulo: string | null;
  semestreCodigo: string;
  estudianteNombre: string;
  apellidoPaterno: string;
  dni: string;
  grupoModuloNombre: string;
  moduloNombre: string;
  promedioFinal: number;
};

type SharedStringWriter = (value: string) => number;

type ReportPdfProvider = "office";

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
  certificadoPlanEstudios: {
    name: "Certificado - Plan de Estudios",
    storageName: "certificados-plan-estudios",
  },
};

const REPORTE_OPTIONS_QUERY = `
  query ReporteDocumentosOptions {
    semestres(limit: 200) {
      id
      titulo
      inicio
      fin
      fechaActa
      fechaCertificado
      fechaNomina
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
        competencia
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
            ciclo
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
          fechaActa
          fechaCertificado
          fechaNomina
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
        competencia
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
            ciclo
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
      orden
      unidadDidacticaId
    }
    modulosEstudiantesByGrupoModulo: modulosEstudiantes(where: { grupoModuloId: { eq: $grupoModuloId } }, limit: 1000) {
      id
      promedio
      puntaje
      matriculaId
      moduloId
      grupoId
      grupoModuloId
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
          avatar
        }
      }
    }
    modulosEstudiantesLegacy: modulosEstudiantes(where: { grupoId: { eq: $grupoId }, moduloId: { eq: $moduloId } }, limit: 1000) {
      id
      promedio
      puntaje
      matriculaId
      moduloId
      grupoId
      grupoModuloId
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
          avatar
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
      fechaActa
      fechaCertificado
      fechaNomina
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

const CERTIFICADOS_TITULOS_OPTIONS_QUERY = `
  query CertificadosTitulosOptions {
    semestres(limit: 200) {
      id
      titulo
      inicio
      fin
      fechaActa
      fechaCertificado
      fechaNomina
      archivado
    }
    efsrtPppEstudiantes(limit: 20000) {
      promedioFinal
      grupoModuloId
      moduloEstudianteId
      grupoModulo {
        id
        nombre
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
          plan {
            carrera {
              nombre
              titulo
              tituloComercial
              tipoCarrera { nombre }
              especialidad { titulo tituloComercial }
            }
          }
        }
      }
      moduloEstudiante {
        id
        matriculaId
        matricula {
          id
          archivado
          codigoInscripcion
          user {
            id
            username
            nombre
            apellidos
            apellidoPaterno
            apellidoMaterno
            dni
          }
        }
      }
    }
    certificadoTituloDocumentos(limit: 20000) {
      id
      tipoDocumento
      semestreCodigo
      grupoModuloId
      moduloEstudianteId
      pdfPath
      pdfUrl
      excelPath
      excelUrl
      generadoEn
    }
  }
`;

const GET_CERTIFICADO_TITULO_DOCUMENTO_QUERY = `
  query GetCertificadoTituloDocumentoManual($tipoDocumento: String!, $grupoModuloId: Int!, $moduloEstudianteId: Int!) {
    certificadoTituloDocumentos(
      where: {
        tipoDocumento: { eq: $tipoDocumento },
        grupoModuloId: { eq: $grupoModuloId },
        moduloEstudianteId: { eq: $moduloEstudianteId }
      },
      limit: 1
    ) {
      id
      tipoDocumento
      semestreCodigo
      grupoModuloId
      moduloEstudianteId
      pdfPath
      pdfUrl
      excelPath
      excelUrl
      generadoEn
    }
  }
`;

const LIST_CERTIFICADO_TITULO_DOCUMENTOS_QUERY = `
  query ListCertificadoTituloDocumentosManual {
    certificadoTituloDocumentos(limit: 20000) {
      id
      tipoDocumento
      semestreCodigo
      grupoModuloId
      moduloEstudianteId
      pdfPath
      pdfUrl
      excelPath
      excelUrl
      generadoEn
    }
  }
`;

const INSERT_CERTIFICADO_TITULO_DOCUMENTO_MUTATION = `
  mutation InsertCertificadoTituloDocumento($data: CertificadoTituloDocumento_Data! @allow(fields: "tipoDocumento semestreCodigo grupoModuloId moduloEstudianteId pdfPath pdfUrl excelPath excelUrl generadoEn")) {
    certificadoTituloDocumento_insert(data: $data)
  }
`;

const UPDATE_CERTIFICADO_TITULO_DOCUMENTO_MUTATION = `
  mutation UpdateCertificadoTituloDocumento($id: Int!, $data: CertificadoTituloDocumento_Data! @allow(fields: "semestreCodigo pdfPath pdfUrl excelPath excelUrl generadoEn")) {
    certificadoTituloDocumento_update(id: $id, data: $data)
  }
`;

const GET_BOOLEAN_APP_SETTING_QUERY = `
  query GetBooleanAppSettingManual($settingKey: String!) {
    appSettings(where: { settingKey: { eq: $settingKey } }, limit: 1) {
      boolValue
    }
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

function usesOpcionOcupacionalRules(value: unknown) {
  const normalized = normalizeText(value);
  return normalized.includes("opcion ocupacional") || normalized.includes("modulo ocupacional");
}

function averageGrades(values: Array<number | null | undefined>) {
  const valid = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (valid.length === 0) return null;
  return Math.round(valid.reduce((sum, value) => sum + value, 0) / valid.length);
}

function sumGrades(values: Array<number | null | undefined>) {
  const valid = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (valid.length === 0) return null;
  return Math.round(valid.reduce((total, value) => total + value, 0) * 100) / 100;
}

function cleanText(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

async function getBooleanAppSetting(settingKey: string, defaultValue = false) {
  try {
    const response = await dataConnect.executeGraphql<
      { appSettings: Array<{ boolValue?: boolean | null }> },
      { settingKey: string }
    >(
      GET_BOOLEAN_APP_SETTING_QUERY,
      { variables: { settingKey } },
    );
    const value = response.data.appSettings?.[0]?.boolValue;
    return typeof value === "boolean" ? value : defaultValue;
  } catch (error) {
    console.warn("No se pudo leer una configuracion de la app.", {
      settingKey,
      message: String((error as { message?: string } | null)?.message || error),
    });
    return defaultValue;
  }
}

function toTitleCase(value: string | null | undefined) {
  return cleanText(value)
    .toLocaleLowerCase("es-PE")
    .replace(/(^|[^\p{L}\p{N}])(\p{L})/gu, (match, prefix: string, letter: string) =>
      `${prefix}${letter.toLocaleUpperCase("es-PE")}`,
    );
}

function getPersonalName(personal?: ReportePersonal | null) {
  const user = personal?.user;
  const userFullName = [user?.nombre, user?.apellidoPaterno, user?.apellidoMaterno]
    .map((value) => cleanText(value))
    .filter(Boolean)
    .join(" ");
  return cleanText(
    userFullName
      || user?.username
      || personal?.displayName
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

function getUserDisplayName(user?: {
  username?: string | null;
  nombre?: string | null;
  apellidos?: string | null;
  apellidoPaterno?: string | null;
  apellidoMaterno?: string | null;
} | null) {
  const apellidos = [user?.apellidoPaterno, user?.apellidoMaterno].filter(Boolean).join(" ");
  const nombres = cleanText(user?.nombre || user?.apellidos || user?.username || "");
  if (apellidos && nombres) return `${cleanText(apellidos).toLocaleUpperCase("es-PE")}, ${toTitleCase(nombres)}`;
  if (apellidos) return cleanText(apellidos).toLocaleUpperCase("es-PE");
  if (nombres) return toTitleCase(nombres);
  return "";
}

function semestreCodigo(value?: string | null) {
  const text = cleanText(value);
  return text.length > 4 ? text.slice(-4) : text;
}

function grupoModuloDisplayName(grupoModulo: ReporteGrupoModuloOption) {
  return cleanText(grupoModulo.nombre || getModuloDocumentName(grupoModulo) || `Grupo-modulo ${grupoModulo.id}`);
}

function certificadoGrupoModuloLabel(grupoModulo: ReporteGrupoModuloOption) {
  const codigo = semestreCodigo(grupoModulo.grupo?.semestre?.titulo);
  return cleanText([codigo, grupoModuloDisplayName(grupoModulo)].filter(Boolean).join(" "));
}

function certificadoSheetName(value: { apellidoPaterno?: string | null; dni?: string | null }, used: Set<string>) {
  const apellido = cleanText(value.apellidoPaterno || "Estudiante").split(/\s+/)[0] || "Estudiante";
  const dni = cleanText(value.dni);
  const baseRaw = [apellido, dni].filter(Boolean).join("-");
  const base = baseRaw
    .replace(/[:\\/?*[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 31) || "Estudiante";
  let name = base;
  let index = 2;
  while (used.has(name.toLocaleLowerCase("es-PE"))) {
    const suffix = `${index}`;
    const prefix = apellido.slice(0, Math.max(1, 31 - suffix.length - (dni ? dni.length + 1 : 0)));
    name = [prefix ? `${prefix}${suffix}` : `Estudiante${suffix}`, dni].filter(Boolean).join("-").slice(0, 31);
    index += 1;
  }
  used.add(name.toLocaleLowerCase("es-PE"));
  return name;
}

function getModuloName(grupoModulo: ReporteGrupoModuloOption) {
  return cleanText(grupoModulo.nombre || grupoModulo.modulo?.titulo || grupoModulo.modulo?.tituloComercial || "");
}

function getModuloDocumentName(grupoModulo: ReporteGrupoModuloOption) {
  return cleanText(grupoModulo.modulo?.titulo || grupoModulo.modulo?.tituloComercial || grupoModulo.nombre || "");
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

function getCalendarDateParts(value: string | null | undefined) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value).trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

function formatDate(value: string | null | undefined) {
  const calendarDate = getCalendarDateParts(value);
  if (calendarDate) {
    return new Intl.DateTimeFormat("es-PE").format(
      new Date(calendarDate.year, calendarDate.month - 1, calendarDate.day),
    );
  }
  const date = getDateValue(value);
  return date ? date.toLocaleDateString("es-PE", { timeZone: "America/Lima" }) : "";
}

function getCivilDatePartsFromValue(value: string | Date | null | undefined) {
  const calendarDate = typeof value === "string" ? getCalendarDateParts(value) : null;
  if (calendarDate) return calendarDate;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return { year: value.getUTCFullYear(), month: value.getUTCMonth() + 1, day: value.getUTCDate() };
  }
  return null;
}

const MONTH_NAMES_ES_PE = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

function formatDateLong(value: string | Date | null | undefined = new Date()) {
  const date = getCivilDatePartsFromValue(value);
  if (date) {
    return `${date.day} de ${MONTH_NAMES_ES_PE[date.month - 1] ?? ""} del ${date.year}`;
  }
  return new Date().toLocaleDateString("es-PE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Lima",
  }).replace(" de ", " de ").replace(/ de (\d{4})$/, " del $1");
}

function getDocumentDateLong(data: ReporteDocumentoData, type: "acta" | "certificado" | "nomina") {
  const configuredDate = type === "acta"
    ? data.semestre?.fechaActa
    : type === "certificado"
      ? data.semestre?.fechaCertificado
      : data.semestre?.fechaNomina;
  return formatDateLong(configuredDate);
}

function calculateAge(dateValue?: string | null, at = new Date()) {
  if (!dateValue) return "";
  const calendarDate = getCalendarDateParts(dateValue);
  const birthDate = calendarDate
    ? new Date(calendarDate.year, calendarDate.month - 1, calendarDate.day)
    : new Date(dateValue);
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

function formatActaOpcionResolucion(value: unknown) {
  const text = cleanText(value);
  if (!text) return "";
  const parts = text.split("_");
  if (parts.length === 1) return text;
  if (parts.length === 2) return `${parts[0]} N° ${parts[1]}`.trim();
  return `${parts[0]} N° ${parts[1]}-${parts[2]}`.trim();
}

function getCondition(promedio: number | null | undefined) {
  if (typeof promedio !== "number" || !Number.isFinite(promedio)) return "";
  return promedio >= 13 ? "A" : "D";
}

function hasFiniteGrade(values: Array<number | null | undefined>) {
  return values.some((value) => typeof value === "number" && Number.isFinite(value));
}

function buildUnidadIds(response: {
  grupoModuloUnidadesDidacticas?: Array<{ orden?: number | null; unidadDidacticaId: number }>;
  unidadDidacticaModulos?: Array<{ orden?: number | null; unidadDidacticaId: number }>;
}) {
  const moduleUnits = response.unidadDidacticaModulos ?? [];
  const source = moduleUnits.length > 0 ? moduleUnits : response.grupoModuloUnidadesDidacticas ?? [];
  const unitsById = new Map<number, { orden?: number | null; unidadDidacticaId: number }>();
  for (const item of source) {
    unitsById.set(item.unidadDidacticaId, item);
  }
  return Array.from(unitsById.values())
    .sort((a, b) => (
      (a.orden ?? a.unidadDidacticaId) - (b.orden ?? b.unidadDidacticaId)
      || a.unidadDidacticaId - b.unidadDidacticaId
    ))
    .map((item) => item.unidadDidacticaId);
}

function getAcademicOrder(item: { id: number; orden?: number | null }) {
  return item.orden ?? item.id;
}

function mergeReporteEstudiantesForGrupoModulo(
  grupoModuloId: number,
  primary: ReporteEstudiante[] = [],
  legacy: ReporteEstudiante[] = [],
) {
  const byId = new Map<number, ReporteEstudiante>();
  for (const item of primary) {
    byId.set(item.id, item);
  }
  for (const item of legacy) {
    if (byId.has(item.id)) continue;
    if (item.grupoModuloId && item.grupoModuloId !== grupoModuloId) continue;
    byId.set(item.id, item);
  }
  return Array.from(byId.values());
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

async function upsertCertificadoTituloDocumento(input: {
  tipoDocumento: CertificadoTituloTipo;
  semestreCodigo: string;
  grupoModuloId: number;
  moduloEstudianteId: number;
  pdf: { path: string; url: string };
  excel: { path: string; url: string };
  generadoEn: string;
}) {
  const existing = await dataConnect.executeGraphql<{
    certificadoTituloDocumentos: CertificadoTituloDocumento[];
  }, { tipoDocumento: string; grupoModuloId: number; moduloEstudianteId: number }>(
    GET_CERTIFICADO_TITULO_DOCUMENTO_QUERY,
    {
      variables: {
        tipoDocumento: input.tipoDocumento,
        grupoModuloId: input.grupoModuloId,
        moduloEstudianteId: input.moduloEstudianteId,
      },
    },
  );
  const current = existing.data.certificadoTituloDocumentos?.[0] ?? null;
  const data = {
    semestreCodigo: input.semestreCodigo,
    pdfPath: input.pdf.path,
    pdfUrl: input.pdf.url,
    excelPath: input.excel.path,
    excelUrl: input.excel.url,
    generadoEn: input.generadoEn,
  };

  if (current?.id) {
    await dataConnect.executeGraphql<
      { certificadoTituloDocumento_update: unknown },
      { id: number; data: typeof data }
    >(
      UPDATE_CERTIFICADO_TITULO_DOCUMENTO_MUTATION,
      { variables: { id: current.id, data } },
    );
    return { ...current, ...data } satisfies CertificadoTituloDocumento;
  }

  const insertData = {
    tipoDocumento: input.tipoDocumento,
    grupoModuloId: input.grupoModuloId,
    moduloEstudianteId: input.moduloEstudianteId,
    ...data,
  };
  const inserted = await dataConnect.executeGraphql<
    { certificadoTituloDocumento_insert: unknown },
    { data: typeof insertData }
  >(
    INSERT_CERTIFICADO_TITULO_DOCUMENTO_MUTATION,
    { variables: { data: insertData } },
  );
  return {
    id: Number((inserted.data.certificadoTituloDocumento_insert as { id?: number } | null)?.id ?? 0),
    ...insertData,
  } satisfies CertificadoTituloDocumento;
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
    ensureTemplateInStorage(TEMPLATES.certificadoPlanEstudios),
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

function replaceTemplateTokens(xml: string, tokens: TemplateTokenReplacements) {
  let nextXml = xml;
  for (const [token, value] of Object.entries(tokens)) {
    if (!token) continue;
    nextXml = nextXml.split(token).join(xmlEscape(value === null || value === undefined ? "" : String(value)));
  }
  return nextXml;
}

async function replaceTemplateTokensInWorkbook(zip: JSZip, tokens: TemplateTokenReplacements) {
  const entries = Object.entries(tokens).filter(([token]) => token);
  if (entries.length === 0) return;
  const replacements = Object.fromEntries(entries);
  const xmlFiles = Object.keys(zip.files).filter((path) =>
    path === "xl/sharedStrings.xml" || /^xl\/worksheets\/sheet\d+\.xml$/i.test(path),
  );

  await Promise.all(
    xmlFiles.map(async (path) => {
      const file = zip.file(path);
      const xml = await file?.async("string");
      if (!file || !xml) return;
      const nextXml = replaceTemplateTokens(xml, replacements);
      if (nextXml !== xml) zip.file(path, nextXml);
    }),
  );
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
  const parts: string[] = [];
  for (const part of `${baseDir}${normalizedTarget}`.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      parts.pop();
      continue;
    }
    parts.push(part);
  }
  return parts.join("/");
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

function drawingMarkerXml(kind: "from" | "to", marker: { col: number; colOff: number; row: number; rowOff: number }) {
  return `<xdr:${kind}><xdr:col>${marker.col}</xdr:col><xdr:colOff>${marker.colOff}</xdr:colOff><xdr:row>${marker.row}</xdr:row><xdr:rowOff>${marker.rowOff}</xdr:rowOff></xdr:${kind}>`;
}

function replaceDrawingMarker(anchorXml: string, kind: "from" | "to", marker: { col: number; colOff: number; row: number; rowOff: number }) {
  const regex = new RegExp(`<xdr:${kind}>[\\s\\S]*?<\\/xdr:${kind}>`, "i");
  return anchorXml.replace(regex, drawingMarkerXml(kind, marker));
}

type ActaClosureLineConfig = {
  name?: string;
  detectTemplateGroup?: boolean;
  maxStudents: number;
  firstPageLimit: number;
  firstPageStartRow: number;
  secondPageStartRow: number;
  firstPageEndRow: number;
  secondPageEndRow: number;
  firstPageRowHeightPx: number;
  secondPageRowHeightPx: number;
  firstPageRowMiddleAdjustmentPx?: number;
  secondPageRowMiddleAdjustmentPx?: number;
  fromCol: number;
  fromColOff: number;
  toCol: number;
  toColOff: number;
};

type ActaClosureLineAdjustment = {
  kind: "programa" | "opcion" | "nomina";
  studentCount: number;
};

const ACTA_CLOSURE_LINE_CONFIGS: Record<ActaClosureLineAdjustment["kind"], ActaClosureLineConfig> = {
  programa: {
    name: "Grupo 8",
    maxStudents: 40,
    firstPageLimit: 20,
    firstPageStartRow: 14,
    secondPageStartRow: 43,
    firstPageEndRow: 33,
    secondPageEndRow: 62,
    firstPageRowHeightPx: 38,
    secondPageRowHeightPx: 27,
    secondPageRowMiddleAdjustmentPx: 3,
    fromCol: 1,
    fromColOff: 7620,
    toCol: 47,
    toColOff: 0,
  },
  opcion: {
    detectTemplateGroup: true,
    maxStudents: 30,
    firstPageLimit: 20,
    firstPageStartRow: 20,
    secondPageStartRow: 55,
    firstPageEndRow: 39,
    secondPageEndRow: 64,
    firstPageRowHeightPx: 27,
    secondPageRowHeightPx: 28,
    firstPageRowMiddleAdjustmentPx: 5,
    secondPageRowMiddleAdjustmentPx: 5,
    fromCol: 2,
    fromColOff: 0,
    toCol: 37,
    toColOff: 0,
  },
  nomina: {
    name: "Grupo 86",
    maxStudents: 30,
    firstPageLimit: 30,
    firstPageStartRow: 16,
    secondPageStartRow: 16,
    firstPageEndRow: 45,
    secondPageEndRow: 45,
    firstPageRowHeightPx: 22,
    secondPageRowHeightPx: 22,
    fromCol: 1,
    fromColOff: 0,
    toCol: 36,
    toColOff: 0,
  },
};

function isActaClosureLineAnchor(anchor: string, config: ActaClosureLineConfig) {
  if (config.name) {
    return new RegExp(`<xdr:cNvPr\\b[^>]*\\bname="${config.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`, "i").test(anchor);
  }
  if (!config.detectTemplateGroup) return false;
  return /<xdr:grpSp\b/i.test(anchor) && (anchor.match(/<xdr:cxnSp\b/gi)?.length ?? 0) >= 2;
}

function removeActaClosureLineAnchor(xml: string, config: ActaClosureLineConfig) {
  return xml.replace(/<xdr:(?:twoCellAnchor|oneCellAnchor|absoluteAnchor)>[\s\S]*?<\/xdr:(?:twoCellAnchor|oneCellAnchor|absoluteAnchor)>/gi, (anchor) =>
    isActaClosureLineAnchor(anchor, config) ? "" : anchor,
  );
}

function adjustActaStudentClosureLineAnchor(xml: string, studentCount: number, config: ActaClosureLineConfig) {
  const count = Math.min(Math.max(0, studentCount), config.maxStudents);
  if (count <= 0 || count === config.firstPageLimit || count === config.maxStudents) {
    return removeActaClosureLineAnchor(xml, config);
  }

  const firstPage = count < config.firstPageLimit;
  const nextStudentRow = firstPage
    ? config.firstPageStartRow + count
    : config.secondPageStartRow + (count - config.firstPageLimit);
  const pageEndRow = firstPage ? config.firstPageEndRow : config.secondPageEndRow;
  const rowHeightPx = firstPage ? config.firstPageRowHeightPx : config.secondPageRowHeightPx;
  const rowMiddleAdjustmentPx = firstPage
    ? config.firstPageRowMiddleAdjustmentPx ?? 0
    : config.secondPageRowMiddleAdjustmentPx ?? 0;
  const rowMiddleOff = Math.round(((rowHeightPx / 2) - rowMiddleAdjustmentPx) * 9525);
  const from = { col: config.fromCol, colOff: config.fromColOff, row: nextStudentRow - 1, rowOff: rowMiddleOff };
  const to = { col: config.toCol, colOff: config.toColOff, row: pageEndRow, rowOff: 0 };

  let adjusted = false;
  return xml.replace(/<xdr:twoCellAnchor>[\s\S]*?<\/xdr:twoCellAnchor>/gi, (anchor) => {
    if (adjusted || !isActaClosureLineAnchor(anchor, config)) return anchor;
    adjusted = true;
    return replaceDrawingMarker(replaceDrawingMarker(anchor, "from", from), "to", to);
  });
}

async function adjustActaStudentClosureLine(zip: JSZip, adjustment?: ActaClosureLineAdjustment | null) {
  if (!adjustment || typeof adjustment.studentCount !== "number" || !Number.isFinite(adjustment.studentCount)) return;
  const config = ACTA_CLOSURE_LINE_CONFIGS[adjustment.kind];
  const drawingPaths = Object.keys(zip.files).filter((path) => /^xl\/drawings\/drawing\d+\.xml$/i.test(path));
  for (const drawingPath of drawingPaths) {
    const file = zip.file(drawingPath);
    const xml = await file?.async("string");
    if (!file || !xml || !/<xdr:twoCellAnchor>/i.test(xml)) continue;
    const nextXml = adjustActaStudentClosureLineAnchor(xml, adjustment.studentCount, config);
    if (nextXml !== xml) zip.file(drawingPath, nextXml);
  }
}

function shiftCellRefsInXmlFragment(xml: string, startRow: number, offset: number) {
  if (offset === 0) return xml;
  return xml.replace(/(\$?[A-Z]{1,3}\$?)(\d+)/g, (match, column: string, rowValue: string) => {
    const row = Number(rowValue);
    if (!Number.isFinite(row) || row < startRow) return match;
    return `${column}${row + offset}`;
  });
}

function shiftWorksheetRows(xml: string, startRow: number, offset: number) {
  if (offset <= 0) return xml;
  let nextXml = xml.replace(/<row\b[^>]*(?:\/>|>[\s\S]*?<\/row>)/gi, (rowXml) => {
    const rowTag = rowXml.match(/^<row\b[^>]*>/i)?.[0] ?? rowXml.match(/^<row\b[^>]*\/>/i)?.[0] ?? "";
    const row = Number(parseAttributes(rowTag).get("r"));
    if (!Number.isFinite(row) || row < startRow) return rowXml;
    const nextRowXml = shiftCellRefsInXmlFragment(rowXml, startRow, offset);
    return nextRowXml.replace(/^<row\b[^>]*>/i, (tag) => setXmlAttribute(tag, "r", String(row + offset)));
  });

  nextXml = nextXml.replace(/<mergeCells\b[^>]*>[\s\S]*?<\/mergeCells>/i, (section) =>
    shiftCellRefsInXmlFragment(section, startRow, offset),
  );
  nextXml = nextXml.replace(/<dimension\b[^>]*\/>/i, (tag) =>
    shiftCellRefsInXmlFragment(tag, startRow, offset),
  );
  return nextXml;
}

function expandPrintAreaRows(printAreaRange: string, rowOffset: number) {
  if (rowOffset <= 0 || !printAreaRange) return printAreaRange;
  return printAreaRange.replace(/(\$?[A-Z]{1,3}\$?)(\d+)\s*$/i, (match, column: string, rowValue: string) => {
    const row = Number(rowValue);
    return Number.isFinite(row) ? `${column}${row + rowOffset}` : match;
  });
}

function rowXmlByNumber(xml: string, row: number) {
  const regex = new RegExp(`<row\\b[^>]*\\br="${row}"[^>]*(?:/>|>[\\s\\S]*?</row>)`, "i");
  return xml.match(regex)?.[0] ?? null;
}

function cloneRowXml(rowXml: string, fromRow: number, toRow: number) {
  const shifted = shiftCellRefsInXmlFragment(rowXml, fromRow, toRow - fromRow);
  return shifted.replace(/^<row\b[^>]*>/i, (tag) => setXmlAttribute(tag, "r", String(toRow)));
}

function insertRowsAfter(xml: string, afterRow: number, rows: string[]) {
  if (rows.length === 0) return xml;
  const existingRow = rowXmlByNumber(xml, afterRow);
  if (!existingRow) return xml.replace(/<\/sheetData>/i, `${rows.join("")}</sheetData>`);
  const index = xml.indexOf(existingRow);
  const insertAt = index + existingRow.length;
  return `${xml.slice(0, insertAt)}${rows.join("")}${xml.slice(insertAt)}`;
}

function removeWorksheetMergeRanges(xml: string, predicate: (range: string) => boolean) {
  const mergeCellsRegex = /<mergeCells\b[^>]*>[\s\S]*?<\/mergeCells>/i;
  const match = xml.match(mergeCellsRegex);
  if (!match?.[0]) return xml;
  const kept = (match[0].match(/<mergeCell\b[^>]*\/>/gi) ?? [])
    .filter((tag) => !predicate((parseAttributes(tag).get("ref") || "").toUpperCase()));
  if (kept.length === 0) {
    return `${xml.slice(0, match.index)}${xml.slice((match.index ?? 0) + match[0].length)}`;
  }
  const nextSection = `<mergeCells count="${kept.length}">${kept.join("")}</mergeCells>`;
  return `${xml.slice(0, match.index)}${nextSection}${xml.slice((match.index ?? 0) + match[0].length)}`;
}

function setRowHeight(xml: string, row: number, heightPoints: number) {
  const normalizedHeight = Math.max(1, heightPoints);
  const regex = new RegExp(`<row\\b[^>]*\\br="${row}"[^>]*(?:/>|>[\\s\\S]*?</row>)`, "i");
  if (regex.test(xml)) {
    return xml.replace(regex, (rowXml) =>
      rowXml.replace(/^<row\b[^>]*(?:\/>|>)/i, (tag) =>
        setXmlAttribute(setXmlAttribute(tag, "ht", normalizedHeight.toFixed(2)), "customHeight", "1"),
      ),
    );
  }
  const newRow = `<row r="${row}" ht="${normalizedHeight.toFixed(2)}" customHeight="1"/>`;
  return xml.replace(/<\/sheetData>/i, `${newRow}</sheetData>`);
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
  const isOpcionCapacidadHeader = (row === 7 || row === 41)
    && currentColumn >= columnIndex("L")
    && currentColumn <= columnIndex("U");
  if (!isProgramUnitHeader && !isOpcionCapacidadHeader) return null;

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

function nextRelationshipId(relsXml: string) {
  let max = 0;
  for (const rel of relsXml.match(/<Relationship\b[^>]*>/g) ?? []) {
    const id = parseAttributes(rel).get("Id") || "";
    const number = Number(/^rId(\d+)$/i.exec(id)?.[1] ?? 0);
    if (Number.isFinite(number)) max = Math.max(max, number);
  }
  return `rId${max + 1}`;
}

function nextDrawingObjectId(drawingXml: string) {
  let max = 0;
  for (const tag of drawingXml.match(/<xdr:cNvPr\b[^>]*>/g) ?? []) {
    const id = Number(parseAttributes(tag).get("id") ?? 0);
    if (Number.isFinite(id)) max = Math.max(max, id);
  }
  return max + 1;
}

function nextMediaImagePath(zip: JSZip, extension = "png") {
  let max = 0;
  for (const filePath of Object.keys(zip.files)) {
    const number = Number(new RegExp(`^xl/media/image(\\d+)\\.${extension}$`, "i").exec(filePath)?.[1] ?? 0);
    if (Number.isFinite(number)) max = Math.max(max, number);
  }
  return `xl/media/image${max + 1}.${extension}`;
}

async function fetchImageBuffer(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`No se pudo descargar la imagen. HTTP ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function prepareContainedPng(buffer: Buffer, widthPx: number, heightPx: number) {
  return sharp(buffer)
    .rotate()
    .resize(widthPx, heightPx, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .png()
    .toBuffer();
}

async function addCertificateAvatarImage(zip: JSZip, avatarUrl: string) {
  const cleanUrl = cleanText(avatarUrl);
  if (!cleanUrl) return;

  const drawingPath = "xl/drawings/drawing1.xml";
  const drawingRelsPath = "xl/drawings/_rels/drawing1.xml.rels";
  const drawingFile = zip.file(drawingPath);
  const relsFile = zip.file(drawingRelsPath);
  let drawingXml = await drawingFile?.async("string");
  let relsXml = await relsFile?.async("string");
  if (!drawingFile || !relsFile || !drawingXml || !relsXml) return;

  const shapeAnchor = drawingXml.match(/<xdr:oneCellAnchor>[\s\S]*?<xdr:sp\b[\s\S]*?<\/xdr:oneCellAnchor>/i)?.[0];
  const from = shapeAnchor?.match(/<xdr:from>[\s\S]*?<\/xdr:from>/i)?.[0];
  const ext = shapeAnchor?.match(/<xdr:ext\b[^>]*\/>/i)?.[0];
  const transform = shapeAnchor?.match(/<a:xfrm>[\s\S]*?<\/a:xfrm>/i)?.[0];
  if (!shapeAnchor || !from || !ext) return;

  const extAttrs = parseAttributes(ext);
  const widthEmu = Number(extAttrs.get("cx"));
  const heightEmu = Number(extAttrs.get("cy"));
  if (!Number.isFinite(widthEmu) || !Number.isFinite(heightEmu) || widthEmu <= 0 || heightEmu <= 0) return;

  try {
    const imageBuffer = await fetchImageBuffer(cleanUrl);
    const widthPx = Math.max(1, Math.round(widthEmu / 9525));
    const heightPx = Math.max(1, Math.round(heightEmu / 9525));
    const pngBuffer = await prepareContainedPng(imageBuffer, widthPx, heightPx);
    const mediaPath = nextMediaImagePath(zip, "png");
    const relId = nextRelationshipId(relsXml);
    const objectId = nextDrawingObjectId(drawingXml);

    zip.file(mediaPath, pngBuffer);
    const target = `../media/${basename(mediaPath)}`;
    const rel = `<Relationship Id="${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${xmlEscape(target)}"/>`;
    relsXml = relsXml.replace(/<\/Relationships>\s*$/i, `${rel}</Relationships>`);

    const xfrm = transform || `<a:xfrm><a:off x="0" y="0"/><a:ext cx="${widthEmu}" cy="${heightEmu}"/></a:xfrm>`;
    const pic = `<xdr:oneCellAnchor>${from}${ext}<xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${objectId}" name="avatar-certificado.png"/><xdr:cNvPicPr preferRelativeResize="0"/></xdr:nvPicPr><xdr:blipFill><a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="${relId}" cstate="print"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr>${xfrm}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></xdr:spPr></xdr:pic><xdr:clientData fLocksWithSheet="0"/></xdr:oneCellAnchor>`;
    drawingXml = drawingXml.replace(/<\/xdr:wsDr>\s*$/i, `${pic}</xdr:wsDr>`);

    zip.file(drawingPath, drawingXml);
    zip.file(drawingRelsPath, relsXml);
  } catch (error) {
    console.warn("No se pudo insertar el avatar en el certificado.", {
      message: String((error as { message?: string } | null)?.message || error),
    });
  }
}

async function applyExcelUpdates(
  templateBuffer: Buffer,
  updates: SpreadsheetUpdate[],
  printScale = 83,
  normalizeProgramaStyles = false,
  printOrientation?: "landscape" | "portrait",
  forcePrintScale = false,
  paperSize = "9",
  fitToPageWidth = false,
  adjustProgramUnitHeaders = false,
  preservePageLayout = false,
  tokenReplacements: TemplateTokenReplacements = {},
  actaClosureLineAdjustment?: ActaClosureLineAdjustment | null,
) {
  const zip = await JSZip.loadAsync(templateBuffer);
  await replaceTemplateTokensInWorkbook(zip, tokenReplacements);
  await adjustActaStudentClosureLine(zip, actaClosureLineAdjustment);
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
  if (!preservePageLayout) {
    nextXml = ensureWorksheetPrintSetup(nextXml, printScale, printOrientation, forcePrintScale, paperSize, fitToPageWidth);
  }
  zip.file(worksheet.path, nextXml);
  sharedStrings.save();
  leftIndentStyles.save();
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

async function applyCertificatePlanEstudiosUpdates(
  templateBuffer: Buffer,
  tokenReplacements: TemplateTokenReplacements,
  unitRows: CertificateUnitTableRow[],
  avatarUrl: string,
) {
  const zip = await JSZip.loadAsync(templateBuffer);
  await replaceTemplateTokensInWorkbook(zip, tokenReplacements);
  await addCertificateAvatarImage(zip, avatarUrl);

  const worksheet = await getFirstVisibleWorksheet(zip);
  const sharedStrings = await createSharedStringWriter(zip);
  const sheetFile = zip.file(worksheet.path);
  const originalXml = await sheetFile?.async("string");
  if (!sheetFile || !originalXml) throw new Error(`No se pudo leer la hoja ${worksheet.path}.`);

  const baseRows = 3;
  const rowCount = Math.max(baseRows, unitRows.length || 1);
  const extraRows = Math.max(0, rowCount - baseRows);
  const firstDataRow = 39;
  const lastDataRow = firstDataRow + rowCount - 1;
  const totalsRow = lastDataRow + 1;
  let nextXml = extraRows > 0 ? shiftWorksheetRows(originalXml, 42, extraRows) : originalXml;

  if (extraRows > 0) {
    const templateRow = rowXmlByNumber(nextXml, 41);
    const rowsToInsert = templateRow
      ? Array.from({ length: extraRows }, (_, index) => cloneRowXml(templateRow, 41, 42 + index))
      : [];
    nextXml = insertRowsAfter(nextXml, 41, rowsToInsert);
  }

  nextXml = removeWorksheetMergeRanges(nextXml, (range) => /^A39:A\d+$/i.test(range));
  nextXml = addWorksheetMergeRange(nextXml, `A39:A${totalsRow}`);
  for (let row = firstDataRow; row <= lastDataRow; row += 1) {
    nextXml = addWorksheetMergeRange(nextXml, `B${row}:C${row}`);
    nextXml = addWorksheetMergeRange(nextXml, `F${row}:H${row}`);
  }

  const weights = Array.from({ length: rowCount }, (_, index) => certificateRowWeight(unitRows[index] ?? {
    competencia: "",
    unidad: "",
    creditos: "",
    horas: "",
    capacidades: "",
    nota: "",
  }));
  const totalWeight = weights.reduce((sum, value) => sum + value, 0) || 1;
  const totalHeightPoints = 400 * 0.75;
  for (let index = 0; index < rowCount; index += 1) {
    nextXml = setRowHeight(nextXml, firstDataRow + index, totalHeightPoints * (weights[index] / totalWeight));
  }

  const competencia = cleanText(unitRows[0]?.competencia);
  for (let index = 0; index < rowCount; index += 1) {
    const row = firstDataRow + index;
    const item = unitRows[index] ?? {
      competencia,
      unidad: "",
      creditos: "",
      horas: "",
      capacidades: "",
      nota: "",
    };

    nextXml = setSheetCellValue(nextXml, `A${row}`, index === 0 ? competencia : "", sharedStrings.add);
    nextXml = setSheetCellValue(nextXml, `B${row}`, item.unidad, sharedStrings.add);
    nextXml = setSheetCellValue(nextXml, `D${row}`, item.creditos, sharedStrings.add);
    nextXml = setSheetCellValue(nextXml, `E${row}`, item.horas, sharedStrings.add);
    nextXml = setSheetCellValue(nextXml, `F${row}`, item.capacidades, sharedStrings.add);
    nextXml = setSheetCellValue(nextXml, `I${row}`, item.nota, sharedStrings.add);
  }

  nextXml = ensureWorksheetPrintSetup(nextXml, 95, "landscape", true, "9", false);
  zip.file(worksheet.path, nextXml);
  if (extraRows > 0) {
    const workbookXml = await zip.file("xl/workbook.xml")?.async("string");
    if (workbookXml) {
      const printArea = getWorkbookPrintArea(workbookXml);
      const expandedPrintArea = expandPrintAreaRows(printArea, extraRows);
      zip.file("xl/workbook.xml", upsertWorkbookPrintArea(workbookXml, worksheet.name, 0, expandedPrintArea));
    }
  }
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

function reportesOfficeConverterUrl() {
  return String(process.env.REPORTES_OFFICE_CONVERTER_URL || "").trim().replace(/\/+$/, "");
}

function reportesOfficeConverterUsesIam() {
  return ["1", "true", "yes", "on"].includes(
    String(process.env.REPORTES_OFFICE_CONVERTER_IAM || "").trim().toLowerCase(),
  );
}

function reportesPdfProvider(input?: unknown): ReportPdfProvider {
  void input;
  return "office";
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
  reportesPdfProvider(providerInput);
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
  const inicio = data.grupoModulo.inicio || data.semestre?.inicio || null;
  const fin = data.grupoModulo.fin || data.semestre?.fin || null;
  const turno = cleanText(data.grupoModulo.grupo?.turno?.nombre || data.grupoModulo.grupo?.turnoNombre || "");
  const nivel = cleanText(data.grupoModulo.modulo?.plan?.carrera?.nivel || "");
  const ciclo = cleanText(data.grupoModulo.modulo?.plan?.carrera?.ciclo || nivel);
  const semestre = cleanText(data.semestre?.titulo || data.grupoModulo.grupo?.semestre?.titulo || "");
  const resolucion = formatPlanResolucion(data.grupoModulo.modulo?.plan) || cleanText(datos.rd || "");
  const horas = data.grupoModulo.modulo?.horas ?? "";
  const creditos = data.grupoModulo.modulo?.creditos ?? "";
  const codigoModular = cleanText(datos.codigoModular || "");
  const docenteUpper = docente.toLocaleUpperCase("es-PE");
  const directorUpper = director.toLocaleUpperCase("es-PE");
  const coordinadorUpper = coordinador.toLocaleUpperCase("es-PE");

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
    addCell(updates, sheetName, "AE7", ciclo.toLocaleUpperCase("es-PE"));
    addCell(updates, sheetName, "AE8", modulo);
    addCell(updates, sheetName, "Z12", formatActaOpcionResolucion(resolucion));
    addCell(updates, sheetName, "AF13", turno);
    addCell(updates, sheetName, "AF14", data.seccion);
    addCell(updates, sheetName, "AF15", formatHoras(horas));
    addCell(updates, sheetName, "AF16", formatDate(inicio));
    addCell(updates, sheetName, "AJ16", formatDate(fin));
    addCell(updates, sheetName, "B68", modulo);
    addCell(updates, sheetName, "J68", docenteUpper);
    addCell(updates, sheetName, "L81", docenteUpper ? `LIC. ${docenteUpper}` : "LIC. ");
    addCell(updates, sheetName, "W81", directorUpper ? `LIC. ${directorUpper}` : "LIC. ");
    return;
  }

  addCell(updates, sheetName, "F6", codigoModular);
  addCell(updates, sheetName, "AO5", carrera.toLocaleUpperCase("es-PE"));
  addCell(updates, sheetName, "AO6", modulo);
  addCell(updates, sheetName, "AO7", nivel.toLocaleUpperCase("es-PE"));
  addCell(updates, sheetName, "AO8", semestre);
  addCell(updates, sheetName, "AO9", data.seccion);
  addCell(updates, sheetName, "AO10", turno);
  addCell(updates, sheetName, "AO11", formatDate(inicio));
  addCell(updates, sheetName, "AO12", formatDate(fin));
  addCell(updates, sheetName, "W41", creditos);
  addCell(updates, sheetName, "W42", horas);
  addCell(updates, sheetName, "AH12", data.grupoModulo.modulo?.creditosEfsrt ?? "");
  addCell(updates, sheetName, "AH13", data.grupoModulo.modulo?.duracionEfsrt ?? "");
  addCell(updates, sheetName, "AH41", data.grupoModulo.modulo?.creditosEfsrt ?? "");
  addCell(updates, sheetName, "AH42", data.grupoModulo.modulo?.duracionEfsrt ?? "");
  addCell(updates, sheetName, "C74", directorUpper ? `LIC. ${directorUpper}\nDIRECTOR` : "LIC. \nDIRECTOR");
  addCell(updates, sheetName, "R74", coordinadorUpper ? `LIC. ${coordinadorUpper}\nCOORDINADORA` : "LIC. \nCOORDINADORA");
  addCell(updates, sheetName, "AI74", docenteUpper ? `LIC. ${docenteUpper}` : "LIC. ");
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
  addCell(updates, sheetName, "V49", 0);
  addCell(updates, sheetName, "W49", 0);
  addCell(updates, sheetName, "Y49", students.length);
  addCell(updates, sheetName, "E51", `S.M.P., ${getDocumentDateLong(data, "nomina")}`);
}

function fillProgramaActa(updates: SpreadsheetUpdate[], sheetName: string, data: ReporteDocumentoData) {
  fillInstitutionHeader(updates, sheetName, data, "acta");
  const unitColumns = ["X", "Y", "Z", "AA", "AB", "AC"];
  const unitMap = unidadPromedioMap(data);
  const efsrtMap = efsrtPromedioMap(data);
  const units = data.unidades.slice(0, unitColumns.length);
  const clearStudentRow = (row: number) => {
    ["B", "F", ...unitColumns, "AF", "AG", "AH", "AI", "AJ", "AK", "AM", "AO"].forEach((column) => {
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
  const getStudentUnitGrades = (student: ReporteEstudiante) => units.map((unit) => unitMap.get(`${student.matriculaId}:${unit.id}`));
  const hasStudentAnyGrade = (student: ReporteEstudiante) => {
    const unitGrades = getStudentUnitGrades(student);
    const efsrt = efsrtMap.get(student.id);
    return hasFiniteGrade(unitGrades) || (typeof efsrt === "number" && Number.isFinite(efsrt));
  };
  students.forEach((student, index) => {
    const row = index < 20 ? 14 + index : 43 + (index - 20);
    addCell(updates, sheetName, `B${row}`, student.matricula?.user?.dni || student.matricula?.codigoInscripcion || "");
    addCell(updates, sheetName, `F${row}`, getStudentName(student));
    const efsrt = efsrtMap.get(student.id);
    const unitGrades = getStudentUnitGrades(student);
    const hasAnyGrade = hasStudentAnyGrade(student);
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
    const condition: string = !hasAnyGrade ? "R" : disapprovedUnits > 0 ? "D" : "A";
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
    addCell(updates, sheetName, `${column}67`, data.estudiantes.filter((student) => !hasStudentAnyGrade(student)).length);
  });
}

function fillOpcionActa(updates: SpreadsheetUpdate[], sheetName: string, data: ReporteDocumentoData) {
  fillInstitutionHeader(updates, sheetName, data, "acta");
  const capacidadColumns = ["L", "M", "N", "O", "P", "Q", "R", "S", "T", "U"];
  const capacidadMap = capacidadPromedioMap(data);
  const unidadMap = unidadPromedioMap(data);
  const capacidades = data.capacidades.slice(0, capacidadColumns.length);
  const studentResults = new Map<number, { puntaje: number | null; promedio: number | null }>();
  const getStudentCapacidadGrades = (student: ReporteEstudiante) => (
    capacidades.map((capacidad) => capacidadMap.get(`${student.matriculaId}:${capacidad.id}`))
  );
  const getStudentCondition = (student: ReporteEstudiante) => {
    const notas = getStudentCapacidadGrades(student);
    if (!hasFiniteGrade(notas)) return "R";
    return getCondition(studentResults.get(student.id)?.promedio);
  };

  for (const student of data.estudiantes) {
    const unitGrades = data.unidades.map((unit) => unidadMap.get(`${student.matriculaId}:${unit.id}`));
    studentResults.set(student.id, {
      puntaje: sumGrades(unitGrades),
      promedio: averageGrades(unitGrades),
    });
  }

  capacidades.forEach((capacidad, index) => {
    const value = cleanText(capacidad.sigla || capacidad.descripcion || "");
    addCell(updates, sheetName, `${capacidadColumns[index]}7`, value);
    addCell(updates, sheetName, `${capacidadColumns[index]}42`, value);
  });

  const students = data.estudiantes.slice(0, 30);
  students.forEach((student, index) => {
    const row = index < 20 ? 20 + index : 55 + (index - 20);
    addCell(updates, sheetName, `B${row}`, index + 1);
    addCell(updates, sheetName, `C${row}`, "G");
    addCell(updates, sheetName, `D${row}`, student.matricula?.codigoInscripcion || "");
    addCell(updates, sheetName, `G${row}`, getStudentName(student));
    const notas = getStudentCapacidadGrades(student);
    const hasNotas = hasFiniteGrade(notas);
    capacidades.forEach((_capacidad, capacidadIndex) => {
      const column = capacidadColumns[capacidadIndex];
      if (!hasNotas && capacidadIndex === 0) {
        addCell(updates, sheetName, `${column}${row}`, "RETIRADO POR INASISTENCIA");
        return;
      }
      addCell(updates, sheetName, `${column}${row}`, hasNotas ? formatGrade(notas[capacidadIndex]) : "");
    });
    const result = studentResults.get(student.id);
    addCell(updates, sheetName, `V${row}`, formatGrade(result?.puntaje));
    addCell(updates, sheetName, `W${row}`, formatGrade(result?.promedio));
    const condition = getStudentCondition(student);
    addCell(updates, sheetName, `X${row}`, condition === "A" ? "X" : "");
    addCell(updates, sheetName, `Z${row}`, condition === "D" ? "X" : "");
    addCell(updates, sheetName, `AC${row}`, condition === "R" ? "X" : "");
  });
  for (let index = students.length; index < 30; index += 1) {
    const row = index < 20 ? 20 + index : 55 + (index - 20);
    ["C", "D", "G", ...capacidadColumns, "V", "W", "X", "Z", "AC"].forEach((column) => {
      addCell(updates, sheetName, `${column}${row}`, "");
    });
  }
  addCell(updates, sheetName, "AH43", students.length);
  addCell(updates, sheetName, "AH45", students.filter((student) => getStudentCondition(student) === "A").length);
  addCell(updates, sheetName, "AH47", students.filter((student) => getStudentCondition(student) === "D").length);
  addCell(updates, sheetName, "AH49", students.filter((student) => getStudentCondition(student) === "R").length);
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

function certificadoTituloTipo(input?: unknown): CertificadoTituloTipo {
  return String(input || "certificado").toLowerCase() === "titulo" ? "titulo" : "certificado";
}

function certificadoItemKey(item: { grupoModuloId: number; moduloEstudianteId: number }) {
  return `${item.grupoModuloId}:${item.moduloEstudianteId}`;
}

function certificadoTituloStorageBase(tipoDocumento: CertificadoTituloTipo, grupoModuloId: number, moduloEstudianteId: number) {
  return `documentos/certificados-titulos/${tipoDocumento}-${grupoModuloId}-${moduloEstudianteId}`;
}

type CertificateUnitTableRow = {
  competencia: string;
  unidad: string;
  creditos: string | number;
  horas: string | number;
  capacidades: string;
  nota: string | number;
};

function buildCertificateUnitRows(data: ReporteDocumentoData, student: ReporteEstudiante): CertificateUnitTableRow[] {
  const unitMap = unidadPromedioMap(data);
  const capacitiesByUnit = new Map<number, string[]>();
  for (const capacidad of data.capacidades) {
    if (!capacidad.unidadDidacticaId) continue;
    const current = capacitiesByUnit.get(capacidad.unidadDidacticaId) ?? [];
    const description = cleanText(capacidad.descripcion || capacidad.sigla || "");
    if (description) current.push(description);
    capacitiesByUnit.set(capacidad.unidadDidacticaId, current);
  }

  const competencia = cleanText(data.grupoModulo.modulo?.competencia);
  return data.unidades.map((unit) => ({
    competencia,
    unidad: cleanText(unit.nombre || unit.sigla || ""),
    creditos: unit.creditos ?? "",
    horas: unit.duracion ?? "",
    capacidades: (capacitiesByUnit.get(unit.id) ?? []).map((value) => `• ${value}`).join("\n\n"),
    nota: formatGrade(unitMap.get(`${student.matriculaId}:${unit.id}`)),
  }));
}

function certificateRowWeight(row: CertificateUnitTableRow) {
  const text = cleanText(row.capacidades);
  const lineCount = row.capacidades.split(/\n+/).filter((line) => cleanText(line)).length;
  return Math.max(1, text.length / 90, lineCount * 0.9);
}

function buildCertificateTokens(
  data: ReporteDocumentoData,
  student: ReporteEstudiante,
  avatarUrl: string,
) {
  const unitMap = unidadPromedioMap(data);
  const capacitiesByUnit = new Map<number, string[]>();
  for (const capacidad of data.capacidades) {
    if (!capacidad.unidadDidacticaId) continue;
    const current = capacitiesByUnit.get(capacidad.unidadDidacticaId) ?? [];
    current.push(cleanText(capacidad.descripcion || capacidad.sigla || ""));
    capacitiesByUnit.set(capacidad.unidadDidacticaId, current);
  }
  const units = data.unidades;
  const creditos = units.map((unit) => unit.creditos ?? "");
  const horas = units.map((unit) => unit.duracion ?? "");
  const sumaCreditos = units.reduce<number>((sum, unit) => sum + toNumber(unit.creditos, 0), 0);
  const sumaHoras = units.reduce<number>((sum, unit) => sum + toNumber(unit.duracion, 0), 0);
  const notas = units.map((unit) => formatGrade(unitMap.get(`${student.matriculaId}:${unit.id}`)));
  const capacidades = units.map((unit) => (capacitiesByUnit.get(unit.id) ?? []).filter(Boolean).join("; "));

  return {
    "[APELLIDO PATERNO APELLIDO MATERNO, Nombres]": getStudentName(student),
    "[codigo inscripcion]": cleanText(student.matricula?.codigoInscripcion || student.matricula?.user?.dni || ""),
    "[NOMBRE MODULO]": getModuloDocumentName(data.grupoModulo).toLocaleUpperCase("es-PE"),
    "[CARRERA]": getCarreraName(data.grupoModulo).toLocaleUpperCase("es-PE"),
    "[INICIO MODULO]": formatDate(data.grupoModulo.inicio || data.semestre?.inicio),
    "[FIN MODULO]": formatDate(data.grupoModulo.fin || data.semestre?.fin),
    "[CREDITOS MODULO]": data.grupoModulo.modulo?.creditos ?? "",
    "[HORAS MODULO]": data.grupoModulo.modulo?.horas ?? "",
    "[fecha actual larga]": getDocumentDateLong(data, "certificado"),
    "[director]": getPersonalName(data.semestre?.director),
    "[UNIDAD DE COMPETENCIA]": cleanText(data.grupoModulo.modulo?.competencia),
    "[UNIDAD DIDACTICA 1]": units.map((unit) => cleanText(unit.nombre || unit.sigla || "")).join("\n"),
    "[suma creditos]": sumaCreditos,
    "[suma horas]": sumaHoras,
    "[creditos unidad didactica]": creditos.join("\n"),
    "[horas unidad didactica]": horas.join("\n"),
    "[nota unidad didactica]": notas.join("\n"),
    "[Capacidades de la unidad]": capacidades.join("\n"),
    "[avatar]": cleanText(avatarUrl),
  };
}

async function buildCertificadoTituloRows() {
  const [response, semestreConsultaIds] = await Promise.all([
    dataConnect.executeGraphql<{
    semestres: ReporteSemestre[];
    efsrtPppEstudiantes: Array<{
      promedioFinal?: number | null;
      grupoModuloId: number;
      moduloEstudianteId: number;
      grupoModulo: ReporteGrupoModuloOption | null;
      moduloEstudiante: {
        id: number;
        matriculaId: number;
        matricula?: {
          id: number;
          archivado?: boolean | null;
          codigoInscripcion?: string | null;
          user?: {
            id: number;
            username?: string | null;
            nombre?: string | null;
            apellidos?: string | null;
            apellidoPaterno?: string | null;
            apellidoMaterno?: string | null;
            dni?: string | null;
          } | null;
        } | null;
      } | null;
    }>;
    certificadoTituloDocumentos: CertificadoTituloDocumento[];
  }, Record<string, never>>(CERTIFICADOS_TITULOS_OPTIONS_QUERY),
    getConfiguredSemestreConsultaIds(),
  ]);
  const allowedSemestreIds = semestreConsultaIds.length > 0 ? new Set(semestreConsultaIds) : null;

  const rows: CertificadoTituloRow[] = [];
  const grupoModuloById = new Map<number, {
    id: number;
    nombre: string;
    semestreId: number | null;
    semestreTitulo: string | null;
    moduloNombre: string;
  }>();

  for (const item of response.data.efsrtPppEstudiantes ?? []) {
    const promedioFinal = Number(item.promedioFinal);
    if (!Number.isFinite(promedioFinal) || promedioFinal < 13) continue;
    if (!item.grupoModulo || !item.moduloEstudiante || item.moduloEstudiante.matricula?.archivado) continue;

    const grupoModulo = item.grupoModulo;
    const semestreId = grupoModulo.grupo?.semestreId ?? null;
    if (allowedSemestreIds && !allowedSemestreIds.has(Number(semestreId))) continue;
    const semestreTitulo = grupoModulo.grupo?.semestre?.titulo ?? null;
    const codigo = semestreCodigo(semestreTitulo);
    const user = item.moduloEstudiante.matricula?.user ?? null;
    const moduloNombre = getModuloDocumentName(grupoModulo);
    const grupoNombre = certificadoGrupoModuloLabel(grupoModulo);
    grupoModuloById.set(grupoModulo.id, {
      id: grupoModulo.id,
      nombre: grupoNombre,
      semestreId: grupoModulo.grupo?.semestreId ?? null,
      semestreTitulo,
      moduloNombre,
    });
    rows.push({
      id: certificadoItemKey({ grupoModuloId: item.grupoModuloId, moduloEstudianteId: item.moduloEstudianteId }),
      grupoModuloId: item.grupoModuloId,
      moduloEstudianteId: item.moduloEstudianteId,
      matriculaId: item.moduloEstudiante.matriculaId,
      semestreId,
      semestreTitulo,
      semestreCodigo: codigo,
      estudianteNombre: getUserDisplayName(user) || `Matricula ${item.moduloEstudiante.matriculaId}`,
      apellidoPaterno: cleanText(user?.apellidoPaterno),
      dni: cleanText(user?.dni),
      grupoModuloNombre: grupoNombre,
      moduloNombre,
      promedioFinal,
    });
  }

  rows.sort((a, b) =>
    cleanText(a.semestreTitulo).localeCompare(cleanText(b.semestreTitulo), "es", { numeric: true })
    || cleanText(a.grupoModuloNombre).localeCompare(cleanText(b.grupoModuloNombre), "es", { numeric: true })
    || cleanText(a.estudianteNombre).localeCompare(cleanText(b.estudianteNombre), "es", { numeric: true }),
  );

  return {
    semestres: (response.data.semestres ?? []).filter((semestre) =>
      !allowedSemestreIds || allowedSemestreIds.has(semestre.id),
    ),
    grupoModulos: Array.from(grupoModuloById.values()).sort((a, b) =>
      cleanText(a.semestreTitulo).localeCompare(cleanText(b.semestreTitulo), "es", { numeric: true })
      || cleanText(a.nombre).localeCompare(cleanText(b.nombre), "es", { numeric: true }),
    ),
    estudiantes: rows,
    documentos: response.data.certificadoTituloDocumentos ?? [],
  };
}

async function generateCertificadoPlanEstudios(input: {
  grupoModuloId: number;
  moduloEstudianteId: number;
  pdfProvider?: ReportPdfProvider;
}) {
  dataHelpers.datosGenerales = await getDatosGeneralesGlobales();
  const data = await buildReporteData(input.grupoModuloId);
  if (data.opcionOcupacional) {
    throw new https.HttpsError("failed-precondition", "Por ahora el certificado esta configurado para Programas de Estudios.");
  }
  const student = data.estudiantes.find((item) => item.id === input.moduloEstudianteId);
  if (!student) {
    throw new https.HttpsError("not-found", "No se encontro el estudiante en el grupo-modulo.");
  }
  const promedioFinal = efsrtPromedioMap(data).get(input.moduloEstudianteId);
  if (typeof promedioFinal !== "number" || !Number.isFinite(promedioFinal) || promedioFinal < 13) {
    throw new https.HttpsError("failed-precondition", "El estudiante no tiene promedio aprobatorio para generar certificado.");
  }

  const { buffer: templateBuffer } = await ensureTemplateInStorage(TEMPLATES.certificadoPlanEstudios);
  const useAvatars = await getBooleanAppSetting(USE_AVATARS_IN_CERTIFICADOS_TITULOS_KEY, false);
  const avatarUrl = useAvatars ? cleanText(student.matricula?.user?.avatar || "") : "";
  const xlsxBuffer = await applyCertificatePlanEstudiosUpdates(
    templateBuffer,
    buildCertificateTokens(data, student, avatarUrl),
    buildCertificateUnitRows(data, student),
    avatarUrl,
  );

  const baseName = `certificado-${input.grupoModuloId}-${input.moduloEstudianteId}`;
  const pdfBuffer = await convertXlsxToPdf(xlsxBuffer, baseName, input.pdfProvider);
  const storageBase = certificadoTituloStorageBase("certificado", input.grupoModuloId, input.moduloEstudianteId);
  const pdf = await uploadBuffer(`${storageBase}.pdf`, pdfBuffer, "application/pdf");
  const excel = await uploadBuffer(
    `${storageBase}.xlsx`,
    xlsxBuffer,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  const documento = await upsertCertificadoTituloDocumento({
    tipoDocumento: "certificado",
    semestreCodigo: semestreCodigo(data.semestre?.titulo || data.grupoModulo.grupo?.semestre?.titulo),
    grupoModuloId: input.grupoModuloId,
    moduloEstudianteId: input.moduloEstudianteId,
    pdf,
    excel,
    generadoEn: new Date().toISOString(),
  });
  return { pdf, excel, documento };
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
    .sort((a, b) =>
      unidadIds.indexOf(a.unidadDidacticaId ?? -1) - unidadIds.indexOf(b.unidadDidacticaId ?? -1) ||
      getAcademicOrder(a) - getAcademicOrder(b) ||
      a.id - b.id,
    );
  const estudiantes = mergeReporteEstudiantesForGrupoModulo(
    grupoModuloId,
    response.data.modulosEstudiantesByGrupoModulo ?? [],
    response.data.modulosEstudiantesLegacy ?? [],
  )
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
    opcionOcupacional: usesOpcionOcupacionalRules(grupoModulo.modulo?.plan?.carrera?.tipoCarrera?.nombre),
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
  const firstName = cleanText(value || "Docente").split(/\s+/)[0] || "Docente";
  const base = firstName
    .replace(/[:\\/?*[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 31) || "Docente";
  let name = base;
  let index = 2;
  while (used.has(name.toLocaleLowerCase("es-PE"))) {
    const suffix = `${index}`;
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

function replaceXmlPart(xml: string, partRegex: RegExp, nextPart: string) {
  const match = xml.match(partRegex);
  if (!match?.[0]) return xml;
  return `${xml.slice(0, match.index)}${nextPart}${xml.slice((match.index ?? 0) + match[0].length)}`;
}

function updateXmlCountTag(sectionXml: string, count: number) {
  return sectionXml.replace(/^<\w+\b[^>]*>/i, (tag) => setXmlAttribute(tag, "count", String(count)));
}

function childTags(sectionXml: string, regex: RegExp) {
  return sectionXml.match(new RegExp(regex.source, "gi")) ?? [];
}

function parseSharedStringItems(xml: string | undefined): string[] {
  if (!xml) return [];
  return xml.match(/<si\b[^>]*>[\s\S]*?<\/si>/gi) ?? [];
}

function writeSharedStringItems(zip: JSZip, items: string[]) {
  const current = zip.file("xl/sharedStrings.xml");
  const content = current
    ? undefined
    : '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="0" uniqueCount="0"></sst>';

  return (async () => {
    const originalXml = await current?.async("string") ?? content ?? "";
    const nextXml = originalXml
      .replace(/<sst\b[^>]*>/i, (tag) =>
        setXmlAttribute(setXmlAttribute(tag, "count", String(items.length)), "uniqueCount", String(items.length)),
      )
      .replace(/<si\b[^>]*>[\s\S]*?<\/si>/gi, "")
      .replace(/<\/sst>\s*$/i, `${items.join("")}</sst>`);
    zip.file("xl/sharedStrings.xml", nextXml);
  })();
}

function remapSharedStringIndexes(sheetXml: string, indexMap: Map<number, number>) {
  return sheetXml.replace(/(<c\b[^>]*\bt="s"[^>]*>[\s\S]*?<v>)(\d+)(<\/v>[\s\S]*?<\/c>)/gi, (_match, start, rawIndex, end) => {
    const nextIndex = indexMap.get(Number(rawIndex));
    return `${start}${nextIndex ?? rawIndex}${end}`;
  });
}

function nextWorkbookRelId(relsXml: string) {
  let max = 0;
  for (const rel of relsXml.match(/<Relationship\b[^>]*>/g) ?? []) {
    const id = parseAttributes(rel).get("Id") ?? "";
    const numeric = Number(/^rId(\d+)$/i.exec(id)?.[1] ?? 0);
    if (numeric > max) max = numeric;
  }
  return `rId${max + 1}`;
}

function nextWorksheetNumber(zip: JSZip) {
  let max = 0;
  for (const path of Object.keys(zip.files)) {
    const numeric = Number(/^xl\/worksheets\/sheet(\d+)\.xml$/i.exec(path)?.[1] ?? 0);
    if (numeric > max) max = numeric;
  }
  return max + 1;
}

function maxSheetId(workbookXml: string) {
  let max = 0;
  for (const sheet of workbookXml.match(/<sheet\b[^>]*>/g) ?? []) {
    const numeric = Number(parseAttributes(sheet).get("sheetId") ?? 0);
    if (numeric > max) max = numeric;
  }
  return max;
}

function sheetCount(workbookXml: string) {
  return workbookXml.match(/<sheet\b[^>]*>/g)?.length ?? 0;
}

function xmlUnescape(value: string) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function definedNameRangeOnly(formula: string) {
  const cleanFormula = xmlUnescape(formula).trim();
  const separatorIndex = cleanFormula.indexOf("!");
  return separatorIndex >= 0 ? cleanFormula.slice(separatorIndex + 1) : cleanFormula;
}

function getWorkbookPrintArea(workbookXml: string) {
  for (const definedName of workbookXml.match(/<definedName\b[^>]*>[\s\S]*?<\/definedName>/gi) ?? []) {
    const startTag = definedName.match(/^<definedName\b[^>]*>/i)?.[0] ?? "";
    const attrs = parseAttributes(startTag);
    if (attrs.get("name") !== "_xlnm.Print_Area") continue;
    const value = definedName.replace(/^<definedName\b[^>]*>/i, "").replace(/<\/definedName>\s*$/i, "");
    return definedNameRangeOnly(value);
  }
  return "";
}

function upsertWorkbookPrintArea(workbookXml: string, sheetName: string, localSheetId: number, printAreaRange: string) {
  if (!printAreaRange) return workbookXml;
  const formula = `${quoteSheetName(sheetName)}!${printAreaRange}`;
  const entry = `<definedName name="_xlnm.Print_Area" localSheetId="${localSheetId}">${xmlEscape(formula)}</definedName>`;
  let replaced = false;
  const nextXml = workbookXml.replace(/<definedName\b[^>]*>[\s\S]*?<\/definedName>/gi, (definedName) => {
    const startTag = definedName.match(/^<definedName\b[^>]*>/i)?.[0] ?? "";
    const attrs = parseAttributes(startTag);
    const currentLocalSheetId = attrs.get("localSheetId") ?? "0";
    if (attrs.get("name") !== "_xlnm.Print_Area" || currentLocalSheetId !== String(localSheetId)) return definedName;
    replaced = true;
    return entry;
  });
  if (replaced) return nextXml;
  if (/<definedNames\b[^>]*>/i.test(workbookXml)) {
    return workbookXml.replace(/<\/definedNames>/i, `${entry}</definedNames>`);
  }
  return workbookXml.replace(/<\/sheets>/i, `</sheets><definedNames>${entry}</definedNames>`);
}

function ensureWorksheetContentType(contentTypesXml: string, sheetPath: string) {
  const partName = `/${sheetPath}`;
  if (contentTypesXml.includes(`PartName="${partName}"`)) return contentTypesXml;
  const override = `<Override PartName="${xmlEscape(partName)}" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`;
  return contentTypesXml.replace(/<\/Types>\s*$/i, `${override}</Types>`);
}

function contentTypeForPart(contentTypesXml: string, path: string) {
  const partName = `/${path}`;
  for (const override of contentTypesXml.match(/<Override\b[^>]*>/g) ?? []) {
    const attrs = parseAttributes(override);
    if (attrs.get("PartName") === partName) return { contentType: attrs.get("ContentType") ?? "", override: true };
  }
  const extension = path.includes(".") ? path.slice(path.lastIndexOf(".") + 1).toLowerCase() : "";
  for (const defaultType of contentTypesXml.match(/<Default\b[^>]*>/g) ?? []) {
    const attrs = parseAttributes(defaultType);
    if ((attrs.get("Extension") ?? "").toLowerCase() === extension) return { contentType: attrs.get("ContentType") ?? "", override: false };
  }
  return null;
}

function ensurePartContentType(contentTypesXml: string, path: string, sourceInfo: { contentType: string; override: boolean } | null) {
  if (!sourceInfo?.contentType) return contentTypesXml;
  const partName = `/${path}`;
  if (contentTypesXml.includes(`PartName="${partName}"`)) return contentTypesXml;
  if (!sourceInfo.override) {
    const extension = path.includes(".") ? path.slice(path.lastIndexOf(".") + 1).toLowerCase() : "";
    const hasDefault = (contentTypesXml.match(/<Default\b[^>]*>/g) ?? []).some((defaultType) =>
      (parseAttributes(defaultType).get("Extension") ?? "").toLowerCase() === extension,
    );
    if (hasDefault) return contentTypesXml;
    const defaultType = `<Default Extension="${xmlEscape(extension)}" ContentType="${xmlEscape(sourceInfo.contentType)}"/>`;
    return contentTypesXml.replace(/<Override\b/i, `${defaultType}<Override`);
  }
  const override = `<Override PartName="${xmlEscape(partName)}" ContentType="${xmlEscape(sourceInfo.contentType)}"/>`;
  return contentTypesXml.replace(/<\/Types>\s*$/i, `${override}</Types>`);
}

function getRelationTargets(relsXml: string, relsPath: string) {
  const targets: Array<{ id: string; target: string; normalized: string }> = [];
  for (const rel of relsXml.match(/<Relationship\b[^>]*>/g) ?? []) {
    const attrs = parseAttributes(rel);
    const id = attrs.get("Id");
    const target = attrs.get("Target");
    if (!id || !target || target.startsWith("http://") || target.startsWith("https://")) continue;
    targets.push({ id, target, normalized: normalizeZipPath(relsPath.replace("/_rels/", "/").replace(/\.rels$/i, ""), target) });
  }
  return targets;
}

function remapWorksheetStyleIndexes(sheetXml: string, styleMap: Map<number, number>) {
  return sheetXml.replace(/<c\b[^>]*>/gi, (tag) => {
    const attrs = parseAttributes(tag);
    const style = attrs.get("s");
    if (style === undefined) return tag;
    const nextStyle = styleMap.get(Number(style));
    return nextStyle === undefined ? tag : setXmlAttribute(tag, "s", String(nextStyle));
  });
}

function xmlSection(xml: string, name: string) {
  return xml.match(new RegExp(`<${name}\\b[^>]*>[\\s\\S]*?<\\/${name}>`, "i"))?.[0] ?? "";
}

function appendStyleSection(
  targetStylesXml: string,
  sourceStylesXml: string,
  sectionName: string,
  tagRegex: RegExp,
  transform: (tag: string, index: number) => string = (tag) => tag,
) {
  const targetSection = xmlSection(targetStylesXml, sectionName);
  const sourceSection = xmlSection(sourceStylesXml, sectionName);
  const targetTags = childTags(targetSection, tagRegex);
  const sourceTags = childTags(sourceSection, tagRegex);
  const offset = targetTags.length;
  const map = new Map<number, number>();
  sourceTags.forEach((_tag, index) => map.set(index, offset + index));
  if (!targetSection || sourceTags.length === 0) return { xml: targetStylesXml, map };
  const additions = sourceTags.map(transform).join("");
  const nextSection = updateXmlCountTag(
    targetSection.replace(new RegExp(`</${sectionName}>\\s*$`, "i"), `${additions}</${sectionName}>`),
    targetTags.length + sourceTags.length,
  );
  return { xml: replaceXmlPart(targetStylesXml, new RegExp(`<${sectionName}\\b[^>]*>[\\s\\S]*?<\\/${sectionName}>`, "i"), nextSection), map };
}

function appendNumFmts(targetStylesXml: string, sourceStylesXml: string) {
  const targetSection = xmlSection(targetStylesXml, "numFmts");
  const sourceSection = xmlSection(sourceStylesXml, "numFmts");
  const targetTags = targetSection.match(/<numFmt\b[^>]*\/>/gi) ?? [];
  const sourceTags = sourceSection.match(/<numFmt\b[^>]*\/>/gi) ?? [];
  const formatByCode = new Map<string, number>();
  let maxId = 163;
  for (const tag of targetTags) {
    const attrs = parseAttributes(tag);
    const id = Number(attrs.get("numFmtId") ?? 0);
    const code = attrs.get("formatCode") ?? "";
    if (id > maxId) maxId = id;
    if (code) formatByCode.set(code, id);
  }
  const map = new Map<number, number>();
  const additions: string[] = [];
  for (const tag of sourceTags) {
    const attrs = parseAttributes(tag);
    const oldId = Number(attrs.get("numFmtId") ?? 0);
    const code = attrs.get("formatCode") ?? "";
    if (!oldId || !code) continue;
    const existing = formatByCode.get(code);
    if (existing) {
      map.set(oldId, existing);
      continue;
    }
    maxId += 1;
    map.set(oldId, maxId);
    formatByCode.set(code, maxId);
    additions.push(setXmlAttribute(tag, "numFmtId", String(maxId)));
  }
  if (additions.length === 0) return { xml: targetStylesXml, map };
  if (!targetSection) {
    const section = `<numFmts count="${additions.length}">${additions.join("")}</numFmts>`;
    return { xml: targetStylesXml.replace(/<fonts\b/i, `${section}<fonts`), map };
  }
  const nextSection = updateXmlCountTag(
    targetSection.replace(/<\/numFmts>\s*$/i, `${additions.join("")}</numFmts>`),
    targetTags.length + additions.length,
  );
  return { xml: replaceXmlPart(targetStylesXml, /<numFmts\b[^>]*>[\s\S]*?<\/numFmts>/i, nextSection), map };
}

async function mergeWorkbookStyles(targetZip: JSZip, sourceZip: JSZip) {
  let targetStylesXml = await targetZip.file("xl/styles.xml")?.async("string");
  const sourceStylesXml = await sourceZip.file("xl/styles.xml")?.async("string");
  if (!targetStylesXml || !sourceStylesXml) return new Map<number, number>();

  const numFmtResult = appendNumFmts(targetStylesXml, sourceStylesXml);
  targetStylesXml = numFmtResult.xml;

  const fonts = appendStyleSection(targetStylesXml, sourceStylesXml, "fonts", FONT_XML_REGEX);
  targetStylesXml = fonts.xml;
  const fills = appendStyleSection(targetStylesXml, sourceStylesXml, "fills", /<fill\b[^>]*\/>|<fill\b[^>]*>[\s\S]*?<\/fill>/gi);
  targetStylesXml = fills.xml;
  const borders = appendStyleSection(targetStylesXml, sourceStylesXml, "borders", /<border\b[^>]*\/>|<border\b[^>]*>[\s\S]*?<\/border>/gi);
  targetStylesXml = borders.xml;
  const cellStyleXfs = appendStyleSection(targetStylesXml, sourceStylesXml, "cellStyleXfs", XF_XML_REGEX);
  targetStylesXml = cellStyleXfs.xml;

  const cellXfs = appendStyleSection(targetStylesXml, sourceStylesXml, "cellXfs", XF_XML_REGEX, (xf) => {
    let nextXf = xf;
    const attrs = parseAttributes(xf.match(/^<xf\b[^>]*>/i)?.[0] ?? xf);
    const fontId = attrs.get("fontId");
    const fillId = attrs.get("fillId");
    const borderId = attrs.get("borderId");
    const xfId = attrs.get("xfId");
    const numFmtId = attrs.get("numFmtId");
    if (fontId !== undefined) nextXf = setXmlAttribute(nextXf, "fontId", String(fonts.map.get(Number(fontId)) ?? fontId));
    if (fillId !== undefined) nextXf = setXmlAttribute(nextXf, "fillId", String(fills.map.get(Number(fillId)) ?? fillId));
    if (borderId !== undefined) nextXf = setXmlAttribute(nextXf, "borderId", String(borders.map.get(Number(borderId)) ?? borderId));
    if (xfId !== undefined) nextXf = setXmlAttribute(nextXf, "xfId", String(cellStyleXfs.map.get(Number(xfId)) ?? xfId));
    if (numFmtId !== undefined) nextXf = setXmlAttribute(nextXf, "numFmtId", String(numFmtResult.map.get(Number(numFmtId)) ?? numFmtId));
    return nextXf;
  });
  targetStylesXml = cellXfs.xml;
  targetZip.file("xl/styles.xml", targetStylesXml);
  return cellXfs.map;
}

async function copyWorksheetRels(
  targetZip: JSZip,
  sourceZip: JSZip,
  sourceSheetPath: string,
  targetSheetPath: string,
  targetSheetNumber: number,
  contentTypesXml: string,
) {
  const sourceRelsPath = sourceSheetPath.replace("xl/worksheets/", "xl/worksheets/_rels/") + ".rels";
  const sourceRelsXml = await sourceZip.file(sourceRelsPath)?.async("string");
  if (!sourceRelsXml) return contentTypesXml;
  const sourceContentTypesXml = await sourceZip.file("[Content_Types].xml")?.async("string") ?? "";

  let nextRelsXml = sourceRelsXml;
  for (const relation of getRelationTargets(sourceRelsXml, sourceRelsPath)) {
    const sourceFile = sourceZip.file(relation.normalized);
    const sourceBuffer = await sourceFile?.async("nodebuffer");
    if (!sourceFile || !sourceBuffer) continue;

    const extension = relation.normalized.includes(".") ? relation.normalized.slice(relation.normalized.lastIndexOf(".")) : "";
    let targetPath = relation.normalized;
    if (/^xl\/drawings\/drawing\d+\.xml$/i.test(relation.normalized)) {
      targetPath = `xl/drawings/drawing${targetSheetNumber}${extension}`;
    } else if (/^xl\/printerSettings\/printerSettings\d+\.bin$/i.test(relation.normalized)) {
      targetPath = `xl/printerSettings/printerSettings${targetSheetNumber}${extension}`;
    } else if (/^xl\/media\/image\d+\./i.test(relation.normalized)) {
      targetPath = `xl/media/image${targetSheetNumber}-${basename(relation.normalized)}`;
    }
    targetZip.file(targetPath, sourceBuffer);
    contentTypesXml = ensurePartContentType(contentTypesXml, targetPath, contentTypeForPart(sourceContentTypesXml, relation.normalized));
    nextRelsXml = nextRelsXml.replace(`Target="${relation.target}"`, `Target="${targetPath.startsWith("xl/") ? `../${targetPath.slice(3)}` : targetPath}"`);

    const nestedRelsPath = relation.normalized.replace(/\/([^/]+)$/i, "/_rels/$1.rels");
    const nestedRelsXml = await sourceZip.file(nestedRelsPath)?.async("string");
    if (nestedRelsXml) {
      let nextNestedRelsXml = nestedRelsXml;
      for (const nestedRelation of getRelationTargets(nestedRelsXml, nestedRelsPath)) {
        const nestedSourceFile = sourceZip.file(nestedRelation.normalized);
        const nestedSourceBuffer = await nestedSourceFile?.async("nodebuffer");
        if (!nestedSourceFile || !nestedSourceBuffer) continue;
        const nestedTargetPath = /^xl\/media\/image\d+\./i.test(nestedRelation.normalized)
          ? `xl/media/image${targetSheetNumber}-${basename(nestedRelation.normalized)}`
          : nestedRelation.normalized;
        targetZip.file(nestedTargetPath, nestedSourceBuffer);
        contentTypesXml = ensurePartContentType(contentTypesXml, nestedTargetPath, contentTypeForPart(sourceContentTypesXml, nestedRelation.normalized));
        nextNestedRelsXml = nextNestedRelsXml.replace(
          `Target="${nestedRelation.target}"`,
          `Target="${nestedTargetPath.startsWith("xl/") ? `../${nestedTargetPath.slice(3)}` : nestedTargetPath}"`,
        );
      }
      const targetNestedRelsPath = targetPath.replace(/\/([^/]+)$/i, "/_rels/$1.rels");
      targetZip.file(targetNestedRelsPath, nextNestedRelsXml);
    }
  }

  const targetRelsPath = targetSheetPath.replace("xl/worksheets/", "xl/worksheets/_rels/") + ".rels";
  targetZip.file(targetRelsPath, nextRelsXml);
  return contentTypesXml;
}

async function combineExcelBuffers(items: Array<{ buffer: Buffer; sheetName: string }>) {
  if (items.length === 0) {
    throw new https.HttpsError("invalid-argument", "No hay archivos Excel para combinar.");
  }

  const target = await JSZip.loadAsync(items[0].buffer);
  const usedNames = new Set<string>();
  const targetSharedStrings: string[] = parseSharedStringItems(await target.file("xl/sharedStrings.xml")?.async("string"));
  let workbookXml = await target.file("xl/workbook.xml")?.async("string");
  let workbookRelsXml = await target.file("xl/_rels/workbook.xml.rels")?.async("string");
  let contentTypesXml = await target.file("[Content_Types].xml")?.async("string");
  if (!workbookXml || !workbookRelsXml || !contentTypesXml) {
    throw new Error("El Excel base no tiene estructura valida.");
  }

  const firstName = safeWorksheetName(items[0].sheetName, usedNames);
  const firstPrintArea = getWorkbookPrintArea(workbookXml);
  workbookXml = workbookXml.replace(/<sheet\b[^>]*>/i, (sheetTag) => setXmlAttribute(sheetTag, "name", firstName));
  workbookXml = upsertWorkbookPrintArea(workbookXml, firstName, 0, firstPrintArea);

  for (const item of items.slice(1)) {
    const source = await JSZip.loadAsync(item.buffer);
    const sourceSheet = await getFirstVisibleWorksheet(source);
    const sourceSheetXml = await source.file(sourceSheet.path)?.async("string");
    if (!sourceSheetXml) continue;
    const sourceWorkbookXml = await source.file("xl/workbook.xml")?.async("string");
    const sourcePrintArea = sourceWorkbookXml ? getWorkbookPrintArea(sourceWorkbookXml) : "";

    const sourceSharedStrings = parseSharedStringItems(await source.file("xl/sharedStrings.xml")?.async("string"));
    const sharedStringMap = new Map<number, number>();
    sourceSharedStrings.forEach((sharedString, index) => {
      sharedStringMap.set(index, targetSharedStrings.length);
      targetSharedStrings.push(sharedString);
    });

    const styleMap = await mergeWorkbookStyles(target, source);
    const sheetNumber: number = nextWorksheetNumber(target);
    const sheetPath: string = `xl/worksheets/sheet${sheetNumber}.xml`;
    const sheetRelId: string = nextWorkbookRelId(workbookRelsXml);
    const sheetId: number = maxSheetId(workbookXml) + 1;
    const localSheetId: number = sheetCount(workbookXml);
    const sheetName: string = safeWorksheetName(item.sheetName, usedNames);
    const nextSheetXml: string = remapWorksheetStyleIndexes(remapSharedStringIndexes(sourceSheetXml, sharedStringMap), styleMap);

    target.file(sheetPath, nextSheetXml);
    contentTypesXml = await copyWorksheetRels(target, source, sourceSheet.path, sheetPath, sheetNumber, contentTypesXml);

    const sheetEntry: string = `<sheet name="${xmlEscape(sheetName)}" sheetId="${sheetId}" r:id="${sheetRelId}"/>`;
    workbookXml = workbookXml.replace(/<\/sheets>/i, `${sheetEntry}</sheets>`);
    workbookXml = upsertWorkbookPrintArea(workbookXml, sheetName, localSheetId, sourcePrintArea);
    const relEntry = `<Relationship Id="${sheetRelId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${sheetNumber}.xml"/>`;
    workbookRelsXml = workbookRelsXml.replace(/<\/Relationships>\s*$/i, `${relEntry}</Relationships>`);
    contentTypesXml = ensureWorksheetContentType(contentTypesXml, sheetPath);
  }

  target.file("xl/workbook.xml", workbookXml);
  target.file("xl/_rels/workbook.xml.rels", workbookRelsXml);
  target.file("[Content_Types].xml", contentTypesXml);
  if (targetSharedStrings.length > 0) await writeSharedStringItems(target, targetSharedStrings);

  return target.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
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
  const isNomina = input.tipoDocumento === "nomina";

  const xlsxBuffer = await applyExcelUpdates(
    templateBuffer,
    updates,
    printableScaleForDocument(input.tipoDocumento),
    input.tipoDocumento === "acta" && !reportes[0].opcionOcupacional,
    undefined,
    false,
    "9",
    false,
    isActaPrograma || isActaOpcion,
    isActaPrograma,
    {
      "[Nombre Carrera]": getCarreraName(reportes[0].grupoModulo),
      "[Nombre Modulo]": getModuloDocumentName(reportes[0].grupoModulo),
      "[ciclo]": reportes[0].grupoModulo.modulo?.plan?.carrera?.ciclo || reportes[0].grupoModulo.modulo?.plan?.carrera?.nivel || "",
      "[fecha larga]": getDocumentDateLong(reportes[0], input.tipoDocumento === "nomina" ? "nomina" : "acta"),
      "[Director]": getPersonalName(reportes[0].semestre?.director).toLocaleUpperCase("es-PE"),
      "[director]": getPersonalName(reportes[0].semestre?.director).toLocaleUpperCase("es-PE"),
      "[Coordinador1]": getPersonalName(reportes[0].semestre?.coordinador1).toLocaleUpperCase("es-PE"),
      "[coordinador1]": getPersonalName(reportes[0].semestre?.coordinador1).toLocaleUpperCase("es-PE"),
      "[Docente]": getPersonalName(reportes[0].grupoModulo.grupo?.personal).toLocaleUpperCase("es-PE"),
      "[docente]": getPersonalName(reportes[0].grupoModulo.grupo?.personal).toLocaleUpperCase("es-PE"),
    },
    isActaPrograma
      ? { kind: "programa", studentCount: Math.min(reportes[0].estudiantes.length, 40) }
      : isActaOpcion
        ? { kind: "opcion", studentCount: Math.min(reportes[0].estudiantes.length, 30) }
        : isNomina
          ? { kind: "nomina", studentCount: Math.min(reportes[0].estudiantes.length, 30) }
          : null,
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

  if (reason.includes("libreoffice") || reason.includes("openoffice") || reason.includes("soffice") || reason.includes("convertir el excel a pdf")) {
    return "No se pudo convertir el Excel a PDF. Instala LibreOffice/OpenOffice o configura REPORTES_OFFICE_BIN con la ruta de soffice.";
  }
  return message || "No se pudo generar el documento.";
}

function parseCertificadoTituloItems(input: unknown) {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const items: Array<{ grupoModuloId: number; moduloEstudianteId: number }> = [];
  for (const item of input as CertificadoTituloItemInput[]) {
    const grupoModuloId = toNumber(item?.grupoModuloId, 0);
    const moduloEstudianteId = toNumber(item?.moduloEstudianteId, 0);
    if (grupoModuloId <= 0 || moduloEstudianteId <= 0) continue;
    const key = certificadoItemKey({ grupoModuloId, moduloEstudianteId });
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({ grupoModuloId, moduloEstudianteId });
  }
  return items;
}

export const listReporteDocumentosOptions = https.onCall(async (_data, context) => {
  await requirePermission(context, "documentos-reportes", "view");

  try {
    await ensureAllTemplatesInStorage();

    const [response, documentos, semestreConsultaIds] = await Promise.all([
      dataConnect.executeGraphql<{
      semestres: Array<ReporteSemestre & { archivado?: boolean | null }>;
      grupoModulos: ReporteGrupoModuloOption[];
      }, Record<string, never>>(REPORTE_OPTIONS_QUERY, {}),
      listRegistrosAcademicosDocumentos(),
      getConfiguredSemestreConsultaIds(),
    ]);
    const allowedSemestreIds = semestreConsultaIds.length > 0 ? new Set(semestreConsultaIds) : null;

    const semestreIdsWithGrupoModulo = new Set(
      (response.data.grupoModulos ?? [])
        .map((item) => item.grupo?.semestreId)
        .filter((id): id is number =>
          typeof id === "number" &&
          Number.isFinite(id) &&
          (!allowedSemestreIds || allowedSemestreIds.has(id)),
        ),
    );
    const semestres = (response.data.semestres ?? [])
      .filter((semestre) => !semestre.archivado && semestreIdsWithGrupoModulo.has(semestre.id))
      .sort((a, b) => cleanText(b.titulo).localeCompare(cleanText(a.titulo), "es", { numeric: true }));
    const grupoModulos = (response.data.grupoModulos ?? [])
      .filter((item) => {
        const semestreId = item.grupo?.semestreId;
        return typeof semestreId === "number" && (!allowedSemestreIds || allowedSemestreIds.has(semestreId));
      })
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
        moduloNombre: grupoModuloDisplayName(item),
        tipoCarrera: item.modulo?.plan?.carrera?.tipoCarrera?.nombre ?? null,
      }));

    return { semestres, grupoModulos, documentos };
  } catch (error) {
    if (error instanceof https.HttpsError) throw error;
    console.error("Error in listReporteDocumentosOptions:", error);
    throw new https.HttpsError("internal", "No se pudieron cargar las opciones de reportes.");
  }
});

export const listCertificadosTitulosOptions = https.onCall(async (_data, context) => {
  await requirePermission(context, "certificados-titulos", "view");

  try {
    await ensureTemplateInStorage(TEMPLATES.certificadoPlanEstudios);
    return await buildCertificadoTituloRows();
  } catch (error) {
    if (error instanceof https.HttpsError) throw error;
    console.error("Error in listCertificadosTitulosOptions:", error);
    throw new https.HttpsError("internal", "No se pudieron cargar los certificados y titulos.");
  }
});

export const generateCertificadosTitulos = runWith({ timeoutSeconds: 180, memory: "1GB" }).https.onCall(async (data: CertificadoTituloInput, context) => {
  await requirePermission(context, "certificados-titulos", "create");

  const tipoDocumento = certificadoTituloTipo(data?.tipoDocumento);
  const items = parseCertificadoTituloItems(data?.items);
  const pdfProvider = reportesPdfProvider(data?.pdfProvider);
  if (items.length === 0) {
    throw new https.HttpsError("invalid-argument", "Selecciona al menos un estudiante.");
  }
  if (tipoDocumento === "titulo") {
    throw new https.HttpsError("failed-precondition", "La plantilla de titulos aun no esta configurada.");
  }

  try {
    const documentos: CertificadoTituloDocumento[] = [];
    for (const item of items) {
      const result = await generateCertificadoPlanEstudios({ ...item, pdfProvider });
      documentos.push(result.documento);
    }
    return { tipoDocumento, total: documentos.length, documentos };
  } catch (error) {
    if (error instanceof https.HttpsError) throw error;
    console.error("Error in generateCertificadosTitulos:", error);
    throw new https.HttpsError("failed-precondition", getReporteGenerationErrorMessage(error));
  }
});

export const descargarCertificadosTitulosSeleccionados = runWith({ timeoutSeconds: 180, memory: "1GB" }).https.onCall(async (data: DownloadCertificadosTitulosInput, context) => {
  await requirePermission(context, "certificados-titulos", "view");

  const tipoDocumento = certificadoTituloTipo(data?.tipoDocumento);
  const formato = String(data?.formato || "pdf").toLowerCase() === "excel" ? "excel" : "pdf";
  const items = parseCertificadoTituloItems(data?.items);
  if (items.length === 0) {
    throw new https.HttpsError("invalid-argument", "Selecciona al menos un estudiante.");
  }

  try {
    const [documentsResponse, options] = await Promise.all([
      dataConnect.executeGraphql<{ certificadoTituloDocumentos: CertificadoTituloDocumento[] }, Record<string, never>>(
        LIST_CERTIFICADO_TITULO_DOCUMENTOS_QUERY,
      ),
      buildCertificadoTituloRows(),
    ]);
    const documentoByKey = new Map(
      (documentsResponse.data.certificadoTituloDocumentos ?? [])
        .filter((documento) => documento.tipoDocumento === tipoDocumento)
        .map((documento) => [certificadoItemKey(documento), documento]),
    );
    const rowByKey = new Map(options.estudiantes.map((row) => [row.id, row]));
    const orderedDocuments = items.map((item) => documentoByKey.get(certificadoItemKey(item)) ?? null);
    const missingIndex = orderedDocuments.findIndex((documento) =>
      !documento || (formato === "pdf" ? !documento.pdfPath : !documento.excelPath),
    );
    if (missingIndex >= 0) {
      throw new https.HttpsError("failed-precondition", "Todos los estudiantes seleccionados deben tener documento generado.");
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    if (formato === "pdf") {
      const buffers = await Promise.all(orderedDocuments.map((documento) => downloadStorageBuffer(documento?.pdfPath ?? "")));
      const combined = await combinePdfBuffers(buffers);
      const file = await uploadBuffer(
        `documentos/certificados-titulos/lotes/${tipoDocumento}-${timestamp}.pdf`,
        combined,
        "application/pdf",
      );
      return { formato, file };
    }

    const usedNames = new Set<string>();
    const excelItems = await Promise.all(orderedDocuments.map(async (documento) => {
      const key = certificadoItemKey({
        grupoModuloId: documento?.grupoModuloId ?? 0,
        moduloEstudianteId: documento?.moduloEstudianteId ?? 0,
      });
      const row = rowByKey.get(key);
      return {
        buffer: await downloadStorageBuffer(documento?.excelPath ?? ""),
        sheetName: certificadoSheetName({ apellidoPaterno: row?.apellidoPaterno, dni: row?.dni }, usedNames),
      };
    }));
    const combined = await combineExcelBuffers(excelItems);
    const file = await uploadBuffer(
      `documentos/certificados-titulos/lotes/${tipoDocumento}-${timestamp}.xlsx`,
      combined,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    return { formato, file };
  } catch (error) {
    if (error instanceof https.HttpsError) throw error;
    console.error("Error in descargarCertificadosTitulosSeleccionados:", error);
    throw new https.HttpsError("internal", "No se pudo preparar la descarga.");
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
