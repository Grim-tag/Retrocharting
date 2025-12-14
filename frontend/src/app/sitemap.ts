
import { MetadataRoute } from 'next';
import { getSitemapProducts } from '@/lib/api';
import { getGameUrl, formatConsoleName } from '@/lib/utils';
import { routeMap } from '@/lib/route-config';
import { systems } from '@/data/systems';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = 'https://retrocharting.com';

    // 1. Static Routes & Main Categories
    const staticRoutes: MetadataRoute.Sitemap = [];
    const langs = ['en', 'fr'];
    const mainPages = ['', 'login', 'register']; // Root relative paths

    langs.forEach(lang => {
        // Main Landing Pages
        mainPages.forEach(page => {
            const path = page === '' ? (lang === 'en' ? '/' : `/${lang}`) : `/${lang}/${page}`;
            const url = page === '' && lang === 'en' ? baseUrl : `${baseUrl}${path}`;

            staticRoutes.push({
                url,
                lastModified: new Date(),
                changeFrequency: 'daily',
                priority: page === '' ? 1.0 : 0.5,
            });
        });

        // Category Roots (Games, Consoles, Accessories, Collectibles)
        ['games', 'consoles', 'accessories', 'collectibles'].forEach(key => {
            const slug = routeMap[key]?.[lang] || key;
            const path = lang === 'en' ? `/${slug}` : `/${lang}/${slug}`;
            staticRoutes.push({
                url: `${baseUrl}${path}`,
                lastModified: new Date(),
                changeFrequency: 'daily',
                priority: 0.9,
            });
        });
    });

    // 2. Fetch Dynamic Data (Products)
    // Pagination to avoid timeouts
    const limit = 2000; # Safe chunk size
    const productUrls: MetadataRoute.Sitemap = [];

    let skip = 0;
    let hasMore = true;

    // Safety Loop limit to prevent infinite build loops if API is weird
    const MAX_LOOPS = 50; // Covers 100,000 products @ 2000 per chunk
    let loopCount = 0;

    while (hasMore && loopCount < MAX_LOOPS) {
        try {
            const products = await getSitemapProducts(limit, skip);

            if (!products || products.length === 0) {
                hasMore = false;
            } else {
                // Process chunk
                products.forEach((product) => {
                    ['en', 'fr'].forEach(lang => {
                        const path = getGameUrl(product, lang);
                        productUrls.push({
                            url: `${baseUrl}${path}`,
                            lastModified: new Date(product.updated_at || new Date()),
                            changeFrequency: 'weekly',
                            priority: 0.8,
                        });
                    });
                });

                // Prepare next chunk
                skip += limit;
                loopCount++;

                // If we got fewer than limit, we are done
                if (products.length < limit) {
                    hasMore = false;
                }
            }
        } catch (e) {
            console.error("Sitemap Pagination broken at skip " + skip, e);
            hasMore = false;
        }
    }

    // 3. Generate Console/Category Sub-Pages
    const categoryUrls: MetadataRoute.Sitemap = [];

    // Fix for "Game & Watch" and other special chars causing XML errors
    // We encode '&' to '%26' to ensure valid URL and XML, which Next.js will decode back to '&'
    const systemSlugs = systems.map(s => s.toLowerCase().replace(/ /g, '-').replace(/&/g, '%26'));

    systemSlugs.forEach(systemSlug => {
        langs.forEach(lang => {
            // Games Catalog
            const gamesBase = routeMap['games']?.[lang] || 'games';
            const gamesPath = lang === 'en' ? `/${gamesBase}/${systemSlug}` : `/${lang}/${gamesBase}/${systemSlug}`;
            categoryUrls.push({
                url: `${baseUrl}${gamesPath}`,
                lastModified: new Date(),
                changeFrequency: 'daily',
                priority: 0.9,
            });

            // Hardware Catalog
            const consolesBase = routeMap['consoles']?.[lang] || 'consoles';
            const consolesPath = lang === 'en' ? `/${consolesBase}/${systemSlug}` : `/${lang}/${consolesBase}/${systemSlug}`;
            categoryUrls.push({
                url: `${baseUrl}${consolesPath}`,
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
                url: `${baseUrl}${accessoriesPath}`,
                lastModified: new Date(),
                changeFrequency: 'weekly',
                priority: 0.8,
            });
        });
    });

    return [...staticRoutes, ...categoryUrls, ...productUrls];
}
