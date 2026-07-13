import { https } from "firebase-functions/v1";
import {
  asNullableTimestamp,
  buildGrupoDataFromInput,
  buildGrupoModuloDataFromInput,
  buildGrupoModuloUnidadDidacticaDataFromInput,
  getIdFromKeyOutput,
  toBoolean,
  toNumber,
  toNumberOrNull,
} from "../core/userMappers.js";
import { dataConnect } from "../core/dataConnectCore.js";
import { requirePermission } from "../core/permissions.js";
import {
  DataConnectGrupo,
  DataConnectGrupoInput,
  DataConnectGrupoModulo,
  DataConnectGrupoModuloInput,
  DataConnectGrupoModuloUnidadDidactica,
  DataConnectGrupoModuloUnidadDidacticaInput,
  DataConnectPaqueteModulo,
  DataConnectPersonal,
  DataConnectUnidadDidacticaModulo,
} from "../core/types.js";
import {
  DELETE_GRUPO_MUTATION,
  DELETE_GRUPO_MODULOS_BY_GRUPO_MUTATION,
  INSERT_GRUPO_MODULO_MUTATION,
  INSERT_GRUPO_MODULO_UNIDAD_DIDACTICA_MUTATION,
  INSERT_GRUPO_MUTATION,
  UPDATE_GRUPO_MUTATION,
} from "../../dataconnectOperations.js";
import {
  deleteWorkspaceGroup,
  isWorkspaceGroupSyncEnabled,
  syncGrupoToWorkspace,
  WorkspaceSyncError,
} from "../../workspace/groupWorkspaceSync.js";

const LIST_GRUPOS_QUERY = `
  query ListGruposManual {
    grupos(limit: 1000) {
      id
      turnoNombre
      descripcion
      nombreDisplay
      estado
      archivado
      fechaCreacion
      fechaActualizacion
      semestreId
      semestre {
        titulo
      }
      personalId
      personal {
        id
        displayName
        userId
        user {
          username
          nombre
          apellidoPaterno
          correoInstitucional
        }
      }
      paqueteId
      paquete {
        titulo
      }
      turnoId
      turno {
        nombre
        horaInicio
        horaFin
      }
      horarioId
      horario {
        nombre
        regla
        diasSemana
        viernesAlternoInicio
      }
      grupoOrd
      workspaceName
      workspaceCorreo
    }
    grupoModulos(limit: 3000) {
      id
      nombre
      orden
      obligatorio
      inicio
      fin
      grupoId
      moduloId
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
      calendarioId
      calendario {
        titulo
        fin
        duracion
        horarioId
        horario {
          nombre
        }
        semestre {
          titulo
          fin
        }
      }
    }
    grupoModuloUnidadesDidacticas(limit: 5000) {
      id
      orden
      inicio
      fin
      grupoModuloId
      unidadDidacticaId
      grupoModulo {
        id
        grupoId
        moduloId
      }
      unidadDidactica {
        id
        nombre
        duracion
        creditos
        sigla
      }
    }
  }
`;

const GET_GRUPO_QUERY = `
  query GetGrupoManual($id: Int!) {
    grupo(id: $id) {
      id
      turnoNombre
      descripcion
      nombreDisplay
      estado
      archivado
      fechaCreacion
      fechaActualizacion
      semestreId
      semestre {
        titulo
      }
      personalId
      personal {
        id
        displayName
        userId
        user {
          username
          nombre
          apellidoPaterno
          correoInstitucional
        }
      }
      paqueteId
      paquete {
        titulo
      }
      turnoId
      turno {
        nombre
        horaInicio
        horaFin
      }
      horarioId
      horario {
        nombre
        regla
        diasSemana
        viernesAlternoInicio
      }
      grupoOrd
      workspaceName
      workspaceCorreo
    }
    grupoModulos(where: { grupoId: { eq: $id } }, limit: 10) {
      id
      nombre
      orden
      obligatorio
      inicio
      fin
      grupoId
      moduloId
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
      calendarioId
      calendario {
        titulo
        fin
        duracion
        horarioId
        horario {
          nombre
        }
        semestre {
          titulo
          fin
        }
      }
    }
    grupoModuloUnidadesDidacticas(limit: 5000) {
      id
      orden
      inicio
      fin
      grupoModuloId
      unidadDidacticaId
      grupoModulo {
        id
        grupoId
        moduloId
      }
      unidadDidactica {
        id
        nombre
        duracion
        creditos
        sigla
      }
    }
  }
`;

