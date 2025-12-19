import Link from "next/link";
import { groupedSystems } from "@/data/systems";
import { getRegion } from "@/lib/utils";
import Breadcrumbs from "@/components/seo/Breadcrumbs";
import JsonLd, { generateItemListSchema } from "@/components/seo/JsonLd";
import { getDictionary } from "@/lib/get-dictionary";
import { routeMap } from "@/lib/route-config";
import { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
    const { lang } = await params;

    if (lang === 'fr') {
        return {
            title: "Cote Jeux Vidéo : Argus & Prix du Marché | Retrocharting",
            description: "Découvrez le guide complet des prix des jeux vidéo. Suivez les valeurs du marché, l'historique des prix et les cotes pour Nintendo, PlayStation, Xbox et les consoles rétro.",
        };
    }

    return {
        title: "Video Game Price Guide: Market Values & Price Lists | Retrocharting",
        description: "Discover the complete video game price guide. Track market values, pricing history, and cost charts for Nintendo, PlayStation, Xbox, and retro consoles.",
    };
}

export default async function GamesPage({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params;
    const dict = await getDictionary(lang);

    const getSlug = (key: string) => routeMap[key]?.[lang] || key;
    const gamesSlug = getSlug('games');

    const breadcrumbItems = [
        { label: dict.header.nav.video_games, href: `/${lang}/${gamesSlug}` }
    ];

    // Flatten systems for Schema
    const allSystems = Object.values(groupedSystems).flat();
    const itemListSchema = generateItemListSchema(
        dict.home.categories.items.video_games.title,
        allSystems.map((system, idx) => ({
            name: system,
            url: `/${lang}/${gamesSlug}/${system.toLowerCase().replace(/ /g, '-')}`,
            position: idx + 1
        }))
    );

    const platformsCount = allSystems.length;
    // Basic approximation or placeholder, exact number of games is dynamic
    const gamesCount = "45,000+";

    // Helper to safely replace placeholders
    const processIntro = (text: string) => {
        return text
            .replace('{{game_count}}', gamesCount)
            .replace('{{console_count}}', platformsCount.toString());
    };

    return (
        <main className="flex-grow bg-[#0f121e] py-8">

            <div className="max-w-[1400px] mx-auto px-4">

                <JsonLd data={itemListSchema} />
                <Breadcrumbs items={breadcrumbItems} />

                <h1 className="text-3xl font-bold mb-4 text-white">
                    {dict.home.games_page?.title || dict.home.categories.items.video_games.title}
                </h1>

                <p className="text-gray-400 mb-8 max-w-3xl leading-relaxed">
                    {dict.home.games_page?.intro
                        ? processIntro(dict.home.games_page.intro)
                        : dict.home.categories.items.video_games.desc}
                </p>

                {/* Grouped Systems Grid */}
                <div className="space-y-12">
                    {Object.entries(groupedSystems).map(([groupName, systems]) => (
                        <div key={groupName}>
                            <h2 className="text-2xl font-bold text-white mb-4 border-b border-[#2a3142] pb-2 flex items-center gap-2">
                                <span className="text-[#ff6600]">#</span>
                                {/* Use specific SEO title from dictionary if available, else fallback to Group Name */}
                                {(dict.home.games_page?.sections as any)?.[groupName] || groupName}
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                {(() => {
                                    let lastRegion = "";
                                    return systems.map((system) => {
                                        const region = getRegion(system);
                                        const showSeparator = region !== lastRegion;
                                        lastRegion = region;

                                        return (
                                            <div key={system} className="contents">
                                                {showSeparator && (
                                                    <div className="col-span-full h-px bg-[#2a3142] my-2 relative">
                                                        <span className="absolute left-0 -top-2 bg-[#0f121e] text-[10px] text-gray-500 px-2 uppercase tracking-widest font-bold">
                                                            {region === "JP" ? "Japan & Asia" : region === "PAL" ? "Europe (PAL)" : region === "GLOBAL" ? "Global / PC" : "North America (NTSC)"}
                                                        </span>
                                                    </div>
                                                )}
                                                <Link
                                                    key={system}
                                                    // Link to /games/console/[system-slug]
                                                    href={`/${lang}/${gamesSlug}/${system.toLowerCase().replace(/ /g, '-')}`}
                                                    className="bg-[#1f2533] p-4 rounded border border-[#2a3142] hover:border-[#ff6600] hover:bg-[#252b3b] transition-all group"
                                                >
                                                    <h3 className="font-medium text-gray-300 group-hover:text-white truncate" title={system}>
                                                        {system}
                                                    </h3>
                                                </Link>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Methodology / Expertise Section */}
                {dict.home.games_page?.methodology && (
                    <div className="mt-16 pt-8 border-t border-[#2a3142] text-sm text-gray-500 max-w-4xl">
                        <h3 className="text-gray-400 font-bold mb-2 uppercase tracking-wider text-xs">Methodology</h3>
                        <p>{dict.home.games_page.methodology}</p>
                    </div>
                )}
            </div>
        </main>
    );
}
