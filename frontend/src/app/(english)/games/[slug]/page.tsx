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

    // 1. System Pages -> DISABLED (Nuclear Mode)
    // for (const system of flatSystems) {
    //    const slug = system.toLowerCase().replace(/ /g, '-');
    //    params.push({ slug });
    // }
    console.log('[EN-Proxy] System Pages Disabled.');

    // 2. All Games (Full Catalog)
    // 2. Nuclear Mode (Explicit Empty)
    console.log(`[EN-Proxy] SSG Disabled (Nuclear Mode).`);

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
        params.push({ slug: `${slug}-prices-value` });
    }

    return params;
}

// Standalone Metadata Generation for English Route
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    try {
        const { slug } = await params;
        console.log(`[generateMetadata] Called for slug: ${slug}`); // DEBUG LOG
        const lang = 'en'; // Force EN

        // NUCLEAR MODE: Return generic metadata during build to avoid API timeouts
        if (process.env.NODE_ENV === 'production') {
            console.log(`[generateMetadata] Skipping API calls during build for: ${slug}`);
            return {
                title: `${slug.replace(/-/g, ' ')} - RetroCharting`,
                description: 'Video game price guide and market values.'
            };
        }

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
