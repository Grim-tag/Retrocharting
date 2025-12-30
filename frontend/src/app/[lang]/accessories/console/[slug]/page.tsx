import { getProductsByConsole, getGenres } from "@/lib/api";
import ConsoleGameCatalog from "@/components/ConsoleGameCatalog";
import { groupedSystems } from '@/data/systems';
import Breadcrumbs from "@/components/seo/Breadcrumbs";
import { getDictionary } from "@/lib/get-dictionary";
import { routeMap } from "@/lib/route-config";
import { generateConsoleSeo } from "@/lib/seo-utils";
import { Metadata } from 'next';

// Dispatcher Helper (replicated)
function isSystemSlug(slug: string): string | null {
    const flatSystems = Object.values(groupedSystems).flat();
    const found = flatSystems.find(s => s.toLowerCase().replace(/ /g, '-') === slug);
    return found || null;
}

// Generate Static Params for ACCESSORIES consoles (ISR Priming)
export async function generateStaticParams() {
    // Return empty to disable build-time generation to prevent API timeouts.
    return [];
}

export async function generateMetadata({ params, searchParams }: { params: Promise<{ slug: string; lang: string }>; searchParams: Promise<{ genre?: string, sort?: string }> }): Promise<Metadata> {
    const { slug, lang } = await params;
    const { genre, sort } = await searchParams;

    const systemName = isSystemSlug(slug);
    if (!systemName) return { title: 'Accessories Not Found' };

    const seo = generateConsoleSeo(systemName, genre, sort, 0, lang); // Reuse console SEO logic roughly or adapt

    return {
        title: `${systemName} Accessories & Peripherals | RetroCharting`,
        description: `Buy and sell ${systemName} controllers, cables, memory cards and other accessories. Check current market prices.`
    };
}

export default async function AccessoriesConsolePage({
    params,
    searchParams
}: {
    params: Promise<{ slug: string; lang: string }>,
    searchParams: Promise<{ genre?: string, sort?: string, search?: string }>
}) {
    const { slug, lang } = await params;
    const { genre, sort, search: searchQuery } = await searchParams;
    const dict = await getDictionary(lang);

    const getSlug = (key: string) => routeMap[key]?.[lang] || key;
    const accessoriesSlug = getSlug('accessories');

    const systemName = isSystemSlug(slug);

    if (!systemName) {
        return <div className="text-white text-center py-20">System not found</div>;
    }

    // Reuse ConsoleGameCatalog but for accessories? 
    // The API `getProductsByConsole` has a `type` parameter.
    const [products, genres] = await Promise.all([
        getProductsByConsole(systemName, 40, genre, 'accessory', sort, 0, searchQuery), // Type = accessory
        getGenres(systemName) // Genres might not apply to accessories, but keep for type consistency or ignore
    ]);

    const breadcrumbItems = [
        { label: dict.header.nav.accessories, href: `/${lang}/${accessoriesSlug}` },
        { label: systemName, href: `/${lang}/${accessoriesSlug}/console/${slug}` }
    ];

    return (
        <main className="flex-grow bg-[#0f121e] py-8">
            <div className="max-w-[1400px] mx-auto px-4">
                <Breadcrumbs items={breadcrumbItems} lang={lang} />
                <ConsoleGameCatalog
                    products={products}
                    genres={[]} // No genres for accessories usually
                    systemName={systemName}
                    lang={lang}
                    gamesSlug={accessoriesSlug} // Actually points to accessories base
                    systemSlug={slug}
                    h1Title={`${systemName} Accessories`}
                    introText={`Find detailed price history and market values for ${systemName} accessories.`}
                    faq={[]}
                    productType="accessory" // Important: Display Accessory Grid
                />
            </div>
        </main>
    );
}
