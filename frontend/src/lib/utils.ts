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
    // 1. Determine base key (games vs accessories)
    let baseKey = 'games';
    if (product.genre && ['Accessories', 'Controllers'].includes(product.genre)) {
        baseKey = 'accessories';
    }

    const baseSlug = routeMap[baseKey]?.[lang] || baseKey;

    // 2. Generate clean product slug (title-console)
    // We treat title as universal (no translation), just slugified
    const titleSlug = product.product_name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

    const consoleSlug = formatConsoleName(product.console_name).toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

    // 3. Append ID at the end
    const fullSlug = `${titleSlug}-${consoleSlug}-${product.id}`;

    // 4. Construct path (handle root for EN)
    if (lang === 'en') {
        return `/${baseSlug}/${fullSlug}`;
    }
    return `/${lang}/${baseSlug}/${fullSlug}`;
}
