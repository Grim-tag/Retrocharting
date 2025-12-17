
import Link from "next/link";
import { getProductHistory, getProductsByConsole, getGenres } from "@/lib/api";
import ListingsTable from "@/components/ListingsTable";
import MarketAnalysis from "@/components/MarketAnalysis";
import PriceHistoryChart from "@/components/PriceHistoryChart";
import PriceCard from "@/components/PriceCard";
import WhyThisPrice from "@/components/WhyThisPrice";
import { Metadata } from "next";
import { formatConsoleName, getGameUrl } from "@/lib/utils";
import CrossPlatformLinks from "@/components/CrossPlatformLinks";
import Breadcrumbs from "@/components/seo/Breadcrumbs";
import JsonLd, { generateVideoGameSchema } from "@/components/seo/JsonLd";
import { getDictionary } from "@/lib/get-dictionary";
import { routeMap } from "@/lib/route-config";
import { groupedSystems } from "@/data/systems";
import ConsoleGameCatalog from "@/components/ConsoleGameCatalog";
import ProductActions from "@/components/ProductActions";
import ProductDetails from "@/components/ProductDetails";
import CommentsSection from "@/components/comments/CommentsSection";
import AlternateLinksRegistrar from "@/components/AlternateLinksRegistrar";
import { getProductById } from "@/lib/cached-api";
// SEO Components
import ConsoleSeoStats from "@/components/seo/ConsoleSeoStats";
import ConsoleFaq from "@/components/seo/ConsoleFaq";

// --- Helper to extract ID from slug ---
function getIdFromSlug(slug: string): number {
    const parts = slug.split('-');
    const lastPart = parts[parts.length - 1];
    const id = parseInt(lastPart);
    return isNaN(id) ? 0 : id;
}

// Dispatcher Helper
function isSystemSlug(slug: string): string | null {
    const flatSystems = Object.values(groupedSystems).flat();
    const found = flatSystems.find(s => s.toLowerCase().replace(/ /g, '-') === slug);
    return found || null;
}

export async function generateMetadata({ params, searchParams }: { params: Promise<{ slug: string; lang: string }>; searchParams: Promise<{ genre?: string }> }): Promise<Metadata> {
    const { slug, lang } = await params;
    const dict = await getDictionary(lang);

    // 1. Check if it's a Console Category Page (e.g. /consoles/nintendo-64)
    const systemName = isSystemSlug(slug);
    if (systemName) {
        return {
            title: `${systemName} Consoles Price Guide | RetroCharting`,
            description: `Buy and Sell ${systemName} consoles. Current market values for ${systemName} hardware, limited editions, and bundles.`
        };
    }

    // 2. Default: Console Product Page
    const id = getIdFromSlug(slug);
    const product = await getProductById(id);

    if (!product) {
        return {
            title: "Console Not Found | RetroCharting",
        };
    }

    const shortConsoleName = formatConsoleName(product.console_name);
    const canonicalPath = getGameUrl(product, lang);
    const canonicalUrl = `https://retrocharting.com${canonicalPath}`;

    if (lang === 'fr') {
        return {
            title: `${dict.product.market.suffix} ${product.product_name} ${shortConsoleName} & Cote | RetroCharting`,
            description: `Prix actuel et historique pour la console ${product.product_name}. Estimez la valeur de votre matériel ${product.console_name}.`,
            alternates: {
                canonical: canonicalUrl,
            }
        };
    }

    return {
        title: `${product.product_name} ${shortConsoleName} ${dict.product.market.suffix} | RetroCharting`,
        description: `Current market value for ${product.product_name} console. Track price history for ${product.console_name} hardware.`,
        alternates: {
            canonical: canonicalUrl,
        }
    };
}

