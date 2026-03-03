// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = { 
  // ✅ Ignora errores de ESLint y Typescript en build (como tenías)
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // ✅ Configuración del optimizador de imágenes de Next //esto es nuevo
  images: {
    // Entrega las imágenes optimizadas como "inline" (no descarga el archivo)
    // contentDispositionType: 'inline',

    // Intenta servir en AVIF/WebP cuando sea posible
    //formats: ['image/avif', 'image/webp'],

    // Fuentes remotas permitidas
    remotePatterns: [
      // Permitir imágenes desde localhost (para desarrollo)
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '1337',
        pathname: '/uploads/**',
      },
      // Thumbnails de YouTube
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
        pathname: '/vi/**',
      },
      // Servicio de QR
      {
        protocol: 'https',
        hostname: 'api.qrserver.com',
        pathname: '/v1/create-qr-code/**',
      },
    ],
  },
};

module.exports = nextConfig;
