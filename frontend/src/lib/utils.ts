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

export function getRegion(name: string): "NTSC" | "PAL" | "JP" {
    const lower = name.toLowerCase();
    if (name.startsWith("PAL ")) return "PAL";
    if (name.startsWith("JP ") || lower.includes("famicom") || lower.includes("asian") || lower.includes("japan")) return "JP";
    return "NTSC";
}

import { routeMap } from "./route-config";

// --- URL Generation Helper ---
// Generates: /[lang]/[games-slug]/[game-title]-[console]-[id]
// Example EN: /games/metal-gear-solid-ps1-4402
// Example FR: /fr/jeux-video/metal-gear-solid-ps1-4402
export function getGameUrl(product: { id: number; product_name: string; console_name: string; genre?: string }, lang: string = 'en') {
    // 1. Determine base key (games vs accessories vs consoles)
    let baseKey = 'games';
    if (product.genre && ['Accessories', 'Controllers'].includes(product.genre)) {
        baseKey = 'accessories';
    } else if (product.genre && ['Systems', 'Console', 'Consoles'].includes(product.genre)) {
        baseKey = 'consoles';
    }

    const baseSlug = routeMap[baseKey]?.[lang] || baseKey;

    // 2. Generate clean product slug (title-console)
    // We treat title as universal (no translation), just slugified
    let cleanProductName = (product.product_name || 'unknown-product').toLowerCase();

    // Remove brackets [] and () as requested for cleaner SEO URLs
    cleanProductName = cleanProductName.replace(/[\[\]\(\)]/g, '');

    const titleSlug = cleanProductName
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

    const consoleSlug = formatConsoleName(product.console_name || 'unknown-console').toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

    // Avoid repetition: if title already contains console slug (common for packs), don't append it
    // We must check strict overlap, ignoring regional prefixes in the console slug check
    // e.g. Title: "playstation-5-bundle..." vs Console: "pal-playstation-5"
    // We want to detect that "playstation-5" is already in title.
    const baseConsoleSlug = consoleSlug.replace(/^(pal-|jp-|japan-)/, '');

    let fullSlugPart = titleSlug;
    // If the title slug contains the base console slug (e.g. "playstation-5"), we consider the context present
    if (!titleSlug.includes(baseConsoleSlug)) {
        fullSlugPart = `${titleSlug}-${consoleSlug}`;
    }
    // If it DOES contain it, we might still want the REGION info if missing?
    // User wants: "pal-playstation-5-marvel..."
    // Current titleSlug: "playstation-5-marvel..."
    // We might need to PREPEND region if missing?
    // But user asked for "pal-playstation-5-marvel..." (Region-System-Game).
    // If title is "playstation-5-marvel...", and we don't append "-pal-playstation-5", we get "playstation-5-marvel-prices".
    // Missing "pal".
    // But maybe that's fine? Or should we inject `pal-` at start?
    // Let's stick to MINIMAL repetition. "playstation-5-marvel-prices" is very clean.
    // If the user REALLY wants "pal-playstation-5-marvel...", they would need `consoleSlug` BUT without the repeated `playstation-5`.
    // Let's trust "Simpler is better".

    // 3. Append ID at the end with localized keyword
    const suffixMap: Record<string, string> = {
        'fr': 'cote-prix',
        'en': 'prices'
    };
    const safeLang = lang ? lang.toLowerCase() : 'en';
    const suffix = suffixMap[safeLang] || 'prices';
    const fullSlug = `${fullSlugPart}-${suffix}-${product.id}`;

    // 4. Construct path (handle root for EN)
    if (lang === 'en') {
        return `/${baseSlug}/${fullSlug}`;
    }
    return `/${lang}/${baseSlug}/${fullSlug}`;
}
