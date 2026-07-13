import { https } from "firebase-functions/v1";
import {
  INSERT_APP_SETTING_MUTATION,
  UPDATE_APP_SETTING_MUTATION,
} from "../../dataconnectOperations.js";
import { dataConnect } from "../core/dataConnectCore.js";
import { requireAuthenticated, requireSuperUser } from "../core/permissions.js";
import { DataConnectAppSetting, DataConnectAppSettingInput } from "../core/types.js";

const USE_CROPPED_PHOTO_AS_STUDENT_AVATAR_KEY =
  "visualizaciones.usarRecorteFotografiaComoAvatarEstudiantes";

const DEFAULT_SETTINGS = {
  visualizaciones: {
    usarRecorteFotografiaComoAvatarEstudiantes: false,
  },
};

const SETTING_DEFINITIONS: Record<string, { section: string; label: string; defaultValue: boolean }> = {
  [USE_CROPPED_PHOTO_AS_STUDENT_AVATAR_KEY]: {
    section: "visualizaciones",
    label: "Usar la foto imagen recortada como el avatar para Estudiantes",
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
      updatedAt
    }
  }
`;

function buildSettingsResponse(items: DataConnectAppSetting[]) {
  const settings = {
    visualizaciones: {
      ...DEFAULT_SETTINGS.visualizaciones,
    },
  };

  items.forEach((item) => {
    if (item.settingKey === USE_CROPPED_PHOTO_AS_STUDENT_AVATAR_KEY) {
      settings.visualizaciones.usarRecorteFotografiaComoAvatarEstudiantes = Boolean(item.boolValue);
    }
  });

  return settings;
}

async function upsertBooleanSetting(settingKey: string, boolValue: boolean) {
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
    boolValue,
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
  requireSuperUser(context, "guardar configuraciones");

  const visualizaciones = data?.visualizaciones as Record<string, unknown> | undefined;
  const usarRecorteFotografiaComoAvatarEstudiantes = Boolean(
    visualizaciones?.usarRecorteFotografiaComoAvatarEstudiantes,
  );

  try {
    await upsertBooleanSetting(
      USE_CROPPED_PHOTO_AS_STUDENT_AVATAR_KEY,
      usarRecorteFotografiaComoAvatarEstudiantes,
    );

    return {
      settings: {
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