export default async function Page({
    params,
    searchParams
}: {
    params: Promise<{ slug: string; lang: string }>,
    searchParams: Promise<{ genre?: string }>
}) {
    const { slug, lang } = await params;
    const { genre } = await searchParams;
    const dict = await getDictionary(lang);

    const getSlug = (key: string) => routeMap[key]?.[lang] || key;
    const gamesSlug = getSlug('games');
    const consolesSlug = getSlug('consoles');

    // --- DISPATCHER LOGIC ---

    // 1. CHECK IF CONSOLE SYSTEM CATEGORY
    const systemName = isSystemSlug(slug);

    if (systemName) {
        // === CONSOLE CATALOG VIEW (Listing Hardware) ===
        // Note: passing 'console' as type to filter only hardware
        // But getProductsByConsole might accept 'type' valid argument? 
        // Checking usage in game page: getProductsByConsole(systemName, 2000, undefined, 'game')
        // We want 'system' or 'console'. Let's assume 'system' based on utils mapping or genre check.
        // Actually typically it grabs all unless filtered. 
        // Let's rely on ConsoleGameCatalog to filter? Or pass 'Systems' as genre filter?
        // Better: Fetch all and let catalog filter or fetch specifically 'Systems' genre.
        // For now, let's fetch default and rely on catalog or fetch specifically generics.

        const [products, genres] = await Promise.all([
            getProductsByConsole(systemName, 500, undefined, 'console'),
            getGenres(systemName)
        ]);

        const breadcrumbItems = [
            { label: dict.header.nav.consoles, href: `/${lang}/${consolesSlug}` },
            { label: systemName, href: `/${lang}/${consolesSlug}/${slug}` }
        ];

        // Region Detection
        let region: 'PAL' | 'NTSC' | 'JP' | 'NTSC-J' = 'NTSC';
        if (systemName.startsWith("PAL")) region = 'PAL';
        else if (systemName.startsWith("JP") || systemName.startsWith("Japan")) region = 'JP';

        return (
            <main className="flex-grow bg-[#0f121e] py-8">
                <div className="max-w-[1400px] mx-auto px-4">
                    <Breadcrumbs items={breadcrumbItems} />

                    {/* SEO STATS (TOP) */}
                    <ConsoleSeoStats products={products} systemName={systemName} region={region} />

                    <div className="mt-6">
                        <ConsoleGameCatalog
                            products={products}
                            genres={[]}
                            systemName={systemName}
                            lang={lang}
                            gamesSlug={consolesSlug}
                            systemSlug={slug}
                            productType="console" // Explicitly fetch consoles
                        />
                    </div>
                    {/* SEO FAQ (BOTTOM) */}
                    <ConsoleFaq products={products} systemName={systemName} region={region} />
                </div>
            </main>
        );
    }

    // 2. DEFAULT: CONSOLE PRODUCT DETAIL VIEW
    const id = getIdFromSlug(slug);

    const [product, history] = await Promise.all([
        getProductById(id),
        getProductHistory(id)
    ]);

    if (!product) {
        return (
            <main className="flex-grow bg-[#0f121e] py-20 text-center text-white">
                <h1 className="text-3xl font-bold">{dict.product.not_found.title}</h1>
                <Link href={`/${lang}/${consolesSlug}`} className="text-[#ff6600] hover:underline mt-4 inline-block">
                    {dict.product.not_found.back}
                </Link>
            </main>
        );
    }

    const shortConsoleName = formatConsoleName(product.console_name);

    const breadcrumbItems = [
        { label: dict.header.nav.consoles, href: `/${lang}/${consolesSlug}` },
        { label: product.console_name, href: `/${lang}/${consolesSlug}/${product.console_name.toLowerCase().replace(/ /g, '-')}` },
        { label: product.product_name, href: getGameUrl(product, lang) }
    ];

    // Using VideoGame schema is okay, or Product schema. VideoGame is fine for now.
    const schema = generateVideoGameSchema(product, `https://retrocharting.com${getGameUrl(product, lang)}`);

    return (
        <main className="flex-grow bg-[#0f121e] py-8">
            <div className="max-w-[1400px] mx-auto px-4">

                <JsonLd data={schema} />
                <Breadcrumbs items={breadcrumbItems} />
                <AlternateLinksRegistrar
                    en={getGameUrl(product, 'en')}
                    fr={getGameUrl(product, 'fr')}
                />

                {/* --- MOBILE OPTIMIZED LAYOUT START --- */}

                {/* 1. TITLE: Always Top (Full Width) */}
                <div className="flex items-start justify-between gap-4 mb-6">
                    <h1 className="text-2xl sm:text-4xl font-bold text-white leading-tight">
                        {product.product_name} {shortConsoleName} {dict.product.market.suffix}
                    </h1>
                    {/* Region Flag Badge */}
                    <div className="hidden sm:block">
                        {(product.console_name.includes("PAL") || product.product_name.includes("PAL")) && (
                            <div className="bg-blue-600 px-3 py-1 rounded text-xs font-bold text-white uppercase tracking-wider shrink-0 mt-2">
                                🇪🇺 PAL Region
                            </div>
                        )}
                        {(product.console_name.includes("Japan") || product.console_name.includes("JP") || product.product_name.includes("[JP]")) && (
                            <div className="bg-red-600 px-3 py-1 rounded text-xs font-bold text-white uppercase tracking-wider shrink-0 mt-2">
                                🇯🇵 NTSC-J
                            </div>
                        )}
                        {(!product.console_name.includes("PAL") && !product.console_name.includes("Japan") && !product.console_name.includes("JP")) && (
                            <div className="bg-green-600 px-3 py-1 rounded text-xs font-bold text-white uppercase tracking-wider shrink-0 mt-2">
                                🇺🇸 NTSC-U
                            </div>
                        )}
                    </div>
                </div>

                <div className="text-[#ff6600] font-bold text-lg mb-6 flex items-center gap-2 -mt-4">
                    <span>{product.console_name}</span>
                    <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
                    <span className="text-gray-400 font-normal text-sm">{dict.product.market.updated_daily}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                    {/* Left: Image + Desktop Actions + Description */}
                    <div className="md:col-span-4 flex flex-col gap-4">
                        <div className="bg-[#1f2533] border border-[#2a3142] p-4 rounded flex items-center justify-center h-[400px]">
                            {product.image_url ? (
                                <img src={product.image_url} alt={`${product.product_name} ${product.console_name}`} className="w-full h-full object-contain shadow-lg" />
                            ) : (
                                <span className="text-gray-500 font-bold text-xl">{dict.product.market.no_image}</span>
                            )}
                        </div>

                        {/* Cross Platform Links */}
                        <CrossPlatformLinks productId={product.id} lang={lang} />

                        {/* DESKTOP: Actions moved to Left Column */}
                        <div className="hidden md:block">
                            <ProductActions product={product} lang={lang} dict={dict} />
                        </div>

                        {/* DESKTOP: Description moved to Left Sidebar */}
                        <div className="hidden md:block">
                            <ProductDetails product={product} dict={dict} lang={lang} gamesSlug={gamesSlug} />
                            <div className="mt-8">
                                <WhyThisPrice salesCount={product.sales_count || 0} dict={dict} />
                            </div>
                        </div>
                    </div>

                    {/* Right: Details */}
                    <div className="md:col-span-8">

                        {/* Price Cards (Mobile: 2 cols, Desktop: 5 cols single row) */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
                            <PriceCard
                                label={dict.product.prices.loose}
                                price={product.loose_price}
                                definition={dict.product.conditions.loose}
                            />
                            <PriceCard
                                label={dict.product.prices.cib}
                                price={product.cib_price}
                                color="text-[#007bff]"
                                definition={dict.product.conditions.cib}
                                bestValue={true}
                            />
                            <PriceCard
                                label={dict.product.prices.new}
                                price={product.new_price}
                                color="text-[#00ff00]"
                                definition={dict.product.conditions.new}
                            />
                            {/* New Cards for Box/Manual */}
                            <PriceCard
                                label={dict.product.conditions.box_only}
                                price={product.box_only_price || 0}
                                color="text-[#f59e0b]" // amber
                                definition={dict.product.conditions.box_only}
                            />
                            <PriceCard
                                label={dict.product.conditions.manual_only}
                                price={product.manual_only_price || 0}
                                color="text-[#ef4444]" // red
                                definition={dict.product.conditions.manual_only}
                            />
                        </div>

                        {/* Middle: Compact Price History Chart */}
                        <div className="mb-6">
                            <h2 className="text-white text-sm font-bold mb-2 uppercase tracking-wider text-gray-400">{dict.product.market.price_trend}</h2>
                            <PriceHistoryChart history={history} className="h-[200px]" dict={dict} />
                        </div>

                        {/* SEO Market Analysis (Full Width / Inserted Here) */}
                        <div className="md:col-span-12 -mx-4 md:mx-0">
                            <MarketAnalysis product={product} dict={dict} lang={lang} />
                        </div>

                        {/* eBay Listings - The CORE Value */}
                        <div className="mb-8">
                            <h2 className="text-white text-lg font-bold mb-3">{dict.product.market.title}</h2>
                            <ListingsTable productId={product.id} dict={dict} />
                        </div>

                        {/* User Comments - NEW */}
                        <div className="mb-8">
                            <CommentsSection productId={product.id} lang={lang} />
                        </div>

                        {/* MOBILE: Actions moved BELOW Listings */}
                        <div className="block md:hidden mb-8">
                            <ProductActions product={product} lang={lang} dict={dict} />
                        </div>

                        {/* MOBILE: Description moved to Bottom */}
                        <div className="block md:hidden mb-8">
                            <ProductDetails product={product} dict={dict} lang={lang} gamesSlug={gamesSlug} />
                            <div className="mt-8">
                                <WhyThisPrice salesCount={product.sales_count || 0} dict={dict} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
