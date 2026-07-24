import { https } from "firebase-functions/v1";
import {
  INSERT_APP_SETTING_MUTATION,
  UPDATE_APP_SETTING_MUTATION,
} from "../../dataconnectOperations.js";
import { dataConnect } from "../core/dataConnectCore.js";
import { requireAuthenticated, requirePermission } from "../core/permissions.js";
import { DataConnectAppSetting, DataConnectAppSettingInput } from "../core/types.js";

const USE_CROPPED_PHOTO_AS_STUDENT_AVATAR_KEY =
  "visualizaciones.usarRecorteFotografiaComoAvatarEstudiantes";
const USE_GENERATIVE_AVATAR_KEY =
  "visualizaciones.usarGeneradorImagenesAvatar";
const AVATAR_GENERATION_MODEL_KEY =
  "visualizaciones.modeloGeneradorImagenesAvatar";
const SHOW_STUDENT_AVATARS_IN_LISTS_KEY =
  "visualizaciones.mostrarImagenAvatarEstudiantesEnListas";
const USE_AVATARS_IN_CERTIFICADOS_TITULOS_KEY =
  "general.usarAvataresEnCertificadosTitulos";
const USE_DNI_RECOGNITION_KEY =
  "general.activarReconocimientoDni";
const MATRICULA_FORM_DNI_RECOGNITION_KEY =
  "formularioMatricula.activarReconocimientoDni";
const CURRENT_SEMESTRE_ID_KEY =
  "general.semestreActualId";
const QUERY_SEMESTRES_IDS_KEY =
  "general.semestresConsultaIds";
const MATRICULA_FORM_ACCEPTS_RESPONSES_KEY =
  "formularioMatricula.aceptaRespuestas";
const LEGACY_MATRICULA_FORM_ACCEPTS_RESPONSES_KEY =
  "general.formularioMatriculaAceptaRespuestas";
const MATRICULA_FORM_SEMESTRE_ID_KEY =
  "formularioMatricula.semestreId";

const DEFAULT_SETTINGS = {
  general: {
    usarAvataresEnCertificadosTitulos: false,
    formularioMatriculaAceptaRespuestas: false,
    activarReconocimientoDni: true,
    semestreActualId: null as number | null,
    semestresConsultaIds: [] as number[],
  },
  formularioMatricula: {
    aceptaRespuestas: false,
    semestreId: null as number | null,
    activarReconocimientoDni: true,
  },
  visualizaciones: {
    usarRecorteFotografiaComoAvatarEstudiantes: false,
    mostrarImagenAvatarEstudiantesEnListas: true,
    usarGeneradorImagenesAvatar: true,
    modeloGeneradorImagenesAvatar: "gemini-3.1-flash-image-512",
  },
};

type SettingDefinition = {
  section: string;
  label: string;
  valueType: "boolean" | "integer" | "string";
  defaultValue: boolean | number | string | null;
};

const AVATAR_GENERATION_MODEL_OPTIONS = new Set([
  "gemini-3.1-flash-lite-image-1024",
  "gemini-3.1-flash-image-512",
]);

