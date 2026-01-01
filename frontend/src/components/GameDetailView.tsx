import Link from 'next/link';
import Breadcrumbs from '@/components/seo/Breadcrumbs';
import ProductActions from '@/components/ProductActions';
import ProductDetails from '@/components/ProductDetails';
import CommentsSection from '@/components/comments/CommentsSection';
import AlternateLinksRegistrar from '@/components/AlternateLinksRegistrar';
import CrossPlatformLinks from '@/components/CrossPlatformLinks';
import PriceCard from '@/components/PriceCard';
import PriceHistoryChart from '@/components/PriceHistoryChart';
import MarketAnalysis from '@/components/MarketAnalysis';
import ListingsTable from '@/components/ListingsTable';
import WhyThisPrice from '@/components/WhyThisPrice';
import { formatConsoleName, getGameUrl } from '@/lib/utils';
import { generateVideoGameSchema } from '@/components/seo/JsonLd';
import JsonLd from '@/components/seo/JsonLd';

interface GameDetailViewProps {
    product: any;
    history: any[];
    lang: string;
    dict: any;
    game?: any; // Unified Game Data
}

export default function GameDetailView({
    product,
    history,
    lang,
    dict,
    game
}: GameDetailViewProps) {
    const gamesSlug = lang === 'en' ? 'games' : 'games'; // TODO: proper routeMap

    const shortConsoleName = formatConsoleName(product.console_name);
    const breadcrumbItems = [
        { label: dict.header.nav.video_games, href: `/${lang}/${gamesSlug}` },
        { label: product.console_name, href: `/${lang}/${gamesSlug}/${product.console_name.toLowerCase().replace(/ /g, '-')}` },
        { label: product.product_name, href: getGameUrl(product, lang) }
    ];
    const schema = generateVideoGameSchema(product, `https://retrocharting.com${getGameUrl(product, lang)}`);

    return (
        <main className="flex-grow bg-[#0f121e] py-8">
            <div className="max-w-[1400px] mx-auto px-4">
                <JsonLd data={schema} />
                <Breadcrumbs items={breadcrumbItems} lang={lang} />
                <AlternateLinksRegistrar
                    en={getGameUrl(product, 'en')}
                    fr={getGameUrl(product, 'fr')}
                />

                {/* --- HEADER --- */}
                <div className="flex items-start justify-between gap-4 mb-6">
                    <h1 className="text-2xl sm:text-4xl font-bold text-white leading-tight">
                        {product.product_name} {shortConsoleName} {dict.product.market.suffix}
                    </h1>
                    <div className="hidden sm:block">
                        {/* Only show specific region badge if NOT in Unified Mode. Unified Mode shows regions in the Global Market table. */}
                        {!game && (
                            (product.console_name.includes("PAL") || product.product_name.includes("PAL")) ? (
                                <div className="bg-blue-600 px-3 py-1 rounded text-xs font-bold text-white uppercase tracking-wider shrink-0 mt-2">🇪🇺 PAL Region</div>
                            ) : (product.console_name.includes("Japan") || product.console_name.includes("JP")) ? (
                                <div className="bg-red-600 px-3 py-1 rounded text-xs font-bold text-white uppercase tracking-wider shrink-0 mt-2">🇯🇵 NTSC-J</div>
                            ) : (
                                <div className="bg-green-600 px-3 py-1 rounded text-xs font-bold text-white uppercase tracking-wider shrink-0 mt-2">🇺🇸 NTSC-U</div>
                            )
                        )}
                        {/* Option: Show Global Badge if Unified? */}
                        {game && (
                            <div className="bg-purple-600 px-3 py-1 rounded text-xs font-bold text-white uppercase tracking-wider shrink-0 mt-2">🌍 Global</div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                    {/* Left Column */}
                    <div className="md:col-span-4 flex flex-col gap-4">
                        <div className="bg-[#1f2533] border border-[#2a3142] p-4 rounded flex items-center justify-center h-[400px]">
                            {product.image_url ? (
                                <img src={product.image_url} alt={product.product_name} className="w-full h-full object-contain shadow-lg" />
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

                    {/* Right Column */}
                    <div className="md:col-span-8">
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
                            <PriceCard label={dict.product.prices.loose} price={product.loose_price} definition={dict.product.conditions?.loose || "Cartridge only"} />
                            <PriceCard label={dict.product.prices.cib} price={product.cib_price} color="text-[#007bff]" definition={dict.product.conditions?.cib || "Complete in Box"} bestValue={true} />
                            <PriceCard label={dict.product.prices.new} price={product.new_price} color="text-[#00ff00]" definition={dict.product.conditions?.new || "New Sealed"} />
                            <PriceCard label={dict.product.conditions?.box_only || "Box Only"} price={product.box_only_price || 0} color="text-[#f59e0b]" definition={dict.product.conditions?.box_only || "Box Only"} />
                            <PriceCard label={dict.product.conditions?.manual_only || "Manual Only"} price={product.manual_only_price || 0} color="text-[#ef4444]" definition={dict.product.conditions?.manual_only || "Manual Only"} />
                        </div>

                        {/* REGIONAL BREAKDOWN (Unified View Only) */}
                        {game && game.variants && (
                            <div className="mb-8 bg-[#1f2533] border border-[#2a3142] rounded p-4">
                                <h3 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
                                    <span>🌍</span> Global Market Prices
                                </h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left text-gray-300">
                                        <thead className="text-xs text-gray-400 uppercase bg-[#0f121e]">
                                            <tr>
                                                <th className="px-4 py-3">Region</th>
                                                <th className="px-4 py-3">Loose</th>
                                                <th className="px-4 py-3">CIB</th>
                                                <th className="px-4 py-3">New</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {game.variants.map((v: any) => (
                                                <tr key={v.id} className="border-b border-[#2a3142] hover:bg-[#2a3142]/50">
                                                    <td className="px-4 py-3 font-medium text-white flex items-center gap-2">
                                                        {v.region.includes("PAL") ? "🇪🇺 PAL" : v.region.includes("JP") ? "🇯🇵 JP" : "🇺🇸 NTSC"}
                                                        <span className="text-xs text-gray-500">({v.product_name})</span>
                                                    </td>
                                                    <td className="px-4 py-3">{v.prices.loose ? `${v.prices.currency} ${v.prices.loose}` : '-'}</td>
                                                    <td className="px-4 py-3">{v.prices.cib ? `${v.prices.currency} ${v.prices.cib}` : '-'}</td>
                                                    <td className="px-4 py-3">{v.prices.new ? `${v.prices.currency} ${v.prices.new}` : '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        <div className="mb-6">
                            <h2 className="text-white text-sm font-bold mb-2 uppercase tracking-wider text-gray-400">{dict.product.market.price_trend}</h2>
                            <PriceHistoryChart history={history} className="h-[200px]" dict={dict} />
                        </div>

                        <div className="md:col-span-12 -mx-4 md:mx-0">
                            <MarketAnalysis product={product} dict={dict} lang={lang} />
                        </div>

                        <div className="mb-8">
                            <h2 className="text-white text-lg font-bold mb-3">{dict.product.market.title}</h2>
                            <ListingsTable productId={product.id} dict={dict} />
                        </div>

                        <div className="mb-8">
                            <CommentsSection productId={product.id} lang={lang} />
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