const GET_PAQUETE_MODULOS_FOR_GRUPO_QUERY = `
  query GetPaqueteModulosForGrupo($paqueteId: Int!) {
    paquete(id: $paqueteId) {
      id
      titulo
    }
    paqueteModulos(where: { paqueteId: { eq: $paqueteId } }, limit: 10) {
      id
      orden
      obligatorio
      paqueteId
      moduloId
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
    unidadDidacticaModulos(limit: 3000) {
      id
      orden
      unidadDidacticaId
      moduloId
      unidadDidactica {
        id
        nombre
        duracion
        creditos
        sigla
      }
    }
  }
`;

const GET_GRUPO_MODULOS_CALENDARIOS_QUERY = `
  query GetGrupoModulosCalendarios($grupoId: Int!) {
    grupoModulos(where: { grupoId: { eq: $grupoId } }, limit: 50) {
      id
      nombre
      moduloId
      calendarioId
      inicio
      fin
    }
    grupoModuloUnidadesDidacticas(limit: 5000) {
      id
      orden
      inicio
      fin
      grupoModuloId
      unidadDidacticaId
      grupoModulo {
        id
        grupoId
        moduloId
      }
      unidadDidactica {
        id
        nombre
        duracion
        creditos
        sigla
      }
    }
  }
`;

const GET_PREVIOUS_GRUPO_WORKSPACE_QUERY = `
  query GetPreviousGrupoWorkspace($id: Int!) {
    grupo(id: $id) {
      id
      workspaceCorreo
    }
  }
`;

const GET_GRUPO_WORKSPACE_CONTEXT_QUERY = `
  query GetGrupoWorkspaceContext($personalId: Int!, $semestreId: Int!) {
    personal(id: $personalId) {
      id
      displayName
      user {
        username
        correoInstitucional
      }
    }
    semestre(id: $semestreId) {
      id
      coordinador1 {
        id
        displayName
        user {
          username
          correoInstitucional
        }
      }
      coordinador2 {
        id
        displayName
        user {
          username
          correoInstitucional
        }
      }
    }
  }
`;

function validateWorkspaceFields(payload: DataConnectGrupoInput) {
  if ((payload.workspaceName ?? "").length > 73) {
    throw new https.HttpsError("invalid-argument", "Nombre Workspace no puede superar 73 caracteres.");
  }

  if ((payload.workspaceCorreo ?? "").length > 80) {
    throw new https.HttpsError("invalid-argument", "Correo Workspace no puede superar 80 caracteres.");
  }

  if (isWorkspaceGroupSyncEnabled()) {
    if (!payload.workspaceName?.trim()) {
      throw new https.HttpsError("failed-precondition", "Nombre Workspace es obligatorio para sincronizar Workspace.");
    }

    if (!payload.workspaceCorreo?.trim()) {
      throw new https.HttpsError("failed-precondition", "Correo Workspace es obligatorio para sincronizar Workspace.");
    }
  }
}

type GrupoWorkspaceContext = {
  personal: Pick<DataConnectPersonal, "id" | "displayName" | "user"> | null;
  semestre: {
    id: number;
    coordinador1?: Pick<DataConnectPersonal, "id" | "displayName" | "user"> | null;
    coordinador2?: Pick<DataConnectPersonal, "id" | "displayName" | "user"> | null;
  } | null;
};

function getInstitutionalEmail(personal: Pick<DataConnectPersonal, "user"> | null | undefined) {
  return String(personal?.user?.correoInstitucional ?? "").trim().toLowerCase();
}

async function getPreviousGrupoWorkspaceCorreo(grupoId: number | null) {
  if (!grupoId) return null;

  const response = await dataConnect.executeGraphql<
    { grupo: Pick<DataConnectGrupo, "id" | "workspaceCorreo"> | null },
    { id: number }
  >(GET_PREVIOUS_GRUPO_WORKSPACE_QUERY, { variables: { id: grupoId } });

  return response.data.grupo?.workspaceCorreo ?? null;
}

