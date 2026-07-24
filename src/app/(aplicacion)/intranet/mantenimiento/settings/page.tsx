'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  ListItemText,
  MenuItem,
  OutlinedInput,
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
  grupoCount?: number | null;
};

const getSemestreLabel = (semestre: SemestreOption) =>
  semestre.titulo || semestre.nombre || `Semestre ${semestre.id}`;

const getSemestreTime = (value?: string | null) => {
  if (!value) return Number.NEGATIVE_INFINITY;
  const time = new Date(`${value}T00:00:00`).getTime();
  return Number.isFinite(time) ? time : Number.NEGATIVE_INFINITY;
};

const sortSemestresAsc = (items: SemestreOption[]) =>
  items.slice().sort((a, b) =>
    getSemestreTime(a.inicio) - getSemestreTime(b.inicio)
    || String(getSemestreLabel(a)).localeCompare(getSemestreLabel(b), 'es', { numeric: true })
    || a.id - b.id,
  );

const selectMenuProps = {
  disableScrollLock: true,
};

const resolveInitialSemestreActualId = (semestres: SemestreOption[]) => {
  const byTitle = semestres.find((semestre) => getSemestreLabel(semestre).trim() === '2026-1');
  return byTitle?.id ?? null;
};

const normalizeDraftSettings = (value: Partial<AppSettings> | null | undefined): AppSettings => {
  const aceptaRespuestas = Boolean(
    value?.formularioMatricula?.aceptaRespuestas ?? value?.general?.formularioMatriculaAceptaRespuestas,
  );
  const semestreActualId = Number(value?.general?.semestreActualId ?? value?.formularioMatricula?.semestreId);
  const activarReconocimientoDni = (value?.formularioMatricula?.activarReconocimientoDni ?? value?.general?.activarReconocimientoDni) !== false;
  const semestresConsultaIds = Array.isArray(value?.general?.semestresConsultaIds)
    ? value.general.semestresConsultaIds.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0)
    : [];

  return {
    general: {
      ...defaultAppSettings.general,
      ...value?.general,
      activarReconocimientoDni,
      formularioMatriculaAceptaRespuestas: aceptaRespuestas,
      semestreActualId: Number.isFinite(semestreActualId) && semestreActualId > 0 ? semestreActualId : null,
      semestresConsultaIds,
    },
    formularioMatricula: {
      ...defaultAppSettings.formularioMatricula,
      ...value?.formularioMatricula,
      aceptaRespuestas,
      semestreId: Number.isFinite(semestreActualId) && semestreActualId > 0 ? semestreActualId : null,
      activarReconocimientoDni,
    },
    visualizaciones: {
      ...defaultAppSettings.visualizaciones,
      ...value?.visualizaciones,
      mostrarImagenAvatarEstudiantesEnListas: value?.visualizaciones?.mostrarImagenAvatarEstudiantesEnListas !== false,
      usarGeneradorImagenesAvatar: activarReconocimientoDni
        ? value?.visualizaciones?.usarGeneradorImagenesAvatar !== false
        : false,
      modeloGeneradorImagenesAvatar: [
        'gemini-3.1-flash-lite-image-1024',
        'gemini-3.1-flash-image-512',
      ].includes(String(value?.visualizaciones?.modeloGeneradorImagenesAvatar))
        ? String(value?.visualizaciones?.modeloGeneradorImagenesAvatar)
        : defaultAppSettings.visualizaciones.modeloGeneradorImagenesAvatar,
    },
  };
};

