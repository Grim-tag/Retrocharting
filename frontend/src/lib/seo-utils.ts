export interface SeoContent {
    title: string;
    description: string;
    h1: string;
    intro: string;
}

export function generateConsoleSeo(
    systemName: string,
    genre: string | undefined,
    sortBy: string | undefined,
    count: number,
    lang: string
): SeoContent {
    const isFr = lang === 'fr';

    // Default values
    let title = isFr
        ? `${systemName} - Cote et Prix des Jeux Vidéo`
        : `${systemName} Video Games Price Guide`;

    let description = isFr
        ? `Liste complète des ${count} jeux ${systemName} avec prix loose, complet et neuf. Suivez la cote et gérez votre collection.`
        : `Complete list of ${count} ${systemName} games with loose, CIB, and new prices. Filter by genre and find the best deals.`;

    let h1 = isFr
        ? `Jeux Vidéo ${systemName}`
        : `${systemName} Games`;

    let intro = isFr
        ? `Bienvenue sur l'argus ${systemName}. Retrouvez ci-dessous la liste complète des jeux, classée par popularité.`
        : `Welcome to the ${systemName} price guide. Below is the complete list of games, sorted by popularity.`;

    // --- GENRE LOGIC ---
    if (genre) {
        h1 = isFr
            ? `Jeux ${genre} sur ${systemName}`
            : `${genre} Games on ${systemName}`;

        title = isFr
            ? `Jeux ${genre} ${systemName} | Cote & Prix`
            : `${genre} Games on ${systemName} | Prices & List`;

        description = isFr
            ? `Découvrez les ${count} jeux de genre ${genre} sortis sur ${systemName}. Classement par prix et rareté.`
            : `Discover ${count} ${genre} games released on ${systemName}. Ranked by price and rarity.`;

        intro = isFr
            ? `Liste filtrée : Affichage des jeux de type **${genre}**. Il y a ${count} titres répertoriés dans cette catégorie.`
            : `Filtered List: Showing **${genre}** games. There are ${count} titles listed in this category.`;
    }

    // --- SORT LOGIC (Overrides/Appends) ---
    // Sort keys: loose_desc (Most Expensive), loose_asc (Cheapest)
    if (sortBy === 'loose_desc' || sortBy === 'cib_desc' || sortBy === 'new_desc') {
        const suffix = isFr ? "les Plus Chers" : "Most Expensive";
        const h1Base = genre ? (isFr ? `Jeux ${genre}` : `${genre} Games`) : (isFr ? "Jeux Vidéo" : "Video Games");

        h1 = `${h1Base} ${systemName} ${suffix}`;

        title = isFr
            ? `${h1} | Rareté & Prix`
            : `${h1} | Rarity & Prices`;

        intro = isFr
            ? `Voici le classement des jeux les plus cotés sur ${systemName}. Ces titres sont les plus recherchés par les collectionneurs.`
            : `This is the ranking of the most expensive games on ${systemName}. These titles are the most sought-after by collectors.`;
    }
    else if (sortBy === 'loose_asc' || sortBy === 'cib_asc' || sortBy === 'new_asc') {
        const suffix = isFr ? "les Moins Chers" : "Cheapest";
        const h1Base = genre ? (isFr ? `Jeux ${genre}` : `${genre} Games`) : (isFr ? "Jeux Vidéo" : "Video Games");

        h1 = `${h1Base} ${systemName} ${suffix}`;

        title = isFr
            ? `${h1} (à partir de 1€)`
            : `${h1} (starting from $1)`;

        intro = isFr
            ? `Envie de compléter votre collection à petit prix ? Voici la liste des jeux ${systemName} les plus abordables du moment.`
            : `Want to complete your collection on a budget? Here is the list of the most affordable ${systemName} games right now.`;
    }

    return {
        title: `${title} | RetroCharting`,
        description,
        h1,
        intro
    };
}