async function getGrupoWorkspaceContext(payload: DataConnectGrupoInput): Promise<GrupoWorkspaceContext | null> {
  if (!isWorkspaceGroupSyncEnabled()) return null;

  if (!payload.personalId) {
    throw new https.HttpsError("failed-precondition", "Selecciona personal para sincronizar el grupo en Workspace.");
  }

  if (!payload.semestreId) {
    throw new https.HttpsError("failed-precondition", "Selecciona semestre para sincronizar el grupo en Workspace.");
  }

  const response = await dataConnect.executeGraphql<
    GrupoWorkspaceContext,
    { personalId: number; semestreId: number }
  >(GET_GRUPO_WORKSPACE_CONTEXT_QUERY, {
    variables: {
      personalId: payload.personalId,
      semestreId: payload.semestreId,
    },
  });

  const context = response.data;
  const ownerEmail = getInstitutionalEmail(context.personal);
  const coordinador1Email = getInstitutionalEmail(context.semestre?.coordinador1);
  const coordinador2Email = getInstitutionalEmail(context.semestre?.coordinador2);
  const missing = [
    !ownerEmail ? "correo institucional del personal docente" : "",
    !coordinador1Email ? "correo institucional del Coordinador 1" : "",
    !coordinador2Email ? "correo institucional del Coordinador 2" : "",
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new https.HttpsError(
      "failed-precondition",
      `No se puede sincronizar el grupo Workspace: falta ${missing.join(", ")}.`,
    );
  }

  return context;
}

const sortPaqueteModulos = (items: DataConnectPaqueteModulo[]) =>
  items
    .slice()
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || a.moduloId - b.moduloId);

const sortGrupos = (items: DataConnectGrupo[]) =>
  items
    .slice()
    .sort((a, b) =>
      String(a.nombreDisplay ?? "").localeCompare(String(b.nombreDisplay ?? ""), "es", { numeric: true }) ||
      (a.grupoOrd ?? 0) - (b.grupoOrd ?? 0) ||
      a.id - b.id,
    );

const sortGrupoModulos = (items: DataConnectGrupoModulo[]) =>
  items
    .slice()
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || a.moduloId - b.moduloId);

interface GrupoModuloDetalleInput {
  moduloId: number;
  orden?: number | null;
  obligatorio?: boolean;
  inicio?: string | null;
  fin?: string | null;
  calendarioId?: number | null;
  unidadDidacticas: GrupoModuloUnidadDidacticaDetalleInput[];
  hasInicio: boolean;
  hasFin: boolean;
  hasCalendarioId: boolean;
}

interface GrupoModuloUnidadDidacticaDetalleInput {
  unidadDidacticaId: number;
  orden?: number | null;
  inicio?: string | null;
  fin?: string | null;
  hasInicio: boolean;
  hasFin: boolean;
}

const normalizeGrupoModuloUnidadDidacticas = (value: unknown): GrupoModuloUnidadDidacticaDetalleInput[] => {
  if (!Array.isArray(value)) return [];

  const result: GrupoModuloUnidadDidacticaDetalleInput[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const raw = item as Record<string, unknown>;
    const unidadDidacticaId = toNumber(raw.unidadDidacticaId, -1);
    if (unidadDidacticaId <= 0) continue;
    result.push({
      unidadDidacticaId,
      orden: toNumberOrNull(raw.orden),
      inicio: asNullableTimestamp(raw.inicio),
      fin: asNullableTimestamp(raw.fin),
      hasInicio: Object.prototype.hasOwnProperty.call(raw, "inicio"),
      hasFin: Object.prototype.hasOwnProperty.call(raw, "fin"),
    });
  }

  return result;
};

const normalizeGrupoModuloDetalles = (value: unknown) => {
  const detalles = new Map<number, GrupoModuloDetalleInput>();
  if (!Array.isArray(value)) return detalles;

  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const raw = item as Record<string, unknown>;
    const moduloId = toNumber(raw.moduloId, -1);
    if (moduloId <= 0) continue;
    detalles.set(moduloId, {
      moduloId,
      orden: toNumberOrNull(raw.orden),
      obligatorio: toBoolean(raw.obligatorio),
      inicio: asNullableTimestamp(raw.inicio),
      fin: asNullableTimestamp(raw.fin),
      calendarioId: toNumberOrNull(raw.calendarioId),
      unidadDidacticas: normalizeGrupoModuloUnidadDidacticas(raw.unidadDidacticas),
      hasInicio: Object.prototype.hasOwnProperty.call(raw, "inicio"),
      hasFin: Object.prototype.hasOwnProperty.call(raw, "fin"),
      hasCalendarioId: Object.prototype.hasOwnProperty.call(raw, "calendarioId"),
    });
  }

  return detalles;
};

