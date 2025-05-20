from flask_login import UserMixin
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from typing import Optional
from sqlalchemy.sql import func
from database import db


class User(UserMixin, db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    display_name = db.Column(db.String(80), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    is_active = db.Column(db.Boolean, default=True, nullable=False)

    # Relationships
    matches_as_player1 = db.relationship(
        "Match", backref="player1", foreign_keys="Match.player1_id"
    )
    matches_as_player2 = db.relationship(
        "Match", backref="player2", foreign_keys="Match.player2_id"
    )

    def __init__(
        self,
        username: str,
        email: str,
        password: str,
        display_name: Optional[str] = None,
    ):
        self.username = username
        self.email = email.lower()
        self.set_password(password)
        self.display_name = display_name or username

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def __repr__(self) -> str:
        return f"<User {self.username}>"

    @property
    def is_authenticated(self) -> bool:
        return True

    @classmethod
    def get_by_username(cls, username: str) -> Optional["User"]:
        return cls.query.filter_by(username=username).first()

    @classmethod
    def get_by_email(cls, email: str) -> Optional["User"]:
        return cls.query.filter_by(email=email.lower()).first()
