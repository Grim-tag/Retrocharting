import { Metadata } from 'next';
import Link from 'next/link';
import { getDictionary } from '@/lib/get-dictionary';
import { groupedSystems } from '@/data/systems';
import { generateConsoleSeo } from '@/lib/seo-utils';
import { getProductById, getProductHistory, getProductsByConsole, getGenres } from '@/lib/api';
import { formatConsoleName } from '@/lib/utils';
// import ConsoleGameCatalog from '@/components/ConsoleGameCatalog';
import GameDetailView from '@/components/GameDetailView';
import ConsoleGameCatalogWrapper from '@/components/ConsoleGameCatalogWrapper';
// import dynamic from 'next/dynamic';

// const ConsoleGameCatalog = dynamic(() => import('@/components/ConsoleGameCatalog'), {
//     ssr: false,
//     loading: () => <div className="text-white text-center py-20">Loading Catalog...</div>
// });

// Dispatch Logic
function isSystemSlug(slug: string): string | null {
    const flatSystems = Object.values(groupedSystems).flat();
    const found = flatSystems.find(s => s.toLowerCase().replace(/ /g, '-') === slug);
    return found || null;
}

function getIdFromSlug(slug: string): number {
    // Try to match the last segment as a number
    const match = slug.match(/-(\d+)$/);
    if (match && match[1]) {
        return parseInt(match[1], 10);
    }
    // Fallback: Try split
    const parts = slug.split('-');
    const lastPart = parts[parts.length - 1];
    const id = parseInt(lastPart);
    return isNaN(id) ? 0 : id;
}

// Disable Static Generation for Build Performance (ISR Only)
// We must force dynamic because we access searchParams which makes the page dynamic at runtime
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// export async function generateStaticParams() {
//     return [];
// }

export async function generateMetadata({ params, searchParams }: { params: Promise<{ slug: string; lang: string }>, searchParams: Promise<{ genre?: string, sort?: string }> }): Promise<Metadata> {
    try {
        const { slug, lang } = await params;
        const { genre, sort } = await searchParams;
        const dict = await getDictionary(lang);

        const systemName = isSystemSlug(slug);
        if (systemName) {
            const seo = generateConsoleSeo(systemName, genre, sort, 0, lang);
            return {
                title: seo.title,
                description: seo.description
            };
        }

        // 1. Try unified game (slug based)
        // If slug has no ID at end, or we want to prioritize game lookups
        const { getGameBySlug } = await import('@/lib/api');
        const game = await getGameBySlug(slug);

        if (game) {
            const shortConsoleName = formatConsoleName(game.console || "");
            return {
                title: `${game.title} ${shortConsoleName} ${dict.product.market.suffix} | RetroCharting`,
                description: game.description || `Current market value for ${game.title} on ${game.console}`
            };
        }

        // 2. Fallback Legacy
        const id = getIdFromSlug(slug);
        const product = await getProductById(id);

        if (!product) return { title: "Product Not Found" };

        const shortConsoleName = formatConsoleName(product.console_name);
        return {
            title: `${product.product_name} ${shortConsoleName} ${dict.product.market.suffix} | RetroCharting`,
            description: `Current market value for ${product.product_name}`
        };
    } catch (error) {
        console.error("Error generating metadata:", error);
        return {
            title: "RetroCharting",
            description: "Video Game Price Guide"
        };
    }
}

