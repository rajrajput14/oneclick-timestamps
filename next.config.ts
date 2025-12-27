import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack configuration to silence build errors in Next.js 16
  turbopack: {},

  // Standalone output for better Railway/Docker support
  output: 'standalone',

  webpack: (config, { dev, isServer }) => {
    if (dev) {
      config.watchOptions = {
        ignored: [
          '**/.git/**',
          '**/.next/**',
          '**/node_modules/**',
          '**/tmp/**',
          '**/temp/**',
          '**/uploads/**',
          '**/*.log',
          '**/*.wav',
          '**/*.mp3',
          '**/*.mp4',
          '**/diagnostic*.json',
          '**/runtime*.json',
          '**/*-player-script.js'
        ],
      };
    }
    return config;
  },
};

export default nextConfig;
