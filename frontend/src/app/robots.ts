import { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
    if (process.env.CAPACITOR_BUILD === 'true') {
        return { rules: { userAgent: '*', allow: '/' } };
    }
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: [
                '/api/',
                '/_next/',
                '/static/',
                '/admin/',
                '/en/admin/',
                '/fr/admin/',
                '/profile/',
                '/en/profile/',
                '/fr/profile/',
                '/collection/',
                '/en/collection/',
                '/fr/collection/',
                '/import/',
                '/en/import/',
                '/fr/import/',
                '/user/',
                '/en/user/',
                '/fr/user/',
            ],
        },
        sitemap: 'https://retrocharting.com/sitemap.xml',
    };
}
