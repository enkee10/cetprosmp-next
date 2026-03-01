export interface Modulo {
    id: number;
    titulo: string;
    tituloComercial: string;
    slug: string;
    orden: number;
    horas: number;
    creditos: number;
    metas: number;
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
    videosYoutube?: {
        url: string;
    }[];
}
