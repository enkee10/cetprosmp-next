'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { useAuth } from '@/context/AuthContext';
import { functions } from '@/lib/firebase';
import { isSuperUserEmail, isSuperUserRole, isSuperUserTitle } from '@/lib/intranetPermissions';
import type { IntranetMenuSection } from '@/components/Sidebar/AcordionIntranet/AcordionIntranet';

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete';

export type IntranetPermission = {
  entity: string;
  canView?: boolean | null;
  canCreate?: boolean | null;
  canEdit?: boolean | null;
  canDelete?: boolean | null;
};

const actionField: Record<PermissionAction, keyof IntranetPermission> = {
  view: 'canView',
  create: 'canCreate',
  edit: 'canEdit',
  delete: 'canDelete',
};

const normalizePermissions = (items: IntranetPermission[] | undefined | null) =>
  (items ?? []).filter((item) => typeof item.entity === 'string' && item.entity.trim().length > 0);

const permissionsCache = new Map<string, IntranetPermission[]>();
const permissionsRequests = new Map<string, Promise<IntranetPermission[]>>();

async function loadPermissionsForUser(userUid: string) {
  const cached = permissionsCache.get(userUid);
  if (cached) return cached;

  const currentRequest = permissionsRequests.get(userUid);
  if (currentRequest) return currentRequest;

  const request = (async () => {
    const listMisPermisos = httpsCallable<undefined, { permissions?: IntranetPermission[] }>(
      functions,
      'listMisPermisos',
    );
    const result = await listMisPermisos();
    const permissions = normalizePermissions(result.data.permissions);
    permissionsCache.set(userUid, permissions);
    return permissions;
  })();

  permissionsRequests.set(userUid, request);
  try {
    return await request;
  } finally {
    permissionsRequests.delete(userUid);
  }
}

export function useIntranetPermissions() {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<IntranetPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const userUid = user?.uid ?? '';
  const profileResolved = !user || user.profileResolved !== false;
  const isSuperUser =
    Number(user?.level ?? 0) >= 600
    || isSuperUserRole(user?.role)
    || isSuperUserTitle(user?.roleTitle)
    || isSuperUserEmail(user?.email);

  useEffect(() => {
    let active = true;

    const loadPermissions = async () => {
      if (!userUid) {
        setPermissions([]);
        setLoading(false);
        return;
      }

      if (!profileResolved) {
        setLoading(true);
        return;
      }

      if (isSuperUser) {
        setPermissions([]);
        setLoading(false);
        return;
      }

      const cachedPermissions = permissionsCache.get(userUid);
      if (cachedPermissions) {
        setPermissions(cachedPermissions);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const nextPermissions = await loadPermissionsForUser(userUid);
        if (active) setPermissions(nextPermissions);
      } catch (error) {
        console.error('Error loading intranet permissions:', error);
        if (active) setPermissions([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadPermissions();
    return () => {
      active = false;
    };
  }, [isSuperUser, profileResolved, userUid]);

  const permissionsByEntity = useMemo(() => {
    return new Map(permissions.map((permission) => [permission.entity, permission]));
  }, [permissions]);

  const can = useCallback(
    (entity: string, action: PermissionAction) => {
      if (isSuperUser) return true;
      const permission = permissionsByEntity.get(entity);
      return Boolean(permission?.[actionField[action]]);
    },
    [isSuperUser, permissionsByEntity],
  );

  const filterSections = useCallback(
    (sections: IntranetMenuSection[]) => {
      if (isSuperUser) return sections;
      if (loading) return [];
      return sections
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => can(item.id, 'view')),
        }))
        .filter((section) => section.items.length > 0);
    },
    [can, isSuperUser, loading],
  );

  return { can, filterSections, isSuperUser, loading, permissions };
}
