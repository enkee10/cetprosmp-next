'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import NumbersIcon from '@mui/icons-material/Numbers';
import SaveIcon from '@mui/icons-material/Save';
import { httpsCallable } from 'firebase/functions';
import IntranetListLayout from '@/components/intranet/IntranetListLayout';
import { functions } from '@/lib/firebase';
import { AppSettings, defaultAppSettings, useAppSettings } from '@/hooks/useAppSettings';
import { useIntranetPermissions } from '@/hooks/useIntranetPermissions';

type SemestreOption = {
  id: number;
  titulo?: string | null;
  nombre?: string | null;
  inicio?: string | null;
  fin?: string | null;
};

const normalizeDraftSettings = (value: Partial<AppSettings> | null | undefined): AppSettings => {
  const aceptaRespuestas = Boolean(
    value?.formularioMatricula?.aceptaRespuestas ?? value?.general?.formularioMatriculaAceptaRespuestas,
  );
  const semestreId = Number(value?.formularioMatricula?.semestreId);

  return {
    general: {
      ...defaultAppSettings.general,
      ...value?.general,
      formularioMatriculaAceptaRespuestas: aceptaRespuestas,
    },
    formularioMatricula: {
      ...defaultAppSettings.formularioMatricula,
      ...value?.formularioMatricula,
      aceptaRespuestas,
      semestreId: Number.isFinite(semestreId) && semestreId > 0 ? semestreId : null,
    },
    visualizaciones: {
      ...defaultAppSettings.visualizaciones,
      ...value?.visualizaciones,
    },
  };
};