function getModuloNombre(modulo?: Pick<DataConnectPaqueteModulo, "modulo">["modulo"] | null) {
  return String(modulo?.titulo || modulo?.tituloComercial || "").trim();
}

function buildGrupoModuloNombre(
  grupoNombre: string | null | undefined,
  paqueteTitulo: string | null | undefined,
  moduloNombre: string,
) {
  const grupoText = String(grupoNombre ?? "").trim();
  const moduloText = String(moduloNombre ?? "").trim();
  if (!grupoText) return moduloText || null;
  if (!moduloText) return grupoText;

  const paqueteText = String(paqueteTitulo ?? "").trim();
  if (paqueteText && grupoText.includes(paqueteText)) {
    return grupoText.replace(paqueteText, moduloText).replace(/\s+/g, " ").trim();
  }

  const structuredName = grupoText.match(/^(\S+\s+).+?(\s+\[[^\]]+\].*)$/);
  if (structuredName) {
    return `${structuredName[1]}${moduloText}${structuredName[2]}`.replace(/\s+/g, " ").trim();
  }

  return `${grupoText} - ${moduloText}`.replace(/\s+/g, " ").trim();
}

async function getPaqueteModulosOrThrow(paqueteId: number) {
  const paqueteResponse = await dataConnect.executeGraphql<{
    paquete: { id: number; titulo?: string | null } | null;
    paqueteModulos: DataConnectPaqueteModulo[];
    unidadDidacticaModulos: DataConnectUnidadDidacticaModulo[];
  }, { paqueteId: number }>(GET_PAQUETE_MODULOS_FOR_GRUPO_QUERY, { variables: { paqueteId } });

  const paqueteModulos = sortPaqueteModulos(paqueteResponse.data.paqueteModulos ?? []);
  if (paqueteModulos.length < 1 || paqueteModulos.length > 3) {
    throw new https.HttpsError(
      "failed-precondition",
      "El paquete debe tener entre 1 y 3 modulos para crear grupos.",
    );
  }

  return {
    paquete: paqueteResponse.data.paquete,
    paqueteModulos,
    unidadDidacticaModulos: paqueteResponse.data.unidadDidacticaModulos ?? [],
  };
}

