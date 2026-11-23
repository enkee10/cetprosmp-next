'use client';

import { dateOnlyTimestamp, isCalendarPeriodActive, toDateOnlyInputValue } from '@/lib/dateOnly';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AutoDismissAlert from '@/components/intranet/AutoDismissAlert';
import {
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
  TextField,
  Typography,
} from '@mui/material';
import NumbersIcon from '@mui/icons-material/Numbers';
import SaveIcon from '@mui/icons-material/Save';
import { httpsCallable } from 'firebase/functions';
import IntranetListLayout from '@/components/intranet/IntranetListLayout';
import MultiSelectWithActions from '@/components/intranet/MultiSelectWithActions';
import { functions } from '@/lib/firebase';
import { AppSettings, defaultAppSettings, useAppSettings } from '@/hooks/useAppSettings';
import { useIntranetPermissions } from '@/hooks/useIntranetPermissions';

type SemestreOption = {
  id: number;
  titulo?: string | null;
  nombre?: string | null;
  inicio?: string | null;
  fin?: string | null;
  fechaCertificado?: string | null;
  grupoCount?: number | null;
};

type CertificateNumberSettings = {
  nextNumber: number;
  nextReusableNumber?: number | null;
  reuseReleased?: boolean;
  reuseFromNumber?: number;
};

const getSemestreLabel = (semestre: SemestreOption) =>
  semestre.titulo || semestre.nombre || `Semestre ${semestre.id}`;

