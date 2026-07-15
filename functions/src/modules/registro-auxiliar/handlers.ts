import { https } from "firebase-functions/v1";
import { dataConnect } from "../core/dataConnectCore.js";
import {
  asNullableTimestamp,
  buildMatriculaDataFromInput,
  buildModuloEstudianteDataFromInput,
  buildUserDataFromInput,
  getIdFromKeyOutput,
  toNumber,
} from "../core/userMappers.js";
import { authAdmin, DEFAULT_LEVEL, STUDENT_ROLE_ID, TEACHER_ROLE_ID } from "../core/authCore.js";
import { getRoleById, upsertDataConnectUserByDocumentId } from "../core/dataConnectCore.js";
import {
  INSERT_MATRICULA_MUTATION,
  INSERT_MODULO_ESTUDIANTE_MUTATION,
  UPDATE_MATRICULA_MUTATION,
  UPDATE_USER_MUTATION,
} from "../../dataconnectOperations.js";
import {
  DataConnectMatriculaInput,
  DataConnectModuloEstudianteInput,
  DataConnectUserInput,
} from "../core/types.js";
import { deleteMatriculaTree } from "../core/matriculaDeletion.js";
import { getNextCodigoInscripcionForCurrentYear } from "../core/matriculaCodigoInscripcion.js";
import { getDatosGeneralesGlobales as fetchDatosGeneralesGlobales } from "../datos-generales/service.js";
import { getRequesterRoleId, isSuperUserContext, PermissionAction, requirePermission } from "../core/permissions.js";

type RegistroAuxiliarNotaInput = {
  matriculaId?: unknown;
  indicadorCapacidadId?: unknown;
  nota?: unknown;
};

type RegistroAuxiliarEfsrtPppInput = {
  moduloEstudianteId?: unknown;
  promedioFinal?: unknown;
};

type RegistroAuxiliarSaveInput = {
  grupoModuloId?: unknown;
  notas?: RegistroAuxiliarNotaInput[];
  efsrtPppPromedios?: RegistroAuxiliarEfsrtPppInput[];
};

type RegistroAuxiliarFechasInput = {
  grupoModuloId?: unknown;
  inicio?: unknown;
  fin?: unknown;
};

type RegistroAuxiliarMatriculaInput = {
  grupoModuloId?: unknown;
  dni?: unknown;
};

type RegistroAuxiliarRetireMatriculaInput = {
  grupoModuloId?: unknown;
  moduloEstudianteId?: unknown;
};

type RegistroAuxiliarEstudianteNombreInput = {
  grupoModuloId?: unknown;
  moduloEstudianteId?: unknown;
  apellidoPaterno?: unknown;
  apellidoMaterno?: unknown;
  nombres?: unknown;
};

type RegistroAuxiliarRow = {
  id: number;
  promedio?: number | null;
  matriculaId: number;
  indicadorCapacidadId?: number;
  capacidadTerminalId?: number;
  unidadDidacticaId?: number;
  moduloId?: number;
  grupoId?: number | null;
};

type RegistroAuxiliarIndicador = {
  id: number;
  descripcion?: string | null;
  sigla?: string | null;
  capacidadTerminalId?: number | null;
};

type RegistroAuxiliarCapacidad = {
  id: number;
  descripcion?: string | null;
  sigla?: string | null;
  unidadDidacticaId?: number | null;
};

type RegistroAuxiliarUnidad = {
  id: number;
  nombre?: string | null;
  duracion?: number | null;
  creditos?: number | null;
  sigla?: string | null;
};

type RegistroAuxiliarModuloEstudiante = {
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
    } | null;
  } | null;
};

type RegistroAuxiliarEfsrtPppEstudiante = {
  id: number;
  promedioFinal?: number | null;
  grupoModuloId: number;
  moduloEstudianteId: number;
};

type RegistroAuxiliarGrupoModulo = {
  id: number;
  nombre?: string | null;
  orden?: number | null;
  inicio?: string | null;
  fin?: string | null;
  grupoId: number;
  moduloId: number;
  grupo?: unknown | null;
  modulo?: unknown | null;
};

type RegistroAuxiliarDocenteModulo = {
  id: number;
  nombre?: string | null;
  orden?: number | null;
  grupoId: number;
  moduloId: number;
  grupo?: {
    id: number;
    turnoNombre?: string | null;
    nombreDisplay?: string | null;
    semestreId?: number | null;
    personalId?: number | null;
    semestre?: { id?: number | null; titulo?: string | null; inicio?: string | null; fin?: string | null } | null;
    personal?: {
      displayName?: string | null;
      user?: {
        username?: string | null;
        nombre?: string | null;
        apellidoPaterno?: string | null;
        apellidoMaterno?: string | null;
      } | null;
    } | null;
  } | null;
  modulo?: {
    titulo?: string | null;
    tituloComercial?: string | null;
  } | null;
};

type RegistroAuxiliarPersonalOption = NonNullable<NonNullable<RegistroAuxiliarDocenteModulo["grupo"]>["personal"]>;

type RegistroAuxiliarSemestreOption = {
  id: number;
  titulo?: string | null;
  inicio?: string | null;
  fin?: string | null;
};

type RegistroAuxiliarGrupoOption = {
  id: number;
  nombreDisplay?: string | null;
  semestreId?: number | null;
  turnoNombre?: string | null;
  semestre?: { titulo?: string | null; inicio?: string | null; fin?: string | null } | null;
  personal?: RegistroAuxiliarPersonalOption | null;
  grupoModulos: Array<{
    id: number;
    nombre?: string | null;
    orden?: number | null;
    moduloId: number;
    modulo?: RegistroAuxiliarDocenteModulo["modulo"] | null;
  }>;
};

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

type RegistroAuxiliarUserRow = DataConnectUserInput & {
  id: number;
  documentId?: string | null;
};

const REGISTRO_AUXILIAR_CONTEXT_QUERY = `
  query RegistroAuxiliarContext($grupoModuloId: Int!) {
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
        turnoNombre
        nombreDisplay
        workspaceName
        workspaceCorreo
        semestreId
        semestre { titulo inicio fin }
        personalId
        personal {
          displayName
          user {
            username
            nombre
            apellidoPaterno
            apellidoMaterno
          }
        }
        turno { nombre }
        horario { nombre diasSemana }
        paquete { titulo }
      }
      modulo {
        id
        titulo
        tituloComercial
        horas
        creditos
        plan {
          planEstudio
          carrera {
            nombre
            titulo
            tituloComercial
            nivel
            tipoCarrera {
              nombre
            }
            especialidad {
              titulo
              tituloComercial
            }
          }
        }
      }
    }
  }
`;

const REGISTRO_AUXILIAR_DETAIL_QUERY = `
  query RegistroAuxiliarDetail($grupoModuloId: Int!, $grupoId: Int!, $moduloId: Int!) {
    grupoModuloUnidadesDidacticas(where: { grupoModuloId: { eq: $grupoModuloId } }, limit: 500) {
      id
      orden
      grupoModuloId
      unidadDidacticaId
    }
    unidadDidacticaModulos(where: { moduloId: { eq: $moduloId } }, limit: 500) {
      id
      orden
      unidadDidacticaId
      moduloId
    }
    unidadesDidacticas(limit: 50000) {
      id
      nombre
      duracion
      creditos
      sigla
    }
    capacidadesTerminales(limit: 50000) {
      id
      descripcion
      sigla
      unidadDidacticaId
    }
    indicadoresCapacidad(limit: 100000) {
      id
      descripcion
      sigla
      capacidadTerminalId
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
        }
      }
    }
    indicadorCapacidadEstudiantes: indicadoresCapacidadEstudiantes(limit: 200000) {
      id
      promedio
      matriculaId
      indicadorCapacidadId
    }
    capacidadTerminalEstudiantes: capacidadesTerminalesEstudiantes(limit: 200000) {
      id
      promedio
      matriculaId
      capacidadTerminalId
    }
    unidadesDidacticasEstudiantes(limit: 200000) {
      id
      promedio
      matriculaId
      unidadDidacticaId
    }
    efsrtPppEstudiantes(where: { grupoModuloId: { eq: $grupoModuloId } }, limit: 2000) {
      id
      promedioFinal
      grupoModuloId
      moduloEstudianteId
    }
  }
`;

