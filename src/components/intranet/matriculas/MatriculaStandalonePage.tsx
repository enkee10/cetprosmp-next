'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import { getRedirectResult, GoogleAuthProvider, onAuthStateChanged, signInWithRedirect, signOut, User as FirebaseUser } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { MatriculaForm } from '@/components/intranet/matriculas/MatriculasClient';
import { AppSettings, defaultAppSettings } from '@/hooks/useAppSettings';
import { formatDateOnly } from '@/lib/dateOnly';
import { auth, functions } from '@/lib/firebase';

interface SemestreOption {
  id: number;
  titulo?: string | null;
  nombre?: string | null;
  inicio?: string | null;
  fin?: string | null;
}

const WORKSPACE_DOMAIN = 'cetprosmp.edu.pe';
const FORM_AUTH_PENDING_KEY = 'cetprosmp.formularioMatricula.googleAuthPending';

const formatDate = (value?: string | null) => {
  return formatDateOnly(value, { dateStyle: 'long' });
};

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<T>((_resolve, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} no respondio a tiempo.`)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

const normalizeStandaloneSettings = (value: Partial<AppSettings> | undefined | null): AppSettings => {
  const acceptsResponses = Boolean(
    value?.formularioMatricula?.aceptaRespuestas ?? value?.general?.formularioMatriculaAceptaRespuestas,
  );
  const nextAcceptsResponses = Boolean(value?.formularioMatricula?.siguienteAceptaRespuestas);
  const semestreId = Number(value?.general?.semestreActualId ?? value?.formularioMatricula?.semestreId);
  const reconocimientoDniActivo =
    (value?.formularioMatricula?.activarReconocimientoDni ?? value?.general?.activarReconocimientoDni) !== false;
  const fondoColor = /^#[0-9a-f]{6}$/i.test(String(value?.formularioMatricula?.fondoColor || ''))
    ? String(value?.formularioMatricula?.fondoColor)
    : defaultAppSettings.formularioMatricula.fondoColor;
  const siguienteFondoColor = /^#[0-9a-f]{6}$/i.test(String(value?.formularioMatricula?.siguienteFondoColor || ''))
    ? String(value?.formularioMatricula?.siguienteFondoColor)
    : defaultAppSettings.formularioMatricula.siguienteFondoColor;

  return {
    general: {
      ...defaultAppSettings.general,
      ...value?.general,
      activarReconocimientoDni: reconocimientoDniActivo,
      formularioMatriculaAceptaRespuestas: acceptsResponses,
      semestreActualId: Number.isFinite(semestreId) && semestreId > 0 ? semestreId : null,
      semestresConsultaIds: Array.isArray(value?.general?.semestresConsultaIds)
        ? value.general.semestresConsultaIds.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0)
        : [],
    },
    formularioMatricula: {
      ...defaultAppSettings.formularioMatricula,
      ...value?.formularioMatricula,
      aceptaRespuestas: acceptsResponses,
      siguienteAceptaRespuestas: nextAcceptsResponses,
      semestreId: Number.isFinite(semestreId) && semestreId > 0 ? semestreId : null,
      activarReconocimientoDni: reconocimientoDniActivo,
      fondoColor,
      siguienteFondoColor,
    },
    visualizaciones: {
      ...defaultAppSettings.visualizaciones,
      ...value?.visualizaciones,
    },
  };
};

const getSemestreSortTime = (semestre: SemestreOption) => {
  const time = new Date(`${semestre.inicio || ''}T00:00:00`).getTime();
  return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY;
};

const sortSemestres = (items: SemestreOption[]) =>
  items.slice().sort((a, b) =>
    getSemestreSortTime(a) - getSemestreSortTime(b)
    || String(a.titulo || a.nombre || '').localeCompare(String(b.titulo || b.nombre || ''), 'es', { numeric: true })
    || a.id - b.id,
  );

const getNextSemestre = (items: SemestreOption[], currentId: number | null) => {
  const ordered = sortSemestres(items);
  const index = ordered.findIndex((semestre) => semestre.id === currentId);
  if (index >= 0) return ordered[index + 1] ?? null;
  return null;
};

const darkenHexColor = (value: string) => {
  const hex = /^#?([0-9a-f]{6})$/i.exec(value)?.[1] || 'd8f3fb';
  const r0 = parseInt(hex.slice(0, 2), 16) / 255;
  const g0 = parseInt(hex.slice(2, 4), 16) / 255;
  const b0 = parseInt(hex.slice(4, 6), 16) / 255;
  const max = Math.max(r0, g0, b0);
  const min = Math.min(r0, g0, b0);
  const lightness = (max + min) / 2;
  const delta = max - min;
  let hue = 0;
  let saturation = 0;

  if (delta > 0) {
    saturation = delta / (1 - Math.abs(2 * lightness - 1));
    if (max === r0) hue = ((g0 - b0) / delta + (g0 < b0 ? 6 : 0)) / 6;
    else if (max === g0) hue = ((b0 - r0) / delta + 2) / 6;
    else hue = ((r0 - g0) / delta + 4) / 6;
  }

  const vividSaturation = Math.max(0.72, Math.min(1, saturation * 1.35));
  const vividLightness = Math.min(0.58, Math.max(0.42, lightness - 0.28));
  const q = vividLightness < 0.5
    ? vividLightness * (1 + vividSaturation)
    : vividLightness + vividSaturation - vividLightness * vividSaturation;
  const p = 2 * vividLightness - q;
  const hueToRgb = (t0: number) => {
    let t = t0;
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const r = Math.round(hueToRgb(hue + 1 / 3) * 255).toString(16).padStart(2, '0');
  const g = Math.round(hueToRgb(hue) * 255).toString(16).padStart(2, '0');
  const b = Math.round(hueToRgb(hue - 1 / 3) * 255).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
};

type MatriculaStandaloneMode = 'actual' | 'siguiente';

export function MatriculaStandalonePage({ mode = 'actual' }: { mode?: MatriculaStandaloneMode }) {
  const redirectStartedRef = useRef(false);
  const forceSelectAccountRef = useRef(false);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [redirectChecked, setRedirectChecked] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(defaultAppSettings);
  const [semestres, setSemestres] = useState<SemestreOption[]>([]);
  const [loadingAccess, setLoadingAccess] = useState(false);
  const [responsibleAllowed, setResponsibleAllowed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [authRedirectLoading, setAuthRedirectLoading] = useState(true);
  const [formKey, setFormKey] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submittedMatriculaId, setSubmittedMatriculaId] = useState<number | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setFirebaseUser(nextUser);
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (firebaseUser) {
      window.sessionStorage.removeItem(FORM_AUTH_PENDING_KEY);
      setLoginError(null);
      setAuthRedirectLoading(false);
    }
  }, [firebaseUser]);

  useEffect(() => {
    let active = true;
    const resolveRedirectResult = async () => {
      setAuthRedirectLoading(true);
      setLoginError(null);
      try {
        const result = await withTimeout(getRedirectResult(auth), 14000, 'getRedirectResult');
        if (!active) return;

        if (result?.user || auth.currentUser) {
          window.sessionStorage.removeItem(FORM_AUTH_PENDING_KEY);
          setAuthRedirectLoading(false);
          return;
        }

        const hadPendingAttempt = Boolean(window.sessionStorage.getItem(FORM_AUTH_PENDING_KEY));
        if (hadPendingAttempt) {
          await withTimeout(auth.authStateReady(), 12000, 'authStateReady');
          if (!active) return;
          if (auth.currentUser) {
            window.sessionStorage.removeItem(FORM_AUTH_PENDING_KEY);
            setAuthRedirectLoading(false);
            return;
          }

          window.sessionStorage.removeItem(FORM_AUTH_PENDING_KEY);
          setAuthRedirectLoading(false);
          setLoginError('No se pudo completar el acceso con Google. Vuelve a abrir el formulario para intentarlo nuevamente.');
          return;
        }
      } catch (nextError) {
        console.error('Error completing standalone matricula redirect:', nextError);
        if (!active) return;
        window.sessionStorage.removeItem(FORM_AUTH_PENDING_KEY);
        setAuthRedirectLoading(false);
        setLoginError('No se pudo completar el acceso con Google.');
      } finally {
        if (active) setRedirectChecked(true);
      }
    };

    void resolveRedirectResult();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!authReady || !redirectChecked || firebaseUser || redirectStartedRef.current || loginError) return;

    let active = true;
    const startGoogleRedirect = async () => {
      redirectStartedRef.current = true;
      setAuthRedirectLoading(true);
      setLoginError(null);
      try {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({
          hd: WORKSPACE_DOMAIN,
          ...(forceSelectAccountRef.current ? { prompt: 'select_account' } : {}),
        });
        window.sessionStorage.setItem(FORM_AUTH_PENDING_KEY, '1');
        await signInWithRedirect(auth, provider);
      } catch (nextError) {
        console.error('Error signing in to standalone matricula form:', nextError);
        if (!active) return;
        redirectStartedRef.current = false;
        window.sessionStorage.removeItem(FORM_AUTH_PENDING_KEY);
        setAuthRedirectLoading(false);
        setLoginError('No se pudo iniciar el acceso con Google.');
      }
    };

    void startGoogleRedirect();
    return () => {
      active = false;
    };
  }, [authReady, firebaseUser, loginError, redirectChecked]);

  useEffect(() => {
    let active = true;
    const loadAccessData = async () => {
      if (!firebaseUser) {
        setSettings(defaultAppSettings);
        setSemestres([]);
        setResponsibleAllowed(false);
        setError(null);
        setLoadingAccess(false);
        return;
      }

      setLoadingAccess(true);
      setError(null);
      try {
        const getFormularioMatriculaConfiguracion = httpsCallable<undefined, {
          settings?: Partial<AppSettings>;
          semestres?: SemestreOption[];
        }>(
          functions,
          'getFormularioMatriculaConfiguracion',
          { timeout: 12000 },
        );
        const getResponsable = httpsCallable(
          functions,
          'getFormularioMatriculaResponsableActual',
          { timeout: 12000 },
        );
        const [configuracionResult] = await Promise.all([
          withTimeout(getFormularioMatriculaConfiguracion(), 14000, 'getFormularioMatriculaConfiguracion'),
          withTimeout(getResponsable(), 14000, 'getFormularioMatriculaResponsableActual'),
        ]);
        if (!active) return;
        setSettings(normalizeStandaloneSettings(configuracionResult.data.settings));
        setSemestres(configuracionResult.data.semestres || []);
        setResponsibleAllowed(true);
      } catch (nextError) {
        console.error('Error loading standalone matricula form:', nextError);
        if (active) {
          setResponsibleAllowed(false);
          setError('Solo personal o superusuario puede llenar este formulario.');
        }
      } finally {
        if (active) setLoadingAccess(false);
      }
    };

    void loadAccessData();
    return () => {
      active = false;
    };
  }, [firebaseUser]);

  const selectedSemestre = useMemo(
    () => (
      mode === 'siguiente'
        ? getNextSemestre(semestres, settings.general.semestreActualId)
        : semestres.find((semestre) => semestre.id === settings.general.semestreActualId) ?? null
    ),
    [mode, semestres, settings.general.semestreActualId],
  );
  const acceptsResponses = mode === 'siguiente'
    ? Boolean(settings.formularioMatricula?.siguienteAceptaRespuestas)
    : Boolean(settings.formularioMatricula?.aceptaRespuestas);
  const backgroundColor = mode === 'siguiente'
    ? settings.formularioMatricula.siguienteFondoColor
    : settings.formularioMatricula.fondoColor;
  const accentColor = darkenHexColor(backgroundColor);
  const pageLoading = !authReady || Boolean(firebaseUser && loadingAccess) || Boolean(!firebaseUser && authRedirectLoading && !loginError);

  const handleSaved = useCallback((result?: { id?: number }) => {
    setSubmittedMatriculaId(Number(result?.id) || null);
    setFormKey((current) => current + 1);
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleNewMatricula = useCallback(() => {
    setSubmitted(false);
    setSubmittedMatriculaId(null);
    setFormKey((current) => current + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleOpenFichaMatricula = useCallback(() => {
    if (!submittedMatriculaId) return;
    window.open(`/sueltos/intranet/matriculas/ficha?matriculaId=${submittedMatriculaId}`, '_blank', 'noopener,noreferrer');
  }, [submittedMatriculaId]);

  const handleSwitchAccount = useCallback(async () => {
    setError(null);
    setLoginError(null);
    redirectStartedRef.current = false;
    forceSelectAccountRef.current = true;
    window.sessionStorage.removeItem(FORM_AUTH_PENDING_KEY);
    await signOut(auth);
  }, []);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: backgroundColor,
        pt: { xs: 1.25, md: 2 },
        pb: { xs: 2, md: 4 },
        px: { xs: 1.5, md: 2 },
      }}
    >
      <Stack spacing={2} sx={{ width: '100%', maxWidth: 640, mx: 'auto' }}>
        <Paper elevation={0} sx={{ overflow: 'hidden', borderRadius: 1, border: '1px solid #dadce0' }}>
          <Box
            component="img"
            src="/media/matricula/encabezado-formulario-matricula.png"
            alt="CETPRO San Martin de Porres"
            sx={{ display: 'block', width: '100%', height: 'auto' }}
          />
        </Paper>

        <Paper
          elevation={0}
          sx={{
            borderRadius: 1,
            border: '1px solid #dadce0',
            borderTop: `10px solid ${accentColor}`,
            p: { xs: 2, md: 3 },
            bgcolor: '#fffdf9',
          }}
        >
          <Stack spacing={0.75}>
            <Typography variant="h4" component="h1" fontWeight={700}>
              MATRICULA {selectedSemestre?.titulo || selectedSemestre?.nombre || ''}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Inicio de Clases: {formatDate(selectedSemestre?.inicio) || 'Por definir'}
            </Typography>
          </Stack>
        </Paper>

        {pageLoading ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <CircularProgress />
          </Box>
        ) : !firebaseUser ? (
          <Alert severity={loginError ? 'warning' : 'info'}>
            {loginError || 'Abriendo el acceso con Google institucional...'}
          </Alert>
        ) : error ? (
          <Stack spacing={1.5}>
            <Alert severity="error">{error}</Alert>
            <Button variant="outlined" onClick={handleSwitchAccount} sx={{ alignSelf: 'flex-start' }}>
              Usar otra cuenta
            </Button>
          </Stack>
        ) : !acceptsResponses ? (
          <Stack spacing={1.5}>
            <Alert severity="info">El formulario no acepta respuestas en este momento.</Alert>
            <Button variant="outlined" onClick={handleSwitchAccount} sx={{ alignSelf: 'flex-start' }}>
              Usar otra cuenta
            </Button>
          </Stack>
        ) : !selectedSemestre ? (
          <Alert severity="error">No se ha definido el semestre de matricula.</Alert>
        ) : !responsibleAllowed ? (
          <Alert severity="error">Solo personal o superusuario puede llenar este formulario.</Alert>
        ) : submitted ? (
          <Paper elevation={0} sx={{ p: { xs: 3, md: 4 }, bgcolor: '#fffdf9', borderRadius: 2 }}>
            <Stack spacing={2.5} alignItems="flex-start">
              <Typography variant="h5" fontWeight={700}>
                Gracias por matricularte y formar parte de nuestra familia San Martina
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
                <Button variant="contained" onClick={handleNewMatricula}>
                  Nueva matricula
                </Button>
                <Button variant="outlined" onClick={handleOpenFichaMatricula} disabled={!submittedMatriculaId}>
                  Ver ficha de matricula
                </Button>
              </Stack>
            </Stack>
          </Paper>
        ) : (
          <Box>
            <MatriculaForm
              key={`matricula-suelta-${mode}-${formKey}`}
              isOpen
              onCancel={handleSwitchAccount}
              onReset={handleNewMatricula}
              onSaved={handleSaved}
              defaultSemestreId={selectedSemestre.id}
              reconocimientoDniActivo={settings.formularioMatricula.activarReconocimientoDni}
              formVariant="standalone"
              standaloneFormKind={mode === 'siguiente' ? 'siguiente' : 'actual'}
              hideSemestreControl
            />
          </Box>
        )}
      </Stack>
    </Box>
  );
}

export default function MatriculaSueltaPage() {
  return <MatriculaStandalonePage mode="actual" />;
}