const SETTING_DEFINITIONS: Record<string, SettingDefinition> = {
  [USE_AVATARS_IN_CERTIFICADOS_TITULOS_KEY]: {
    section: "general",
    label: "Usar avatares en certificados y titulos",
    valueType: "boolean",
    defaultValue: false,
  },
  [USE_DNI_RECOGNITION_KEY]: {
    section: "formularioMatricula",
    label: "Activar reconocimiento de DNI",
    valueType: "boolean",
    defaultValue: true,
  },
  [MATRICULA_FORM_DNI_RECOGNITION_KEY]: {
    section: "formularioMatricula",
    label: "Activar reconocimiento de DNI",
    valueType: "boolean",
    defaultValue: true,
  },
  [CURRENT_SEMESTRE_ID_KEY]: {
    section: "general",
    label: "Semestre actual",
    valueType: "integer",
    defaultValue: null,
  },
  [QUERY_SEMESTRES_IDS_KEY]: {
    section: "general",
    label: "Usar solo los siguientes semestres para devolver datos",
    valueType: "string",
    defaultValue: "[]",
  },
  [MATRICULA_FORM_ACCEPTS_RESPONSES_KEY]: {
    section: "formularioMatricula",
    label: "El formulario acepta respuestas",
    valueType: "boolean",
    defaultValue: false,
  },
  [LEGACY_MATRICULA_FORM_ACCEPTS_RESPONSES_KEY]: {
    section: "general",
    label: "El formulario acepta respuestas",
    valueType: "boolean",
    defaultValue: false,
  },
  [MATRICULA_FORM_SEMESTRE_ID_KEY]: {
    section: "formularioMatricula",
    label: "Definir semestre de matricula",
    valueType: "integer",
    defaultValue: null,
  },
  [USE_CROPPED_PHOTO_AS_STUDENT_AVATAR_KEY]: {
    section: "visualizaciones",
    label: "Usar la foto imagen recortada como el avatar para Estudiantes",
    valueType: "boolean",
    defaultValue: false,
  },
  [USE_GENERATIVE_AVATAR_KEY]: {
    section: "visualizaciones",
    label: "Usar generador de imagenes IA para avatar",
    valueType: "boolean",
    defaultValue: true,
  },
  [AVATAR_GENERATION_MODEL_KEY]: {
    section: "visualizaciones",
    label: "Modelo de generacion de avatar",
    valueType: "string",
    defaultValue: "gemini-3.1-flash-image-512",
  },
  [SHOW_STUDENT_AVATARS_IN_LISTS_KEY]: {
    section: "visualizaciones",
    label: "Mostrar imagen de avatar de estudiantes en listas",
    valueType: "boolean",
    defaultValue: true,
  },
};

const LIST_APP_SETTINGS_QUERY = `
  query ListAppSettingsManual {
    appSettings(limit: 500) {
      id
      settingKey
      section
      label
      boolValue
      intValue
      stringValue
      updatedAt
    }
  }
`;

const GET_APP_SETTING_BY_KEY_QUERY = `
  query GetAppSettingByKeyManual($settingKey: String!) {
    appSettings(where: { settingKey: { eq: $settingKey } }, limit: 1) {
      id
      settingKey
      section
      label
      boolValue
      intValue
      stringValue
      updatedAt
    }
  }
`;

const LIST_SETTINGS_SEMESTRES_CON_GRUPOS_QUERY = `
  query ListSettingsSemestresConGrupos {
    semestres(limit: 500) {
      id
      titulo
      inicio
      fin
      archivado
      anio {
        id
        nombre
        titulo
      }
    }
    grupos(limit: 10000) {
      id
      semestreId
      archivado
    }
  }
`;

type SettingsSemestreOption = {
  id: number;
  titulo?: string | null;
  nombre?: string | null;
  inicio?: string | null;
  fin?: string | null;
  archivado?: boolean | null;
  grupoCount?: number | null;
  anio?: {
    id?: number | null;
    nombre?: string | null;
    titulo?: string | null;
  } | null;
  anioTitulo?: string | null;
};

const sortSettingsSemestres = (items: SettingsSemestreOption[]) =>
  items.slice().sort((a, b) =>
    String(a.anio?.nombre ?? a.anio?.titulo ?? "").localeCompare(
      String(b.anio?.nombre ?? b.anio?.titulo ?? ""),
      "es",
      { numeric: true },
    ) ||
    String(a.titulo ?? a.nombre ?? "").localeCompare(String(b.titulo ?? b.nombre ?? ""), "es", { numeric: true }) ||
    a.id - b.id,
  );

const buildGroupCountBySemestre = (
  grupos: Array<{ semestreId?: number | null; archivado?: boolean | null }>,
) => {
  const countBySemestre = new Map<number, number>();
  grupos.forEach((grupo) => {
    if (grupo.archivado || !grupo.semestreId) return;
    countBySemestre.set(grupo.semestreId, (countBySemestre.get(grupo.semestreId) ?? 0) + 1);
  });
  return countBySemestre;
};

