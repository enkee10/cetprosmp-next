import { https } from "firebase-functions/v1";
import {
  buildHorarioDataFromInput,
  getIdFromKeyOutput,
  toNumber,
  toNumberOrNull,
} from "../core/userMappers.js";
import { dataConnect } from "../core/dataConnectCore.js";
import { DataConnectHorario, DataConnectHorarioInput } from "../core/types.js";
import {
  DELETE_HORARIO_MUTATION,
  INSERT_HORARIO_MUTATION,
  UPDATE_HORARIO_MUTATION,
} from "../../dataconnectOperations.js";

const LIST_HORARIOS_QUERY = `
  query ListHorariosManual {
    horarios(limit: 500) {
      id
      nombre
      descripcion
      regla
      diasSemana
      viernesAlternoInicio
      activo
      fechaCreacion
      fechaActualizacion
    }
  }
`;

const GET_HORARIO_QUERY = `
  query GetHorarioManual($id: Int!) {
    horario(id: $id) {
      id
      nombre
      descripcion
      regla
      diasSemana
      viernesAlternoInicio
      activo
      fechaCreacion
      fechaActualizacion
    }
  }
`;

function requireLevel(context: https.CallableContext, action: string) {
  const requesterLevel = context.auth?.token?.level ?? 0;
  if (requesterLevel < 600) {
    throw new https.HttpsError("permission-denied", `You do not have permission to ${action}.`);
  }
}

const sortHorarios = (items: DataConnectHorario[]) =>
  items
    .slice()
    .sort((a, b) => String(a.nombre ?? "").localeCompare(String(b.nombre ?? ""), "es", { numeric: true }) || a.id - b.id);

const normalizeDiasSemana = (diasSemana?: string | null) =>
  (diasSemana || "")
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value, index, self) => Number.isInteger(value) && value >= 0 && value <= 6 && self.indexOf(value) === index)
    .sort((a, b) => a - b)
    .join(",");

const DIAS_SEMANA = [
  { value: "1", nombre: "Lun", regla: "LUN" },
  { value: "2", nombre: "Mar", regla: "MAR" },
  { value: "3", nombre: "Mie", regla: "MIE" },
  { value: "4", nombre: "Jue", regla: "JUE" },
  { value: "5", nombre: "Vie", regla: "VIE" },
  { value: "6", nombre: "Sab", regla: "SAB" },
  { value: "0", nombre: "Dom", regla: "DOM" },
];

const LUNES_A_VIERNES = ["1", "2", "3", "4", "5"];

function hasOnlyLunesAViernes(selected: Set<string>) {
  return selected.size === LUNES_A_VIERNES.length && LUNES_A_VIERNES.every((dia) => selected.has(dia));
}

function buildHorarioNombre(diasSemana: string) {
  const selected = new Set(diasSemana.split(",").filter(Boolean));
  if (hasOnlyLunesAViernes(selected)) return "Lun - Vie";

  return DIAS_SEMANA
    .filter((dia) => selected.has(dia.value))
    .map((dia) => {
      const shouldMarkViernes = dia.value === "5" && selected.size === 3;
      if (shouldMarkViernes) return `@${dia.nombre}`;
      return dia.nombre;
    })
    .join(", ");
}

function buildHorarioRegla(diasSemana: string) {
  const selected = new Set(diasSemana.split(",").filter(Boolean));
  return DIAS_SEMANA
    .filter((dia) => selected.has(dia.value))
    .map((dia) => dia.regla)
    .join(",");
}

export const listHorarios = https.onCall(async (_data, context) => {
  requireLevel(context, "list schedules");

  try {
    const response = await dataConnect.executeGraphql<{ horarios: DataConnectHorario[] }, Record<string, never>>(
      LIST_HORARIOS_QUERY,
    );
    return { horarios: sortHorarios(response.data.horarios ?? []) };
  } catch (error) {
    console.error("Error in listHorarios:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while listing schedules.");
  }
});

export const getHorario = https.onCall(async (data, context) => {
  requireLevel(context, "get schedules");

  const horarioId = toNumber(data?.id, -1);
  if (horarioId <= 0) {
    throw new https.HttpsError("invalid-argument", "id is required.");
  }

  try {
    const response = await dataConnect.executeGraphql<{ horario: DataConnectHorario | null }, { id: number }>(
      GET_HORARIO_QUERY,
      { variables: { id: horarioId } },
    );
    return { horario: response.data.horario ?? null };
  } catch (error) {
    console.error("Error in getHorario:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while getting schedule.");
  }
});

export const createOrUpdateHorario = https.onCall(async (data, context) => {
  requireLevel(context, "mutate schedules");

  const now = new Date().toISOString();
  const diasSemana = normalizeDiasSemana((data as Record<string, unknown> | null)?.diasSemana as string | null | undefined);
  const payload = buildHorarioDataFromInput({
    ...(data as Record<string, unknown>),
    nombre: buildHorarioNombre(diasSemana),
    regla: buildHorarioRegla(diasSemana),
    diasSemana,
    viernesAlternoInicio: null,
    activo: (data as Record<string, unknown> | null)?.activo ?? true,
    fechaActualizacion: now,
  }) as DataConnectHorarioInput;

  if (!payload.diasSemana) {
    throw new https.HttpsError("invalid-argument", "Selecciona al menos un dia.");
  }

  if (!payload.nombre) {
    throw new https.HttpsError("invalid-argument", "nombre is required.");
  }

  const horarioId = toNumberOrNull(data?.id);

  try {
    if (horarioId) {
      const updated = await dataConnect.executeGraphql<
        { horario_update: unknown },
        { id: number; data: DataConnectHorarioInput }
      >(UPDATE_HORARIO_MUTATION, { variables: { id: horarioId, data: payload } });

      return { id: getIdFromKeyOutput(updated.data.horario_update) ?? horarioId };
    }

    const created = await dataConnect.executeGraphql<
      { horario_insert: unknown },
      { data: DataConnectHorarioInput }
    >(INSERT_HORARIO_MUTATION, {
      variables: {
        data: {
          ...payload,
          fechaCreacion: now,
          fechaActualizacion: now,
        },
      },
    });

    return { id: getIdFromKeyOutput(created.data.horario_insert) };
  } catch (error) {
    console.error("Error in createOrUpdateHorario:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while saving schedule.");
  }
});

export const deleteHorario = https.onCall(async (data, context) => {
  requireLevel(context, "delete schedules");

  const horarioId = toNumber(data?.id, -1);
  if (horarioId <= 0) {
    throw new https.HttpsError("invalid-argument", "id is required.");
  }

  try {
    const deleted = await dataConnect.executeGraphql<{ horario_delete: unknown }, { id: number }>(
      DELETE_HORARIO_MUTATION,
      { variables: { id: horarioId } },
    );
    return { id: getIdFromKeyOutput(deleted.data.horario_delete) ?? horarioId };
  } catch (error) {
    console.error("Error in deleteHorario:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while deleting schedule.");
  }
});
