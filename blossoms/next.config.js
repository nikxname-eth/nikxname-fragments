const { PHASE_DEVELOPMENT_SERVER } = require('next/constants');

/** @type {import('next').NextConfig} */
const shared = {
  distDir: '.next',
  reactStrictMode: false,
  images: { unoptimized: true },
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  experimental: {
    externalDir: true,
  },
  turbopack: {},
};

module.exports = (phase) => {
  const isDev = phase === PHASE_DEVELOPMENT_SERVER;
  return {
    ...shared,
    // Star library API is local-dev only. Static export has no server.
    ...(isDev ? {} : { output: 'export' }),
  };
};
