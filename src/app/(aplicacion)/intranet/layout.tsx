'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Alert, Box, Button, CircularProgress } from '@mui/material';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useIntranetPermissions } from '@/hooks/useIntranetPermissions';
import IntranetSidebar from '@/components/intranet/IntranetSidebar'; // + Import centralizado en el nuevo componente unificado
import { canAccessIntranet } from '@/lib/intranetPermissions';

export default function IntranetLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    const { user, loading } = useAuth();
    const { settings, loading: loadingSettings, error: settingsError, reload } = useAppSettings();
    useIntranetPermissions();
    const router = useRouter();
    const hasIntranetAccess = canAccessIntranet(user?.role, user?.level, user?.roleTitle, user?.email);

    useEffect(() => {
      // Wait until the authentication state is loaded
      if (!loading) {
        // If there is no user or the user's permission level is too low,
        // redirect them to the home page.
        if (!user || !hasIntranetAccess) {
          router.push('/');
        }
      }
    }, [user, loading, router, hasIntranetAccess]); // Rerun the effect if these dependencies change

    // While loading, or if the user doesn't meet the criteria,
    // show a loading spinner. This prevents a flash of the protected content.
    if (loading || !user || !hasIntranetAccess) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (settingsError && !settings.general.semestreActualId) {
        return <Alert severity="error" action={<Button onClick={() => void reload()}>Reintentar</Button>}>
            No se pudo cargar la configuración de la intranet.
        </Alert>;
    }

    // If the user is authenticated and has the required permission level,
    // render the normal intranet layout.
    return (
        <Box
            sx={{
              display: 'flex',
              width: '100vw',
              maxWidth: '100vw',
              minWidth: 0,
              ml: 'calc(50% - 50vw)',
              mt: { xs: '0px', md: '-16px' },
            }}
        >
            <IntranetSidebar />
            <Box
                component="main"
                sx={{
                  flexGrow: 1,
                  minWidth: 0,
                  overflowX: 'hidden',
                  bgcolor: '#fff8e8',
                  p: { xs: '0px', md: '10px' },
                }}
            >
                <Box sx={{ minHeight: 0 }} />
                {loadingSettings
                  ? <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
                  : children}
            </Box>
        </Box>
    );
  }
