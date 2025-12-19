export interface FaqItem {
    question: string;
    answer: string;
}

export interface SeoContent {
    title: string;
    description: string;
    h1: string;
    intro: string;
    faq: FaqItem[];
}

export function generateConsoleSeo(
    systemName: string,
    genre: string | undefined,
    sortBy: string | undefined,
    count: number,
    lang: string
): SeoContent {
    const isFr = lang === 'fr';

    // Helper to avoid "PC Games Games"
    // specific fix for "PC Games" -> "PC Games"
    const cleanSystemName = systemName === "PC Games" ? "PC Games" : systemName;
    // Actually generic logic: if cleanSystemName doesn't end in "Games" and we want to say "{System} Games", we add it. 
    // But user wants "{System} List Value & Prices" which works for "PC Games" (PC Games List...) and "NES" (NES List...)

    // --- 1. DEFAULT TITLES ---
    let h1 = isFr
        ? `Cote ${cleanSystemName} & Liste de Prix`
        : `${cleanSystemName} List Value & Prices`;

    let title = isFr
        ? `Cote ${cleanSystemName} : Prix du neuf, occasion et loose`
        : `${cleanSystemName} Price Guide: New, Used & Loose Values`;

    let description = isFr
        ? `Consultez la liste des ${count} jeux ${cleanSystemName} avec leur cote actuelle. Prix mis à jour quotidiennement pour le loose, complet (CIB) et neuf.`
        : `Find current values for ${count} ${cleanSystemName} games. Daily updated prices for loose, CIB, and new conditions to help you buy or sell.`;

    let intro = isFr
        ? `Bienvenue sur l'argus ${cleanSystemName}. Vous trouverez ci-dessous la liste complète des jeux, classée par popularité. Utilisez les filtres pour affiner votre recherche par genre (Action, RPG...) ou pour trouver les pépites rares.`
        : `Welcome to the ${cleanSystemName} price guide. Below is the comprehensive list of games, sorted by popularity. Use filters to narrow down by genre or find rare and expensive titles.`;

    // --- 2. GENRE SPECIFIC ---
    if (genre) {
        // Pattern: "{Genre} {System} List & Value"
        // Example: "Action & Adventure PC Games List & Value"
        // Example: "RPG NES Games List & Value" -> Need to append "Games" if not present?
        // User example: "Action & Adventure PC Games list & value" -> "PC Games" has "Games".
        // "RPG NES list & value" -> Sounds weird. "RPG NES Games list & value" is better.

        let systemSuffix = cleanSystemName;
        if (!cleanSystemName.toLowerCase().includes("games") && !cleanSystemName.toLowerCase().includes("jeux")) {
            // For NES, PS1, etc. append "Games" in English
            if (!isFr) systemSuffix += " Games";
        }

        h1 = isFr
            ? `Liste des jeux ${genre} sur ${cleanSystemName} & Cote`
            : `${genre} ${systemSuffix} List & Value`;

        title = isFr
            ? `Jeux ${genre} ${cleanSystemName} | Cote & Prix`
            : `${genre} ${cleanSystemName} Games | Prices & Value`;

        description = isFr
            ? `Découvrez les ${count} jeux ${cleanSystemName} du genre ${genre}. Classement par cote pour trouver les meilleurs titres ${genre} sur ${cleanSystemName}.`
            : `Discover ${count} ${genre} games released on ${cleanSystemName}. Ranked by market value to help you find the best ${genre} titles.`;

        intro = isFr
            ? `Liste filtrée : Affichage des jeux de type **${genre}** sur ${cleanSystemName}.`
            : `Filtered List: Showing **${genre}** games on ${cleanSystemName}.`;
    }

    // --- 3. SORT SPECIFIC ---
    if (sortBy?.includes('desc')) {
        const suffix = isFr ? "les Plus Chers" : "Most Expensive";
        // "Most Expensive PC Games"
        // "Most Expensive NES Games"
        let systemNoun = cleanSystemName;
        if (!isFr && !systemNoun.toLowerCase().includes("games")) systemNoun += " Games";

        h1 = isFr
            ? `Top des Jeux ${cleanSystemName} ${suffix}`
            : `${suffix} ${systemNoun}`;
    } else if (sortBy?.includes('asc')) {
        const suffix = isFr ? "les Moins Chers" : "Cheapest";
        let systemNoun = cleanSystemName;
        if (!isFr && !systemNoun.toLowerCase().includes("games")) systemNoun += " Games";

        h1 = isFr
            ? `Top des Jeux ${cleanSystemName} ${suffix}`
            : `${suffix} ${systemNoun}`;
    }

    // --- 4. FAQ GENERATION ---
    const faq: FaqItem[] = [];

    if (isFr) {
        faq.push({
            question: `Combien coûte un jeu ${cleanSystemName} ?`,
            answer: `Le prix moyen d'un jeu ${cleanSystemName} varie fortement selon son état. Sur RetroCharting, nous suivons les prix du "Loose" (cartouche/CD seul), "CIB" (Complet en Boîte) et "Neuf". Utilisez la liste ci-dessus pour vérifier la cote de chaque titre.`
        });
        faq.push({
            question: `Quels sont les jeux ${cleanSystemName} les plus chers ?`,
            answer: `Les jeux les plus rares sur ${cleanSystemName} peuvent atteindre des sommes importantes. Utilisez le filtre de tri "Prix : Décroissant" pour voir le top des jeux les plus cotés du moment.`
        });
        if (cleanSystemName === "PC Games") {
            faq.push({
                question: `Comment estimer ses vieux jeux PC ?`,
                answer: `Les jeux PC en "Big Box" (grosses boîtes carton) sont particulièrement recherchés. Vérifiez que votre exemplaire contient bien tous les manuels et disquettes/CD d'origine pour maximiser sa valeur.`
            });
        }
    } else {
        // Fix for "PC Games games" -> "PC Games"
        // If system name already ends in "Games" (case insensitive), don't append " games".
        const endsWithGames = cleanSystemName.toLowerCase().endsWith('games');
        const systemNoun = endsWithGames ? cleanSystemName : `${cleanSystemName} games`;

        faq.push({
            question: `How much are ${systemNoun} worth?`,
            answer: `The value of ${systemNoun} depends heavily on condition. We track specific prices for Loose, CIB (Complete in Box), and New copies. Check the list above for real-time market values.`
        });
        faq.push({
            question: `What are the most expensive ${systemNoun}?`,
            answer: `Rare titles on ${cleanSystemName} can be very valuable. Use the "Sort by Price: High to Low" filter to see the current most expensive games on the platform.`
        });
        if (cleanSystemName === "PC Games") {
            faq.push({
                question: `Are old PC games worth money?`,
                answer: `Yes, especially "Big Box" PC games which are highly collectible. Complete copies with original manuals and packaging often command a premium over loose discs.`
            });
        }
    }

    return {
        title: `${title} | RetroCharting`,
        description,
        h1,
        intro,
        faq
    };
}
