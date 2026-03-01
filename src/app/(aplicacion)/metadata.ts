import type { Metadata } from 'next';

const metadata: Metadata = {
    title: 'CETPRO SMP - Educación Técnica y Formación para el Trabajo',
    description: 'Centro de Educación Técnico Productiva en San Martín de Porres. Ofrecemos especialidades técnicas con alta demanda laboral y formación emprendedora.',
    keywords: [
        'cetpro',
        'educación técnica',
        'San Martín de Porres',
        'especialidades técnicas',
        'formación profesional',
        'estudiar técnico',
        'cursos técnicos',
        'cetpro smp',
    ],
    metadataBase: new URL('https://tusitio.com'),
    openGraph: {
        title: 'CETPRO SMP - Educación Técnica y Formación para el Trabajo',
        description: 'Especialidades técnicas con alta demanda laboral. ¡Forma tu futuro hoy en CETPRO SMP!',
        url: 'https://tusitio.com',
        siteName: 'CETPRO SMP',
        locale: 'es_PE',
        type: 'website',
        images: [
            {
                url: process.env.NEXT_PUBLIC_DEFAULT_IMG_URL!,
                width: 1200,
                height: 630,
                alt: 'Portada CETPRO SMP',
            },
        ],
    },
    robots: {
        index: true,
        follow: true,
    },
    icons: {
        icon: '/favicon.ico',
    },
};

export default metadata;
