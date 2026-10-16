import { valuationLabels, ValuationField } from '../../functions/src/modules/parte-diario/valuations';
import type { ParteCompromiso } from '../../functions/src/modules/parte-diario/commitmentModel';
export type { ParteCompromiso };
export const SILABO_OPTIONS = valuationLabels('silabo');
export const MEDIOS_OPTIONS = valuationLabels('usoMedios');
export const FICHA_OPTIONS = valuationLabels('fichaActividad');
export const INSTRUMENTO_OPTIONS = valuationLabels('instrumentoEvaluacion');
export const REG_ASISTENCIA_OPTIONS = valuationLabels('registroAsistencia');
export const REG_AUX_EVALUACION_OPTIONS = valuationLabels('registroAuxiliarEvaluacion');
export const MATERIAL_OPTIONS = valuationLabels('material');
export const TAREAS_OPTIONS = valuationLabels('tareas');
export { valuationLabels };
export const isParteSaved = (row: ParteDiarioRow) => !row.borrador && !!(row.recordId && row.firma);
export const isParteDraft = (row: ParteDiarioRow) => !!row.borrador || !!(row.recordId && !row.firma);
export interface ParteEditor { uid: string; nombre: string; avatar: string | null }
export function parteMissingFields(row: ParteDiarioRow): string[] {
  const missing: string[] = [];
  if (row.tipoUnidad === 'curricular' && !row.pendiente) {
    if (!row.unidadDidacticaId) missing.push('Unidad');
    if (!row.actividadId) missing.push('Actividad');
  } else if (row.tipoUnidad !== 'curricular' && !row.actividadManual.trim()) missing.push('Actividad');
  if (row.asistentes == null) missing.push('Asistentes');
  const fields = [
    ['usoMedios', 'Uso de medios en clase', MEDIOS_OPTIONS], ['silabo', 'Sílabo', SILABO_OPTIONS],
    ['fichaActividad', 'Ficha de Actividad', FICHA_OPTIONS], ['instrumentoEvaluacion', 'Instrumento de Evaluación', INSTRUMENTO_OPTIONS],
    ['registroAsistencia', 'Registro de Asistencia', REG_ASISTENCIA_OPTIONS], ['registroAuxiliarEvaluacion', 'Registro Auxiliar de Evaluación', REG_AUX_EVALUACION_OPTIONS],
    ['material', 'Materiales', MATERIAL_OPTIONS], ['tareas', 'Tareas', TAREAS_OPTIONS],
  ] as const;
  for (const [field, label, options] of fields) if (!(options as readonly string[]).includes(row[field])) missing.push(label);
  return missing;
}
export interface ParteDiarioRow {
  compromisos?: ParteCompromiso[];
  borrador?: boolean;
  borradorConflicto?: boolean;
  editor?: ParteEditor | null;
  unidadesOrdenadas?: { id: number; nombre: string | null }[];
  tipoUnidadProgramada?: 'curricular' | 'ppp' | 'efsrt';
  actividadesDelDia?: { id: number; nombre: string; unidad: string; unidadId: number | null }[];
  key: string; orden: number; grupoModuloId: number; moduloId: number; docenteId: number; actividadProgramadaId: number | null;
  recordId?: number | null; valoraciones?: Record<ValuationField, number | null>;
  jornadaId: number | null; tipoUnidad: 'curricular' | 'ppp' | 'efsrt'; practicaTipo: 'ppp' | 'efsrt'; actividadManual: string; pendiente: boolean;
  docenteNombre: string; docenteNombreCompleto: string; avatar: string | null; turno: string; turnoOrden: number;
  modulo: string; unidadDidacticaId: number | null; unidad: string; actividadId: number | null; actividad: string; actividadNumero?: number | null;
  matriculados: number; asistentes: number | null; usoMedios: string; silabo: string; fichaActividad: string; instrumentoEvaluacion: string;
  registroAsistencia: string; registroAuxiliarEvaluacion: string;
  material: string; tareas: string; firma: string | null; observaciones: string[]; version: string | null;
}
export interface ParteDiarioData { fecha: string; laborable: boolean; mensaje: string | null; filas: ParteDiarioRow[] }
export interface ParteActividad { id: number; nombre: string | null; numeroSesion?: number | null; fechas?: string[] }
export interface ParteUnidad { id: number; nombre: string | null; actividades: ParteActividad[] }
export const unitLabel = (name: string | null) => (name || '').toLocaleUpperCase('es');
export const numberedUnitLabel = (unit: ParteUnidad, index: number) => `UD${index + 1}: ${unitLabel(unit.nombre)}`;
export function selectedParteUnitLabel(row: ParteDiarioRow, units?: ParteUnidad[]): string {
  if (row.tipoUnidad !== 'curricular') return row.tipoUnidad.toUpperCase();
  const ordered = units?.length ? units : row.unidadesOrdenadas || [];
  const index = ordered.findIndex(unit => unit.id === row.unidadDidacticaId);
  return index < 0 ? unitLabel(row.unidad) : `UD${index + 1}: ${unitLabel(row.unidad)}`;
}
export function isProgrammedParteUnit(row: ParteDiarioRow, value: string, units: ParteUnidad[]): boolean {
  if (row.actividadesDelDia?.length) return row.actividadesDelDia.some(activity => value === `u:${activity.unidadId}`);
  if (row.actividadProgramadaId != null) return units.some(unit => value === `u:${unit.id}` && unit.actividades.some(activity => activity.id === row.actividadProgramadaId));
  return value === (row.tipoUnidadProgramada || row.tipoUnidad);
}
export const activityLabel = (name: string | null) => (name || '').toLocaleLowerCase('es').replace(/(^|[.!?]\s*|\n\s*)([\p{L}])/gu, (_all, prefix: string, letter: string) => prefix + letter.toLocaleUpperCase('es'));
export const selectedParteActivityLabel = (row: ParteDiarioRow, activities: ParteActividad[] = []) => {
  const index = activities.findIndex(activity => activity.id === row.actividadId);
  const number = index >= 0 ? activities[index].numeroSesion ?? index + 1 : row.actividadNumero;
  const name = activityLabel(row.actividad || (index >= 0 ? activities[index].nombre : null));
  return name ? `${number != null ? `${number}. ` : ''}${name}` : '';
};
export const activityDatesLabel = (dates?: string[]) => dates?.length ? dates.map(date => `${date.slice(8,10)}/${date.slice(5,7)}/${date.slice(2,4)}`).join(', ') : 'Sin fecha programada';
export const parteDateLabel = (fecha: string) => {
  const date = new Date(`${fecha}T12:00:00Z`), format = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('es-PE', { ...options, timeZone: 'America/Lima' }).format(date).toLowerCase().replace('.', '');
  return `SMP, ${format({ weekday: 'long' })} ${format({ day: '2-digit' })} de ${format({ month: 'short' })} del ${fecha.slice(0, 4)}`;
};
export const parteGroupLabel = (nombre: string, docente?: string) => nombre.replace(/\s*\(([^)]*)\)\s*$/, (suffix: string, text: string) => {
 const words = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().match(/[a-z]+/g) || [];
 const teacher = new Set(words(docente || '')), candidate = words(text);
 return docente && candidate.length >= 2 && candidate.every(word => teacher.has(word)) ? '' : suffix;
}).trim();
export const parteTeacherGroupLabel = (row: ParteDiarioRow) => {
 const label = parteGroupLabel(row.modulo, row.docenteNombreCompleto);
 return row.turno && !/mañana|tarde|noche/i.test(label) ? `${label} [${row.turno}]` : label;
};
export const parteUnitValue = (row: ParteDiarioRow) => row.tipoUnidad === 'curricular' ? (row.unidadDidacticaId == null ? '' : `u:${row.unidadDidacticaId}`) : row.tipoUnidad;
export function changeParteUnit(row: ParteDiarioRow, value: string, units: ParteUnidad[]): ParteDiarioRow {
  if (value === 'ppp' || value === 'efsrt') return { ...row, tipoUnidad: value, unidadDidacticaId: null, actividadId: null, actividadNumero: null, unidad: value.toUpperCase(), actividadManual: '', actividad: '' };
  const unit = units.find(u => `u:${u.id}` === value), first = unit?.actividades[0];
  return { ...row, tipoUnidad: 'curricular', unidadDidacticaId: unit?.id ?? null, unidad: unit?.nombre || '', actividadId: first?.id ?? null, actividadNumero: first ? first.numeroSesion ?? 1 : null, actividad: first?.nombre || '', actividadManual: '' };
}

// The signature stays transparent and is cropped to its ink, preserving its aspect ratio.
export function croppedSignature(canvas: HTMLCanvasElement): string | null {
  const context = canvas.getContext('2d'); if (!context) return null;
  const { width, height } = canvas, pixels = context.getImageData(0, 0, width, height).data;
  let left = width, right = -1, top = height, bottom = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (pixels[(y * width + x) * 4 + 3] > 0) {
    left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
  if (right < left) return null;
  const result = document.createElement('canvas'); result.width = right - left + 1; result.height = bottom - top + 1;
  result.getContext('2d')!.drawImage(canvas, left, top, result.width, result.height, 0, 0, result.width, result.height);
  return result.toDataURL('image/png');
}
