import type { Carrera } from './carreras';
//import type { Modulo } from './modulos';

export interface Especialidad {
    id: number;
    titulo: string;
    tituloComercial: string;
    slug: string; // 👈 Campo nuevo
    imagen: string | null;
    descripcion2?: {
        type: string;
        children: { text: string }[];
    }[];
    imagenes?: {
        url: string;
        alternativeText?: string;
        caption?: string;
        width?: number;
        height?: number;
        mime?: string;
    }[];
    carreras?: Carrera[];
}
