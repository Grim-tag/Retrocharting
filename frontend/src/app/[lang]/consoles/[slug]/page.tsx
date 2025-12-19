import { Metadata } from "next";
import { getDictionary } from "@/lib/get-dictionary";
import { getProductById } from "@/lib/cached-api";
import { formatConsoleName, getGameUrl } from "@/lib/utils";
import { groupedSystems } from "@/data/systems";
import { redirect, permanentRedirect } from "next/navigation";
import { routeMap } from "@/lib/route-config";

import ConsoleCategoryView from "@/components/views/ConsoleCategoryView";
import ConsoleProductView from "@/components/views/ConsoleProductView";

// --- Helper to extract ID from slug ---
function getIdFromSlug(slug: string): number {
    const parts = slug.split('-');
    const lastPart = parts[parts.length - 1];
    const id = parseInt(lastPart);
    return isNaN(id) ? 0 : id;
}

// Dispatcher Helper
function isSystemSlug(slug: string): string | null {
    const flatSystems = Object.values(groupedSystems).flat();
    const found = flatSystems.find(s => s.toLowerCase().replace(/ /g, '-') === slug);
    return found || null;
}

export async function generateMetadata({ params, searchParams }: { params: Promise<{ slug: string; lang: string }>; searchParams: Promise<{ genre?: string }> }): Promise<Metadata> {
    const { slug, lang } = await params;

    // Redirect "PC Games" console page to the Games List page
    if (slug === 'pc-games') {
        const gamesSlug = routeMap['games']?.[lang] || 'games';
        permanentRedirect(`/${lang}/${gamesSlug}/pc-games`);
    }

    const dict = await getDictionary(lang);

    // 1. Check if it's a Console Category Page (e.g. /consoles/nintendo-64)
    const systemName = isSystemSlug(slug);
    if (systemName) {
        return {
            title: `${systemName} Consoles Price Guide | RetroCharting`,
            description: `Buy and Sell ${systemName} consoles. Current market values for ${systemName} hardware, limited editions, and bundles.`
        };
    }

    // 2. Default: Console Product Page
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

    // Redirect "PC Games" console page to the Games List page
    if (slug === 'pc-games') {
        const gamesSlug = routeMap['games']?.[lang] || 'games';
        permanentRedirect(`/${lang}/${gamesSlug}/pc-games`);
    }

    // 1. Dispatcher Logic
    const systemName = isSystemSlug(slug);

    if (systemName) {
        // Render Category View (Independent)
        return <ConsoleCategoryView slug={slug} systemName={systemName} lang={lang} />;
    }

    // 2. SEO Redirection Check (For Product Pages)
    // If the current slug doesn't match the new clean URL logic, redirect.
    const id = getIdFromSlug(slug);
    // We fetch purely for redirection check. The View will fetch again (cached).
    const product = await getProductById(id);

    if (product) {
        const canonicalPath = getGameUrl(product, lang);
        // Path is like /en/consoles/slug-id. We need just the last segment to compare with `slug`
        const canonicalSlug = canonicalPath.split('/').pop();

        if (canonicalSlug && slug !== canonicalSlug) {
            redirect(canonicalPath);
        }
    }

    // 2. Render Product View (Independent)
    return <ConsoleProductView slug={slug} lang={lang} />;
}
