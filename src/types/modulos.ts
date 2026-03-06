export interface RichTextBlock {
  type: string;
  [key: string]: any; // Allows for other properties like 'children', 'level', etc.
}

export interface Modulo {
  id: number;
  titulo: string;
  tituloComercial: string;
  slug: string;
  orden: number;
  horas: number;
  creditos: number;
  metas: number;
  activo: boolean;
  imagen: string | null;
  imagenes: { url: string }[];
  videosYoutube: { url: string }[];
  descripcion2?: RichTextBlock[]; // Optional array of RichText blocks
}

export interface Carrera {
  id: number;
  tituloComercial: string;
  slug: string;
  codigo: string;
  modulos: Modulo[];
}
