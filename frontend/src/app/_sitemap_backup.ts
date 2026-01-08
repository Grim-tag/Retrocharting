import { MetadataRoute } from 'next';
import { routeMap } from '@/lib/route-config';
import { systems } from '@/data/systems';

// export const dynamic = 'force-static'; // Removed to allow ISR with API
export const revalidate = 3600;

const BASE_URL = 'https://retrocharting.com';

// Next.js 13+ generateSitemaps
// Next.js 13+ generateSitemaps
export async function generateSitemaps() {
    try {
        const { getGamesCount } = await import('@/lib/api');
        const total = await getGamesCount();
        const limit = 10000;
        const numSitemaps = Math.ceil(total / limit);

        // Safety check
        if (numSitemaps <= 0) return [{ id: 0 }];

        // Returns [{ id: 0 }, { id: 1 }, ...]
        return Array.from({ length: numSitemaps }, (_, i) => ({ id: i }));
    } catch (error) {
        console.error("Sitemap Generation Error (Count):", error);
        // Fallback: Just return one sitemap (id=0) containing static routes so we verify XML works
        return [{ id: 0 }];
    }
}

// Simplified static sitemap generator
export default async function sitemap({ id }: { id: number }): Promise<MetadataRoute.Sitemap> {
    const staticRoutes: MetadataRoute.Sitemap = [];
    const limit = 10000;
    const skip = id * limit;

    // Only include static pages in the first sitemap (id=0) to avoid duplication
    if (id === 0) {
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
        const systemSlugs = systems.map(s => s.toLowerCase().replace(/ /g, '-').replace(/&/g, '%26'));
        systemSlugs.forEach(systemSlug => {
            langs.forEach(lang => {
                // Games Catalog
                const gamesBase = routeMap['games']?.[lang] || 'games';
                const gamesPath = lang === 'en' ? `/${gamesBase}/${systemSlug}` : `/${lang}/${gamesBase}/${systemSlug}`;
                staticRoutes.push({
                    url: `${BASE_URL}${gamesPath}`,
                    lastModified: new Date(),
                    changeFrequency: 'daily',
                    priority: 0.9,
                });

                // Hardware Catalog
                const consolesBase = routeMap['consoles']?.[lang] || 'consoles';
                const consolesPath = lang === 'en' ? `/${consolesBase}/${systemSlug}` : `/${lang}/${consolesBase}/${systemSlug}`;
                staticRoutes.push({
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

                staticRoutes.push({
                    url: `${BASE_URL}${accessoriesPath}`,
                    lastModified: new Date(),
                    changeFrequency: 'weekly',
                    priority: 0.8,
                });
            });
        });
    }

    // 4. Products / Games (Dynamic) - Fetched per chunk based on ID
    const gameUrls: MetadataRoute.Sitemap = [];
    try {
        const { getSitemapGames } = await import('@/lib/api');
        const games = await getSitemapGames(limit, skip);

        const langs = ['en', 'fr'];

        games.forEach((game: any) => {
            langs.forEach(lang => {
                const gamesBase = routeMap['games']?.[lang] || 'games';
                const path = lang === 'en'
                    ? `/${gamesBase}/${game.slug}`
                    : `/${lang}/${gamesBase}/${game.slug}`;

                gameUrls.push({
                    url: `${BASE_URL}${path}`,
                    lastModified: new Date(), // updated_at if available
                    changeFrequency: 'weekly',
                    priority: 0.8
                });
            });
        });
    } catch (e) {
        console.error(`Sitemap Data Error (ID ${id}):`, e);
        // Continue with just static routes
    }

    return [...staticRoutes, ...gameUrls];
}
