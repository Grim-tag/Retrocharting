
import re

class ListingClassifier:
    """
    Advanced text analysis for Video Game listings.
    Detects: Region (PAL, NTSC-U, JAP), Condition (Box Only, Manual Only, CIB, Loose), and Junk.
    """

    # --- REGION DEFINITIONS ---
    # PAL: Europe, Australia
    KEYWORDS_PAL = [
        r'\bpal\b', r'\beur\b', r'\bukv\b', r'\bfah\b', r'\bfra\b', r'\bfr\b', 
        r'\besp\b', r'\bita\b', r'\bger\b', r'\bnoe\b', r'\beurope\b', r'\beuropean\b',
        r'\baus\b', r'\baustralian\b'
    ]
    
    # NTSC-U: USA, Canada, North America
    KEYWORDS_NTSC_U = [
        r'\bntsc\b', # Often implies US if not followed by J
        r'\bntsc-u\b', r'\bntsc-us\b', r'\busa\b', r'\bus\b', r'\bamerican\b', r'\bnorth america\b',
        r'\bgenesis\b' # genesis is US name for megadrive
    ]
    
    # JAP: Japan
    KEYWORDS_JAP = [
        r'\bntsc-j\b', r'\bjap\b', r'\bjapan\b', r'\bjapanese\b', r'\bjp\b', 
        r'\bfamicom\b', r'\bsuper famicom\b', r'\bpc engine\b' # Specific JP consoles
    ]

    # --- CONDITION DEFINITIONS ---
    KEYWORDS_BOX_ONLY = [
        r'\bbox only\b', r'\bboite seule\b', r'\bboîte seule\b', r'\bempty box\b', 
        r'\bcase only\b', r'\bboitier seul\b', r'\bboîte vide\b', r'\bboite vide\b',
        r'\bcaja vacia\b', r'\bscatola vuota\b', r'\bleerschachtel\b'
    ]
    
    KEYWORDS_MANUAL_ONLY = [
        r'\bmanual only\b', r'\bnotice seule\b', r'\bbooklet only\b', r'\binsert only\b', 
        r'\bnotice only\b', r'\bmanuel seul\b', r'\bsans jeu\b', r'\bno game\b',
        r'\banleitung\b', r'\bhandleiding\b'
    ]
    
    KEYWORDS_CIB = [
        r'\bcib\b', r'\bcomplete\b', r'\bcomplet\b', r'\bboxed\b', r'\ben boite\b', r'\ben boîte\b',
        r'\bavec notice\b', r'\bwith manual\b', r'\bkomplett\b'
    ]

    @staticmethod
    def detect_region(title: str, default_console_region: str = None) -> str | None:
        """
        Detects the region from the listing title.
        Returns: 'PAL', 'NTSC-U', 'JAP', or None (Unknown/Loose).
        """
        t = title.lower()

        # 1. Check Specific JP terms first (Strong signals)
        if any(re.search(p, t) for p in ListingClassifier.KEYWORDS_JAP):
            return 'JAP'
            
        # 2. Check PAL terms
        if any(re.search(p, t) for p in ListingClassifier.KEYWORDS_PAL):
            return 'PAL'
            
        # 3. Check NTSC-U terms
        # ambiguous "NTSC" usually means US in generic context, but check strict patterns first
        if any(re.search(p, t) for p in ListingClassifier.KEYWORDS_NTSC_U):
            # Special case: "NTSC-J" is Japanese, already caught above?
            # If regex was strict \bntsc\b, it wouldn't match ntsc-j provided boundaries work.
            if "ntsc-j" in t: 
                return 'JAP' 
            return 'NTSC-U'

        # Default fallback? No, return None to indicate uncertainty.
        return None

    @staticmethod
    def detect_condition(title: str) -> str:
        """
        Determines if item is BOX_ONLY, MANUAL_ONLY, or Standard (Game).
        """
        t = title.lower()
        
        # Priority 1: Box Only (Empty Box)
        if any(re.search(p, t) for p in ListingClassifier.KEYWORDS_BOX_ONLY):
            return 'BOX_ONLY'

        # Priority 2: Manual Only definitions (Explicit "Only")
        if any(re.search(p, t) for p in ListingClassifier.KEYWORDS_MANUAL_ONLY):
            return 'MANUAL_ONLY'
            
        # Priority 3: Implicit "Note" or "Box" starts
        # If title STARTS with "Notice" or "Manuel" or "Boite" and doesn't mention "Jeu"/"Game" explicitly later
        # Regex: ^\s*(notice|manuel|manual|boite|box)\b
        
        # Check strict start for Manual
        if re.search(r'^\s*(notice|manuel|manual|livret|booklet)\b', t):
            # It starts with "Notice", assume Manual Only unless "Jeu" implies "Notice du Jeu"? 
            # "Notice du Jeu Super Mario" -> Still Manual Only usually.
            # "Notice + Jeu" -> Game.
            # "Notice et Jeu" -> Game.
            if 'jeu' not in t and 'game' not in t and 'cartouche' not in t and 'cartridge' not in t:
                 return 'MANUAL_ONLY'
            # Check for "+ Jeu" connector
            if not any(x in t for x in ['+ jeu', '+ game', 'avec jeu', 'with game', 'jeu compris']):
                 return 'MANUAL_ONLY'

        # Check strict start for Box
        if re.search(r'^\s*(boite|box|boîte)\b', t):
            if 'jeu' not in t and 'game' not in t and 'cartouche' not in t:
                 return 'BOX_ONLY'
        
        # Priority 4: Implicit (Contains "Notice" but no "Game" or connectors)
        # e.g. "Super Mario Bros Notice" -> Manual
        # e.g. "Super Mario Bros avec Notice" -> Game (Connectors: avec, with, +, incl, compris)
        if any(re.search(p, t) for p in [r'\bnotice\b', r'\bmanuel\b', r'\bmanual\b']):
             # Must NOT have game terms
             if not any(x in t for x in ['jeu', 'game', 'cartouche', 'cartridge', 'console']):
                 # Must NOT have connectors (avec, with, +, incl) which imply Game + Manual
                 if not any(x in t for x in ['avec', 'with', 'incl', 'compris', r'\+', 'und']):
                     return 'MANUAL_ONLY'

        return 'Used' # Default to Game

    @staticmethod
    def is_junk(title: str, product_name: str, console_name: str, genre: str) -> bool:
        """
        Returns True if the item is irrelevant (Amiibo, Protector, Mod, etc.)
        """
        t = title.lower()
        p_name = product_name.lower()
        
        # 1. Universal Junk
        junk_terms = [
            'repro', 'mod', 'hs', 'for parts', 'broken', 'defective', 'junk', 'non fonctionnel',
            'fan made', 'custom', 'telecopie', 'pirate', 'hack'
        ]
        if any(x in t for x in junk_terms): return True
        
        # 2. Accessories masking as Games (Amiibo, Protectors)
        # Apply this generally unless the product IS an Amiibo/Accessory
        if genre != 'Accessories' and 'amiibo' not in p_name:
             if 'amiibo' in t: return True
             
        if 'protector' in t or 'protection' in t or 'film' in t or 'ecran' in t or 'acrylic' in t or 'stand' in t:
             # "Screen Protector", "Box Protector"
             # Careful: "Protection" could be in game title? Unlikely for retro games.
             # "Mission Impossible: Nuclear Protection" -> Rare.
             return True

        # 3. System Parts (if querying System)
        if genre == 'Systems':
            bad_sys_terms = [
                "cable", "câble", "adaptateur", "adapter", "case", "housse", "sacoche", 
                "fan", "ventilateur", "sticker", "skin", "controller", "manette", "pad", 
                "chargeur", "charger", "alim", "power", "supply", "part", "pièce", "button", "bouton",
                "pile", "battery", "batterie", "contact", "rubber", "caoutchouc",
                "fourreau", "sleeve", "rallonge", "extender", "extension", "cordon", "cord",
                "kit", "tool", "tournevis", "screwdriver", "condensateur", "capacitor",
                "repair", "réparation", "restauration", "notice", "manuel", "rf switch" 
                # Notice for system is junk? Yes usually we want console hardware.
            ]
            if any(bad in t for bad in bad_sys_terms): return True
            
            # Anti-Mini checks
            if "mini" not in p_name and ("mini" in t or "classic edition" in t):
                return True
                
        # 4. Cross-Platform Contamination
        # e.g. "Wii" results when looking for "NES"
        c_name = console_name.lower()
        if "wii" in t and "wii" not in c_name: return True
        if "switch" in t and "switch" not in c_name: return True
        # "DS" on "3DS" is valid? "3DS" on "DS" is bad. 
        
        return False

    @staticmethod
    def is_relevant(title: str, product_name: str, strict: bool = False) -> bool:
        """
        Check if the title contains significant parts of the product name.
        Handles synonyms (N64=Nintendo 64) and partial matches.
        """
        t = title.lower()
        
        # 0. Clean & Synonyms
        p_clean = re.sub(r'\[.*?\]', '', product_name)
        p_clean = re.sub(r'\(.*?\)', '', p_clean)
        p_clean = p_clean.lower() # e.g. "nintendo 64 controller"

        # Apply common synonyms to product name tokens? 
        # Or better: Normalize title?
        # If product="Nintendo 64", listing="N64".
        # Let's synonymize the SEARCH TERMS.
        
        # Manually fix specific console names in p_clean and title
        # 1. Console Synonyms
        replacements = {
            "nintendo 64": "n64",
            "super nintendo": "snes",
            "super nes": "snes",
            "famicom": "nes", # careful with japanese
            "entertainment system": "nes"
        }
        for k, v in replacements.items():
            p_clean = p_clean.replace(k, v)
            t = t.replace(k, v)
            
        # 2. Accessory Synonyms (Normalize to English)
        acc_replacements = {
            "manette": "controller",
            "pad": "controller",
            "joypad": "controller",
            "joystick": "controller",
            "remote": "controller",
            "télécommande": "controller",
            "carte mémoire": "memory card",
            "memory card": "memory card", # keep
            "transfer pak": "transfer pak",
            "expansion pak": "expansion pak",
            "rumble pak": "rumble pak",
            "vibration": "rumble",
            "console": "console", # keep
            "system": "console"
        }
        for k, v in acc_replacements.items():
            if k in p_clean: p_clean = p_clean.replace(k, v)
            if k in t: t = t.replace(k, v)
            
        # Tokenize (allow >= 2 chars, e.g. "go")
        terms = [x for x in p_clean.split() if len(x) >= 2]
        if not terms: return True
        
        match_count = 0
        missed_terms = []
        
        for term in terms:
            if term in t:
                match_count += 1
            else:
                missed_terms.append(term)
                
        # Logic: 
        # If short name (<= 2 terms), require ALL.
        # If long name (> 2 terms), allow 1 miss (often "The", "Edition", "Controller" vs "Manette").
        
        if len(terms) <= 2:
            return match_count == len(terms)
        else:
            # Allow 1 miss.
            # But if the missed term is KEY? e.g. "Zelda" in "Legend of Zelda"?
            # "Legend", "of", "Zelda". "of" skipped by regex? No, len("of")=2.
            # "Legend", "Zelda". If "Zelda" missing -> Bad.
            
            # Refinement: If > 50% match?
            # 3 terms: needs 2. (66%) -> OK.
            # 4 terms: needs 3. (75%) -> OK.
            return match_count >= (len(terms) - 1)
        """
        Strict matching logic.
        Ref: PAL Console -> Accepts PAL or None (Loose). Rejects JAP/NTSC-U.
        """
        if not item_region:
            return True # Loose games often have no region in title, safely include.
            
        if console_region == 'PAL':
            return item_region == 'PAL'
        elif console_region == 'JAP':
            return item_region == 'JAP'
        elif console_region == 'NTSC-U':
            return item_region == 'NTSC-U'
            
        # If console region is unknown (e.g. "GameBoy" is region free-ish?), default Accept?
        return True

    @staticmethod
    def clean_query(product_name: str, console_name: str) -> str:
        """
        Creates a 'Broad Search' query.
        Removes [Tags] and Region words from the query components.
        """
        # Remove [STUFF], (STUFF)
        p_clean = re.sub(r'\[.*?\]', '', product_name)
        p_clean = re.sub(r'\(.*?\)', '', p_clean)
        
        # Remove region keywords
        bad_words = ['pal', 'ntsc', 'ntsc-u', 'ntsc-j', 'jap', 'japan', 'import', 'fah', 'fra', 'eur']
        tokens = p_clean.split()
        p_clean = " ".join([t for t in tokens if t.lower() not in bad_words])
        
        c_clean = re.sub(r'\[.*?\]', '', console_name)
        c_clean = re.sub(r'\(.*?\)', '', c_clean)
        tokens_c = c_clean.split()
        c_clean = " ".join([t for t in tokens_c if t.lower() not in bad_words])

        return f"{p_clean} {c_clean}".strip()

