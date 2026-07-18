'use client';

import { useEffect } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { useRouter } from 'next/navigation';
import EstructuraAcademicaMasterDetail from '@/components/intranet/academico/EstructuraAcademicaMasterDetail';
import { useAuth } from '@/context/AuthContext';

const TEACHER_ROLE_ID = 4;

export default function EstructuraAcademicaPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const isDocente = Number(user?.role ?? 0) === TEACHER_ROLE_ID && Number(user?.level ?? 0) < 600;

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
