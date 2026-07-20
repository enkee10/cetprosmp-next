'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import { httpsCallable } from 'firebase/functions';
import { useRouter } from 'next/navigation';
import { MatriculaForm } from '@/app/(aplicacion)/intranet/matriculas/page';
import { useAuth } from '@/context/AuthContext';
import { useAppSettings } from '@/hooks/useAppSettings';
import { functions } from '@/lib/firebase';

interface SemestreOption {
  id: number;
  titulo?: string | null;
  nombre?: string | null;
  inicio?: string | null;
  fin?: string | null;
}

const parseSemestreDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (value?: string | null) => {
  const date = parseSemestreDate(value);
  if (!date) return '';
  return new Intl.DateTimeFormat('es-PE', { dateStyle: 'long' }).format(date);
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

export default function MatriculaSueltaPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { settings, loading: settingsLoading } = useAppSettings();
  const [semestres, setSemestres] = useState<SemestreOption[]>([]);
  const [loadingSemestres, setLoadingSemestres] = useState(true);
  const [checkingResponsible, setCheckingResponsible] = useState(true);
  const [responsibleAllowed, setResponsibleAllowed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/sso?next=/matricula');
    }
  }, [authLoading, router, user]);

  useEffect(() => {
    let active = true;
    const loadSemestres = async () => {
      if (!user) {
        setLoadingSemestres(false);
        return;
      }
      setLoadingSemestres(true);
      setError(null);
      try {
        const listMatriculaSemestres = httpsCallable<undefined, { semestres?: SemestreOption[] }>(
          functions,
          'listMatriculaSemestres',
          { timeout: 12000 },
        );
        const result = await withTimeout(listMatriculaSemestres(), 14000, 'listMatriculaSemestres');
        if (active) setSemestres(result.data.semestres || []);
      } catch (nextError) {
        console.error('Error loading semestres for matricula form:', nextError);
        if (active) setError('No se pudo cargar el periodo de matricula.');
      } finally {
        if (active) setLoadingSemestres(false);
      }
    };

    void loadSemestres();
    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    let active = true;
    const checkResponsible = async () => {
      if (!user) {
        setCheckingResponsible(false);
        setResponsibleAllowed(false);
        return;
      }
      setCheckingResponsible(true);
      try {
        const getMatriculaResponsableActual = httpsCallable(functions, 'getMatriculaResponsableActual', { timeout: 12000 });
        await withTimeout(getMatriculaResponsableActual(), 14000, 'getMatriculaResponsableActual');
        if (active) setResponsibleAllowed(true);
      } catch (nextError) {
        console.error('Error checking matricula responsible:', nextError);
        if (active) {
          setResponsibleAllowed(false);
          setError('Solo personal o superusuario puede llenar este formulario.');
        }
      } finally {
        if (active) setCheckingResponsible(false);
      }
    };

    void checkResponsible();
    return () => {
      active = false;
    };
  }, [user]);

  const selectedSemestre = useMemo(
    () => semestres.find((semestre) => semestre.id === settings.formularioMatricula?.semestreId) ?? null,
    [semestres, settings.formularioMatricula?.semestreId],
  );
  const acceptsResponses = Boolean(settings.formularioMatricula?.aceptaRespuestas);
  const waitingForLoginRedirect = !authLoading && !user;
  const pageLoading = authLoading || waitingForLoginRedirect || settingsLoading || loadingSemestres || checkingResponsible;

  const handleSaved = useCallback(() => {
    setFormKey((current) => current + 1);
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleNewMatricula = useCallback(() => {
    setSubmitted(false);
    setFormKey((current) => current + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#d8f3fb',
        pt: { xs: 1.25, md: 2 },
        pb: { xs: 2, md: 4 },
        px: { xs: 1.5, md: 2 },
      }}
    >
      <Stack spacing={2} sx={{ width: '100%', maxWidth: 640, mx: 'auto' }}>
        <Paper elevation={0} sx={{ overflow: 'hidden', borderRadius: 1, border: '1px solid #dfb983' }}>
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
            borderTop: '10px solid #1d7f53',
            borderRadius: 1,
            borderColor: '#dfb983',
            borderStyle: 'solid',
            borderWidth: '10px 1px 1px',
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
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : !acceptsResponses ? (
          <Alert severity="info">El formulario no acepta respuestas en este momento.</Alert>
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
            <Button variant="contained" onClick={handleNewMatricula}>
              Nueva matricula
            </Button>
            </Stack>
          </Paper>
        ) : (
          <Box>
            <MatriculaForm
              key={`matricula-suelta-${formKey}`}
              isOpen
              onCancel={() => router.push('/intranet')}
              onSaved={handleSaved}
              defaultSemestreId={selectedSemestre.id}
              formVariant="standalone"
              hideSemestreControl
              hideRecognitionModeControl
            />
          </Box>
        )}
      </Stack>
    </Box>
  );
}
