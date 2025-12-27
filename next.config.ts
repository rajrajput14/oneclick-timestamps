import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
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
        '**/*.json'
      ],
    };
    return config;
  },
};

export default nextConfig;
