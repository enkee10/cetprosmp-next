'use client';

import { useCallback, useEffect, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { useAuth } from '@/context/AuthContext';
import { functions } from '@/lib/firebase';

export type AppSettings = {
  visualizaciones: {
    usarRecorteFotografiaComoAvatarEstudiantes: boolean;
  };
};

export const defaultAppSettings: AppSettings = {
  visualizaciones: {
    usarRecorteFotografiaComoAvatarEstudiantes: false,
  },
};

const normalizeSettings = (value: Partial<AppSettings> | undefined | null): AppSettings => ({
  visualizaciones: {
    usarRecorteFotografiaComoAvatarEstudiantes: Boolean(
      value?.visualizaciones?.usarRecorteFotografiaComoAvatarEstudiantes,
    ),
  },
});

export function useAppSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AppSettings>(defaultAppSettings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const reload = useCallback(async () => {
    if (!user) {
      setSettings(defaultAppSettings);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const getAppSettings = httpsCallable<undefined, { settings?: Partial<AppSettings> }>(
        functions,
        'getAppSettings',
      );
      const result = await getAppSettings();
      setSettings(normalizeSettings(result.data.settings));
    } catch (nextError) {
      console.error('Error loading app settings:', nextError);
      setError(nextError);
      setSettings(defaultAppSettings);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { settings, setSettings, loading, error, reload };
}
