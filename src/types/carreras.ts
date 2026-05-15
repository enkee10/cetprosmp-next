import type { Modulo, RichTextBlock } from './modulos';

export interface Carrera {
    id: number;
    titulo: string;
    tituloComercial: string;
    slug: string; // Slug amigable para la URL
    codigo: string;
    duracion: number;
    imagen: string | null;
    imagenes?: (string | { url?: string | null })[];
    descripcion2?: RichTextBlock[];
    modulos?: Modulo[]; // ✅ Agregado
}
