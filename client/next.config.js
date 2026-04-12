/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@tourworld/shared'],
  turbopack: {
    root: path.resolve(__dirname, '..'), // kim-travel-main-dev
  },
};

module.exports = nextConfig;
