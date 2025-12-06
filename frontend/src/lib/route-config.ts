export const routeMap: Record<string, Record<string, string>> = {
    'video-games': { en: 'video-games', fr: 'jeux-video' },
    'consoles': { en: 'consoles', fr: 'consoles' },
    'accessories': { en: 'accessories', fr: 'accessoires' },
    'collectibles': { en: 'collectibles', fr: 'objets-de-collection' },
    'games': { en: 'games', fr: 'jeux' },
};

export const reverseRouteMap: Record<string, Record<string, string>> = {};

// Build reverse map for middleware (localized slug -> internal path key)
Object.entries(routeMap).forEach(([key, locales]) => {
    Object.entries(locales).forEach(([lang, slug]) => {
        if (!reverseRouteMap[lang]) reverseRouteMap[lang] = {};
        reverseRouteMap[lang][slug] = key;
    });
});
