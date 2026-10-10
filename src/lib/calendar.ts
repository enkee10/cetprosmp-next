export type CalendarView = 'anio' | 'mes' | 'semana' | 'dia';
export const CALENDAR_EVENT_TYPES = ['clase', 'evaluacion', 'feriado', 'reunion', 'actividad', 'empleabilidad', 'ppp', 'efsrt', 'gestion', 'vacaciones_gestion', 'inicio_clases', 'fin_clases', 'dia_logro', 'otro'];
const EVENT_TYPE_LABELS: Record<string, string> = {
  clase: 'Clase', evaluacion: 'Evaluación', feriado: 'Feriado', reunion: 'Reunión', actividad: 'Actividad', otro: 'Otro',
  empleabilidad: 'Empleabilidad', ppp: 'PPP', efsrt: 'EFSRT', gestion: 'Días de gestión', vacaciones_gestion: 'Vacaciones / gestión',
  inicio_clases: 'Inicio de clases', fin_clases: 'Término de clases', dia_logro: 'Día del logro',
};
export const calendarEventTypeLabel = (type: string | null | undefined) => type ? EVENT_TYPE_LABELS[type] ?? type : '';
export interface CalendarOption { id: number; titulo: string | null; color: string | null; activo: boolean | null; semestreId?: number | null }
export interface GroupModuleOption { id: number; nombre: string | null; grupoId: number; calendarioId: number | null; modulo: { titulo: string | null; horas: number | null }; grupo: { nombreDisplay: string | null; semestreId?: number | null } }
export interface CalendarSemestre { id: number; titulo: string | null; inicio: string | null; fin: string | null }
export interface CalendarEvent {
  id: string; eventoId: number; ocurrenciaId: number | null; calendarioId: number; semestreId?: number | null;
  titulo: string; descripcion: string | null; fechaInicio: string; fechaFin: string;
  todoElDia: boolean; tipoEvento: string | null; estado: string | null; color: string | null;
  ubicacion: string | null; minutosHoraAcademica: number; computaHoras: boolean; programacionHorariaId: number | null;
  grupoModuloIds: number[]; grupoIds: number[]; relaciones: { entidadTipo?: string | null; entidadId?: number | null }[];
}
export interface AgendaData { eventos: CalendarEvent[]; calendarios: CalendarOption[]; grupoModulos: GroupModuleOption[]; semestres?: CalendarSemestre[] }
export const dayInLima = (value: string | Date) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date(value));
export const localInputInLima = (value: string) => value ? `${dayInLima(value)}T${new Intl.DateTimeFormat('en-GB', {
  timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
}).format(new Date(value))}` : '';
export const limaInputToIso = (value: string) => value ? new Date(`${value}:00-05:00`).toISOString() : null;
export const dayStart = (day: string) => Date.parse(`${day}T00:00:00-05:00`);
export const addCalendarDays = (day: string, days: number) => new Date(Date.parse(`${day}T12:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
export const weekday = (day: string) => new Date(`${day}T12:00:00Z`).getUTCDay();
export function monthDays(day: string) {
  const first = `${day.slice(0, 7)}-01`;
  const monday = addCalendarDays(first, -((weekday(first) + 6) % 7));
  return Array.from({ length: 42 }, (_, index) => addCalendarDays(monday, index));
}
export function visibleDays(day: string, view: CalendarView) {
  if (view === 'mes') return monthDays(day);
  if (view === 'semana') {
    const monday = addCalendarDays(day, -((weekday(day) + 6) % 7));
    return Array.from({ length: 7 }, (_, index) => addCalendarDays(monday, index));
  }
  return [day];
}
export const intersectsDay = (event: CalendarEvent, day: string) => Date.parse(event.fechaInicio) < dayStart(addCalendarDays(day, 1)) && Date.parse(event.fechaFin) > dayStart(day);
export function countedMinutes(event: CalendarEvent, inicio: number, fin: number) {
  if (!event.computaHoras || event.todoElDia || event.tipoEvento === 'feriado' || event.estado === 'cancelado') return 0;
  return Math.max(0, Math.min(Date.parse(event.fechaFin), fin) - Math.max(Date.parse(event.fechaInicio), inicio)) / 60000;
}
/** Assign columns to overlapping events without hiding any event. */
export function dayEventLayout(events: CalendarEvent[], day: string) {
  const start = dayStart(day);
  const rows = events.filter(event => !event.todoElDia && intersectsDay(event, day)).map(event => ({
    event, start: Math.max(0, (Date.parse(event.fechaInicio) - start) / 60000),
    end: Math.min(1440, (Date.parse(event.fechaFin) - start) / 60000), column: 0, columns: 1,
  })).sort((a, b) => a.start - b.start || b.end - a.end);
  let cluster: typeof rows = []; let clusterEnd = -1;
  const finish = () => {
    const columnEnds: number[] = [];
    for (const row of cluster) {
      let column = columnEnds.findIndex(end => end <= row.start);
      if (column === -1) column = columnEnds.length;
      columnEnds[column] = row.end; row.column = column;
    }
    for (const row of cluster) row.columns = columnEnds.length;
  };
  for (const row of rows) {
    if (row.start >= clusterEnd && cluster.length) { finish(); cluster = []; }
    cluster.push(row); clusterEnd = Math.max(...cluster.map(item => item.end));
  }
  finish(); return rows;
}
