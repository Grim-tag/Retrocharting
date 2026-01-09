import { Metadata } from 'next';
import Link from 'next/link';
import { getDictionary } from '@/lib/get-dictionary';
import { groupedSystems } from '@/data/systems';
import { generateConsoleSeo } from '@/lib/seo-utils';
import { getProductById, getProductHistory, getProductsByConsole, getGenres } from '@/lib/api';
import { formatConsoleName } from '@/lib/utils';
// import ConsoleGameCatalog from '@/components/ConsoleGameCatalog';
import GameDetailView from '@/components/GameDetailView';
import ConsoleGameCatalogWrapper from '@/components/ConsoleGameCatalogWrapper';
// import dynamic from 'next/dynamic';

// const ConsoleGameCatalog = dynamic(() => import('@/components/ConsoleGameCatalog'), {
//     ssr: false,
//     loading: () => <div className="text-white text-center py-20">Loading Catalog...</div>
// });

// Enable Static Generation (SSG - Infinite Cache)
// Pages are generated ONCE (at build or first visit) and stored as HTML forever.
export const revalidate = false;

export async function generateStaticParams() {
    // If in development, we can skip heavy generation to speed up startup, 
    // BUT 'output: export' requires it.
    // However, if we miss a param here, Next.js throws an error in dev too if it tries to access it? 
    // Actually in dev, it should just try to render on demand unless dynamicParams = false.
    // Let's ensure we fetch everything.

    const flatSystems = Object.values(groupedSystems).flat();
    const params: { slug: string; lang: string }[] = [];

    // 1. System Pages (Always pre-render)
    for (const system of flatSystems) {
        const slug = system.toLowerCase().replace(/ /g, '-');
        params.push({ slug, lang: 'en' });
        params.push({ slug, lang: 'fr' });
    }

    // 2. All Games (Full Catalog)
    try {
        const { getAllSlugs } = await import('@/lib/api');

        // OPTIMIZATION: EMERGENCY MODE (Survival)
        // Backend is timing out on 5000 items. Reducing to 500 to guarantee build success.
        // We rely on 'not-found.tsx' CSR Fallback for the rest of the catalog.
        const isDev = process.env.NODE_ENV === 'development';
        const limit = 0; // Plan D: NUCLEAR MODE (0 Static, 100% CSR) to unblock build
        const allSlugs = await getAllSlugs(limit);
        console.log(`[Localized-Proxy] Fetched ${allSlugs.length} slugs for SSG (Survival Mode: Limit ${limit}).`);

        // Ensure key test slugs are present even with limit
        const testSlugs = [
            'baldurs-gate-pc',
            'asus-rog-ally-x-pc',
            'baldurs-gate-tales-of-the-sword-coast-pc-games',
            'alan-wake-ii-deluxe-edition-ps5',
            '41-hours-ps5',
            'bioforge-pc'
        ];
        for (const slug of testSlugs) {
            // params.push({ slug: slug, lang: 'en' });
            params.push({ slug: slug, lang: 'fr' });
            // params.push({ slug: `${slug}-prices-value`, lang: 'en' });
            params.push({ slug: `${slug}-prix-cotes`, lang: 'fr' });
        }

        for (const item of allSlugs) {
            if (item.slug) {
                // Generate CLEAN, LOCALIZED slugs for SSG
                const { cleanGameSlug } = await import('@/lib/utils');

                // FR
                const frSlug = cleanGameSlug(item.slug, 'fr');
                params.push({ slug: frSlug, lang: 'fr' });

                // EN
                const enSlug = cleanGameSlug(item.slug, 'en');
                params.push({ slug: enSlug, lang: 'en' });
            }
        }

        // B. Legacy Products (Games fallback)
        // STRATEGY: Fetch Top 200 static. Rest is CSR Fallback.
        const { getSitemapProducts } = await import('@/lib/api');
        const productBatch = await getSitemapProducts(200, 0);

        for (const p of productBatch) {
            // Filter out what is definitely NOT a game
            if (p.genre !== 'Accessories' && p.genre !== 'Controllers' && p.genre !== 'Systems' && p.genre !== 'Consoles') {
                // Generate clean slug for legacy game
                // Same logic as cleanGameSlug but starting from raw product data
                let cleanSlug = (p.product_name || 'unknown').toLowerCase()
                    .replace(/[\[\]\(\)]/g, '')
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/(^-|-$)/g, '');

                const consoleSlug = (p.console_name || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-');
                cleanSlug = `${cleanSlug}-${consoleSlug}`;

                // Add Suffixes
                params.push({ slug: `${cleanSlug}-prices-value`, lang: 'en' });
                params.push({ slug: `${cleanSlug}-prix-cotes`, lang: 'fr' });
            }
        }
    } catch (error) {
        console.error("Values fetch failed for SSG (Games):", error);
    }

    // 3. All Legacy Products (IDs)
    try {
        const { getSitemapProducts: fetchSitemapProducts } = await import('@/lib/api');
        const { getGameUrl } = await import('@/lib/utils');

        let allProducts: any[] = [];
        let skip = 0;
        const limit = 0; // DISABLE massive fetch
        let keepFetching = false;
        let count = 0;
        const MAX_LOOPS = 0; // DISABLE massive fetch

        while (keepFetching && count < MAX_LOOPS) {
            const batch = await fetchSitemapProducts(limit, skip);
            if (batch && batch.length > 0) {
                allProducts = [...allProducts, ...batch];
                skip += limit;
                if (batch.length < limit) keepFetching = false;
            } else {
                keepFetching = false;
            }
            count++;
        }

        console.log(`[SSG] Fetched ${allProducts.length} Legacy Products.`);

        for (const p of allProducts) {
            // Mock product for util
            const mock = {
                id: p.id,
                product_name: p.product_name,
                console_name: p.console_name,
                genre: p.genre
            };

            // EN
            try {
                const enUrl = getGameUrl(mock, 'en');
                const enSlug = enUrl.split('/games/')[1];
                if (enSlug) params.push({ slug: enSlug, lang: 'en' });
            } catch (e) { }

            // FR
            try {
                const frUrl = getGameUrl(mock, 'fr');
                const frSlug = frUrl.split('/').pop();
                if (frSlug && frSlug !== 'undefined') params.push({ slug: frSlug, lang: 'fr' });
            } catch (e) { }
        }

    } catch (e) {
        console.error("Values fetch failed for SSG (Products):", e);
    }

    return params;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string; lang: string }> }): Promise<Metadata> {
    try {
        const { slug, lang } = await params;
        const dict = await getDictionary(lang);

        // Import helpers from utils
        const { isSystemSlug, getIdFromSlug, formatConsoleName, getCanonicalSlug } = await import('@/lib/utils');

        const systemName = isSystemSlug(slug);
        if (systemName) {
            // [SEO FIX] Fetch real count instead of hardcoded 0
            const { getProductsCountByConsole } = await import('@/lib/api');
            const count = await getProductsCountByConsole(systemName, 'game');

            const seo = generateConsoleSeo(systemName, undefined, undefined, count, lang);
            return {
                title: seo.title,
                description: seo.description
            };
        }

        // 1. Try unified game (slug based)
        // If slug has no ID at end, or we want to prioritize game lookups
        const { getGameBySlug, getProductById } = await import('@/lib/api');
        const canonicalSlug = getCanonicalSlug(slug);
        const game = await getGameBySlug(canonicalSlug);

        if (game) {
            const shortConsoleName = formatConsoleName(game.console || "");
            const canonicalPath = `/${lang === 'en' ? 'games' : 'fr/games'}/${game.slug}`;

            // [SEO STANDARD] Games Template
            const defaultDesc = lang === 'en'
                ? `Check the current market value and price guide for ${game.title} on ${shortConsoleName}. View historical charts for Loose, CIB, and New copies on RetroCharting.`
                : `Découvrez la cote argus et le prix de ${game.title} sur ${shortConsoleName}. Suivez l'évolution des prix en Loose, Complet ou Neuf sur RetroCharting.`;

            const title = lang === 'en'
                ? `${game.title} Prices & Value - Retrocharting.com`
                : `${game.title} Cote & prix - Retrocharting.com`;

            return {
                title: title,
                description: game.description && game.description !== "none" ? game.description : defaultDesc,
                alternates: {
                    canonical: canonicalPath,
                    languages: {
                        'en': `/games/${game.slug}`,
                        'fr': `/fr/games/${game.slug}`,
                        'x-default': `/games/${game.slug}`
                    }
                }
            };
        }

        // 2. Fallback Legacy
        const id = getIdFromSlug(slug);
        if (!id) return { title: "Product Not Found" };

        const product = await getProductById(id);

        if (!product) return { title: "Product Not Found" };

        const shortConsoleName = formatConsoleName(product.console_name);
        const canonicalPath = `/${lang === 'en' ? 'games' : 'fr/games'}/${slug}`;

        // [SEO STANDARD] Legacy Games Template
        const legacyDefaultDesc = lang === 'en'
            ? `Check the current market value and price guide for ${product.product_name} on ${shortConsoleName}. View historical charts for Loose, CIB, and New copies on RetroCharting.`
            : `Découvrez la cote argus et le prix de ${product.product_name} sur ${shortConsoleName}. Suivez l'évolution des prix en Loose, Complet ou Neuf sur RetroCharting.`;

        const legacyTitle = lang === 'en'
            ? `${product.product_name} Prices & Value - Retrocharting.com`
            : `${product.product_name} Cote & prix - Retrocharting.com`;

        return {
            title: legacyTitle,
            description: product.description && product.description !== "none" ? product.description : legacyDefaultDesc,
            alternates: {
                canonical: canonicalPath
            }
        };
    } catch (error) {
        console.error("Error generating metadata:", error);
        return {
            title: "RetroCharting",
            description: "Video Game Price Guide"
        };
    }
}

import ProductPageBody from '@/components/ProductPageBody';

export default async function Page({
    params
}: {
    params: Promise<{ slug: string; lang: string }>
}) {
    const { slug, lang } = await params;
    return <ProductPageBody params={{ slug, lang }} />;
}
