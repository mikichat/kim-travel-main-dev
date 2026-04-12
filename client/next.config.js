/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@tourworld/shared'],
  // 워크스페이스 루트 경고 해결을 위한 Turbopack root 설정
  turbopack: {
    root: path.resolve(__dirname),
  },
};

module.exports = nextConfig;