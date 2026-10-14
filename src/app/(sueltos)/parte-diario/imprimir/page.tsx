import { Suspense } from 'react';
import type { Metadata } from 'next';
import ParteDiarioPrint from '@/components/parte-diario/ParteDiarioPrint';
export const metadata: Metadata = { title: 'Imprimir Parte Diario - CETPRO SMP', robots: { index: false, follow: false } };
export default function ParteDiarioPrintPage() { return <Suspense fallback={<p>Cargando vista previa…</p>}><ParteDiarioPrint /></Suspense>; }
