import type { Especialidad } from '@/types/especialidades';

export function generarJsonLd(especialidad: Especialidad): object {
    const descripcion =
        especialidad.descripcion2?.length && especialidad.descripcion2.some(b => b.type === 'paragraph')
            ? especialidad.descripcion2
                .map(parrafo =>
                    parrafo.children?.map(c => c.text).join(' ')
                )
                .join(' ')
            : 'Curso técnico en CETPRO San Martín de Porres.';

    const imagenDestacada =
        especialidad.imagenes?.[0]?.url || process.env.NEXT_PUBLIC_DEFAULT_IMG_URL;

    return {
        "@context": "https://schema.org",
        "@type": "Course",
        name: especialidad.tituloComercial,
        description: descripcion,
        provider: {
            "@type": "Organization",
            name: "CETPRO San Martín de Porres",
            sameAs: "https://cetprosmp.edu.pe"
        },
        image: imagenDestacada,
        url: `https://cetprosmp.edu.pe/especialidades/${especialidad.slug}`
    };
}
