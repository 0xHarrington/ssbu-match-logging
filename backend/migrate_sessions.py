#!/usr/bin/env python3
"""
Migration script to assign session IDs to existing game data.

This script reads the game_results.csv file, assigns session IDs based on
the 4-hour gap rule, and writes the updated data back to the CSV.
"""

import pandas as pd
from datetime import datetime
import logging
import shutil
import os

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

SESSION_GAP_HOURS = 4
CSV_PATH = "game_results.csv"
BACKUP_PATH = "game_results_backup.csv"


def generate_session_id(game_datetime: datetime) -> str:
    """Generate a session ID based on the game datetime."""
    return game_datetime.strftime("%Y-%m-%d-%H")


def assign_session_ids(csv_path: str) -> None:
    """Assign session IDs to all games in the CSV file."""
    
    # Create backup
    logger.info(f"Creating backup: {BACKUP_PATH}")
    shutil.copy(csv_path, BACKUP_PATH)
    
    # Load data
    logger.info(f"Loading data from {csv_path}")
    df = pd.read_csv(csv_path)
    
    if len(df) == 0:
        logger.warning("No data to migrate")
        return
    
    # Convert datetime and sort
    df["datetime"] = pd.to_datetime(df["datetime"])
    df = df.sort_values("timestamp")
    
    # Add session_id column if it doesn't exist
    if "session_id" not in df.columns:
        df["session_id"] = None
    
    logger.info(f"Processing {len(df)} games...")
    
    # Assign session IDs
    current_session_id = None
    last_timestamp = None
    session_count = 0
    
    for idx, row in df.iterrows():
        timestamp = row["timestamp"]
        
        if last_timestamp is None:
            # First game
            game_time = datetime.fromtimestamp(timestamp)
            current_session_id = generate_session_id(game_time)
            session_count += 1
            logger.info(f"Session {session_count}: {current_session_id} started")
        else:
            # Check time gap
            time_gap_hours = (timestamp - last_timestamp) / 3600
            
            if time_gap_hours > SESSION_GAP_HOURS:
                # New session
                game_time = datetime.fromtimestamp(timestamp)
                current_session_id = generate_session_id(game_time)
                session_count += 1
                logger.info(f"Session {session_count}: {current_session_id} started (gap: {time_gap_hours:.1f}h)")
        
        df.at[idx, "session_id"] = current_session_id
        last_timestamp = timestamp
    
    # Save updated data
    logger.info(f"Saving updated data to {csv_path}")
    df.to_csv(csv_path, index=False)
    
    # Print summary
    logger.info("=" * 60)
    logger.info("Migration Summary:")
    logger.info(f"  Total games processed: {len(df)}")
    logger.info(f"  Total sessions created: {session_count}")
    logger.info(f"  Average games per session: {len(df) / session_count:.1f}")
    logger.info(f"  Backup saved to: {BACKUP_PATH}")
    logger.info("=" * 60)
    
    # Show session breakdown
    logger.info("\nSession Breakdown:")
    session_summary = df.groupby("session_id").agg({
        "datetime": ["min", "max", "count"],
        "winner": lambda x: f"Shayne {(x == 'Shayne').sum()} - {(x == 'Matt').sum()} Matt"
    })
    
    for session_id in df["session_id"].unique():
        session_games = df[df["session_id"] == session_id]
        start = session_games.iloc[0]["datetime"]
        end = session_games.iloc[-1]["datetime"]
        duration = (end - start).total_seconds() / 60
        shayne_wins = (session_games["winner"] == "Shayne").sum()
        matt_wins = (session_games["winner"] == "Matt").sum()
        
        logger.info(f"  {session_id}: {len(session_games)} games, "
                   f"{duration:.0f} min, Shayne {shayne_wins} - {matt_wins} Matt")


if __name__ == "__main__":
    logger.info("Starting session ID migration...")
    
    if not os.path.exists(CSV_PATH):
        logger.error(f"CSV file not found: {CSV_PATH}")
        exit(1)
    
    try:
        assign_session_ids(CSV_PATH)
        logger.info("Migration completed successfully!")
    except Exception as e:
        logger.error(f"Migration failed: {str(e)}")
        logger.error("Restoring from backup...")
        if os.path.exists(BACKUP_PATH):
            shutil.copy(BACKUP_PATH, CSV_PATH)
            logger.info("Backup restored")
        raise

