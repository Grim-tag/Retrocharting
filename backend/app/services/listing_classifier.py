
import re

class ListingClassifier:
    """
    Central logic for:
    1. Detecting Region from Console Name (PAL vs NTSC vs JP)
    2. Cleaning Search Queries (Removing 'PAL' to get broad results)
    3. Matching Marketplaces (PAL -> amazon.fr, NTSC -> amazon.com)
    """

    @staticmethod
    def detect_region(console_name: str) -> str:
        """
        Returns: 'PAL', 'NTSC-U', 'JP', or 'Unknown'
        """
        c = console_name.upper()
        
        # 1. Explicit PAL
        if c.startswith("PAL "):
            return "PAL"
            
        # 2. Japan Specifics (Based on analysis)
        jp_keywords = ["FAMICOM", "PC ENGINE", "SATURN", "WONDERSWAN", "NEO GEO", "PC-FX"]
        # Excludes "Super Nintendo" (US) vs "Super Famicom" (JP)
        if any(k in c for k in jp_keywords):
            return "JP"
            
        # 3. USA Specifics
        us_keywords = ["GENESIS", "TURBOGRAFX", "NINTENDO ENTERTAINMENT SYSTEM", "SUPER NINTENDO"]
        if any(k in c for k in us_keywords):
            return "NTSC-U"
            
        # 4. Default Fallback
        # Return None for ambiguous titles so the caller (PricingService) can decide 
        # based on context (e.g. if searching on Amazon FR, assume PAL).
        return None

    @staticmethod
    def get_marketplaces(region: str):
        """
        Returns config for Amazon and eBay based on region.
        """
        if region == "PAL":
            return {
                "amazon_domain": "amazon.fr",
                "ebay_marketplace_id": "EBAY_FR",
                "ebay_search_filter": None # Search local
            }
        elif region == "JP":
            return {
                "amazon_domain": "amazon.co.jp",
                "ebay_marketplace_id": "EBAY_US", # eBay JP API doesn't allow buying? Use Global.
                "ebay_search_filter": "Japan" # Custom logic to append "Japan" or filter location
            }
        else: # NTSC-U
            return {
                "amazon_domain": "amazon.com",
                "ebay_marketplace_id": "EBAY_US",
                "ebay_search_filter": None
            }

    @staticmethod
    def clean_search_query(product_name: str, console_name: str) -> str:
        """
        Removes 'PAL', 'NTSC', 'JP' and other region noise to create a clean search query.
        The region filtering is now handled by selecting the correct Marketplace/Domain.
        """
        # 1. Remove Bracketed/Parenthesis info (e.g. [PAL], (Japan))
        clean_prod = re.sub(r'\[.*?\]', '', product_name)
        clean_prod = re.sub(r'\(.*?\)', '', clean_prod)
        
        # 2. Remove specific keywords (Case Insensitive)
        # We replace with space to avoid merging words, then strip later
        keywords = ['PAL', 'NTSC', 'NTSC-U', 'NTSC-J', 'JAP', 'JAPAN', 'USA', 'UNK', 'IMPORT']
        
        flags = re.IGNORECASE
        for kw in keywords:
            # Word boundary to avoid replacing inside words
            clean_prod = re.sub(r'\b' + re.escape(kw) + r'\b', '', clean_prod, flags=flags)
            
        # 3. Clean Console Name
        # Remove PAL/JP/NTSC prefixes from console name if present
        clean_console = console_name
        for kw in keywords:
             clean_console = re.sub(r'\b' + re.escape(kw) + r'\b', '', clean_console, flags=flags)

        # 4. Final Cleanup
        # Remove double spaces
        query = f"{clean_prod} {clean_console}"
        query = re.sub(r'\s+', ' ', query).strip()
        
        return query

    @staticmethod
    def detect_condition(title: str) -> str:
        """
        Refined condition detection for Listings.
        Returns: 'LOOSE', 'CIB', 'NEW', 'BOX_ONLY', 'MANUAL_ONLY'
        """
        t = title.upper()
        if 'BOX' in t and 'ONLY' in t: return 'BOX_ONLY'
        if 'MANUAL' in t and 'ONLY' in t: return 'MANUAL_ONLY'
        if 'Notice Seule' in title or 'Boite Vide' in title: return 'MANUAL_ONLY' # FR keywords
        
        if 'SEALED' in t or 'NEW' in t or 'NEUF' in t: return 'NEW'
        if 'CIB' in t or 'COMPLETE' in t or 'COMPLET' in t: return 'CIB'
        
        return 'LOOSE'

    @staticmethod
    def clean_query(product_name: str, console_name: str) -> str:
        return ListingClassifier.clean_search_query(product_name, console_name)

    @staticmethod
    def is_relevant(title: str, keyword: str) -> bool:
        """
        Naive relevance check: Does the title contain the keyword?
        """
        if not keyword: return True
        return keyword.lower() in title.lower()

    @staticmethod
    def is_junk(title: str, product_name: str, console_name: str, genre: str) -> bool:
        """
        Filters out common junk (Protectors, Arts, Parts)
        """
        t = title.lower()
        junk_terms = ['box protector', 'acrylic case', 'dust cover', 'replacement case', 'artwork only', 'notice seule']
        if any(j in t for j in junk_terms):
            return True
        return False

    @staticmethod
    def is_region_compatible(item_region: str, target_region: str) -> bool:
        """
        Checks if item region is compatible with target.
        """
        if item_region == target_region: return True
        if target_region == 'NTSC-U' and item_region not in ['PAL', 'JP']: return True # Loose/Unknown assumed NTSC?
        return False
        
classifier = ListingClassifier()
