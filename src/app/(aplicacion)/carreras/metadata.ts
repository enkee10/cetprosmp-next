// src/app/(aplicacion)/carreras/metadata.ts
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Carreraes Técnicas | CETPRO San Martín de Porres',
    description:
        'Descubre nuestras carreras técnicas en computación, confección, electricidad y más. CETPRO SMP forma técnicos emprendedores preparados para el mundo laboral.',
    keywords: [
        'cetpro',
        'san martín de porres',
        'carreras técnicas',
        'computación',
        'confección textil',
        'electricidad',
        'manualidades',
        'formación técnica',
        'estudiar en los olivos',
        'estética personal',
    ],
    openGraph: {
        title: 'Carreraes Técnicas | CETPRO SMP',
        description:
            'Formamos técnicos emprendedores en computación, electricidad, confección y más.',
        url: 'https://www.tusitioweb.edu.pe/carreras',
        siteName: 'CETPRO San Martín de Porres',
        type: 'website',
        images: [
            {
                url: 'https://www.tusitioweb.edu.pe/og/carreras.jpg',
                width: 1200,
                height: 630,
                alt: 'Carreraes técnicas en CETPRO SMP',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Carreraes Técnicas | CETPRO SMP',
        description: 'Descubre las carreras técnicas del CETPRO San Martín de Porres.',
        images: ['https://www.tusitioweb.edu.pe/og/carreras.jpg'],
    },
};
