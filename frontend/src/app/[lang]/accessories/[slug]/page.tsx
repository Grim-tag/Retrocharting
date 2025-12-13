import Link from "next/link";
import { getProductById, getProductHistory } from "@/lib/api";
import ListingsTable from "@/components/ListingsTable";
import MarketAnalysis from "@/components/MarketAnalysis";
import PriceHistoryChart from "@/components/PriceHistoryChart";
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
            title: "Accessory Not Found | RetroCharting",
        };
    }

    const shortConsoleName = formatConsoleName(product.console_name);

    return {
        title: `${product.product_name} ${shortConsoleName} Prices | RetroCharting`,
        description: `Current value and price history for ${product.product_name} on ${product.console_name}.`,
    };
}

export default async function AccessoryPage({ params }: { params: Promise<{ slug: string; lang: string }> }) {
    const { slug, lang } = await params;
    const dict = await getDictionary(lang);
    const id = getIdFromSlug(slug);
    const product = await getProductById(id);

    if (!product) {
        const getSlug = (key: string) => routeMap[key]?.[lang] || key;
        const accessoriesSlug = getSlug('accessories');
        return (
            <main className="flex-grow bg-[#0f121e] py-20 text-center text-white">
                <h1 className="text-3xl font-bold">{dict.product.not_found.title}</h1>
                <Link href={`/${lang}/${accessoriesSlug}`} className="text-[#ff6600] hover:underline mt-4 inline-block">
                    {dict.product.not_found.back}
                </Link>
            </main>
        );
    }

    const history = await getProductHistory(id);
    const shortConsoleName = formatConsoleName(product.console_name);
    const getSlug = (key: string) => routeMap[key]?.[lang] || key;
    const accessoriesSlug = getSlug('accessories');

    const breadcrumbItems = [
        { label: dict.header.nav.accessories, href: `/${lang}/${accessoriesSlug}` },
        // Use console directory
        { label: product.console_name, href: `/${lang}/${accessoriesSlug}/console/${product.console_name.toLowerCase().replace(/ /g, '-')}` },
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
                        <div className="bg-[#1f2533] border border-[#2a3142] p-4 rounded flex items-center justify-center h-[400px]">
                            {product.image_url ? (
                                <img src={product.image_url} alt={product.product_name} className="w-full h-full object-contain shadow-lg" />
                            ) : (
                                <span className="text-gray-500 font-bold text-xl">No Image</span>
                            )}
                        </div>

                        {/* Cross Platform Links - Should typically be empty for accessories but harmless to keep */}
                        <CrossPlatformLinks productId={product.id} />
                    </div>

                    {/* Right: Details */}
                    <div className="md:col-span-8">
                        <h1 className="text-4xl font-bold text-white mb-2">
                            {product.product_name} {shortConsoleName} Prices
                        </h1>
                        <div className="text-[#ff6600] font-bold text-lg mb-6">{product.console_name}</div>

                        {/* Price Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                            <div className="bg-[#1f2533] border border-[#2a3142] p-6 rounded text-center">
                                <div className="text-gray-400 text-sm uppercase tracking-wider mb-2">{dict.product.prices.loose}</div>
                                <div className="text-3xl font-bold text-white">
                                    {product.loose_price ? `$${product.loose_price.toFixed(2)}` : '-'}
                                </div>
                            </div>
                            <div className="bg-[#1f2533] border border-[#2a3142] p-6 rounded text-center relative overflow-hidden">
                                <div className="absolute top-0 right-0 bg-[#007bff] text-white text-xs px-2 py-1">{dict.product.prices.best_value}</div>
                                <div className="text-gray-400 text-sm uppercase tracking-wider mb-2">{dict.product.prices.cib}</div>
                                <div className="text-3xl font-bold text-[#007bff]">
                                    {product.cib_price ? `$${product.cib_price.toFixed(2)}` : '-'}
                                </div>
                            </div>
                            <div className="bg-[#1f2533] border border-[#2a3142] p-6 rounded text-center">
                                <div className="text-gray-400 text-sm uppercase tracking-wider mb-2">{dict.product.prices.new}</div>
                                <div className="text-3xl font-bold text-[#00ff00]">
                                    {product.new_price ? `$${product.new_price.toFixed(2)}` : '-'}
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-4 mb-8">
                            <button className="flex-1 bg-[#ff6600] hover:bg-[#e65c00] text-white font-bold py-3 px-6 rounded transition-colors uppercase tracking-wide">
                                {dict.product.actions.add_collection}
                            </button>
                            <button className="flex-1 bg-[#2a3142] hover:bg-[#353e54] text-white font-bold py-3 px-6 rounded transition-colors uppercase tracking-wide border border-[#353e54]">
                                {dict.product.actions.add_wishlist}
                            </button>
                        </div>

                        {/* eBay Listings - Will auto-filter using category logic we just added! */}
                        <ListingsTable productId={product.id} dict={dict} />

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
                                {/* Reduced details for accessories usually, but keeping full set is fine */}
                                <div>
                                    <span className="text-gray-500 block">{dict.product.details.release_date}</span>
                                    <span className="text-white font-medium">{product.release_date ? new Date(product.release_date).toLocaleDateString() : "-"}</span>
                                </div>
                            </div>
                        </div>

                        {/* Price History */}
                        <div className="bg-[#1f2533] border border-[#2a3142] p-6 rounded mb-8 mt-8">
                            <h2 className="text-xl font-bold text-white mb-4">{dict.product.history.title}</h2>
                            <PriceHistoryChart history={history} dict={dict} />
                        </div>

                        {/* SEO Market Analysis */}
                        <div className="-mx-4 md:mx-0">
                            <MarketAnalysis product={product} dict={dict} lang={lang} />
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
