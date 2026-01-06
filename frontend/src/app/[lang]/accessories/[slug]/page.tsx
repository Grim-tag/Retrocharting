import { getProductsByConsole, getGenres, getProductById, getProductHistory } from "@/lib/api";
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

// Generate Static Params for ACCESSORIES consoles (ISR Priming)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateStaticParams() {
    return [];
}

export async function generateMetadata({ params, searchParams }: { params: Promise<{ slug: string; lang: string }>; searchParams: Promise<{ genre?: string, sort?: string }> }): Promise<Metadata> {
    try {
        const { slug, lang } = await params;
        const { genre, sort } = await searchParams;

        // 1. Check if it's a System List Page
        const systemName = isSystemSlug(slug);
        if (systemName) {
            const seo = generateConsoleSeo(systemName, genre, sort, 0, lang);
            return {
                title: `${systemName} Accessories & Peripherals | RetroCharting`,
                description: `Buy and sell ${systemName} controllers, cables, memory cards and other accessories. Check current market prices.`
            };
        }

        // 2. Check if it's a Product Detail Page
        const id = getIdFromSlug(slug);
        if (id) {
            const product = await getProductById(id);
            if (product) {
                return {
                    title: `${product.product_name} (${product.console_name}) Value & Price | RetroCharting`,
                    description: `Current market value, prices and history for ${product.product_name} on ${product.console_name}.`
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
    params,
    searchParams
}: {
    params: Promise<{ slug: string; lang: string }>,
    searchParams: Promise<{ genre?: string, sort?: string, search?: string }>
}) {
    const { slug, lang } = await params;
    const { genre, sort, search: searchQuery } = await searchParams;
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
            const [fetchedProducts] = await Promise.all([
                getProductsByConsole(systemName, 40, genre, 'accessory', sort, 0, searchQuery),
                // getGenres(systemName) // Genres not really used for accessories main view usually
            ]);
            products = fetchedProducts;
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
    const id = getIdFromSlug(slug);
    if (id) {
        try {
            const [product, history] = await Promise.all([
                getProductById(id),
                getProductHistory(id)
            ]);

            if (product) {
                return (
                    <GameDetailView
                        product={product}
                        history={history}
                        lang={lang}
                        dict={dict}
                    />
                );
            }
        } catch (error) {
            console.error("Error loading accessory product:", error);
        }
    }

    // --- 404 NOT FOUND ---
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
