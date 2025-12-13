import Link from "next/link";
import { getProductsByConsole, Product } from "@/lib/api";
import { getDictionary } from "@/lib/get-dictionary";
import { routeMap } from "@/lib/route-config";
import Breadcrumbs from "@/components/seo/Breadcrumbs";
import { getGameUrl } from "@/lib/utils";
import { Metadata } from "next";
import { groupedSystems } from "@/data/systems";

// Helper to make title case from slug
function unslugify(slug: string) {
    return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export async function generateMetadata({ params }: { params: Promise<{ system_slug: string, lang: string }> }): Promise<Metadata> {
    const { system_slug } = await params;

    const flatSystems = Object.values(groupedSystems).flat();
    const systemName = flatSystems.find(s => s.toLowerCase().replace(/ /g, '-') === system_slug) || unslugify(system_slug);

    return {
        title: `${systemName} Accessories Price Guide | RetroCharting`,
    };
}

export default async function AccessoryConsolePage({ params }: { params: Promise<{ system_slug: string, lang: string }> }) {
    const { system_slug, lang } = await params;
    const dict = await getDictionary(lang);

    const flatSystems = Object.values(groupedSystems).flat();
    const systemName = flatSystems.find(s => s.toLowerCase().replace(/ /g, '-') === system_slug) || unslugify(system_slug);

    // FETCH ACCESSORIES ONLY
    const products = await getProductsByConsole(systemName, 100, undefined, 'accessory');

    const getSlug = (key: string) => routeMap[key]?.[lang] || key;
    const accessoriesSlug = getSlug('accessories');

    const breadcrumbItems = [
        { label: dict.header.nav.accessories, href: `/${lang}/${accessoriesSlug}` },
        { label: systemName, href: `/${lang}/${accessoriesSlug}/console/${system_slug}` }
    ];

    return (
        <main className="flex-grow bg-[#0f121e] py-8">
            <div className="max-w-[1400px] mx-auto px-4">
                <Breadcrumbs items={breadcrumbItems} />

                <h1 className="text-3xl font-bold mb-8 text-white">{systemName} {dict.header.nav.accessories}</h1>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {products.map((product) => (
                        <Link
                            key={product.id}
                            href={getGameUrl(product, lang)}
                            className="bg-[#1f2533] border border-[#2a3142] rounded overflow-hidden hover:border-[#ff6600] transition-all group"
                        >
                            <div className="aspect-[3/4] flex items-center justify-center bg-[#151922]">
                                {product.image_url ? (
                                    <img src={product.image_url} alt={product.product_name} className="w-full h-full object-contain group-hover:scale-105 transition-transform" />
                                ) : (
                                    <div className="text-gray-600 text-xs">No Image</div>
                                )}
                            </div>
                            <div className="p-4">
                                <h3 className="font-bold text-white text-sm line-clamp-2 mb-2 group-hover:text-[#ff6600] transition-colors">
                                    {product.product_name}
                                </h3>
                                <div className="flex justify-between items-end">
                                    <div className="text-xs text-gray-400">Loose</div>
                                    <div className="font-bold text-[#ff6600]">
                                        {product.loose_price ? `$${product.loose_price.toFixed(2)}` : '-'}
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {products.length === 0 && (
                    <div className="text-center text-gray-400 py-12">
                        No accessories found for {systemName} or loading...
                    </div>
                )}
            </div>
        </main>
    );
}
