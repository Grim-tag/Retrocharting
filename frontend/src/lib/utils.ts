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
