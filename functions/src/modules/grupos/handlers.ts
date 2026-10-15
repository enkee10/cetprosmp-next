import { saveGrupoWithModulos, DetalleInstancia } from "./saveGrupo.js";
import { https } from "firebase-functions/v1";
import {
  asNullableTimestamp,
  buildGrupoDataFromInput,
  getIdFromKeyOutput,
  toBoolean,
  toNumber,
  toNumberOrNull,
} from "../core/userMappers.js";
import { dataConnect } from "../core/dataConnectCore.js";
import { projectUnidadRelations } from "../competencias/model.js";
import { requirePermission } from "../core/permissions.js";
import {
  DataConnectGrupo,
  DataConnectGrupoInput,
  DataConnectGrupoModulo,
  DataConnectGrupoModuloUnidadDidactica,
  DataConnectPersonal,
  DataConnectCompetenciaUnidadDidactica,
} from "../core/types.js";
import {
  DELETE_GRUPO_MUTATION,
  DELETE_GRUPO_MODULOS_BY_GRUPO_MUTATION,
} from "../../dataconnectOperations.js";
import {
  deleteWorkspaceGroup,
  isWorkspaceGroupSyncEnabled,
  syncGrupoToWorkspace,
  WorkspaceSyncError,
} from "../../workspace/groupWorkspaceSync.js";
import { getConfiguredSemestreConsultaIds } from "../settings/handlers.js";

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
        id
        titulo
        inicio
        fin
        archivado
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
      sufijo
      orden
      obligatorio
      inicio
      fin
      instancia
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
    grupoModulos(where: { grupoId: { eq: $id } }, limit: 50) {
      id
      nombre
      sufijo
      orden
      obligatorio
      inicio
      fin
      instancia
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

const sortGrupoModulos = (items: DataConnectGrupoModulo[]) =>
  items
    .slice()
    .sort((a, b) =>
      (a.orden ?? 0) - (b.orden ?? 0) ||
      a.moduloId - b.moduloId ||
      (a.instancia ?? 1) - (b.instancia ?? 1),
    );

const getGrupoEspecialidadOrden = (grupoModulos: DataConnectGrupoModulo[]) => {
  const values = grupoModulos
    .map((item) => item.modulo?.plan?.carrera?.especialidad?.orden)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return values.length > 0 ? Math.min(...values) : Number.MAX_SAFE_INTEGER;
};

const getGrupoModuloOrden = (grupoModulos: DataConnectGrupoModulo[]) => {
  const values = grupoModulos
    .map((item) => item.modulo?.orden)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return values.length > 0 ? Math.min(...values) : Number.MAX_SAFE_INTEGER;
};

const sortGruposWithModulos = (items: Array<DataConnectGrupo & { grupoModulos?: DataConnectGrupoModulo[] }>) =>
  items
    .slice()
    .sort((a, b) =>
      getGrupoEspecialidadOrden(a.grupoModulos ?? []) - getGrupoEspecialidadOrden(b.grupoModulos ?? []) ||
      getGrupoModuloOrden(a.grupoModulos ?? []) - getGrupoModuloOrden(b.grupoModulos ?? []) ||
      String(a.nombreDisplay ?? "").localeCompare(String(b.nombreDisplay ?? ""), "es", { numeric: true }) ||
      (a.grupoOrd ?? 0) - (b.grupoOrd ?? 0) ||
      a.id - b.id,
    );

type GrupoModuloDetalleInput = DetalleInstancia;

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
  const detalles = new Map<string, GrupoModuloDetalleInput>();
  if (!Array.isArray(value)) throw new https.HttpsError("invalid-argument", "Selecciona los módulos del grupo.");

  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const raw = item as Record<string, unknown>;
    const moduloId = toNumber(raw.moduloId, -1);
    if (moduloId <= 0) continue;
    const instancia = toNumber(raw.instancia, 1);
    if (detalles.has(expandedGrupoModuloKey(moduloId, instancia))) throw new https.HttpsError("invalid-argument", "Hay una instancia de módulo repetida.");
    detalles.set(expandedGrupoModuloKey(moduloId, instancia), {
      moduloId,
      instancia,
      sufijo: raw.sufijo == null ? null : String(raw.sufijo).trim(),
      hasSufijo: Object.prototype.hasOwnProperty.call(raw, "sufijo"),
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

const expandedGrupoModuloKey = (moduloId: number, instancia: number) => `${moduloId}:${instancia}`;

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

  const gruposConModulos = grupos.map((grupo) => {
    const items = sortGrupoModulos(modulosByGrupoId.get(grupo.id) ?? []);
    return {
      ...grupo,
      grupoModulos: items,
      moduloIds: items.map((item) => item.moduloId),
    };
  });
  return sortGruposWithModulos(gruposConModulos);
}

export const listGrupos = https.onCall(async (_data, context) => {
  await requirePermission(context, "grupos", "view");

  try {
    const [response, semestreConsultaIds] = await Promise.all([
      dataConnect.executeGraphql<{
        grupos: DataConnectGrupo[];
        grupoModulos: DataConnectGrupoModulo[];
        grupoModuloUnidadesDidacticas: DataConnectGrupoModuloUnidadDidactica[];
      }, Record<string, never>>(
        LIST_GRUPOS_QUERY,
      ),
      getConfiguredSemestreConsultaIds(),
    ]);
    const allowedSemestreIds = semestreConsultaIds.length > 0 ? new Set(semestreConsultaIds) : null;
    const grupos = (response.data.grupos ?? []).filter((grupo) =>
      !allowedSemestreIds || allowedSemestreIds.has(Number(grupo.semestreId)),
    );
    const grupoIds = new Set(grupos.map((grupo) => grupo.id));
    const grupoModulos = (response.data.grupoModulos ?? []).filter((item) => grupoIds.has(Number(item.grupoId)));
    const grupoModuloIds = new Set(grupoModulos.map((item) => item.id));
    return {
      grupos: attachGrupoModulos(
        grupos,
        grupoModulos,
        (response.data.grupoModuloUnidadesDidacticas ?? []).filter((item) => grupoModuloIds.has(Number(item.grupoModuloId))),
      ),
    };
  } catch (error) {
    console.error("Error in listGrupos:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while listing groups.");
  }
});

export const listGrupoConfiguracionOpciones = https.onCall(async (_data, context) => {
  await requirePermission(context, "grupos", "view");
  const { data } = await dataConnect.executeGraphql<{
    modulos: Array<{id:number; titulo?:string|null; tituloComercial?:string|null; orden?:number|null}>;
    competenciaUnidadesDidacticas: DataConnectCompetenciaUnidadDidactica[];
  }, Record<string, never>>(`query GrupoModuloOpciones {
    modulos(limit:1000){id titulo tituloComercial orden plan{carrera{especialidad{orden}}}}
    competenciaUnidadesDidacticas(limit:5000){id orden competenciaId unidadDidacticaId competencia{id nombre tipo moduloId} unidadDidactica{id nombre duracion creditos sigla}}
  }`);
  const relations = projectUnidadRelations(data.competenciaUnidadesDidacticas);
  const unitsByModulo = new Map<number, Map<number, {orden:number; unidad:unknown}>>();
  for (const relation of relations) {
    const units = unitsByModulo.get(relation.moduloId) ?? new Map();
    if (!units.has(relation.unidadDidacticaId)) units.set(relation.unidadDidacticaId,{orden:relation.orden??0,unidad:relation.unidadDidactica});
    unitsByModulo.set(relation.moduloId,units);
  }
  return {modulos:data.modulos.map(modulo=>({...modulo,unidadDidacticas:Array.from(unitsByModulo.get(modulo.id)?.values()??[]).sort((a,b)=>a.orden-b.orden).map(item=>item.unidad)}))};
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
  const grupoId = toNumberOrNull(data?.id) ?? null;
  await requirePermission(context, "grupos", grupoId ? "edit" : "create");
  const now = new Date().toISOString();
  const payload = buildGrupoDataFromInput({
    ...(data as Record<string, unknown>),
    fechaActualizacion: now,
    ...(!grupoId ? {fechaCreacion:now,estado:data?.estado??"activo",archivado:data?.archivado??false} : {}),
  }) as DataConnectGrupoInput;
  validateWorkspaceFields(payload);
  if (!payload.nombreDisplay?.trim()) throw new https.HttpsError("invalid-argument", "El nombre del grupo es obligatorio.");
  const detalles = Array.from(normalizeGrupoModuloDetalles(data?.grupoModulos).values());
  try {
    const [previousEmail, workspaceContext] = await Promise.all([getPreviousGrupoWorkspaceCorreo(grupoId), getGrupoWorkspaceContext(payload)]);
    const savedId = await saveGrupoWithModulos(grupoId,payload,detalles);
    const workspace = await syncGrupoToWorkspace({
      email:payload.workspaceCorreo??"",previousEmail,name:payload.workspaceName??"",
      description:`Grupo: ${payload.nombreDisplay??""}`,
      ownerEmail:getInstitutionalEmail(workspaceContext?.personal),
      managerEmails:[getInstitutionalEmail(workspaceContext?.semestre?.coordinador1),getInstitutionalEmail(workspaceContext?.semestre?.coordinador2)],
    });
    return {id:savedId,ids:[savedId],workspace};
  } catch (error) {
    if (error instanceof https.HttpsError) throw error;
    if (error instanceof WorkspaceSyncError) throw new https.HttpsError("failed-precondition",error.message);
    const message = (error as Error).message;
    if (message.includes("No se puede retirar una instancia")) throw new https.HttpsError("failed-precondition", "No se puede retirar una instancia que tiene matrículas, programación o registros asociados.");
    console.error("Error in createOrUpdateGrupo:",error);
    throw new https.HttpsError("internal","No se pudo guardar el grupo.");
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
