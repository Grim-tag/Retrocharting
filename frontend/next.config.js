/** @type {import('next').NextConfig} */
const nextConfig = {
    typescript: {
        ignoreBuildErrors: true,
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    productionBrowserSourceMaps: false,
    // Static Export Configuration
    output: 'export',
    staticPageGenerationTimeout: 300, // 5 minutes per page (fix timeouts)
    // Image Optimization requires Node.js server, disable for static export
    images: {
        unoptimized: true,
        remotePatterns: [
            { protocol: 'https', hostname: 'i.ebayimg.com' },
            { protocol: 'https', hostname: 'm.media-amazon.com' },
            { protocol: 'https', hostname: 'www.pricecharting.com' },
            { protocol: 'https', hostname: 'images-na.ssl-images-amazon.com' },
            { protocol: 'https', hostname: 'res.cloudinary.com' }
        ],
    },
    // Limit concurrency to preventing backend overload (SQLite/Localhost)
    experimental: {
        cpus: 1,
        workerThreads: false,
    },
    // Redirects are NOT supported in 'export' mode directly.
    // async redirects() { return []; }
    // Rewrites are NOT supported in 'export' mode.
    // Client must use absolute URLs for API calls.
    // async rewrites() { ... }
};

module.exports = nextConfig;
