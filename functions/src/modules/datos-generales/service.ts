import { dataConnect } from "../core/dataConnectCore.js";
import { DataConnectDatoGeneral, DataConnectDatoGeneralInput } from "../core/types.js";
import {
  INSERT_DATO_GENERAL_MUTATION,
  UPDATE_DATO_GENERAL_MUTATION,
} from "../../dataconnectOperations.js";

export const DATO_GENERAL_SINGLETON_ID = 1;

const CACHE_TTL_MS = 5 * 60 * 1000;

export const DATO_GENERAL_FIELDS = `
  id
  nombreInstitucion
  logoUrl
  codigoModular
  tipoGestion
  departamento
  provincia
  distrito
  dre
  direccion
  telefono1
  telefono2
  correo
  paginaWeb
  facebook
  youtube
  twitter
  instagram
  tiktok
  ruc
  rd
`;

const GET_DATO_GENERAL_SINGLETON_QUERY = `
  query GetDatoGeneralSingletonManual($id: Int!) {
    datoGeneral(id: $id) {
      ${DATO_GENERAL_FIELDS}
    }
  }
`;

export const DATO_GENERAL_FALLBACK: DataConnectDatoGeneral = {
  id: DATO_GENERAL_SINGLETON_ID,
  nombreInstitucion: 'CETPRO "San Martin de Porres"',
  logoUrl: null,
  codigoModular: null,
  tipoGestion: null,
  departamento: null,
  provincia: null,
  distrito: null,
  dre: null,
  direccion: "Jiron Santa Clorinda 971 Urb. Palao SMP",
  telefono1: "5341588",
  telefono2: "5346663",
  correo: "cetprosanmartindeporres@cetprosmp.edu.pe",
  paginaWeb: "cetprosmp.edu.pe",
  facebook: "https://www.facebook.com/cetprosanmartindeporres1/",
  youtube: "https://www.youtube.com/@enriquerafaelpalominohorna3697",
  twitter: "https://x.com/enkee032",
  instagram: "https://www.instagram.com/cetpro.smp/",
  tiktok: "https://www.tiktok.com/@cetpro.sanmartindeporres",
  ruc: "20610635939",
  rd: "R.D. N 1839 - 05 - DRELM",
};

let cachedDatoGeneral: DataConnectDatoGeneral | null = null;
let cachedAt = 0;

function fallbackInput(): DataConnectDatoGeneralInput {
  const data: DataConnectDatoGeneralInput = {
    nombreInstitucion: DATO_GENERAL_FALLBACK.nombreInstitucion,
    logoUrl: DATO_GENERAL_FALLBACK.logoUrl,
    codigoModular: DATO_GENERAL_FALLBACK.codigoModular,
    tipoGestion: DATO_GENERAL_FALLBACK.tipoGestion,
    departamento: DATO_GENERAL_FALLBACK.departamento,
    provincia: DATO_GENERAL_FALLBACK.provincia,
    distrito: DATO_GENERAL_FALLBACK.distrito,
    dre: DATO_GENERAL_FALLBACK.dre,
    direccion: DATO_GENERAL_FALLBACK.direccion,
    telefono1: DATO_GENERAL_FALLBACK.telefono1,
    telefono2: DATO_GENERAL_FALLBACK.telefono2,
    correo: DATO_GENERAL_FALLBACK.correo,
    paginaWeb: DATO_GENERAL_FALLBACK.paginaWeb,
    facebook: DATO_GENERAL_FALLBACK.facebook,
    youtube: DATO_GENERAL_FALLBACK.youtube,
    twitter: DATO_GENERAL_FALLBACK.twitter,
    instagram: DATO_GENERAL_FALLBACK.instagram,
    tiktok: DATO_GENERAL_FALLBACK.tiktok,
    ruc: DATO_GENERAL_FALLBACK.ruc,
    rd: DATO_GENERAL_FALLBACK.rd,
  };
  return { id: DATO_GENERAL_SINGLETON_ID, ...data };
}

export function invalidateDatosGeneralesCache() {
  cachedDatoGeneral = null;
  cachedAt = 0;
}

async function fetchDatoGeneralSingleton() {
  const response = await dataConnect.executeGraphql<
    { datoGeneral: DataConnectDatoGeneral | null },
    { id: number }
  >(GET_DATO_GENERAL_SINGLETON_QUERY, { variables: { id: DATO_GENERAL_SINGLETON_ID } });

  return response.data.datoGeneral ?? null;
}

async function createDatoGeneralSingleton() {
  await dataConnect.executeGraphql<
    { datoGeneral_insert: unknown },
    { data: DataConnectDatoGeneralInput }
  >(INSERT_DATO_GENERAL_MUTATION, { variables: { data: fallbackInput() } });
}

export async function getDatosGeneralesGlobales(options?: { forceRefresh?: boolean }) {
  const now = Date.now();
  if (
    !options?.forceRefresh &&
    cachedDatoGeneral &&
    now - cachedAt < CACHE_TTL_MS
  ) {
    return cachedDatoGeneral;
  }

  let datoGeneral = await fetchDatoGeneralSingleton();
  if (!datoGeneral) {
    try {
      await createDatoGeneralSingleton();
    } catch (error) {
      console.warn("No se pudo crear el singleton de datos generales; se intentara releer.", error);
    }

    datoGeneral = await fetchDatoGeneralSingleton();
  }

  cachedDatoGeneral = datoGeneral ?? DATO_GENERAL_FALLBACK;
  cachedAt = now;

  return cachedDatoGeneral;
}

export async function saveDatosGeneralesGlobales(data: DataConnectDatoGeneralInput) {
  const existing = await getDatosGeneralesGlobales({ forceRefresh: true });
  const payload = { ...data };
  delete payload.id;

  if (existing?.id === DATO_GENERAL_SINGLETON_ID) {
    await dataConnect.executeGraphql<
      { datoGeneral_update: unknown },
      { id: number; data: DataConnectDatoGeneralInput }
    >(UPDATE_DATO_GENERAL_MUTATION, {
      variables: { id: DATO_GENERAL_SINGLETON_ID, data: payload },
    });
  } else {
    await createDatoGeneralSingleton();
    await dataConnect.executeGraphql<
      { datoGeneral_update: unknown },
      { id: number; data: DataConnectDatoGeneralInput }
    >(UPDATE_DATO_GENERAL_MUTATION, {
      variables: { id: DATO_GENERAL_SINGLETON_ID, data: payload },
    });
  }

  invalidateDatosGeneralesCache();
  return getDatosGeneralesGlobales({ forceRefresh: true });
}
