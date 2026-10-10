export interface ScheduleHorario {
  nombre?: string | null;
  regla?: string | null;
  diasSemana?: string | null;
  viernesAlternoInicio?: string | null;
}

interface SchedulePeriod {
  inicio?: string | null;
  fin?: string | null;
  fechaIni?: string | null;
  fechaFin?: string | null;
  horario?: ScheduleHorario | null;
}

export interface ScheduleGrupo {
  id: number;
  nombreDisplay?: string | null;
  calendarioId?: number | null;
  semestre?: (SchedulePeriod & { titulo?: string | null }) | null;
  turno?: { horaInicio?: string | null; horaFin?: string | null } | null;
  horario?: ScheduleHorario | null;
}

export interface ScheduleGrupoModulo extends SchedulePeriod {
  id: number;
  grupoId: number;
  moduloId: number;
  nombre?: string | null;
  grupo: ScheduleGrupo;
  calendario?: SchedulePeriod | null;
}

export interface MatriculaSchedule {
  id: number;
  label: string;
  startDay: number;
  endDay: number;
  days: Set<number>;
  startMinute: number;
  endMinute: number;
  alternateFriday: "primer" | "segundo" | null;
  firstFriday: number;
}

const DAY_MS = 86400000;

function dayNumber(value?: string | null): number | null {
  if (!value) return null;
  // Academic dates use the same date-only convention as the group forms.
  const day = value.slice(0, 10);
  const timestamp = Date.parse(`${day}T00:00:00Z`);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== day) {
    throw new Error("Las fechas del grupo-modulo no son validas.");
  }
  return timestamp / DAY_MS;
}

function turnoMinute(value?: string | null): number | null {
  if (!value) return null;
  const time = new Date(value);
  if (!Number.isFinite(time.getTime())) return null;
  // TurnoForm stores wall-clock times as 1970-01-01THH:mmZ, not real instants.
  return time.getUTCHours() * 60 + time.getUTCMinutes() + time.getUTCSeconds() / 60 + time.getUTCMilliseconds() / 60000;
}

function weekday(day: number): number {
  return ((day + 4) % 7 + 7) % 7;
}

export function buildMatriculaSchedule(
  source: ScheduleGrupoModulo,
  groupCalendar?: SchedulePeriod | null,
): MatriculaSchedule {
  const group = source.grupo;
  const calendar = source.calendario ?? groupCalendar;
  const semester = group.semestre;
  const horario = group.horario ?? calendar?.horario;
  const days = new Set((horario?.diasSemana ?? "").split(",").filter((value) => value.trim())
    .map(Number).filter((value) => Number.isInteger(value) && value >= 0 && value <= 6));
  const startMinute = turnoMinute(group.turno?.horaInicio);
  const endMinute = turnoMinute(group.turno?.horaFin);
  const label = [group.nombreDisplay || `Grupo ${group.id}`, source.nombre || `Grupo-modulo ${source.id}`].join(" / ");
  if (!days.size || startMinute === null || endMinute === null || startMinute === endMinute) {
    throw new Error(`No se puede verificar el horario de ${label}. Configura sus dias y las horas de inicio y fin del turno.`);
  }
  const startDay = dayNumber(source.inicio ?? calendar?.inicio ?? calendar?.fechaIni ?? semester?.inicio) ?? -Infinity;
  const endDay = dayNumber(source.fin ?? calendar?.fin ?? calendar?.fechaFin ?? semester?.fin) ?? Infinity;
  if (endDay < startDay) throw new Error(`Las fechas de ${label} estan invertidas.`);

  let alternateFriday: MatriculaSchedule["alternateFriday"] = null;
  if (days.has(5) && (/@\s*vie/i.test(horario?.nombre ?? "") || /VIE@/i.test(horario?.regla ?? ""))) {
    if (horario?.viernesAlternoInicio === "primer" || horario?.viernesAlternoInicio === "segundo") {
      alternateFriday = horario.viernesAlternoInicio;
    } else {
      const semesterNumber = semester?.titulo?.trim().slice(-1);
      const key = [...days].sort().join(",");
      if (semesterNumber === "1") alternateFriday = key === "1,3,5" ? "primer" : "segundo";
      if (semesterNumber === "2") alternateFriday = key === "2,4,5" ? "primer" : "segundo";
    }
  }
  const anchor = dayNumber(calendar?.inicio ?? calendar?.fechaIni ?? semester?.inicio)
    ?? (Number.isFinite(startDay) ? startDay : 10959); // Monday 2000-01-03.
  return {
    id: source.id, label, startDay, endDay, days, startMinute,
    endMinute: endMinute > startMinute ? endMinute : endMinute + 1440,
    alternateFriday, firstFriday: anchor + (5 - weekday(anchor) + 7) % 7,
  };
}

function attends(schedule: MatriculaSchedule, day: number): boolean {
  if (day < schedule.startDay || day > schedule.endDay || !schedule.days.has(weekday(day))) return false;
  if (weekday(day) !== 5 || !schedule.alternateFriday) return true;
  const index = Math.round((day - schedule.firstFriday) / 7);
  return ((index % 2 + 2) % 2) === (schedule.alternateFriday === "primer" ? 0 : 1);
}

export function findMatriculaScheduleOverlap(left: MatriculaSchedule, right: MatriculaSchedule) {
  const first = Math.max(left.startDay, right.startDay - 1);
  const last = Math.min(left.endDay, right.endDay + 1);
  if (last < first) return null;
  const from = Number.isFinite(first) ? first : Number.isFinite(last) ? last - 14 : 10959;
  // Weekly schedules and alternating Fridays repeat every 14 days.
  for (let day = from; day <= Math.min(last, from + 14); day += 1) {
    if (!attends(left, day)) continue;
    for (const delta of [-1, 0, 1]) {
      const otherDay = day + delta;
      if (!attends(right, otherDay)) continue;
      const start = Math.max(day * 1440 + left.startMinute, otherDay * 1440 + right.startMinute);
      const end = Math.min(day * 1440 + left.endMinute, otherDay * 1440 + right.endMinute);
      if (start < end) {
        return { inicio: new Date(start * 60000 + 5 * 3600000).toISOString(),
          fin: new Date(end * 60000 + 5 * 3600000).toISOString() };
      }
    }
  }
  return null;
}