const REGISTRO_AUXILIAR_DOCENTE_MODULOS_QUERY = `
  query RegistroAuxiliarDocenteModulos($uid: String!) {
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
        turnoNombre
        nombreDisplay
        semestreId
        personalId
        personal {
          displayName
          user {
            username
            nombre
            apellidoPaterno
            apellidoMaterno
          }
        }
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

const REGISTRO_AUXILIAR_ACCESS_QUERY = `
  query RegistroAuxiliarAccess($uid: String!, $grupoModuloId: Int!) {
    users(where: { documentId: { eq: $uid } }, limit: 1) {
      id
    }
    personals(limit: 10000) {
      id
      userId
    }
    grupoModulo(id: $grupoModuloId) {
      id
      grupo {
        id
        personalId
      }
    }
  }
`;

const FIND_INDICADOR_ESTUDIANTE_QUERY = `
  query FindIndicadorEstudiante($matriculaId: Int!, $indicadorCapacidadId: Int!) {
    indicadorCapacidadEstudiantes: indicadoresCapacidadEstudiantes(
      where: { matriculaId: { eq: $matriculaId }, indicadorCapacidadId: { eq: $indicadorCapacidadId } },
      limit: 1
    ) {
      id
    }
  }
`;

const FIND_CAPACIDAD_ESTUDIANTE_QUERY = `
  query FindCapacidadEstudiante($matriculaId: Int!, $capacidadTerminalId: Int!) {
    capacidadTerminalEstudiantes: capacidadesTerminalesEstudiantes(
      where: { matriculaId: { eq: $matriculaId }, capacidadTerminalId: { eq: $capacidadTerminalId } },
      limit: 1
    ) {
      id
    }
  }
`;

const FIND_UNIDAD_ESTUDIANTE_QUERY = `
  query FindUnidadEstudiante($matriculaId: Int!, $unidadDidacticaId: Int!) {
    unidadesDidacticasEstudiantes(
      where: { matriculaId: { eq: $matriculaId }, unidadDidacticaId: { eq: $unidadDidacticaId } },
      limit: 1
    ) {
      id
    }
  }
`;

const FIND_MODULO_ESTUDIANTE_QUERY = `
  query FindModuloEstudiante($matriculaId: Int!, $moduloId: Int!, $grupoId: Int!) {
    modulosEstudiantes(
      where: { matriculaId: { eq: $matriculaId }, moduloId: { eq: $moduloId }, grupoId: { eq: $grupoId } },
      limit: 1
    ) {
      id
    }
  }
`;

const FIND_EFSRT_PPP_ESTUDIANTE_QUERY = `
  query FindEfsrtPppEstudiante($grupoModuloId: Int!, $moduloEstudianteId: Int!) {
    efsrtPppEstudiantes(
      where: { grupoModuloId: { eq: $grupoModuloId }, moduloEstudianteId: { eq: $moduloEstudianteId } },
      limit: 1
    ) {
      id
    }
  }
`;

const FIND_USER_BY_DNI_QUERY = `
  query FindRegistroAuxiliarUserByDni($tipoDocumento: String!, $dni: String!) {
    users(where: { tipoDocumento: { eq: $tipoDocumento }, dni: { eq: $dni } }, limit: 1) {
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
    }
  }
`;

const REGISTRO_AUXILIAR_CREATE_MATRICULA_CONTEXT_QUERY = `
  query RegistroAuxiliarCreateMatriculaContext($grupoModuloId: Int!) {
    grupoModulo(id: $grupoModuloId) {
      id
      grupoId
      moduloId
      grupo {
        id
        paqueteId
        semestreId
      }
    }
  }
`;

const FIND_MODULO_ESTUDIANTE_DUPLICATE_QUERY = `
  query FindRegistroAuxiliarModuloEstudianteDuplicate($grupoId: Int!, $moduloId: Int!) {
    modulosEstudiantes(where: { grupoId: { eq: $grupoId }, moduloId: { eq: $moduloId } }, limit: 1000) {
      id
      matriculaId
      matricula {
        id
        archivado
        userId
      }
    }
  }
`;

const REGISTRO_AUXILIAR_RETIRE_MATRICULA_QUERY = `
  query RegistroAuxiliarRetireMatriculaContext($grupoModuloId: Int!, $moduloEstudianteId: Int!) {
    grupoModulo(id: $grupoModuloId) {
      id
      grupoId
      moduloId
    }
    moduloEstudiante(id: $moduloEstudianteId) {
      id
      matriculaId
      moduloId
      grupoId
      matricula {
        id
        archivado
        user {
          id
          documentId
          blocked
        }
      }
    }
  }
`;

const INSERT_INDICADOR_ESTUDIANTE_MUTATION = `
  mutation InsertIndicadorEstudiante($data: IndicadorCapacidadEstudiante_Data! @allow(fields: "promedio matriculaId indicadorCapacidadId")) {
    indicadorCapacidadEstudiante_insert(data: $data)
  }
`;

const UPDATE_INDICADOR_ESTUDIANTE_MUTATION = `
  mutation UpdateIndicadorEstudiante($id: Int!, $data: IndicadorCapacidadEstudiante_Data! @allow(fields: "promedio")) {
    indicadorCapacidadEstudiante_update(id: $id, data: $data)
  }
`;

const INSERT_CAPACIDAD_ESTUDIANTE_MUTATION = `
  mutation InsertCapacidadEstudiante($data: CapacidadTerminalEstudiante_Data! @allow(fields: "promedio matriculaId capacidadTerminalId")) {
    capacidadTerminalEstudiante_insert(data: $data)
  }
`;

const UPDATE_CAPACIDAD_ESTUDIANTE_MUTATION = `
  mutation UpdateCapacidadEstudiante($id: Int!, $data: CapacidadTerminalEstudiante_Data! @allow(fields: "promedio")) {
    capacidadTerminalEstudiante_update(id: $id, data: $data)
  }
`;

const INSERT_UNIDAD_ESTUDIANTE_MUTATION = `
  mutation InsertUnidadEstudiante($data: UnidadDidacticaEstudiante_Data! @allow(fields: "promedio matriculaId unidadDidacticaId")) {
    unidadDidacticaEstudiante_insert(data: $data)
  }
`;

const UPDATE_UNIDAD_ESTUDIANTE_MUTATION = `
  mutation UpdateUnidadEstudiante($id: Int!, $data: UnidadDidacticaEstudiante_Data! @allow(fields: "promedio")) {
    unidadDidacticaEstudiante_update(id: $id, data: $data)
  }
`;

const UPDATE_MODULO_ESTUDIANTE_MUTATION = `
  mutation UpdateModuloEstudiante($id: Int!, $data: ModuloEstudiante_Data! @allow(fields: "promedio puntaje")) {
    moduloEstudiante_update(id: $id, data: $data)
  }
`;

const INSERT_EFSRT_PPP_ESTUDIANTE_MUTATION = `
  mutation InsertEfsrtPppEstudiante($data: EfsrtPppEstudiante_Data! @allow(fields: "promedioFinal grupoModuloId moduloEstudianteId modoCalculo fechaRegistro fechaActualizacion")) {
    efsrtPppEstudiante_insert(data: $data)
  }
`;

const UPDATE_EFSRT_PPP_ESTUDIANTE_MUTATION = `
  mutation UpdateEfsrtPppEstudiante($id: Int!, $data: EfsrtPppEstudiante_Data! @allow(fields: "promedioFinal modoCalculo fechaActualizacion")) {
    efsrtPppEstudiante_update(id: $id, data: $data)
  }
