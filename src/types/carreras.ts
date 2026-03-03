import type { Modulo } from './modulos';

export interface Carrera {
    id: number;
    titulo: string;
    tituloComercial: string;
    slug: string; // Slug amigable para la URL
    codigo: string;
    duracion: number;
    imagen: string | null;
    modulos?: Modulo[]; // ✅ Agregado
}