export default async function Page({
    params,
    searchParams
}: {
    params: Promise<{ slug: string; lang: string }>,
    searchParams: Promise<{ genre?: string, sort?: string, search?: string }>
}) {
    try {
        const { slug, lang } = await params;
        const { genre, sort, search } = await searchParams;
        const dict = await getDictionary(lang);

        const systemName = isSystemSlug(slug);

        if (systemName) {
            // --- CONSOLE VIEW (CLIENT-ONLY STABILITY MODE) ---
            // We skip server-side fetching to prevent 500 errors.
            // The client component will fetch data on mount.

            const gamesSlug = lang === 'en' ? 'games' : 'games';

            return (
                <main className="flex-grow bg-[#0f121e] py-8">
                    <div className="max-w-[1400px] mx-auto px-4">
                        <div className="mb-4">
                            <nav className="flex text-sm text-gray-400 mb-6" aria-label="Breadcrumb">
                                <ol className="flex items-center space-x-2">
                                    <li>
                                        <Link href={`/${lang}/${gamesSlug}`} className="hover:text-white transition-colors">
                                            {dict.header.nav.video_games}
                                        </Link>
                                    </li>
                                    <li className="text-gray-600">/</li>
                                    <li className="text-white font-medium" aria-current="page">
                                        {systemName}
                                    </li>
                                </ol>
                            </nav>
                        </div>

                        <ConsoleGameCatalogWrapper
                            products={[]}
                            genres={[]}
                            systemName={systemName}
                            lang={lang}
                            gamesSlug={gamesSlug}
                            systemSlug={slug}
                            h1Title={`${systemName} Games`}
                            introText={`Explore ${systemName} prices and values.`}
                            faq={[]}
                            productType="game"
                        />
                    </div>
                </main>
            );
        } else {
            // CHECK REGIONAL REDIRECTS (Migration Phase 2)
            // If user searches for /games/pal-playstation-5, we redirect to /games/playstation-5
            if (slug.startsWith('pal-') || slug.startsWith('jp-') || slug.startsWith('asian-english-') || slug.startsWith('asian-')) {
                const cleanSlug = slug.replace(/^(pal-|jp-|asian-english-|asian-)/, '');
                // Verify the target actually exists
                if (isSystemSlug(cleanSlug)) {
                    const { redirect } = await import('next/navigation');
                    redirect(`/${lang}/games/${cleanSlug}`);
                }
            }

            // --- GAME VIEW (Unified + Fallback) ---

            // 1. Try fetching as Unified Game (Slug-based)
            const { getGameBySlug, getGameHistory } = await import('@/lib/api');
            const game = await getGameBySlug(slug);

            if (game) {
                // Unified Game Success!
                // We need to pick a "Main" product to satisfy the legacy view props.
                // Priority: NTSC > PAL > JP > Other
                const mainVariant = game.variants.find((v: any) => v.region.includes("NTSC"))
                    || game.variants.find((v: any) => v.region.includes("PAL"))
                    || game.variants[0];

                // Fetch full details for the main variant to get proper fields (desc, etc) that might be light in game object
                // actually Game object has description.
                // But GameDetailView needs a "Product" object structure.
                // We can construct a mock product from game + variant data, or fetch the main variant ID.
                // Let's fetch the main variant product to be safe and compatible.
                const [mainProduct, history] = await Promise.all([
                    getProductById(mainVariant.id),
                    getGameHistory(slug) // Aggregated history
                ]);

                if (!mainProduct) return <div className="text-white">Main variant data missing.</div>;

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

            // 2. Fallback: Legacy ID-based Fetch
            // If slug lookup failed, maybe it's an old link "product-slug-123"
            const id = getIdFromSlug(slug);

            if (!id) {
                return (
                    <div className="text-white text-center py-20">Invalid Product/Game</div>
                );
            }

            const [product, history] = await Promise.all([
                getProductById(id),
                getProductHistory(id)
            ]);

            // VERIFICATION: Check if loaded product matches the URL slug context
            // This prevents "Broken Link" issues where old IDs point to new wrong products (due to DB shifts).
            if (product) {
                const urlSlug = slug.toLowerCase();
                const consoleSlug = product.console_name.toLowerCase().replace(/ /g, '-');
                const titleSlug = product.product_name.toLowerCase().replace(/[^a-z0-9]/g, '');

                // Flexible Check: Does URL contain the Console Name OR a significant part of the Title?
                // If URL is "fallout-76-ps4..." and Product is "Balloon Kid Gameboy", this fails.
                // We require at least Console match OR Title match.

                // Simplify: just check if URL contains a fragment of title?
                // "fallout-76" contains "fallout"? Yes.
                // "balloon-kid" in "fallout-76..."? No.

                // We accept match if:
                // 1. Console checks out (roughly)
                // OR
                // 2. Title checks out (roughly)

                // Heuristic: If slug is VERY long (legacy), it usually contains console and title.
                // Let's check for blatant mismatch.

                const isConsoleMismatch = !urlSlug.includes(product.console_name.split(' ')[0].toLowerCase()); // Check "GameBoy" in slug
                const isTitleMismatch = !urlSlug.includes(product.product_name.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, ''));

                if (isConsoleMismatch && isTitleMismatch) {
                    console.warn(`Legacy ID Mismatch: ID ${id} loaded "${product.product_name}" but URL was "${slug}". Treating as 404.`);
                    // Force 404
                    return (
                        <div className="bg-[#0f121e] min-h-screen flex items-center justify-center text-white py-20 px-4">
                            <div className="text-center">
                                <h1 className="text-3xl font-bold mb-4">Link Expired</h1>
                                <p className="text-gray-400 mb-6">This product link is outdated. Please search for the game again.</p>
                                <Link href={`/${lang}/games`} className="bg-[#ff6600] text-white px-6 py-2 rounded hover:bg-[#e65c00]">
                                    Browse Games
                                </Link>
                            </div>
                        </div>
                    );
                }
            }

            if (!product) {
                // ... 404 view
                return (
                    <main className="flex-grow bg-[#0f121e] py-20 text-center text-white">
                        <h1 className="text-3xl font-bold">{dict.product.not_found.title}</h1>
                        <Link href={`/${lang}/games`} className="text-[#ff6600] hover:underline mt-4 inline-block">
                            {dict.product.not_found.back}
                        </Link>
                    </main>
                );
            }

            // SEO REDIRECTION (Migration Phase 2)
            // If this legacy product is now part of a Unified Game, redirect to the Game Page.
            /* 
            // DISABLE REDIRECT TEMP: Backend API seems not ready/deployed yet. 
            // Keeping users on legacy page to avoid 404s.
            if (product.game_slug) {
                const { redirect } = await import('next/navigation');
                redirect(`/${lang}/games/${product.game_slug}`);
            }
            */

            return (
                <GameDetailView
                    product={product}
                    history={history}
                    lang={lang}
                    dict={dict}
                />
            );
        }
    } catch (error: any) {
        // Next.js redirect() throws an error that should not be caught
        if (error?.message === 'NEXT_REDIRECT' || error?.digest?.startsWith('NEXT_REDIRECT')) {
            throw error;
        }
        console.error("Critical Error in Page:", error);
        return (
            <div className="bg-[#0f121e] min-h-screen flex items-center justify-center text-white p-4">
                <div className="max-w-md bg-[#1f2533] p-6 rounded border border-red-500">
                    <h2 className="text-xl font-bold mb-4 text-red-500">Oops! Something went wrong.</h2>
                    <p className="mb-4 text-gray-300">We couldn't load this page.</p>
                    <pre className="bg-black p-2 rounded text-xs text-red-400 overflow-auto mb-4">
                        {error?.message || "Unknown error"}
                    </pre>
                    <Link href="/" className="bg-[#ff6600] text-white px-4 py-2 rounded hover:bg-[#e65c00]">
                        Go Home
                    </Link>
                </div>
            </div>
        );
    }
}
