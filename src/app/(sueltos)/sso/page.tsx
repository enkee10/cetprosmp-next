'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Paper, Stack } from '@mui/material';
import { GoogleAuthProvider, signInWithRedirect } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

const WORKSPACE_DOMAIN = 'cetprosmp.edu.pe';
const SSO_ATTEMPT_KEY = 'cetprosmp.workspaceSso.lastAttempt';
const RECENT_ATTEMPT_MS = 15000;

const getSafeNextPath = () => {
  if (typeof window === 'undefined') return '/intranet';
  const next = new URL(window.location.href).searchParams.get('next')?.trim();
  if (!next || !next.startsWith('/') || next.startsWith('//')) return '/intranet';
  return next;
};

export default function WorkspaceSsoPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const startedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [retryReady, setRetryReady] = useState(false);

  const startWorkspaceSignIn = useCallback(async () => {
    setError(null);
    setRetryReady(false);
    startedRef.current = true;

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ hd: WORKSPACE_DOMAIN });
      window.sessionStorage.setItem(SSO_ATTEMPT_KEY, String(Date.now()));
      await signInWithRedirect(auth, provider);
    } catch (err) {
      console.error('Error starting Workspace SSO:', err);
      window.sessionStorage.removeItem(SSO_ATTEMPT_KEY);
      startedRef.current = false;
      setRetryReady(true);
      setError('No se pudo iniciar el acceso con Google Workspace.');
    }
  }, []);

  useEffect(() => {
    if (loading) return;

    if (user) {
      window.sessionStorage.removeItem(SSO_ATTEMPT_KEY);
      router.replace(getSafeNextPath());
      return;
    }

    if (startedRef.current) return;

    const lastAttempt = Number(window.sessionStorage.getItem(SSO_ATTEMPT_KEY) || 0);
    if (lastAttempt && Date.now() - lastAttempt < RECENT_ATTEMPT_MS) {
      setRetryReady(true);
      setError('No se completo el acceso automaticamente. Puedes intentarlo nuevamente.');
      return;
    }

    void startWorkspaceSignIn();
  }, [loading, router, startWorkspaceSignIn, user]);

  if (!error && !retryReady) return null;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        bgcolor: '#f6f1e8',
        px: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 420,
          border: '1px solid rgba(90, 57, 41, 0.16)',
          borderRadius: 1,
          p: 3,
          bgcolor: '#fffaf0',
        }}
      >
        <Stack spacing={2.25} alignItems="center" textAlign="center">
          {error ? <Alert severity="warning" sx={{ width: '100%', textAlign: 'left' }}>{error}</Alert> : null}
          {retryReady ? (
            <Button
              variant="contained"
              onClick={() => {
                window.sessionStorage.removeItem(SSO_ATTEMPT_KEY);
                void startWorkspaceSignIn();
              }}
            >
              Intentar nuevamente
            </Button>
          ) : null}
        </Stack>
      </Paper>
    </Box>
  );
}
