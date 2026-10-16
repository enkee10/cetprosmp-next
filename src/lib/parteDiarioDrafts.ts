import type { ParteDiarioRow, ParteEditor } from './parteDiario';

export type ParteObservationDraft = { text: string; editing: number | null };
const fields = ['tipoUnidad', 'unidadDidacticaId', 'unidad', 'actividadId', 'actividad', 'actividadNumero', 'actividadManual', 'asistentes', 'usoMedios', 'silabo', 'fichaActividad', 'instrumentoEvaluacion', 'registroAsistencia', 'registroAuxiliarEvaluacion', 'material', 'tareas', 'firma', 'observaciones', 'compromisos'] as const;
type DraftFields = Pick<ParteDiarioRow, typeof fields[number]>;
type StoredDraft = { format: 1; baseVersion: string | null; values: DraftFields; editor: ParteEditor; observation: ParteObservationDraft };
export const parteDraftKey = (fecha: string, grupoModuloId: number) => `cetprosmp.parte-diario.borrador.v1:${fecha}:${grupoModuloId}`;
export const emptyParteObservation = (): ParteObservationDraft => ({ text: '', editing: null });

export function readParteDraft(storage: Storage, fecha: string, original: ParteDiarioRow) {
  const raw = storage.getItem(parteDraftKey(fecha, original.grupoModuloId));
  if (!raw) return null;
  try {
    const saved = JSON.parse(raw) as StoredDraft;
    if (saved.format !== 1 || !saved.values || !saved.editor?.uid || !Array.isArray(saved.values.observaciones)
      || !['curricular', 'ppp', 'efsrt'].includes(saved.values.tipoUnidad) || typeof saved.observation?.text !== 'string') return null;
    const values = Object.fromEntries(fields.filter(field => field in saved.values).map(field => [field, saved.values[field]]));
    return {
      row: { ...original, ...values, version: saved.baseVersion, borrador: true, editor: saved.editor,
        borradorConflicto: saved.baseVersion !== original.version } as ParteDiarioRow,
      observation: saved.observation,
    };
  } catch { return null; }
}

/** Called synchronously from input events, so closing the app needs no unload request. */
export function writeParteDraft(storage: Storage, fecha: string, row: ParteDiarioRow, observation: ParteObservationDraft, editor: ParteEditor) {
  const draft: ParteDiarioRow = { ...row, borrador: true, editor };
  const saved: StoredDraft = { format: 1, baseVersion: row.version, values: Object.fromEntries(fields.map(field => [field, row[field]])) as DraftFields, editor, observation };
  storage.setItem(parteDraftKey(fecha, row.grupoModuloId), JSON.stringify(saved));
  return draft;
}

export function clearParteDraft(storage: Storage, fecha: string, row: ParteDiarioRow) {
  storage.removeItem(parteDraftKey(fecha, row.grupoModuloId));
}

export function editedParteDraft(next: ParteDiarioRow, previous: ParteDiarioRow, editor: ParteEditor): ParteDiarioRow {
  return { ...next, borrador: true, editor,
    // An old accepted signature must not approve changes made afterwards.
    firma: !previous.borrador && previous.recordId && previous.firma === next.firma ? null : next.firma };
}
