/** @type {import('next').NextConfig} */
const nextConfig = {
    typescript: {
        ignoreBuildErrors: true,
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    productionBrowserSourceMaps: false,
    images: { unoptimized: true },
    async redirects() {
        return [
            {
                source: '/fr/jeux-video/:slug*',
                destination: '/fr/games/:slug*',
                permanent: true,
            },
            {
                source: '/:lang/accessories/console/:slug',
                destination: '/:lang/accessories/:slug',
                permanent: true,
            },
            {
                source: '/sitemap_index.xml',
                destination: '/sitemap.xml',
                permanent: true,
            },
        ];
    },
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: 'https://retrocharting-backend.onrender.com/api/:path*',
            },
        ];
    },
};

module.exports = nextConfig;
