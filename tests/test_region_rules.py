
import sys
import os
import unittest

# Ensure backend path is in sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.services.listing_classifier import ListingClassifier

class TestRegionRules(unittest.TestCase):
    """
    Strict regression tests for Region Logic based on User Requirements.
    Rule:
    - Console Name (no region) -> US/NTSC
    - 'PAL' in Console Name -> PAL
    - 'JP'/'Japan' specific consoles -> JP
    """

    def test_generic_console_is_ntsc(self):
        """
        FAIL if 'Playstation 5' is NOT detected as NTSC.
        User Rule: "le sans rien c US, CA"
        """
        consoles = [
            "Playstation 5",
            "Playstation 4",
            "Nintendo Switch",
            "GameBoy",
            "Xbox Series X"
        ]
        for c in consoles:
            region = ListingClassifier.detect_region(c, "Some Game")
            self.assertEqual(region, "NTSC", f"Console '{c}' should be NTSC, got {region}")

    def test_pal_console_is_pal(self):
        """
        FAIL if 'PAL Playstation 5' is NOT detected as PAL.
        User Rule: "pal c EU, UK"
        """
        consoles = [
            "PAL Playstation 5",
            "PAL Nintendo Switch",
            "Super Nintendo (PAL)",
            "PAL GameBoy"
        ]
        for c in consoles:
            region = ListingClassifier.detect_region(c, "Some Game")
            self.assertEqual(region, "PAL", f"Console '{c}' should be PAL, got {region}")

    def test_jp_console_is_jp(self):
        """
        FAIL if JP specific consoles or markers are NOT detected as JP.
        User Rule: "jp c japon"
        """
        consoles = [
            "Famicom",
            "Super Famicom", 
            "PC Engine",
            "WonderSwan"
        ]
        for c in consoles:
            region = ListingClassifier.detect_region(c, "Some Game")
            self.assertEqual(region, "JP", f"Console '{c}' should be JP, got {region}")

    def test_product_marker_override(self):
        """
        Product text [PAL] or [JP] should override console default?
        Actually, the user said 'sur les jeux sans pal...'.
        If the product has [PAL], it's a PAL game.
        """
        # [PAL] marker on generic console -> PAL
        region = ListingClassifier.detect_region("Playstation 5", "My Game [PAL]")
        self.assertEqual(region, "PAL")

        # [JP] marker on generic console -> JP
        region = ListingClassifier.detect_region("Playstation 5", "My Game [JP]")
        self.assertEqual(region, "JP")

if __name__ == '__main__':
    unittest.main()
