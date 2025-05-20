import os
import sys
import pandas as pd
from datetime import datetime
import pytz

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from database import db
from models.user import User
from models.match import Match


def migrate_csv_to_db(csv_path):
    """Migrate data from CSV to SQLite database."""
    app = create_app()

    with app.app_context():
        # Create all tables
        db.create_all()

        # Create initial users (Shayne and Matt)
        shayne = User.get_by_username("shayne")
        if not shayne:
            shayne = User(
                username="shayne",
                email="shayne@example.com",  # Replace with actual email
                password="changeme123",  # Should be changed on first login
                display_name="Shayne",
            )
            db.session.add(shayne)

        matt = User.get_by_username("matt")
        if not matt:
            matt = User(
                username="matt",
                email="matt@example.com",  # Replace with actual email
                password="changeme123",  # Should be changed on first login
                display_name="Matt",
            )
            db.session.add(matt)

        db.session.commit()

        # Read CSV data
        df = pd.read_csv(csv_path)

        # Convert datetime strings to datetime objects
        df["datetime"] = pd.to_datetime(df["datetime"])

        # Migrate each match
        for _, row in df.iterrows():
            # Determine winner ID
            winner_id = shayne.id if row["winner"] == "Shayne" else matt.id

            # Create match record
            match = Match(
                player1_id=shayne.id,
                player2_id=matt.id,
                player1_character=row["shayne_character"],
                player2_character=row["matt_character"],
                winner_id=winner_id,
                stocks_remaining=row["stocks_remaining"]
                if pd.notna(row["stocks_remaining"])
                else None,
                stage=row["stage"]
                if "stage" in row and pd.notna(row["stage"])
                else None,
                created_at=row["datetime"].replace(tzinfo=pytz.UTC),
            )

            db.session.add(match)

        # Commit all matches
        db.session.commit()
        print(f"Successfully migrated {len(df)} matches to the database")


if __name__ == "__main__":
    csv_path = "game_results.csv"
    if not os.path.exists(csv_path):
        print(f"Error: {csv_path} not found")
        sys.exit(1)

    migrate_csv_to_db(csv_path)
