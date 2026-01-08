
import { groupedSystems } from "@/data/systems";
import { getGamesByConsole, getProductsCountByConsole } from "@/lib/api";
import { routeMap } from "@/lib/route-config";
import { getDictionary } from "@/lib/get-dictionary";
import ConsoleGameCatalog from "@/components/ConsoleGameCatalog";
import { Metadata } from "next";

export async function generateStaticParams() {
    const params = [];
    const ITEMS_PER_PAGE = 50;

    // Iterate over all systems
    const systems = Object.values(groupedSystems).flat();

    for (const system of systems) {
        // We need to know how many games are in this system to generate pages
        // We use the same API call as we will use in the page
        const count = await getProductsCountByConsole(system, 'game');

        if (count > 0) {
            const totalPages = Math.ceil(count / ITEMS_PER_PAGE);

            // Generate params for page 2 up to totalPages
            // Page 1 is handled by the main [console]/page.tsx
            for (let i = 2; i <= totalPages; i++) {
                params.push({
                    lang: 'en',
                    console: system.toLowerCase().replace(/ /g, '-'),
                    page: i.toString()
                });
                params.push({
                    lang: 'fr',
                    console: system.toLowerCase().replace(/ /g, '-'),
                    page: i.toString()
                });
            }
        }
    }

    return params;
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string; console: string; page: string }> }): Promise<Metadata> {
    const { lang, console: consoleSlug, page } = await params;
    const dict = await getDictionary(lang);

    // Reverse lookup system name (simplified)
    const systemName = consoleSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()); // Basic capitalization

    return {
        title: `${systemName} Games - Page ${page} | Retrocharting`,
        description: `Browse page ${page} of ${systemName} games. Find current market prices and values.`,
    };
}

export default async function ConsolePagePaginated({ params }: { params: Promise<{ lang: string; console: string; page: string }> }) {
    const { lang, console: consoleSlug, page: pageStr } = await params;
    const dict = await getDictionary(lang);
    const currentPage = parseInt(pageStr, 10);
    const ITEMS_PER_PAGE = 50;

    // Find system name
    const systems = Object.values(groupedSystems).flat();
    const systemName = systems.find(s => s.toLowerCase().replace(/ /g, '-') === consoleSlug) || consoleSlug;

    // Fetch Data for this page slice
    // We assume default sort (Title ASC) for static pages
    // offset = (page - 1) * limit
    const offset = (currentPage - 1) * ITEMS_PER_PAGE;

    const [games, count, genres] = await Promise.all([
        getGamesByConsole(systemName, ITEMS_PER_PAGE, undefined, 'title_asc', offset, undefined, 'game'),
        getProductsCountByConsole(systemName, 'game'),
        import('@/lib/api').then(m => m.getGenres(systemName))
    ]);

    // Adapt to Product interface if needed (Unified API returns slightly different)
    const products = games.map((g: any) => ({
        id: g.id,
        pricecharting_id: 0,
        product_name: g.title,
        console_name: g.console,
        loose_price: g.min_price || 0,
        cib_price: g.cib_price || 0,
        new_price: g.new_price || 0,
        image_url: g.image_url,
        genre: g.genre || "",
        game_slug: g.slug
    }));

    const getSlug = (key: string) => routeMap[key]?.[lang] || key;
    const gamesSlug = getSlug('games');
    const systemSlug = consoleSlug;

    const totalPages = Math.ceil(count / ITEMS_PER_PAGE);

    return (
        <main className="flex-grow bg-[#0f121e] py-8">
            <div className="max-w-[1400px] mx-auto px-4">
                <ConsoleGameCatalog
                    products={products}
                    genres={genres}
                    systemName={systemName}
                    lang={lang}
                    gamesSlug={gamesSlug}
                    systemSlug={systemSlug}
                    currentPage={currentPage}
                    totalPages={totalPages}
                />
            </div>
        </main>
    );
}
