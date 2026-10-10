export const PARTE_VALUATIONS = {
 silabo: ['No tiene', 'No firmado y no publicado', 'Firmado y no publicado', 'No firmado y publicado', 'Firmado y publicado'],
 material: ['No tiene', 'Completo y no publicado', 'En proceso y no publicado', 'En proceso y publicado', 'Completo y publicado'],
 tareas: ['No tiene', 'No publicado', 'Publicado y no respondido', 'Publicado y respondido parcialmente', 'Publicado y respondido'],
 fichaActividad: ['No tiene', 'Está pero no la usa', 'Está en proceso', 'Está bien estructurada', 'Está muy bien estructurada'],
 instrumentoEvaluacion: ['No tiene', 'Sí tiene pero no lo aplica', 'Sí tiene, está en proceso y lo aplica', 'Sí tiene, está bien estructurado y lo aplica', 'Sí tiene, está muy bien estructurado y lo aplica'],
} as const;
export type ValuationField = keyof typeof PARTE_VALUATIONS;
export const VALUATION_FIELDS = Object.keys(PARTE_VALUATIONS) as ValuationField[];
export const valuationLabels = (field: ValuationField) => [...PARTE_VALUATIONS[field]].reverse();
export const valuationScore = (field: ValuationField, value: unknown): number | null => {
 const normalized = String(value ?? '').trim().toLocaleLowerCase('es');
 const index = PARTE_VALUATIONS[field].findIndex(label => label.toLocaleLowerCase('es') === normalized);
 return index < 0 ? null : index;
};
export const scoreColumn = (field: ValuationField) => `${field}Valor`;
