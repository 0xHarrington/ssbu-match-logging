from flask_sqlalchemy import SQLAlchemy
from models.user import db


class Game(db.Model):
    __tablename__ = "games"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    datetime = db.Column(db.DateTime, nullable=False)
    character = db.Column(db.String(80), nullable=False)
    opponent_character = db.Column(db.String(80), nullable=False)
    winner = db.Column(db.String(80), nullable=False)
    stocks_remaining = db.Column(db.Integer)
    stage = db.Column(db.String(80), nullable=False)
    timestamp = db.Column(db.Float, nullable=False)
