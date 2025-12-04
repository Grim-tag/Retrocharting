export const systems = [
    "3DO", "Action Max", "Amiga", "Amiga CD32", "Amiibo", "Amiibo Cards", "Amstrad CPC", "Amstrad GX4000", "Apple II", "Arcadia 2001",
    "Asian English Nintendo 3DS", "Asian English PSP", "Asian English Playstation 2", "Asian English Playstation 3", "Asian English Playstation 4",
    "Asian English Playstation 5", "Asian English Playstation Vita", "Asian English Switch", "Asian English Switch 2", "Asian English Xbox",
    "Asian Xbox 360", "Atari 2600", "Atari 2800", "Atari 400", "Atari 5200", "Atari 7800", "Atari Lynx", "Atari ST", "Atari XE",
    "Bally Astrocade", "CD-i", "Casio Loopy", "Club Nintendo Magazine", "Colecovision", "Commodore 128", "Commodore 16", "Commodore 64",
    "Disney Infinity", "Dreamcast Magazine", "Electronic Gaming Monthly", "Entex Adventure Vision", "Evercade", "FM Towns Marty",
    "Fairchild Channel F", "Famicom", "Famicom Disk System", "Game & Watch", "Game Informer", "Game Wave", "Game.Com", "GameBoy",
    "GameBoy Advance", "GameBoy Color", "GamePro", "Gamecube", "Gizmondo", "HyperScan", "Intellivision", "JP 3DO", "JP GameBoy",
    "JP GameBoy Advance", "JP GameBoy Color", "JP Gamecube", "JP LaserActive", "JP MSX", "JP MSX2", "JP Neo Geo AES", "JP Neo Geo CD",
    "JP Neo Geo MVS", "JP Neo Geo Pocket", "JP Neo Geo Pocket Color", "JP Nintendo 3DS", "JP Nintendo 64", "JP Nintendo DS",
    "JP Nintendo Switch", "JP Nintendo Switch 2", "JP PC Engine", "JP PC Engine CD", "JP PSP", "JP Playstation", "JP Playstation 2",
    "JP Playstation 3", "JP Playstation 4", "JP Playstation 5", "JP Playstation Vita", "JP Sega Dreamcast", "JP Sega Game Gear",
    "JP Sega Mark III", "JP Sega Mega CD", "JP Sega Mega Drive", "JP Sega Pico", "JP Sega Saturn", "JP Super 32X", "JP Virtual Boy",
    "JP Wii", "JP Wii U", "JP Xbox", "JP Xbox 360", "JP Xbox One", "JP Xbox Series X", "Jaguar", "Jaguar CD", "LaserActive",
    "Lego Dimensions", "Macintosh", "Magnavox Odyssey", "Magnavox Odyssey 2", "Magnavox Odyssey 300", "Mattel Aquarius", "MegaZone",
    "Microvision", "Mini Arcade", "N-Gage", "NES", "Neo Geo AES", "Neo Geo CD", "Neo Geo MVS", "Neo Geo Pocket Color", "Nintendo 3DS",
    "Nintendo 64", "Nintendo DS", "Nintendo Power", "Nintendo Switch", "Nintendo Switch 2", "Nuon", "Official Nintendo Magazine",
    "Official US Playstation Magazine", "PAL 3DO", "PAL Amiga CD32", "PAL Amstrad GX4000", "PAL Atari 2600", "PAL Atari 7800",
    "PAL Dreamcast Magazine", "PAL Evercade", "PAL GameBoy", "PAL GameBoy Advance", "PAL GameBoy Color", "PAL Gamecube", "PAL MSX",
    "PAL MSX2", "PAL Mega Drive 32X", "PAL N-Gage", "PAL NES", "PAL Neo Geo Pocket", "PAL Neo Geo Pocket Color", "PAL Nintendo 3DS",
    "PAL Nintendo 64", "PAL Nintendo DS", "PAL Nintendo Switch", "PAL Nintendo Switch 2", "PAL PSP", "PAL Playstation", "PAL Playstation 2",
    "PAL Playstation 3", "PAL Playstation 4", "PAL Playstation 5", "PAL Playstation Vita", "PAL Sega Dreamcast", "PAL Sega Game Gear",
    "PAL Sega Master System", "PAL Sega Mega CD", "PAL Sega Mega Drive", "PAL Sega Pico", "PAL Sega Saturn", "PAL Super Nintendo",
    "PAL Vectrex", "PAL Videopac G7000", "PAL Videopac G7400", "PAL Wii", "PAL Wii U", "PAL Xbox", "PAL Xbox 360", "PAL Xbox One",
    "PAL Xbox Series X", "PC FX", "PC Gamer Magazine", "PC Games", "PSP", "Pippin", "Playstation", "Playstation 2", "Playstation 3",
    "Playstation 4", "Playstation 5", "Playstation Vita", "Pokemon Mini", "Polymega", "RCA Studio II", "Rumble U", "Sega 32X",
    "Sega CD", "Sega Dreamcast", "Sega Game Gear", "Sega Genesis", "Sega Master System", "Sega Pico", "Sega Saturn", "Sega Saturn Magazine",
    "Sharp X68000", "Sinclair ZX81", "Skylanders", "Starlink", "Stoneheart", "Strategy Guide", "Super Famicom", "Super Nintendo",
    "Supervision", "TI-99", "TRS-80", "Tapwave Zodiac", "Tiger R-Zone", "TurboGrafx CD", "TurboGrafx-16", "UB Funkeys", "VTech Socrates",
    "Vectrex", "Vic-20", "Virtual Boy", "Wholesale", "Wii", "Wii U", "WonderSwan", "WonderSwan Color", "Xbox", "Xbox 360", "Xbox One",
    "Xbox Series X", "ZX Spectrum"
];

