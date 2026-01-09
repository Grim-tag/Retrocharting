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
    const params: { slug: string; lang: string }[] = [];

    // 1. System Pages (Console Catalogs)
    const flatSystems = Object.values(groupedSystems).flat();
    for (const system of flatSystems) {
        const slug = system.toLowerCase().replace(/ /g, '-');
        params.push({ slug, lang: 'en' });
        params.push({ slug, lang: 'fr' });
    }
    console.log(`[SSG Minimal] Generated ${flatSystems.length * 2} system pages.`);

    // 2. MINIMAL: Only 1 game per console for fast build
    try {
        const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
        const API_URL = BASE_URL.endsWith('/api/v1') ? BASE_URL : `${BASE_URL}/api/v1`;

        // Fetch only 1 game per console
        for (const system of flatSystems) {
            try {
                const res = await fetch(`${API_URL}/games/?console=${encodeURIComponent(system)}&limit=1`, {
                    next: { revalidate: false }
                });

                if (res.ok) {
                    const games = await res.json();
                    if (games && games.length > 0) {
                        const game = games[0];
                        const baseSlug = game.slug?.replace(/-prices-value$/, '').replace(/-prix-cotes$/, '') || game.slug;

                        params.push({ slug: `${baseSlug}-prices-value`, lang: 'en' });
                        params.push({ slug: `${baseSlug}-prix-cotes`, lang: 'fr' });
                    }
                }
            } catch (e) {
                console.error(`[SSG Minimal] Failed to fetch game for ${system}:`, e);
            }
        }

        console.log(`[SSG Minimal] Total: ${params.length} pages (minimal build)`);

    } catch (error) {
        console.error("[SSG Minimal] Failed to fetch games:", error);
    }

    return params;
}

// Enable on-demand static generation for missing pages
export const dynamicParams = true;

export async function generateMetadata({ params }: { params: Promise<{ slug: string; lang: string }> }): Promise<Metadata> {
    try {
        const { slug, lang } = await params;

        // NOTE: Nuclear Mode removed - full metadata generation enabled for local build
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
