import { Inter } from 'next/font/google';
import '@/app/globals.css';
import Header from '@/components/Header/Header';
import { Box } from '@mui/material';
import metadata from './metadata'; // importamos directamente el objeto completo
import Footer from '@/components/Footer/Footer';

const inter = Inter({ subsets: ['latin'] });

// Exportamos directamente el metadata definido en metadata.ts
export { metadata };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box className={`layout ${inter.className}`}>
      <Box component="header">
        <Header />
      </Box>
      <Box
        component="main"
        sx={{ mt: { xs: '48px', md: '64px' }, maxWidth: '1000px', mx: 'auto'}}
      >
        {children}
      </Box>
      <Footer/>
    </Box>
  );
}
