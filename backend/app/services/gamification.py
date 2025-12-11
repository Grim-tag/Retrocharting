from sqlalchemy.orm import Session
from app.models.user import User

# Définition des Rangs et Seuils d'XP
RANKS = [
    {"name": "Loose", "min_xp": 0, "description": "Débutant / Curieux"},
    {"name": "Notice Only", "min_xp": 500, "description": "Utilisateur occasionnel"},
    {"name": "Boxed", "min_xp": 1500, "description": "Collectionneur amateur"},
    {"name": "CIB", "min_xp": 5000, "description": "Collectionneur sérieux"},
    {"name": "Mint", "min_xp": 15000, "description": "Passionné exigeant"},
    {"name": "Factory Sealed", "min_xp": 30000, "description": "Expert / Gros contributeur"},
    {"name": "Graded", "min_xp": 50000, "description": "Légende du site / Top 1%"}
]

XP_ACTIONS = {
    "ADD_ITEM": 10,       # Ajouter un jeu à sa collection
    "ADD_PHOTO_SET": 50,  # Ajouter 3 photos persos à un item (Bonus Qualité)
    "DAILY_LOGIN": 5,     # Connexion quotidienne (implémentation future)
}

def get_rank_for_xp(xp: int):
    """Retourne le rang correspondant à un montant d'XP."""
    current_rank = RANKS[0]
    for rank in RANKS:
        if xp >= rank["min_xp"]:
            current_rank = rank
        else:
            break
    return current_rank

def get_next_rank(xp: int):
    """Retourne le prochain rang et l'XP manquant."""
    for rank in RANKS:
        if xp < rank["min_xp"]:
            return rank, rank["min_xp"] - xp
    return None, 0

def add_xp(db: Session, user: User, amount: int):
    """Ajoute de l'XP à un utilisateur et met à jour son rang si nécessaire."""
    user.xp += amount
    
    new_rank_info = get_rank_for_xp(user.xp)
    if new_rank_info["name"] != user.rank:
        user.rank = new_rank_info["name"]
        # Ici on pourrait ajouter une notification ou un event "Level Up"
    
    db.add(user)
    db.commit()
    return user
