'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Box, CircularProgress } from '@mui/material';
import IntranetSidebar from '@/components/intranet/IntranetSidebar'; // + Import centralizado en el nuevo componente unificado
import { canAccessIntranet } from '@/lib/intranetPermissions';

export default function IntranetLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const hasIntranetAccess = canAccessIntranet(user?.role, user?.level);

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
              mt: "-16px",
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
                  p: 3,
                }}
            >
                <Box sx={{ minHeight: 0 }} />
                {children}
            </Box>
        </Box>
    );
  }
