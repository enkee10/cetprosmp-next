'use client';

import { Alert, Box, CircularProgress } from '@mui/material';
import EstructuraAcademicaMasterDetail from '@/components/intranet/academico/EstructuraAcademicaMasterDetail';
import { useIntranetPermissions } from '@/hooks/useIntranetPermissions';

export default function EstructuraAcademicaDocentePage() {
  const { can, loading } = useIntranetPermissions();

  if (loading) {
    return (
      <Box sx={{ minHeight: 360, display: 'grid', placeItems: 'center' }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (!can('estructura-academica', 'view')) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="info">No tienes permiso para ver este apartado.</Alert>
      </Box>
    );
  }

  return (
    <EstructuraAcademicaMasterDetail
      callableName="listEstructuraAcademicaDocente"
      title="Estructura Academica"
      canCreate={can('estructura-academica', 'create')}
      canEdit={can('estructura-academica', 'edit')}
      canDelete={can('estructura-academica', 'delete')}
      showSearch={false}
      errorMessage="No se pudo cargar la estructura academica del docente."
    />
  );
}
