/**
 * Configuración principal de Next.js
 * Este archivo controla opciones del servidor de desarrollo
 * y del build de producción.
 */

import type { NextConfig } from "next";

const allowedDevOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://*.cloudworkstations.dev",
  "https://*.firebase.studio",
  "https://cetprosmp.edu.pe",
  ...(process.env.ALLOWED_DEV_ORIGINS
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? []),
];

const nextConfig: NextConfig = {
  /**
   * ---------------------------------------------------------
   * 1. ESLint
   * ---------------------------------------------------------
   * Evita que el build falle si hay errores de lint.
   * Útil mientras el proyecto sigue en desarrollo.
   */
  eslint: {
    ignoreDuringBuilds: true,
  },

  /**
   * ---------------------------------------------------------
   * 2. TypeScript
   * ---------------------------------------------------------
   * Permite construir el proyecto aunque existan errores
   * de tipado. En desarrollo acelera el avance.
   *
   * En producción, lo ideal sería corregir los errores
   * y luego cambiar esto a false.
   */
  typescript: {
    ignoreBuildErrors: true,
  },

  /**
   * ---------------------------------------------------------
   * 3. allowedDevOrigins
   * ---------------------------------------------------------
   * Autoriza orígenes remotos en desarrollo.
   * Esto ayuda a evitar errores cross-origin en Firebase Studio
   * y Cloud Workstations para recursos internos de Next.
   */
  allowedDevOrigins: [
    ...allowedDevOrigins,
  ],

  /**
   * ---------------------------------------------------------
   * 4. Experimental
   * ---------------------------------------------------------
   * optimizePackageImports ayuda a reducir trabajo innecesario
   * cuando usas librerías grandes como MUI.
   */
  experimental: {
    optimizePackageImports: ["@mui/material", "@mui/icons-material"],
  },

  /**
   * ---------------------------------------------------------
   * 5. onDemandEntries
   * ---------------------------------------------------------
   * Mejora la experiencia en desarrollo:
   *
   * - pagesBufferLength:
   *   cantidad de páginas que Next mantiene en memoria.
   *   Subirlo evita recompilaciones molestas cuando vuelves
   *   a páginas recientes.
   *
   * - maxInactiveAge:
   *   tiempo en milisegundos que una página puede quedar
   *   inactiva antes de ser descartada.
   *
   * En proyectos medianos o grandes como el tuyo, esto suele
   * hacer el entorno de desarrollo más estable.
   */
  onDemandEntries: {
    pagesBufferLength: 10,
    maxInactiveAge: 1000 * 60 * 10, // 10 minutos
  },

  /**
   * ---------------------------------------------------------
   * 6. Configuración de imágenes externas
   * ---------------------------------------------------------
   * Next/Image necesita que declares los dominios externos
   * permitidos para cargar imágenes.
   */
  images: {
    remotePatterns: [
      /**
       * Imágenes públicas del dominio principal
       */
      {
        protocol: "https",
        hostname: "cetprosmp.edu.pe",
        pathname: "/uploads/**",
      },

      /**
       * Imágenes servidas desde el subdominio admin
       */
      {
        protocol: "https",
        hostname: "admin.cetprosmp.edu.pe",
        pathname: "/uploads/**",
      },

      /**
       * Miniaturas de YouTube
       */
      {
        protocol: "https",
        hostname: "img.youtube.com",
        pathname: "/vi/**",
      },

      /**
       * Servicio externo de generación de QR
       */
      {
        protocol: "https",
        hostname: "api.qrserver.com",
        pathname: "/v1/create-qr-code/**",
      },
    ],
  },
};

export default nextConfig;
