
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: [
                '/api/',
                '/_next/',
                '/static/',

                // Admin
                '/admin/',
                '/en/admin/',
                '/fr/admin/',

                // Private User Area (Profile, Collection, Settings)
                '/profile/',
                '/en/profile/',
                '/fr/profile/',
                '/collection/',
                '/en/collection/',
                '/fr/collection/',
                '/import/',
                '/en/import/',
                '/fr/import/',

                // Public Profiles (Currently blocked as per instruction to ignore "page ... profile")
                '/user/',
                '/en/user/',
                '/fr/user/',
            ],
        },
        sitemap: 'https://retrocharting.com/sitemap.xml',
    };
}
