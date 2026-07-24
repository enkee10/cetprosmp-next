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
  async headers() {
    return [
      {
        source: "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, max-age=0, must-revalidate",
          },
        ],
      },
    ];
  },

  /**
   * 1. ESLint
   */
  eslint: {
    ignoreDuringBuilds: true,
  },

  /**
   * 2. TypeScript
   */
  typescript: {
    ignoreBuildErrors: true,
  },

  /**
   * 3. allowedDevOrigins
   */
  // allowedDevOrigins: [
  //   ...allowedDevOrigins,
  // ],

  /**
   * 4. Experimental
   */
  // experimental: {
  //   optimizePackageImports: ["@mui/material", "@mui/icons-material"],
  // },

  /**
   * 5. onDemandEntries
   */
  onDemandEntries: {
    pagesBufferLength: 10,
    maxInactiveAge: 1000 * 60 * 10, // 10 minutos
  },

  /**
   * 6. Configuración de imágenes externas
   */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cetprosmp.edu.pe",
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "admin.cetprosmp.edu.pe",
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "img.youtube.com",
        pathname: "/vi/**",
      },
      {
        protocol: "https",
        hostname: "api.qrserver.com",
        pathname: "/v1/create-qr-code/**",
      },
    ],
  },
};

export default nextConfig;
