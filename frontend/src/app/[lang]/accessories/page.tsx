import Link from "next/link";
import { groupedSystems } from "@/data/systems";
import { getRegion } from "@/lib/utils";
import Breadcrumbs from "@/components/seo/Breadcrumbs";
import JsonLd, { generateCollectionSchema } from "@/components/seo/JsonLd";
import { getDictionary } from "@/lib/get-dictionary";
import { routeMap } from "@/lib/route-config";

export async function generateStaticParams() {
    return [{ lang: 'en' }, { lang: 'fr' }];
}

export default async function AccessoriesPage({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params;
    const dict = await getDictionary(lang);

    const getSlug = (key: string) => routeMap[key]?.[lang] || key;
    const accessoriesSlug = getSlug('accessories');

    // Helper for locale-aware paths (English = root, French = /fr/)
    const getPath = (path: string) => lang === 'en' ? path : `/${lang}${path}`;

    const breadcrumbItems = [
        { label: dict.header.nav.accessories, href: getPath(`/${accessoriesSlug}`) }
    ];

    const schema = generateCollectionSchema(
        dict.header.nav.accessories,
        dict.home.categories.items.video_games.desc, // Reuse description or get generic
        getPath(`/${accessoriesSlug}`)
    );

    return (
        <main className="flex-grow bg-[#0f121e] py-8">
            <div className="max-w-[1400px] mx-auto px-4">

                <JsonLd data={schema} />
                <Breadcrumbs items={breadcrumbItems} />

                <h1 className="text-3xl font-bold mb-4 text-white">{dict.header.nav.accessories}</h1>
                <p className="text-gray-400 mb-8 max-w-3xl">
                    {dict.home.categories.subtitle}
                </p>

                {/* Grouped Systems Grid */}
                <div className="space-y-12">
                    {Object.entries(groupedSystems)
                        .filter(([groupName]) => groupName !== "PC")
                        .map(([groupName, systems]) => (
                            <div key={groupName}>
                                <h2 className="text-2xl font-bold text-white mb-4 border-b border-[#2a3142] pb-2 flex items-center gap-2">
                                    <span className="text-[#ff6600]">#</span> {groupName}
                                </h2>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                    {systems.filter(s => s !== "PC Games").map((system) => {
                                        return (
                                            <div key={system} className="contents">
                                                <Link
                                                    key={system}
                                                    // Link to /accessories/console/[system-slug]
                                                    href={getPath(`/${accessoriesSlug}/${system.toLowerCase().replace(/ /g, '-')}`)}
                                                    className="bg-[#1f2533] p-4 rounded border border-[#2a3142] hover:border-[#ff6600] hover:bg-[#252b3b] transition-all group"
                                                >
                                                    <h3 className="font-medium text-gray-300 group-hover:text-white truncate" title={system}>
                                                        {system}
                                                    </h3>
                                                </Link>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                </div>
            </div>
        </main>
    );
}
