/** @type {import('next').NextConfig} */
const nextConfig = {
    typescript: {
        ignoreBuildErrors: true,
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    productionBrowserSourceMaps: false,
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: 'i.ebayimg.com' },
            { protocol: 'https', hostname: 'm.media-amazon.com' },
            { protocol: 'https', hostname: 'www.pricecharting.com' },
            { protocol: 'https', hostname: 'images-na.ssl-images-amazon.com' },
            { protocol: 'https', hostname: 'res.cloudinary.com' }
        ],
    },
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
                source: '/accessories/console/:slug',
                destination: '/accessories/:slug',
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
