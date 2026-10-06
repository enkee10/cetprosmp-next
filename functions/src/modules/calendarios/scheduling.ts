export interface ScheduleRules {
  titulo: string;
  calendarioId: number;
  grupoModuloId: number | null;
  horasObjetivo: number;
  minutosHoraAcademica: number;
  minutosSesion: number;
  fechaInicio: string;
  fechaFin: string;
  diasSemana: number[];
  horaInicio: string;
  horaFin: string;
  excluirFeriados: boolean;
  evitarCruces: boolean;
}

export interface BusyInterval { inicio: string; fin: string }
export interface Session { fechaInicio: string; fechaFin: string; minutos: number }
export const limaDay = (value: string) => new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date(value));

export function validateRules(input: Record<string, unknown>): ScheduleRules {
  const rules: ScheduleRules = {
    titulo: String(input.titulo ?? "").trim(), calendarioId: Number(input.calendarioId),
    grupoModuloId: input.grupoModuloId == null || input.grupoModuloId === "" ? null : Number(input.grupoModuloId),
    horasObjetivo: Number(input.horasObjetivo), minutosHoraAcademica: Number(input.minutosHoraAcademica),
    minutosSesion: Number(input.minutosSesion), fechaInicio: String(input.fechaInicio ?? ""),
    fechaFin: String(input.fechaFin ?? ""), diasSemana: Array.isArray(input.diasSemana) ? [...new Set(input.diasSemana.map(Number))] : [],
    horaInicio: String(input.horaInicio ?? ""), horaFin: String(input.horaFin ?? ""),
    excluirFeriados: input.excluirFeriados !== false, evitarCruces: input.evitarCruces !== false,
  };
  const validDay = (day: string) => /^\d{4}-\d{2}-\d{2}$/.test(day)
    && Number.isFinite(Date.parse(`${day}T12:00:00Z`)) && new Date(`${day}T12:00:00Z`).toISOString().startsWith(day);
  const validTime = (time: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
  if (!rules.titulo || rules.titulo.length > 200 || !Number.isInteger(rules.calendarioId) || rules.calendarioId <= 0
    || (rules.grupoModuloId !== null && (!Number.isInteger(rules.grupoModuloId) || rules.grupoModuloId <= 0))
    || !Number.isFinite(rules.horasObjetivo) || rules.horasObjetivo <= 0 || rules.horasObjetivo > 10000
    || !Number.isInteger(rules.minutosHoraAcademica) || rules.minutosHoraAcademica < 1 || rules.minutosHoraAcademica > 120
    || !Number.isInteger(rules.minutosSesion) || rules.minutosSesion < 1 || rules.minutosSesion > 1440
    || !Number.isInteger(Math.round(rules.horasObjetivo * rules.minutosHoraAcademica * 1e6) / 1e6)
    || !validDay(rules.fechaInicio) || !validDay(rules.fechaFin) || rules.fechaInicio > rules.fechaFin
    || Date.parse(rules.fechaFin) - Date.parse(rules.fechaInicio) > 366 * 86400000
    || !rules.diasSemana.length || rules.diasSemana.some(day => !Number.isInteger(day) || day < 0 || day > 6)
    || !validTime(rules.horaInicio) || !validTime(rules.horaFin) || rules.horaInicio >= rules.horaFin) {
    throw new Error("Revisa el título, las horas, las fechas (máximo un año), los días y la franja horaria. Las horas deben equivaler a minutos completos.");
  }
  const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  if (rules.minutosSesion > minutes(rules.horaFin) - minutes(rules.horaInicio)) {
    throw new Error("La sesión no cabe en la franja horaria disponible.");
  }
  return rules;
}

/** One session per eligible day. The last session is shortened to meet the exact target. */
export function distributeHours(rules: ScheduleRules, holidays: Set<string>, busy: BusyInterval[]) {
  let remaining = Math.round(rules.horasObjetivo * rules.minutosHoraAcademica);
  const sessions: Session[] = [];
  const omitted: { fecha: string; motivo: string }[] = [];
  const intervals = busy.map(item => [Date.parse(item.inicio), Date.parse(item.fin)]);
  for (let cursor = Date.parse(`${rules.fechaInicio}T12:00:00Z`); cursor <= Date.parse(`${rules.fechaFin}T12:00:00Z`) && remaining > 0; cursor += 86400000) {
    const date = new Date(cursor);
    const day = date.toISOString().slice(0, 10);
    if (!rules.diasSemana.includes(date.getUTCDay())) continue;
    if (rules.excluirFeriados && holidays.has(day)) { omitted.push({ fecha: day, motivo: "Feriado" }); continue; }
    const start = Date.parse(`${day}T${rules.horaInicio}:00-05:00`);
    const duration = Math.min(rules.minutosSesion, remaining);
    const end = start + duration * 60000;
    if (rules.evitarCruces && intervals.some(([a, b]) => start < b && end > a)) {
      omitted.push({ fecha: day, motivo: "Cruce de horario" }); continue;
    }
    sessions.push({ fechaInicio: new Date(start).toISOString(), fechaFin: new Date(end).toISOString(), minutos: duration });
    remaining -= duration;
  }
  return { sesiones: sessions, omitidos: omitted, horasProgramadas: (Math.round(rules.horasObjetivo * rules.minutosHoraAcademica) - remaining) / rules.minutosHoraAcademica,
    horasPendientes: remaining / rules.minutosHoraAcademica, completa: remaining === 0 };
}
