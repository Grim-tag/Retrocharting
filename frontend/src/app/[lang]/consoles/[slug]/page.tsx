import { Metadata } from 'next';
import { getDictionary } from '@/lib/get-dictionary';
import { formatConsoleName, getGameUrl } from '@/lib/utils';
import { groupedSystems } from '@/data/systems';
import { redirect, permanentRedirect } from 'next/navigation';
import { routeMap } from '@/lib/route-config';

// Import Views
import ConsoleCategoryView from '@/components/views/ConsoleCategoryView';
import ConsoleProductView from '@/components/views/ConsoleProductView';
import GameDetailView from '@/components/GameDetailView';
import { getProductById, getProductHistory, getGameBySlug, getGameHistory } from '@/lib/api';

// --- Helpers ---
function getIdFromSlug(slug: string): number {
    const parts = slug.split('-');
    const lastPart = parts[parts.length - 1];
    const id = parseInt(lastPart);
    return isNaN(id) ? 0 : id;
}

function isSystemSlug(slug: string): string | null {
    const flatSystems = Object.values(groupedSystems).flat();
    const found = flatSystems.find(s => s.toLowerCase().replace(/ /g, '-') === slug);
    return found || null;
}

// Enable Static Generation (SSG - Infinite Cache)
export const revalidate = false;

export async function generateStaticParams() {
    const params: { slug: string; lang: string }[] = [];
    const flatSystems = Object.values(groupedSystems).flat();

    // 1. System Pages (Categories) -> DISABLED (Nuclear Mode)
    // but we MUST return at least one param for output: export to work?
    // Let's safe-guard by generating ONE valid slug.
    params.push({ slug: 'nes', lang: 'en' });

    // for (const system of flatSystems) {
    //     const slug = system.toLowerCase().replace(/ /g, '-');
    //     params.push({ slug, lang: 'en' });
    //     params.push({ slug, lang: 'fr' });
    // }
    console.log(`[Consoles] SSG Disabled (Nuclear Mode). Added 'nes' as dummy.`);

    // 2. Console Products (Hardware)
    // EMERGENCY DISABLE: Backend Timeouts
    // We disable fetching products here. They will be handled by CSR Fallback.
    // const { getAllSlugs, getSitemapProducts } = await import('@/lib/api');

    // ... (Code removed for Survival Mode)

    return params;
}

export async function generateMetadata({ params, searchParams }: { params: Promise<{ slug: string; lang: string }>; searchParams: Promise<{ genre?: string }> }): Promise<Metadata> {
    const { slug, lang } = await params;

    // NUCLEAR MODE: Return generic metadata during build to avoid API timeouts
    if (process.env.NODE_ENV === 'production') {
        return {
            title: `${slug.replace(/-/g, ' ')} Consoles - RetroCharting`,
            description: 'Retro gaming consoles price guide and market values.'
        };
    }

    const dict = await getDictionary(lang);

    // Redirect "PC Games" console page to the Games List page
    if (slug === 'pc-games') {
        const gamesSlug = routeMap['games']?.[lang] || 'games';
        permanentRedirect(`/${lang}/${gamesSlug}/pc-games`);
    }

    // 1. Check if it's a Console Category Page
    const systemName = isSystemSlug(slug);
    if (systemName) {
        return {
            title: `${systemName} Consoles Price Guide | RetroCharting`,
            description: `Buy and Sell ${systemName} consoles. Current market values for ${systemName} hardware, limited editions, and bundles.`
        };
    }

    // 2. UNIFIED METADATA (Slug-based)
    try {
        const game = await getGameBySlug(slug);
        if (game) {
            const shortConsoleName = formatConsoleName(game.console || "");
            return {
                title: `${game.title} ${shortConsoleName} ${dict.product.market.suffix} | RetroCharting`,
                description: game.description || `Current market value for ${game.title} on ${game.console}`
            };
        }
    } catch (e) {
        // Fallback
    }

    // 3. Default: Console Product Page (Legacy)
    const id = getIdFromSlug(slug);
    const product = await getProductById(id);

    if (!product) {
        return {
            title: "Console Not Found | RetroCharting",
        };
    }

    const shortConsoleName = formatConsoleName(product.console_name);
    const canonicalPath = getGameUrl(product, lang);
    const canonicalUrl = `https://retrocharting.com${canonicalPath}`;

    if (lang === 'fr') {
        return {
            title: `${dict.product.market.suffix} ${product.product_name} ${shortConsoleName} & Cote | RetroCharting`,
            description: `Prix actuel et historique pour la console ${product.product_name}. Estimez la valeur de votre matériel ${product.console_name}.`,
            alternates: {
                canonical: canonicalUrl,
            }
        };
    }

    return {
        title: `${product.product_name} ${shortConsoleName} ${dict.product.market.suffix} | RetroCharting`,
        description: `Current market value for ${product.product_name} console. Track price history for ${product.console_name} hardware.`,
        alternates: {
            canonical: canonicalUrl,
        }
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
    const dict = await getDictionary(lang); // Fetch dict for GameDetailView

    // Redirect "PC Games" console page to the Games List page
    if (slug === 'pc-games') {
        const gamesSlug = routeMap['games']?.[lang] || 'games';
        permanentRedirect(`/${lang}/${gamesSlug}/pc-games`);
    }

    // 1. Dispatcher Logic (Category)
    const systemName = isSystemSlug(slug);

    if (systemName) {
        // Render Category View (Independent)
        return <ConsoleCategoryView slug={slug} systemName={systemName} lang={lang} />;
    }

    // 2. UNIFIED LOOKUP (Slug-based) - Required for new links
    try {
        const game = await getGameBySlug(slug);

        if (game) {
            // Unified Success!
            const mainVariant = game.variants.find((v: any) => v.region.includes("NTSC"))
                || game.variants.find((v: any) => v.region.includes("PAL"))
                || game.variants[0];

            const [mainProduct, history] = await Promise.all([
                getProductById(mainVariant.id),
                getGameHistory(slug)
            ]);

            if (mainProduct) {
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
        }
    } catch (e) {
        // Fallback to legacy
    }

    // 3. LEGACY LOOKUP (ID-based)
    const id = getIdFromSlug(slug);

    // We fetch purely for redirection check or Render
    const product = await getProductById(id);

    if (product) {
        const canonicalPath = getGameUrl(product, lang);
        const canonicalSlug = canonicalPath.split('/').pop();

        if (canonicalSlug && slug !== canonicalSlug) {
            // Permanent Redirect to Clean URL if available
            permanentRedirect(canonicalPath);
        }

        // For consistency, we could use GameDetailView here too, but ConsoleProductView is existing.
        // Let's stick to ConsoleProductView for valid Legacy IDs to minimize change.
        return <ConsoleProductView slug={slug} lang={lang} />;
    }

    // 404
    return <ConsoleProductView slug={slug} lang={lang} />; // View handles 404 logic internally
}
