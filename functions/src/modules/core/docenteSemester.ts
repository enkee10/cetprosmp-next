import { https } from "firebase-functions/v1";
import { dataConnect } from "./dataConnectCore.js";
import { getDocenteNombreForGrupoModulo } from "./grupoModuloNombre.js";
import { getRequesterRoleId, requireAuthenticated, requirePermissions } from "./permissions.js";

export const CURRENT_SEMESTRE_QUERY = `
  query CurrentSemestreSetting {
    appSettings(where: { settingKey: { in: ["general.semestreActualId", "formularioMatricula.semestreId"] } }, limit: 2) {
      settingKey intValue
    }
  }
`;

export async function getConfiguredCurrentSemestreId(): Promise<number | null> {
  const response = await dataConnect.executeGraphql<{
    appSettings: Array<{ settingKey: string; intValue?: number | null }>;
  }, Record<string, never>>(CURRENT_SEMESTRE_QUERY);
  for (const key of ["general.semestreActualId", "formularioMatricula.semestreId"]) {
    const id = Number(response.data.appSettings?.find((item) => item.settingKey === key)?.intValue);
    if (Number.isInteger(id) && id > 0) return id;
  }
  return null;
}

type DocentePersonal = {
  id: number;
  displayName?: string | null;
  user?: {
    username?: string | null; nombre?: string | null; apellidoPaterno?: string | null;
    apellidoMaterno?: string | null; email?: string | null; correoInstitucional?: string | null;
  } | null;
  monitoreadoPor?: DocentePersonal | null;
};

export type CurrentDocenteModulo = {
  id: number;
  nombre?: string | null;
  orden?: number | null;
  grupoId: number;
  moduloId: number;
  docenteNombre?: string;
  grupo: {
    id: number;
    nombreDisplay?: string | null;
    turnoNombre?: string | null;
    personalId?: number | null;
    semestreId?: number | null;
    semestre?: {
      id: number; titulo?: string | null; inicio?: string | null; fin?: string | null;
      coordinador1?: DocentePersonal | null;
    } | null;
    personal?: DocentePersonal | null;
  };
  modulo?: { titulo?: string | null; tituloComercial?: string | null } | null;
};

// Filter in SQL by the authenticated teacher and configured semester, before transferring rows.
export const CURRENT_DOCENTE_MODULOS_QUERY = `
  query CurrentDocenteModulos($uid: String!, $semestreId: Int!) {
    semestre(id: $semestreId) { id titulo inicio fin }
    grupoModulos(
      where: { grupo: {
        semestreId: { eq: $semestreId }, archivado: { ne: true },
        personal: { user: { documentId: { eq: $uid } } }
      } }, limit: 3000, orderBy: [{ nombre: ASC }, { id: ASC }]
    ) {
      id nombre orden grupoId moduloId
      grupo {
        id nombreDisplay turnoNombre personalId semestreId
        semestre { id titulo inicio fin coordinador1 {
          id displayName user { username nombre apellidoPaterno apellidoMaterno email correoInstitucional }
        } }
        personal {
          id displayName user { username nombre apellidoPaterno apellidoMaterno email correoInstitucional }
          monitoreadoPor { id displayName user { username nombre apellidoPaterno apellidoMaterno email correoInstitucional } }
        }
      }
      modulo { titulo tituloComercial }
    }
  }
`;

export async function loadCurrentDocenteModulos(uid: string) {
  const semestreId = await getConfiguredCurrentSemestreId();
  if (!semestreId) return { modulos: [] as CurrentDocenteModulo[], semestre: null, semestreTitulo: null };
  const response = await dataConnect.executeGraphql<{
    semestre: { id: number; titulo?: string | null; inicio?: string | null; fin?: string | null } | null;
    grupoModulos: CurrentDocenteModulo[];
  }, { uid: string; semestreId: number }>(CURRENT_DOCENTE_MODULOS_QUERY, { variables: { uid, semestreId } });
  return {
    modulos: (response.data.grupoModulos ?? []).map((item) => ({
      ...item, docenteNombre: getDocenteNombreForGrupoModulo(item.grupo.personal ?? null),
    })),
    semestre: response.data.semestre,
    semestreTitulo: response.data.semestre?.titulo ?? null,
  };
}

export const listDocenteMenuModulos = https.onCall(async (data, context) => {
  requireAuthenticated(context);
  if (getRequesterRoleId(context) !== 4) {
    throw new https.HttpsError("permission-denied", "Esta vista es solo para docentes.");
  }
  const entities = [
    data?.matriculas ? "matriculas" : null,
    data?.notas ? "registro-auxiliar" : null,
    data?.estructura ? "estructura-academica" : null,
  ].filter((entity): entity is string => Boolean(entity));
  if (!entities.length) throw new https.HttpsError("invalid-argument", "Selecciona una vista del menu.");
  await requirePermissions(context, entities, "view");
  return loadCurrentDocenteModulos(context.auth!.uid);
});
