import Link from "next/link";
import { getProductsByConsole, getGenres, Product } from "@/lib/api";
import { getDictionary } from "@/lib/get-dictionary";
import { routeMap } from "@/lib/route-config";
import Breadcrumbs from "@/components/seo/Breadcrumbs";
import { getGameUrl } from "@/lib/utils";
import { Metadata } from "next";
import { groupedSystems } from "@/data/systems";

// Helper to make title case from slug (e.g. super-nintendo -> Super Nintendo)
function unslugify(slug: string) {
    return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ system_slug: string, lang: string }> }): Promise<Metadata> {
    const { system_slug } = await params;

    // Find exact system name from slug
    const flatSystems = Object.values(groupedSystems).flat();
    const systemName = flatSystems.find(s => s.toLowerCase().replace(/ /g, '-') === system_slug) || unslugify(system_slug);

    return {
        title: `${systemName} Video Games Price Guide | RetroCharting`,
    };
}

export default async function ConsolePage({
    params,
    searchParams
}: {
    params: Promise<{ system_slug: string, lang: string }>,
    searchParams: Promise<{ genre?: string }>
}) {
    const { system_slug, lang } = await params;
    const { genre } = await searchParams;
    const dict = await getDictionary(lang);

    // Find exact system name from slug
    const flatSystems = Object.values(groupedSystems).flat();
    const systemName = flatSystems.find(s => s.toLowerCase().replace(/ /g, '-') === system_slug) || unslugify(system_slug);

    // Parallel Fetching
    const [products, genres] = await Promise.all([
        getProductsByConsole(systemName, 100, genre, 'game'),
        getGenres(systemName)
    ]);

    const getSlug = (key: string) => routeMap[key]?.[lang] || key;
    const gamesSlug = getSlug('games');

    const breadcrumbItems = [
        { label: dict.header.nav.video_games, href: `/${lang}/${gamesSlug}` },
        { label: systemName, href: `/${lang}/${gamesSlug}/console/${system_slug}` }
    ];

    // Filter UI Component (Inline for simplicity)
    const FilterChips = () => (
        <div className="mb-8">
            <div className="flex flex-wrap justify-center gap-2">
                <Link
                    href={`/${lang}/${gamesSlug}/console/${system_slug}`}
                    className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold border transition-colors ${!genre
                        ? 'bg-[#ff6600] text-white border-[#ff6600]'
                        : 'bg-[#1f2533] text-gray-400 border-[#2a3142] hover:border-white hover:text-white'
                        }`}
                >
                    All Games
                </Link>
                {genres.filter(g => g !== 'Systems' && g !== 'Accessories').map(g => (
                    <Link
                        key={g}
                        href={`/${lang}/${gamesSlug}/console/${system_slug}?genre=${encodeURIComponent(g)}`}
                        className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold border transition-colors ${genre === g
                            ? 'bg-[#ff6600] text-white border-[#ff6600]'
                            : 'bg-[#1f2533] text-gray-400 border-[#2a3142] hover:border-white hover:text-white'
                            }`}
                    >
                        {g}
                    </Link>
                ))}
            </div>
        </div>
    );

    return (
        <main className="flex-grow bg-[#0f121e] py-8">
            <div className="max-w-[1400px] mx-auto px-4">
                <Breadcrumbs items={breadcrumbItems} />

                <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                    <h1 className="text-3xl font-bold text-white">
                        {systemName} {dict.home.categories.items.video_games.title}
                        {genre && <span className="text-gray-500 ml-2 text-xl font-normal">/ {genre}</span>}
                    </h1>
                    <div className="text-gray-400 text-sm">
                        Showing {products.length} games
                    </div>
                </div>

                <FilterChips />

                {/* DEBUG: Remove after fixing */}
                <div className="text-xs text-red-500 mb-4 font-mono bg-black p-2 border border-red-900 break-all">
                    DEBUG: genre param = '{genre}'<br />
                    DEBUG: searchParams keys = {JSON.stringify(Object.keys(await searchParams))}<br />
                    DEBUG: full searchParams = {JSON.stringify(await searchParams)}<br />
                    DEBUG: First genre = '{genres.find(g => g.includes('&'))}'
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {products.map((product) => (
                        <Link
                            key={product.id}
                            href={getGameUrl(product, lang)}
                            className="bg-[#1f2533] border border-[#2a3142] rounded overflow-hidden hover:border-[#ff6600] transition-all group flex flex-col"
                        >
                            <div className="aspect-[3/4] p-4 flex items-center justify-center bg-[#151922]">
                                {product.image_url ? (
                                    <img src={product.image_url} alt={product.product_name} className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform" />
                                ) : (
                                    <div className="text-gray-600 text-xs">No Image</div>
                                )}
                            </div>
                            <div className="p-4 flex flex-col flex-grow">
                                <h3 className="font-bold text-white text-sm line-clamp-2 mb-1 group-hover:text-[#ff6600] transition-colors">
                                    {product.product_name}
                                </h3>
                                {product.genre && (
                                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">
                                        {product.genre}
                                    </div>
                                )}
                                <div className="flex justify-between items-end mt-auto">
                                    <div className="text-xs text-gray-400">Loose</div>
                                    <div className="font-bold text-[#ff6600]">
                                        {product.loose_price ? `$${product.loose_price.toFixed(2)}` : '-'}
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {products.length === 0 && (
                    <div className="text-center text-gray-400 py-12 bg-[#1f2533] rounded border border-[#2a3142]">
                        <p className="text-xl mb-2">No games found for this filter.</p>
                        <Link href={`/${lang}/${gamesSlug}/console/${system_slug}`} className="text-[#ff6600] hover:underline">
                            Clear Filters
                        </Link>
                    </div>
                )}
            </div>
        </main >
    );
}

