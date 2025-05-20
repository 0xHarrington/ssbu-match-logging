# app.py
from flask import Flask, request, jsonify
from flask_login import login_required, current_user, login_user, logout_user
from datetime import datetime, timezone
import pandas as pd
import os
import logging
from typing import Dict, Any, Optional
import json
import pytz

from database import init_db, db
from services.auth import AuthService, login_manager
from models.user import User
from models.match import Match

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def create_app():
    app = Flask(__name__)

    # Configuration
    app.config["SECRET_KEY"] = os.environ.get(
        "SECRET_KEY", "dev-key-change-in-production"
    )
    app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get(
        "DATABASE_URL", "postgresql://localhost/ssbu_match_logging"
    )
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # Initialize extensions
    init_db(app)
    login_manager.init_app(app)
    login_manager.login_view = "auth.login"

    return app


app = create_app()


# Authentication routes
@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json()

    if not all(k in data for k in ["username", "email", "password"]):
        return jsonify({"error": "Missing required fields"}), 400

    user, error = AuthService.register(
        username=data["username"],
        email=data["email"],
        password=data["password"],
        display_name=data.get("display_name"),
    )

    if error:
        return jsonify({"error": error}), 400

    login_user(user)
    return jsonify(
        {
            "message": "Registration successful",
            "user": {
                "id": user.id,
                "username": user.username,
                "display_name": user.display_name,
            },
        }
    )


@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json()

    if not all(k in data for k in ["username_or_email", "password"]):
        return jsonify({"error": "Missing required fields"}), 400

    user, error = AuthService.login(
        username_or_email=data["username_or_email"], password=data["password"]
    )

    if error:
        return jsonify({"error": error}), 401

    login_user(user)
    return jsonify(
        {
            "message": "Login successful",
            "user": {
                "id": user.id,
                "username": user.username,
                "display_name": user.display_name,
            },
        }
    )


@app.route("/api/auth/logout", methods=["POST"])
@login_required
def logout():
    logout_user()
    return jsonify({"message": "Logout successful"})


@app.route("/api/auth/me", methods=["GET"])
@login_required
def get_current_user():
    return jsonify(
        {
            "user": {
                "id": current_user.id,
                "username": current_user.username,
                "display_name": current_user.display_name,
                "email": current_user.email,
            }
        }
    )


# Match routes
@app.route("/api/matches", methods=["POST"])
@login_required
def log_match():
    data = request.get_json()

    required_fields = [
        "player2_id",
        "player1_character",
        "player2_character",
        "winner_id",
        "stage",
    ]
    if not all(k in data for k in required_fields):
        return jsonify({"error": "Missing required fields"}), 400

    try:
        match = Match(
            player1_id=current_user.id,
            player2_id=data["player2_id"],
            player1_character=data["player1_character"],
            player2_character=data["player2_character"],
            winner_id=data["winner_id"],
            stocks_remaining=data.get("stocks_remaining"),
            stage=data["stage"],
        )

        db.session.add(match)
        db.session.commit()

        return jsonify(
            {"message": "Match logged successfully", "match": match.to_dict()}
        )

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error logging match: {str(e)}")
        return jsonify({"error": "Failed to log match"}), 500


@app.route("/api/matches/recent", methods=["GET"])
@login_required
def get_recent_matches():
    limit = request.args.get("limit", 10, type=int)
    matches = Match.get_matches_for_user(current_user.id, limit=limit)
    return jsonify({"matches": [match.to_dict() for match in matches]})


@app.route("/api/matches/stats", methods=["GET"])
@login_required
def get_user_stats():
    # Get all matches for the current user
    matches = Match.get_matches_for_user(current_user.id)

    total_matches = len(matches)
    wins = sum(1 for match in matches if match.winner_id == current_user.id)

    # Calculate character usage and win rates
    character_stats = {}
    for match in matches:
        character = (
            match.player1_character
            if match.player1_id == current_user.id
            else match.player2_character
        )

        if character not in character_stats:
            character_stats[character] = {"uses": 0, "wins": 0}

        character_stats[character]["uses"] += 1
        if match.winner_id == current_user.id:
            character_stats[character]["wins"] += 1

    # Calculate win rates for each character
    for stats in character_stats.values():
        stats["win_rate"] = (
            (stats["wins"] / stats["uses"]) * 100 if stats["uses"] > 0 else 0
        )

    return jsonify(
        {
            "total_matches": total_matches,
            "wins": wins,
            "win_rate": (wins / total_matches) * 100 if total_matches > 0 else 0,
            "character_stats": character_stats,
        }
    )


if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=True)
