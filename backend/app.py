# app.py
from flask import Flask, request, jsonify
from datetime import datetime
import pandas as pd
import os
import logging
from typing import Dict, Any, Optional
import json
import pytz
import shutil

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
            "session_id",  # Session identifier
        ]
        self.session_gap_hours = 4  # Hours of inactivity before starting new session
        self._ensure_csv_exists()
        self._ensure_characters_file_exists()
        self._create_session_backup()

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

    def _create_session_backup(self) -> None:
        """Create a timestamped backup of the CSV file once per application session."""
        try:
            # Only create backup if CSV file exists and has content
            if not os.path.exists(self.csv_path):
                logger.info("CSV file does not exist yet, skipping backup")
                return

            # Check if file has content (more than just headers)
            try:
                df = pd.read_csv(self.csv_path)
                if len(df) == 0:
                    logger.info("CSV file is empty, skipping backup")
                    return
            except Exception as e:
                logger.warning(f"Could not read CSV for backup check: {str(e)}")
                return

            # Create backups directory if it doesn't exist
            backup_dir = "backups"
            if not os.path.exists(backup_dir):
                os.makedirs(backup_dir)
                logger.info(f"Created backup directory: {backup_dir}")

            # Generate timestamped backup filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_filename = f"game_results_backup_{timestamp}.csv"
            backup_path = os.path.join(backup_dir, backup_filename)

            # Copy the CSV file to backup location
            shutil.copy2(self.csv_path, backup_path)
            logger.info(f"Session backup created: {backup_path}")

        except Exception as e:
            logger.error(f"Error creating session backup: {str(e)}")
            # Don't raise - backup failure shouldn't prevent app from starting

    def _load_data(self) -> pd.DataFrame:
        """Load the current CSV data into a pandas DataFrame."""
        try:
            df = pd.read_csv(self.csv_path)
            # Convert datetime column to datetime type
            df["datetime"] = pd.to_datetime(df["datetime"])
            # Ensure timestamp is numeric
            df["timestamp"] = pd.to_numeric(df["timestamp"], errors="coerce")
            # Handle if there are any games with no stages
            df["stage"] = df["stage"].fillna("No Stage")

            # Clean up character names - remove any NaN or empty values
            df["shayne_character"] = df["shayne_character"].fillna("").astype(str)
            df["matt_character"] = df["matt_character"].fillna("").astype(str)

            # Filter out rows with missing character data
            df = df[
                (df["shayne_character"] != "")
                & (df["matt_character"] != "")
                & (df["shayne_character"] != "nan")
                & (df["matt_character"] != "nan")
            ]

            # Handle session_id column - add if missing
            if "session_id" not in df.columns:
                df["session_id"] = None

            return df
        except pd.errors.EmptyDataError:
            return pd.DataFrame(columns=self.columns)
        except Exception as e:
            logger.error(f"Error loading data: {str(e)}")
            raise

    def _generate_session_id(self, game_datetime: datetime) -> str:
        """Generate a session ID based on the game datetime."""
        return game_datetime.strftime("%Y-%m-%d-%H")

    def _get_or_create_session_id(self, game_timestamp: float) -> str:
        """
        Determine the session ID for a new game.
        Creates a new session if more than session_gap_hours have passed since last game.
        """
        try:
            df = self._load_data()

            if len(df) == 0:
                # First game ever - create new session
                game_time = datetime.fromtimestamp(game_timestamp)
                return self._generate_session_id(game_time)

            # Get the most recent game
            df = df.sort_values("timestamp", ascending=False)
            last_game = df.iloc[0]
            last_timestamp = float(last_game["timestamp"])
            last_session_id = last_game.get("session_id")

            # Calculate time gap
            time_gap_hours = (game_timestamp - last_timestamp) / 3600

            if time_gap_hours > self.session_gap_hours:
                # Start new session
                game_time = datetime.fromtimestamp(game_timestamp)
                new_session_id = self._generate_session_id(game_time)
                logger.info(
                    f"Starting new session: {new_session_id} (gap: {time_gap_hours:.1f}h)"
                )
                return new_session_id
            else:
                # Continue current session
                if last_session_id and pd.notna(last_session_id):
                    return str(last_session_id)
                else:
                    # Last game doesn't have session_id, create one based on its time
                    last_game_time = datetime.fromtimestamp(last_timestamp)
                    return self._generate_session_id(last_game_time)

        except Exception as e:
            logger.error(f"Error determining session ID: {str(e)}")
            # Fallback to creating new session
            game_time = datetime.fromtimestamp(game_timestamp)
            return self._generate_session_id(game_time)

    def get_sessions(self) -> list:
        """Get a list of all sessions with summary statistics."""
        try:
            df = self._load_data()

            if len(df) == 0:
                return []

            # Ensure all games have session IDs
            df = self._assign_missing_session_ids(df)

            # Save session IDs back to CSV if any were assigned
            if df["session_id"].notna().any():
                self._save_session_ids(df)

            # Group by session
            sessions = []
            for session_id in df["session_id"].unique():
                if pd.isna(session_id):
                    continue

                session_games = df[df["session_id"] == session_id].sort_values(
                    "datetime"
                )

                if len(session_games) == 0:
                    continue

                start_time = session_games.iloc[0]["datetime"]
                end_time = session_games.iloc[-1]["datetime"]
                duration_minutes = int((end_time - start_time).total_seconds() / 60)

                shayne_wins = len(session_games[session_games["winner"] == "Shayne"])
                matt_wins = len(session_games[session_games["winner"] == "Matt"])

                sessions.append(
                    {
                        "session_id": str(session_id),
                        "start_time": start_time.strftime("%Y-%m-%d %H:%M:%S"),
                        "end_time": end_time.strftime("%Y-%m-%d %H:%M:%S"),
                        "total_games": len(session_games),
                        "shayne_wins": int(shayne_wins),
                        "matt_wins": int(matt_wins),
                        "duration_minutes": duration_minutes,
                    }
                )

            # Sort by start time, most recent first
            sessions.sort(key=lambda x: x["start_time"], reverse=True)
            return sessions

        except Exception as e:
            logger.error(f"Error getting sessions: {str(e)}")
            return []

    def _save_session_ids(self, df: pd.DataFrame) -> None:
        """Save the dataframe with session IDs back to CSV."""
        try:
            # Ensure the column order matches self.columns
            columns_to_save = [col for col in self.columns if col in df.columns]
            df[columns_to_save].to_csv(self.csv_path, index=False)
            logger.info("Session IDs saved to CSV")
        except Exception as e:
            logger.error(f"Error saving session IDs: {str(e)}")

    def _assign_missing_session_ids(self, df: pd.DataFrame) -> pd.DataFrame:
        """Assign session IDs to any games that don't have them."""
        if len(df) == 0:
            return df

        # Ensure timestamp is numeric
        df["timestamp"] = pd.to_numeric(df["timestamp"], errors="coerce")
        df = df.sort_values("timestamp")

        current_session_id = None
        last_timestamp = None

        for idx, row in df.iterrows():
            if pd.notna(row.get("session_id")):
                current_session_id = row["session_id"]
                last_timestamp = float(row["timestamp"])
                continue

            timestamp = float(row["timestamp"])

            if last_timestamp is None:
                # First game
                game_time = datetime.fromtimestamp(timestamp)
                current_session_id = self._generate_session_id(game_time)
            else:
                # Check time gap
                time_gap_hours = (timestamp - last_timestamp) / 3600
                if time_gap_hours > self.session_gap_hours:
                    # New session
                    game_time = datetime.fromtimestamp(timestamp)
                    current_session_id = self._generate_session_id(game_time)

            df.at[idx, "session_id"] = current_session_id
            last_timestamp = timestamp

        return df

    def get_session_stats(self, session_id: str) -> Dict[str, Any]:
        """Get detailed statistics for a specific session."""
        try:
            df = self._load_data()

            if len(df) == 0:
                return {"success": False, "message": "No data available"}

            # Ensure all games have session IDs
            df = self._assign_missing_session_ids(df)

            # Filter for specific session
            session_games = df[df["session_id"] == session_id]

            if len(session_games) == 0:
                return {"success": False, "message": f"Session {session_id} not found"}

            # Calculate stats (same as session_stats endpoint)
            total_games = len(session_games)
            shayne_wins = len(session_games[session_games["winner"] == "Shayne"])
            matt_wins = len(session_games[session_games["winner"] == "Matt"])

            shayne_characters = {}
            matt_characters = {}

            for _, row in session_games.iterrows():
                shayne_characters[row["shayne_character"]] = (
                    shayne_characters.get(row["shayne_character"], 0) + 1
                )
                matt_characters[row["matt_character"]] = (
                    matt_characters.get(row["matt_character"], 0) + 1
                )

            # Stage stats
            stage_counts = session_games["stage"].value_counts()
            stage_stats = [
                {"stage": stage, "count": int(count)}
                for stage, count in stage_counts.items()
            ]

            # Matchup stats
            matchup_stats = []
            if len(session_games) > 0:
                matchup_counts = (
                    session_games.groupby(["shayne_character", "matt_character"])
                    .agg(
                        {"winner": lambda x: (x == "Shayne").sum(), "datetime": "count"}
                    )
                    .reset_index()
                )
                matchup_counts.columns = [
                    "shayne_character",
                    "matt_character",
                    "shayne_wins",
                    "total_games",
                ]
                matchup_counts["matt_wins"] = (
                    matchup_counts["total_games"] - matchup_counts["shayne_wins"]
                )
                matchup_stats = matchup_counts.to_dict("records")

            # Session metadata
            start_time = session_games.iloc[0]["datetime"]
            end_time = session_games.iloc[-1]["datetime"]

            return {
                "success": True,
                "session_id": session_id,
                "start_time": start_time.strftime("%Y-%m-%d %H:%M:%S"),
                "end_time": end_time.strftime("%Y-%m-%d %H:%M:%S"),
                "total_games": int(total_games),
                "shayne_wins": int(shayne_wins),
                "matt_wins": int(matt_wins),
                "shayne_characters": shayne_characters,
                "matt_characters": matt_characters,
                "stage_stats": stage_stats,
                "matchup_stats": matchup_stats,
            }

        except Exception as e:
            logger.error(f"Error getting session stats: {str(e)}")
            return {"success": False, "message": str(e)}

    def get_user_win_rate_timeline(self, username: str) -> Dict[str, Any]:
        """
        Get win rate timeline data for a user showing average win rate across 20-game windows.

        Returns:
        - game_numbers: List of game indices (1-100)
        - win_rates: List of win rates for each 20-game window
        - total_games: Total games in dataset

        Each data point represents the win rate across 20 games.
        100 data points cover the last 2000 games (or fewer if not enough games exist).
        """
        try:
            df = self._load_data()

            if len(df) == 0:
                return {"success": False, "message": "No data available", "data": []}

            # Sort by timestamp
            df = df.sort_values("timestamp")

            # Get last 2000 games (or all games if fewer)
            max_games = 2000
            recent_games = df.tail(max_games)

            if len(recent_games) < 20:
                return {
                    "success": False,
                    "message": "Not enough games (need at least 20)",
                    "data": [],
                }

            game_numbers = []
            win_rates = []
            date_ranges = []

            # Calculate win rate for each 20-game window
            num_windows = len(recent_games) // 20

            for i in range(num_windows):
                start_idx = i * 20
                end_idx = start_idx + 20
                window = recent_games.iloc[start_idx:end_idx]

                wins = len(window[window["winner"] == username])
                win_rate = (wins / 20) * 100

                # Get date range for this window
                start_dt = window.iloc[0]["datetime"]
                end_dt = window.iloc[-1]["datetime"]

                # Format dates as mm/dd or mm/dd/yy
                start_year = start_dt.year
                end_year = end_dt.year

                if start_year != end_year:
                    # Different years - include year in both dates
                    start_date = (
                        f"{start_dt.month}/{start_dt.day}/{start_dt.year % 100}"
                    )
                    end_date = f"{end_dt.month}/{end_dt.day}/{end_dt.year % 100}"
                else:
                    # Same year - omit year
                    start_date = f"{start_dt.month}/{start_dt.day}"
                    end_date = f"{end_dt.month}/{end_dt.day}"

                game_numbers.append(i + 1)  # 1-indexed window number
                win_rates.append(round(win_rate, 1))
                date_ranges.append(f"{start_date} to {end_date}")

            return {
                "success": True,
                "data": {
                    "game_numbers": game_numbers,
                    "win_rates": win_rates,
                    "date_ranges": date_ranges,
                },
                "total_games": len(df),
                "windows": num_windows,
            }

        except Exception as e:
            logger.error(f"Error getting win rate timeline: {str(e)}")
            return {"success": False, "message": str(e), "data": []}

    def get_user_heatmap_data(
        self, username: str, character: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get heatmap data for a user showing win rate and game count by day of week and hour.
        Optionally filter by character.

        Args:
            username: The player name
            character: Optional character name to filter by

        Returns a 7x24 grid where each cell contains:
        - day: 0-6 (Sunday-Saturday)
        - hour: 0-23
        - win_rate: percentage (0-100)
        - game_count: number of games played in that slot
        """
        try:
            df = self._load_data()

            if len(df) == 0:
                return {"success": False, "message": "No data available", "data": []}

            # Filter by character if specified
            if character:
                user_char_col = f"{username.lower()}_character"
                df = df[df[user_char_col] == character]

                if len(df) == 0:
                    return {
                        "success": False,
                        "message": f"No games found for {username} playing {character}",
                        "data": [],
                    }

            # Convert datetime and add day of week and hour columns
            df["datetime"] = pd.to_datetime(df["datetime"])
            df["day_of_week"] = df["datetime"].dt.dayofweek  # Monday=0, Sunday=6
            df["day_of_week"] = (
                df["day_of_week"] + 1
            ) % 7  # Convert to Sunday=0, Saturday=6
            df["hour"] = df["datetime"].dt.hour

            # Group by day and hour
            heatmap_data = []

            for day in range(7):  # 0=Sunday, 6=Saturday
                for hour in range(24):  # 0-23
                    # Filter games for this time slot
                    slot_games = df[(df["day_of_week"] == day) & (df["hour"] == hour)]
                    game_count = len(slot_games)

                    if game_count > 0:
                        wins = len(slot_games[slot_games["winner"] == username])
                        win_rate = (wins / game_count) * 100
                    else:
                        win_rate = 0

                    heatmap_data.append(
                        {
                            "hour": hour,
                            "day": day,
                            "win_rate": round(win_rate, 1),
                            "game_count": game_count,
                        }
                    )

            return {
                "success": True,
                "data": heatmap_data,
                "total_games": len(df),
                "filtered_by_character": character,
            }

        except Exception as e:
            logger.error(f"Error getting heatmap data: {str(e)}")
            return {"success": False, "message": str(e), "data": []}

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
            timestamp = now.timestamp()

            # Determine session ID
            session_id = self._get_or_create_session_id(timestamp)

            new_game = {
                "datetime": now.strftime("%Y-%m-%d %H:%M:%S"),
                "shayne_character": game_data["shayneCharacter"],
                "matt_character": game_data["mattCharacter"],
                "winner": game_data["winner"],
                "stocks_remaining": game_data["stocksRemaining"] or None,
                "stage": stage_value,
                "timestamp": timestamp,
                "session_id": session_id,
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
            df.groupby("month").size().sort_index().to_dict()
        )  # Show all months with data, sorted chronologically
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
        # Check if a specific session_id is requested
        session_id = request.args.get("session_id")

        if session_id:
            # Return stats for specific session
            return jsonify(data_manager.get_session_stats(session_id))

        # Otherwise, return current session stats (backward compatible)
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

        # Calculate matchup stats
        matchup_stats = []
        if len(games) > 0:
            matchup_counts = (
                games.groupby(["shayne_character", "matt_character"])
                .agg({"winner": lambda x: (x == "Shayne").sum(), "datetime": "count"})
                .reset_index()
            )
            matchup_counts.columns = [
                "shayne_character",
                "matt_character",
                "shayne_wins",
                "total_games",
            ]
            matchup_counts["matt_wins"] = (
                matchup_counts["total_games"] - matchup_counts["shayne_wins"]
            )
            matchup_stats = matchup_counts.to_dict("records")

        return jsonify(
            {
                "success": True,
                "total_games": total_games,
                "shayne_wins": shayne_wins,
                "matt_wins": matt_wins,
                "shayne_characters": shayne_characters,
                "matt_characters": matt_characters,
                "stage_stats": stage_stats,
                "matchup_stats": matchup_stats,
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


@app.route("/api/characters/<character>/stats")
def get_character_stats(character):
    """Get comprehensive statistics for a specific character across all players."""
    try:
        df = data_manager._load_data()

        if len(df) == 0:
            return jsonify({"success": False, "message": "No data available"})

        # Filter games where this character was played by either player
        character_games = df[
            (df["shayne_character"] == character) | (df["matt_character"] == character)
        ]

        if len(character_games) == 0:
            return jsonify(
                {
                    "success": True,
                    "character": character,
                    "total_games": 0,
                    "global_win_rate": 0,
                    "shayne_stats": {"games": 0, "wins": 0, "win_rate": 0},
                    "matt_stats": {"games": 0, "wins": 0, "win_rate": 0},
                    "best_matchups": [],
                    "worst_matchups": [],
                    "stage_performance": [],
                    "recent_performance": [],
                }
            )

        total_games = len(character_games)

        # Global win rate (when this character is played, how often do they win)
        wins_with_character = len(
            character_games[
                (
                    (character_games["shayne_character"] == character)
                    & (character_games["winner"] == "Shayne")
                )
                | (
                    (character_games["matt_character"] == character)
                    & (character_games["winner"] == "Matt")
                )
            ]
        )
        global_win_rate = (
            (wins_with_character / total_games * 100) if total_games > 0 else 0
        )

        # Per-player stats
        shayne_games = character_games[character_games["shayne_character"] == character]
        shayne_wins = len(shayne_games[shayne_games["winner"] == "Shayne"])
        shayne_stats = {
            "games": len(shayne_games),
            "wins": shayne_wins,
            "win_rate": (shayne_wins / len(shayne_games) * 100)
            if len(shayne_games) > 0
            else 0,
        }

        matt_games = character_games[character_games["matt_character"] == character]
        matt_wins = len(matt_games[matt_games["winner"] == "Matt"])
        matt_stats = {
            "games": len(matt_games),
            "wins": matt_wins,
            "win_rate": (matt_wins / len(matt_games) * 100)
            if len(matt_games) > 0
            else 0,
        }

        # Matchup analysis
        def get_matchup_stats(is_shayne_char=True):
            if is_shayne_char:
                games = shayne_games
                char_col = "matt_character"
                win_condition = games["winner"] == "Shayne"
            else:
                games = matt_games
                char_col = "shayne_character"
                win_condition = games["winner"] == "Matt"

            matchups = []
            for opponent in games[char_col].unique():
                opponent_games = games[games[char_col] == opponent]
                wins = len(opponent_games[win_condition])
                total = len(opponent_games)
                if total >= 3:  # Minimum 3 games for statistical relevance
                    matchups.append(
                        {
                            "opponent": opponent,
                            "games": total,
                            "wins": wins,
                            "losses": total - wins,
                            "win_rate": (wins / total * 100) if total > 0 else 0,
                        }
                    )
            return sorted(matchups, key=lambda x: x["win_rate"], reverse=True)

        shayne_matchups = get_matchup_stats(True)
        matt_matchups = get_matchup_stats(False)

        # Combine and get best/worst overall matchups
        all_matchups = {}
        for matchup in shayne_matchups + matt_matchups:
            opp = matchup["opponent"]
            if opp in all_matchups:
                all_matchups[opp]["games"] += matchup["games"]
                all_matchups[opp]["wins"] += matchup["wins"]
                all_matchups[opp]["losses"] += matchup["losses"]
            else:
                all_matchups[opp] = matchup.copy()

        # Recalculate win rates for combined matchups
        for opp in all_matchups:
            total = all_matchups[opp]["games"]
            wins = all_matchups[opp]["wins"]
            all_matchups[opp]["win_rate"] = (wins / total * 100) if total > 0 else 0

        sorted_matchups = sorted(
            all_matchups.values(), key=lambda x: x["win_rate"], reverse=True
        )
        best_matchups = sorted_matchups[:5]
        worst_matchups = sorted_matchups[-5:]

        # Stage performance
        stage_performance = []
        for stage in character_games["stage"].unique():
            stage_games = character_games[character_games["stage"] == stage]
            stage_wins = len(
                stage_games[
                    (
                        (stage_games["shayne_character"] == character)
                        & (stage_games["winner"] == "Shayne")
                    )
                    | (
                        (stage_games["matt_character"] == character)
                        & (stage_games["winner"] == "Matt")
                    )
                ]
            )
            total = len(stage_games)
            if total >= 2:  # Minimum 2 games
                stage_performance.append(
                    {
                        "stage": stage,
                        "games": total,
                        "wins": stage_wins,
                        "win_rate": (stage_wins / total * 100) if total > 0 else 0,
                    }
                )

        stage_performance = sorted(
            stage_performance, key=lambda x: x["win_rate"], reverse=True
        )

        # Recent performance (last 20 games with this character)
        recent_games = character_games.sort_values("timestamp", ascending=False).head(
            20
        )
        recent_wins = len(
            recent_games[
                (
                    (recent_games["shayne_character"] == character)
                    & (recent_games["winner"] == "Shayne")
                )
                | (
                    (recent_games["matt_character"] == character)
                    & (recent_games["winner"] == "Matt")
                )
            ]
        )
        recent_performance = {
            "games": len(recent_games),
            "wins": recent_wins,
            "win_rate": (recent_wins / len(recent_games) * 100)
            if len(recent_games) > 0
            else 0,
        }

        return jsonify(
            {
                "success": True,
                "character": character,
                "total_games": total_games,
                "global_win_rate": round(global_win_rate, 1),
                "shayne_stats": {
                    "games": shayne_stats["games"],
                    "wins": shayne_stats["wins"],
                    "win_rate": round(shayne_stats["win_rate"], 1),
                },
                "matt_stats": {
                    "games": matt_stats["games"],
                    "wins": matt_stats["wins"],
                    "win_rate": round(matt_stats["win_rate"], 1),
                },
                "best_matchups": best_matchups,
                "worst_matchups": worst_matchups,
                "stage_performance": stage_performance,
                "recent_performance": recent_performance,
                "shayne_matchups": shayne_matchups,
                "matt_matchups": matt_matchups,
            }
        )

    except Exception as e:
        logger.error(f"Error in character stats endpoint: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/api/characters/overview")
def get_all_characters_stats():
    """Get basic stats for all characters to create a tier list / overview."""
    try:
        df = data_manager._load_data()

        if len(df) == 0:
            return jsonify({"success": False, "message": "No data available"})

        characters_data = {}

        # Get all unique characters (data is already cleaned in _load_data)
        all_characters = set(df["shayne_character"].unique()) | set(
            df["matt_character"].unique()
        )

        for character in all_characters:
            character_games = df[
                (df["shayne_character"] == character)
                | (df["matt_character"] == character)
            ]

            total_games = len(character_games)
            wins = len(
                character_games[
                    (
                        (character_games["shayne_character"] == character)
                        & (character_games["winner"] == "Shayne")
                    )
                    | (
                        (character_games["matt_character"] == character)
                        & (character_games["winner"] == "Matt")
                    )
                ]
            )

            # Usage frequency
            shayne_usage = len(df[df["shayne_character"] == character])
            matt_usage = len(df[df["matt_character"] == character])
            total_usage = shayne_usage + matt_usage

            characters_data[character] = {
                "total_games": total_games,
                "total_usage": total_usage,
                "wins": wins,
                "win_rate": round(
                    (wins / total_games * 100) if total_games > 0 else 0, 1
                ),
                "usage_rate": round(
                    (total_usage / len(df) * 100) if len(df) > 0 else 0, 1
                ),
                "shayne_usage": shayne_usage,
                "matt_usage": matt_usage,
            }

        # Sort by usage rate, with safety check for numeric values
        def safe_sort_key(item):
            usage_rate = item[1]["usage_rate"]
            return float(usage_rate) if usage_rate is not None else 0.0

        sorted_characters = sorted(
            characters_data.items(), key=safe_sort_key, reverse=True
        )

        return jsonify(
            {
                "success": True,
                "characters": dict(sorted_characters),
                "total_matches": len(df),
            }
        )

    except Exception as e:
        logger.error(f"Error in all characters stats endpoint: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/api/users/<username>/stats")
def get_user_stats(username):
    # Read the CSV file
    df = pd.read_csv("game_results.csv")
    df["datetime"] = pd.to_datetime(df["datetime"])

    # Calculate total games and wins for the user
    total_games = len(df)
    user_wins = len(df[df["winner"] == username])
    overall_win_rate = (user_wins / total_games) * 100 if total_games > 0 else 0

    # Calculate average stocks remaining when winning
    avg_stocks = df[df["winner"] == username]["stocks_remaining"].mean()

    # Calculate win streak
    df = df.sort_values("datetime")
    current_streak = 0
    max_streak = 0
    current_streak_type = None  # 'win' or 'loss'
    max_streak_type = None

    for winner in df["winner"]:
        if winner == username:
            if current_streak_type == "win" or current_streak_type is None:
                current_streak += 1
                current_streak_type = "win"
            else:
                current_streak = 1
                current_streak_type = "win"
        else:
            if current_streak_type == "loss" or current_streak_type is None:
                current_streak += 1
                current_streak_type = "loss"
            else:
                current_streak = 1
                current_streak_type = "loss"

        if current_streak > max_streak:
            max_streak = current_streak
            max_streak_type = current_streak_type

    # Calculate recent performance (last 20 games)
    recent_games = df.tail(20)
    recent_wins = len(recent_games[recent_games["winner"] == username])
    recent_win_rate = (
        (recent_wins / len(recent_games)) * 100 if len(recent_games) > 0 else 0
    )

    # Calculate character stats
    user_char_col = f"{username.lower()}_character"
    character_stats = []

    if user_char_col in df.columns:
        char_games = df.groupby(user_char_col).size()
        char_wins = df[df["winner"] == username].groupby(user_char_col).size()

        for char in char_games.index:
            games = char_games[char]
            wins = char_wins.get(char, 0)
            win_rate = (wins / games) * 100 if games > 0 else 0

            if games >= 10:  # Only include characters with 10+ games
                character_stats.append(
                    {"character": char, "winRate": win_rate, "totalGames": int(games)}
                )

        # Sort by number of games, then win rate
        character_stats.sort(key=lambda x: (-x["totalGames"], -x["winRate"]))

    # Calculate stage stats
    stage_stats = []
    stage_games = df[df["stage"] != "No Stage"].groupby("stage").size()
    stage_wins = (
        df[(df["winner"] == username) & (df["stage"] != "No Stage")]
        .groupby("stage")
        .size()
    )

    for stage in stage_games.index:
        games = stage_games[stage]
        wins = stage_wins.get(stage, 0)
        losses = games - wins
        win_rate = (wins / games) * 100 if games > 0 else 0

        if games >= 5:  # Only include stages with 5+ games
            stage_stats.append(
                {
                    "stage": stage,
                    "winRate": win_rate,
                    "totalGames": int(games),
                    "wins": int(wins),
                    "losses": int(losses),
                }
            )

    # Sort by number of games, then win rate
    stage_stats.sort(key=lambda x: (-x["totalGames"], -x["winRate"]))

    # Calculate most frequent opponent character matchups
    opponent_char_col = (
        "matt_character" if username.lower() == "shayne" else "shayne_character"
    )
    opponent_chars = df.groupby(opponent_char_col).size().sort_values(ascending=False)
    most_faced_chars = [
        {
            "character": char,
            "games": int(count),
            "wins": int(
                len(df[(df[opponent_char_col] == char) & (df["winner"] == username)])
            ),
        }
        for char, count in opponent_chars.head(5).items()
    ]

    return jsonify(
        {
            "overallWinRate": overall_win_rate,
            "totalGames": total_games,
            "avgStocksWhenWinning": float(avg_stocks) if not pd.isna(avg_stocks) else 0,
            "currentStreak": {
                "count": int(current_streak),
                "type": current_streak_type,
            },
            "maxStreak": {"count": int(max_streak), "type": max_streak_type},
            "recentPerformance": {
                "games": len(recent_games),
                "winRate": recent_win_rate,
            },
            "characterStats": character_stats,
            "stageStats": stage_stats,
            "mostFacedCharacters": most_faced_chars,
        }
    )


@app.route("/api/users/<username>/win-rate-timeline")
def get_user_win_rate_timeline(username):
    """Get win rate timeline data for a user showing trailing 50-game average over last 100 games."""
    try:
        result = data_manager.get_user_win_rate_timeline(username)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error in win rate timeline endpoint: {str(e)}")
        return jsonify({"success": False, "message": str(e), "data": []})


@app.route("/api/users/<username>/heatmap")
def get_user_heatmap(username):
    """Get heatmap data for a user showing performance by day and hour. Optionally filter by character."""
    try:
        character = request.args.get("character", None)
        result = data_manager.get_user_heatmap_data(username, character)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error in heatmap endpoint: {str(e)}")
        return jsonify({"success": False, "message": str(e), "data": []})


@app.route("/api/characters/<character>/heatmap")
def get_character_heatmap(character):
    """Get heatmap data for a character showing performance by day and hour across all players."""
    try:
        # Get heatmap data for both players and combine
        shayne_result = data_manager.get_user_heatmap_data("Shayne", character)
        matt_result = data_manager.get_user_heatmap_data("Matt", character)

        # Combine the data
        combined_data = []
        if shayne_result.get("success") and matt_result.get("success"):
            shayne_data = {(d["day"], d["hour"]): d for d in shayne_result["data"]}
            matt_data = {(d["day"], d["hour"]): d for d in matt_result["data"]}

            for day in range(7):
                for hour in range(24):
                    key = (day, hour)
                    shayne_slot = shayne_data.get(key, {"win_rate": 0, "game_count": 0})
                    matt_slot = matt_data.get(key, {"win_rate": 0, "game_count": 0})

                    total_games = shayne_slot["game_count"] + matt_slot["game_count"]
                    if total_games > 0:
                        # Calculate combined win rate
                        shayne_wins = (shayne_slot["win_rate"] / 100) * shayne_slot[
                            "game_count"
                        ]
                        matt_wins = (matt_slot["win_rate"] / 100) * matt_slot[
                            "game_count"
                        ]
                        combined_win_rate = (
                            (shayne_wins + matt_wins) / total_games
                        ) * 100
                    else:
                        combined_win_rate = 0

                    combined_data.append(
                        {
                            "hour": hour,
                            "day": day,
                            "win_rate": round(combined_win_rate, 1),
                            "game_count": total_games,
                        }
                    )

            return jsonify(
                {
                    "success": True,
                    "data": combined_data,
                    "total_games": shayne_result.get("total_games", 0)
                    + matt_result.get("total_games", 0),
                    "character": character,
                }
            )
        else:
            return jsonify(
                {"success": False, "message": "No data available", "data": []}
            )

    except Exception as e:
        logger.error(f"Error in character heatmap endpoint: {str(e)}")
        return jsonify({"success": False, "message": str(e), "data": []})


@app.route("/api/characters/<character>/timeline")
def get_character_timeline(character):
    """Get timeline data showing games played per session for a specific character."""
    try:
        df = data_manager._load_data()

        if len(df) == 0:
            return jsonify(
                {"success": False, "message": "No data available", "data": []}
            )

        # Assign session IDs
        df = data_manager._assign_missing_session_ids(df)

        # Filter for games where this character was played
        character_games = df[
            (df["shayne_character"] == character) | (df["matt_character"] == character)
        ]

        if len(character_games) == 0:
            return jsonify({"success": True, "data": [], "character": character})

        # Group by session and count games
        session_data = []
        for session_id in character_games["session_id"].unique():
            session_games = character_games[character_games["session_id"] == session_id]

            # Get session start time
            start_time = session_games["datetime"].min()

            session_data.append(
                {
                    "session_id": session_id,
                    "date": start_time.strftime("%Y-%m-%d"),
                    "datetime": start_time.strftime("%Y-%m-%d %H:%M:%S"),
                    "games": len(session_games),
                }
            )

        # Sort by date
        session_data.sort(key=lambda x: x["datetime"])

        return jsonify(
            {
                "success": True,
                "data": session_data,
                "character": character,
                "total_sessions": len(session_data),
                "total_games": len(character_games),
            }
        )

    except Exception as e:
        logger.error(f"Error in character timeline endpoint: {str(e)}")
        return jsonify({"success": False, "message": str(e), "data": []})


@app.route("/api/sessions/timeline")
def get_sessions_timeline():
    """Get timeline data showing games played per session over time."""
    try:
        sessions = data_manager.get_sessions()

        if not sessions:
            return jsonify({"success": True, "data": []})

        # Format data for timeline visualization
        timeline_data = []
        for session in sessions:
            timeline_data.append(
                {
                    "session_id": session["session_id"],
                    "date": session["start_time"].split(" ")[0],  # Extract date part
                    "datetime": session["start_time"],
                    "games": session["total_games"],
                    "shayne_wins": session["shayne_wins"],
                    "matt_wins": session["matt_wins"],
                    "duration_minutes": session["duration_minutes"],
                }
            )

        # Sort by date
        timeline_data.sort(key=lambda x: x["datetime"])

        return jsonify(
            {
                "success": True,
                "data": timeline_data,
                "total_sessions": len(timeline_data),
            }
        )

    except Exception as e:
        logger.error(f"Error in sessions timeline endpoint: {str(e)}")
        return jsonify({"success": False, "message": str(e), "data": []})


@app.route("/api/head_to_head_stats")
def get_head_to_head_stats():
    """Get comprehensive head-to-head statistics between players."""
    try:
        df = data_manager._load_data()

        if len(df) == 0:
            return jsonify({"success": False, "message": "No data available"})

        df = df.sort_values("datetime")

        # Recent form analysis
        recent_form = {}
        for n in [10, 20, 50]:
            recent_df = df.tail(n)
            recent_form[f"last_{n}"] = {
                "shayne_wins": int(len(recent_df[recent_df["winner"] == "Shayne"])),
                "matt_wins": int(len(recent_df[recent_df["winner"] == "Matt"])),
                "total_games": len(recent_df),
            }

        # Monthly breakdown
        df["month"] = pd.to_datetime(df["datetime"]).dt.strftime("%Y-%m")
        monthly_data = []
        for month in df["month"].unique():
            month_df = df[df["month"] == month]
            monthly_data.append(
                {
                    "month": month,
                    "shayne_wins": int(len(month_df[month_df["winner"] == "Shayne"])),
                    "matt_wins": int(len(month_df[month_df["winner"] == "Matt"])),
                    "total_games": len(month_df),
                }
            )
        monthly_data.sort(key=lambda x: x["month"], reverse=True)

        # Streak analysis
        current_streak_player = None
        current_streak_length = 0
        longest_win_streaks = {
            "Shayne": {"length": 0, "date": None},
            "Matt": {"length": 0, "date": None},
        }
        longest_loss_streaks = {
            "Shayne": {"length": 0, "date": None},
            "Matt": {"length": 0, "date": None},
        }

        temp_streak = {"player": None, "length": 0, "start_date": None}

        for idx, row in df.iterrows():
            winner = row["winner"]
            date = row["datetime"]

            # Track current streak
            if current_streak_player == winner:
                current_streak_length += 1
            else:
                current_streak_player = winner
                current_streak_length = 1

            # Track temp streak for longest calculations
            if temp_streak["player"] == winner:
                temp_streak["length"] += 1
            else:
                # Save previous streak if it was a record
                if temp_streak["player"] and temp_streak["length"] > 0:
                    prev_player = temp_streak["player"]
                    if (
                        temp_streak["length"]
                        > longest_win_streaks[prev_player]["length"]
                    ):
                        longest_win_streaks[prev_player] = {
                            "length": temp_streak["length"],
                            "date": str(temp_streak["start_date"]),
                        }

                temp_streak = {"player": winner, "length": 1, "start_date": date}

        # Check final streak
        if (
            temp_streak["player"]
            and temp_streak["length"]
            > longest_win_streaks[temp_streak["player"]]["length"]
        ):
            longest_win_streaks[temp_streak["player"]] = {
                "length": temp_streak["length"],
                "date": str(temp_streak["start_date"]),
            }

        # Calculate longest loss streaks (inverse of win streaks)
        loser_streaks = {"Shayne": [], "Matt": []}
        current_loser = None
        current_loss_streak = 0
        loss_start_date = None

        for idx, row in df.iterrows():
            winner = row["winner"]
            loser = "Matt" if winner == "Shayne" else "Shayne"
            date = row["datetime"]

            if current_loser == loser:
                current_loss_streak += 1
            else:
                if current_loser and current_loss_streak > 0:
                    loser_streaks[current_loser].append(
                        {"length": current_loss_streak, "date": loss_start_date}
                    )
                current_loser = loser
                current_loss_streak = 1
                loss_start_date = date

        # Add final loss streak
        if current_loser and current_loss_streak > 0:
            loser_streaks[current_loser].append(
                {"length": current_loss_streak, "date": loss_start_date}
            )

        for player in ["Shayne", "Matt"]:
            if loser_streaks[player]:
                longest = max(loser_streaks[player], key=lambda x: x["length"])
                longest_loss_streaks[player] = {
                    "length": longest["length"],
                    "date": str(longest["date"]),
                }

        # Average stock differential when winning
        avg_stock_diff = {}
        for player in ["Shayne", "Matt"]:
            player_wins = df[df["winner"] == player]
            if len(player_wins) > 0:
                avg_stocks = player_wins["stocks_remaining"].mean()
                avg_stock_diff[player.lower()] = (
                    round(float(avg_stocks), 2) if not pd.isna(avg_stocks) else 0
                )
            else:
                avg_stock_diff[player.lower()] = 0

        return jsonify(
            {
                "success": True,
                "recent_form": recent_form,
                "monthly_breakdown": monthly_data[:12],  # Last 12 months
                "streaks": {
                    "current_streak": {
                        "player": current_streak_player,
                        "length": current_streak_length,
                    },
                    "longest_win_streaks": longest_win_streaks,
                    "longest_loss_streaks": longest_loss_streaks,
                },
                "avg_stock_differential": avg_stock_diff,
            }
        )

    except Exception as e:
        logger.error(f"Error in head_to_head_stats endpoint: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/api/advanced_metrics")
def get_advanced_metrics():
    """Get advanced performance metrics."""
    try:
        df = data_manager._load_data()

        if len(df) == 0:
            return jsonify({"success": False, "message": "No data available"})

        df = df.sort_values("datetime")
        total_games = len(df)

        # Two-stock wins (solid victories)
        two_stock_wins = {}
        for player in ["Shayne", "Matt"]:
            player_wins = df[df["winner"] == player]
            two_stock_count = len(player_wins[player_wins["stocks_remaining"] == 2])
            total_wins = len(player_wins)

            two_stock_wins[player.lower()] = {
                "two_stock_wins": two_stock_count,
                "total_wins": total_wins,
                "two_stock_rate": round((two_stock_count / total_wins * 100), 1)
                if total_wins > 0
                else 0,
                "of_all_games": round((two_stock_count / total_games * 100), 1)
                if total_games > 0
                else 0,
            }

        # Dominance factor (3-stock wins)
        dominance_factor = {}
        for player in ["Shayne", "Matt"]:
            player_wins = df[df["winner"] == player]
            three_stock_wins = len(player_wins[player_wins["stocks_remaining"] == 3])
            total_wins = len(player_wins)

            dominance_factor[player.lower()] = {
                "three_stock_wins": three_stock_wins,
                "total_wins": total_wins,
                "dominance_rate": round((three_stock_wins / total_wins * 100), 1)
                if total_wins > 0
                else 0,
                "of_all_games": round((three_stock_wins / total_games * 100), 1)
                if total_games > 0
                else 0,
            }

        # Consistency score (std dev of stocks remaining)
        consistency_score = {}
        for player in ["Shayne", "Matt"]:
            player_wins = df[df["winner"] == player]
            if len(player_wins) > 0:
                std_dev = player_wins["stocks_remaining"].std()
                consistency_score[player.lower()] = (
                    round(float(std_dev), 2) if not pd.isna(std_dev) else 0
                )
            else:
                consistency_score[player.lower()] = 0

        # Momentum analysis (win after win vs win after loss)
        momentum_analysis = {}
        for player in ["Shayne", "Matt"]:
            wins_after_win = 0
            games_after_win = 0
            wins_after_loss = 0
            games_after_loss = 0

            prev_winner = None
            for idx, row in df.iterrows():
                current_winner = row["winner"]

                if prev_winner is not None:
                    if prev_winner == player:
                        games_after_win += 1
                        if current_winner == player:
                            wins_after_win += 1
                    else:
                        games_after_loss += 1
                        if current_winner == player:
                            wins_after_loss += 1

                prev_winner = current_winner

            momentum_analysis[player.lower()] = {
                "win_after_win": round((wins_after_win / games_after_win * 100), 1)
                if games_after_win > 0
                else 0,
                "win_after_loss": round((wins_after_loss / games_after_loss * 100), 1)
                if games_after_loss > 0
                else 0,
            }

        # Close game record (1 stock differential)
        close_game_record = {}
        for player in ["Shayne", "Matt"]:
            player_wins = df[df["winner"] == player]
            close_wins = len(player_wins[player_wins["stocks_remaining"] == 1])
            total_wins = len(player_wins)

            close_game_record[player.lower()] = {
                "wins": close_wins,
                "total_wins": total_wins,
                "win_rate": round((close_wins / total_wins * 100), 1)
                if total_wins > 0
                else 0,
                "of_all_games": round((close_wins / total_games * 100), 1)
                if total_games > 0
                else 0,
            }

        return jsonify(
            {
                "success": True,
                "two_stock_wins": two_stock_wins,
                "dominance_factor": dominance_factor,
                "consistency_score": consistency_score,
                "momentum_analysis": momentum_analysis,
                "close_game_record": close_game_record,
            }
        )

    except Exception as e:
        logger.error(f"Error in advanced_metrics endpoint: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/api/matchup_matrix")
def get_matchup_matrix():
    """Get character matchup matrix with win rates."""
    try:
        df = data_manager._load_data()

        if len(df) == 0:
            return jsonify({"success": False, "message": "No data available"})

        # Build matchup matrix
        matchup_matrix = {}
        matchup_list = []

        for _, row in df.iterrows():
            shayne_char = row["shayne_character"]
            matt_char = row["matt_character"]
            winner = row["winner"]

            matchup_key = f"{shayne_char}_vs_{matt_char}"

            if matchup_key not in matchup_matrix:
                matchup_matrix[matchup_key] = {
                    "shayne_character": shayne_char,
                    "matt_character": matt_char,
                    "total_games": 0,
                    "shayne_wins": 0,
                    "matt_wins": 0,
                }

            matchup_matrix[matchup_key]["total_games"] += 1
            if winner == "Shayne":
                matchup_matrix[matchup_key]["shayne_wins"] += 1
            else:
                matchup_matrix[matchup_key]["matt_wins"] += 1

        # Calculate win rates and create list
        for key, data in matchup_matrix.items():
            data["shayne_win_rate"] = round(
                (data["shayne_wins"] / data["total_games"] * 100), 1
            )
            data["matt_win_rate"] = round(
                (data["matt_wins"] / data["total_games"] * 100), 1
            )
            matchup_list.append(data)

        # Sort by total games
        matchup_list.sort(key=lambda x: x["total_games"], reverse=True)

        # Get best/worst matchups for each player (min 5 games)
        qualified_matchups = [m for m in matchup_list if m["total_games"] >= 5]

        best_matchups_shayne = sorted(
            qualified_matchups, key=lambda x: x["shayne_win_rate"], reverse=True
        )[:10]
        worst_matchups_shayne = sorted(
            qualified_matchups, key=lambda x: x["shayne_win_rate"]
        )[:10]
        best_matchups_matt = sorted(
            qualified_matchups, key=lambda x: x["matt_win_rate"], reverse=True
        )[:10]
        worst_matchups_matt = sorted(
            qualified_matchups, key=lambda x: x["matt_win_rate"]
        )[:10]

        return jsonify(
            {
                "success": True,
                "matrix": matchup_matrix,
                "top_matchups": matchup_list[:20],  # Top 20 most played
                "best_matchups": {
                    "shayne": best_matchups_shayne,
                    "matt": best_matchups_matt,
                },
                "worst_matchups": {
                    "shayne": worst_matchups_shayne,
                    "matt": worst_matchups_matt,
                },
            }
        )

    except Exception as e:
        logger.error(f"Error in matchup_matrix endpoint: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/api/sessions")
def get_sessions_list():
    """Get list of all sessions with summary data."""
    try:
        sessions = data_manager.get_sessions()
        return jsonify({"success": True, "sessions": sessions})
    except Exception as e:
        logger.error(f"Error in sessions endpoint: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/api/sessions/<session_id>")
def get_session_detail(session_id):
    """Get detailed stats for a specific session."""
    try:
        stats = data_manager.get_session_stats(session_id)
        return jsonify(stats)
    except Exception as e:
        logger.error(f"Error in session detail endpoint: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/api/sessions/current")
def get_current_session():
    """Get the current active session information."""
    try:
        df = data_manager._load_data()

        if len(df) == 0:
            return jsonify(
                {
                    "success": True,
                    "session_id": None,
                    "start_time": None,
                    "game_count": 0,
                    "is_active": False,
                }
            )

        # Get the most recent game
        df = df.sort_values("timestamp", ascending=False)
        last_game = df.iloc[0]
        last_timestamp = float(last_game["timestamp"])

        # Check if session is still active (less than 4 hours since last game)
        now = datetime.now().timestamp()
        time_gap_hours = (now - last_timestamp) / 3600
        is_active = time_gap_hours < data_manager.session_gap_hours

        # Get or create session ID
        session_id = data_manager._get_or_create_session_id(last_timestamp)

        # Count games in current session
        df = data_manager._assign_missing_session_ids(df)
        session_games = df[df["session_id"] == session_id]

        start_time = (
            session_games.iloc[0]["datetime"] if len(session_games) > 0 else None
        )

        return jsonify(
            {
                "success": True,
                "session_id": session_id,
                "start_time": start_time.strftime("%Y-%m-%d %H:%M:%S")
                if start_time
                else None,
                "game_count": len(session_games),
                "is_active": is_active,
            }
        )

    except Exception as e:
        logger.error(f"Error in current session endpoint: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/api/users/<username>/tearsheet")
def get_user_tearsheet(username):
    """Get comprehensive tearsheet data for a specific player."""
    try:
        df = data_manager._load_data()
        
        if len(df) == 0:
            return jsonify({"success": False, "message": "No data available"})
        
        df["datetime"] = pd.to_datetime(df["datetime"])
        df = df.sort_values("datetime")
        
        # Basic stats
        total_games = len(df)
        user_wins = len(df[df["winner"] == username])
        overall_win_rate = (user_wins / total_games) * 100 if total_games > 0 else 0
        
        # Opponent info
        opponent = "Matt" if username == "Shayne" else "Shayne"
        opponent_wins = total_games - user_wins
        
        # Average stocks remaining when winning
        avg_stocks = df[df["winner"] == username]["stocks_remaining"].mean()
        avg_stocks = float(avg_stocks) if not pd.isna(avg_stocks) else 0
        
        # Calculate streaks
        current_streak = 0
        max_win_streak = 0
        current_streak_type = None
        temp_win_streak = 0
        
        for winner in df["winner"]:
            if winner == username:
                if current_streak_type == "win" or current_streak_type is None:
                    current_streak += 1
                    temp_win_streak += 1
                    current_streak_type = "win"
                else:
                    current_streak = 1
                    temp_win_streak = 1
                    current_streak_type = "win"
                max_win_streak = max(max_win_streak, temp_win_streak)
            else:
                if current_streak_type == "loss" or current_streak_type is None:
                    current_streak += 1
                    current_streak_type = "loss"
                else:
                    current_streak = 1
                    current_streak_type = "loss"
                temp_win_streak = 0
        
        # Recent form (last 100 games)
        last_100 = df.tail(100)
        last_100_wins = len(last_100[last_100["winner"] == username])
        last_100_rate = (last_100_wins / len(last_100) * 100) if len(last_100) > 0 else 0
        
        # Dominance stats
        user_char_col = f"{username.lower()}_character"
        three_stock_wins = len(df[(df["winner"] == username) & (df["stocks_remaining"] == 3)])
        two_stock_wins = len(df[(df["winner"] == username) & (df["stocks_remaining"] == 2)])
        two_stock_rate = (two_stock_wins / user_wins * 100) if user_wins > 0 else 0
        
        # Top characters
        if user_char_col in df.columns:
            char_games = df.groupby(user_char_col).size()
            char_wins = df[df["winner"] == username].groupby(user_char_col).size()
            
            character_usage = []
            for char in char_games.index:
                games = int(char_games[char])
                wins = int(char_wins.get(char, 0))
                win_rate = (wins / games) * 100 if games > 0 else 0
                
                character_usage.append({
                    "character": char,
                    "games": games,
                    "wins": wins,
                    "win_rate": round(win_rate, 1)
                })
            
            # Sort by games played
            character_usage.sort(key=lambda x: (-x["games"], -x["win_rate"]))
        else:
            character_usage = []
        
        # Stage performance
        stage_games = df[df["stage"] != "No Stage"].groupby("stage").size()
        stage_wins = df[(df["winner"] == username) & (df["stage"] != "No Stage")].groupby("stage").size()
        
        stage_stats = []
        for stage in stage_games.index:
            games = int(stage_games[stage])
            wins = int(stage_wins.get(stage, 0))
            win_rate = (wins / games) * 100 if games > 0 else 0
            
            stage_stats.append({
                "stage": stage,
                "games": games,
                "wins": wins,
                "win_rate": round(win_rate, 1)
            })
        
        # Sort by games played
        stage_stats.sort(key=lambda x: (-x["games"], -x["win_rate"]))
        
        # Best and worst matchups (opponent characters)
        opponent_char_col = "matt_character" if username == "Shayne" else "shayne_character"
        opp_char_games = df.groupby(opponent_char_col).size()
        opp_char_wins = df[df["winner"] == username].groupby(opponent_char_col).size()
        
        matchup_stats = []
        for char in opp_char_games.index:
            games = int(opp_char_games[char])
            wins = int(opp_char_wins.get(char, 0))
            losses = games - wins
            win_rate = (wins / games) * 100 if games > 0 else 0
            
            if games >= 5:  # Only include matchups with 5+ games
                matchup_stats.append({
                    "opponent_character": char,
                    "games": games,
                    "wins": wins,
                    "losses": losses,
                    "win_rate": round(win_rate, 1)
                })
        
        # Sort by win rate for best/worst
        matchup_stats.sort(key=lambda x: -x["win_rate"])
        best_matchups = matchup_stats[:5]
        worst_matchups = sorted(matchup_stats, key=lambda x: x["win_rate"])[:5]
        
        return jsonify({
            "success": True,
            "username": username,
            "opponent": opponent,
            "overall_stats": {
                "total_games": total_games,
                "wins": user_wins,
                "losses": opponent_wins,
                "win_rate": round(overall_win_rate, 1),
                "avg_stocks_when_winning": round(avg_stocks, 2)
            },
            "streaks": {
                "current_streak": {
                    "count": current_streak,
                    "type": current_streak_type
                },
                "max_win_streak": max_win_streak
            },
            "recent_form": {
                "last_100": {
                    "wins": last_100_wins,
                    "games": len(last_100),
                    "win_rate": round(last_100_rate, 1)
                }
            },
            "dominance": {
                "three_stock_wins": three_stock_wins,
                "two_stock_wins": two_stock_wins,
                "two_stock_rate": round(two_stock_rate, 1)
            },
            "character_usage": character_usage[:10],  # Top 10 characters
            "stage_stats": stage_stats[:9],  # Top 9 stages
            "best_matchups": best_matchups,
            "worst_matchups": worst_matchups
        })
        
    except Exception as e:
        logger.error(f"Error in user tearsheet endpoint: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0")
