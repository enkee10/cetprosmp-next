import { valuationLabels, ValuationField } from '../../functions/src/modules/parte-diario/valuations';
export const SILABO_OPTIONS = valuationLabels('silabo');
export const FICHA_OPTIONS = valuationLabels('fichaActividad');
export const INSTRUMENTO_OPTIONS = valuationLabels('instrumentoEvaluacion');
export const MATERIAL_OPTIONS = valuationLabels('material');
export const TAREAS_OPTIONS = valuationLabels('tareas');
export { valuationLabels };
export interface ParteDiarioRow {
  actividadesDelDia?: { id: number; nombre: string; unidad: string; unidadId: number | null }[];
  key: string; orden: number; grupoModuloId: number; moduloId: number; docenteId: number; actividadProgramadaId: number | null;
  recordId?: number | null; valoraciones?: Record<ValuationField, number | null>;
  jornadaId: number | null; tipoUnidad: 'curricular' | 'ppp' | 'efsrt'; practicaTipo: 'ppp' | 'efsrt'; actividadManual: string; pendiente: boolean;
  docenteNombre: string; docenteNombreCompleto: string; avatar: string | null; turno: string; turnoOrden: number;
  modulo: string; unidadDidacticaId: number | null; unidad: string; actividadId: number | null; actividad: string;
  matriculados: number; asistentes: number | null; silabo: string; fichaActividad: string; instrumentoEvaluacion: string;
  material: string; tareas: string; firma: string | null; observaciones: string[]; version: string | null;
}
export interface ParteDiarioData { fecha: string; laborable: boolean; mensaje: string | null; filas: ParteDiarioRow[] }
export interface ParteActividad { id: number; nombre: string | null; fechas?: string[] }
export interface ParteUnidad { id: number; nombre: string | null; actividades: ParteActividad[] }
export const unitLabel = (name: string | null) => (name || '').toLocaleUpperCase('es');
export const activityLabel = (name: string | null) => (name || '').toLocaleLowerCase('es').replace(/(^|[.!?]\s*|\n\s*)([\p{L}])/gu, (_all, prefix: string, letter: string) => prefix + letter.toLocaleUpperCase('es'));
export const activityDatesLabel = (dates?: string[]) => dates?.length ? dates.map(date => `${date.slice(8,10)}/${date.slice(5,7)}/${date.slice(2,4)}`).join(', ') : 'Sin fecha programada';
export const parteDateLabel = (fecha: string) => {
  const date = new Date(`${fecha}T12:00:00Z`), format = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('es-PE', { ...options, timeZone: 'America/Lima' }).format(date).toLowerCase().replace('.', '');
  return `SMP, ${format({ weekday: 'long' })} ${format({ day: '2-digit' })} de ${format({ month: 'short' })} del ${fecha.slice(0, 4)}`;
};
export const parteGroupLabel = (nombre: string) => nombre.replace(/\s*\([^)]*\)\s*$/, '').replace(/\s*\[(?:mañana|tarde|noche)\]/giu, '').trim();
export const parteUnitValue = (row: ParteDiarioRow) => row.tipoUnidad === 'curricular' ? (row.unidadDidacticaId == null ? '' : `u:${row.unidadDidacticaId}`) : row.tipoUnidad;
export function changeParteUnit(row: ParteDiarioRow, value: string, units: ParteUnidad[]): ParteDiarioRow {
  if (value === 'ppp' || value === 'efsrt') return { ...row, tipoUnidad: value, unidadDidacticaId: null, actividadId: null, unidad: value.toUpperCase(), actividadManual: '', actividad: '' };
  const unit = units.find(u => `u:${u.id}` === value), first = unit?.actividades[0];
  return { ...row, tipoUnidad: 'curricular', unidadDidacticaId: unit?.id ?? null, unidad: unit?.nombre || '', actividadId: first?.id ?? null, actividad: first?.nombre || '', actividadManual: '' };
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
