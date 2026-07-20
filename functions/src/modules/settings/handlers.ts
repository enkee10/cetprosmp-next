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
const USE_AVATARS_IN_CERTIFICADOS_TITULOS_KEY =
  "general.usarAvataresEnCertificadosTitulos";
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
  },
  formularioMatricula: {
    aceptaRespuestas: false,
    semestreId: null as number | null,
  },
  visualizaciones: {
    usarRecorteFotografiaComoAvatarEstudiantes: false,
  },
};

type SettingDefinition = {
  section: string;
  label: string;
  valueType: "boolean" | "integer";
  defaultValue: boolean | number | null;
};

const SETTING_DEFINITIONS: Record<string, SettingDefinition> = {
  [USE_AVATARS_IN_CERTIFICADOS_TITULOS_KEY]: {
    section: "general",
    label: "Usar avatares en certificados y titulos",
    valueType: "boolean",
    defaultValue: false,
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
      updatedAt
    }
  }
`;

function buildSettingsResponse(items: DataConnectAppSetting[]) {
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
  });

  return settings;
}

async function upsertSetting(
  settingKey: string,
  value: boolean | number | null,
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
  const formularioMatriculaAceptaRespuestas = Boolean(
    formularioMatricula?.aceptaRespuestas,
  );
  const semestreIdRaw = Number(formularioMatricula?.semestreId);
  const semestreId = Number.isFinite(semestreIdRaw) && semestreIdRaw > 0 ? semestreIdRaw : null;
  const usarRecorteFotografiaComoAvatarEstudiantes = Boolean(
    visualizaciones?.usarRecorteFotografiaComoAvatarEstudiantes,
  );

  try {
    await upsertSetting(
      USE_AVATARS_IN_CERTIFICADOS_TITULOS_KEY,
      usarAvataresEnCertificadosTitulos,
    );
    await upsertSetting(
      MATRICULA_FORM_ACCEPTS_RESPONSES_KEY,
      formularioMatriculaAceptaRespuestas,
    );
    await upsertSetting(
      MATRICULA_FORM_SEMESTRE_ID_KEY,
      semestreId,
    );
    await upsertSetting(
      USE_CROPPED_PHOTO_AS_STUDENT_AVATAR_KEY,
      usarRecorteFotografiaComoAvatarEstudiantes,
    );

    return {
      settings: {
        general: {
          usarAvataresEnCertificadosTitulos,
          formularioMatriculaAceptaRespuestas: formularioMatriculaAceptaRespuestas,
        },
        formularioMatricula: {
          aceptaRespuestas: formularioMatriculaAceptaRespuestas,
          semestreId,
        },
        visualizaciones: {
          usarRecorteFotografiaComoAvatarEstudiantes,
        },
      },
    };
  } catch (error) {
    if (error instanceof https.HttpsError) throw error;
    console.error("Error in saveAppSettings:", error);
    throw new https.HttpsError("internal", "No se pudieron guardar las configuraciones.");
  }
});
