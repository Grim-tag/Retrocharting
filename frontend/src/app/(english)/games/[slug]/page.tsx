import { Metadata } from 'next';
import { groupedSystems } from '@/data/systems';
import { generateConsoleSeo } from '@/lib/seo-utils';
import { getDictionary } from '@/lib/get-dictionary';
import ProductPageBody from '@/components/ProductPageBody';

// Enable Static Generation (SSG - Infinite Cache)
export const revalidate = false;

// Standalone Static Params Generation for English Route
export async function generateStaticParams() {
    const flatSystems = Object.values(groupedSystems).flat();
    const params: { slug: string }[] = [];

    // 1. System Pages
    for (const system of flatSystems) {
        const slug = system.toLowerCase().replace(/ /g, '-');
        params.push({ slug });
    }
    console.log(`[EN-Proxy Minimal] Generated ${flatSystems.length} system pages.`);

    // 2. MINIMAL: Only 1 game per console
    try {
        const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
        const API_URL = BASE_URL.endsWith('/api/v1') ? BASE_URL : `${BASE_URL}/api/v1`;

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
                        params.push({ slug: `${baseSlug}-prices-value` });
                    }
                }
            } catch (e) {
                console.error(`[EN-Proxy Minimal] Failed for ${system}:`, e);
            }
        }

        console.log(`[EN-Proxy Minimal] Total: ${params.length} pages`);

    } catch (error) {
        console.error("[EN-Proxy Minimal] Failed to fetch games:", error);
    }

    return params;
}

export const dynamicParams = true;

// Standalone Metadata Generation for English Route
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    try {
        const { slug } = await params;
        const lang = 'en'; // Force EN

        // Import helpers from utils
        const { isSystemSlug, getIdFromSlug, formatConsoleName, getCanonicalSlug } = await import('@/lib/utils');

        const systemName = isSystemSlug(slug);
        if (systemName) {
            const { getProductsCountByConsole } = await import('@/lib/api');
            const count = await getProductsCountByConsole(systemName, 'game');
            const seo = generateConsoleSeo(systemName, undefined, undefined, count, lang);
            return {
                title: seo.title,
                description: seo.description
            };
        }

        // 1. Try unified game (slug based)
        const { getGameBySlug, getProductById } = await import('@/lib/api');
        const canonicalSlug = getCanonicalSlug(slug);
        const game = await getGameBySlug(canonicalSlug);

        if (game) {
            const shortConsoleName = formatConsoleName(game.console || "");
            const canonicalPath = `/games/${game.slug}`;

            const defaultDesc = `Check the current market value and price guide for ${game.title} on ${shortConsoleName}. View historical charts for Loose, CIB, and New copies on RetroCharting.`;
            const title = `${game.title} Prices & Value - Retrocharting.com`;

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
        const canonicalPath = `/games/${slug}`; // Clean URL for EN

        const legacyDefaultDesc = `Check the current market value and price guide for ${product.product_name} on ${shortConsoleName}. View historical charts for Loose, CIB, and New copies on RetroCharting.`;
        const legacyTitle = `${product.product_name} Prices & Value - Retrocharting.com`;

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

export default async function EnglishProductPage(props: any) {
    const params = await props.params;
    console.log(`[EnglishProductPage] Called for slug: ${params.slug}`); // DEBUG LOG
    // Force Lang to EN
    return <ProductPageBody params={{ ...params, lang: 'en' }} />;
}
