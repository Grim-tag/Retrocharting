
import { MetadataRoute } from 'next';
import { getSitemapProducts } from '@/lib/api';
import { getGameUrl, formatConsoleName } from '@/lib/utils';
import { routeMap } from '@/lib/route-config';

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
        // Collect Console for Category URL
        // We still need a slugs for the category set, but products use getGameUrl
        const consoleSlug = formatConsoleName(product.console_name).toLowerCase().replace(/ /g, '-');
        consoleSet.add(consoleSlug);

        ['fr', 'en'].forEach(lang => {
            // Use the centralized helper to match application routing exactly
            const path = getGameUrl(product, lang);
            // Note: getGameUrl returns absolute path /... , we append to baseUrl
            // But wait, getGameUrl might return /games/... for EN and /fr/games/... for FR
            // So we just concat.

            productUrls.push({
                url: `${baseUrl}${path}`,
                lastModified: new Date(product.updated_at || new Date()),
                changeFrequency: 'weekly',
                priority: 0.8,
            });
        });
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
