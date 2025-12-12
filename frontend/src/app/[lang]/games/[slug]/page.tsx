import Link from "next/link";
import AddToWishlistButton from "@/components/AddToWishlistButton";
import { getProductById, getProductHistory, getProductsByConsole, getGenres } from "@/lib/api";
import ListingsTable from "@/components/ListingsTable";
import AddToCollectionButton from "@/components/AddToCollectionButton";
import PriceHistoryChart from "@/components/PriceHistoryChart";
import PriceCard from "@/components/PriceCard";
import WhyThisPrice from "@/components/WhyThisPrice";
import { Metadata } from "next";
import { formatConsoleName, getGameUrl } from "@/lib/utils";
import CrossPlatformLinks from "@/components/CrossPlatformLinks";
import Breadcrumbs from "@/components/seo/Breadcrumbs";
import JsonLd, { generateProductSchema } from "@/components/seo/JsonLd";
import { getDictionary } from "@/lib/get-dictionary";
import { routeMap } from "@/lib/route-config";
import { groupedSystems } from "@/data/systems";
import ConsoleGameCatalog from "@/components/ConsoleGameCatalog";
import ProductActions from "@/components/ProductActions";

// --- Helper to extract ID from slug ---
// format: title-console-id (e.g. metal-gear-solid-ps1-4402)
function getIdFromSlug(slug: string): number {
    const parts = slug.split('-');
    const lastPart = parts[parts.length - 1];
    const id = parseInt(lastPart);
    return isNaN(id) ? 0 : id;
}

