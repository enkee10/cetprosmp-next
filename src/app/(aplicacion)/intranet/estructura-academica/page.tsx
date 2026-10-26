'use client';

import { isDocenteRole } from '@/lib/intranetPermissions';

import { useEffect } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { useRouter } from 'next/navigation';
import EstructuraAcademicaMasterDetail from '@/components/intranet/academico/EstructuraAcademicaMasterDetail';
import { useAuth } from '@/context/AuthContext';

export default function EstructuraAcademicaPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const isDocente = isDocenteRole(user?.role) && Number(user?.level ?? 0) < 600;

  useEffect(() => {
    if (!loading && isDocente) {
      router.replace('/intranet/estructura-academica-docente');
    }
  }, [isDocente, loading, router]);

  if (loading || isDocente) {
    return (
      <Box sx={{ minHeight: 360, display: 'grid', placeItems: 'center' }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  return <EstructuraAcademicaMasterDetail />;
}
