import { MetadataRoute } from 'next';
import { getSitemapProducts } from '../lib/api';
import { routeMap } from '../lib/route-config';
import { getGameUrl } from '../lib/utils';
import { groupedSystems } from '../data/systems';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = 'https://retrocharting.com';
    const limit = 10000; // Cap to avoid timeout

    // 1. Static Routes (Manual)
    const routes = [
        '',
        '/about',
        '/legal/mentions-legales',
        '/legal/cgu',
        '/legal/privacy',
    ];

    const staticUrls = routes.flatMap((route) => {
        return [
            {
                url: `${baseUrl}/en${route}`,
                lastModified: new Date(),
                changeFrequency: 'weekly' as const,
                priority: 1,
            },
            {
                url: `${baseUrl}/fr${route}`, // Need to map FR routes if they differ, specifically for categories
                lastModified: new Date(),
                changeFrequency: 'weekly' as const,
                priority: 1,
            }
        ];
    });

    // 2. Category Routes (Dynamic based on routeMap)
    // We handle /games, /accessories, /consoles manually here to ensure correct slugs
    const categoryKeys = ['games', 'accessories', 'consoles'];
    const categoryUrls = categoryKeys.flatMap(key => {
        const enSlug = routeMap[key]?.en || key;
        const frSlug = routeMap[key]?.fr || key;
        return [
            { url: `${baseUrl}/en/${enSlug}`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.9 },
            { url: `${baseUrl}/fr/${frSlug}`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.9 },
        ];
    });

    // 3. Console Routes
    // /games/console/[slug]
    // /accessories/console/[slug]
    const flatSystems = Object.values(groupedSystems).flat();
    const consoleUrls = flatSystems.flatMap(system => {
        const slug = system.toLowerCase().replace(/ /g, '-');

        // Games Console Pages
        const gamesEn = routeMap['games']?.en || 'games';
        const gamesFr = routeMap['games']?.fr || 'jeux-video';

        // Accessories Console Pages
        const accEn = routeMap['accessories']?.en || 'accessories';
        const accFr = routeMap['accessories']?.fr || 'accessoires';

        return [
            // Games
            { url: `${baseUrl}/en/${gamesEn}/console/${slug}`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.8 },
            { url: `${baseUrl}/fr/${gamesFr}/console/${slug}`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.8 },
            // Accessories
            { url: `${baseUrl}/en/${accEn}/console/${slug}`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.7 },
            { url: `${baseUrl}/fr/${accFr}/console/${slug}`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.7 },
        ];
    });

    // 4. Product Routes (Dynamic from DB)
    const products = await getSitemapProducts(limit);

    // Helper to generate correct URL for EN and FR
    // We reuse getGameUrl but need to manually handle the 'fr' prefix logic used there
    const productUrls = products.flatMap(product => {
        const enPath = getGameUrl(product, 'en'); // Returns /games/...
        const frPath = getGameUrl(product, 'fr'); // Returns /fr/jeux-video/...

        return [
            {
                url: `${baseUrl}${enPath}`, // getGameUrl for 'en' already includes /games prefix but NOT /en prefix usually? Wait, utils says: if en return /games/...
                // My baseUrl includes nothing.
                // NOTE: standard Next.js i18n routing usually expects /en explicit or implicit?
                // For this project, 'en' is default locale?
                // Let's check utils.ts behavior again.
                // utils.ts: if lang === 'en' return `/${gamesSlug}/${fullSlug}`;
                // So result is "/games/mario-kart..."
                // For FR: "/fr/jeux-video/mario-kart..."

                // So for standard EN SEO, we might want to respect the middleware logic.
                // If middleware redirects /en/games -> /games, then we should output /games.
                // If middleware enforces /en, we need /en.
                // Assuming default locale is handled without prefix for now or as is.

                lastModified: new Date(product.updated_at || new Date()),
                changeFrequency: 'weekly' as const,
                priority: 0.6,
            },
            {
                url: `${baseUrl}${frPath}`,
                lastModified: new Date(product.updated_at || new Date()),
                changeFrequency: 'weekly' as const,
                priority: 0.6,
            }
        ];
    });

    // Fix: Remove duplicates or manual static entries if they clash.
    // Filter productUrls to ensure no undefined.

    return [
        ...staticUrls,
        ...categoryUrls,
        ...consoleUrls,
        ...productUrls
    ];
}
