import 'server-only';
import { getTranslations } from '@/lib/api';

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

export const getDictionary = async (locale: string) => {
    const loadDict = locale === 'fr' ? dictionaries.fr : dictionaries.en;

    // Parallel fetch
    const [dict, dbTranslations] = await Promise.all([
        loadDict(),
        getTranslations(locale)
    ]);

    // Deep merge / Overlay
    // We clone dict to avoid mutating the cached module (though import returns a module namespace usually, module.default is an object)
    const result = JSON.parse(JSON.stringify(dict)); // Simple deep clone

    Object.entries(dbTranslations).forEach(([key, value]) => {
        setNestedValue(result, key, value);
    });

    return result;
};
