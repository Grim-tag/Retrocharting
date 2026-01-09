import { redirect } from 'next/navigation';
import { getProductsByConsole, getGenres, getProductById, getProductHistory, getGamesByConsole } from "@/lib/api";
import { Suspense } from 'react';
import ConsoleGameCatalog from "@/components/ConsoleGameCatalog";
import GameDetailView from "@/components/GameDetailView";
import { groupedSystems } from '@/data/systems';
import Breadcrumbs from "@/components/seo/Breadcrumbs";
import { getDictionary } from "@/lib/get-dictionary";
import { routeMap } from "@/lib/route-config";
import { generateConsoleSeo } from "@/lib/seo-utils";
import { Metadata } from 'next';
import Link from 'next/link';

// Dispatcher Helper (replicated)
function isSystemSlug(slug: string): string | null {
    const flatSystems = Object.values(groupedSystems).flat();
    const found = flatSystems.find(s => s.toLowerCase().replace(/ /g, '-') === slug);
    return found || null;
}

function getIdFromSlug(slug: string): number {
    const match = slug.match(/-(\d+)$/);
    if (match && match[1]) {
        return parseInt(match[1], 10);
    }
    const parts = slug.split('-');
    const lastPart = parts[parts.length - 1];
    const id = parseInt(lastPart);
    return isNaN(id) ? 0 : id;
}

// Enable Static Generation (SSG - Infinite Cache)
// Pages are generated ONCE (at build or first visit) and stored as HTML forever.
export const revalidate = false;

export async function generateStaticParams() {
    const flatSystems = Object.values(groupedSystems).flat();
    const params: { slug: string; lang: string }[] = [];

    // 1. System Pages
    for (const system of flatSystems) {
        const slug = system.toLowerCase().replace(/ /g, '-');
        params.push({ slug, lang: 'en' });
        params.push({ slug, lang: 'fr' });
    }

    // 2. Accessories Pre-render (Full Catalog)
    // EMERGENCY DISABLE: Backend Timeouts
    // We disable fetching products here. They will be handled by CSR Fallback.
    // ... (Code removed for Survival Mode)

    return params;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string; lang: string }> }): Promise<Metadata> {
    try {
        const { slug, lang } = await params;

        // 1. Check if it's a System List Page
        const systemName = isSystemSlug(slug);
        if (systemName) {
            const seo = generateConsoleSeo(systemName, undefined, undefined, 0, lang);
            return {
                title: `${systemName} Accessories & Peripherals | RetroCharting`,
                description: `Buy and sell ${systemName} controllers, cables, memory cards and other accessories. Check current market prices.`
            };
        }

        // 2. Check if it's a Product Detail Page (Unified or Legacy)

        // [SEO FIX] Try Unified Slug First (Clean URLs)
        const { getGameBySlug } = await import('@/lib/api');
        const game = await getGameBySlug(slug);

        if (game) {
            const shortConsoleName = game.console ? game.console : "";

            // [SEO STANDARD] Accessory Template (Game Path)
            const desc = lang === 'en'
                ? `Get the official price guide for the ${game.title} for ${shortConsoleName}. Compare market values for controllers, cables, and peripherals on RetroCharting.`
                : `Consultez la cote officielle de l'accessoire ${game.title} pour ${shortConsoleName}. Prix et valeur des manettes et périphériques sur RetroCharting.`;

            const title = lang === 'en'
                ? `${game.title} Prices & Value - Retrocharting.com`
                : `${game.title} Cote & prix - Retrocharting.com`;

            return {
                title: title,
                description: desc
            };
        }

        // 3. Fallback Legacy ID
        const id = getIdFromSlug(slug);
        if (id) {
            const product = await getProductById(id);
            if (product) {
                // [SEO STANDARD] Accessory Template (Legacy)
                const shortConsoleName = product.console_name;
                const desc = lang === 'en'
                    ? `Get the official price guide for the ${product.product_name} for ${shortConsoleName}. Compare market values for controllers, cables, and peripherals on RetroCharting.`
                    : `Consultez la cote officielle de l'accessoire ${product.product_name} pour ${shortConsoleName}. Prix et valeur des manettes et périphériques sur RetroCharting.`;

                const title = lang === 'en'
                    ? `${product.product_name} Prices & Value - Retrocharting.com`
                    : `${product.product_name} Cote & prix - Retrocharting.com`;

                return {
                    title: title,
                    description: desc
                };
            }
        }

        return { title: 'Accessories Not Found' };
    } catch (error) {
        console.error("Error generating metadata for accessories:", error);
        return { title: 'Accessories - RetroCharting' };
    }
}

