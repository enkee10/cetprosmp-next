// src/app/(aplicacion)/modulos/metadata.ts
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Moduloes Técnicas | CETPRO San Martín de Porres',
    description:
        'Descubre nuestras modulos técnicas en computación, confección, electricidad y más. CETPRO SMP forma técnicos emprendedores preparados para el mundo laboral.',
    keywords: [
        'cetpro',
        'san martín de porres',
        'modulos técnicas',
        'computación',
        'confección textil',
        'electricidad',
        'manualidades',
        'formación técnica',
        'estudiar en los olivos',
        'estética personal',
    ],
    openGraph: {
        title: 'Moduloes Técnicas | CETPRO SMP',
        description:
            'Formamos técnicos emprendedores en computación, electricidad, confección y más.',
        url: 'https://www.tusitioweb.edu.pe/modulos',
        siteName: 'CETPRO San Martín de Porres',
        type: 'website',
        images: [
            {
                url: 'https://www.tusitioweb.edu.pe/og/modulos.jpg',
                width: 1200,
                height: 630,
                alt: 'Moduloes técnicas en CETPRO SMP',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Moduloes Técnicas | CETPRO SMP',
        description: 'Descubre las modulos técnicas del CETPRO San Martín de Porres.',
        images: ['https://www.tusitioweb.edu.pe/og/modulos.jpg'],
    },
};