function buildSettingsResponse(items: DataConnectAppSetting[]) {
  const hasMatriculaRecognitionSetting = items.some(
    (item) => item.settingKey === MATRICULA_FORM_DNI_RECOGNITION_KEY,
  );
  const settings = {
    general: {
      ...DEFAULT_SETTINGS.general,
    },
    formularioMatricula: {
      ...DEFAULT_SETTINGS.formularioMatricula,
    },
    visualizaciones: {
      ...DEFAULT_SETTINGS.visualizaciones,
    },
  };

  items.forEach((item) => {
    if (item.settingKey === USE_AVATARS_IN_CERTIFICADOS_TITULOS_KEY) {
      settings.general.usarAvataresEnCertificadosTitulos = Boolean(item.boolValue);
    }
    if (
      item.settingKey === MATRICULA_FORM_DNI_RECOGNITION_KEY
      || (item.settingKey === USE_DNI_RECOGNITION_KEY && !hasMatriculaRecognitionSetting)
    ) {
      settings.general.activarReconocimientoDni = Boolean(item.boolValue);
      settings.formularioMatricula.activarReconocimientoDni = Boolean(item.boolValue);
    }
    if (item.settingKey === CURRENT_SEMESTRE_ID_KEY) {
      const intValue = Number(item.intValue);
      settings.general.semestreActualId = Number.isFinite(intValue) && intValue > 0 ? intValue : null;
    }
    if (item.settingKey === QUERY_SEMESTRES_IDS_KEY) {
      try {
        const parsed = JSON.parse(String(item.stringValue || "[]"));
        settings.general.semestresConsultaIds = Array.isArray(parsed)
          ? parsed.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0)
          : [];
      } catch {
        settings.general.semestresConsultaIds = [];
      }
    }
    if (item.settingKey === MATRICULA_FORM_ACCEPTS_RESPONSES_KEY) {
      settings.formularioMatricula.aceptaRespuestas = Boolean(item.boolValue);
      settings.general.formularioMatriculaAceptaRespuestas = Boolean(item.boolValue);
    }
    if (
      item.settingKey === LEGACY_MATRICULA_FORM_ACCEPTS_RESPONSES_KEY
      && !items.some((setting) => setting.settingKey === MATRICULA_FORM_ACCEPTS_RESPONSES_KEY)
    ) {
      settings.formularioMatricula.aceptaRespuestas = Boolean(item.boolValue);
      settings.general.formularioMatriculaAceptaRespuestas = Boolean(item.boolValue);
    }
    if (item.settingKey === MATRICULA_FORM_SEMESTRE_ID_KEY) {
      const intValue = Number(item.intValue);
      settings.formularioMatricula.semestreId = Number.isFinite(intValue) && intValue > 0 ? intValue : null;
    }
    if (item.settingKey === USE_CROPPED_PHOTO_AS_STUDENT_AVATAR_KEY) {
      settings.visualizaciones.usarRecorteFotografiaComoAvatarEstudiantes = Boolean(item.boolValue);
    }
    if (item.settingKey === USE_GENERATIVE_AVATAR_KEY) {
      settings.visualizaciones.usarGeneradorImagenesAvatar = Boolean(item.boolValue);
    }
    if (item.settingKey === AVATAR_GENERATION_MODEL_KEY) {
      const model = String(item.stringValue || "");
      settings.visualizaciones.modeloGeneradorImagenesAvatar = AVATAR_GENERATION_MODEL_OPTIONS.has(model)
        ? model
        : DEFAULT_SETTINGS.visualizaciones.modeloGeneradorImagenesAvatar;
    }
    if (item.settingKey === SHOW_STUDENT_AVATARS_IN_LISTS_KEY) {
      settings.visualizaciones.mostrarImagenAvatarEstudiantesEnListas = item.boolValue !== false;
    }
  });

  if (!settings.general.semestreActualId && settings.formularioMatricula.semestreId) {
    settings.general.semestreActualId = settings.formularioMatricula.semestreId;
  }
  settings.formularioMatricula.semestreId = settings.general.semestreActualId;
  settings.formularioMatricula.activarReconocimientoDni = settings.general.activarReconocimientoDni;

  if (!settings.general.activarReconocimientoDni) {
    settings.visualizaciones.usarGeneradorImagenesAvatar = false;
  }

  return settings;
}

