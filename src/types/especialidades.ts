import type { Carrera } from './carreras';

export interface RichTextBlock {
    type: string;
    children?: { text?: string; [key: string]: unknown }[];
    [key: string]: unknown;
}

export interface Especialidad {
    id: number;
    titulo: string;
    tituloComercial: string;
    slug: string;
    imagen: string | null;
    imagenes?: Array<string | { url?: string | null } | null>;
    descripcion2?: RichTextBlock[];
    carreras?: Carrera[];
}
