'use client';

import { useMemo } from 'react';
import { FlyoutMenuTree, type MenuTreeNode } from '@/components/MenuTree/MenuTree';
import type { IntranetMenuSection } from '@/components/Sidebar/AcordionIntranet/AcordionIntranet';
import { useIntranetMenuSections } from '@/hooks/useIntranetMenuSections';

const buildIntranetNodes = (sections: IntranetMenuSection[]): MenuTreeNode[] =>
  sections.map((section) => ({
    id: section.id,
    title: section.title,
    children: section.items
      .filter((item) => !item.divider)
      .map((item) => ({
        id: item.id,
        title: item.title,
        href: item.path,
      })),
  }));

export default function IntranetMenuWrapper() {
  const { sections, loading } = useIntranetMenuSections();
  const nodes = useMemo(() => buildIntranetNodes(sections), [sections]);

  if (loading || nodes.length === 0) return null;

  return (
    <FlyoutMenuTree
      label="Intranet"
      href="/intranet"
      nodes={nodes}
      width="230px"
      rootMenuSx={{ ml: -8 }}
      sx={{ display: { xs: 'none', md: 'block' } }}
    />
  );
}
