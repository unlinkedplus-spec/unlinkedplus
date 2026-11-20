import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  // Reduce memory usage during build
  experimental: {
    optimizePackageImports: ['react', 'react-dom'],
  },
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: '192.168.1.20' },
    ],
  },
  async rewrites() {
    return process.env.NODE_ENV === 'development'
      ? [{ source: '/api/:path*', destination: 'http://127.0.0.1:3001/:path*' }]
      : [];
  },
};
export default nextConfig;
