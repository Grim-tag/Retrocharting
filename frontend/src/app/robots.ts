
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: [
                '/api/',
                '/admin/',
                '/user/', // As requested: block profiles
                '/collection', // Block private collection page
                '/_next/',
                '/static/',
            ],
        },
        sitemap: 'https://retrocharting.com/sitemap.xml',
    };
}
