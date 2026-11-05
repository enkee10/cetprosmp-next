export type GradeChange =
  | { kind: 'nota'; matriculaId: number; indicadorCapacidadId: number; value: number | null }
  | { kind: 'efsrt'; moduloEstudianteId: number; value: number | null };
type PendingGrade = GradeChange & { revision: number };
export type GradeQueueStatus = { pending: number; saving: boolean; error: string | null; backedUp: boolean };
export const gradeChangeKey = (entry: GradeChange) => entry.kind === 'nota' ? `n:${entry.matriculaId}:${entry.indicadorCapacidadId}` : `e:${entry.moduloEstudianteId}`;

/** One writer per register. New edits never wait for the in-flight request. */
export class RegistroGradeQueue {
  private entries = new Map<string, PendingGrade>();
  private revision = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private saving = false;
  private error: string | null = null;
  private backedUp = true;
  private retryDelay = 1000;
  private listeners = new Set<() => void>();
  constructor(private key: string, private storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>,
    private send: (changes: GradeChange[]) => Promise<unknown>, private available: () => boolean) {
    try {
      const stored: unknown = JSON.parse(storage.getItem(key) ?? '[]');
      if (Array.isArray(stored)) for (const row of stored) {
        if (!row || (row.value !== null && (typeof row.value !== 'number' || row.value < 0 || row.value > 20))) continue;
        if (row.kind === 'nota' && Number.isSafeInteger(row.matriculaId) && row.matriculaId > 0 && Number.isSafeInteger(row.indicadorCapacidadId) && row.indicadorCapacidadId > 0
          || row.kind === 'efsrt' && Number.isSafeInteger(row.moduloEstudianteId) && row.moduloEstudianteId > 0) {
          this.entries.set(gradeChangeKey(row), { ...row, revision: ++this.revision });
        }
      }
    } catch { this.backedUp = false; }
  }
  values = (): GradeChange[] => [...this.entries.values()];
  status = (): GradeQueueStatus => ({ pending: this.entries.size, saving: this.saving, error: this.error, backedUp: this.backedUp });
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private notify() { for (const listener of this.listeners) listener(); }
  private persist() {
    try {
      if (this.entries.size) this.storage.setItem(this.key, JSON.stringify(this.values()));
      else this.storage.removeItem(this.key);
      this.backedUp = true;
    } catch { this.backedUp = false; }
  }
  enqueue(changes: GradeChange[]) {
    for (const change of changes) this.entries.set(gradeChangeKey(change), { ...change, revision: ++this.revision });
    this.persist();
    this.notify();
    this.schedule(180);
  }
  discardStudent(matriculaId: number, moduloEstudianteId: number) {
    for (const [key, entry] of this.entries) if (entry.kind === 'nota' ? entry.matriculaId === matriculaId : entry.moduloEstudianteId === moduloEstudianteId) this.entries.delete(key);
    this.persist(); this.notify();
  }
  private schedule(delay: number) {
    if (this.timer || this.saving || !this.entries.size) return;
    this.timer = setTimeout(() => { this.timer = undefined; void this.flush(); }, delay);
  }
  async flush() {
    if (this.timer) { clearTimeout(this.timer); this.timer = undefined; }
    if (this.saving || !this.entries.size) return;
    if (!this.available()) {
      this.error = 'Sin conexión o sesión activa. Las notas quedan pendientes.';
      this.notify(); this.schedule(5000); return;
    }
    const batch = [...this.entries.values()].slice(0, 100);
    this.saving = true; this.error = null; this.notify();
    let retry = true;
    try {
      await this.send(batch);
      for (const row of batch) if (this.entries.get(gradeChangeKey(row))?.revision === row.revision) this.entries.delete(gradeChangeKey(row));
      this.retryDelay = 1000;
      this.persist();
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'No se pudieron guardar las notas.';
      const code = String((error as { code?: string })?.code ?? '');
      retry = !/permission-denied|unauthenticated|invalid-argument|failed-precondition|not-found/.test(code);
      this.retryDelay = Math.min(30000, this.retryDelay * 2);
    } finally {
      this.saving = false; this.notify();
      if (retry) this.schedule(this.error ? this.retryDelay : 0);
    }
  }
}
