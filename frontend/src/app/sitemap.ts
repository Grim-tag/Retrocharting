
import { MetadataRoute } from 'next';
import { getSitemapProducts } from '@/lib/api';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = 'https://retrocharting.com';

    // 1. Static Routes
    const routes = [
        '',
        '/fr',
        '/en',
        '/fr/login',
        '/en/login',
        '/fr/register',
        '/en/register',
        '/fr/games',
        '/en/games',
    ].map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: route.includes('login') ? 0.5 : 1.0,
    }));

    // 2. Fetch Dynamic Data (Products)
    // We limit to 20000 for performance.
    const products = await getSitemapProducts(20000);

    const productUrls: MetadataRoute.Sitemap = [];
    const consoleSet = new Set<string>();

    products.forEach((product) => {
        // Generate Product URL
        // Format: /games/console-slug/game-slug-id
        const consoleSlug = product.console_name.toLowerCase().replace(/ /g, '-');
        const productSlug = product.product_name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');
        const fullSlug = `${productSlug}-${product.id}`;

        // Add for both languages? Or just canonical?
        // Let's add for 'fr' as primary, or both? Sitemaps usually want all valid URLs.
        // Duplicate content risk? Canonical handles that.
        // Let's add 'fr' and 'en'.

        ['fr', 'en'].forEach(lang => {
            productUrls.push({
                url: `${baseUrl}/${lang}/games/${consoleSlug}/${fullSlug}`,
                lastModified: new Date(product.updated_at || new Date()),
                changeFrequency: 'weekly',
                priority: 0.8,
            });
        });

        // Collect Console for Category URL
        consoleSet.add(consoleSlug);
    });

    // 3. Generate Console URLs
    const consoleUrls: MetadataRoute.Sitemap = [];
    consoleSet.forEach(consoleSlug => {
        ['fr', 'en'].forEach(lang => {
            consoleUrls.push({
                url: `${baseUrl}/${lang}/games/${consoleSlug}`,
                lastModified: new Date(),
                changeFrequency: 'daily',
                priority: 0.9,
            });
        });
    });

    return [...routes, ...consoleUrls, ...productUrls];
}