export default async function AccessoriesConsolePage({
    params
}: {
    params: Promise<{ slug: string; lang: string }>
}) {
    const { slug, lang } = await params;
    const dict = await getDictionary(lang);

    const getSlug = (key: string) => routeMap[key]?.[lang] || key;
    const accessoriesSlug = getSlug('accessories');

    const systemName = isSystemSlug(slug);

    // --- CASE 1: CONSOLE LIST VIEW ---
    if (systemName) {
        // Reuse ConsoleGameCatalog but for accessories
        let products: any[] = [];
        // let genres: string[] = []; // Unused for now

        try {
            const [games, fetchedGenres] = await Promise.all([
                getGamesByConsole(systemName, 40, undefined, undefined, 0, undefined, 'accessory'),
                getGenres(systemName)
            ]);

            // Adapt Games to Product Interface for Catalog Component
            products = games.map((g: any) => ({
                id: g.id,
                pricecharting_id: 0, // Mock
                product_name: g.title,
                console_name: g.console,
                loose_price: g.min_price || 0,
                cib_price: g.cib_price || 0,
                new_price: g.new_price || 0,
                image_url: g.image_url,
                genre: g.genre,
                game_slug: g.slug
            }));

            // genres = fetchedGenres; // If we used local var
        } catch (error) {
            console.error("Error loading accessory catalog data:", error);
        }

        const breadcrumbItems = [
            { label: dict.header.nav.accessories, href: `/${lang}/${accessoriesSlug}` },
            { label: systemName, href: `/${lang}/${accessoriesSlug}/${slug}` }
        ];

        return (
            <main className="flex-grow bg-[#0f121e] py-8">
                <div className="max-w-[1400px] mx-auto px-4">
                    <Breadcrumbs items={breadcrumbItems} lang={lang} />
                    <Suspense fallback={<div className="text-white text-center py-20">Loading catalog...</div>}>
                        <ConsoleGameCatalog
                            products={products}
                            genres={[]}
                            systemName={systemName}
                            lang={lang}
                            gamesSlug={accessoriesSlug}
                            systemSlug={slug}
                            h1Title={`${systemName} Accessories`}
                            introText={`Find detailed price history and market values for ${systemName} accessories.`}
                            faq={[]}
                            productType="accessory"
                        />
                    </Suspense>
                </div>
            </main>
        );
    }

    // --- CASE 2: UNIFIED GAME/ACCESSORY VIEW (Slug-based) ---
    // Try fetching as Unified Game (Slug-based) - Required for French URLs without ID
    const { getGameBySlug, getGameHistory } = await import('@/lib/api');
    const { formatConsoleName } = await import('@/lib/utils');
    const game = await getGameBySlug(slug);

    if (game) {
        // Unified Success!
        // We need to pick a "Main" product to satisfy the legacy view props.
        const mainVariant = game.variants.find((v: any) => v.region.includes("NTSC"))
            || game.variants.find((v: any) => v.region.includes("PAL"))
            || game.variants[0];

        // Fetch full details for the main variant
        const [mainProduct, history] = await Promise.all([
            getProductById(mainVariant.id),
            getGameHistory(slug)
        ]);

        if (mainProduct) {
            return (
                <GameDetailView
                    product={mainProduct}
                    history={history}
                    lang={lang}
                    dict={dict}
                    game={game} // Pass unified data
                />
            );
        }
    }

    // --- CASE 3: PRODUCT DETAIL VIEW (Legacy ID-based) ---
    // --- CASE 3: PRODUCT DETAIL VIEW (Legacy ID-based) ---
    const id = getIdFromSlug(slug);
    let legacyProduct = null;
    let legacyHistory = null;
    let shouldRedirectTo = null;

    if (id) {
        try {
            const [product, history] = await Promise.all([
                getProductById(id),
                getProductHistory(id)
            ]);
            legacyProduct = product;
            legacyHistory = history;

            if (product && product.game_slug) {
                shouldRedirectTo = `/${lang}/${accessoriesSlug}/${product.game_slug}`;
            }
        } catch (error) {
            console.error("Error loading accessory product:", error);
        }
    }

    if (shouldRedirectTo) {
        redirect(shouldRedirectTo);
    }

    if (legacyProduct) {
        return (
            <GameDetailView
                product={legacyProduct}
                history={legacyHistory || []}
                lang={lang}
                dict={dict}
            />
        );
    }

    // REDIRECT CHECK (After ID lookup fails or is done) for Legacy -> Unified
    // If we found a product but didn't return (e.g. falling through, though above returns)
    // Actually we should check INSIDE the ID block.

    return (
        <main className="flex-grow bg-[#0f121e] py-20 text-center text-white">
            <h1 className="text-3xl font-bold">{dict.product.not_found.title}</h1>
            <p className="text-gray-400 mt-2">System or Accessory not found.</p>
            <Link href={`/${lang}/${accessoriesSlug}`} className="text-[#ff6600] hover:underline mt-4 inline-block">
                {dict.product.not_found.back}
            </Link>
        </main>
    );
}
