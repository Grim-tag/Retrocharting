import { getProductsByConsole, getGenres } from "@/lib/api";
import { getDictionary } from "@/lib/get-dictionary";
import { routeMap } from "@/lib/route-config";
import Breadcrumbs from "@/components/seo/Breadcrumbs";
import ConsoleSeoStats from "@/components/seo/ConsoleSeoStats";
import ConsoleGameCatalog from "@/components/ConsoleGameCatalog";
import ConsoleFaq from "@/components/seo/ConsoleFaq";

interface ConsoleCategoryViewProps {
    slug: string; // "nintendo-64"
    systemName: string; // "Nintendo 64"
    lang: string;
}

export default async function ConsoleCategoryView({ slug, systemName, lang }: ConsoleCategoryViewProps) {
    const dict = await getDictionary(lang);
    const consolesSlug = routeMap['consoles']?.[lang] || 'consoles';

    // Fetch Data Independent of Page Logic
    const [products, genres] = await Promise.all([
        getProductsByConsole(systemName, 500, undefined, 'console'),
        getGenres(systemName)
    ]);

    const breadcrumbItems = [
        { label: dict.header.nav.consoles, href: `/${lang}/${consolesSlug}` },
        { label: systemName, href: `/${lang}/${consolesSlug}/${slug}` }
    ];

    // Region Detection (Logic moved here or passed? Kept here for simplicity of View)
    let region: 'PAL' | 'NTSC' | 'JP' | 'NTSC-J' = 'NTSC';
    if (systemName.startsWith("PAL")) region = 'PAL';
    else if (systemName.startsWith("JP") || systemName.startsWith("Japan")) region = 'JP';

    // --- TEXT GENERATION LOGIC ---
    // User Request: specific H2 titles and Intro texts
    // Replace "Playstation" -> "PS" for shorter titles if needed? 

    // Create Short Name for Titles (e.g. Playstation 5 -> PS5)
    // "Playstation 5" -> "PS5" | "Playstation Vita" -> "PS Vita"
    const shortName = systemName.replace(/Playstation\s+(\d+)/, "PS$1").replace("Playstation", "PS");
    const cleanSystemName = shortName.replace("PAL ", "").replace("JP ", "").replace("Japan ", "");

    let catalogTitle = "";
    let catalogIntro = "";

    if (lang === 'fr') {
        catalogTitle = `Packs ${cleanSystemName} & Éditions Limitées`;
        if (region === 'JP') catalogTitle = `Packs ${cleanSystemName} & Éditions Limitées (Import)`;
        if (region === 'PAL') catalogTitle = `Packs ${cleanSystemName} & Éditions Limitées`;

        catalogIntro = `Bienvenue sur le guide de prix ${systemName}. Ci-dessous la liste complète des consoles disponibles, classées par popularité.`;
    } else {
        // EN
        catalogTitle = `${cleanSystemName} Bundles & Limited edition`;
        if (region === 'JP') catalogTitle = `JP ${cleanSystemName} Bundles & Limited edition`;
        if (region === 'PAL') catalogTitle = `PAL ${cleanSystemName} Bundles & Limited edition`;

        catalogIntro = `Welcome to the ${systemName} price guide. Below is the complete list of available consoles and bundles, sorted by popularity.`;
    }

    return (
        <main className="flex-grow bg-[#0f121e] py-8">
            <div className="max-w-[1400px] mx-auto px-4">
                <Breadcrumbs items={breadcrumbItems} />

                {/* SEO STATS (TOP) - H1 Title */}
                <ConsoleSeoStats products={products} systemName={systemName} region={region} lang={lang} />

                <div className="mt-6">
                    <ConsoleGameCatalog
                        products={products}
                        genres={[]}
                        systemName={systemName}
                        lang={lang}
                        gamesSlug={consolesSlug}
                        systemSlug={slug}
                        productType="console"
                        h1Title={catalogTitle}     // H2 Override
                        introText={catalogIntro}   // Intro Override
                    />
                </div>
                {/* SEO FAQ (BOTTOM) */}
                <ConsoleFaq products={products} systemName={systemName} region={region} lang={lang} />
            </div>
        </main>
    );
}
