'use client';

import { useMemo } from 'react';
import { menuSections, type IntranetMenuSection } from '@/components/Sidebar/AcordionIntranet/AcordionIntranet';
import { useAuth } from '@/context/AuthContext';
import { useIntranetPermissions } from '@/hooks/useIntranetPermissions';
import { isDocenteRole } from '@/lib/intranetPermissions';

export function useIntranetMenuSections(sourceSections: IntranetMenuSection[] = menuSections) {
  const { user } = useAuth();
  const { filterSections, loading, isSuperUser } = useIntranetPermissions();
  const isDocente = !isSuperUser && isDocenteRole(user?.role);
  const sections = useMemo(() => {
    const filtered = filterSections(sourceSections);
    if (!isDocente) return filtered;
    // The menu needs only permissions. Group/module data belongs to each screen.
    return filtered.map(section => ({ ...section, items: section.items.map(item =>
      item.id === 'estructura-academica' ? { ...item, path: '/intranet/estructura-academica-docente' } : item),
    }));
  }, [filterSections, sourceSections, isDocente]);
  return { sections, loading };
}
