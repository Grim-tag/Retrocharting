import Link from "next/link";
import { getProductHistory } from "@/lib/api";
import { getProductById } from "@/lib/cached-api";
import { getDictionary } from "@/lib/get-dictionary";
import { routeMap } from "@/lib/route-config";
import ListingsTable from "@/components/ListingsTable";
import MarketAnalysis from "@/components/MarketAnalysis";
import PriceHistoryChart from "@/components/PriceHistoryChart";
import PriceCard from "@/components/PriceCard";
import WhyThisPrice from "@/components/WhyThisPrice";
import { formatConsoleName, getGameUrl } from "@/lib/utils";
import CrossPlatformLinks from "@/components/CrossPlatformLinks";
import Breadcrumbs from "@/components/seo/Breadcrumbs";
import JsonLd, { generateVideoGameSchema } from "@/components/seo/JsonLd";
import ProductActions from "@/components/ProductActions";
import ProductDetails from "@/components/ProductDetails";
import CommentsSection from "@/components/comments/CommentsSection";
import AlternateLinksRegistrar from "@/components/AlternateLinksRegistrar";

// Helper locally or import?
// It was local in page.tsx. Let's include it here or verify if it's exported.
// The original page defined it locally. I'll define it locally.
function getIdFromSlug(slug: string): number {
    const parts = slug.split('-');
    const lastPart = parts[parts.length - 1];
    const id = parseInt(lastPart);
    return isNaN(id) ? 0 : id;
}

interface ConsoleProductViewProps {
    slug: string;
    lang: string;
}

export default async function ConsoleProductView({ slug, lang }: ConsoleProductViewProps) {
    const dict = await getDictionary(lang);
    const consolesSlug = routeMap['consoles']?.[lang] || 'consoles';
    const gamesSlug = routeMap['games']?.[lang] || 'games';

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
                {/* User Request: PAL PS5 Call Of Duty ... Prices & Value */}
                {(() => {
                    // Determine System Info first
                    let baseSystem = product.console_name.replace("PAL ", "").replace("JP ", "").replace("Japan ", "").trim();
                    let shortSystem = baseSystem.replace(/Playstation\s+(\d+)/i, "PS$1").replace("Playstation", "PS").replace("Nintendo", "Nintendo");

                    // Clean Product Name
                    // 1. Remove brackets
                    let cleanName = product.product_name.replace(/[\[\]]/g, '');
                    // 2. Remove "Console" word (orphaned)
                    cleanName = cleanName.replace(/\bConsole\b/gi, '');
                    // 3. Remove System Name to avoid repetition (e.g. "Playstation 5")
                    // escaped for regex
                    const escapedSystem = baseSystem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    cleanName = cleanName.replace(new RegExp(escapedSystem, 'gi'), '');

                    cleanName = cleanName.trim();

                    // Determine Region Prefix
                    let regionPrefix = "";
                    if (product.console_name.includes("PAL") || product.product_name.includes("PAL")) regionPrefix = "PAL";
                    else if (product.console_name.includes("Japan") || product.console_name.includes("JP")) regionPrefix = "JP";

                    // Construct H1
                    // If cleanName is empty (e.g. "Playstation 5 Console"), avoiding H1 "PAL PS5 Prices..." is fine?
                    // actually yes.
                    const h1Text = `${regionPrefix} ${shortSystem} ${cleanName} ${dict.product.market.suffix}`.replace(/\s+/g, ' ').trim();

                    return (
                        <div className="flex items-start justify-between gap-4 mb-6">
                            <h1 className="text-2xl sm:text-4xl font-bold text-white leading-tight">
                                {h1Text}
                            </h1>
                            {/* Region Flag Badge (Kept for visual flair, even if H1 is explicit) */}
                            <div className="hidden sm:block">
                                {regionPrefix === 'PAL' && (
                                    <div className="bg-blue-600 px-3 py-1 rounded text-xs font-bold text-white uppercase tracking-wider shrink-0 mt-2">
                                        🇪🇺 PAL Region
                                    </div>
                                )}
                                {regionPrefix === 'JP' && (
                                    <div className="bg-red-600 px-3 py-1 rounded text-xs font-bold text-white uppercase tracking-wider shrink-0 mt-2">
                                        🇯🇵 NTSC-J
                                    </div>
                                )}
                                {(!regionPrefix) && (
                                    <div className="bg-green-600 px-3 py-1 rounded text-xs font-bold text-white uppercase tracking-wider shrink-0 mt-2">
                                        🇺🇸 NTSC-U
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })()}

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

                        <CrossPlatformLinks productId={product.id} lang={lang} />

                        <div className="hidden md:block">
                            <ProductActions product={product} lang={lang} dict={dict} />
                        </div>

                        <div className="hidden md:block">
                            <ProductDetails product={product} dict={dict} lang={lang} gamesSlug={gamesSlug} />
                            <div className="mt-8">
                                <WhyThisPrice salesCount={product.sales_count || 0} dict={dict} />
                            </div>
                        </div>
                    </div>

                    {/* Right: Details */}
                    <div className="md:col-span-8">

                        {/* Price Cards */}
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
                            <PriceCard
                                label={dict.product.conditions.box_only}
                                price={product.box_only_price || 0}
                                color="text-[#f59e0b]"
                                definition={dict.product.conditions.box_only}
                            />
                            <PriceCard
                                label={dict.product.conditions.manual_only}
                                price={product.manual_only_price || 0}
                                color="text-[#ef4444]"
                                definition={dict.product.conditions.manual_only}
                            />
                        </div>

                        <div className="mb-6">
                            <h2 className="text-white text-sm font-bold mb-2 uppercase tracking-wider text-gray-400">{dict.product.market.price_trend}</h2>
                            <PriceHistoryChart history={history} className="h-[200px]" dict={dict} />
                        </div>

                        <div className="md:col-span-12 -mx-4 md:mx-0">
                            <MarketAnalysis product={product} dict={dict} lang={lang} />
                        </div>

                        <div className="mb-8">
                            <h2 className="text-white text-lg font-bold mb-3">{dict.product.market.title}</h2>
                            <ListingsTable productId={product.id} dict={dict} genre={product.genre} />
                        </div>

                        <div className="mb-8">
                            <CommentsSection productId={product.id} lang={lang} />
                        </div>

                        <div className="block md:hidden mb-8">
                            <ProductActions product={product} lang={lang} dict={dict} />
                        </div>

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
