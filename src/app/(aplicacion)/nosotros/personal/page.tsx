import { Box, Container, Typography } from '@mui/material';
import ListaPersonal from '@/components/Personal/ListaPersonal';
import personalData from '@/../public/data/personal.json';
import type { Personal } from '@/types/personal';

export default function PersonalPage() {
  const personal: Personal[] = personalData;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography
          variant="h1"
          component="h1"
          gutterBottom
          sx={{
            fontSize: 'clamp(2rem, 5vw, 3rem)',
            fontWeight: 'bold',
            pt: 5,
            pb: 1,
            textAlign: 'center',
          }}
        >
        Nuestro Personal
      </Typography>

      <Box sx={{ mt: 4 }}>
        <ListaPersonal personal={personal} />
      </Box>
    </Container>
  );
}