async function syncGrupoModulos(
  grupoId: number,
  paqueteId: number,
  detalleInput: Map<number, GrupoModuloDetalleInput> = new Map(),
  grupoNombre?: string | null,
) {
  const { paquete, paqueteModulos, unidadDidacticaModulos } = await getPaqueteModulosOrThrow(paqueteId);
  const existingResponse = await dataConnect.executeGraphql<{
    grupoModulos: Array<Pick<DataConnectGrupoModulo, "id" | "moduloId" | "calendarioId" | "inicio" | "fin">>;
    grupoModuloUnidadesDidacticas: DataConnectGrupoModuloUnidadDidactica[];
  }, { grupoId: number }>(
    GET_GRUPO_MODULOS_CALENDARIOS_QUERY,
    { variables: { grupoId } },
  );
  const previousGrupoModuloByModuloId = new Map<
    number,
    Pick<DataConnectGrupoModulo, "id" | "moduloId" | "calendarioId" | "inicio" | "fin">
  >();
  for (const item of existingResponse.data.grupoModulos ?? []) {
    previousGrupoModuloByModuloId.set(item.moduloId, item);
  }

  const previousUnidadByModuloUnidad = new Map<string, DataConnectGrupoModuloUnidadDidactica>();
  for (const item of existingResponse.data.grupoModuloUnidadesDidacticas ?? []) {
    const moduloId = item.grupoModulo?.grupoId === grupoId ? item.grupoModulo?.moduloId : null;
    if (!moduloId) continue;
    previousUnidadByModuloUnidad.set(`${moduloId}:${item.unidadDidacticaId}`, item);
  }

  const unidadDidacticaModulosByModuloId = new Map<number, DataConnectUnidadDidacticaModulo[]>();
  const paqueteModuloIds = new Set(paqueteModulos.map((item) => item.moduloId));
  for (const item of unidadDidacticaModulos) {
    if (!paqueteModuloIds.has(item.moduloId)) continue;
    const current = unidadDidacticaModulosByModuloId.get(item.moduloId) ?? [];
    current.push(item);
    unidadDidacticaModulosByModuloId.set(item.moduloId, current);
  }

  await dataConnect.executeGraphql<
    { grupoModulo_deleteMany: number },
    { grupoId: number }
  >(DELETE_GRUPO_MODULOS_BY_GRUPO_MUTATION, { variables: { grupoId } });

  await Promise.all(
    paqueteModulos.map(async (paqueteModulo, index) => {
      const detalle = detalleInput.get(paqueteModulo.moduloId);
      const previous = previousGrupoModuloByModuloId.get(paqueteModulo.moduloId);
      const moduloNombre = getModuloNombre(paqueteModulo.modulo);
      const grupoModulo = buildGrupoModuloDataFromInput({
        nombre: buildGrupoModuloNombre(grupoNombre, paquete?.titulo, moduloNombre),
        grupoId,
        moduloId: paqueteModulo.moduloId,
        orden: detalle?.orden ?? paqueteModulo.orden ?? index + 1,
        obligatorio: detalle?.obligatorio ?? paqueteModulo.obligatorio ?? true,
        inicio: detalle?.hasInicio ? detalle.inicio ?? null : previous?.inicio ?? null,
        fin: detalle?.hasFin ? detalle.fin ?? null : previous?.fin ?? null,
        calendarioId: detalle?.hasCalendarioId
          ? detalle.calendarioId ?? null
          : previous?.calendarioId ?? null,
      }) as DataConnectGrupoModuloInput;

      const inserted = await dataConnect.executeGraphql<
        { grupoModulo_insert: unknown },
        { data: DataConnectGrupoModuloInput }
      >(INSERT_GRUPO_MODULO_MUTATION, { variables: { data: grupoModulo } });

      const grupoModuloId = getIdFromKeyOutput(inserted.data.grupoModulo_insert);
      if (!grupoModuloId) {
        throw new Error("No se pudo obtener el id del modulo del grupo guardado.");
      }

      const detalleUnidadById = new Map(
        (detalle?.unidadDidacticas ?? []).map((item) => [item.unidadDidacticaId, item]),
      );
      const baseUnidades = (unidadDidacticaModulosByModuloId.get(paqueteModulo.moduloId) ?? [])
        .slice()
        .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || a.unidadDidacticaId - b.unidadDidacticaId);

      await Promise.all(
        baseUnidades.map((unidadModulo, unidadIndex) => {
          const detalleUnidad = detalleUnidadById.get(unidadModulo.unidadDidacticaId);
          const previousUnidad = previousUnidadByModuloUnidad.get(
            `${paqueteModulo.moduloId}:${unidadModulo.unidadDidacticaId}`,
          );
          const grupoModuloUnidad = buildGrupoModuloUnidadDidacticaDataFromInput({
            grupoModuloId,
            unidadDidacticaId: unidadModulo.unidadDidacticaId,
            orden: detalleUnidad?.orden ?? unidadModulo.orden ?? unidadIndex + 1,
            inicio: detalleUnidad?.hasInicio ? detalleUnidad.inicio ?? null : previousUnidad?.inicio ?? null,
            fin: detalleUnidad?.hasFin ? detalleUnidad.fin ?? null : previousUnidad?.fin ?? null,
          });

          return dataConnect.executeGraphql<
            { grupoModuloUnidadDidactica_insert: unknown },
            { data: DataConnectGrupoModuloUnidadDidacticaInput }
          >(INSERT_GRUPO_MODULO_UNIDAD_DIDACTICA_MUTATION, { variables: { data: grupoModuloUnidad } });
        }),
      );
    }),
  );
}

