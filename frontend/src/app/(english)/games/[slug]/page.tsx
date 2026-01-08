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

    // 2. All Games (Full Catalog)
    try {
        const { getAllSlugs } = await import('@/lib/api');

        // OPTIMIZATION: Limit fetching in DEV mode to prevent Stack Overflow
        // OPTIMIZATION: Limit fetching in DEV mode to prevent Stack Overflow
        const isDev = process.env.NODE_ENV === 'development';
        // User has 64GB RAM: Unlocking full catalog even in Dev.
        // User has 64GB RAM: BUT Next.js Dev Server might have Stack Overflow with 77k params?
        // Reverting to 1000 to test hypothesis.
        const limit = 1000;

        const allSlugs = await getAllSlugs(limit);

        console.log(`[EN-Proxy] Fetched ${allSlugs.length} slugs for SSG (Dev Mode: ${isDev}).`);

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
            params.push({ slug });
            // params.push({ slug: `${slug}-prices-value` }); // We now generate this via the loop below or standard logic?
            // Actually, for manual test slugs, we must ensure we push BOTH formats if logic below doesn't cover them.
            params.push({ slug: `${slug}-prices-value` });
        }

        for (const item of allSlugs) {
            if (item.slug) {
                // Canonical Clean URL
                params.push({ slug: item.slug });

                // Legacy URL Suffix for EN (for backward compatibility / client redirect)
                // e.g. baldurs-gate-pc-prices-value
                params.push({ slug: `${item.slug}-prices-value` });
            }
        }
    } catch (error) {
        console.error("[EN-Proxy] Values fetch failed for SSG (Games):", error);
    }

    return params;
}

// Standalone Metadata Generation for English Route
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    try {
        const { slug } = await params;
        console.log(`[generateMetadata] Called for slug: ${slug}`); // DEBUG LOG
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
