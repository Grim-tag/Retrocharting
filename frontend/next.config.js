/** @type {import('next').NextConfig} */
const nextConfig = {
    reactCompiler: true,
    typescript: {
        ignoreBuildErrors: true,
    },
    productionBrowserSourceMaps: false,
    output: 'export', // FORCED
    images: { unoptimized: true },
    images: { unoptimized: true },
};

module.exports = nextConfig;