const applySemestreDefaults = (
  value: Partial<AppSettings> | AppSettings,
  semestres: SemestreOption[],
  semestreConsultaOptions: SemestreOption[],
): AppSettings => {
  const normalized = normalizeDraftSettings(value);
  if (semestres.length === 0) return normalized;

  const semestreActualId = normalized.general.semestreActualId ?? resolveInitialSemestreActualId(semestres);
  const consultaIds = normalized.general.semestresConsultaIds.length > 0
    ? normalized.general.semestresConsultaIds
    : semestreConsultaOptions.map((semestre) => semestre.id);
  const normalizedConsultaIds = semestreActualId
    ? Array.from(new Set([semestreActualId, ...consultaIds]))
    : consultaIds;

  return {
    ...normalized,
    general: {
      ...normalized.general,
      semestreActualId,
      semestresConsultaIds: normalizedConsultaIds,
    },
    formularioMatricula: {
      ...normalized.formularioMatricula,
      semestreId: semestreActualId,
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
  const semestreActualOptions = useMemo(() => {
    const ordered = sortSemestresAsc(semestres);
    const today = new Date();
    const currentIndex = ordered.findIndex((semestre) => {
      if (!semestre.inicio || !semestre.fin) return false;
      const start = new Date(`${semestre.inicio}T00:00:00`);
      const end = new Date(`${semestre.fin}T23:59:59`);
      return !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && start <= today && today <= end;
    });
    if (currentIndex < 0) return ordered;
    return ordered.slice(Math.max(0, currentIndex - 1));
  }, [semestres]);
  const semestreConsultaOptions = useMemo(
    () => sortSemestresAsc(semestres.filter((semestre) => Number(semestre.grupoCount ?? 0) > 0)),
    [semestres],
  );

  useEffect(() => {
    setDraft(applySemestreDefaults(settings, semestres, semestreConsultaOptions));
  }, [settings, semestreConsultaOptions, semestres]);

  useEffect(() => {
    if (loadingPermissions || !canViewSettings) return;
    let active = true;

    const loadSemestres = async () => {
      setLoadingSemestres(true);
      try {
        const listSettingsSemestresConGrupos = httpsCallable<undefined, { semestres?: SemestreOption[] }>(
          functions,
          'listSettingsSemestresConGrupos',
        );
        const result = await listSettingsSemestresConGrupos();
        if (active) setSemestres(result.data.semestres || []);
      } catch (error) {
        console.error('Error loading semestres con grupos for settings:', error);
        if (active) setMessage('No se pudieron cargar los semestres con grupos.');
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

          <FormControl fullWidth size="small" disabled={loading || saving || loadingSemestres || !canEditSettings}>
            <InputLabel>Semestre Actual</InputLabel>
            <Select
              label="Semestre Actual"
              value={safeDraft.general.semestreActualId ? String(safeDraft.general.semestreActualId) : ''}
              MenuProps={selectMenuProps}
              onChange={(event) =>
                setDraft((current) => {
                  const normalized = normalizeDraftSettings(current);
                  const semestreActualId = Number(event.target.value) || null;
                  const semestresConsultaIds = semestreActualId
                    ? Array.from(new Set([semestreActualId, ...normalized.general.semestresConsultaIds]))
                    : normalized.general.semestresConsultaIds;
                  return {
                    ...normalized,
                    general: {
                      ...normalized.general,
                      semestreActualId,
                      semestresConsultaIds,
                    },
                    formularioMatricula: {
                      ...normalized.formularioMatricula,
                      semestreId: semestreActualId,
                    },
                  };
                })
              }
            >
              <MenuItem value="">Sin definir</MenuItem>
              {semestreActualOptions.map((semestre) => (
                <MenuItem key={semestre.id} value={String(semestre.id)}>
                  {getSemestreLabel(semestre)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small" disabled={loading || saving || loadingSemestres || !canEditSettings}>
            <InputLabel>Usar solo los siguientes semestres para devolver datos</InputLabel>
            <Select
              multiple
              label="Usar solo los siguientes semestres para devolver datos"
              value={safeDraft.general.semestresConsultaIds.map(String)}
              MenuProps={selectMenuProps}
              input={<OutlinedInput label="Usar solo los siguientes semestres para devolver datos" />}
              renderValue={(selected) =>
                (selected as string[])
                  .map((id) => semestreConsultaOptions.find((semestre) => String(semestre.id) === id))
                  .filter((semestre): semestre is SemestreOption => Boolean(semestre))
                  .map(getSemestreLabel)
                  .join(', ')
              }
              onChange={(event) => {
                const value = event.target.value;
                const selected = typeof value === 'string' ? value.split(',') : value;
                const selectedIds = selected
                  .map((id) => Number(id))
                  .filter((id) => Number.isFinite(id) && id > 0);
                const nextSelectedIds = safeDraft.general.semestreActualId
                  ? Array.from(new Set([safeDraft.general.semestreActualId, ...selectedIds]))
                  : selectedIds;
                setDraft((current) => ({
                  ...normalizeDraftSettings(current),
                  general: {
                    ...normalizeDraftSettings(current).general,
                    semestresConsultaIds: nextSelectedIds,
                  },
                }));
              }}
            >
              {semestreConsultaOptions.map((semestre) => (
                <MenuItem key={semestre.id} value={String(semestre.id)}>
                  <Checkbox
                    checked={safeDraft.general.semestresConsultaIds.includes(semestre.id)}
                    disabled={safeDraft.general.semestreActualId === semestre.id}
                  />
                  <ListItemText primary={getSemestreLabel(semestre)} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

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

          <FormControlLabel
            control={
              <Switch
                checked={safeDraft.formularioMatricula.activarReconocimientoDni}
                disabled={loading || saving || !canEditSettings}
                onChange={(event) =>
                  setDraft((current) => {
                    const normalized = normalizeDraftSettings(current);
                    return {
                      ...normalized,
                      general: {
                        ...normalized.general,
                        activarReconocimientoDni: event.target.checked,
                      },
                      formularioMatricula: {
                        ...normalized.formularioMatricula,
                        activarReconocimientoDni: event.target.checked,
                      },
                      visualizaciones: {
                        ...normalized.visualizaciones,
                        usarGeneradorImagenesAvatar: event.target.checked
                          ? normalized.visualizaciones.usarGeneradorImagenesAvatar
                          : false,
                      },
                    };
                  })
                }
              />
            }
            label="Activar reconocimiento de DNI"
          />

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

          <FormControlLabel
            control={
              <Switch
                checked={safeDraft.visualizaciones.mostrarImagenAvatarEstudiantesEnListas}
                disabled={loading || saving || !canEditSettings}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    visualizaciones: {
                      ...normalizeDraftSettings(current).visualizaciones,
                      mostrarImagenAvatarEstudiantesEnListas: event.target.checked,
                    },
                  }))
                }
              />
            }
            label="Mostrar imagen de avatar de estudiantes en listas"
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={safeDraft.visualizaciones.usarGeneradorImagenesAvatar}
                  disabled={loading || saving || !canEditSettings || !safeDraft.general.activarReconocimientoDni}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      visualizaciones: {
                        ...normalizeDraftSettings(current).visualizaciones,
                        usarGeneradorImagenesAvatar: event.target.checked,
                      },
                    }))
                  }
                />
              }
              label="Usar generador de imagenes IA para avatar"
            />

            <FormControl
              size="small"
              sx={{ minWidth: { xs: '100%', sm: 320 } }}
              disabled={
                loading
                || saving
                || !canEditSettings
                || !safeDraft.general.activarReconocimientoDni
                || !safeDraft.visualizaciones.usarGeneradorImagenesAvatar
              }
            >
              <InputLabel>Modelo de generacion</InputLabel>
              <Select
                label="Modelo de generacion"
                value={safeDraft.visualizaciones.modeloGeneradorImagenesAvatar}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    visualizaciones: {
                      ...normalizeDraftSettings(current).visualizaciones,
                      modeloGeneradorImagenesAvatar: event.target.value,
                    },
                  }))
                }
              >
                <MenuItem value="gemini-3.1-flash-lite-image-1024">
                  Gemini Flash Lite Image 1024
                </MenuItem>
                <MenuItem value="gemini-3.1-flash-image-512">
                  Gemini Flash Image 512
                </MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </Stack>
      </Box>
    </IntranetListLayout>
  );
}