`;

function matchesSemestreTitulo(value: string | null | undefined, expected: string) {
  return normalizeText(value) === normalizeText(expected);
}

function toTimestamp(value: string | null | undefined) {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function resolveSemestreTituloVigente(
  semestres: RegistroAuxiliarSemestreOption[],
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

  const lastStarted = datedSemestres
    .filter((item) => item.inicio != null && item.inicio <= now)
    .sort((a, b) => (b.inicio ?? 0) - (a.inicio ?? 0))[0]?.semestre.titulo;
  if (lastStarted) return lastStarted;

  return semestres
    .slice()
    .sort((a, b) =>
      String(b.titulo ?? "").localeCompare(String(a.titulo ?? ""), "es", { numeric: true }) ||
      b.id - a.id,
    )[0]?.titulo ?? "";
}

function isDocenteRegistroRequester(context: https.CallableContext) {
  return !isSuperUserContext(context) && getRequesterRoleId(context) === TEACHER_ROLE_ID;
}

function getPersonalIdsForUserId(
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

function sortRegistroAuxiliarModulos(items: RegistroAuxiliarDocenteModulo[]) {
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

function buildRegistroAuxiliarGrupos(modulos: RegistroAuxiliarDocenteModulo[]) {
  const grupos = new Map<number, RegistroAuxiliarGrupoOption>();

  for (const item of sortRegistroAuxiliarModulos(modulos)) {
    const grupo = item.grupo;
    if (!grupo?.id) continue;

    const current: RegistroAuxiliarGrupoOption = grupos.get(grupo.id) ?? {
      id: grupo.id,
      nombreDisplay: grupo.nombreDisplay ?? null,
      semestreId: grupo.semestreId ?? grupo.semestre?.id ?? null,
      turnoNombre: grupo.turnoNombre ?? null,
      semestre: grupo.semestre ? {
        titulo: grupo.semestre.titulo ?? null,
        inicio: grupo.semestre.inicio ?? null,
        fin: grupo.semestre.fin ?? null,
      } : null,
      personal: grupo.personal ?? null,
      grupoModulos: [],
    };

    current.grupoModulos.push({
      id: item.id,
      nombre: item.nombre ?? null,
      orden: item.orden ?? null,
      moduloId: item.moduloId,
      modulo: item.modulo ?? null,
    });
    grupos.set(grupo.id, current);
  }

  return Array.from(grupos.values())
    .sort((a, b) =>
      String(a.semestre?.titulo ?? "").localeCompare(String(b.semestre?.titulo ?? ""), "es", { numeric: true }) ||
      String(a.nombreDisplay ?? "").localeCompare(String(b.nombreDisplay ?? ""), "es", { numeric: true }) ||
      a.id - b.id,
    );
}

function filterRegistroAuxiliarModulosForRequester(params: {
  context: https.CallableContext;
  userId?: number | null;
  personals: Array<{ id: number; userId?: number | null }>;
  modulos: RegistroAuxiliarDocenteModulo[];
  semestreTitulo?: string | null;
}) {
  const semestreTitulo = String(params.semestreTitulo ?? "").trim();
  const bySemestre = semestreTitulo
    ? params.modulos.filter((item) => matchesSemestreTitulo(item.grupo?.semestre?.titulo, semestreTitulo))
    : params.modulos;

  if (!isDocenteRegistroRequester(params.context)) {
    return bySemestre;
  }

  const personalIds = getPersonalIdsForUserId(params.userId, params.personals);
  return bySemestre.filter((item) =>
    Boolean(item.grupo?.personalId && personalIds.has(item.grupo.personalId)),
  );
}

async function ensureRegistroAuxiliarAccess(
  context: https.CallableContext,
  grupoModuloId: number,
  action: PermissionAction,
) {
  await requirePermission(context, "registro-auxiliar", action);
  if (!isDocenteRegistroRequester(context)) return;

  const uid = context.auth?.uid;
  if (!uid) throw new https.HttpsError("unauthenticated", "Debes iniciar sesion.");

  const response = await dataConnect.executeGraphql<{
    users: Array<{ id: number }>;
    personals: Array<{ id: number; userId?: number | null }>;
    grupoModulo: {
      id: number;
      grupo?: { id?: number | null; personalId?: number | null } | null;
    } | null;
  }, { uid: string; grupoModuloId: number }>(
    REGISTRO_AUXILIAR_ACCESS_QUERY,
    { variables: { uid, grupoModuloId } },
  );

  const userId = response.data.users?.[0]?.id;
  const personalIds = getPersonalIdsForUserId(userId, response.data.personals ?? []);
  const personalId = response.data.grupoModulo?.grupo?.personalId;
  if (!personalId || !personalIds.has(personalId)) {
    throw new https.HttpsError("permission-denied", "No tienes permiso para abrir este modulo.");
  }
}

function average(values: Array<number | null | undefined>) {
  const valid = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (valid.length === 0) return null;
  return Math.round(valid.reduce((sum, value) => sum + value, 0) / valid.length);
}

function roundPromedio(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.round(value);
}

function sum(values: Array<number | null | undefined>) {
  const valid = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (valid.length === 0) return null;
  return Math.round(valid.reduce((total, value) => total + value, 0) * 100) / 100;
}

function normalizedNota(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.max(0, Math.min(20, Math.round(numeric * 100) / 100));
}

function normalizeText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function isOpcionOcupacional(value: unknown) {
  return normalizeText(value).includes("opcion ocupacional");
}

function asCleanString(value: unknown) {
  const text = String(value ?? "").trim().replace(/\s+/g, " ");
  return text ? text : null;
}

function normalizeDni(value: unknown) {
  return String(value ?? "").replace(/\D/g, "").slice(0, 8);
}

function normalizePeruDevsDate(value: unknown) {
  const raw = String(value ?? "").trim();
  const match = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(raw);
  if (!match) return null;
  return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
}

function normalizePeruDevsSexo(value: unknown) {
  const text = String(value ?? "").trim().toUpperCase();
  if (text === "M" || text.startsWith("MASC")) return "M";
  if (text === "F" || text.startsWith("FEM")) return "F";
  return null;
}

function resolveInstitutionalEmailForDni(dni: string) {
  return `${dni}@cetprosmp.edu.pe`;
}

function buildStudentUsername(data: {
  nombres?: string | null;
  apellidoPaterno?: string | null;
  apellidoMaterno?: string | null;
}) {
  return [data.nombres, data.apellidoPaterno, data.apellidoMaterno].filter(Boolean).join(" ").trim() || "Estudiante";
}

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

async function findRegistroAuxiliarUserByDni(dni: string) {
  const response = await dataConnect.executeGraphql<
    { users: RegistroAuxiliarUserRow[] },
    { tipoDocumento: string; dni: string }
  >(FIND_USER_BY_DNI_QUERY, { variables: { tipoDocumento: "DNI", dni } });
  return response.data.users?.[0] ?? null;
}

async function ensureRegistroAuxiliarStudentUser(
  dni: string,
  dniData: PeruDevsDniResult,
  existingUser: RegistroAuxiliarUserRow | null,
  context: https.CallableContext,
) {
  const role = await getRoleById(STUDENT_ROLE_ID);
  const permissionLevel = role?.scala ?? DEFAULT_LEVEL;
  const now = new Date().toISOString();
  const nombre = asCleanString(dniData.nombres);
  const apellidoPaterno = asCleanString(dniData.apellido_paterno);
  const apellidoMaterno = asCleanString(dniData.apellido_materno);
  const username = buildStudentUsername({ nombres: nombre, apellidoPaterno, apellidoMaterno });
  const institutionalEmail = resolveInstitutionalEmailForDni(dni);
  const existingAuth = await getAuthUserByEmailOrNull(institutionalEmail)
    ?? await getAuthUserByUidOrNull(existingUser?.documentId);

  const authUser = existingAuth
    ? await authAdmin.updateUser(existingAuth.uid, {
        email: institutionalEmail,
        password: dni,
        displayName: username,
        emailVerified: true,
        disabled: false,
      }).then(() => authAdmin.getUser(existingAuth.uid))
    : await authAdmin.createUser({
        email: institutionalEmail,
        password: dni,
        displayName: username,
        emailVerified: true,
        disabled: false,
      });

  await authAdmin.setCustomUserClaims(authUser.uid, { role: String(STUDENT_ROLE_ID), level: permissionLevel });

  const payload = buildUserDataFromInput({
    documentId: authUser.uid,
    username,
    email: existingUser?.email || institutionalEmail,
    correoInstitucional: institutionalEmail,
    provider: "password",
    confirmed: true,
    blocked: false,
    tipoDocumento: "DNI",
    dni,
    nombre,
    apellidoPaterno,
    apellidoMaterno,
    sexo: normalizePeruDevsSexo(dniData.genero),
    nacionalidad: existingUser?.nacionalidad || "PERUANA",
    fechaNacimiento: normalizePeruDevsDate(dniData.fecha_nacimiento),
    fechaCreacion: existingUser?.fechaCreacion ?? now,
    fechaModificacion: now,
    emailCreador: existingUser?.emailCreador ?? asCleanString(context.auth?.token?.email),
    rolId: STUDENT_ROLE_ID,
    avatar: existingUser?.avatar ?? authUser.photoURL ?? null,
  });

  if (existingUser?.id) {
    const updated = await dataConnect.executeGraphql<
      { user_update: unknown },
      { id: number; data: DataConnectUserInput }
    >(UPDATE_USER_MUTATION, { variables: { id: existingUser.id, data: payload } });
    return getIdFromKeyOutput(updated.data.user_update) ?? existingUser.id;
  }

  return upsertDataConnectUserByDocumentId(authUser.uid, payload);
}

async function upsertIndicadorPromedio(matriculaId: number, indicadorCapacidadId: number, promedio: number | null) {
  const existing = await dataConnect.executeGraphql<
    { indicadorCapacidadEstudiantes: Array<{ id: number }> },
    { matriculaId: number; indicadorCapacidadId: number }
  >(FIND_INDICADOR_ESTUDIANTE_QUERY, { variables: { matriculaId, indicadorCapacidadId } });
  const id = existing.data.indicadorCapacidadEstudiantes?.[0]?.id;
  if (id) {
    await dataConnect.executeGraphql<unknown, { id: number; data: { promedio: number | null } }>(
      UPDATE_INDICADOR_ESTUDIANTE_MUTATION,
      { variables: { id, data: { promedio } } },
    );
    return id;
  }
  const inserted = await dataConnect.executeGraphql<
    { indicadorCapacidadEstudiante_insert: unknown },
    { data: { promedio: number | null; matriculaId: number; indicadorCapacidadId: number } }
  >(
    INSERT_INDICADOR_ESTUDIANTE_MUTATION,
    { variables: { data: { promedio, matriculaId, indicadorCapacidadId } } },
  );
  return getIdFromKeyOutput(inserted.data.indicadorCapacidadEstudiante_insert);
}

async function upsertCapacidadPromedio(matriculaId: number, capacidadTerminalId: number, promedio: number | null) {
  const existing = await dataConnect.executeGraphql<
    { capacidadTerminalEstudiantes: Array<{ id: number }> },
    { matriculaId: number; capacidadTerminalId: number }
  >(FIND_CAPACIDAD_ESTUDIANTE_QUERY, { variables: { matriculaId, capacidadTerminalId } });
  const id = existing.data.capacidadTerminalEstudiantes?.[0]?.id;
  if (id) {
    await dataConnect.executeGraphql<unknown, { id: number; data: { promedio: number | null } }>(
      UPDATE_CAPACIDAD_ESTUDIANTE_MUTATION,
      { variables: { id, data: { promedio } } },
    );
    return id;
  }
  const inserted = await dataConnect.executeGraphql<
    { capacidadTerminalEstudiante_insert: unknown },
    { data: { promedio: number | null; matriculaId: number; capacidadTerminalId: number } }
  >(
    INSERT_CAPACIDAD_ESTUDIANTE_MUTATION,
    { variables: { data: { promedio, matriculaId, capacidadTerminalId } } },
  );
  return getIdFromKeyOutput(inserted.data.capacidadTerminalEstudiante_insert);
}

async function upsertUnidadPromedio(matriculaId: number, unidadDidacticaId: number, promedio: number | null) {
  const existing = await dataConnect.executeGraphql<
    { unidadesDidacticasEstudiantes: Array<{ id: number }> },
    { matriculaId: number; unidadDidacticaId: number }
  >(FIND_UNIDAD_ESTUDIANTE_QUERY, { variables: { matriculaId, unidadDidacticaId } });
  const id = existing.data.unidadesDidacticasEstudiantes?.[0]?.id;
  if (id) {
    await dataConnect.executeGraphql<unknown, { id: number; data: { promedio: number | null } }>(
      UPDATE_UNIDAD_ESTUDIANTE_MUTATION,
      { variables: { id, data: { promedio } } },
    );
    return id;
  }
  const inserted = await dataConnect.executeGraphql<
    { unidadDidacticaEstudiante_insert: unknown },
    { data: { promedio: number | null; matriculaId: number; unidadDidacticaId: number } }
  >(
    INSERT_UNIDAD_ESTUDIANTE_MUTATION,
    { variables: { data: { promedio, matriculaId, unidadDidacticaId } } },
  );
  return getIdFromKeyOutput(inserted.data.unidadDidacticaEstudiante_insert);
}

async function updateModuloResultado(
  matriculaId: number,
  moduloId: number,
  grupoId: number,
  promedio: number | null,
  puntaje: number | null,
) {
  const existing = await dataConnect.executeGraphql<
    { modulosEstudiantes: Array<{ id: number }> },
    { matriculaId: number; moduloId: number; grupoId: number }
  >(FIND_MODULO_ESTUDIANTE_QUERY, { variables: { matriculaId, moduloId, grupoId } });
  const id = existing.data.modulosEstudiantes?.[0]?.id;
  if (!id) return null;
  await dataConnect.executeGraphql<unknown, { id: number; data: { promedio: number | null; puntaje: number | null } }>(
    UPDATE_MODULO_ESTUDIANTE_MUTATION,
    { variables: { id, data: { promedio, puntaje } } },
  );
  return id;
}

async function ensureEfsrtPppEstudiante(grupoModuloId: number, moduloEstudianteId: number) {
  const existing = await dataConnect.executeGraphql<
    { efsrtPppEstudiantes: Array<{ id: number }> },
    { grupoModuloId: number; moduloEstudianteId: number }
  >(FIND_EFSRT_PPP_ESTUDIANTE_QUERY, { variables: { grupoModuloId, moduloEstudianteId } });
  const id = existing.data.efsrtPppEstudiantes?.[0]?.id;
  if (id) return id;

  const now = new Date().toISOString();
  const inserted = await dataConnect.executeGraphql<
    { efsrtPppEstudiante_insert: unknown },
    {
      data: {
        grupoModuloId: number;
        moduloEstudianteId: number;
        modoCalculo: string;
        fechaRegistro: string;
        fechaActualizacion: string;
      };
    }
  >(
    INSERT_EFSRT_PPP_ESTUDIANTE_MUTATION,
    {
      variables: {
        data: {
          grupoModuloId,
          moduloEstudianteId,
          modoCalculo: "detalle",
          fechaRegistro: now,
          fechaActualizacion: now,
        },
      },
    },
  );
  return getIdFromKeyOutput(inserted.data.efsrtPppEstudiante_insert);
}

async function upsertEfsrtPppPromedio(grupoModuloId: number, moduloEstudianteId: number, promedioFinal: number | null) {
  const existing = await dataConnect.executeGraphql<
    { efsrtPppEstudiantes: Array<{ id: number }> },
    { grupoModuloId: number; moduloEstudianteId: number }
  >(FIND_EFSRT_PPP_ESTUDIANTE_QUERY, { variables: { grupoModuloId, moduloEstudianteId } });
  const id = existing.data.efsrtPppEstudiantes?.[0]?.id;
  const now = new Date().toISOString();
  if (id) {
    await dataConnect.executeGraphql<
      unknown,
      { id: number; data: { promedioFinal: number | null; modoCalculo: string; fechaActualizacion: string } }
    >(
      UPDATE_EFSRT_PPP_ESTUDIANTE_MUTATION,
      { variables: { id, data: { promedioFinal, modoCalculo: "manual", fechaActualizacion: now } } },
    );
    return id;
  }

  const inserted = await dataConnect.executeGraphql<
    { efsrtPppEstudiante_insert: unknown },
    {
      data: {
        promedioFinal: number | null;
        grupoModuloId: number;
        moduloEstudianteId: number;
        modoCalculo: string;
        fechaRegistro: string;
        fechaActualizacion: string;
      };
    }
  >(
    INSERT_EFSRT_PPP_ESTUDIANTE_MUTATION,
    {
      variables: {
        data: {
          promedioFinal,
          grupoModuloId,
          moduloEstudianteId,
          modoCalculo: "manual",
          fechaRegistro: now,
          fechaActualizacion: now,
        },
      },
    },
  );
  return getIdFromKeyOutput(inserted.data.efsrtPppEstudiante_insert);
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
      (a.orden ?? Number.MAX_SAFE_INTEGER) - (b.orden ?? Number.MAX_SAFE_INTEGER)
      || a.unidadDidacticaId - b.unidadDidacticaId
    ))
    .map((item) => item.unidadDidacticaId);
}

export const listRegistroAuxiliarDocenteModulos = https.onCall(async (data, context) => {
  await requirePermission(context, "registro-auxiliar", "view");

  const requestedSemestreTitulo = String(data?.semestreTitulo ?? "").trim();
  const uid = context.auth?.uid;
  if (!uid) {
    throw new https.HttpsError("unauthenticated", "Debes iniciar sesion.");
  }

  try {
    const response = await dataConnect.executeGraphql<{
      users: Array<{ id: number }>;
      personals: Array<{ id: number; userId?: number | null }>;
      semestres: RegistroAuxiliarSemestreOption[];
      grupoModulos: RegistroAuxiliarDocenteModulo[];
    }, { uid: string }>(
      REGISTRO_AUXILIAR_DOCENTE_MODULOS_QUERY,
      { variables: { uid } },
    );

    const semestreTitulo = resolveSemestreTituloVigente(
      response.data.semestres ?? [],
      requestedSemestreTitulo,
    );
    const modulos = sortRegistroAuxiliarModulos(filterRegistroAuxiliarModulosForRequester({
      context,
      userId: response.data.users?.[0]?.id,
      personals: response.data.personals ?? [],
      modulos: response.data.grupoModulos ?? [],
      semestreTitulo,
    }));

    return { modulos, semestreTitulo };
  } catch (error) {
    if (error instanceof https.HttpsError) throw error;
    console.error("Error in listRegistroAuxiliarDocenteModulos:", error);
    throw new https.HttpsError("internal", "No se pudieron cargar los modulos del docente.");
  }
});

export const listRegistroAuxiliarOpciones = https.onCall(async (_data, context) => {
  await requirePermission(context, "registro-auxiliar", "view");

  const uid = context.auth?.uid;
  if (!uid) {
    throw new https.HttpsError("unauthenticated", "Debes iniciar sesion.");
  }

  try {
    const [optionsResponse, datoGeneral] = await Promise.all([
      dataConnect.executeGraphql<{
        users: Array<{ id: number }>;
        personals: Array<{ id: number; userId?: number | null }>;
        semestres: RegistroAuxiliarSemestreOption[];
        grupoModulos: RegistroAuxiliarDocenteModulo[];
      }, { uid: string }>(
        REGISTRO_AUXILIAR_DOCENTE_MODULOS_QUERY,
        { variables: { uid } },
      ),
      fetchDatosGeneralesGlobales(),
    ]);

    const modulos = filterRegistroAuxiliarModulosForRequester({
      context,
      userId: optionsResponse.data.users?.[0]?.id,
      personals: optionsResponse.data.personals ?? [],
      modulos: optionsResponse.data.grupoModulos ?? [],
    });
    const grupos = buildRegistroAuxiliarGrupos(modulos);
    const semestreIds = new Set(
      grupos
        .map((grupo) => grupo.semestreId)
        .filter((id): id is number => typeof id === "number" && Number.isFinite(id)),
    );
    const semestres = (optionsResponse.data.semestres ?? [])
      .filter((semestre) => semestreIds.has(semestre.id))
      .sort((a, b) =>
        String(a.titulo ?? "").localeCompare(String(b.titulo ?? ""), "es", { numeric: true }) ||
        a.id - b.id,
      );

    return { grupos, semestres, datoGeneral, datosGenerales: datoGeneral };
  } catch (error) {
    if (error instanceof https.HttpsError) throw error;
    console.error("Error in listRegistroAuxiliarOpciones:", error);
    throw new https.HttpsError("internal", "No se pudieron cargar las opciones del registro auxiliar.");
  }
});

export const getRegistroAuxiliar = https.onCall(async (data, context) => {
  const grupoModuloId = toNumber(data?.grupoModuloId, -1);
  if (grupoModuloId <= 0) {
    throw new https.HttpsError("invalid-argument", "grupoModuloId is required.");
  }
  await ensureRegistroAuxiliarAccess(context, grupoModuloId, "view");

  try {
    const contextResponse = await dataConnect.executeGraphql<
      { grupoModulo: RegistroAuxiliarGrupoModulo | null },
      { grupoModuloId: number }
    >(REGISTRO_AUXILIAR_CONTEXT_QUERY, { variables: { grupoModuloId } });
    const grupoModulo = contextResponse.data.grupoModulo;
    if (!grupoModulo?.grupoId || !grupoModulo?.moduloId) {
      throw new https.HttpsError("not-found", "No se encontro el grupo-modulo solicitado.");
    }
    const { grupoId, moduloId } = grupoModulo;

    const response = await dataConnect.executeGraphql<{
      grupoModuloUnidadesDidacticas: Array<{ orden?: number | null; unidadDidacticaId: number }>;
      unidadDidacticaModulos: Array<{ orden?: number | null; unidadDidacticaId: number }>;
      unidadesDidacticas: RegistroAuxiliarUnidad[];
      capacidadesTerminales: RegistroAuxiliarCapacidad[];
      indicadoresCapacidad: RegistroAuxiliarIndicador[];
      modulosEstudiantes: RegistroAuxiliarModuloEstudiante[];
      indicadorCapacidadEstudiantes: RegistroAuxiliarRow[];
      capacidadTerminalEstudiantes: RegistroAuxiliarRow[];
      unidadesDidacticasEstudiantes: RegistroAuxiliarRow[];
      efsrtPppEstudiantes: RegistroAuxiliarEfsrtPppEstudiante[];
    }, { grupoModuloId: number; grupoId: number; moduloId: number }>(
      REGISTRO_AUXILIAR_DETAIL_QUERY,
      { variables: { grupoModuloId, grupoId, moduloId } },
    );

    const unidadIds = buildUnidadIds(response.data);
    const unidadIdSet = new Set(unidadIds);
    const capacidadByUnidad = new Map<number, RegistroAuxiliarCapacidad[]>();
    for (const capacidad of response.data.capacidadesTerminales ?? []) {
      if (!capacidad.unidadDidacticaId || !unidadIdSet.has(capacidad.unidadDidacticaId)) continue;
      const current = capacidadByUnidad.get(capacidad.unidadDidacticaId) ?? [];
      current.push(capacidad);
      capacidadByUnidad.set(capacidad.unidadDidacticaId, current);
    }
    const indicadorByCapacidad = new Map<number, RegistroAuxiliarIndicador[]>();
    for (const indicador of response.data.indicadoresCapacidad ?? []) {
      if (!indicador.capacidadTerminalId) continue;
      const current = indicadorByCapacidad.get(indicador.capacidadTerminalId) ?? [];
      current.push(indicador);
      indicadorByCapacidad.set(indicador.capacidadTerminalId, current);
    }

    const unidadById = new Map((response.data.unidadesDidacticas ?? []).map((unidad) => [unidad.id, unidad]));
    const estructura = unidadIds
      .map((unidadId) => unidadById.get(unidadId))
      .filter((unidad): unidad is RegistroAuxiliarUnidad => Boolean(unidad))
      .map((unidad) => ({
        ...unidad,
        capacidadesTerminales: (capacidadByUnidad.get(unidad.id) ?? [])
          .slice()
          .sort((a, b) => a.id - b.id)
          .map((capacidad) => ({
            ...capacidad,
            indicadoresCapacidad: (indicadorByCapacidad.get(capacidad.id) ?? []).slice().sort((a, b) => a.id - b.id),
          })),
      }));

    const matriculaIds = new Set((response.data.modulosEstudiantes ?? []).map((item) => item.matriculaId));
    const moduloEstudianteIds = new Set((response.data.modulosEstudiantes ?? []).map((item) => item.id));
    const indicadorIds = new Set<number>();
    const capacidadIds = new Set<number>();
    for (const unidad of estructura) {
      for (const capacidad of unidad.capacidadesTerminales) {
        capacidadIds.add(capacidad.id);
        for (const indicador of capacidad.indicadoresCapacidad) indicadorIds.add(indicador.id);
      }
    }

    return {
      grupo: grupoModulo.grupo ?? null,
      grupoModulo,
      estructura,
      estudiantes: (response.data.modulosEstudiantes ?? [])
        .filter((item) => !item.matricula?.archivado)
        .sort((a, b) => {
          const aUser = a.matricula?.user;
          const bUser = b.matricula?.user;
          const aName = `${aUser?.apellidoPaterno ?? ""} ${aUser?.apellidoMaterno ?? ""} ${aUser?.nombre ?? ""}`.trim();
          const bName = `${bUser?.apellidoPaterno ?? ""} ${bUser?.apellidoMaterno ?? ""} ${bUser?.nombre ?? ""}`.trim();
          return aName.localeCompare(bName, "es", { numeric: true }) || a.matriculaId - b.matriculaId;
        }),
      notas: (response.data.indicadorCapacidadEstudiantes ?? [])
        .filter((item) => matriculaIds.has(item.matriculaId) && item.indicadorCapacidadId && indicadorIds.has(item.indicadorCapacidadId)),
      promediosCapacidad: (response.data.capacidadTerminalEstudiantes ?? [])
        .filter((item) => matriculaIds.has(item.matriculaId) && item.capacidadTerminalId && capacidadIds.has(item.capacidadTerminalId)),
      promediosUnidad: (response.data.unidadesDidacticasEstudiantes ?? [])
        .filter((item) => matriculaIds.has(item.matriculaId) && item.unidadDidacticaId && unidadIdSet.has(item.unidadDidacticaId)),
      promediosEfsrtPpp: (response.data.efsrtPppEstudiantes ?? [])
        .filter((item) => moduloEstudianteIds.has(item.moduloEstudianteId)),
    };
  } catch (error) {
    if (error instanceof https.HttpsError) throw error;
    console.error("Error in getRegistroAuxiliar:", error);
    throw new https.HttpsError("internal", "No se pudo cargar el registro auxiliar.");
  }
});

export const updateRegistroAuxiliarGrupoModuloFechas = https.onCall(async (data: RegistroAuxiliarFechasInput, context) => {
  await requirePermission(context, "registro-auxiliar", "edit");

  const grupoModuloId = toNumber(data?.grupoModuloId, -1);
  if (grupoModuloId <= 0) {
    throw new https.HttpsError("invalid-argument", "grupoModuloId is required.");
  }

  const inicio = asNullableTimestamp(data?.inicio) ?? null;
  const fin = asNullableTimestamp(data?.fin) ?? null;
  const inicioTime = inicio ? Date.parse(inicio) : null;
  const finTime = fin ? Date.parse(fin) : null;
  if (inicioTime !== null && Number.isNaN(inicioTime)) {
    throw new https.HttpsError("invalid-argument", "La fecha de inicio no es valida.");
  }
  if (finTime !== null && Number.isNaN(finTime)) {
    throw new https.HttpsError("invalid-argument", "La fecha de fin no es valida.");
  }
  if (inicioTime !== null && finTime !== null && inicioTime > finTime) {
    throw new https.HttpsError("invalid-argument", "La fecha de inicio no puede ser mayor que la fecha de fin.");
  }

  try {
    const updated = await dataConnect.executeGraphql<
      { grupoModulo_update: unknown },
      { id: number; data: { inicio: string | null; fin: string | null } }
    >(
      `mutation UpdateRegistroAuxiliarGrupoModuloFechas($id: Int!, $data: GrupoModulo_Data! @allow(fields: "inicio fin")) {
        grupoModulo_update(id: $id, data: $data)
      }`,
      { variables: { id: grupoModuloId, data: { inicio, fin } } },
    );

    if (!updated.data.grupoModulo_update) {
      throw new https.HttpsError("not-found", "No se encontro el grupo-modulo solicitado.");
    }

    return { grupoModuloId, inicio, fin };
  } catch (error) {
    if (error instanceof https.HttpsError) throw error;
    console.error("Error in updateRegistroAuxiliarGrupoModuloFechas:", error);
    throw new https.HttpsError("internal", "No se pudieron guardar las fechas del modulo.");
  }
});

export const createRegistroAuxiliarMatricula = https.onCall(async (data: RegistroAuxiliarMatriculaInput, context) => {
  const grupoModuloId = toNumber(data?.grupoModuloId, -1);
  const dni = normalizeDni(data?.dni);
  if (grupoModuloId <= 0) {
    throw new https.HttpsError("invalid-argument", "grupoModuloId is required.");
  }
  if (!/^\d{8}$/.test(dni)) {
    throw new https.HttpsError("invalid-argument", "Ingresa un DNI valido de 8 digitos.");
  }

  await ensureRegistroAuxiliarAccess(context, grupoModuloId, "create");

  let matriculaId: number | null = null;
  try {
    const contextResponse = await dataConnect.executeGraphql<{
      grupoModulo: {
        id: number;
        grupoId?: number | null;
        moduloId?: number | null;
        grupo?: {
          id?: number | null;
          paqueteId?: number | null;
          semestreId?: number | null;
        } | null;
      } | null;
    }, { grupoModuloId: number }>(
      REGISTRO_AUXILIAR_CREATE_MATRICULA_CONTEXT_QUERY,
      { variables: { grupoModuloId } },
    );

    const grupoModulo = contextResponse.data.grupoModulo;
    const grupoId = grupoModulo?.grupoId ?? grupoModulo?.grupo?.id ?? null;
    const moduloId = grupoModulo?.moduloId ?? null;
    const paqueteId = grupoModulo?.grupo?.paqueteId ?? null;
    const semestreId = grupoModulo?.grupo?.semestreId ?? null;
    if (!grupoId || !moduloId || !paqueteId || !semestreId) {
      throw new https.HttpsError("failed-precondition", "El grupo-modulo no tiene grupo, modulo, paquete o semestre asociado.");
    }

    const dniData = await fetchPeruDevsDni(dni);
    const existingUser = await findRegistroAuxiliarUserByDni(dni);
    const userId = await ensureRegistroAuxiliarStudentUser(dni, dniData, existingUser, context);

    const duplicates = await dataConnect.executeGraphql<{
      modulosEstudiantes: Array<{
        id: number;
        matriculaId: number;
        matricula?: { id?: number | null; archivado?: boolean | null; userId?: number | null } | null;
      }>;
    }, { grupoId: number; moduloId: number }>(
      FIND_MODULO_ESTUDIANTE_DUPLICATE_QUERY,
      { variables: { grupoId, moduloId } },
    );

    const duplicate = (duplicates.data.modulosEstudiantes ?? []).find((item) =>
      item.matricula?.userId === userId && item.matricula?.archivado !== true,
    );
    if (duplicate) {
      throw new https.HttpsError("already-exists", "El estudiante ya esta matriculado en este grupo-modulo.");
    }

    const matriculaPayload = buildMatriculaDataFromInput({
      recibo: null,
      fecha: new Date().toISOString(),
      codigoInscripcion: await getNextCodigoInscripcionForCurrentYear(),
      archivado: false,
      paqueteId,
      semestreId,
      userId,
    });
    const created = await dataConnect.executeGraphql<
      { matricula_insert: unknown },
      { data: DataConnectMatriculaInput }
    >(INSERT_MATRICULA_MUTATION, { variables: { data: matriculaPayload } });
    matriculaId = getIdFromKeyOutput(created.data.matricula_insert);
    if (!matriculaId) {
      throw new Error("No se pudo obtener el id de la matricula creada.");
    }

    const moduloEstudiantePayload = buildModuloEstudianteDataFromInput({
      matriculaId,
      moduloId,
      grupoId,
      promedio: null,
      puntaje: null,
    });
    const createdModuloEstudiante = await dataConnect.executeGraphql<
      { moduloEstudiante_insert: unknown },
      { data: DataConnectModuloEstudianteInput }
    >(INSERT_MODULO_ESTUDIANTE_MUTATION, { variables: { data: moduloEstudiantePayload } });
    const moduloEstudianteId = getIdFromKeyOutput(createdModuloEstudiante.data.moduloEstudiante_insert);
    if (!moduloEstudianteId) {
      throw new Error("No se pudo obtener el id del modulo-estudiante creado.");
    }

    return {
      userId,
      matriculaId,
      moduloEstudianteId,
      grupoModuloId,
      dni,
    };
  } catch (error) {
    if (matriculaId) {
      try {
        await deleteMatriculaTree(matriculaId);
      } catch (cleanupError) {
        console.error("Error cleaning failed registro auxiliar matricula:", cleanupError);
      }
    }
    if (error instanceof https.HttpsError) throw error;
    console.error("Error in createRegistroAuxiliarMatricula:", error);
    throw new https.HttpsError("internal", "No se pudo crear la matricula desde el registro auxiliar.");
  }
});

export const retireRegistroAuxiliarMatricula = https.onCall(async (data: RegistroAuxiliarRetireMatriculaInput, context) => {
  await requirePermission(context, "registro-auxiliar", "delete");

  const grupoModuloId = toNumber(data?.grupoModuloId, -1);
  const moduloEstudianteId = toNumber(data?.moduloEstudianteId, -1);
  if (grupoModuloId <= 0 || moduloEstudianteId <= 0) {
    throw new https.HttpsError("invalid-argument", "grupoModuloId y moduloEstudianteId son requeridos.");
  }

  try {
    const response = await dataConnect.executeGraphql<{
      grupoModulo: { id: number; grupoId?: number | null; moduloId?: number | null } | null;
      moduloEstudiante: {
        id: number;
        matriculaId: number;
        moduloId?: number | null;
        grupoId?: number | null;
        matricula?: {
          id?: number | null;
          archivado?: boolean | null;
          user?: { id?: number | null; documentId?: string | null; blocked?: boolean | null } | null;
        } | null;
      } | null;
    }, { grupoModuloId: number; moduloEstudianteId: number }>(
      REGISTRO_AUXILIAR_RETIRE_MATRICULA_QUERY,
      { variables: { grupoModuloId, moduloEstudianteId } },
    );

    const grupoModulo = response.data.grupoModulo;
    const moduloEstudiante = response.data.moduloEstudiante;
    if (!grupoModulo?.grupoId || !grupoModulo?.moduloId || !moduloEstudiante?.matriculaId) {
      throw new https.HttpsError("not-found", "No se encontro la matricula solicitada.");
    }
    if (moduloEstudiante.grupoId !== grupoModulo.grupoId || moduloEstudiante.moduloId !== grupoModulo.moduloId) {
      throw new https.HttpsError("failed-precondition", "La matricula no pertenece a este grupo-modulo.");
    }

    const now = new Date().toISOString();
    await dataConnect.executeGraphql<
      { matricula_update: unknown },
      { id: number; data: DataConnectMatriculaInput }
    >(
      UPDATE_MATRICULA_MUTATION,
      { variables: { id: moduloEstudiante.matriculaId, data: { archivado: true } } },
    );

    const userId = moduloEstudiante.matricula?.user?.id ?? null;
    const documentId = moduloEstudiante.matricula?.user?.documentId ?? null;
    if (userId) {
      await dataConnect.executeGraphql<
        { user_update: unknown },
        { id: number; data: DataConnectUserInput }
      >(
        UPDATE_USER_MUTATION,
        { variables: { id: userId, data: { blocked: true, fechaModificacion: now } } },
      );
    }

    if (documentId && !documentId.startsWith("matricula:")) {
      try {
        await authAdmin.updateUser(documentId, { disabled: true });
      } catch (error: unknown) {
        const code = (error as { code?: string } | null)?.code;
        if (code !== "auth/user-not-found") throw error;
      }
    }

    return {
      grupoModuloId,
      moduloEstudianteId,
      matriculaId: moduloEstudiante.matriculaId,
      userId,
      archived: true,
      userBlocked: Boolean(userId),
    };
  } catch (error) {
    if (error instanceof https.HttpsError) throw error;
    console.error("Error in retireRegistroAuxiliarMatricula:", error);
    throw new https.HttpsError("internal", "No se pudo retirar la matricula del registro.");
  }
});

export const updateRegistroAuxiliarEstudianteNombre = https.onCall(async (
  data: RegistroAuxiliarEstudianteNombreInput,
  context,
) => {
  const grupoModuloId = toNumber(data?.grupoModuloId, -1);
  const moduloEstudianteId = toNumber(data?.moduloEstudianteId, -1);
  if (grupoModuloId <= 0 || moduloEstudianteId <= 0) {
    throw new https.HttpsError("invalid-argument", "grupoModuloId y moduloEstudianteId son requeridos.");
  }

  await ensureRegistroAuxiliarAccess(context, grupoModuloId, "edit");

  const apellidoPaterno = asCleanString(data?.apellidoPaterno);
  const apellidoMaterno = asCleanString(data?.apellidoMaterno);
  const nombres = asCleanString(data?.nombres);
  if (!apellidoPaterno || !apellidoMaterno || !nombres) {
    throw new https.HttpsError("invalid-argument", "Apellido paterno, apellido materno y nombres son requeridos.");
  }

  try {
    const response = await dataConnect.executeGraphql<{
      grupoModulo: { id: number; grupoId: number; moduloId: number } | null;
      moduloEstudiante: {
        id: number;
        moduloId: number;
        grupoId?: number | null;
        matricula?: {
          id: number;
          archivado?: boolean | null;
          user?: {
            id: number;
            documentId?: string | null;
          } | null;
        } | null;
      } | null;
    }, { grupoModuloId: number; moduloEstudianteId: number }>(
      REGISTRO_AUXILIAR_RETIRE_MATRICULA_QUERY,
      { variables: { grupoModuloId, moduloEstudianteId } },
    );
    const grupoModulo = response.data.grupoModulo;
    const moduloEstudiante = response.data.moduloEstudiante;
    const user = moduloEstudiante?.matricula?.user;
    if (
      !grupoModulo ||
      !moduloEstudiante ||
      moduloEstudiante.grupoId !== grupoModulo.grupoId ||
      moduloEstudiante.moduloId !== grupoModulo.moduloId ||
      moduloEstudiante.matricula?.archivado ||
      !user?.id
    ) {
      throw new https.HttpsError("not-found", "No se encontro el estudiante en este registro.");
    }

    const username = buildStudentUsername({ nombres, apellidoPaterno, apellidoMaterno });
    const payload: DataConnectUserInput = {
      username,
      nombre: nombres,
      apellidoPaterno,
      apellidoMaterno,
      fechaModificacion: new Date().toISOString(),
    };

    const updated = await dataConnect.executeGraphql<
      { user_update: unknown },
      { id: number; data: DataConnectUserInput }
    >(UPDATE_USER_MUTATION, { variables: { id: user.id, data: payload } });

    const documentId = asCleanString(user.documentId);
    if (documentId && !documentId.startsWith("matricula:")) {
      await authAdmin.updateUser(documentId, { displayName: username }).catch((error: unknown) => {
        const code = (error as { code?: string } | null)?.code;
        if (code !== "auth/user-not-found") throw error;
      });
    }

    return {
      id: getIdFromKeyOutput(updated.data.user_update) ?? user.id,
      user: {
        id: user.id,
        username,
        nombre: nombres,
        apellidoPaterno,
        apellidoMaterno,
      },
    };
  } catch (error) {
    if (error instanceof https.HttpsError) throw error;
    console.error("Error in updateRegistroAuxiliarEstudianteNombre:", error);
    throw new https.HttpsError("internal", "No se pudo actualizar el nombre del estudiante.");
  }
});

export const saveRegistroAuxiliar = https.onCall(async (data: RegistroAuxiliarSaveInput, context) => {
  const grupoModuloId = toNumber(data?.grupoModuloId, -1);
  const notas = Array.isArray(data?.notas) ? data.notas : [];
  const efsrtPppPromedios = Array.isArray(data?.efsrtPppPromedios) ? data.efsrtPppPromedios : [];
  if (grupoModuloId <= 0) {
    throw new https.HttpsError("invalid-argument", "grupoModuloId is required.");
  }
  await ensureRegistroAuxiliarAccess(context, grupoModuloId, "edit");

  const cleanNotas = notas
    .map((item) => ({
      matriculaId: toNumber(item.matriculaId, -1),
      indicadorCapacidadId: toNumber(item.indicadorCapacidadId, -1),
      nota: normalizedNota(item.nota),
    }))
    .filter((item) => item.matriculaId > 0 && item.indicadorCapacidadId > 0);

  const cleanEfsrtPppPromedios = efsrtPppPromedios
    .map((item) => ({
      moduloEstudianteId: toNumber(item.moduloEstudianteId, -1),
      promedioFinal: normalizedNota(item.promedioFinal),
    }))
    .filter((item) => item.moduloEstudianteId > 0);

  try {
    const grupoModuloResponse = await dataConnect.executeGraphql<
      {
        grupoModulo: (RegistroAuxiliarGrupoModulo & {
          modulo?: {
            plan?: {
              carrera?: {
                tipoCarrera?: {
                  nombre?: string | null;
                } | null;
              } | null;
            } | null;
          } | null;
        }) | null;
      },
      { grupoModuloId: number }
    >(
      `query RegistroAuxiliarSaveGrupoModulo($grupoModuloId: Int!) {
        grupoModulo(id: $grupoModuloId) {
          id
          grupoId
          moduloId
          modulo {
            plan {
              carrera {
                tipoCarrera {
                  nombre
                }
              }
            }
          }
        }
      }`,
      { variables: { grupoModuloId } },
    );
    const grupoModulo = grupoModuloResponse.data.grupoModulo;
    if (!grupoModulo?.grupoId || !grupoModulo?.moduloId) {
      throw new https.HttpsError("not-found", "No se encontro el grupo-modulo solicitado.");
    }
    const { grupoId, moduloId } = grupoModulo;
    const opcionOcupacional = isOpcionOcupacional(grupoModulo.modulo?.plan?.carrera?.tipoCarrera?.nombre);

    const contextResponse = await dataConnect.executeGraphql<{
      grupoModuloUnidadesDidacticas: Array<{ orden?: number | null; unidadDidacticaId: number }>;
      unidadDidacticaModulos: Array<{ orden?: number | null; unidadDidacticaId: number }>;
      capacidadesTerminales: RegistroAuxiliarCapacidad[];
      indicadoresCapacidad: RegistroAuxiliarIndicador[];
      modulosEstudiantes: Array<{ id: number }>;
    }, { grupoModuloId: number; moduloId: number; grupoId: number }>(
      `
        query RegistroAuxiliarSaveContext($grupoModuloId: Int!, $moduloId: Int!, $grupoId: Int!) {
          grupoModuloUnidadesDidacticas(where: { grupoModuloId: { eq: $grupoModuloId } }, limit: 500) {
            orden
            unidadDidacticaId
          }
          unidadDidacticaModulos(where: { moduloId: { eq: $moduloId } }, limit: 500) {
            orden
            unidadDidacticaId
          }
          capacidadesTerminales(limit: 50000) {
            id
            descripcion
            sigla
            unidadDidacticaId
          }
          indicadoresCapacidad(limit: 100000) {
            id
            descripcion
            sigla
            capacidadTerminalId
          }
          modulosEstudiantes(where: { grupoId: { eq: $grupoId }, moduloId: { eq: $moduloId } }, limit: 1000) {
            id
          }
        }
      `,
      { variables: { grupoModuloId, moduloId, grupoId } },
    );

    const unidadIds = buildUnidadIds(contextResponse.data);
    const unidadIdSet = new Set(unidadIds);
    const capacidades = (contextResponse.data.capacidadesTerminales ?? [])
      .filter((capacidad) => capacidad.unidadDidacticaId && unidadIdSet.has(capacidad.unidadDidacticaId));
    const capacidadById = new Map(capacidades.map((capacidad) => [capacidad.id, capacidad]));
    const indicadores = (contextResponse.data.indicadoresCapacidad ?? [])
      .filter((indicador) => indicador.capacidadTerminalId && capacidadById.has(indicador.capacidadTerminalId))
      .sort((a, b) => a.id - b.id);
    const indicadorById = new Map(indicadores.map((indicador) => [indicador.id, indicador]));
    const moduloEstudianteIds = new Set((contextResponse.data.modulosEstudiantes ?? []).map((item) => item.id));
    const notasByMatricula = new Map<number, Map<number, number | null>>();

    for (const nota of cleanNotas) {
      if (!indicadorById.has(nota.indicadorCapacidadId)) continue;
      await upsertIndicadorPromedio(nota.matriculaId, nota.indicadorCapacidadId, nota.nota);
      const current = notasByMatricula.get(nota.matriculaId) ?? new Map<number, number | null>();
      current.set(nota.indicadorCapacidadId, nota.nota);
      notasByMatricula.set(nota.matriculaId, current);
    }

    for (const [matriculaId, notasByIndicador] of notasByMatricula.entries()) {
      const capacidadPromedios = new Map<number, number | null>();
      const unidadPromedios = new Map<number, number | null>();

      for (const capacidad of capacidades) {
        const indicadorIds = indicadores
          .filter((indicador) => indicador.capacidadTerminalId === capacidad.id)
          .map((indicador) => indicador.id);
        const promedio = opcionOcupacional
          ? roundPromedio(indicadorIds.length > 0 ? notasByIndicador.get(indicadorIds[indicadorIds.length - 1]) : null)
          : average(indicadorIds.map((indicadorId) => notasByIndicador.get(indicadorId)));
        capacidadPromedios.set(capacidad.id, promedio);
        await upsertCapacidadPromedio(matriculaId, capacidad.id, promedio);
      }

      for (const unidadId of unidadIds) {
        const unidadCapacidadIds = capacidades
          .filter((capacidad) => capacidad.unidadDidacticaId === unidadId)
          .map((capacidad) => capacidad.id);
        const promedio = average(unidadCapacidadIds.map((capacidadId) => capacidadPromedios.get(capacidadId)));
        unidadPromedios.set(unidadId, promedio);
        await upsertUnidadPromedio(matriculaId, unidadId, promedio);
      }

      const moduloEstudianteId = await updateModuloResultado(
        matriculaId,
        moduloId,
        grupoId,
        average(unidadIds.map((unidadId) => unidadPromedios.get(unidadId))),
        sum(indicadores.map((indicador) => notasByIndicador.get(indicador.id))),
      );
      if (moduloEstudianteId && !opcionOcupacional) {
        await ensureEfsrtPppEstudiante(grupoModuloId, moduloEstudianteId);
      }
    }

    let efsrtPppSaved = 0;
    if (!opcionOcupacional) {
      for (const promedio of cleanEfsrtPppPromedios) {
        if (!moduloEstudianteIds.has(promedio.moduloEstudianteId)) continue;
        await upsertEfsrtPppPromedio(grupoModuloId, promedio.moduloEstudianteId, promedio.promedioFinal);
        efsrtPppSaved += 1;
      }
    }

    return { saved: cleanNotas.length, efsrtPppSaved };
  } catch (error) {
    if (error instanceof https.HttpsError) throw error;
    console.error("Error in saveRegistroAuxiliar:", error);
    throw new https.HttpsError("internal", "No se pudo guardar el registro auxiliar.");
  }
});
