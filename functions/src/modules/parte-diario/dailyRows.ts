export type DailyActivity = { id: number; nombre: string; unidad: string; unidadId: number | null };
type DailyRow = { grupoModuloId: number; version: string | null; recordId: number | null; actividadProgramadaId: number | null };

/** One daily form per group-module. Existing records keep their original identities. */
export function consolidateDailyRows<T extends DailyRow>(candidates: { row: T; inicio: string; programada: DailyActivity | null }[]): (T & { actividadesDelDia: DailyActivity[] })[] {
  const groups = new Map<number, typeof candidates>();
  for (const candidate of candidates) {
    const group = groups.get(candidate.row.grupoModuloId) ?? [];
    group.push(candidate);
    groups.set(candidate.row.grupoModuloId, group);
  }
  return [...groups.values()].map(group => {
    const ordered = [...group].sort((a, b) => a.inicio.localeCompare(b.inicio) || Number(a.programada == null) - Number(b.programada == null));
    const saved = ordered.filter(c => c.row.recordId != null).sort((a, b) => Date.parse(b.row.version!) - Date.parse(a.row.version!) || b.row.recordId! - a.row.recordId!);
    const activities = [...new Map(ordered.filter(c => c.programada != null).map(c => [c.programada!.id, c.programada!])).values()];
    return { ...(saved[0] ?? ordered[0]).row, actividadesDelDia: activities };
  });
}
