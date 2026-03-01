// src/app/(sin-header)/layout.tsx
import { Inter } from 'next/font/google';
import '../../globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'CETPRO SMP',
  description: 'Descripción de mi sitio',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function SinHeaderLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
