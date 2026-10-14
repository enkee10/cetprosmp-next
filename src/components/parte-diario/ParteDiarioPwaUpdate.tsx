'use client';

import { useEffect, useState } from 'react';
import { Alert, Button, IconButton, Snackbar } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

export default function ParteDiarioPwaUpdate() {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    // No worker, background sync or Cache Storage: the existing authenticated requests
    // continue going directly to Firebase. Poll only the public build identifier.
    let initialVersion: string | null = null;
    let dismissedVersion: string | null = null;
    let active = true;
    let checking = false;
    let controller: AbortController | null = null;

    const check = async () => {
      if (!active || checking || document.visibilityState !== 'visible' || !navigator.onLine) return;
      checking = true;
      controller = new AbortController();
      const timeout = window.setTimeout(() => controller?.abort(), 10000);
      try {
        const response = await fetch('/parte-diario/version.json', {
          cache: 'no-store', credentials: 'omit', signal: controller.signal,
        });
        if (!response.ok) return;
        const data: unknown = await response.json();
        const version = (data as { version?: unknown } | null)?.version;
        if (!active || typeof version !== 'string' || !version) return;
        if (initialVersion === null) initialVersion = version;
        else if (version !== initialVersion && version !== dismissedVersion) {
          dismissedVersion = version;
          setAvailable(true);
        }
      } catch {
        // Connectivity failures do not interrupt the form or affect saved records.
      } finally {
        window.clearTimeout(timeout);
        checking = false;
      }
    };

    const onResume = () => { void check(); };
    void check();
    const interval = window.setInterval(onResume, 5 * 60 * 1000);
    document.addEventListener('visibilitychange', onResume);
    window.addEventListener('online', onResume);
    return () => {
      active = false;
      controller?.abort();
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onResume);
      window.removeEventListener('online', onResume);
    };
  }, []);

  return <Snackbar open={available} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
    <Alert severity="info" onClose={() => setAvailable(false)} closeText="Cerrar" action={
      <><Button color="inherit" onClick={() => setAvailable(false)}>Después</Button>
        <Button color="inherit" onClick={() => window.location.reload()}>Actualizar</Button>
        <IconButton size="small" color="inherit" aria-label="Cerrar aviso de actualización" onClick={() => setAvailable(false)}><CloseIcon fontSize="small" /></IconButton></>
    }>
      Hay una nueva versión. Guarda tus cambios antes de actualizar.
    </Alert>
  </Snackbar>;
}
