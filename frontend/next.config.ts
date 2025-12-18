import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true, // Experimental
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // Critical for low-memory build environments (Render Free Tier 512MB).
    ignoreBuildErrors: true,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  // Disable source maps in production to save memory/build time
  productionBrowserSourceMaps: false,

  // Experimental: Restrict CPU usage? No official config for that in Next.js directly

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
