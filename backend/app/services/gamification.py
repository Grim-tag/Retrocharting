from sqlalchemy.orm import Session
from app.models.user import User

class GamificationService:
    RANKS = [
        {"name": "Loose", "threshold": 0},
        {"name": "CIB", "threshold": 500},
        {"name": "New", "threshold": 1500},
        {"name": "Graded", "threshold": 5000}
    ]

    @staticmethod
    def calculate_rank(xp: int) -> str:
        current_rank = "Loose"
        for rank in GamificationService.RANKS:
            if xp >= rank["threshold"]:
                current_rank = rank["name"]
        return current_rank

    @staticmethod
    def add_xp(user_id: int, amount: int, db: Session):
        """
        Adds XP to user and updates rank if necessary.
        Returns the new total XP and whether a rank up occurred.
        """
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return None

        # Add XP
        old_xp = user.xp or 0
        new_xp = old_xp + amount
        user.xp = new_xp

        # Check Rank
        old_rank = user.rank or "Loose"
        new_rank = GamificationService.calculate_rank(new_xp)

        rank_up = False
        if new_rank != old_rank:
            user.rank = new_rank
            rank_up = True
            # Here we could trigger a notification in the future

        db.commit()
        db.refresh(user)

        return {
            "new_xp": new_xp,
            "new_rank": new_rank,
            "rank_up": rank_up,
            "earned": amount
        }
