import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/:path*`
          : (process.env.NODE_ENV === 'production'
            ? 'https://retrocharting.onrender.com/api/:path*'
            : 'http://127.0.0.1:8000/api/:path*'),
      },
      {
        source: '/static/:path*',
        destination: process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/static/:path*`
          : (process.env.NODE_ENV === 'production'
            ? 'https://retrocharting.onrender.com/static/:path*'
            : 'http://127.0.0.1:8000/static/:path*'),
      }
    ]
  },
};

export default nextConfig;
