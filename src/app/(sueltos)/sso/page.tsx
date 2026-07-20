'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Paper, Stack } from '@mui/material';
import { getRedirectResult, GoogleAuthProvider, onAuthStateChanged, signInWithRedirect } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';

const WORKSPACE_DOMAIN = 'cetprosmp.edu.pe';
const SSO_PENDING_KEY = 'cetprosmp.workspaceSso.pending';
const SSO_LEGACY_ATTEMPT_KEY = 'cetprosmp.workspaceSso.lastAttempt';

const getSafeNextPath = () => {
  if (typeof window === 'undefined') return '/intranet';
  const next = new URL(window.location.href).searchParams.get('next')?.trim();
  if (!next || !next.startsWith('/') || next.startsWith('//')) return '/intranet';
  return next;
};

const getWorkspaceLoginHint = () => {
  if (typeof window === 'undefined') return null;
  const loginHint = new URL(window.location.href).searchParams.get('login_hint')?.trim() ?? '';
  return /^[^\s@]+@cetprosmp\.edu\.pe$/i.test(loginHint) ? loginHint : null;
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

export default function WorkspaceSsoPage() {
  const router = useRouter();
  const startedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [retryReady, setRetryReady] = useState(false);

  const clearWorkspaceAttempt = useCallback(() => {
    window.sessionStorage.removeItem(SSO_PENDING_KEY);
    window.sessionStorage.removeItem(SSO_LEGACY_ATTEMPT_KEY);
  }, []);

  const completeWorkspaceSignIn = useCallback(() => {
    clearWorkspaceAttempt();
    router.replace(getSafeNextPath());
  }, [clearWorkspaceAttempt, router]);

  const startWorkspaceSignIn = useCallback(async () => {
    setError(null);
    setRetryReady(false);
    startedRef.current = true;

    try {
      const provider = new GoogleAuthProvider();
      const loginHint = getWorkspaceLoginHint();
      provider.setCustomParameters({
        hd: WORKSPACE_DOMAIN,
        prompt: 'select_account',
        ...(loginHint ? { login_hint: loginHint } : {}),
      });
      window.sessionStorage.setItem(SSO_PENDING_KEY, '1');
      window.sessionStorage.removeItem(SSO_LEGACY_ATTEMPT_KEY);
      await signInWithRedirect(auth, provider);
    } catch (err) {
      console.error('Error starting Workspace SSO:', err);
      clearWorkspaceAttempt();
      startedRef.current = false;
      setRetryReady(true);
      setError('No se pudo iniciar el acceso con Google Workspace.');
    }
  }, [clearWorkspaceAttempt, completeWorkspaceSignIn]);

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!active || !firebaseUser) return;
      completeWorkspaceSignIn();
    });

    const resolveRedirectResult = async () => {
      try {
        const result = await withTimeout(getRedirectResult(auth), 12000, 'getRedirectResult');
        if (!active) return;

        if (result?.user || auth.currentUser) {
          completeWorkspaceSignIn();
          return;
        }

        const hasPendingAttempt = Boolean(window.sessionStorage.getItem(SSO_PENDING_KEY) || window.sessionStorage.getItem(SSO_LEGACY_ATTEMPT_KEY));
        if (hasPendingAttempt) {
          await withTimeout(auth.authStateReady(), 12000, 'authStateReady');
          if (!active) return;
          if (auth.currentUser) {
            completeWorkspaceSignIn();
            return;
          }

          clearWorkspaceAttempt();
          startedRef.current = false;
          setRetryReady(true);
          setError('No se pudo completar el acceso con Google Workspace. Puedes intentarlo nuevamente.');
          return;
        }

        void startWorkspaceSignIn();
      } catch (err) {
        console.error('Error completing Workspace SSO:', err);
        if (!active) return;

        clearWorkspaceAttempt();
        startedRef.current = false;
        setRetryReady(true);
        setError('No se pudo completar el acceso con Google Workspace.');
      }
    };

    void resolveRedirectResult();

    return () => {
      active = false;
      unsubscribe();
    };
  }, [clearWorkspaceAttempt, completeWorkspaceSignIn, startWorkspaceSignIn]);

  const isLoading = !error && !retryReady;

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
      {isLoading ? (
        <CircularProgress size={28} />
      ) : (
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
                  clearWorkspaceAttempt();
                  void startWorkspaceSignIn();
                }}
              >
                Intentar nuevamente
              </Button>
            ) : null}
          </Stack>
        </Paper>
      )}
    </Box>
  );
}
