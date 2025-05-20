from datetime import datetime
from sqlalchemy.sql import func
from database import db


class Match(db.Model):
    __tablename__ = "matches"

    id = db.Column(db.Integer, primary_key=True)
    player1_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    player2_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    player1_character = db.Column(db.String(50), nullable=False)
    player2_character = db.Column(db.String(50), nullable=False)
    winner_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    stocks_remaining = db.Column(db.Integer)
    stage = db.Column(db.String(50))
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())

    # Additional relationship for the winner
    winner = db.relationship("User", foreign_keys=[winner_id])

    def to_dict(self):
        return {
            "id": self.id,
            "player1": {
                "id": self.player1_id,
                "display_name": self.player1.display_name,
                "character": self.player1_character,
            },
            "player2": {
                "id": self.player2_id,
                "display_name": self.player2.display_name,
                "character": self.player2_character,
            },
            "winner": {"id": self.winner_id, "display_name": self.winner.display_name},
            "stocks_remaining": self.stocks_remaining,
            "stage": self.stage,
            "created_at": self.created_at.isoformat(),
        }

    @classmethod
    def get_recent_matches(cls, limit=10):
        return cls.query.order_by(cls.created_at.desc()).limit(limit).all()

    @classmethod
    def get_matches_for_user(cls, user_id, limit=None):
        query = cls.query.filter(
            db.or_(cls.player1_id == user_id, cls.player2_id == user_id)
        ).order_by(cls.created_at.desc())

        if limit:
            query = query.limit(limit)

        return query.all()
