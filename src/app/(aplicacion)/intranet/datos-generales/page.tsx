'use client';

import { Box } from '@mui/material';
import IntranetListLayout from '@/components/intranet/IntranetListLayout';
import { DatoGeneralForm } from '@/components/intranet/datos-generales/DatoGeneralForm';

export default function DatosGeneralesPage() {
  return (
    <IntranetListLayout title="Datos Generales">
      <Box sx={{ px: 2, pb: 3, maxWidth: 920 }}>
        <DatoGeneralForm asModal />
      </Box>
    </IntranetListLayout>
  );
}