// Helper to make title case from slug (e.g. super-nintendo -> Super Nintendo)
function unslugify(slug: string) {
    // Basic title case, but we prefer finding it in our system list first
    return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// Dispatcher Helper
function isSystemSlug(slug: string): string | null {
    const flatSystems = Object.values(groupedSystems).flat();
    // Normalize slug (e.g. Nintendo 64 -> nintendo-64)
    // Check if the current slug strictly equals a known system slug
    const found = flatSystems.find(s => s.toLowerCase().replace(/ /g, '-') === slug);
    return found || null; // Returns the proper System Name ("Nintendo 64") or null
}

export async function generateMetadata({ params, searchParams }: { params: Promise<{ slug: string; lang: string }>; searchParams: Promise<{ genre?: string }> }): Promise<Metadata> {
    const { slug, lang } = await params;

    // 1. Check if it's a Console Page
    const systemName = isSystemSlug(slug);
    if (systemName) {
        return {
            title: `${systemName} Video Games Price Guide | RetroCharting`,
            description: `Complete list of ${systemName} games with loose, CIB, and new prices. Filter by genre and find the best deals.`
        };
    }

    // 2. Default: Game Page
    const id = getIdFromSlug(slug);
    const product = await getProductById(id);

    if (!product) {
        return {
            title: "Product Not Found | RetroCharting",
        };
    }

    const shortConsoleName = formatConsoleName(product.console_name);

    return {
        title: `${product.product_name} ${shortConsoleName} Prices | RetroCharting`,
        description: `Current value and price history for ${product.product_name} on ${product.console_name}. Track your collection value.`,
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

    // --- DISPATCHER LOGIC ---

    // 1. CHECK IF CONSOLE
    const systemName = isSystemSlug(slug);

    if (systemName) {
        // === CONSOLE CATALOG VIEW ===
        const [products, genres] = await Promise.all([
            getProductsByConsole(systemName, 2000, undefined, 'game'),
            getGenres(systemName)
        ]);

        const breadcrumbItems = [
            { label: dict.header.nav.video_games, href: `/${lang}/${gamesSlug}` },
            { label: systemName, href: `/${lang}/${gamesSlug}/${slug}` }
        ];

        return (
            <main className="flex-grow bg-[#0f121e] py-8">
                <div className="max-w-[1400px] mx-auto px-4">
                    <Breadcrumbs items={breadcrumbItems} />
                    <ConsoleGameCatalog
                        products={products}
                        genres={genres}
                        systemName={systemName}
                        lang={lang}
                        gamesSlug={gamesSlug}
                        systemSlug={slug}
                    />
                </div>
            </main>
        );
    }

    // 2. DEFAULT: GAME DETAIL VIEW
    const id = getIdFromSlug(slug);
    const product = await getProductById(id);

    if (!product) {
        return (
            <main className="flex-grow bg-[#0f121e] py-20 text-center text-white">
                <h1 className="text-3xl font-bold">{dict.product.not_found.title}</h1>
                <Link href={`/${lang}/${getSlug('games')}`} className="text-[#ff6600] hover:underline mt-4 inline-block">
                    {dict.product.not_found.back}
                </Link>
            </main>
        );
    }

    const history = await getProductHistory(id);
    const shortConsoleName = formatConsoleName(product.console_name);

    const breadcrumbItems = [
        { label: dict.header.nav.video_games, href: `/${lang}/${gamesSlug}` },
        // Use console directory - NEW LINK STRUCTURE
        { label: product.console_name, href: `/${lang}/${gamesSlug}/${product.console_name.toLowerCase().replace(/ /g, '-')}` },
        { label: product.product_name, href: getGameUrl(product, lang) }
    ];

    const schema = generateProductSchema(product, `https://retrocharting.com${getGameUrl(product, lang)}`);

    return (
        <main className="flex-grow bg-[#0f121e] py-8">
            <div className="max-w-[1400px] mx-auto px-4">

                <JsonLd data={schema} />
                <Breadcrumbs items={breadcrumbItems} />

                {/* --- MOBILE OPTIMIZED LAYOUT START --- */}

                {/* 1. TITLE: Always Top (Full Width) */}
                <div className="flex items-start justify-between gap-4 mb-6">
                    <h1 className="text-2xl sm:text-4xl font-bold text-white leading-tight">
                        {product.product_name} {shortConsoleName} Prices
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
                    <span className="text-gray-400 font-normal text-sm">Prices updated daily</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                    {/* Left: Image + Desktop Actions */}
                    <div className="md:col-span-4 flex flex-col gap-4">
                        <div className="bg-[#1f2533] border border-[#2a3142] p-4 rounded flex items-center justify-center min-h-[200px] sm:min-h-[400px]">
                            {product.image_url ? (
                                <img src={product.image_url} alt={product.product_name} className="max-w-full max-h-[300px] sm:max-h-[400px] object-contain shadow-lg" />
                            ) : (
                                <span className="text-gray-500 font-bold text-xl">No Image</span>
                            )}
                        </div>

                        {/* Cross Platform Links */}
                        <CrossPlatformLinks productId={product.id} />

                        {/* DESKTOP: Actions moved to Left Column */}
                        <div className="hidden md:block">
                            <ProductActions product={product} lang={lang} dict={dict} />
                        </div>
                    </div>

                    {/* Right: Details */}
                    <div className="md:col-span-8">

                        {/* Price Cards (Mobile: 2 cols, Desktop: 3 cols) */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
                            <PriceCard
                                label={dict.product.prices.loose}
                                price={product.loose_price}
                                definition="Cartridge / Disc only. No box, no manual."
                            />
                            <PriceCard
                                label={dict.product.prices.cib}
                                price={product.cib_price}
                                color="text-[#007bff]"
                                definition="Complete In Box. Includes original box and manual."
                                bestValue={true}
                            />
                            <PriceCard
                                label={dict.product.prices.new}
                                price={product.new_price}
                                color="text-[#00ff00]"
                                definition="Brand new, sealed in original factory packaging."
                            />
                            {/* New Cards for Box/Manual */}
                            {product.box_only_price && product.box_only_price > 0 && (
                                <PriceCard
                                    label="Box Only"
                                    price={product.box_only_price}
                                    color="text-[#f59e0b]" // amber
                                    definition="Original box only. No game, no manual."
                                />
                            )}
                            {product.manual_only_price && product.manual_only_price > 0 && (
                                <PriceCard
                                    label="Manual Only"
                                    price={product.manual_only_price}
                                    color="text-[#ef4444]" // red
                                    definition="Original manual only. No game, no box."
                                />
                            )}
                        </div>

                        {/* eBay Listings - The CORE Value */}
                        <div className="mb-8">
                            <h3 className="text-white text-lg font-bold mb-3 md:hidden">Live Market Data</h3>
                            <ListingsTable productId={product.id} />
                        </div>

                        {/* MOBILE: Actions moved BELOW Listings */}
                        <div className="block md:hidden mb-8">
                            <ProductActions product={product} lang={lang} dict={dict} />
                        </div>

                        {/* Details & Description */}
                        <div className="bg-[#1f2533] border border-[#2a3142] p-6 rounded mb-8 mt-8">
                            <h2 className="text-xl font-bold text-white mb-4">{dict.product.details.description}</h2>
                            <p className="text-gray-300 mb-6 leading-relaxed">
                                {product.description || "No description available."}
                            </p>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-gray-500 block">{dict.product.details.publisher}</span>
                                    <span className="text-white font-medium">{product.publisher || "-"}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500 block">{dict.product.details.developer}</span>
                                    <span className="text-white font-medium">{product.developer || "-"}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500 block">{dict.product.details.release_date}</span>
                                    <span className="text-white font-medium">{product.release_date ? new Date(product.release_date).toLocaleDateString() : "-"}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500 block">{dict.product.details.genre}</span>
                                    <span className="text-white font-medium">
                                        {product.genre ? (
                                            product.genre.split(',').map((g, i) => {
                                                const genreName = g.trim();
                                                const consoleSlug = product.console_name.toLowerCase().replace(/ /g, '-');
                                                // Only link if we have a valid genre name
                                                if (!genreName) return null;
                                                return (
                                                    <span key={i}>
                                                        {i > 0 && ", "}
                                                        {/* Link to new console URL structure */}
                                                        <Link
                                                            href={`/${lang}/${gamesSlug}/${consoleSlug}?genre=${encodeURIComponent(genreName)}`}
                                                            className="hover:text-[#ff6600] hover:underline transition-colors"
                                                        >
                                                            {genreName}
                                                        </Link>
                                                    </span>
                                                );
                                            })
                                        ) : "-"}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-gray-500 block">{dict.product.details.players}</span>
                                    <span className="text-white font-medium">{product.players || "-"}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500 block">{dict.product.details.rating}</span>
                                    <span className="text-white font-medium">{product.esrb_rating || "-"}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500 block">EAN</span>
                                    <span className="text-white font-medium">{product.ean || "-"}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500 block">GTIN/UPC</span>
                                    <span className="text-white font-medium">{product.gtin || "-"}</span>
                                </div>
                            </div>
                        </div>

                        {/* Price History */}
                        <div className="bg-[#1f2533] border border-[#2a3142] p-6 rounded mb-8 mt-8">
                            <h2 className="text-xl font-bold text-white mb-4">{dict.product.history.title}</h2>
                            <PriceHistoryChart history={history} />
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
