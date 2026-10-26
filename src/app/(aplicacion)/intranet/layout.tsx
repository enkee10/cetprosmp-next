import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import IntranetLayoutClient from '@/components/intranet/IntranetLayoutClient';

// Each view supplies its title without inheriting the public site's title.
export const metadata: Metadata = { title: null };

export default function IntranetLayout({ children }: { children: ReactNode }) {
  return <IntranetLayoutClient>{children}</IntranetLayoutClient>;
}
