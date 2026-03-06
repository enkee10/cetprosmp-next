/** @type {import('next').NextConfig} */
const nextConfig = {
  // ✅ Ignora errores de ESLint y Typescript en build
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // ✅ Silencia la advertencia de Cross-Origin en desarrollo
  allowedDevOrigins: [
    'https://*.cloudworkstations.dev',
  ],

  // ✅ Configuración del optimizador de imágenes de Next (limpiada)
  images: {
    remotePatterns: [
      // Mantenemos los dominios de producción y servicios externos
      {
        protocol: 'https',
        hostname: 'cetprosmp.edu.pe',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'admin.cetprosmp.edu.pe',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
        pathname: '/vi/**',
      },
      {
        protocol: 'https',
        hostname: 'api.qrserver.com',
        pathname: '/v1/create-qr-code/**',
      },
      // La regla para 'localhost:1337' ha sido eliminada
    ],
  },
};

module.exports = nextConfig;