async function upsertSetting(
  settingKey: string,
  value: boolean | number | string | null,
) {
  const definition = SETTING_DEFINITIONS[settingKey];
  if (!definition) {
    throw new https.HttpsError("invalid-argument", "Configuracion no soportada.");
  }

  const existing = await dataConnect.executeGraphql<
    { appSettings: DataConnectAppSetting[] },
    { settingKey: string }
  >(
    GET_APP_SETTING_BY_KEY_QUERY,
    { variables: { settingKey } },
  );
  const current = existing.data.appSettings?.[0] ?? null;
  const payload: DataConnectAppSettingInput = {
    section: definition.section,
    label: definition.label,
    boolValue: definition.valueType === "boolean" ? Boolean(value) : undefined,
    intValue: definition.valueType === "integer" && Number(value) > 0 ? Number(value) : null,
    stringValue: definition.valueType === "string" ? String(value || definition.defaultValue || "") : null,
    updatedAt: new Date().toISOString(),
  };

  if (current?.id) {
    await dataConnect.executeGraphql<
      { appSetting_update: unknown },
      { id: number; data: DataConnectAppSettingInput }
    >(
      UPDATE_APP_SETTING_MUTATION,
      { variables: { id: current.id, data: payload } },
    );
    return;
  }

  await dataConnect.executeGraphql<
    { appSetting_insert: unknown },
    { data: DataConnectAppSettingInput }
  >(
    INSERT_APP_SETTING_MUTATION,
    { variables: { data: { ...payload, settingKey } } },
  );
}

export async function getConfiguredSemestreConsultaIds() {
  const response = await dataConnect.executeGraphql<
    { appSettings: Array<{ id: number; stringValue?: string | null }> },
    { settingKey: string }
  >(
    GET_APP_SETTING_BY_KEY_QUERY,
    { variables: { settingKey: QUERY_SEMESTRES_IDS_KEY } },
  );
  const raw = response.data.appSettings?.[0]?.stringValue;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0)
      : [];
  } catch {
    return [];
  }
}

export const getAppSettings = https.onCall(async (_data, context) => {
  requireAuthenticated(context);

  try {
    const response = await dataConnect.executeGraphql<
      { appSettings: DataConnectAppSetting[] },
      Record<string, never>
    >(LIST_APP_SETTINGS_QUERY);

    return { settings: buildSettingsResponse(response.data.appSettings ?? []) };
  } catch (error) {
    console.error("Error in getAppSettings:", error);
    throw new https.HttpsError("internal", "No se pudieron cargar las configuraciones.");
  }
});

