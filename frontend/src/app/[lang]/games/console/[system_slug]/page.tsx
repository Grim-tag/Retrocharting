import Link from "next/link";
import { getProductsByConsole, getGenres, Product } from "@/lib/api";
import ConsoleGameCatalog from "@/components/ConsoleGameCatalog";
import { getDictionary } from "@/lib/get-dictionary";
import { routeMap } from "@/lib/route-config";
import Breadcrumbs from "@/components/seo/Breadcrumbs";
import { getGameUrl } from "@/lib/utils";
import { Metadata } from "next";
import { groupedSystems } from "@/data/systems";
import { generateConsoleSeo } from "@/lib/seo-utils";

// Helper to make title case from slug (e.g. super-nintendo -> Super Nintendo)
function unslugify(slug: string) {
    return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({
    params,
    searchParams
}: {
    params: Promise<{ system_slug: string, lang: string }>,
    searchParams: Promise<{ genre?: string, sort?: string }>
}): Promise<Metadata> {
    const { system_slug, lang } = await params;
    const { genre, sort } = await searchParams;
    console.log("SEO DEBUG: sort =", sort, "genre =", genre);

    // Find exact system name from slug
    const flatSystems = Object.values(groupedSystems).flat();
    const systemName = flatSystems.find(s => s.toLowerCase().replace(/ /g, '-') === system_slug) || unslugify(system_slug);

    // We don't have exact count here without fetching, better to use a generic count or fetch lightweight count?
    // For Metadata, speed is key. Let's use a generic phrasing or fetch just count if fast.
    // Actually, generateConsoleSeo takes count for description. 
    // We can assume a "large" number or omit specific count in description for Metadata if fetching is too slow.
    // BUT we want "Liste des 3970 jeux".
    // Since this page is dynamic 'force-dynamic', fetching products is inevitable.
    // Let's defer count to Component or fetch minimal?
    // For now, let's pass 0 or a placeholder, or ideally fetch count.
    // Since page component fetches 2000 products, let's just make a lightweight estimation?
    // Or just fetch the products? Metadata runs individually.
    // Let's avoid double fetch. 
    // COMPROMISE: Use generic description for Metadata OR accept that we might not have precise count in meta description yet.
    // Actually, we can fetch products here too, but it Double Fetches. Next.js dedupes if using 'fetch', but our api.ts uses Axios.
    // Optimisation: Skip count in Metadata for now to avoid double DB hit.
    const seo = generateConsoleSeo(systemName, genre, sort, 0, lang);

    return {
        title: seo.title,
        description: seo.description.replace(' 0 ', ' '), // Remove "0" if zero
        alternates: {
            canonical: genre || sort
                ? `/${lang === 'en' ? 'games' : 'jeux-video'}/${system_slug}?${new URLSearchParams({ ...(genre && { genre }), ...(sort && { sort }) }).toString()}`
                : `/${lang === 'en' ? 'games' : 'jeux-video'}/${system_slug}`
        }
    };
}

export default async function ConsolePage({
    params,
    searchParams
}: {
    params: Promise<{ system_slug: string, lang: string }>,
    searchParams: Promise<{ genre?: string, sort?: string }>
}) {
    const { system_slug, lang } = await params;
    const { genre, sort } = await searchParams;
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

    // Generate Dynamic SEO Content
    // Now we have the products count!
    // Filter products locally if genre is selected to get accurate count for the text?
    // The ConsoleGameCatalog handles client-side filtering. 
    // Use total count for "List of X games" or filtered count?
    // PriceCharting uses "List of X Playstation 4 games" related to the filter.
    // If genre=RPG, we should probably count RPGs.
    let count = products.length;
    if (genre) {
        count = products.filter(p => p.genre?.toLowerCase() === genre.toLowerCase()).length;
    }

    const seo = generateConsoleSeo(systemName, genre, sort, count, lang);

    return (
        <main className="flex-grow bg-[#0f121e] py-8">
            <div id="debug-seo" style={{ display: 'none' }}>Sort: {sort}, Genre: {genre}</div>
            <div className="max-w-[1400px] mx-auto px-4">
                <ConsoleGameCatalog
                    products={products}
                    genres={genres}
                    systemName={systemName}
                    lang={lang}
                    gamesSlug={gamesSlug}
                    systemSlug={system_slug}
                    h1Title={seo.h1}
                    introText={seo.intro}
                />
            </div>
        </main >
    );
}