function attachGrupoModulos(
  grupos: DataConnectGrupo[],
  grupoModulos: DataConnectGrupoModulo[],
  grupoModuloUnidadesDidacticas: DataConnectGrupoModuloUnidadDidactica[] = [],
) {
  const modulosByGrupoId = new Map<number, DataConnectGrupoModulo[]>();
  const unidadesByGrupoModuloId = new Map<number, DataConnectGrupoModuloUnidadDidactica[]>();
  for (const item of grupoModuloUnidadesDidacticas) {
    const current = unidadesByGrupoModuloId.get(item.grupoModuloId) ?? [];
    current.push(item);
    unidadesByGrupoModuloId.set(item.grupoModuloId, current);
  }

  for (const item of grupoModulos) {
    const current = modulosByGrupoId.get(item.grupoId) ?? [];
    current.push({
      ...item,
      unidadDidacticas: (unidadesByGrupoModuloId.get(item.id) ?? [])
        .slice()
        .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || a.unidadDidacticaId - b.unidadDidacticaId),
    });
    modulosByGrupoId.set(item.grupoId, current);
  }

  return sortGrupos(grupos).map((grupo) => {
    const items = sortGrupoModulos(modulosByGrupoId.get(grupo.id) ?? []);
    return {
      ...grupo,
      grupoModulos: items,
      moduloIds: items.map((item) => item.moduloId),
    };
  });
}

export const listGrupos = https.onCall(async (_data, context) => {
  await requirePermission(context, "grupos", "view");

  try {
    const response = await dataConnect.executeGraphql<{
      grupos: DataConnectGrupo[];
      grupoModulos: DataConnectGrupoModulo[];
      grupoModuloUnidadesDidacticas: DataConnectGrupoModuloUnidadDidactica[];
    }, Record<string, never>>(
      LIST_GRUPOS_QUERY,
    );
    return {
      grupos: attachGrupoModulos(
        response.data.grupos ?? [],
        response.data.grupoModulos ?? [],
        response.data.grupoModuloUnidadesDidacticas ?? [],
      ),
    };
  } catch (error) {
    console.error("Error in listGrupos:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while listing groups.");
  }
});

export const getGrupo = https.onCall(async (data, context) => {
  await requirePermission(context, "grupos", "view");

  const grupoId = toNumber(data?.id, -1);
  if (grupoId <= 0) {
    throw new https.HttpsError("invalid-argument", "id is required.");
  }

  try {
    const response = await dataConnect.executeGraphql<{
      grupo: DataConnectGrupo | null;
      grupoModulos: DataConnectGrupoModulo[];
      grupoModuloUnidadesDidacticas: DataConnectGrupoModuloUnidadDidactica[];
    }, { id: number }>(
      GET_GRUPO_QUERY,
      { variables: { id: grupoId } },
    );
    const grupo = response.data.grupo;
    if (!grupo) return { grupo: null };
    const grupoModulos = sortGrupoModulos(
      attachGrupoModulos(
        [grupo],
        response.data.grupoModulos ?? [],
        response.data.grupoModuloUnidadesDidacticas ?? [],
      )[0]?.grupoModulos ?? [],
    );
    return {
      grupo: {
        ...grupo,
        grupoModulos,
        moduloIds: grupoModulos.map((item) => item.moduloId),
      },
    };
  } catch (error) {
    console.error("Error in getGrupo:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while getting group.");
  }
});

