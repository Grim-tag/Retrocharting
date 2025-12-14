
import { MetadataRoute } from 'next';
import { getSitemapProducts, getProductsCount } from '@/lib/api';
import { getGameUrl } from '@/lib/utils';
import { routeMap } from '@/lib/route-config';
import { systems } from '@/data/systems';

export const dynamic = 'force-dynamic';

const BASE_URL = 'https://retrocharting.com';
const CHUNK_SIZE = 4000; // 4000 products per sitemap (safe size)

export async function generateSitemaps() {
    // 1. Fetch total count from backend
    // If backend fails, we might just return the static sitemap.
    const total = await getProductsCount();

    // 2. Calculate number of chunks
    // If total is 40000 and chunk is 4000 -> 10 chunks (0 to 9)
    const numChunks = Math.ceil(total / CHUNK_SIZE);

    // 3. Create ID list
    const sitemaps = [
        { id: 'static' }, // Special ID for static routes & categories
    ];

    for (let i = 0; i < numChunks; i++) {
        // ID must be string for Next.js consistency
        sitemaps.push({ id: i.toString() });
    }

    return sitemaps;
}

export default async function sitemap({ id }: { id: string }): Promise<MetadataRoute.Sitemap> {

    // --- STATIC SITEMAP ---
    if (id === 'static') {
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
        // These are effectively "static" categories, even though there are many.
        // There are about 150 systems * 3 types * 2 langs = ~900 URLs. Fits easily in one file.
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

        return [...staticRoutes, ...categoryUrls];
    }

    // --- PRODUCT SITEMAPS (Chunked) ---
    const chunkIndex = parseInt(id);
    if (!isNaN(chunkIndex)) {
        const skip = chunkIndex * CHUNK_SIZE;
        const products = await getSitemapProducts(CHUNK_SIZE, skip);

        const productUrls: MetadataRoute.Sitemap = [];

        products.forEach((product) => {
            ['en', 'fr'].forEach(lang => {
                const path = getGameUrl(product, lang);
                productUrls.push({
                    url: `${BASE_URL}${path}`,
                    lastModified: new Date(product.updated_at || new Date()),
                    changeFrequency: 'weekly',
                    priority: 0.8,
                });
            });
        });

        // If products are empty, return explicit "Empty" URL to debug
        if (products.length === 0) {
            return [{
                url: `${BASE_URL}/debug/empty_products_chunk_${chunkIndex}`,
                lastModified: new Date(),
            }];
        }

        return productUrls;
    }

    // DEBUG FALLBACK if no ID matched
    return [{
        url: `${BASE_URL}/debug/unmatched_id_${id}`,
        lastModified: new Date(),
    }];
}
