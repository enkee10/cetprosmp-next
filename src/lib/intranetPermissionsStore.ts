export type IntranetPermission = {
  entity: string;
  canView?: boolean | null;
  canCreate?: boolean | null;
  canEdit?: boolean | null;
  canDelete?: boolean | null;
};

type Snapshot = { key: string | null; permissions: IntranetPermission[]; loading: boolean; error: unknown };
type CacheEntry = { savedAt: number; permissions: IntranetPermission[] };
type Cache = { read(key: string): CacheEntry | undefined; write(key: string, entry: CacheEntry): void; remove(key: string): void };
export const PERMISSIONS_CACHE_TTL = 5 * 60_000;
const normalize = (items: IntranetPermission[]) => items.filter(item => item && typeof item.entity === 'string' && item.entity.trim());

/** UI metadata only. Every backend operation still checks current permissions. */
export function createIntranetPermissionsStore(load: () => Promise<IntranetPermission[]>, cache?: Cache, now = Date.now) {
  const initial: Snapshot = { key: null, permissions: [], loading: false, error: null };
  let snapshot = initial;
  let generation = 0;
  let loaded = false;
  let checkedAt = 0;
  let pending: Promise<void> | null = null;
  const listeners = new Set<() => void>();
  const publish = (next: Snapshot) => {
    snapshot = next;
    listeners.forEach(listener => listener());
  };
  const reload = (): Promise<void> => {
    if (!snapshot.key) return Promise.resolve();
    if (pending) return pending;
    const key = snapshot.key, requestGeneration = generation;
    publish({ ...snapshot, loading: !loaded, error: null });
    const request = Promise.resolve().then(async () => {
      try {
        const result = normalize(await load());
        if (requestGeneration !== generation) return;
        const permissions = JSON.stringify(result) === JSON.stringify(snapshot.permissions) ? snapshot.permissions : result;
        loaded = true;
        checkedAt = now();
        publish({ key, permissions, loading: false, error: null });
        try { cache?.write(key, { savedAt: checkedAt, permissions }); } catch { /* Optional cache. */ }
      } catch (error) {
        if (requestGeneration === generation) publish({ ...snapshot, loading: false, error });
      } finally {
        if (pending === request) pending = null;
      }
    });
    pending = request;
    return request;
  };
  const activate = (key: string | null): Promise<void> => {
    if (snapshot.key === key) {
      return key && (!loaded || now() - checkedAt >= PERMISSIONS_CACHE_TTL) ? reload() : pending ?? Promise.resolve();
    }
    if (snapshot.key) { try { cache?.remove(snapshot.key); } catch { /* Optional cache. */ } }
    generation += 1;
    pending = null;
    loaded = false;
    checkedAt = 0;
    let entry: CacheEntry | undefined;
    if (key) {
      try {
        const cached = cache?.read(key);
        if (cached && Array.isArray(cached.permissions) && Number.isFinite(cached.savedAt)
          && now() >= cached.savedAt && now() - cached.savedAt < PERMISSIONS_CACHE_TTL) entry = cached;
      } catch { /* Missing or corrupt browser cache must not prevent login. */ }
    }
    loaded = Boolean(entry);
    checkedAt = entry?.savedAt ?? 0;
    publish({ ...initial, key, permissions: entry ? normalize(entry.permissions) : [], loading: Boolean(key) && !loaded });
    return reload();
  };
  return {
    activate, reload,
    refreshIfStale: () => !loaded || now() - checkedAt >= PERMISSIONS_CACHE_TTL ? reload() : Promise.resolve(),
    getSnapshot: () => snapshot,
    getServerSnapshot: () => initial,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
  };
}