export const saveAppSettings = https.onCall(async (data, context) => {
  await requirePermission(context, "settings", "edit");

  const general = data?.general as Record<string, unknown> | undefined;
  const formularioMatricula = data?.formularioMatricula as Record<string, unknown> | undefined;
  const visualizaciones = data?.visualizaciones as Record<string, unknown> | undefined;
  const usarAvataresEnCertificadosTitulos = Boolean(
    general?.usarAvataresEnCertificadosTitulos,
  );
  const activarReconocimientoDni =
    (formularioMatricula?.activarReconocimientoDni ?? general?.activarReconocimientoDni) !== false;
  const formularioMatriculaAceptaRespuestas = Boolean(
    formularioMatricula?.aceptaRespuestas,
  );
  const semestreActualIdRaw = Number(general?.semestreActualId ?? formularioMatricula?.semestreId);
  const semestreActualId = Number.isFinite(semestreActualIdRaw) && semestreActualIdRaw > 0 ? semestreActualIdRaw : null;
  const semestresConsultaIdsRaw = Array.isArray(general?.semestresConsultaIds)
    ? general?.semestresConsultaIds
    : [];
  const semestresConsultaIds = semestresConsultaIdsRaw
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id) && id > 0);
  const usarRecorteFotografiaComoAvatarEstudiantes = Boolean(
    visualizaciones?.usarRecorteFotografiaComoAvatarEstudiantes,
  );
  const usarGeneradorImagenesAvatar = activarReconocimientoDni
    ? Boolean(visualizaciones?.usarGeneradorImagenesAvatar)
    : false;
  const requestedAvatarModel = String(visualizaciones?.modeloGeneradorImagenesAvatar || "");
  const modeloGeneradorImagenesAvatar = AVATAR_GENERATION_MODEL_OPTIONS.has(requestedAvatarModel)
    ? requestedAvatarModel
    : DEFAULT_SETTINGS.visualizaciones.modeloGeneradorImagenesAvatar;
  const mostrarImagenAvatarEstudiantesEnListas =
    visualizaciones?.mostrarImagenAvatarEstudiantesEnListas !== false;
  const normalizedSemestresConsultaIds = semestreActualId
    ? Array.from(new Set([semestreActualId, ...semestresConsultaIds]))
    : semestresConsultaIds;

  try {
    await upsertSetting(
      USE_AVATARS_IN_CERTIFICADOS_TITULOS_KEY,
      usarAvataresEnCertificadosTitulos,
    );
    await upsertSetting(
      MATRICULA_FORM_DNI_RECOGNITION_KEY,
      activarReconocimientoDni,
    );
    await upsertSetting(
      USE_DNI_RECOGNITION_KEY,
      activarReconocimientoDni,
    );
    await upsertSetting(
      CURRENT_SEMESTRE_ID_KEY,
      semestreActualId,
    );
    await upsertSetting(
      QUERY_SEMESTRES_IDS_KEY,
      JSON.stringify(normalizedSemestresConsultaIds),
    );
    await upsertSetting(
      MATRICULA_FORM_ACCEPTS_RESPONSES_KEY,
      formularioMatriculaAceptaRespuestas,
    );
    await upsertSetting(
      MATRICULA_FORM_SEMESTRE_ID_KEY,
      semestreActualId,
    );
    await upsertSetting(
      USE_CROPPED_PHOTO_AS_STUDENT_AVATAR_KEY,
      usarRecorteFotografiaComoAvatarEstudiantes,
    );
    await upsertSetting(
      USE_GENERATIVE_AVATAR_KEY,
      usarGeneradorImagenesAvatar,
    );
    await upsertSetting(
      AVATAR_GENERATION_MODEL_KEY,
      modeloGeneradorImagenesAvatar,
    );
    await upsertSetting(
      SHOW_STUDENT_AVATARS_IN_LISTS_KEY,
      mostrarImagenAvatarEstudiantesEnListas,
    );

    return {
      settings: {
        general: {
          usarAvataresEnCertificadosTitulos,
          activarReconocimientoDni,
          formularioMatriculaAceptaRespuestas: formularioMatriculaAceptaRespuestas,
          semestreActualId,
          semestresConsultaIds: normalizedSemestresConsultaIds,
        },
        formularioMatricula: {
          aceptaRespuestas: formularioMatriculaAceptaRespuestas,
          semestreId: semestreActualId,
          activarReconocimientoDni,
        },
        visualizaciones: {
          usarRecorteFotografiaComoAvatarEstudiantes,
          mostrarImagenAvatarEstudiantesEnListas,
          usarGeneradorImagenesAvatar,
          modeloGeneradorImagenesAvatar,
        },
      },
    };
  } catch (error) {
    if (error instanceof https.HttpsError) throw error;
    console.error("Error in saveAppSettings:", error);
    throw new https.HttpsError("internal", "No se pudieron guardar las configuraciones.");
  }
});

export const listSettingsSemestresConGrupos = https.onCall(async (_data, context) => {
  await requirePermission(context, "settings", "view");

  try {
    const response = await dataConnect.executeGraphql<{
      semestres: SettingsSemestreOption[];
      grupos: Array<{ id: number; semestreId?: number | null; archivado?: boolean | null }>;
    }, Record<string, never>>(LIST_SETTINGS_SEMESTRES_CON_GRUPOS_QUERY);
    const groupCountBySemestre = buildGroupCountBySemestre(response.data.grupos ?? []);

    return {
      semestres: sortSettingsSemestres(response.data.semestres ?? []).map((semestre) => ({
        ...semestre,
        anioTitulo: semestre.anio?.nombre ?? semestre.anio?.titulo ?? null,
        grupoCount: groupCountBySemestre.get(semestre.id) ?? 0,
      })),
    };
  } catch (error) {
    console.error("Error in listSettingsSemestresConGrupos:", error);
    throw new https.HttpsError("internal", "No se pudieron cargar los semestres con grupos.");
  }
});
