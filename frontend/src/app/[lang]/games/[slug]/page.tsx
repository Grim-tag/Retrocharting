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
        // OPTIMIZATION: NUCLEAR V2 (Explicit Empty)
        // We do NOT call the API to avoid timeouts.
        console.log(`[Localized-Proxy] SSG Disabled (Nuclear Mode).`);

        // Ensure key test slugs are present
        const testSlugs = [
            'baldurs-gate-pc',
            'asus-rog-ally-x-pc',
            'baldurs-gate-tales-of-the-sword-coast-pc-games',
            'alan-wake-ii-deluxe-edition-ps5',
            '41-hours-ps5',
            'bioforge-pc'
        ];
        for (const slug of testSlugs) {
            params.push({ slug: slug, lang: 'fr' });
            params.push({ slug: `${slug}-prix-cotes`, lang: 'fr' });
        }

        // B. Legacy Products (Games fallback) -> DISABLED (Empty)

    } catch (error) {
        console.error("Values fetch failed for SSG (Games):", error);
    }

    // 3. All Legacy Products (IDs) -> DISABLED (Empty)
    // No code here to avoid timeouts.


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
