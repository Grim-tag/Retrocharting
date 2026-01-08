'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getProductsByConsole, getGenres, getProductById, getProductHistory } from '@/lib/api';
import Breadcrumbs from '@/components/seo/Breadcrumbs';
import ConsoleGameCatalog from '@/components/ConsoleGameCatalog';
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

// Replicate Dispatcher Helper Logic
// (Ideally this would be shared, but client components can duplicate simple utils safely)
const isSystemSlug = (slug: string, groupedSystems: any) => {
    const flatSystems = Object.values(groupedSystems).flat();
    const found = (flatSystems as string[]).find(s => s.toLowerCase().replace(/ /g, '-') === slug);
    return found || null;
};

function getIdFromSlug(slug: string): number {
    const parts = slug.split('-');
    const lastPart = parts[parts.length - 1];
    const id = parseInt(lastPart);
    return isNaN(id) ? 0 : id;
}

export default function GameConsoleClient({
    slug,
    lang,
    dict,
    groupedSystems,
    initialSystemName
}: {
    slug: string,
    lang: string,
    dict: any,
    groupedSystems: any,
    initialSystemName: string | null
}) {
    const searchParams = useSearchParams();
    const genre = searchParams.get('genre') || undefined;
    const sort = searchParams.get('sort') || undefined;

    // --- CONSOLE VIEW STATE ---
    const [products, setProducts] = useState<any[]>([]);
    const [genres, setGenres] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    // --- GAME VIEW STATE ---
    const [product, setProduct] = useState<any | null>(null);
    const [history, setHistory] = useState<any[]>([]);

    useEffect(() => {
        const load = async () => {
            if (initialSystemName) {
                // It's a Console
                const [p, g] = await Promise.all([
                    getProductsByConsole(initialSystemName, 40, genre, 'game', sort, 0, undefined),
                    getGenres(initialSystemName)
                ]);
                setProducts(p);
                setGenres(g);
                setLoading(false);
            } else {
                // It's a Game
                const id = getIdFromSlug(slug);
                const [p, h] = await Promise.all([
                    getProductById(id),
                    getProductHistory(id)
                ]);
                setProduct(p);
                setHistory(h);
                setLoading(false);
            }
        };
        load();
    }, [slug, initialSystemName, genre, sort]);

    const gamesSlug = lang === 'en' ? 'games' : 'games'; // Hardcoded routeMap match

    // --- RENDER CONSOLE ---
    if (initialSystemName) {
        if (loading) return <div className="min-h-screen bg-[#0f121e] text-white flex items-center justify-center">Loading Console...</div>;

        const breadcrumbItems = [
            { label: dict.header.nav.video_games, href: `/${lang}/${gamesSlug}` },
            { label: initialSystemName, href: `/${lang}/${gamesSlug}/${slug}` }
        ];

        return (
            <main className="flex-grow bg-[#0f121e] py-8">
                <div className="max-w-[1400px] mx-auto px-4">
                    <Breadcrumbs items={breadcrumbItems} lang={lang} />
                    <ConsoleGameCatalog
                        products={products}
                        genres={genres}
                        systemName={initialSystemName}
                        lang={lang}
                        gamesSlug={gamesSlug}
                        systemSlug={slug}
                        h1Title={`${initialSystemName} Games`} // Simplified for client
                        introText={`Explore ${initialSystemName} prices.`}
                        faq={[]}
                        productType="game"
                    />
                </div>
            </main>
        );
    }

    // --- RENDER GAME ---
    if (loading) return <div className="min-h-screen bg-[#0f121e] text-white flex items-center justify-center">Loading Game...</div>;

    if (!product) {
        return (
            <main className="flex-grow bg-[#0f121e] py-20 text-center text-white">
                <h1 className="text-3xl font-bold">{dict.product.not_found.title}</h1>
                <Link href={`/${lang}/${gamesSlug}`} className="text-[#ff6600] hover:underline mt-4 inline-block">
                    {dict.product.not_found.back}
                </Link>
            </main>
        );
    }

    // ... Copy Logic from Page ...
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
                <Breadcrumbs items={breadcrumbItems} />
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
                        {(product.console_name.includes("PAL") || product.product_name.includes("PAL")) ? (
                            <div className="bg-blue-600 px-3 py-1 rounded text-xs font-bold text-white uppercase tracking-wider shrink-0 mt-2">🇪🇺 PAL Region</div>
                        ) : (product.console_name.includes("Japan") || product.console_name.includes("JP")) ? (
                            <div className="bg-red-600 px-3 py-1 rounded text-xs font-bold text-white uppercase tracking-wider shrink-0 mt-2">🇯🇵 NTSC-J</div>
                        ) : (
                            <div className="bg-green-600 px-3 py-1 rounded text-xs font-bold text-white uppercase tracking-wider shrink-0 mt-2">🇺🇸 NTSC-U</div>
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
                            <PriceCard label={dict.product.prices.loose} price={product.loose_price} definition={dict.product.conditions.loose} />
                            <PriceCard label={dict.product.prices.cib} price={product.cib_price} color="text-[#007bff]" definition={dict.product.conditions.cib} bestValue={true} />
                            <PriceCard label={dict.product.prices.new} price={product.new_price} color="text-[#00ff00]" definition={dict.product.conditions.new} />
                            <PriceCard label={dict.product.conditions.box_only} price={product.box_only_price || 0} color="text-[#f59e0b]" definition={dict.product.conditions.box_only} />
                            <PriceCard label={dict.product.conditions.manual_only} price={product.manual_only_price || 0} color="text-[#ef4444]" definition={dict.product.conditions.manual_only} />
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

