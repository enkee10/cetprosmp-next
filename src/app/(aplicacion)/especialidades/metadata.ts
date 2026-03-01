// src/app/(aplicacion)/especialidades/metadata.ts
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Especialidades Técnicas | CETPRO San Martín de Porres',
    description:
        'Descubre nuestras especialidades técnicas en computación, confección, electricidad y más. CETPRO SMP forma técnicos emprendedores preparados para el mundo laboral.',
    keywords: [
        'cetpro',
        'san martín de porres',
        'especialidades técnicas',
        'computación',
        'confección textil',
        'electricidad',
        'manualidades',
        'formación técnica',
        'estudiar en los olivos',
        'estética personal',
    ],
    openGraph: {
        title: 'Especialidades Técnicas | CETPRO SMP',
        description:
            'Formamos técnicos emprendedores en computación, electricidad, confección y más.',
        url: 'https://www.tusitioweb.edu.pe/especialidades',
        siteName: 'CETPRO San Martín de Porres',
        type: 'website',
        images: [
            {
                url: 'https://www.tusitioweb.edu.pe/og/especialidades.jpg',
                width: 1200,
                height: 630,
                alt: 'Especialidades técnicas en CETPRO SMP',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Especialidades Técnicas | CETPRO SMP',
        description: 'Descubre las especialidades técnicas del CETPRO San Martín de Porres.',
        images: ['https://www.tusitioweb.edu.pe/og/especialidades.jpg'],
    },
};
