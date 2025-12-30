export const routeMap: Record<string, Record<string, string>> = {
    'games': { en: 'games', fr: 'games' },
    'consoles': { en: 'consoles', fr: 'consoles' },
    'accessories': { en: 'accessories', fr: 'accessories' },
    'collectibles': { en: 'collectibles', fr: 'collectibles' },
};

export const reverseRouteMap: Record<string, Record<string, string>> = {};

// Build reverse map for middleware (localized slug -> internal path key)
Object.entries(routeMap).forEach(([key, locales]) => {
    Object.entries(locales).forEach(([lang, slug]) => {
        if (!reverseRouteMap[lang]) reverseRouteMap[lang] = {};
        reverseRouteMap[lang][slug] = key;
    });
});
