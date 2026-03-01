import type { Modulo } from './modulos';

export interface Carrera {
    id: number;
    titulo: string;
    tituloComercial: string;
    slug: string; // Slug amigable para la URL
    codigo: string;
    duracion: number;
    descripcion2?: {
        type: string;
        children: { text: string }[];
    }[];
    imagen: string | null;
    imagenes?: {
        url: string;
        alternativeText?: string;
        caption?: string;
        width?: number;
        height?: number;
        mime?: string;
    }[];
    modulos?: Modulo[]; // ✅ Agregado
}
