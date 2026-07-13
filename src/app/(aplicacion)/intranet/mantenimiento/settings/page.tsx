'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  FormControlLabel,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import NumbersIcon from '@mui/icons-material/Numbers';
import SaveIcon from '@mui/icons-material/Save';
import { httpsCallable } from 'firebase/functions';
import IntranetListLayout from '@/components/intranet/IntranetListLayout';
import { useAuth } from '@/context/AuthContext';
import { functions } from '@/lib/firebase';
import { AppSettings, defaultAppSettings, useAppSettings } from '@/hooks/useAppSettings';

export default function SettingsPage() {
  const { user } = useAuth();
  const { settings, loading, reload } = useAppSettings();
  const [draft, setDraft] = useState<AppSettings>(defaultAppSettings);
  const [saving, setSaving] = useState(false);
  const [generatingCodes, setGeneratingCodes] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageSeverity, setMessageSeverity] = useState<'success' | 'error' | 'info'>('info');

  const isSuperUser = Number(user?.level ?? 0) >= 600;

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setMessage(null);
    try {
      const saveAppSettings = httpsCallable<AppSettings, { settings?: AppSettings }>(
        functions,
        'saveAppSettings',
      );
      const result = await saveAppSettings(draft);
      if (result.data.settings) {
        setDraft(result.data.settings);
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
  }, [draft, reload]);

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

  if (!isSuperUser) {
    return (
      <IntranetListLayout title="Settings">
        <Box sx={{ px: 2, pb: 2 }}>
          <Alert severity="error">Solo el superusuario puede administrar settings.</Alert>
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
          disabled={loading || saving}
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
              disabled={loading || saving || generatingCodes}
              onClick={handleGenerateInscriptionCodes}
            >
              Generar codigos de inscripcion
            </Button>
          </Box>

          <Box>
            <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
              Visualizaciones
            </Typography>
            <Divider />
          </Box>

          <FormControlLabel
            control={
              <Switch
                checked={draft.visualizaciones.usarRecorteFotografiaComoAvatarEstudiantes}
                disabled={loading || saving}
                onChange={(event) =>
                  setDraft((current) => ({
                    visualizaciones: {
                      ...current.visualizaciones,
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
