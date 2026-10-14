import type { Metadata, Viewport } from 'next';
import ParteDiarioClient from '@/components/parte-diario/ParteDiarioClient';
import ParteDiarioPwaUpdate from '@/components/parte-diario/ParteDiarioPwaUpdate';

export const metadata: Metadata = {
  title: 'Parte Diario - CETPRO SMP',
  applicationName: 'Parte Diario - CETPRO SMP',
  description: 'Registro institucional del Parte Diario del CETPRO San Martín de Porres.',
  manifest: '/parte-diario/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/parte-diario/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/parte-diario/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { themeColor: '#164863' };
export default function ParteDiarioPage() { return <><ParteDiarioClient /><ParteDiarioPwaUpdate /></>; }
