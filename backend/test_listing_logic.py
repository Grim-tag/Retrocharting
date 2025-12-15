
import sys
import os
sys.path.append(os.getcwd())

from app.services.listing_classifier import ListingClassifier

examples = [
    ("SUPER MARIO BROS NINTENDO NES PAL-FRA (VERSION ASD) - (SANS NOTICE - WITHOUT MAN", "PAL", "Used"), # "SANS NOTICE" means NO manual, but GAME present? Or Manual Only? "Without Man" -> usually Game + Box or Game Only.
    ("Super Mario Bros - Double sceaux ovales - FAH NES - Nintendo Nes", "PAL", "Used"),
    ("Super Mario Bros - FAH NES - Nintendo Nes - BE", "PAL", "Used"),
    ("Super Mario Bros 2 Complet Nintendo NES FAH", "PAL", "Used"),
    ("Super Mario Bros 3 Complet Nintendo NES FRA", "PAL", "Used"),
    ("Super Mario Bros - FAH NES - Nintendo Nes - TBE", "PAL", "Used"),
    ("Nintendo Mario Open Golf 1991 Famicom NTSC-JAP", "JAP", "Used"),
    ("MARIO & YOSHI yoshi's egg - Nintendo game boy NTSC jp japan color GBA", "JAP", "Used"),
    ("Nintendo Famicom - Super Mario Bros - JAP", "JAP", "Used"),
    ("RARE ! Super Mario Bros HANGTAB - USA NTSC - NES Nintendo", "NTSC-U", "Used"),
    ("Super Mario World 2 ~ Yoshi's Island ~ SUPER NES", None, "Used"), # No region explicit
    ("Super Mario Bros . - Nintendo NES Cartouche Original FAH-1", "PAL", "Used"),
    ("Boîte Vide - Super Mario Bros - Nintendo NES", None, "BOX_ONLY"),
    ("Super Mario bros NINTENDO NES version NOE", "PAL", "Used"), # NOE = Nintendo of Europe (Germany)
    ("SUPER MARIO BROS 3 NINTENDO NES", None, "Used"),
    ("Super Mario Bros sur Nintendo NES !!!!", None, "Used"),
    ("Super Mario Bros 3 - Nintendo NES - Complet - Pal FRA", "PAL", "Used"),
    ("Boite NES / Box : Super Mario Bros. 3 [FAH]", "PAL", "BOX_ONLY"),
    ("Boite NES / Box : Super Mario Bros. [FAH]", "PAL", "BOX_ONLY"),
    ("notice super mario bros 2 nintendo nes tresbon etat", None, "MANUAL_ONLY"),
    ("Super Mario Bros. + Duck Hunt Version US * NTSC* Bon état Jeux Nintendo NES", "NTSC-U", "Used"),
    ("[NES] SUPER MARIO BROS. 3 (PAL ITA)", "PAL", "Used"),
    ("Nintendo NES - Super Mario Bros 2 - Notice / Manual - FAH", "PAL", "MANUAL_ONLY"),
    ("Nintendo NES Super Mario Bros. FRA Bon état", "PAL", "Used")
]

print(f"{'TITLE':<80} | {'REG (Exp)':<5} | {'REG (Act)':<5} | {'COND (Exp)':<10} | {'COND (Act)':<10}")
print("-" * 130)

regex_issue_count = 0

for title, expected_reg, expected_cond in examples:
    detected_reg = ListingClassifier.detect_region(title)
    detected_cond = ListingClassifier.detect_condition(title)
    
    # Adjust expected condition based on my simplified test data vs real logic
    # The snippet above is a mix of guessing expectations.
    
    reg_match = "OK" if detected_reg == expected_reg else "FAIL"
    cond_match = "OK" if detected_cond == expected_cond else "FAIL"
    
    if reg_match == "FAIL" or cond_match == "FAIL":
        regex_issue_count += 1
        
    print(f"{title[:80]:<80} | {str(expected_reg):<5} | {str(detected_reg):<5} | {expected_cond:<10} | {detected_cond:<10}")

print(f"\nTotal Issues: {regex_issue_count}")
