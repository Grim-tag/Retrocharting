import 'server-only';

const dictionaries = {
    en: () => import('@/dictionaries/en.json').then((module) => module.default),
    fr: () => import('@/dictionaries/fr.json').then((module) => module.default),
};

const setNestedValue = (obj: any, path: string, value: string) => {
    const keys = path.split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!current[key]) current[key] = {};
        current = current[key];
    }
    current[keys[keys.length - 1]] = value;
};

// Cached fetch to prevent API flood during build/deploy
const fetchTranslations = async (locale: string) => {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        // Ensure no double slash
        const url = `${baseUrl.replace(/\/$/, '')}/api/v1/translations/${locale}`;

        const res = await fetch(url, {
            next: { revalidate: 60, tags: ['translations'] }
        });
        if (!res.ok) return {};
        return res.json();
    } catch (e) {
        console.error("Failed to fetch translations:", e);
        return {};
    }
};

export const getDictionary = async (locale: string) => {
    const loadDict = locale === 'fr' ? dictionaries.fr : dictionaries.en;

    // Parallel fetch
    const [dict, dbTranslations] = await Promise.all([
        loadDict(),
        fetchTranslations(locale)
    ]);

    // Deep merge / Overlay
    // We clone dict to avoid mutating the cached module (though import returns a module namespace usually, module.default is an object)
    const result = JSON.parse(JSON.stringify(dict)); // Simple deep clone

    Object.entries(dbTranslations).forEach(([key, value]) => {
        setNestedValue(result, key, value as string); // Type assertion safely
    });

    return result;
};
