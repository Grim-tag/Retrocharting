import { Metadata } from 'next';
import { getDictionary } from '@/lib/get-dictionary';
import { groupedSystems } from '@/data/systems';
import GameConsoleClient from './GameConsoleClient';
import { generateConsoleSeo } from '@/lib/seo-utils';
import { getProductById } from '@/lib/cached-api';
import { getGameUrl, formatConsoleName } from '@/lib/utils';

// Helper
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

// Generate Static Params for CONSOLES explicitly
export async function generateStaticParams() {
    const flatSystems = Object.values(groupedSystems).flat();
    const params: { lang: string, slug: string }[] = [];

    const langs = ['en', 'fr'];

    for (const lang of langs) {
        // 1. Add All Console Pages
        for (const system of flatSystems) {
            params.push({
                lang,
                slug: system.toLowerCase().replace(/ /g, '-')
            });
        }
    }
    return params;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string; lang: string }> }): Promise<Metadata> {
    const { slug, lang } = await params;
    const dict = await getDictionary(lang);

    // 1. Console Page
    const systemName = isSystemSlug(slug);
    if (systemName) {
        const seo = generateConsoleSeo(systemName, undefined, undefined, 0, lang);
        return {
            title: seo.title,
            description: seo.description
        };
    }

    // 2. Game Page (Fetch basic metadata, avoiding searchParams)
    const id = getIdFromSlug(slug);
    const product = await getProductById(id);

    if (!product) return { title: "Product Not Found" };

    const shortConsoleName = formatConsoleName(product.console_name);
    return {
        title: `${product.product_name} ${shortConsoleName} ${dict.product.market.suffix} | RetroCharting`,
        description: `Current market value for ${product.product_name}`
    };
}

export default async function Page({
    params
}: {
    params: Promise<{ slug: string; lang: string }>
}) {
    const { slug, lang } = await params;
    const dict = await getDictionary(lang);

    // Determine initial type to avoid client-side flash if possible, or just pass slug
    const systemName = isSystemSlug(slug);

    return (
        <GameConsoleClient
            slug={slug}
            lang={lang}
            dict={dict}
            groupedSystems={groupedSystems}
            initialSystemName={systemName}
        />
    );
}
