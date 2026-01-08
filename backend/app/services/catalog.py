from sqlalchemy.orm import Session
from app.models.product import Product as ProductModel
from app.schemas.product import Product as ProductSchema

class CatalogService:
    @staticmethod
    def search_grouped(db: Session, query: str, limit: int = 50) -> dict:
        """
        Returns search results grouped by Console Name/Region.
        Prioritizes Games over Accessories.
        MOVED from app/routers/products.py
        """
        if not query or len(query) < 2:
            return {}
            
        # 1. Fetch raw matches
        sql_query = db.query(ProductModel).filter(ProductModel.product_name.ilike(f"%{query}%"))
        
        # 2. Sort Logic (Memory-based for complex grouping vs SQL)
        # Ideally SQL, but for grouping we need to fetch enough then bucket.
        raw_results = sql_query.limit(limit * 2).all() # Fetch more to sort
        
        grouped = {}
        
        # Helpers
        def get_region(p):
            name = p.console_name or ""
            p_name = p.product_name or ""
            if "PAL" in name or "PAL" in p_name: return "EU (PAL)"
            if "Japan" in name or "JP" in name or "Famicom" in name or ("Saturn" in name and "JP" in p_name): return "JP"
            return "US (NTSC)"

        # Sort Priority: 
        # 1. Exact Name Match
        # 2. Games vs Accessories (Amiibo/Controller down)
        # 3. Region Preference (US/EU > JP) ?? - Let's just group first.
        
        for p in raw_results:
            # Filter Amiibo/Accessories to bottom unless query explicitly asks?
            # For now, separate 'Games' vs 'Others'
            
            region = get_region(p)
            clean_console = p.console_name.replace("PAL ", "").replace("JP ", "") if p.console_name else "Unknown"
            
            # Group Key: "Nintendo 64"
            key = clean_console
            
            if key not in grouped:
                grouped[key] = []
                
            p_dict = ProductSchema.from_orm(p).dict()
            p_dict['region'] = region # augment schema
            
            grouped[key].append(p_dict)
            
        # Sort within groups?
        # Sort keys?
        return grouped
