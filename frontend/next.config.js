/** @type {import('next').NextConfig} */
const nextConfig = {
    reactCompiler: true,
    typescript: {
        ignoreBuildErrors: true,
    },
    productionBrowserSourceMaps: false,
    output: 'export', // FORCED
    images: { unoptimized: true },
    async redirects() {
        return [
            {
                source: '/admin/dashboard',
                destination: '/admin',
                permanent: true,
            },
        ]
    },
};

module.exports = nextConfig;
