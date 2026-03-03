import type { Carrera } from './carreras';

export interface Especialidad {
    id: number;
    titulo: string;
    tituloComercial: string;
    slug: string; // 👈 Campo nuevo
    imagen: string | null;
    carreras?: Carrera[];
}
