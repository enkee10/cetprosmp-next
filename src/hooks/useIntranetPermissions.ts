'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { useAuth } from '@/context/AuthContext';
import { functions } from '@/lib/firebase';
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

export function useIntranetPermissions() {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<IntranetPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const isSuperUser = Number(user?.level ?? 0) >= 600;

  useEffect(() => {
    let active = true;

    const loadPermissions = async () => {
      if (!user) {
        setPermissions([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const listMisPermisos = httpsCallable<undefined, { permissions?: IntranetPermission[] }>(
          functions,
          'listMisPermisos',
        );
        const result = await listMisPermisos();
        if (active) setPermissions(normalizePermissions(result.data.permissions));
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
  }, [user]);

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
      if (loading && !isSuperUser) return [];
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
