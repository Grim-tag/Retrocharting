import { MetadataRoute } from 'next';
import { routeMap } from '@/lib/route-config';
import { systems } from '@/data/systems';

export const dynamic = 'force-static';
export const revalidate = 3600;

const BASE_URL = 'https://retrocharting.com';

// Simplified static sitemap generator
export default function sitemap(): MetadataRoute.Sitemap {
    const staticRoutes: MetadataRoute.Sitemap = [];
    const langs = ['en', 'fr'];
    const mainPages = ['', 'login', 'register'];

    // 1. Home / Login / Register
    langs.forEach(lang => {
        mainPages.forEach(page => {
            const path = page === '' ? (lang === 'en' ? '/' : `/${lang}`) : `/${lang}/${page}`;
            const url = page === '' && lang === 'en' ? BASE_URL : `${BASE_URL}${path}`;

            staticRoutes.push({
                url,
                lastModified: new Date(),
                changeFrequency: 'daily',
                priority: page === '' ? 1.0 : 0.5,
            });
        });

        // 2. Main Categories (Games, Consoles, etc)
        ['games', 'consoles', 'accessories', 'collectibles'].forEach(key => {
            const slug = routeMap[key]?.[lang] || key;
            const path = lang === 'en' ? `/${slug}` : `/${lang}/${slug}`;
            staticRoutes.push({
                url: `${BASE_URL}${path}`,
                lastModified: new Date(),
                changeFrequency: 'daily',
                priority: 0.9,
            });
        });
    });

    // 3. System Category Pages (Games / hardware / accessories per console)
    const categoryUrls: MetadataRoute.Sitemap = [];
    const systemSlugs = systems.map(s => s.toLowerCase().replace(/ /g, '-').replace(/&/g, '%26'));

    systemSlugs.forEach(systemSlug => {
        langs.forEach(lang => {
            // Games Catalog
            const gamesBase = routeMap['games']?.[lang] || 'games';
            const gamesPath = lang === 'en' ? `/${gamesBase}/${systemSlug}` : `/${lang}/${gamesBase}/${systemSlug}`;
            categoryUrls.push({
                url: `${BASE_URL}${gamesPath}`,
                lastModified: new Date(),
                changeFrequency: 'daily',
                priority: 0.9,
            });

            // Hardware Catalog
            const consolesBase = routeMap['consoles']?.[lang] || 'consoles';
            const consolesPath = lang === 'en' ? `/${consolesBase}/${systemSlug}` : `/${lang}/${consolesBase}/${systemSlug}`;
            categoryUrls.push({
                url: `${BASE_URL}${consolesPath}`,
                lastModified: new Date(),
                changeFrequency: 'weekly',
                priority: 0.9,
            });

            // Accessories Catalog
            const accessoriesBase = routeMap['accessories']?.[lang] || 'accessories';
            const accessoriesPath = lang === 'en'
                ? `/${accessoriesBase}/console/${systemSlug}`
                : `/${lang}/${accessoriesBase}/console/${systemSlug}`;

            categoryUrls.push({
                url: `${BASE_URL}${accessoriesPath}`,
                lastModified: new Date(),
                changeFrequency: 'weekly',
                priority: 0.8,
            });
        });
    });

    // 4. Products / Games (Dynamic)
    const { getSitemapGames } = await import('@/lib/api');
    // Fetch top games (limit 15000 for now, sitemap max is 50k usually)
    const games = await getSitemapGames(15000, 0);

    const gameUrls: MetadataRoute.Sitemap = [];
    games.forEach((game: any) => {
        langs.forEach(lang => {
            const gamesBase = routeMap['games']?.[lang] || 'games';
            const path = lang === 'en'
                ? `/${gamesBase}/${game.slug}`
                : `/${lang}/${gamesBase}/${game.slug}`;

            gameUrls.push({
                url: `${BASE_URL}${path}`,
                lastModified: new Date(), // or game.last_updated if available
                changeFrequency: 'weekly',
                priority: 0.8
            });
        });
    });

    return [...staticRoutes, ...categoryUrls, ...gameUrls];
}
