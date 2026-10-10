import type { Metadata } from 'next';
import ParteDiarioClient from '@/components/parte-diario/ParteDiarioClient';
export const metadata: Metadata = { title: 'Parte Diario — CETPRO SMP', robots: { index: false, follow: false } };
export default function ParteDiarioPage() { return <ParteDiarioClient />; }