export const groupedSystems: Record<string, string[]> = {
    "Nintendo": [
        "NES", "Super Nintendo", "Nintendo 64", "Gamecube", "Wii", "Wii U", "Nintendo Switch", "Nintendo Switch 2",
        "GameBoy", "GameBoy Color", "GameBoy Advance", "Nintendo DS", "Nintendo 3DS", "Virtual Boy", "Game & Watch",
        "Amiibo", "Amiibo Cards", "Pokemon Mini", "Famicom", "Famicom Disk System", "Super Famicom",
        "JP Nintendo Switch", "JP Nintendo Switch 2", "JP Wii", "JP Wii U", "JP Gamecube", "JP Nintendo 64",
        "JP Nintendo 3DS", "JP Nintendo DS", "JP GameBoy", "JP GameBoy Color", "JP GameBoy Advance", "JP Virtual Boy",
        "Asian English Switch", "Asian English Switch 2", "Asian English Nintendo 3DS",
        "PAL NES", "PAL Super Nintendo", "PAL Nintendo 64", "PAL Gamecube", "PAL Wii", "PAL Wii U", "PAL Nintendo Switch", "PAL Nintendo Switch 2",
        "PAL GameBoy", "PAL GameBoy Color", "PAL GameBoy Advance", "PAL Nintendo DS", "PAL Nintendo 3DS",
        "Club Nintendo Magazine", "Nintendo Power", "Official Nintendo Magazine"
    ],
    "PlayStation": [
        "Playstation", "Playstation 2", "Playstation 3", "Playstation 4", "Playstation 5", "PSP", "Playstation Vita", "Pippin",
        "JP Playstation", "JP Playstation 2", "JP Playstation 3", "JP Playstation 4", "JP Playstation 5", "JP PSP", "JP Playstation Vita",
        "Asian English Playstation 2", "Asian English Playstation 3", "Asian English Playstation 4", "Asian English Playstation 5", "Asian English Playstation Vita", "Asian English PSP",
        "PAL Playstation", "PAL Playstation 2", "PAL Playstation 3", "PAL Playstation 4", "PAL Playstation 5", "PAL PSP", "PAL Playstation Vita",
        "Official US Playstation Magazine"
    ],
    "Xbox": [
        "Xbox", "Xbox 360", "Xbox One", "Xbox Series X",
        "JP Xbox", "JP Xbox 360", "JP Xbox One", "JP Xbox Series X",
        "Asian English Xbox", "Asian Xbox 360",
        "PAL Xbox", "PAL Xbox 360", "PAL Xbox One", "PAL Xbox Series X"
    ],
    "Sega": [
        "Sega Master System", "Sega Genesis", "Sega Mega Drive", "Sega Saturn", "Sega Dreamcast", "Sega Game Gear", "Sega CD", "Sega 32X", "Sega Pico",
        "JP Sega Mega Drive", "JP Sega Saturn", "JP Sega Dreamcast", "JP Sega Game Gear", "JP Sega Mega CD", "JP Sega Mark III", "JP Sega Pico", "JP Super 32X",
        "PAL Sega Master System", "PAL Sega Mega Drive", "PAL Sega Saturn", "PAL Sega Dreamcast", "PAL Sega Game Gear", "PAL Sega Mega CD", "PAL Sega Pico", "PAL Mega Drive 32X",
        "Sega Saturn Magazine", "Dreamcast Magazine"
    ],
    "Atari": [
        "Atari 2600", "Atari 2800", "Atari 5200", "Atari 7800", "Atari 400", "Atari 800", "Atari XE", "Atari ST", "Atari Lynx", "Jaguar", "Jaguar CD",
        "PAL Atari 2600", "PAL Atari 7800"
    ],
    "Other": [
        "3DO", "JP 3DO", "PAL 3DO", "Neo Geo AES", "Neo Geo CD", "Neo Geo MVS", "Neo Geo Pocket Color",
        "JP Neo Geo AES", "JP Neo Geo CD", "JP Neo Geo MVS", "JP Neo Geo Pocket", "JP Neo Geo Pocket Color",
        "PAL Neo Geo Pocket", "PAL Neo Geo Pocket Color",
        "PC Engine", "TurboGrafx-16", "TurboGrafx CD", "JP PC Engine", "JP PC Engine CD", "PC FX",
        "Amiga", "Amiga CD32", "PAL Amiga CD32", "Commodore 64", "Commodore 128", "Commodore 16", "Vic-20",
        "Colecovision", "Intellivision", "Vectrex", "PAL Vectrex", "Magnavox Odyssey", "Magnavox Odyssey 2",
        "WonderSwan", "WonderSwan Color", "N-Gage", "PAL N-Gage", "Gizmondo", "Tapwave Zodiac",
        "Evercade", "PAL Evercade", "Polymega", "Nuon", "LaserActive", "JP LaserActive",
        "PC Games", "PC Gamer Magazine", "Game Informer", "Electronic Gaming Monthly", "GamePro", "Strategy Guide",
        "Skylanders", "Disney Infinity", "Lego Dimensions", "Starlink", "UB Funkeys",
        "Action Max", "Amstrad CPC", "Amstrad GX4000", "PAL Amstrad GX4000", "Apple II", "Arcadia 2001",
        "Bally Astrocade", "CD-i", "Casio Loopy", "Entex Adventure Vision", "FM Towns Marty", "Fairchild Channel F",
        "Game Wave", "Game.Com", "HyperScan", "JP MSX", "JP MSX2", "PAL MSX", "PAL MSX2",
        "Macintosh", "Mattel Aquarius", "MegaZone", "Microvision", "Mini Arcade", "RCA Studio II", "Rumble U",
        "Sharp X68000", "Sinclair ZX81", "Stoneheart", "Supervision", "TI-99", "TRS-80", "Tiger R-Zone",
        "VTech Socrates", "Wholesale", "ZX Spectrum"
    ]
};
