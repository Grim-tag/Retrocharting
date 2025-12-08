import Link from "next/link";
import { getProductById, getProductHistory } from "@/lib/api";
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

// --- Helper to extract ID from slug ---
// format: title-console-id (e.g. metal-gear-solid-ps1-4402)
function getIdFromSlug(slug: string): number {
    const parts = slug.split('-');
    const lastPart = parts[parts.length - 1];
    const id = parseInt(lastPart);
    return isNaN(id) ? 0 : id;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string; lang: string }> }): Promise<Metadata> {
    const { slug, lang } = await params;
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

export default async function GamePage({ params }: { params: Promise<{ slug: string; lang: string }> }) {
    const { slug, lang } = await params;
    const dict = await getDictionary(lang);
    const id = getIdFromSlug(slug);
    const product = await getProductById(id);
    // TODO: We could redirect if the SLUG doesn't match the canonical one, but for now we just serve the page.
    // Ideally we check if (product) and then verify if matches getGameUrl. If not -> redirect 301.

    if (!product) {
        const getSlug = (key: string) => routeMap[key]?.[lang] || key;
        return (
            <main className="flex-grow bg-[#0f121e] py-20 text-center text-white">
                <h1 className="text-3xl font-bold">{dict.product.not_found.title}</h1>
                <Link href={`/${lang}/${getSlug('games')}`} className="text-[#ff6600] hover:underline mt-4 inline-block">
                    {dict.product.not_found.back}
                </Link>
            </main>
        );
    }

    // Check canonical redirect (Optional but good for SEO)
    // const canonicalUrl = getGameUrl(product, lang);
    // const currentUrl = `/${lang}/${routeMap['games'][lang]}/${slug}`;
    // if (currentUrl !== canonicalUrl) ... (need headers/middleware for full URL check)

    const history = await getProductHistory(id);
    const shortConsoleName = formatConsoleName(product.console_name);
    const getSlug = (key: string) => routeMap[key]?.[lang] || key;
    const gamesSlug = getSlug('games');

    const breadcrumbItems = [
        { label: dict.header.nav.video_games, href: `/${lang}/${gamesSlug}` },
        // Use console directory
        { label: product.console_name, href: `/${lang}/${gamesSlug}/console/${product.console_name.toLowerCase().replace(/ /g, '-')}` },
        { label: product.product_name, href: getGameUrl(product, lang) }
    ];

    const schema = generateProductSchema(product, `https://retrocharting.com${getGameUrl(product, lang)}`);

    return (
        <main className="flex-grow bg-[#0f121e] py-8">
            <div className="max-w-[1400px] mx-auto px-4">

                <JsonLd data={schema} />
                <Breadcrumbs items={breadcrumbItems} />

                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                    {/* Left: Image */}
                    <div className="md:col-span-4">
                        <div className="bg-[#1f2533] border border-[#2a3142] p-4 rounded flex items-center justify-center min-h-[400px]">
                            {product.image_url ? (
                                <img src={product.image_url} alt={product.product_name} className="max-w-full max-h-[400px] object-contain shadow-lg" />
                            ) : (
                                <span className="text-gray-500 font-bold text-xl">No Image</span>
                            )}
                        </div>

                        {/* Cross Platform Links */}
                        <CrossPlatformLinks productId={product.id} />
                    </div>

                    {/* Right: Details */}
                    <div className="md:col-span-8">
                        <div className="flex items-start justify-between gap-4 mb-2">
                            <h1 className="text-4xl font-bold text-white leading-tight">
                                {product.product_name}
                            </h1>
                            {/* Region Flag Badge */}
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

                        <div className="text-[#ff6600] font-bold text-lg mb-6 flex items-center gap-2">
                            <span>{product.console_name}</span>
                            <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
                            <span className="text-gray-400 font-normal text-sm">Prices updated daily</span>
                        </div>

                        {/* Price Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
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
                        </div>

                        {/* Why This Price - Trust Booster */}
                        <WhyThisPrice salesCount={product.sales_count || 0} />

                        {/* Actions */}
                        <div className="flex gap-4 mb-8">
                            <AddToCollectionButton product={product} lang={lang} />
                            <button className="flex-1 bg-[#2a3142] hover:bg-[#353e54] text-white font-bold py-3 px-6 rounded transition-colors uppercase tracking-wide border border-[#353e54]">
                                {dict.product.actions.add_wishlist}
                            </button>
                        </div>

                        {/* eBay Listings */}
                        <ListingsTable productId={product.id} />

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
                                    <span className="text-white font-medium">{product.genre || "-"}</span>
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
