const CHANGED_KEY = 'cetprosmp.matriculas.changed';
const listeners = new Set<() => void>();
let revision = 0;
const entries = new Map<string, { expiresAt: number; value: unknown }>();
const pending = new Map<string, Promise<unknown>>();

export const getMatriculaListsRevision = () => revision;
export const subscribeMatriculaLists = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
const clear = () => {
  revision += 1;
  entries.clear();
  pending.clear();
  listeners.forEach((listener) => listener());
};
export function invalidateMatriculaLists() {
  clear();
  try { window.localStorage.setItem(CHANGED_KEY, String(Date.now())); } catch { /* Browser storage is optional. */ }
}
if (typeof window !== 'undefined') window.addEventListener('storage', (event) => {
  if (event.key === CHANGED_KEY) clear();
});

export function peekMatriculaPage<T>(key: string): T | undefined {
  const item = entries.get(key);
  return item && item.expiresAt > Date.now() ? item.value as T : undefined;
}

export async function loadMatriculaPage<T>(key: string, fetch: () => Promise<T>): Promise<T> {
  const cached = peekMatriculaPage<T>(key);
  if (cached !== undefined) return cached;
  const existing = pending.get(key);
  if (existing) return existing as Promise<T>;
  const requestRevision = revision;
  const request = Promise.resolve().then(fetch).then((value) => {
    if (revision === requestRevision) {
      if (entries.size >= 40) entries.delete(entries.keys().next().value!);
      entries.set(key, { value, expiresAt: Date.now() + 30_000 });
    }
    return value;
  });
  pending.set(key, request);
  try { return await request; } finally { if (pending.get(key) === request) pending.delete(key); }
}
