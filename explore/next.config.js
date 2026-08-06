/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: '.next',
  images: { unoptimized: true },
  // Import shared artist config from parent package
  experimental: {
    externalDir: true,
  },
  // Silence Next 16 turbopack + empty custom config warning
  turbopack: {},
  // Allow importing synced collection JSON dumps
  webpack: (config) => {
    config.module.rules.push({
      test: /\.json$/,
      type: 'json',
    });
    return config;
  },
};

module.exports = nextConfig;
