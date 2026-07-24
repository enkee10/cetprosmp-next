'use client';

import { useCallback, useEffect, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { useAuth } from '@/context/AuthContext';
import { functions } from '@/lib/firebase';

export type AppSettings = {
  general: {
    usarAvataresEnCertificadosTitulos: boolean;
    formularioMatriculaAceptaRespuestas: boolean;
    activarReconocimientoDni: boolean;
    semestreActualId: number | null;
    semestresConsultaIds: number[];
  };
  formularioMatricula: {
    aceptaRespuestas: boolean;
    semestreId: number | null;
    activarReconocimientoDni: boolean;
  };
  visualizaciones: {
    usarRecorteFotografiaComoAvatarEstudiantes: boolean;
    mostrarImagenAvatarEstudiantesEnListas: boolean;
    usarGeneradorImagenesAvatar: boolean;
    modeloGeneradorImagenesAvatar: string;
  };
};

export const defaultAppSettings: AppSettings = {
  general: {
    usarAvataresEnCertificadosTitulos: false,
    formularioMatriculaAceptaRespuestas: false,
    activarReconocimientoDni: true,
    semestreActualId: null,
    semestresConsultaIds: [],
  },
  formularioMatricula: {
    aceptaRespuestas: false,
    semestreId: null,
    activarReconocimientoDni: true,
  },
  visualizaciones: {
    usarRecorteFotografiaComoAvatarEstudiantes: false,
    mostrarImagenAvatarEstudiantesEnListas: true,
    usarGeneradorImagenesAvatar: true,
    modeloGeneradorImagenesAvatar: 'gemini-3.1-flash-image-512',
  },
};

const normalizeSettings = (value: Partial<AppSettings> | undefined | null): AppSettings => ({
  general: {
    usarAvataresEnCertificadosTitulos: Boolean(
      value?.general?.usarAvataresEnCertificadosTitulos,
    ),
    formularioMatriculaAceptaRespuestas: Boolean(
      value?.formularioMatricula?.aceptaRespuestas ?? value?.general?.formularioMatriculaAceptaRespuestas,
    ),
    activarReconocimientoDni: (value?.formularioMatricula?.activarReconocimientoDni ?? value?.general?.activarReconocimientoDni) !== false,
    semestreActualId: Number(value?.general?.semestreActualId) > 0
      ? Number(value?.general?.semestreActualId)
      : Number(value?.formularioMatricula?.semestreId) > 0
        ? Number(value?.formularioMatricula?.semestreId)
        : null,
    semestresConsultaIds: Array.isArray(value?.general?.semestresConsultaIds)
      ? value.general.semestresConsultaIds.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0)
      : [],
  },
  formularioMatricula: {
    aceptaRespuestas: Boolean(
      value?.formularioMatricula?.aceptaRespuestas ?? value?.general?.formularioMatriculaAceptaRespuestas,
    ),
    semestreId: Number(value?.general?.semestreActualId) > 0
      ? Number(value?.general?.semestreActualId)
      : Number(value?.formularioMatricula?.semestreId) > 0
        ? Number(value?.formularioMatricula?.semestreId)
        : null,
    activarReconocimientoDni: (value?.formularioMatricula?.activarReconocimientoDni ?? value?.general?.activarReconocimientoDni) !== false,
  },
  visualizaciones: {
    usarRecorteFotografiaComoAvatarEstudiantes: Boolean(
      value?.visualizaciones?.usarRecorteFotografiaComoAvatarEstudiantes,
    ),
    mostrarImagenAvatarEstudiantesEnListas: value?.visualizaciones?.mostrarImagenAvatarEstudiantesEnListas !== false,
    usarGeneradorImagenesAvatar: value?.visualizaciones?.usarGeneradorImagenesAvatar !== false,
    modeloGeneradorImagenesAvatar: [
      'gemini-3.1-flash-lite-image-1024',
      'gemini-3.1-flash-image-512',
    ].includes(String(value?.visualizaciones?.modeloGeneradorImagenesAvatar))
      ? String(value?.visualizaciones?.modeloGeneradorImagenesAvatar)
      : 'gemini-3.1-flash-image-512',
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
