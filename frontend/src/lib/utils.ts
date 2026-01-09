import { groupedSystems } from '@/data/systems';

export function isSystemSlug(slug: string): string | null {
    const flatSystems = Object.values(groupedSystems).flat();
    const found = flatSystems.find(s => s.toLowerCase().replace(/ /g, '-') === slug);
    return found || null;
}

export function getIdFromSlug(slug: string): number | null {
    // Try to match the last segment as a number
    const match = slug.match(/-(\d+)$/);
    if (match && match[1]) {
        return parseInt(match[1], 10);
    }
    return null;
}

export function getCanonicalSlug(slug: string): string {
    // DB Legacy Slugs INCLUDE the suffix '-prices-value'.
    // So we must NOT strip it for English.
    // For French, we map '-prix-cotes' -> '-prices-value' to find the DB entry.

    if (slug.endsWith('-prix-cotes')) {
        return slug.replace('-prix-cotes', '-prices-value');
    }

    // For '-prices-value', we keep it as is, because that IS the canonical DB key.

    return slug;
}

export function formatConsoleName(name: string): string {
    const map: Record<string, string> = {
        "Playstation 5": "PS5",
        "Playstation 4": "PS4",
        "Playstation 3": "PS3",
        "Playstation 2": "PS2",
        "Playstation": "PS1",
        "Nintendo Entertainment System": "NES",
        "Super Nintendo": "SNES",
        "Nintendo 64": "N64",
        "GameCube": "GCN",
        "Game Boy Advance": "GBA",
        "Game Boy Color": "GBC",
        "Sega Genesis": "Genesis",
        "Sega Dreamcast": "Dreamcast",
        "Sega Saturn": "Saturn",
        "Xbox Series X": "Xbox Series X",
        "Xbox One": "Xbox One",
        "Xbox 360": "Xbox 360",
        // "PC Games" is now natively "PC" in DB, no mapping needed.
        // Add more as needed, keeping it safe/standard
    };

    // Case insensitive check
    const normalized = name.trim();
    for (const key in map) {
        if (key.toLowerCase() === normalized.toLowerCase()) {
            return map[key];
        }
    }

    return name;
}

export function getRegion(name: string): "NTSC" | "PAL" | "JP" | "GLOBAL" {
    const lower = name.toLowerCase();
    if (name === "PC Games" || lower.includes("pc games")) return "GLOBAL";
    if (name.startsWith("PAL ")) return "PAL";
    if (name.startsWith("JP ") || lower.includes("famicom") || lower.includes("asian") || lower.includes("japan")) return "JP";
    return "NTSC";
}

import { routeMap } from "./route-config";

// Helper to clean messy DB slugs (remove IDs, fix suffixes)
export function cleanGameSlug(slug: string, lang: string): string {
    // 1. Remove ID at end if present (-12345)
    let clean = slug.replace(/-\d+$/, '');

    // 2. Remove known suffixes to get base
    const suffixes = ['-prices-value', '-prix-cotes', '-prices', '-cote-prix'];
    for (const s of suffixes) {
        if (clean.endsWith(s)) {
            clean = clean.substring(0, clean.length - s.length);
            break;
        }
    }

    // 3. Append correct suffix for Lang
    const targetSuffix = lang === 'fr' ? 'prix-cotes' : 'prices-value';
    return `${clean}-${targetSuffix}`;
}

// --- URL Generation Helper ---
export function getGameUrl(product: { id: number; product_name: string; console_name: string; genre?: string; game_slug?: string }, lang: string = 'en') {
    // 1. Determine base key (games vs accessories vs consoles)
    let baseKey = 'games';
    if (product.genre && ['Accessories', 'Controllers'].includes(product.genre)) {
        baseKey = 'accessories';
    } else if (product.genre && ['Systems', 'Console', 'Consoles'].includes(product.genre)) {
        baseKey = 'consoles';
    }

    const baseSlug = routeMap[baseKey]?.[lang] || baseKey;

    // 0. Priority: Unified Game Slug (Cleaned)
    if (product.game_slug) {
        const finalSlug = cleanGameSlug(product.game_slug, lang);
        // English = root, French = /fr/ prefix
        const langPrefix = lang === 'en' ? '' : `/${lang}`;
        return `${langPrefix}/${baseSlug}/${finalSlug}`;
    }

    // 2. Generate clean product slug (fallback)
    let cleanProductName = (product.product_name || 'unknown-product').toLowerCase();
    cleanProductName = cleanProductName.replace(/[\[\]\(\)]/g, '');

    const titleSlug = cleanProductName
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

    // Format console name: e.g. "PC Games" -> "PC"
    const consoleSlug = formatConsoleName(product.console_name || 'unknown-console').toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

    const baseConsoleSlug = consoleSlug.replace(/^(pal-|jp-|japan-)/, '');
    const regionMatch = consoleSlug.match(/^(pal-|jp-|japan-)/);
    const regionPrefix = regionMatch ? regionMatch[0] : '';

    let fullSlugPart = titleSlug;
    if (titleSlug.includes(baseConsoleSlug)) {
        if (regionPrefix && !fullSlugPart.startsWith(regionPrefix)) {
            fullSlugPart = `${regionPrefix}${fullSlugPart}`;
        }
    } else {
        fullSlugPart = `${titleSlug}-${consoleSlug}`;
    }

    // 3. Append localized keyword
    const suffixMap: Record<string, string> = {
        'fr': 'prix-cotes',
        'en': 'prices-value'
    };
    const safeLang = lang ? lang.toLowerCase() : 'en';
    const suffix = suffixMap[safeLang] || 'prices-value';
    const fullSlug = `${fullSlugPart}-${suffix}`;

    // 4. Construct path (English = root, French = /fr/ prefix)
    const langPrefix = lang === 'en' ? '' : `/${lang}`;
    return `${langPrefix}/${baseSlug}/${fullSlug}`;
}
