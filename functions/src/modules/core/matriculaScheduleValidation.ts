import { https } from "firebase-functions/v1";
import { dataConnect } from "./dataConnectCore.js";
import { buildMatriculaSchedule, findMatriculaScheduleOverlap, ScheduleGrupo, ScheduleGrupoModulo } from "./matriculaSchedule.js";

const SCHEDULE_FRAGMENTS = `
  fragment MatriculaHorarioFields on Horario { nombre regla diasSemana viernesAlternoInicio }
  fragment MatriculaCalendarioFields on Calendario {
    id inicio fin fechaIni fechaFin horario { ...MatriculaHorarioFields }
  }
  fragment MatriculaGrupoFields on Grupo {
    id nombreDisplay calendarioId semestre { titulo inicio fin }
    turno { horaInicio horaFin } horario { ...MatriculaHorarioFields }
  }
  fragment MatriculaGrupoModuloFields on GrupoModulo {
    id nombre grupoId moduloId inicio fin
    calendario { ...MatriculaCalendarioFields } grupo { ...MatriculaGrupoFields }
  }
`;

export const MATRICULA_SCHEDULE_TARGETS_QUERY = `
  query MatriculaScheduleTargets($ids: [Int!]!, $grupoIds: [Int!]!, $moduloIds: [Int!]!) {
    grupoModulos(where: { _or: [ { id: { in: $ids } },
      { grupoId: { in: $grupoIds }, moduloId: { in: $moduloIds } } ] }, limit: 1000) {
      ...MatriculaGrupoModuloFields
    }
    grupos(where: { id: { in: $grupoIds } }, limit: 1000) { ...MatriculaGrupoFields }
  }
  ${SCHEDULE_FRAGMENTS}
`;

export const MATRICULA_STUDENT_SCHEDULES_QUERY = `
  query MatriculaStudentSchedules($userId: Int!, $offset: Int!) {
    modulosEstudiantes(where: { matricula: { userId: { eq: $userId } } },
      orderBy: [{ id: ASC }], limit: 1000, offset: $offset) {
      id grupoId moduloId matriculaId
      matricula { archivado }
      grupoModulo { ...MatriculaGrupoModuloFields }
      grupo { ...MatriculaGrupoFields }
    }
  }
  ${SCHEDULE_FRAGMENTS}
`;

export const MATRICULA_SCHEDULE_CALENDARS_QUERY = `
  query MatriculaScheduleCalendars($ids: [Int!]!) {
    calendarios(where: { id: { in: $ids } }, limit: 1000) { ...MatriculaCalendarioFields }
  }
  fragment MatriculaHorarioFields on Horario { nombre regla diasSemana viernesAlternoInicio }
  fragment MatriculaCalendarioFields on Calendario {
    id inicio fin fechaIni fechaFin horario { ...MatriculaHorarioFields }
  }
`;

interface ScheduleSelection {
  grupoModuloId?: number | null;
  grupoId?: number | null;
  moduloId: number;
}

interface StudentScheduleRow {
  id: number;
  grupoId?: number | null;
  moduloId: number;
  matriculaId: number;
  matricula: { archivado?: boolean | null };
  grupoModulo?: ScheduleGrupoModulo | null;
  grupo?: ScheduleGrupo | null;
}

export async function ensureNoMatriculaScheduleConflicts(input: {
  userId: number;
  selections: ScheduleSelection[];
  currentMatriculaId?: number | null;
}) {
  const ids = [...new Set(input.selections.map((item) => item.grupoModuloId).filter((id): id is number => Boolean(id)))];
  const legacy = input.selections.filter((item) => !item.grupoModuloId);
  const grupoIds = [...new Set(legacy.map((item) => item.grupoId).filter((id): id is number => Boolean(id)))];
  const moduloIds = [...new Set(legacy.map((item) => item.moduloId))];
  const targets = await dataConnect.executeGraphql<{
    grupoModulos: ScheduleGrupoModulo[]; grupos: ScheduleGrupo[];
  }, { ids: number[]; grupoIds: number[]; moduloIds: number[] }>(
    MATRICULA_SCHEDULE_TARGETS_QUERY, { variables: { ids, grupoIds, moduloIds } },
  );
  const requested: ScheduleGrupoModulo[] = [];
  for (const selection of input.selections) {
    const matches = targets.data.grupoModulos.filter((item) => selection.grupoModuloId
      ? item.id === selection.grupoModuloId
      : item.grupoId === selection.grupoId && item.moduloId === selection.moduloId);
    if (matches.length) {
      requested.push(...matches);
    } else {
      const group = !selection.grupoModuloId && targets.data.grupos.find((item) => item.id === selection.grupoId);
      if (!group) throw new https.HttpsError("failed-precondition", "No se pudo verificar el horario del grupo-modulo seleccionado.");
      requested.push({ id: -selection.moduloId, grupoId: group.id, moduloId: selection.moduloId, grupo: group });
    }
  }
  const existing: ScheduleGrupoModulo[] = [];
  for (let offset = 0; ; offset += 1000) {
    const response = await dataConnect.executeGraphql<{ modulosEstudiantes: StudentScheduleRow[] }, { userId: number; offset: number }>(
      MATRICULA_STUDENT_SCHEDULES_QUERY, { variables: { userId: input.userId, offset } },
    );
    for (const row of response.data.modulosEstudiantes) {
      if (row.matricula.archivado === true || row.matriculaId === input.currentMatriculaId) continue;
      if (row.grupoModulo) existing.push(row.grupoModulo);
      else if (row.grupo) existing.push({ id: -row.id, grupoId: row.grupo.id, moduloId: row.moduloId, grupo: row.grupo });
      else throw new https.HttpsError("failed-precondition", "Una matricula vigente del estudiante no tiene grupo para verificar sus horarios.");
    }
    if (response.data.modulosEstudiantes.length < 1000) break;
  }

  const calendarIds = [...new Set([...requested, ...existing].map((item) => item.grupo.calendarioId)
    .filter((id): id is number => Boolean(id)))];
  const calendars = new Map<number, NonNullable<ScheduleGrupoModulo["calendario"]>>();
  for (let offset = 0; offset < calendarIds.length; offset += 1000) {
    const response = await dataConnect.executeGraphql<{
      calendarios: Array<NonNullable<ScheduleGrupoModulo["calendario"]> & { id: number }>;
    }, { ids: number[] }>(MATRICULA_SCHEDULE_CALENDARS_QUERY, { variables: { ids: calendarIds.slice(offset, offset + 1000) } });
    for (const calendar of response.data.calendarios) calendars.set(calendar.id, calendar);
  }
  const scheduleFor = (item: ScheduleGrupoModulo) => {
    try {
      return buildMatriculaSchedule(item, calendars.get(item.grupo.calendarioId ?? -1));
    } catch (error) {
      throw new https.HttpsError("failed-precondition", error instanceof Error ? error.message : "No se pudo verificar el horario.");
    }
  };
  const next = [...new Map(requested.map((item) => [`${item.grupoId}:${item.id}`, item])).values()].map(scheduleFor);
  const previous = existing.map(scheduleFor);
  for (let index = 0; index < next.length; index += 1) {
    const selected = next[index];
    for (const other of [...previous, ...next.slice(0, index)]) {
      const overlap = findMatriculaScheduleOverlap(selected, other);
      if (overlap) {
        throw new https.HttpsError("failed-precondition",
          "No se puede matricular: hay cruce de horario",
          { motivo: "cruce-horario", grupoModuloIds: [selected.id, other.id], ...overlap });
      }
    }
  }
}
