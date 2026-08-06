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
};

module.exports = nextConfig;
