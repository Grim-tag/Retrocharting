
import sys
import os
sys.path.append(os.getcwd())

from app.services.listing_classifier import ListingClassifier

examples = [
    ("Notice Manuel Original  Duck Hunt  Mario Bros Pour Nintendo Nes en FRA", "PAL", "MANUAL_ONLY"),
    ("Notice Nintendo NES Duck Hunt Super Mario Bros  Bon État - Version FAH", "PAL", "MANUAL_ONLY"),
    ("Amiibo 'Super Smash Bros' - Duo Duck Hunt", None, "JUNK"),
    ("Lot de 2 films protecteurs d'écran en acrylique compatibles avec Nintendo NES", None, "JUNK"),
    ("Super Mario Bros / Duck Hunt Notice Usa 🇺🇸 ( Nintendo Nes )", "NTSC-U", "MANUAL_ONLY"),
    ("Super Mario Bros & Duck Hunt / Nintendo NES / PAL B / FR / FAH-1 #1", "PAL", "Used"),
    ("Mandragora: Whispers of the Witch Tree - Collector´s Edition - Xbox", None, "JUNK"), # Xbox on NES = Junk (Cross-platform)
    ("Mortal Kombat: Legacy Kollection - Switch 2", None, "JUNK"), # Switch on NES = Junk
    ("Spy Hunter Nintendo Nes ESP", "PAL", "Used"),
    ("Manette Nintendo 64 Officielle Grise", None, "Used"),  # Product: "Nintendo 64 Controller"
    ("Nintendo 64 Transfer Pak", None, "Used"),             # Product: "Transfer Pak"
    ("N64 Console Clear Blue", None, "Used"),                # Product: "Nintendo 64 ConsoleFuntastic Fire...?"
    
    # New User Examples (False Positives)
    ("Coasters Métal Nintendo NES Rétro - Marchandise Officielle", None, "JUNK"),
    ("The Legend of Zelda (NES Classic) Strategy Guide Book", None, "JUNK"),
    ("The Legend of Zelda NES Classics Nintendo Gameboy Advance SP GB GBA DS", None, "JUNK"), # GBA on NES search
    ("OTL Technologies Écouteurs sans Fil The Legend of Zelda", None, "JUNK"),
    ("LEGO The Legend of Zelda Vénérable Arbre Mojo", None, "JUNK"),
    ("₪PAS DE JEU₪ Notice Nintendo NES - FAH - The Legend of Zelda 1", "PAL", "MANUAL_ONLY"),
    
    # SAO Simulation
    ("Sword Art Online: Last Recollection PS5", None, "Used")
]

print(f"{'TITLE':<80} | {'REG (Exp)':<5} | {'REG (Act)':<5} | {'COND (Exp)':<10} | {'COND (Act)':<10} | J:{'':<1} | R:{'':<1}")
print("-" * 140)

issues = 0

# Mock Products for Relevance Testing
mock_products = {
    # SAO (Simulating PAL Product)
    "Sword Art Online: Last Recollection PS5": ("Sword Art Online: Last Recollection [PAL]", "PlayStation 5", "Games"),
    
    # Accessories
    "Manette Nintendo 64 Officielle Grise": ("Nintendo 64 Controller", "Nintendo 64", "Accessories"),
    "Nintendo 64 Transfer Pak": ("Transfer Pak", "Nintendo 64", "Accessories"),
    "N64 Console Clear Blue": ("Nintendo 64 Console", "Nintendo 64", "Systems"),
    
    # Games (Spy Hunter)
    "Spy Hunter Nintendo Nes ESP": ("Spy Hunter", "Nintendo NES", "Games"),
    "Mandragora: Whispers of the Witch Tree - Collector´s Edition - Xbox": ("Spy Hunter", "Nintendo NES", "Games"),
    "Mortal Kombat: Legacy Kollection - Switch 2": ("Spy Hunter", "Nintendo NES", "Games"),
    
    # Amazon Junk (Zelda NES)
    "Coasters Métal Nintendo NES Rétro - Marchandise Officielle": ("The Legend of Zelda", "Nintendo NES", "Games"),
    "The Legend of Zelda (NES Classic) Strategy Guide Book": ("The Legend of Zelda", "Nintendo NES", "Games"),
    "The Legend of Zelda NES Classics Nintendo Gameboy Advance SP GB GBA DS": ("The Legend of Zelda", "Nintendo NES", "Games"),
    "OTL Technologies Écouteurs sans Fil The Legend of Zelda": ("The Legend of Zelda", "Nintendo NES", "Games"),
    "LEGO The Legend of Zelda Vénérable Arbre Mojo": ("The Legend of Zelda", "Nintendo NES", "Games"),
    "₪PAS DE JEU₪ Notice Nintendo NES - FAH - The Legend of Zelda 1": ("The Legend of Zelda", "Nintendo NES", "Games"),
    
    # Games (Duck Hunt / SMB)
    "Lot de 2 films protecteurs d'écran en acrylique compatibles avec Nintendo NES": ("Spy Hunter", "Nintendo NES", "Games"),
    "Super Mario Bros / Duck Hunt Notice Usa 🇺🇸 ( Nintendo Nes )": ("Super Mario Bros", "Nintendo NES", "Games"),
    "Super Mario Bros & Duck Hunt / Nintendo NES / PAL B / FR / FAH-1 #1": ("Super Mario Bros", "Nintendo NES", "Games"),
    "Amiibo 'Super Smash Bros' - Duo Duck Hunt": ("Duck Hunt", "Nintendo NES", "Games"),
    
    # Missing Entries Fixed:
    "Notice Manuel Original  Duck Hunt  Mario Bros Pour Nintendo Nes en FRA": ("Duck Hunt", "Nintendo NES", "Games"),
    "Notice Nintendo NES Duck Hunt Super Mario Bros  Bon État - Version FAH": ("Duck Hunt", "Nintendo NES", "Games")
}

for title, expected_reg, expected_cond in examples:
    p_name, c_name, genre = mock_products.get(title, ("Unknown", "Unknown", "Games"))
    
    # 1. Check Junk
    is_junk = ListingClassifier.is_junk(title, p_name, c_name, genre)
    
    # 2. Check Relevance
    is_relevant = ListingClassifier.is_relevant(title, p_name)
    
    classification = "IRRELEVANT"
    if not is_junk:
        if is_relevant:
            classification = ListingClassifier.detect_condition(title)
    else:
         classification = "JUNK"
         
    detected_cond = classification
    detected_reg = ListingClassifier.detect_region(title)

    reg_match = "OK" if detected_reg == expected_reg else "FAIL"
    if expected_reg is None and detected_reg is None: reg_match = "OK"
    
    cond_match = "OK" if detected_cond == expected_cond else "FAIL"
    
    if reg_match == "FAIL" or cond_match == "FAIL":
        issues += 1
        print(f"FAIL: {title[:50]}...")
        print(f"  Exp Reg: {expected_reg}, Act Reg: {detected_reg}")
        print(f"  Exp Cond: {expected_cond}, Act Cond: {detected_cond}")
        print(f"  Junk: {is_junk}, Rel: {is_relevant}")
        print("-" * 20)

print(f"\nTotal Issues: {issues}")
