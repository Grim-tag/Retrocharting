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
    const parts = slug.split('-');
    const lastPart = parts[parts.length - 1];
    const id = parseInt(lastPart);
    return isNaN(id) ? 0 : id;
}

// Disable Static Generation for Build Performance (ISR Only)
export async function generateStaticParams() {
    return [];
}

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
            // --- CONSOLE VIEW (SSR) ---
            const [products, genres] = await Promise.all([
                getProductsByConsole(systemName, 40, genre, 'game', sort, 0, search),
                getGenres(systemName)
            ]);

            const gamesSlug = lang === 'en' ? 'games' : 'games'; // TODO: use routeMap properly if needed

            return (
                <main className="flex-grow bg-[#0f121e] py-8">
                    <div className="max-w-[1400px] mx-auto px-4">
                        {/* Breadcrumbs handled in ConsoleGameCatalog via props? No, usually outside? 
                            The original GameConsoleClient handled Breadcrumbs OUTSIDE ConsoleGameCatalog.
                            Let's check ConsoleGameCatalog.tsx again. It did NOT handle breadcrumbs layout. 
                            It handled Breadcrumbs import but commented out.
                            I need to pass breadcrumbs or render them here. 
                         */}
                        {/* Wait, ConsoleGameCatalog expects us to render the Main Container? 
                            Looking at ConsoleGameCatalog.tsx, it renders `<div>`.
                            So I should render Breadcrumbs here.
                         */}
                        <div className="mb-4">
                            {/* We need Breadcrumbs component. Copied from GameConsoleClient. */}
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
            // --- GAME VIEW (SSR) ---
            const id = getIdFromSlug(slug);

            if (!id) {
                return (
                    <div className="text-white text-center py-20">Invalid Product ID</div>
                );
            }

            const [product, history] = await Promise.all([
                getProductById(id),
                getProductHistory(id)
            ]);

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
