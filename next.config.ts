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
          '**/node_modules/**',
          '**/.next/**',
          '**/tmp/**',
          '**/temp/**',
          '**/uploads/**',
          '**/*.log',
          '**/*.wav',
          '**/*.mp3',
          '**/*.mp4',
          '**/*.json',
          '**/*-player-script.js'
        ],
      };
    }
    return config;
  },
};

export default nextConfig;
