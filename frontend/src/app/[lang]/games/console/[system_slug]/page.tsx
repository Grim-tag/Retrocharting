import Link from "next/link";
import { getProductsByConsole, getGenres, Product } from "@/lib/api";
import ConsoleGameCatalog from "./ConsoleGameCatalog";
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

    // Parallel Fetching - GET ALL products (limit 2000) for client-side filtering
    // We do NOT pass the genre param here anymore, we want everything.
    const [products, genres] = await Promise.all([
        getProductsByConsole(systemName, 2000, undefined, 'game'),
        getGenres(systemName)
    ]);

    const getSlug = (key: string) => routeMap[key]?.[lang] || key;
    const gamesSlug = getSlug('games');

    const breadcrumbItems = [
        { label: dict.header.nav.video_games, href: `/${lang}/${gamesSlug}` },
        { label: systemName, href: `/${lang}/${gamesSlug}/console/${system_slug}` }
    ];

    return (
        <main className="flex-grow bg-[#0f121e] py-8">
            <div className="max-w-[1400px] mx-auto px-4">
                <Breadcrumbs items={breadcrumbItems} />

                <ConsoleGameCatalog
                    products={products}
                    genres={genres}
                    systemName={systemName}
                    lang={lang}
                    gamesSlug={gamesSlug}
                    systemSlug={system_slug}
                />
            </div>
        </main >
    );
}

