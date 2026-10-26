import { Box, Typography } from '@mui/material';
import IntranetSheetsShortcut from '@/components/intranet/IntranetSheetsShortcut';

const PAGE_TITLE = 'Bienvenido a la Intranet';
export const metadata = { title: PAGE_TITLE };

export default function IntranetPage() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        {PAGE_TITLE}
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        <IntranetSheetsShortcut />
      </Box>
    </Box>
  );
}
