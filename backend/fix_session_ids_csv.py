#!/usr/bin/env python3
"""
Standalone script to assign session IDs using only standard library (no pandas/numpy).
"""

import csv
from datetime import datetime
import logging
import shutil
import os
import sys
import argparse
import re
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

SESSION_GAP_HOURS = 4


def generate_session_id(game_datetime: datetime) -> str:
    """Generate a session ID based on the game datetime."""
    return game_datetime.strftime("%Y-%m-%d-%H")


def parse_datetime(dt_str: str) -> datetime:
    """Parse datetime string."""
    return datetime.strptime(dt_str, "%Y-%m-%d %H:%M:%S")


def assign_session_ids(
    csv_path: str,
    overwrite: bool = False,
    backup_dir: str = None,
    session_gap_hours: float = SESSION_GAP_HOURS,
) -> None:
    """Assign session IDs to all games in the CSV file."""

    # Create backup
    if not os.path.exists(csv_path):
        logger.error(f"CSV file not found: {csv_path}")
        return

    if backup_dir:
        os.makedirs(backup_dir, exist_ok=True)
        backup_path = os.path.join(
            backup_dir,
            f"{Path(csv_path).stem}_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
        )
    else:
        backup_path = f"{csv_path}.backup"

    logger.info(f"Creating backup: {backup_path}")
    shutil.copy(csv_path, backup_path)

    # Load data
    logger.info(f"Loading data from {csv_path}")
    rows = []
    headers = None

    with open(csv_path, "r", newline="") as f:
        reader = csv.DictReader(f)
        headers = reader.fieldnames
        for row in reader:
            # Clean up corrupted timestamp fields
            if "timestamp" in row and row["timestamp"]:
                ts_str = row["timestamp"].strip()
                # Extract just the numeric part if there's extra text
                match = re.search(r"(\d+\.?\d*)", ts_str)
                if match:
                    row["timestamp"] = match.group(1)
                else:
                    logger.warning(f"Could not parse timestamp: {ts_str}, skipping row")
                    continue
            rows.append(row)

    if len(rows) == 0:
        logger.warning("No data to process")
        return

    # Ensure session_id column exists
    if "session_id" not in headers:
        headers = list(headers) + ["session_id"]
        for row in rows:
            row["session_id"] = ""

    # Count existing session IDs
    existing_count = sum(1 for row in rows if row.get("session_id", "").strip())
    logger.info(f"Games with existing session IDs: {existing_count}")
    logger.info(f"Games missing session IDs: {len(rows) - existing_count}")

    # Sort by timestamp, handling malformed data
    def get_timestamp(row):
        try:
            ts_str = row["timestamp"].strip()
            # Extract just the numeric part if there's extra text
            match = re.search(r"(\d+\.?\d*)", ts_str)
            if match:
                return float(match.group(1))
            return 0.0
        except (ValueError, KeyError):
            return 0.0

    rows.sort(key=get_timestamp)

    logger.info(f"Processing {len(rows)} games...")

    # Assign session IDs
    current_session_id = None
    last_timestamp = None
    session_count = 0
    assigned_count = 0

    for row in rows:
        # Skip if already has a session_id (unless overwriting)
        if not overwrite and row.get("session_id", "").strip():
            current_session_id = row["session_id"].strip()
            # Extract timestamp, handling malformed data
            ts_str = row["timestamp"].strip()
            match = re.search(r"(\d+\.?\d*)", ts_str)
            if match:
                last_timestamp = float(match.group(1))
            else:
                last_timestamp = None
            continue

        # Extract timestamp, handling malformed data
        ts_str = row["timestamp"].strip()
        match = re.search(r"(\d+\.?\d*)", ts_str)
        if match:
            timestamp = float(match.group(1))
        else:
            logger.warning(
                f"Could not parse timestamp for row: {row.get('datetime', 'unknown')}"
            )
            continue

        if last_timestamp is None:
            # First game
            game_time = datetime.fromtimestamp(timestamp)
            current_session_id = generate_session_id(game_time)
            session_count += 1
            logger.info(f"Session {session_count}: {current_session_id} started")
        else:
            # Check time gap
            time_gap_hours = (timestamp - last_timestamp) / 3600

            if time_gap_hours > session_gap_hours:
                # New session
                game_time = datetime.fromtimestamp(timestamp)
                current_session_id = generate_session_id(game_time)
                session_count += 1
                logger.info(
                    f"Session {session_count}: {current_session_id} started (gap: {time_gap_hours:.1f}h)"
                )

        row["session_id"] = current_session_id
        last_timestamp = timestamp
        assigned_count += 1

    # Save updated data
    logger.info(f"Saving updated data to {csv_path}")
    # Preserve original column order, but ensure session_id is at the end
    columns_to_write = list(headers)
    if "session_id" in columns_to_write:
        columns_to_write.remove("session_id")
    columns_to_write.append("session_id")
    with open(csv_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=columns_to_write)
        writer.writeheader()
        writer.writerows(rows)

    # Print summary
    logger.info("=" * 60)
    logger.info("Migration Summary:")
    logger.info(f"  Total games processed: {len(rows)}")
    logger.info(f"  Session IDs assigned: {assigned_count}")
    logger.info(f"  Total sessions created: {session_count}")
    if session_count > 0:
        logger.info(f"  Average games per session: {len(rows) / session_count:.1f}")
    logger.info(f"  Backup saved to: {backup_path}")
    logger.info("=" * 60)

    logger.info("Session ID assignment completed successfully!")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Add or update session_id column in a CSV file based on time gaps (standard library only)",
    )
    parser.add_argument("csv_file", help="Path to the CSV file to process")
    parser.add_argument(
        "--gap-hours",
        type=float,
        default=SESSION_GAP_HOURS,
        help=f"Hours of inactivity before starting new session (default: {SESSION_GAP_HOURS})",
    )
    parser.add_argument(
        "--backup-dir",
        type=str,
        default=None,
        help="Directory to store backup files (default: same directory as CSV)",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Overwrite existing session IDs instead of only filling missing values",
    )

    args = parser.parse_args()

    try:
        assign_session_ids(
            csv_path=args.csv_file,
            overwrite=args.overwrite,
            backup_dir=args.backup_dir,
            session_gap_hours=args.gap_hours,
        )
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        import traceback

        traceback.print_exc()
        sys.exit(1)