const getSemestreTime = (value?: string | null) => {
  if (!value) return Number.NEGATIVE_INFINITY;
  const time = dateOnlyTimestamp(value) ?? Number.NEGATIVE_INFINITY;
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

const normalizeColor = (value: unknown, fallback = '#ffffff') => (
  /^#[0-9a-f]{6}$/i.test(String(value || '')) ? String(value) : fallback
);

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
    programacionCurricular: {
      mostrarContenidoEnCuadroEmergente: value?.programacionCurricular?.mostrarContenidoEnCuadroEmergente !== false,
      mostrarRecursosEnSesiones: value?.programacionCurricular?.mostrarRecursosEnSesiones === true,
      usarOtroColorCompetenciasEmpleabilidad: value?.programacionCurricular?.usarOtroColorCompetenciasEmpleabilidad !== false,
    },
    registroAuxiliar: {
      mostrarBotonEditarEstudiantes: value?.registroAuxiliar?.mostrarBotonEditarEstudiantes !== false,
    },
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
      siguienteAceptaRespuestas: Boolean(value?.formularioMatricula?.siguienteAceptaRespuestas),
      semestreId: Number.isFinite(semestreActualId) && semestreActualId > 0 ? semestreActualId : null,
      activarReconocimientoDni,
      fondoColor: normalizeColor(value?.formularioMatricula?.fondoColor),
      siguienteFondoColor: normalizeColor(value?.formularioMatricula?.siguienteFondoColor),
    },
    visualizaciones: {
      ...defaultAppSettings.visualizaciones,
      ...value?.visualizaciones,
      mostrarImagenAvatarEstudiantesEnListas: value?.visualizaciones?.mostrarImagenAvatarEstudiantesEnListas !== false,
      visualizarAvatarEstudianteCertificados: value?.visualizaciones?.visualizarAvatarEstudianteCertificados !== false,
      visualizarAvatarEstudianteFichaMatricula: value?.visualizaciones?.visualizarAvatarEstudianteFichaMatricula !== false,
      visualizarAvatarEstudianteTitulos: value?.visualizaciones?.visualizarAvatarEstudianteTitulos !== false,
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
  const { settings, loading, setSettings } = useAppSettings();
  const [draft, setDraft] = useState<AppSettings>(defaultAppSettings);
  const [saving, setSaving] = useState(false);
  const [generatingCodes, setGeneratingCodes] = useState(false);
  const [semestres, setSemestres] = useState<SemestreOption[]>([]);
  const [loadingSemestres, setLoadingSemestres] = useState(false);
  const [certificateNumbers, setCertificateNumbers] = useState<CertificateNumberSettings | null>(null);
  const [certificateNumberDraft, setCertificateNumberDraft] = useState('');
  const [certificateReuseDraft, setCertificateReuseDraft] = useState<boolean | null>(null);
  const [certificateReuseFromDraft, setCertificateReuseFromDraft] = useState('139');
  const [savingCertificateNumber, setSavingCertificateNumber] = useState(false);
  const [savedCertificateDates, setSavedCertificateDates] = useState<Record<number, string | null>>({});
  const [certificateDateDraft, setCertificateDateDraft] = useState<{ semestreId: number; value: string } | null>(null);
  const [savingCertificateDate, setSavingCertificateDate] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageSeverity, setMessageSeverity] = useState<'success' | 'error' | 'info'>('info');

  const canViewSettings = can('settings', 'view');
  const canEditSettings = can('settings', 'edit');
  const certificateNextNumber = certificateNumbers?.nextNumber ?? null;
  const certificateNumber = /^\d+$/.test(certificateNumberDraft) ? Number(certificateNumberDraft) : NaN;
  const certificateNumberChanged = certificateNumber !== certificateNextNumber;
  const certificateNumberInvalid = certificateNextNumber !== null && certificateNumberChanged && (
    !Number.isInteger(certificateNumber) || certificateNumber < certificateNextNumber || certificateNumber >= 2_147_483_647
  );
  const certificateReuseFrom = /^\d+$/.test(certificateReuseFromDraft) ? Number(certificateReuseFromDraft) : NaN;
  const certificateReuseFromChanged = certificateReuseFrom !== (certificateNumbers?.reuseFromNumber ?? 139);
  const certificateReuseFromInvalid = !Number.isInteger(certificateReuseFrom) || certificateReuseFrom < 1 || certificateReuseFrom >= 2_147_483_647;
  const safeDraft = normalizeDraftSettings(draft);
  const certificateSemester = semestres.find(semestre => semestre.id === safeDraft.general.semestreActualId);
  const dateOverride = certificateSemester ? savedCertificateDates[certificateSemester.id] : undefined;
  const savedIssueDate = dateOverride === undefined ? certificateSemester?.fechaCertificado : dateOverride;
  const defaultIssueDate = toDateOnlyInputValue(certificateSemester?.fin);
  const editedIssueDate = certificateDateDraft && certificateDateDraft.semestreId === certificateSemester?.id
    ? certificateDateDraft.value : undefined;
  const certificateIssueDate = editedIssueDate ?? (toDateOnlyInputValue(savedIssueDate) || defaultIssueDate);
  const semestreActualOptions = useMemo(() => {
    const ordered = sortSemestresAsc(semestres);
    const today = new Date();
    const currentIndex = ordered.findIndex((semestre) => {
      if (!semestre.inicio || !semestre.fin) return false;
      return isCalendarPeriodActive(semestre, today);
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

  useEffect(() => {
    if (loadingPermissions || !canViewSettings) return;
    let active = true;
    const getCertificateNextNumber = httpsCallable<undefined, CertificateNumberSettings>(functions, 'getCertificateNextNumber');
    void getCertificateNextNumber().then(({ data }) => {
      if (!active) return;
      setCertificateNumbers(data);
      setCertificateNumberDraft(String(data.nextNumber));
      setCertificateReuseFromDraft(String(data.reuseFromNumber ?? 139));
    }).catch((error) => {
      console.error('Error loading certificate number:', error);
      if (!active) return;
      setMessage('No se pudo cargar el siguiente número de código de inscripción.');
      setMessageSeverity('error');
    });
    return () => { active = false; };
  }, [canViewSettings, loadingPermissions]);

  const handleSaveCertificateNumber = async () => {
    if (!canEditSettings || certificateNextNumber === null || certificateNumberInvalid || certificateReuseFromInvalid) return;
    setSavingCertificateNumber(true);
    setMessage(null);
    try {
      const saveCertificateNextNumber = httpsCallable<{ nextNumber?: number; reuseReleased?: boolean; reuseFromNumber?: number }, CertificateNumberSettings>(
        functions, 'saveCertificateNextNumber',
      );
      const { data } = await saveCertificateNextNumber({
        ...(certificateNumberChanged ? { nextNumber: certificateNumber } : {}),
        ...(certificateReuseDraft !== null ? { reuseReleased: certificateReuseDraft } : {}),
        ...(certificateReuseFromChanged ? { reuseFromNumber: certificateReuseFrom } : {}),
      });
      setCertificateNumbers(data);
      setCertificateNumberDraft(String(data.nextNumber));
      setCertificateReuseDraft(null);
      setCertificateReuseFromDraft(String(data.reuseFromNumber ?? 139));
      setMessage('Numeración de certificados guardada.');
      setMessageSeverity('success');
    } catch (error) {
      const result = error as { message?: string; details?: Partial<CertificateNumberSettings> & { minimum?: number } };
      const minimum = result.details?.minimum;
      if (typeof minimum === 'number') setCertificateNumbers({ ...result.details, nextNumber: minimum });
      setMessage(result.message || 'No se pudo guardar el siguiente número de código de inscripción.');
      setMessageSeverity('error');
    } finally {
      setSavingCertificateNumber(false);
    }
  };

  const handleSaveCertificateDate = async () => {
    if (!canEditSettings || !certificateSemester || editedIssueDate === undefined || savingCertificateDate) return;
    setSavingCertificateDate(true);
    setMessage(null);
    try {
      const saveCertificateIssueDate = httpsCallable<
        { semestreId: number; fecha: string | null },
        { semestreId: number; fechaCertificado: string | null }
      >(functions, 'saveCertificateIssueDate');
      const { data } = await saveCertificateIssueDate({ semestreId: certificateSemester.id, fecha: editedIssueDate || null });
      setSavedCertificateDates(current => ({ ...current, [data.semestreId]: data.fechaCertificado }));
      setCertificateDateDraft(null);
      setMessage('Fecha de emisión de certificados guardada.');
      setMessageSeverity('success');
    } catch (error) {
      const result = error as { message?: string };
      setMessage(result.message || 'No se pudo guardar la fecha de emisión de certificados.');
      setMessageSeverity('error');
    } finally {
      setSavingCertificateDate(false);
    }
  };

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
        setSettings(result.data.settings);
        setDraft(normalizeDraftSettings(result.data.settings));
      }
      setMessage('Configuraciones guardadas.');
      setMessageSeverity('success');
    } catch (error) {
      console.error('Error saving app settings:', error);
      setMessage('No se pudieron guardar las configuraciones.');
      setMessageSeverity('error');
    } finally {
      setSaving(false);
    }
  }, [setSettings, safeDraft]);

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
          <AutoDismissAlert severity="error">No tienes permiso para ver settings.</AutoDismissAlert>
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

          <FormControlLabel
            label="Poder ocultar de la Programación para Opciones Ocupacionales"
            control={<Switch checked={safeDraft.general.poderOcultarProgramacionOpcionesOcupacionales}
              disabled={loading || saving || !canEditSettings}
              onChange={(_, checked) => setDraft(current => ({
                ...normalizeDraftSettings(current),
                general: { ...normalizeDraftSettings(current).general, poderOcultarProgramacionOpcionesOcupacionales: checked },
              }))} />}
          />

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



          <FormControl fullWidth size="small" disabled={loading || saving || loadingSemestres || !canEditSettings}>
            <InputLabel>Semestre Actual</InputLabel>
            <Select
              label="Semestre Actual"
              value={safeDraft.general.semestreActualId ? String(safeDraft.general.semestreActualId) : ''}
              MenuProps={selectMenuProps}
              onChange={(event) => {
                setCertificateDateDraft(null);
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
                });
              }}
            >
              <MenuItem value="">Sin definir</MenuItem>
              {semestreActualOptions.map((semestre) => (
                <MenuItem key={semestre.id} value={String(semestre.id)}>
                  {getSemestreLabel(semestre)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <MultiSelectWithActions
            label="Usar solo los siguientes semestres para devolver datos"
            value={safeDraft.general.semestresConsultaIds.map(String)}
            onChange={(selected) => {
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
            disabled={loading || saving || loadingSemestres || !canEditSettings}
            options={semestreConsultaOptions.map((semestre) => ({
              value: String(semestre.id),
              label: getSemestreLabel(semestre),
              disabled: safeDraft.general.semestreActualId === semestre.id,
            }))}
            renderValue={(selected) =>
              selected
                .map((id) => semestreConsultaOptions.find((semestre) => String(semestre.id) === id))
                .filter((semestre): semestre is SemestreOption => Boolean(semestre))
                .map(getSemestreLabel)
                .join(', ')
            }
            MenuProps={selectMenuProps}
          />

          <Box>
            <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
              Programación curricular
            </Typography>
            <Divider />
          </Box>

          <FormControlLabel
            label="Mostrar contenido en cuadro emergente al hacer clic"
            control={<Switch
              checked={safeDraft.programacionCurricular.mostrarContenidoEnCuadroEmergente}
              disabled={loading || saving || !canEditSettings}
              onChange={(_, checked) => setDraft(current => ({
                ...normalizeDraftSettings(current),
                programacionCurricular: { ...normalizeDraftSettings(current).programacionCurricular, mostrarContenidoEnCuadroEmergente: checked },
              }))}
            />}
          />

          <FormControlLabel
            label="Usar otro color para competencias de empleabilidad"
            control={<Switch
              checked={safeDraft.programacionCurricular.usarOtroColorCompetenciasEmpleabilidad}
              disabled={loading || saving || !canEditSettings}
              onChange={(_, checked) => setDraft(current => ({
                ...normalizeDraftSettings(current),
                programacionCurricular: { ...normalizeDraftSettings(current).programacionCurricular, usarOtroColorCompetenciasEmpleabilidad: checked },
              }))}
            />}
          />

          <FormControlLabel
            label="Mostrar recursos en sesiones"
            control={<Switch
              checked={safeDraft.programacionCurricular.mostrarRecursosEnSesiones}
              disabled={loading || saving || !canEditSettings}
              onChange={(_, checked) => setDraft(current => ({
                ...normalizeDraftSettings(current),
                programacionCurricular: { ...normalizeDraftSettings(current).programacionCurricular, mostrarRecursosEnSesiones: checked },
              }))}
            />}
          />

          <Box>
            <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
              Registro Auxiliar
            </Typography>
            <Divider />
          </Box>

          <FormControlLabel
            label="Mostrar botón editar en estudiantes"
            control={<Switch
              checked={safeDraft.registroAuxiliar.mostrarBotonEditarEstudiantes}
              disabled={loading || saving || !canEditSettings}
              onChange={(_, checked) => setDraft(current => ({
                ...current,
                registroAuxiliar: { ...current.registroAuxiliar, mostrarBotonEditarEstudiantes: checked },
              }))}
            />}
          />

          <Box>
            <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
              Formulario de matricula
            </Typography>
            <Divider />
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={safeDraft.formularioMatricula.aceptaRespuestas}
                  disabled={loading || saving || !canEditSettings}
                  onChange={(event) =>
                    setDraft((current) => {
                      const normalized = normalizeDraftSettings(current);
                      return {
                        ...normalized,
                        formularioMatricula: {
                          ...normalized.formularioMatricula,
                          aceptaRespuestas: event.target.checked,
                        },
                      };
                    })
                  }
                />
              }
              label="Formulario Matricula actual acepta respuestas"
            />
            <TextField
              label="Color de fondo"
              type="color"
              size="small"
              value={safeDraft.formularioMatricula.fondoColor}
              disabled={loading || saving || !canEditSettings}
              onChange={(event) =>
                setDraft((current) => {
                  const normalized = normalizeDraftSettings(current);
                  return {
                    ...normalized,
                    formularioMatricula: {
                      ...normalized.formularioMatricula,
                      fondoColor: normalizeColor(event.target.value),
                    },
                  };
                })
              }
              sx={{ width: { xs: '100%', sm: 170 } }}
            />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={safeDraft.formularioMatricula.siguienteAceptaRespuestas}
                  disabled={loading || saving || !canEditSettings}
                  onChange={(event) =>
                    setDraft((current) => {
                      const normalized = normalizeDraftSettings(current);
                      return {
                        ...normalized,
                        formularioMatricula: {
                          ...normalized.formularioMatricula,
                          siguienteAceptaRespuestas: event.target.checked,
                        },
                      };
                    })
                  }
                />
              }
              label="Formulario Matricula siguiente acepta respuestas"
            />
            <TextField
              label="Color de fondo"
              type="color"
              size="small"
              value={safeDraft.formularioMatricula.siguienteFondoColor}
              disabled={loading || saving || !canEditSettings}
              onChange={(event) =>
                setDraft((current) => {
                  const normalized = normalizeDraftSettings(current);
                  return {
                    ...normalized,
                    formularioMatricula: {
                      ...normalized.formularioMatricula,
                      siguienteFondoColor: normalizeColor(event.target.value),
                    },
                  };
                })
              }
              sx={{ width: { xs: '100%', sm: 170 } }}
            />
          </Stack>

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

          <FormControlLabel
            control={
              <Switch
                checked={safeDraft.visualizaciones.visualizarAvatarEstudianteCertificados}
                disabled={loading || saving || !canEditSettings}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    visualizaciones: {
                      ...normalizeDraftSettings(current).visualizaciones,
                      visualizarAvatarEstudianteCertificados: event.target.checked,
                    },
                  }))
                }
              />
            }
            label="Visualizar avatar del estudiante en certificados"
          />

          <FormControlLabel
            control={
              <Switch
                checked={safeDraft.visualizaciones.visualizarAvatarEstudianteFichaMatricula}
                disabled={loading || saving || !canEditSettings}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    visualizaciones: {
                      ...normalizeDraftSettings(current).visualizaciones,
                      visualizarAvatarEstudianteFichaMatricula: event.target.checked,
                    },
                  }))
                }
              />
            }
            label="Visualizar avatar del estudiante en ficha de matricula"
          />

          <FormControlLabel
            control={
              <Switch
                checked={safeDraft.visualizaciones.visualizarAvatarEstudianteTitulos}
                disabled={loading || saving || !canEditSettings}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    visualizaciones: {
                      ...normalizeDraftSettings(current).visualizaciones,
                      visualizarAvatarEstudianteTitulos: event.target.checked,
                    },
                  }))
                }
              />
            }
            label="Visualizar avatar en titulos"
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

          <Box>
            <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
              Certificados y títulos
            </Typography>
            <Divider />
          </Box>
          <Box>
            <FormControlLabel
              label="Mostrar certificados solo con promedios de unidades aprobadas, sin EFSRT/PPP"
              control={
                <Switch
                  checked={safeDraft.general.mostrarCertificadosSinEfsrt === true}
                  disabled={loading || saving || !canEditSettings}
                  onChange={(_, checked) => setDraft((current) => ({
                    ...normalizeDraftSettings(current),
                    general: { ...normalizeDraftSettings(current).general, mostrarCertificadosSinEfsrt: checked },
                  }))}
                />
              }
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              Exige todas las notas completas y promedio de 13 o más en cada unidad. Activada, no exige EFSRT/PPP; desactivada, también exige EFSRT/PPP de 13 o más.
            </Typography>
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'flex-start' }}>
            <TextField
              label="Siguiente número de código de inscripción"
              value={certificateNumberDraft}
              disabled={!canEditSettings || certificateNextNumber === null || savingCertificateNumber}
              onChange={(event) => setCertificateNumberDraft(event.target.value)}
              error={certificateNumberInvalid}
              helperText={certificateNextNumber === null ? undefined : certificateNumbers?.nextReusableNumber != null
                ? `El próximo correlativo a reutilizar es ${certificateNumbers.nextReusableNumber}. La numeración regular seguirá desde ${certificateNextNumber}.`
                : `Número actual ${certificateNextNumber}. Puedes mantenerlo o aumentarlo.`}
              slotProps={{ htmlInput: { inputMode: 'numeric' } }}
              fullWidth
              size="small"
            />
            <Button
              variant="outlined"
              sx={{ whiteSpace: 'nowrap' }}
              disabled={!canEditSettings || certificateNextNumber === null || certificateNumberInvalid || certificateReuseFromInvalid || savingCertificateNumber
                || (!certificateNumberChanged && certificateReuseDraft === null && !certificateReuseFromChanged)}
              onClick={() => void handleSaveCertificateNumber()}
            >
              {savingCertificateNumber ? 'Guardando…' : 'Guardar numeración'}
            </Button>
          </Stack>
          <Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
              <FormControlLabel
                label="Usar códigos de registro institucional eliminados desde el número:"
                control={
                  <Switch
                    checked={certificateReuseDraft ?? certificateNumbers?.reuseReleased ?? false}
                    disabled={!canEditSettings || certificateNumbers === null || savingCertificateNumber}
                    onChange={(_, checked) => setCertificateReuseDraft(checked === (certificateNumbers?.reuseReleased ?? false) ? null : checked)}
                  />
                }
              />
              <TextField
                label="Desde el número"
                type="number"
                value={certificateReuseFromDraft}
                onChange={(event) => setCertificateReuseFromDraft(event.target.value)}
                disabled={!canEditSettings || certificateNumbers === null || savingCertificateNumber}
                error={certificateReuseFromInvalid}
                helperText={certificateReuseFromInvalid ? 'Ingresa un número entero positivo.' : undefined}
                slotProps={{ htmlInput: { min: 1, max: 2_147_483_646, step: 1, inputMode: 'numeric' } }}
                size="small"
                sx={{ width: { xs: '100%', sm: 180 }, flexShrink: 0 }}
              />
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              Activada, reutiliza los correlativos eliminados desde el número indicado, incluido, de menor a mayor. Desactivada, solo se reutiliza el tramo consecutivo del final.
            </Typography>
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'flex-start' }}>
            <TextField
              label="Fecha de emisión de certificados"
              type="date"
              value={certificateIssueDate}
              disabled={!canEditSettings || !certificateSemester || loadingSemestres || savingCertificateDate}
              onChange={(event) => {
                if (certificateSemester) setCertificateDateDraft({ semestreId: certificateSemester.id, value: event.target.value });
              }}
              helperText={certificateSemester
                ? `Semestre ${getSemestreLabel(certificateSemester)}. Si dejas la fecha en blanco, se usa el fin del semestre.`
                : 'Selecciona un semestre actual.'}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
              size="small"
            />
            <Button
              variant="outlined"
              sx={{ whiteSpace: 'nowrap' }}
              disabled={!canEditSettings || !certificateSemester || editedIssueDate === undefined || savingCertificateDate}
              onClick={() => void handleSaveCertificateDate()}
            >
              {savingCertificateDate ? 'Guardando…' : 'Guardar fecha'}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </IntranetListLayout>
  );
}
