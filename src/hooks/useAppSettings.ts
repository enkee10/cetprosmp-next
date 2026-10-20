'use client';

import { createElement, Fragment, useCallback, useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { invalidateMatriculaLists } from '@/lib/matriculasListCache';
import { httpsCallable } from 'firebase/functions';
import { useAuth } from '@/context/AuthContext';
import { functions } from '@/lib/firebase';
import { createAppSettingsStore } from '@/lib/appSettingsStore';
import { type AppSettings, defaultAppSettings } from '@/lib/appSettings';

export { defaultAppSettings, type AppSettings } from '@/lib/appSettings';

const SETTINGS_CHANGED_KEY = 'cetprosmp.appSettings.changed';
const SESSION_KEY = 'cetprosmp.appSettings.v2.';
const limaDay = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date());
const store = createAppSettingsStore(async () => {
  const result = await httpsCallable<undefined, { settings?: Partial<AppSettings> }>(functions, 'getAppSettings')();
  return result.data.settings;
}, {
  read: (uid) => {
    const raw = window.sessionStorage.getItem(SESSION_KEY + uid);
    if (!raw) return undefined;
    const cached = JSON.parse(raw);
    return cached.day === limaDay() ? cached.settings : undefined;
  },
  write: (uid, settings) => window.sessionStorage.setItem(SESSION_KEY + uid, JSON.stringify({ day: limaDay(), settings })),
  remove: (uid) => window.sessionStorage.removeItem(SESSION_KEY + uid),
});

// One store and one in-flight request for the whole authenticated browser session.
export function useAppSettings() {
  const { user, loading: loadingAuth } = useAuth();
  const uid = user?.uid ?? null;
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  useEffect(() => { void store.activate(uid); }, [uid]);
  const reload = useCallback(() => store.getSnapshot().uid === uid ? store.reload() : store.activate(uid), [uid]);
  const setSettings = useCallback((value: AppSettings | ((previous: AppSettings) => AppSettings)) => {
    if (store.getSnapshot().uid !== uid) return;
    store.setSettings((previous) => {
      const next = typeof value === 'function' ? value(previous) : value;
      return { ...next, general: { ...next.general, semestres: next.general.semestres ?? previous.general.semestres } };
    });
    try { window.localStorage.setItem(SETTINGS_CHANGED_KEY, String(Date.now())); } catch { /* Storage is optional. */ }
  }, [uid]);
  const isCurrentUser = snapshot.uid === uid;
  return {
    settings: isCurrentUser ? snapshot.settings : defaultAppSettings,
    loading: loadingAuth || !isCurrentUser || snapshot.loading,
    error: isCurrentUser ? snapshot.error : null,
    setSettings, reload,
  };
}

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const { reload, settings } = useAppSettings();
  const previousSemester = useRef(settings.general.semestreActualId);
  useEffect(() => {
    if (previousSemester.current && previousSemester.current !== settings.general.semestreActualId) invalidateMatriculaLists();
    previousSemester.current = settings.general.semestreActualId;
  }, [settings.general.semestreActualId]);
  useEffect(() => {
    let lastRefresh = Date.now();
    let day = limaDay();
    const refresh = () => {
      if (document.visibilityState !== 'visible' || Date.now() - lastRefresh < 60_000) return;
      lastRefresh = Date.now();
      void reload();
    };
    // Revalidate after returning to the app, and at the next Lima day boundary.
    const midnight = window.setInterval(() => {
      const nextDay = limaDay();
      if (nextDay !== day && document.visibilityState === 'visible') {
        day = nextDay;
        lastRefresh = Date.now();
        void reload();
      }
    }, 60_000);
    const onStorage = (event: StorageEvent) => {
      if (event.key === SETTINGS_CHANGED_KEY) void reload();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(midnight);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [reload]);
  return createElement(Fragment, null, children);
}
