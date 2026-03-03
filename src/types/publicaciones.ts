export interface Publicacion {
    id: number;
    titulo: string;
    slug: string;
    tipo: 'noticia' | 'evento' | 'comunicado' | string;
    descripcionCorta?: string;
    contenido?: string;
    fechaPublicacion?: string;
    fechaEventoInicio?: string | null;
    fechaEventoFin?: string | null;
    ubicacion?: string;
    destacado?: boolean;
    imagenPrincipal?: string | null;
}
