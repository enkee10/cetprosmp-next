import datoGeneralFallbackJson from '@/../public/data/dato-general.json';

export interface DatosGenerales {
  id: number;
  nombreInstitucion: string | null;
  logoUrl?: string | null;
  codigoModular?: string | null;
  tipoGestion?: string | null;
  departamento?: string | null;
  provincia?: string | null;
  distrito?: string | null;
  dre?: string | null;
  direccion: string | null;
  telefono1: string | null;
  telefono2: string | null;
  correo: string | null;
  paginaWeb: string | null;
  facebook: string | null;
  youtube: string | null;
  twitter: string | null;
  instagram: string | null;
  tiktok: string | null;
  ruc: string | null;
  rd: string | null;
}

export type DatosGeneralesFormData = Omit<DatosGenerales, 'id'>;

export const DATO_GENERAL_SINGLETON_ID = 1;

export const datosGeneralesFallback: DatosGenerales = {
  id: DATO_GENERAL_SINGLETON_ID,
  nombreInstitucion: datoGeneralFallbackJson.nombreInstitucion || '',
  logoUrl: datoGeneralFallbackJson.logo?.url || null,
  codigoModular: null,
  tipoGestion: null,
  departamento: null,
  provincia: null,
  distrito: null,
  dre: null,
  direccion: datoGeneralFallbackJson.direccion || '',
  telefono1: datoGeneralFallbackJson.telefono1 || '',
  telefono2: datoGeneralFallbackJson.telefono2 || '',
  correo: datoGeneralFallbackJson.correo || '',
  paginaWeb: datoGeneralFallbackJson.paginaWeb || '',
  facebook: datoGeneralFallbackJson.facebook || '',
  youtube: datoGeneralFallbackJson.youtube || '',
  twitter: datoGeneralFallbackJson.twitter || '',
  instagram: datoGeneralFallbackJson.instagram || '',
  tiktok: datoGeneralFallbackJson.tiktok || '',
  ruc: datoGeneralFallbackJson.ruc || '',
  rd: datoGeneralFallbackJson.rd || '',
};

export const emptyDatosGeneralesForm: DatosGeneralesFormData = {
  nombreInstitucion: '',
  logoUrl: '',
  codigoModular: '',
  tipoGestion: '',
  departamento: '',
  provincia: '',
  distrito: '',
  dre: '',
  direccion: '',
  telefono1: '',
  telefono2: '',
  correo: '',
  paginaWeb: '',
  facebook: '',
  youtube: '',
  twitter: '',
  instagram: '',
  tiktok: '',
  ruc: '',
  rd: '',
};

export function toDatosGeneralesFormData(datoGeneral: Partial<DatosGenerales> | null | undefined): DatosGeneralesFormData {
  return {
    nombreInstitucion: datoGeneral?.nombreInstitucion || '',
    logoUrl: datoGeneral?.logoUrl || '',
    codigoModular: datoGeneral?.codigoModular || '',
    tipoGestion: datoGeneral?.tipoGestion || '',
    departamento: datoGeneral?.departamento || '',
    provincia: datoGeneral?.provincia || '',
    distrito: datoGeneral?.distrito || '',
    dre: datoGeneral?.dre || '',
    direccion: datoGeneral?.direccion || '',
    telefono1: datoGeneral?.telefono1 || '',
    telefono2: datoGeneral?.telefono2 || '',
    correo: datoGeneral?.correo || '',
    paginaWeb: datoGeneral?.paginaWeb || '',
    facebook: datoGeneral?.facebook || '',
    youtube: datoGeneral?.youtube || '',
    twitter: datoGeneral?.twitter || '',
    instagram: datoGeneral?.instagram || '',
    tiktok: datoGeneral?.tiktok || '',
    ruc: datoGeneral?.ruc || '',
    rd: datoGeneral?.rd || '',
  };
}

export function mergeDatosGenerales(datoGeneral: Partial<DatosGenerales> | null | undefined): DatosGenerales {
  return {
    ...datosGeneralesFallback,
    ...datoGeneral,
    id: datoGeneral?.id ?? DATO_GENERAL_SINGLETON_ID,
  };
}
