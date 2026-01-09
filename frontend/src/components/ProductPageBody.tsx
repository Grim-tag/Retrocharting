import Link from 'next/link';
import { getDictionary } from '@/lib/get-dictionary';
import { getProductById, getProductHistory, getProductsByConsole, getGenres, getGameBySlug, getGameHistory } from '@/lib/api';
import { formatConsoleName, isSystemSlug, getIdFromSlug, getCanonicalSlug } from '@/lib/utils';
import GameDetailView from '@/components/GameDetailView';
import ConsoleGameCatalogWrapper from '@/components/ConsoleGameCatalogWrapper';
// import { redirect } from 'next/navigation'; // Only works in Server Component

export default async function ProductPageBody({
    params
}: {
    params: { slug: string; lang: string }
}) {
    try {
        const { slug, lang } = params;
        console.log(`[ProductPageBody] Rendering for slug: ${slug}, lang: ${lang}`); // DEBUG LOG
        const dict = await getDictionary(lang);

        const systemName = isSystemSlug(slug);

        if (systemName) {
            // --- CONSOLE VIEW (SSR RESTORED) ---
            const gamesSlug = lang === 'en' ? 'games' : 'games';

            let products: any[] = [];
            let genres: string[] = [];

            try {
                // Skip genres fetch during build to speed up SSG
                const isBuild = process.env.NODE_ENV === 'production';

                const [fetchedProducts, fetchedGenres] = await Promise.all([
                    getProductsByConsole(systemName, 50, undefined, 'game', undefined, 0, undefined),
                    isBuild ? Promise.resolve([]) : getGenres(systemName)
                ]);
                products = fetchedProducts || [];
                genres = fetchedGenres || [];
            } catch (error) {
                console.error("SSR Data Fetch Failed (Graceful Fallback):", error);
            }

            return (
                <main className="flex-grow bg-[#0f121e] py-8">
                    <div className="max-w-[1400px] mx-auto px-4">
                        <div className="mb-4">
                            <nav className="flex text-sm text-gray-400 mb-6" aria-label="Breadcrumb">
                                <ol className="flex items-center space-x-2">
                                    <li>
                                        <li>
                                            <Link href={lang === 'en' ? `/${gamesSlug}` : `/${lang}/${gamesSlug}`} className="hover:text-white transition-colors">
                                                {dict.header.nav.video_games}
                                            </Link>
                                        </li>
                                    </li>
                                    <li className="text-gray-600">/</li>
                                    <li className="text-white font-medium" aria-current="page">
                                        {systemName}
                                    </li>
                                </ol>
                            </nav>
                        </div>

                        <ConsoleGameCatalogWrapper
                            products={products}
                            genres={genres}
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
            // CHECK REGIONAL REDIRECTS
            if (slug.startsWith('pal-') || slug.startsWith('jp-') || slug.startsWith('asian-english-') || slug.startsWith('asian-')) {
                const cleanSlug = slug.replace(/^(pal-|jp-|asian-english-|asian-)/, '');
                if (isSystemSlug(cleanSlug)) {
                    const { redirect } = await import('next/navigation');
                    redirect(`/${lang}/games/${cleanSlug}`);
                }
            }

            // --- GAME VIEW (Unified + Fallback) ---

            // 1. Try fetching as Unified Game (Slug-based)
            const canonicalSlug = getCanonicalSlug(slug);
            const game = await getGameBySlug(canonicalSlug);

            if (game) {
                const mainVariant = game.variants.find((v: any) => v.region.includes("NTSC"))
                    || game.variants.find((v: any) => v.region.includes("PAL"))
                    || game.variants[0];

                const [mainProduct, history] = await Promise.all([
                    getProductById(mainVariant.id),
                    getGameHistory(slug)
                ]);

                if (!mainProduct) return <div className="text-white">Main variant data missing.</div>;

                return (
                    <GameDetailView
                        product={mainProduct}
                        history={history}
                        lang={lang}
                        dict={dict}
                        game={game}
                    />
                );
            }

            // 2. Fallback: Legacy ID-based Fetch
            const id = getIdFromSlug(slug);

            if (!id) {
                // If it is a Clean URL (no ID) and getGameBySlug failed, it's a 404.
                // Do NOT try to fetch by ID 0 or NaN.
                return (
                    <main className="flex-grow bg-[#0f121e] py-20 text-center text-white">
                        <h1 className="text-3xl font-bold">{dict.product.not_found.title}</h1>
                        <Link href={`/${lang}/games`} className="text-[#ff6600] hover:underline mt-4 inline-block">
                            {dict.product.not_found.back}
                        </Link>
                    </main>
                );
            }

            const [product, history] = await Promise.all([
                getProductById(id),
                getProductHistory(id)
            ]);

            if (product) {
                const urlSlug = slug.toLowerCase();
                const consoleSlug = product.console_name.toLowerCase().replace(/ /g, '-');
                const titleSlug = product.product_name.toLowerCase().replace(/[^a-z0-9]/g, '');

                const isConsoleMismatch = !urlSlug.includes(product.console_name.split(' ')[0].toLowerCase());
                const isTitleMismatch = !urlSlug.includes(product.product_name.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, ''));

                if (isConsoleMismatch && isTitleMismatch) {
                    console.warn(`Legacy ID Mismatch: ID ${id} loaded "${product.product_name}" but URL was "${slug}". Treating as 404.`);
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
            // Redirects temporarily disabled to prevent recursion. 
            // Will implementation Client-Side redirection later.
            /*
            if (product.game_slug && product.game_slug !== slug) {
                const { redirect } = await import('next/navigation');
                if (lang === 'en') {
                    redirect(`/games/${product.game_slug}`);
                } else {
                    redirect(`/${lang}/games/${product.game_slug}`);
                }
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