export default function SettingsPage() {
  const { can, loading: loadingPermissions } = useIntranetPermissions();
  const { settings, loading, reload } = useAppSettings();
  const [draft, setDraft] = useState<AppSettings>(defaultAppSettings);
  const [saving, setSaving] = useState(false);
  const [generatingCodes, setGeneratingCodes] = useState(false);
  const [semestres, setSemestres] = useState<SemestreOption[]>([]);
  const [loadingSemestres, setLoadingSemestres] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageSeverity, setMessageSeverity] = useState<'success' | 'error' | 'info'>('info');

  const canViewSettings = can('settings', 'view');
  const canEditSettings = can('settings', 'edit');
  const safeDraft = normalizeDraftSettings(draft);

  useEffect(() => {
    setDraft(normalizeDraftSettings(settings));
  }, [settings]);

  useEffect(() => {
    if (loadingPermissions || !canViewSettings) return;
    let active = true;

    const loadSemestres = async () => {
      setLoadingSemestres(true);
      try {
        const listMatriculaSemestres = httpsCallable<undefined, { semestres?: SemestreOption[] }>(
          functions,
          'listMatriculaSemestres',
        );
        const result = await listMatriculaSemestres();
        if (active) setSemestres(result.data.semestres || []);
      } catch (error) {
        console.error('Error loading matricula semestres for settings:', error);
        if (active) setMessage('No se pudieron cargar los semestres de matricula.');
        if (active) setMessageSeverity('error');
      } finally {
        if (active) setLoadingSemestres(false);
      }
    };

    void loadSemestres();
    return () => {
      active = false;
    };
  }, [canViewSettings, loadingPermissions]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setMessage(null);
    try {
      const saveAppSettings = httpsCallable<AppSettings, { settings?: AppSettings }>(
        functions,
        'saveAppSettings',
      );
      const result = await saveAppSettings(safeDraft);
      if (result.data.settings) {
        setDraft(normalizeDraftSettings(result.data.settings));
      }
      await reload();
      setMessage('Configuraciones guardadas.');
      setMessageSeverity('success');
    } catch (error) {
      console.error('Error saving app settings:', error);
      setMessage('No se pudieron guardar las configuraciones.');
      setMessageSeverity('error');
    } finally {
      setSaving(false);
    }
  }, [reload, safeDraft]);

  const handleGenerateInscriptionCodes = useCallback(async () => {
    const confirmed = window.confirm(
      'Se regeneraran los codigos de inscripcion de las matriculas del anio vigente, ordenadas por fecha y hora. Deseas continuar?',
    );
    if (!confirmed) return;

    setGeneratingCodes(true);
    setMessage(null);
    try {
      const generarCodigosInscripcionMatriculas = httpsCallable<
        undefined,
        {
          year: number;
          total: number;
          updated: number;
          unchanged: number;
          firstCodigo: string | null;
          lastCodigo: string | null;
        }
      >(
        functions,
        'generarCodigosInscripcionMatriculas',
      );
      const result = await generarCodigosInscripcionMatriculas();
      const { year, total, updated, unchanged, firstCodigo, lastCodigo } = result.data;
      setMessage(
        `Codigos ${year}: ${updated} actualizados, ${unchanged} sin cambios, ${total} matriculas. ${firstCodigo && lastCodigo ? `${firstCodigo} - ${lastCodigo}` : ''}`.trim(),
      );
      setMessageSeverity('success');
    } catch (error) {
      console.error('Error generating inscription codes:', error);
      setMessage('No se pudieron generar los codigos de inscripcion.');
      setMessageSeverity('error');
    } finally {
      setGeneratingCodes(false);
    }
  }, []);

  if (!loadingPermissions && !canViewSettings) {
    return (
      <IntranetListLayout title="Settings">
        <Box sx={{ px: 2, pb: 2 }}>
          <Alert severity="error">No tienes permiso para ver settings.</Alert>
        </Box>
      </IntranetListLayout>
    );
  }

  return (
    <IntranetListLayout
      title="Settings"
      message={message}
      messageSeverity={messageSeverity}
      commands={
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress color="inherit" size={18} /> : <SaveIcon />}
          disabled={loading || loadingPermissions || saving || !canEditSettings}
          onClick={handleSave}
        >
          Guardar
        </Button>
      }
    >
      <Box sx={{ px: 2, pb: 3, maxWidth: 760 }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
              General
            </Typography>
            <Divider />
          </Box>

          <Box>
            <Button
              variant="outlined"
              startIcon={generatingCodes ? <CircularProgress color="inherit" size={18} /> : <NumbersIcon />}
              disabled={loading || saving || generatingCodes || !canEditSettings}
              onClick={handleGenerateInscriptionCodes}
            >
              Generar codigos de inscripcion
            </Button>
          </Box>

          <FormControlLabel
            control={
              <Switch
                checked={safeDraft.general.usarAvataresEnCertificadosTitulos}
                disabled={loading || saving || !canEditSettings}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    general: {
                      ...normalizeDraftSettings(current).general,
                      usarAvataresEnCertificadosTitulos: event.target.checked,
                    },
                  }))
                }
              />
            }
            label="Usar avatares en certificados y titulos"
          />

          <Box>
            <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
              Formulario de matricula
            </Typography>
            <Divider />
          </Box>

          <FormControlLabel
            control={
              <Switch
                checked={safeDraft.formularioMatricula.aceptaRespuestas}
                disabled={loading || saving || !canEditSettings}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    ...normalizeDraftSettings(current),
                    formularioMatricula: {
                      ...normalizeDraftSettings(current).formularioMatricula,
                      aceptaRespuestas: event.target.checked,
                    },
                  }))
                }
              />
            }
            label="El formulario acepta respuestas"
          />

          <FormControl fullWidth size="small" disabled={loading || saving || loadingSemestres || !canEditSettings}>
            <InputLabel>Definir semestre de matricula</InputLabel>
            <Select
              label="Definir semestre de matricula"
              value={safeDraft.formularioMatricula.semestreId ? String(safeDraft.formularioMatricula.semestreId) : ''}
              onChange={(event) =>
                setDraft((current) => ({
                  ...normalizeDraftSettings(current),
                  formularioMatricula: {
                    ...normalizeDraftSettings(current).formularioMatricula,
                    semestreId: Number(event.target.value) || null,
                  },
                }))
              }
            >
              <MenuItem value="">Sin definir</MenuItem>
              {semestres.map((semestre) => (
                <MenuItem key={semestre.id} value={String(semestre.id)}>
                  {semestre.titulo || semestre.nombre || `Semestre ${semestre.id}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box>
            <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
              Visualizaciones
            </Typography>
            <Divider />
          </Box>

          <FormControlLabel
            control={
              <Switch
                checked={safeDraft.visualizaciones.usarRecorteFotografiaComoAvatarEstudiantes}
                disabled={loading || saving || !canEditSettings}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    visualizaciones: {
                      ...normalizeDraftSettings(current).visualizaciones,
                      usarRecorteFotografiaComoAvatarEstudiantes: event.target.checked,
                    },
                  }))
                }
              />
            }
            label="Usar la foto imagen recortada como el avatar para Estudiantes"
          />
        </Stack>
      </Box>
    </IntranetListLayout>
  );
}