export const createOrUpdateGrupo = https.onCall(async (data, context) => {
  const now = new Date().toISOString();
  const payload = buildGrupoDataFromInput({
    ...(data as Record<string, unknown>),
    estado: (data as Record<string, unknown> | null)?.estado || "activo",
    archivado: (data as Record<string, unknown> | null)?.archivado ?? false,
    fechaActualizacion: now,
  }) as DataConnectGrupoInput;

  const grupoId = toNumberOrNull(data?.id);
  await requirePermission(context, "grupos", grupoId ? "edit" : "create");
  const paqueteId = toNumberOrNull(data?.paqueteId);
  const grupoModuloDetalles = normalizeGrupoModuloDetalles(data?.grupoModulos);

  validateWorkspaceFields(payload);

  if (!paqueteId) {
    throw new https.HttpsError("invalid-argument", "Selecciona un paquete.");
  }

  try {
    const previousWorkspaceCorreo = await getPreviousGrupoWorkspaceCorreo(grupoId ?? null);
    const workspaceContext = await getGrupoWorkspaceContext(payload);

    if (grupoId) {
      const updated = await dataConnect.executeGraphql<
        { grupo_update: unknown },
        { id: number; data: DataConnectGrupoInput }
      >(UPDATE_GRUPO_MUTATION, { variables: { id: grupoId, data: payload } });

      await syncGrupoModulos(grupoId, paqueteId, grupoModuloDetalles, payload.nombreDisplay ?? null);
      const workspaceResult = await syncGrupoToWorkspace({
        email: payload.workspaceCorreo ?? "",
        previousEmail: previousWorkspaceCorreo,
        name: payload.workspaceName ?? "",
        description: `Grupo: ${payload.nombreDisplay ?? ""}`,
        ownerEmail: getInstitutionalEmail(workspaceContext?.personal),
        managerEmails: [
          getInstitutionalEmail(workspaceContext?.semestre?.coordinador1),
          getInstitutionalEmail(workspaceContext?.semestre?.coordinador2),
        ],
      });

      return {
        id: getIdFromKeyOutput(updated.data.grupo_update) ?? grupoId,
        ids: [grupoId],
        workspace: workspaceResult,
      };
    }

    const created = await dataConnect.executeGraphql<
      { grupo_insert: unknown },
      { data: DataConnectGrupoInput }
    >(INSERT_GRUPO_MUTATION, {
      variables: {
        data: {
          ...payload,
          paqueteId,
          fechaCreacion: now,
          fechaActualizacion: now,
        },
      },
    });

    const createdId = getIdFromKeyOutput(created.data.grupo_insert);
    if (createdId) {
      try {
        await syncGrupoModulos(createdId, paqueteId, grupoModuloDetalles, payload.nombreDisplay ?? null);
        const workspaceResult = await syncGrupoToWorkspace({
          email: payload.workspaceCorreo ?? "",
          previousEmail: null,
          name: payload.workspaceName ?? "",
          description: `Grupo: ${payload.nombreDisplay ?? ""}`,
          ownerEmail: getInstitutionalEmail(workspaceContext?.personal),
          managerEmails: [
            getInstitutionalEmail(workspaceContext?.semestre?.coordinador1),
            getInstitutionalEmail(workspaceContext?.semestre?.coordinador2),
          ],
        });
        return { id: createdId, ids: [createdId], workspace: workspaceResult };
      } catch (error) {
        await dataConnect.executeGraphql<{ grupo_delete: unknown }, { id: number }>(
          DELETE_GRUPO_MUTATION,
          { variables: { id: createdId } },
        );
        throw error;
      }
    }
    return { id: createdId, ids: createdId ? [createdId] : [] };
  } catch (error) {
    if (error instanceof https.HttpsError) throw error;
    if (error instanceof WorkspaceSyncError) {
      throw new https.HttpsError("failed-precondition", error.message);
    }
    console.error("Error in createOrUpdateGrupo:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while saving group.");
  }
});

export const deleteGrupo = https.onCall(async (data, context) => {
  await requirePermission(context, "grupos", "delete");

  const grupoId = toNumber(data?.id, -1);
  if (grupoId <= 0) {
    throw new https.HttpsError("invalid-argument", "id is required.");
  }

  try {
    const workspaceCorreo = await getPreviousGrupoWorkspaceCorreo(grupoId);
    const workspaceResult = await deleteWorkspaceGroup(workspaceCorreo);

    await dataConnect.executeGraphql<
      { grupoModulo_deleteMany: number },
      { grupoId: number }
    >(DELETE_GRUPO_MODULOS_BY_GRUPO_MUTATION, { variables: { grupoId } });

    const deleted = await dataConnect.executeGraphql<{ grupo_delete: unknown }, { id: number }>(
      DELETE_GRUPO_MUTATION,
      { variables: { id: grupoId } },
    );
    return { id: getIdFromKeyOutput(deleted.data.grupo_delete) ?? grupoId, workspace: workspaceResult };
  } catch (error) {
    if (error instanceof WorkspaceSyncError) {
      throw new https.HttpsError("failed-precondition", error.message);
    }
    console.error("Error in deleteGrupo:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while deleting group.");
  }
});
