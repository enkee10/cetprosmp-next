import { defaultAppSettings, normalizeSettings, type AppSettings } from './appSettings';

type Snapshot = { uid: string | null; settings: AppSettings; loading: boolean; error: unknown };

type SettingsCache = {
  read: (uid: string) => Partial<AppSettings> | undefined;
  write: (uid: string, settings: AppSettings) => void;
  remove: (uid: string) => void;
};

export function createAppSettingsStore(load: () => Promise<Partial<AppSettings> | undefined>, cache?: SettingsCache) {
  const initial: Snapshot = { uid: null, settings: defaultAppSettings, loading: false, error: null };
  let snapshot = initial;
  let generation = 0;
  let loaded = false;
  let pending: Promise<void> | null = null;
  const listeners = new Set<() => void>();
  const publish = (next: Snapshot) => {
    snapshot = next;
    listeners.forEach((listener) => listener());
  };
  const applySettings = (value: AppSettings | ((previous: AppSettings) => AppSettings)) => {
    const next = normalizeSettings(typeof value === 'function' ? value(snapshot.settings) : value);
    // Preserve the global value when a reload returns unchanged settings.
    const settings = JSON.stringify(next) === JSON.stringify(snapshot.settings) ? snapshot.settings : next;
    loaded = true;
    publish({ ...snapshot, settings, loading: false, error: null });
    if (snapshot.uid) { try { cache?.write(snapshot.uid, settings); } catch { /* Optional browser cache. */ } }
  };
  const reload = (): Promise<void> => {
    if (!snapshot.uid) return Promise.resolve();
    if (pending) return pending;
    const requestGeneration = generation;
    publish({ ...snapshot, loading: !loaded, error: null });
    const request = Promise.resolve().then(async () => {
      try {
        const result = await load();
        if (requestGeneration === generation) applySettings(normalizeSettings(result));
      } catch (error) {
        if (requestGeneration === generation) publish({ ...snapshot, loading: false, error });
      } finally {
        if (pending === request) pending = null;
      }
    });
    pending = request;
    return request;
  };
  const activate = (uid: string | null): Promise<void> => {
    if (snapshot.uid === uid) return pending ?? Promise.resolve();
    if (snapshot.uid && snapshot.uid !== uid) {
      try { cache?.remove(snapshot.uid); } catch { /* Optional browser cache. */ }
    }
    generation += 1;
    loaded = false;
    pending = null;
    let cached: Partial<AppSettings> | undefined;
    if (uid) { try { cached = cache?.read(uid); } catch { /* Optional browser cache. */ } }
    loaded = Boolean(cached);
    publish({ ...initial, uid, settings: cached ? normalizeSettings(cached) : defaultAppSettings, loading: Boolean(uid) && !loaded });
    return reload();
  };
  return {
    activate, reload,
    setSettings: (value: AppSettings | ((previous: AppSettings) => AppSettings)) => {
      generation += 1;
      pending = null;
      applySettings(value);
    },
    getSnapshot: () => snapshot,
    getServerSnapshot: () => initial,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
}
