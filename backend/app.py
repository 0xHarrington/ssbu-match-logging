# app.py
from flask import Flask, request, jsonify
from datetime import datetime, timezone
import pandas as pd
import os
import logging
from typing import Dict, Any, Optional
import json
import pytz

app = Flask(__name__)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class GameDataManager:
    """Manages game data storage and retrieval using pandas."""

    def __init__(self, csv_path: str):
        self.csv_path = csv_path
        self.characters_path = "characters.json"
        self.columns = [
            "datetime",
            "shayne_character",
            "matt_character",
            "winner",
            "stocks_remaining",
            "stage",
            "timestamp",  # Unix timestamp for easier time-based operations
        ]
        self._ensure_csv_exists()
        self._ensure_characters_file_exists()

    def _ensure_csv_exists(self) -> None:
        """Create CSV file with headers if it doesn't exist."""
        if not os.path.exists(self.csv_path):
            logger.info(f"Creating new CSV file at {self.csv_path}")
            pd.DataFrame(columns=self.columns).to_csv(self.csv_path, index=False)

    def _ensure_characters_file_exists(self):
        """Ensure the characters file exists with default characters."""
        if not os.path.exists(self.characters_path):
            default_characters = [
                # Original 8
                "Mario",
                "Donkey Kong",
                "Link",
                "Samus",
                "Dark Samus",
                "Yoshi",
                "Kirby",
                "Fox",
                "Pikachu",
                # Remaining Base Roster
                "Luigi",
                "Ness",
                "Captain Falcon",
                "Jigglypuff",
                "Peach",
                "Daisy",
                "Bowser",
                "Ice Climbers",
                "Sheik",
                "Zelda",
                "Dr. Mario",
                "Pichu",
                "Falco",
                "Marth",
                "Lucina",
                "Young Link",
                "Ganondorf",
                "Mewtwo",
                "Roy",
                "Chrom",
                "Mr. Game & Watch",
                "Meta Knight",
                "Pit",
                "Dark Pit",
                "Zero Suit Samus",
                "Wario",
                "Snake",
                "Ike",
                "Pokemon Trainer",
                "Diddy Kong",
                "Lucas",
                "Sonic",
                "King Dedede",
                "Olimar",
                "Lucario",
                "R.O.B.",
                "Toon Link",
                "Wolf",
                "Villager",
                "Mega Man",
                "Wii Fit Trainer",
                "Rosalina & Luma",
                "Little Mac",
                "Greninja",
                "Mii Brawler",
                "Mii Swordfighter",
                "Mii Gunner",
                "Palutena",
                "Pac-Man",
                "Robin",
                "Shulk",
                "Bowser Jr.",
                "Duck Hunt",
                "Ryu",
                "Ken",
                "Cloud",
                "Corrin",
                "Bayonetta",
                "Inkling",
                "Ridley",
                "Simon",
                "Richter",
                "King K. Rool",
                "Isabelle",
                "Incineroar",
                # Fighters Pass Vol. 1
                "Piranha Plant",
                "Joker",
                "Hero",
                "Banjo & Kazooie",
                "Terry",
                "Byleth",
                # Fighters Pass Vol. 2
                "Min Min",
                "Steve",
                "Sephiroth",
                "Pyra/Mythra",
                "Kazuya",
                "Sora",
            ]
            with open(self.characters_path, "w") as f:
                json.dump(default_characters, f)

    def _load_data(self) -> pd.DataFrame:
        """Load the current CSV data into a pandas DataFrame."""
        try:
            df = pd.read_csv(self.csv_path)
            # Convert datetime column to datetime type
            df["datetime"] = pd.to_datetime(df["datetime"])
            # Handle if there are any games with no stages
            df["stage"] = df["stage"].fillna("No Stage")
            return df
        except pd.errors.EmptyDataError:
            return pd.DataFrame(columns=self.columns)
        except Exception as e:
            logger.error(f"Error loading data: {str(e)}")
            raise

    def add_game(self, game_data: Dict[str, Any]) -> bool:
        """
        Add a new game record to the CSV file.

        Args:
            game_data: Dictionary containing game information

        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Log the incoming game data
            logger.info(f"Received game data: {game_data}")

            # Validate required fields
            required_fields = ["shayneCharacter", "mattCharacter", "winner", "stage"]
            for field in required_fields:
                if field not in game_data:
                    logger.error(f"Missing required field: {field}")
                    return False
                if not game_data[field]:
                    logger.error(f"Empty value for required field: {field}")
                    return False

            # Additional validation for stage
            stage_value = str(game_data["stage"]).strip()
            if not stage_value:
                logger.error("Stage value is empty after stripping")
                return False

            # Create a new entry with Eastern time
            eastern = pytz.timezone("US/Eastern")
            now = datetime.now(eastern)
            new_game = {
                "datetime": now.strftime("%Y-%m-%d %H:%M:%S"),
                "shayne_character": game_data["shayneCharacter"],
                "matt_character": game_data["mattCharacter"],
                "winner": game_data["winner"],
                "stocks_remaining": game_data["stocksRemaining"] or None,
                "stage": stage_value,
                "timestamp": now.timestamp(),
            }

            # Log the processed game data
            logger.info(f"Processed game data: {new_game}")

            # Load existing data
            df = self._load_data()

            # Append new game
            df = pd.concat([df, pd.DataFrame([new_game])], ignore_index=True)

            # Save updated DataFrame
            df.to_csv(self.csv_path, index=False)

            logger.info(f"Successfully logged game: {new_game}")
            return True

        except Exception as e:
            logger.error(f"Error adding game: {str(e)}")
            logger.error(f"Game data that caused error: {game_data}")
            return False

    def get_recent_games(self, n: int = 5) -> pd.DataFrame:
        """Get the n most recent games."""
        df = self._load_data()
        return df.sort_values("timestamp", ascending=False).head(n)

    def get_stats(self) -> Dict[str, Any]:
        """Calculate and return basic statistics about the games."""
        df = self._load_data()
        if len(df) == 0:
            return {
                "total_games": 0,
                "shayne_wins": 0,
                "matt_wins": 0,
                "shayne_win_rate": 0,
                "matt_win_rate": 0,
                "most_played_shayne": None,
                "most_played_matt": None,
                "last_game_date": None,
                "games_this_week": 0,
                "current_streak": None,
                "monthly_activity": [],
                "top_matchups": [],
            }

        # Basic stats
        stats = {
            "total_games": len(df),
            "shayne_wins": len(df[df["winner"] == "Shayne"]),
            "matt_wins": len(df[df["winner"] == "Matt"]),
            "most_played_shayne": df["shayne_character"].mode().iloc[0]
            if not df["shayne_character"].empty
            else None,
            "most_played_matt": df["matt_character"].mode().iloc[0]
            if not df["matt_character"].empty
            else None,
        }

        # Calculate win rates
        stats["shayne_win_rate"] = (
            round(stats["shayne_wins"] / stats["total_games"] * 100, 1)
            if stats["total_games"] > 0
            else 0
        )
        stats["matt_win_rate"] = (
            round(stats["matt_wins"] / stats["total_games"] * 100, 1)
            if stats["total_games"] > 0
            else 0
        )

        # Character usage stats
        shayne_chars = df["shayne_character"].value_counts().head(5).to_dict()
        matt_chars = df["matt_character"].value_counts().head(5).to_dict()

        stats["top_shayne_chars"] = [
            {"character": char, "games": count} for char, count in shayne_chars.items()
        ]
        stats["top_matt_chars"] = [
            {"character": char, "games": count} for char, count in matt_chars.items()
        ]

        # Average stocks remaining
        stats["avg_stocks_shayne"] = (
            round(df[df["winner"] == "Shayne"]["stocks_remaining"].mean(), 1)
            if len(df[df["winner"] == "Shayne"]) > 0
            else 0
        )
        stats["avg_stocks_matt"] = (
            round(df[df["winner"] == "Matt"]["stocks_remaining"].mean(), 1)
            if len(df[df["winner"] == "Matt"]) > 0
            else 0
        )

        # Recent activity
        stats["last_game_date"] = df["datetime"].max() if not df.empty else None

        # Convert timestamp to float for comparison
        df["timestamp"] = pd.to_numeric(df["timestamp"], errors="coerce")
        one_week_ago = datetime.now().timestamp() - (7 * 24 * 60 * 60)
        stats["games_this_week"] = len(df[df["timestamp"] > one_week_ago])

        # Win streak analysis
        df["date"] = pd.to_datetime(df["datetime"])
        df = df.sort_values("date")

        # Calculate current win streaks
        shayne_streak = 0
        matt_streak = 0
        for winner in reversed(df["winner"]):
            if winner == "Shayne":
                if matt_streak > 0:
                    break
                shayne_streak += 1
            else:
                if shayne_streak > 0:
                    break
                matt_streak += 1

        stats["current_streak"] = (
            {
                "player": "Shayne" if shayne_streak > 0 else "Matt",
                "length": shayne_streak if shayne_streak > 0 else matt_streak,
            }
            if shayne_streak > 0 or matt_streak > 0
            else None
        )

        # Monthly activity
        df["month"] = df["date"].dt.strftime("%Y-%m")
        monthly_games = (
            df.groupby("month").size().tail(6).to_dict()
        )  # Show last 6 months
        stats["monthly_activity"] = [
            {"month": month, "games": count} for month, count in monthly_games.items()
        ]

        # Character matchup stats
        matchup_stats = (
            df.groupby(["shayne_character", "matt_character"])
            .agg({"winner": lambda x: (x == "Shayne").sum(), "datetime": "count"})
            .reset_index()
        )
        matchup_stats.columns = [
            "shayne_character",
            "matt_character",
            "shayne_wins",
            "total_games",
        ]
        matchup_stats["matt_wins"] = (
            matchup_stats["total_games"] - matchup_stats["shayne_wins"]
        )

        # Get top 6 most played matchups
        top_matchups = matchup_stats.nlargest(6, "total_games")
        stats["top_matchups"] = top_matchups.to_dict("records")

        return stats

    def get_character_rankings(self, player: str) -> list:
        """Get character rankings for a player, sorted by usage."""
        df = self._load_data()
        if player == "shayne":
            char_counts = df["shayne_character"].value_counts()
        else:
            char_counts = df["matt_character"].value_counts()
        return char_counts.index.tolist()

    def get_stage_rankings(self) -> list:
        """Get stage rankings sorted by usage."""
        df = self._load_data()
        stage_counts = df["stage"].value_counts()
        return stage_counts.index.tolist()

    def get_characters(self) -> dict:
        """Get the list of characters with their usage data per player."""
        try:
            with open(self.characters_path, "r") as f:
                characters = json.load(f)

            # Get character usage from game data
            df = self._load_data()
            shayne_chars = df["shayne_character"].value_counts().to_dict()
            matt_chars = df["matt_character"].value_counts().to_dict()

            # Create character usage data structure
            char_data = {"shayne": {}, "matt": {}, "all_characters": characters}

            # Fill in usage data for each character
            for char in characters:
                char_data["shayne"][char] = shayne_chars.get(char, 0)
                char_data["matt"][char] = matt_chars.get(char, 0)

            return char_data
        except Exception as e:
            logger.error(f"Error loading characters: {str(e)}")
            return {"shayne": {}, "matt": {}, "all_characters": []}

    def get_character_win_rates(self) -> Dict[str, Any]:
        """Calculate and return character win rates for both players."""
        df = self._load_data()
        if len(df) == 0:
            return {"success": True, "shayne": {}, "matt": {}}

        # Calculate win rates for Shayne's characters
        shayne_chars = {}
        for char in df["shayne_character"].unique():
            char_games = df[df["shayne_character"] == char]
            wins = int(len(char_games[char_games["winner"] == "Shayne"]))
            total = int(len(char_games))
            shayne_chars[str(char)] = {
                "wins": wins,
                "losses": total - wins,
                "total": total,
            }

        # Calculate win rates for Matt's characters
        matt_chars = {}
        for char in df["matt_character"].unique():
            char_games = df[df["matt_character"] == char]
            wins = int(len(char_games[char_games["winner"] == "Matt"]))
            total = int(len(char_games))
            matt_chars[str(char)] = {
                "wins": wins,
                "losses": total - wins,
                "total": total,
            }

        return {"success": True, "shayne": shayne_chars, "matt": matt_chars}


# Initialize data manager
data_manager = GameDataManager("game_results.csv")


@app.route("/log_game", methods=["POST"])
def log_game():
    """Handle game logging POST requests."""
    try:
        data = request.json
        success = data_manager.add_game(data)

        if success:
            # Get updated matchup stats
            df = data_manager._load_data()
            matchup_data = df[
                (df["shayne_character"] == data["shayneCharacter"])
                & (df["matt_character"] == data["mattCharacter"])
            ]

            stats = {
                "total_games": len(matchup_data),
                "shayne_wins": len(matchup_data[matchup_data["winner"] == "Shayne"]),
                "matt_wins": len(matchup_data[matchup_data["winner"] == "Matt"]),
                "recent_games": matchup_data.sort_values("datetime", ascending=False)
                .head(5)
                .to_dict("records"),
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
def get_stats():
    """Return basic statistics about the games."""
    try:
        stats = data_manager.get_stats()
        return jsonify({"success": True, "stats": stats})
    except Exception as e:
        logger.error(f"Error in stats endpoint: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/api/recent_games")
def get_recent_games():
    """Return the most recent games."""
    try:
        df = data_manager.get_recent_games(5)
        # Replace NaN values with None before converting to dict
        df = df.fillna("")
        games = df.to_dict("records")
        return jsonify({"success": True, "games": games})
    except Exception as e:
        logger.error(f"Error getting recent games: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/matchup_stats", methods=["GET"])
def get_matchup_stats():
    """Get historical stats for a specific character matchup."""
    shayne_char = request.args.get("shayne_character")
    matt_char = request.args.get("matt_character")

    if not shayne_char or not matt_char:
        return jsonify({"error": "Both characters must be specified"}), 400

    df = data_manager._load_data()

    # Filter for this specific matchup
    matchup_data = df[
        (df["shayne_character"] == shayne_char) & (df["matt_character"] == matt_char)
    ]

    if len(matchup_data) == 0:
        return jsonify(
            {"total_games": 0, "shayne_wins": 0, "matt_wins": 0, "recent_games": []}
        )

    stats = {
        "total_games": len(matchup_data),
        "shayne_wins": len(matchup_data[matchup_data["winner"] == "Shayne"]),
        "matt_wins": len(matchup_data[matchup_data["winner"] == "Matt"]),
        "recent_games": matchup_data.sort_values("datetime", ascending=False)
        .head(5)
        .to_dict("records"),
    }

    return jsonify(stats)


@app.route("/api/character_win_rates", methods=["GET"])
def get_character_win_rates():
    """Get character win rates for both players."""
    try:
        win_rates = data_manager.get_character_win_rates()
        return jsonify(win_rates)
    except Exception as e:
        logger.error(f"Error getting character win rates: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/api/session_stats")
def session_stats():
    try:
        # Get current date in Eastern time
        eastern = pytz.timezone("US/Eastern")
        now = datetime.now(eastern)
        today_start = eastern.localize(datetime(now.year, now.month, now.day))
        today_end = eastern.localize(datetime(now.year, now.month, now.day, 23, 59, 59))

        # Query games for today
        df = data_manager._load_data()

        # Convert datetime column to datetime objects in Eastern timezone
        df["datetime"] = pd.to_datetime(df["datetime"]).dt.tz_localize("US/Eastern")

        # Filter for today's games
        games = df[(df["datetime"] >= today_start) & (df["datetime"] <= today_end)]

        # Initialize stats
        total_games = len(games)
        shayne_wins = len(games[games["winner"] == "Shayne"])
        matt_wins = len(games[games["winner"] == "Matt"])
        shayne_characters = {}
        matt_characters = {}
        stage_stats = []

        # Calculate stats
        for _, row in games.iterrows():
            shayne_characters[row["shayne_character"]] = (
                shayne_characters.get(row["shayne_character"], 0) + 1
            )
            matt_characters[row["matt_character"]] = (
                matt_characters.get(row["matt_character"], 0) + 1
            )

        # Calculate stage stats
        stage_counts = games["stage"].value_counts()
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
def api_log_game():
    return log_game()


@app.route("/api/characters")
def get_characters():
    """Get character list with usage data."""
    try:
        characters = data_manager.get_characters()
        return jsonify(characters)
    except Exception as e:
        logger.error(f"Error in characters endpoint: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0")
