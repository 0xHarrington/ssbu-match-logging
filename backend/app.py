# app.py
from flask import Flask, request, jsonify
from datetime import datetime, timezone
import pandas as pd
import os
import logging
from typing import Dict, Any, Optional
import json
import pytz
from flask_sqlalchemy import SQLAlchemy
from flask_login import (
    LoginManager,
    login_user,
    logout_user,
    login_required,
    current_user,
)
from models.user import User, db
from routes.auth import auth
from models.game import Game

app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "dev")
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get(
    "DATABASE_URL", "postgresql://localhost/ssbu_match_logging"
)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = "auth.login"

app.register_blueprint(auth, url_prefix="/auth")


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@app.route("/log_game", methods=["POST"])
@login_required
def log_game():
    """Handle game logging POST requests."""
    try:
        data = request.json
        eastern = pytz.timezone("US/Eastern")
        now = datetime.now(eastern)
        game = Game(
            user_id=current_user.id,
            datetime=now,
            character=data["shayneCharacter"],
            opponent_character=data["mattCharacter"],
            winner=data["winner"],
            stocks_remaining=data["stocksRemaining"],
            stage=data["stage"],
            timestamp=now.timestamp(),
        )
        db.session.add(game)
        db.session.commit()
        success = True

        if success:
            # Get updated matchup stats
            matchup_data = Game.query.filter_by(
                user_id=current_user.id,
                character=data["shayneCharacter"],
                opponent_character=data["mattCharacter"],
            ).all()

            stats = {
                "total_games": len(matchup_data),
                "shayne_wins": sum(
                    1 for game in matchup_data if game.winner == "Shayne"
                ),
                "matt_wins": sum(1 for game in matchup_data if game.winner == "Matt"),
                "recent_games": [
                    {
                        "datetime": game.datetime,
                        "winner": game.winner,
                        "stocks_remaining": game.stocks_remaining,
                        "stage": game.stage,
                    }
                    for game in sorted(
                        matchup_data, key=lambda x: x.datetime, reverse=True
                    )[:5]
                ],
            }

            return jsonify(
                {"success": True, "message": "Game logged successfully", "stats": stats}
            )
        else:
            return jsonify({"success": False, "message": "Failed to log game"}), 500

    except Exception as e:
        logger.error(f"Error in log_game endpoint: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/api/stats", methods=["GET"])
@login_required
def get_stats():
    """Return basic statistics about the games."""
    try:
        games = Game.query.filter_by(user_id=current_user.id).all()
        total_games = len(games)
        shayne_wins = sum(1 for game in games if game.winner == "Shayne")
        matt_wins = sum(1 for game in games if game.winner == "Matt")
        stats = {
            "total_games": total_games,
            "shayne_wins": shayne_wins,
            "matt_wins": matt_wins,
        }
        return jsonify({"success": True, "stats": stats})
    except Exception as e:
        logger.error(f"Error in stats endpoint: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/api/recent_games")
@login_required
def get_recent_games():
    """Return the most recent games."""
    try:
        games = (
            Game.query.filter_by(user_id=current_user.id)
            .order_by(Game.datetime.desc())
            .limit(5)
            .all()
        )
        games_list = [
            {
                "datetime": game.datetime,
                "character": game.character,
                "opponent_character": game.opponent_character,
                "winner": game.winner,
                "stocks_remaining": game.stocks_remaining,
                "stage": game.stage,
            }
            for game in games
        ]
        return jsonify({"success": True, "games": games_list})
    except Exception as e:
        logger.error(f"Error getting recent games: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/matchup_stats", methods=["GET"])
@login_required
def get_matchup_stats():
    """Get historical stats for a specific character matchup."""
    shayne_char = request.args.get("shayne_character")
    matt_char = request.args.get("matt_character")

    if not shayne_char or not matt_char:
        return jsonify({"error": "Both characters must be specified"}), 400

    matchup_data = Game.query.filter_by(
        user_id=current_user.id, character=shayne_char, opponent_character=matt_char
    ).all()

    if len(matchup_data) == 0:
        return jsonify(
            {"total_games": 0, "shayne_wins": 0, "matt_wins": 0, "recent_games": []}
        )

    stats = {
        "total_games": len(matchup_data),
        "shayne_wins": sum(1 for game in matchup_data if game.winner == "Shayne"),
        "matt_wins": sum(1 for game in matchup_data if game.winner == "Matt"),
        "recent_games": [
            {
                "datetime": game.datetime,
                "winner": game.winner,
                "stocks_remaining": game.stocks_remaining,
                "stage": game.stage,
            }
            for game in sorted(matchup_data, key=lambda x: x.datetime, reverse=True)[:5]
        ],
    }

    return jsonify(stats)


@app.route("/api/character_win_rates", methods=["GET"])
@login_required
def get_character_win_rates():
    """Get character win rates for both players."""
    try:
        games = Game.query.filter_by(user_id=current_user.id).all()
        shayne_chars = {}
        matt_chars = {}
        for game in games:
            if game.character not in shayne_chars:
                shayne_chars[game.character] = {"wins": 0, "losses": 0, "total": 0}
            if game.opponent_character not in matt_chars:
                matt_chars[game.opponent_character] = {
                    "wins": 0,
                    "losses": 0,
                    "total": 0,
                }
            shayne_chars[game.character]["total"] += 1
            matt_chars[game.opponent_character]["total"] += 1
            if game.winner == "Shayne":
                shayne_chars[game.character]["wins"] += 1
                matt_chars[game.opponent_character]["losses"] += 1
            else:
                shayne_chars[game.character]["losses"] += 1
                matt_chars[game.opponent_character]["wins"] += 1
        win_rates = {"shayne": shayne_chars, "matt": matt_chars}
        return jsonify(win_rates)
    except Exception as e:
        logger.error(f"Error getting character win rates: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/api/session_stats")
@login_required
def session_stats():
    try:
        # Get current date in Eastern time
        eastern = pytz.timezone("US/Eastern")
        now = datetime.now(eastern)
        today_start = eastern.localize(datetime(now.year, now.month, now.day))
        today_end = eastern.localize(datetime(now.year, now.month, now.day, 23, 59, 59))

        # Query games for today
        games = Game.query.filter(
            Game.user_id == current_user.id,
            Game.datetime >= today_start,
            Game.datetime <= today_end,
        ).all()

        # Initialize stats
        total_games = len(games)
        shayne_wins = sum(1 for game in games if game.winner == "Shayne")
        matt_wins = sum(1 for game in games if game.winner == "Matt")
        shayne_characters = {}
        matt_characters = {}
        stage_stats = []

        # Calculate stats
        for game in games:
            shayne_characters[game.character] = (
                shayne_characters.get(game.character, 0) + 1
            )
            matt_characters[game.opponent_character] = (
                matt_characters.get(game.opponent_character, 0) + 1
            )

        # Calculate stage stats
        stage_counts = {}
        for game in games:
            stage_counts[game.stage] = stage_counts.get(game.stage, 0) + 1
        stage_stats = [
            {"stage": stage, "count": count} for stage, count in stage_counts.items()
        ]

        return jsonify(
            {
                "success": True,
                "total_games": total_games,
                "shayne_wins": shayne_wins,
                "matt_wins": matt_wins,
                "shayne_characters": shayne_characters,
                "matt_characters": matt_characters,
                "stage_stats": stage_stats,
            }
        )

    except Exception as e:
        logger.error(f"Error in session_stats endpoint: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/api/log_game", methods=["POST"])
@login_required
def api_log_game():
    return log_game()


if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=True, host="0.0.0.0")
