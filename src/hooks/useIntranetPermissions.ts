'use client';

import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { httpsCallable } from 'firebase/functions';
import { useAuth } from '@/context/AuthContext';
import { app, functions } from '@/lib/firebase';
import { isSuperUserEmail, isSuperUserRole, isSuperUserTitle } from '@/lib/intranetPermissions';
import { createIntranetPermissionsStore, type IntranetPermission } from '@/lib/intranetPermissionsStore';
import type { IntranetMenuSection } from '@/components/Sidebar/AcordionIntranet/AcordionIntranet';

export type { IntranetPermission } from '@/lib/intranetPermissionsStore';
export type PermissionAction = 'view' | 'create' | 'edit' | 'delete';

const actionField: Record<PermissionAction, keyof IntranetPermission> = {
  view: 'canView', create: 'canCreate', edit: 'canEdit', delete: 'canDelete',
};
const cachePrefix = 'cetprosmp.permissions.v1:' + (app.options?.projectId ?? 'app') + ':';
const store = createIntranetPermissionsStore(async () => {
  const result = await httpsCallable<undefined, { permissions?: IntranetPermission[] }>(functions, 'listMisPermisos')();
  return result.data.permissions ?? [];
}, {
  read: key => {
    const value = window.sessionStorage.getItem(cachePrefix + key);
    return value ? JSON.parse(value) : undefined;
  },
  write: (key, entry) => window.sessionStorage.setItem(cachePrefix + key, JSON.stringify(entry)),
  remove: key => window.sessionStorage.removeItem(cachePrefix + key),
});
const emptyPermissions: IntranetPermission[] = [];

export function useIntranetPermissions() {
  const { user } = useAuth();
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  const isSuperUser = Boolean(user) && (
    Number(user?.level ?? 0) >= 600 || isSuperUserRole(user?.role)
    || isSuperUserTitle(user?.roleTitle) || isSuperUserEmail(user?.email)
  );
  const key = user?.uid && !isSuperUser ? JSON.stringify([user.uid, String(user.role ?? ''), Number(user.level ?? 0)]) : null;
  // Start with the authenticated UID, alongside the profile request. Never wait for page data.
  useEffect(() => { void store.activate(key); }, [key]);
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') void store.refreshIfStale(); };
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, []);
  const permissions = snapshot.key === key ? snapshot.permissions : emptyPermissions;
  const loading = Boolean(key) && !isSuperUser && (snapshot.key !== key || snapshot.loading);
  const permissionsByEntity = useMemo(() => new Map(permissions.map(item => [item.entity, item])), [permissions]);
  const can = useCallback((entity: string, action: PermissionAction) => {
    if (isSuperUser) return true;
    return Boolean(permissionsByEntity.get(entity)?.[actionField[action]]);
  }, [isSuperUser, permissionsByEntity]);
  const filterSections = useCallback((sections: IntranetMenuSection[]) => {
    if (isSuperUser) return sections;
    if (loading) return [];
    return sections.map(section => ({ ...section, items: section.items.filter(item => can(item.id, 'view')) }))
      .filter(section => section.items.length > 0);
  }, [can, isSuperUser, loading]);
  return { can, filterSections, isSuperUser, loading, permissions };
}
