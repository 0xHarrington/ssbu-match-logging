# app.py
from flask import Flask, render_template, request, jsonify
from datetime import datetime
import pandas as pd
import os
import logging
from typing import Dict, Any, Optional

app = Flask(__name__)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class GameDataManager:
    """Manages game data storage and retrieval using pandas."""
    
    def __init__(self, csv_path: str):
        self.csv_path = csv_path
        self.columns = [
            'datetime', 
            'shayne_character', 
            'matt_character', 
            'winner',
            'stocks_remaining',
            'timestamp'  # Unix timestamp for easier time-based operations
        ]
        self._ensure_csv_exists()
        
    def _ensure_csv_exists(self) -> None:
        """Create CSV file with headers if it doesn't exist."""
        if not os.path.exists(self.csv_path):
            logger.info(f"Creating new CSV file at {self.csv_path}")
            pd.DataFrame(columns=self.columns).to_csv(self.csv_path, index=False)
            
    def _load_data(self) -> pd.DataFrame:
        """Load the current CSV data into a pandas DataFrame."""
        try:
            return pd.read_csv(self.csv_path)
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
            # Create a new entry
            now = datetime.now()
            new_game = {
                'datetime': now.strftime('%Y-%m-%d %H:%M:%S'),
                'shayne_character': game_data['shayneCharacter'],
                'matt_character': game_data['mattCharacter'],
                'winner': game_data['winner'],
                'stocks_remaining': game_data['stocksRemaining'] or None,
                'timestamp': now.timestamp()
            }
            
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
            return False
            
    def get_recent_games(self, n: int = 5) -> pd.DataFrame:
        """Get the n most recent games."""
        df = self._load_data()
        return df.sort_values('timestamp', ascending=False).head(n)
    
    def get_stats(self) -> Dict[str, Any]:
        """Calculate and return basic statistics about the games."""
        df = self._load_data()
        if len(df) == 0:
            return {}
            
        # Basic stats
        stats = {
            'total_games': len(df),
            'shayne_wins': len(df[df['winner'] == 'Shayne']),
            'matt_wins': len(df[df['winner'] == 'Matt']),
            'most_played_shayne': df['shayne_character'].mode().iloc[0] if not df['shayne_character'].empty else None,
            'most_played_matt': df['matt_character'].mode().iloc[0] if not df['matt_character'].empty else None,
        }
        
        # Calculate win rates
        stats['shayne_win_rate'] = round(stats['shayne_wins'] / stats['total_games'] * 100, 1) if stats['total_games'] > 0 else 0
        stats['matt_win_rate'] = round(stats['matt_wins'] / stats['total_games'] * 100, 1) if stats['total_games'] > 0 else 0
        
        # Character usage stats
        shayne_chars = df['shayne_character'].value_counts().head(5).to_dict()
        matt_chars = df['matt_character'].value_counts().head(5).to_dict()
        
        stats['top_shayne_chars'] = [
            {'character': char, 'games': count}
            for char, count in shayne_chars.items()
        ]
        stats['top_matt_chars'] = [
            {'character': char, 'games': count}
            for char, count in matt_chars.items()
        ]
        
        # Average stocks remaining
        stats['avg_stocks_shayne'] = round(df[df['winner'] == 'Shayne']['stocks_remaining'].mean(), 1) if len(df[df['winner'] == 'Shayne']) > 0 else 0
        stats['avg_stocks_matt'] = round(df[df['winner'] == 'Matt']['stocks_remaining'].mean(), 1) if len(df[df['winner'] == 'Matt']) > 0 else 0
        
        # Recent activity
        stats['last_game_date'] = df['datetime'].max() if not df.empty else None
        
        # Convert timestamp to float for comparison
        df['timestamp'] = pd.to_numeric(df['timestamp'], errors='coerce')
        one_week_ago = datetime.now().timestamp() - (7 * 24 * 60 * 60)
        stats['games_this_week'] = len(df[df['timestamp'] > one_week_ago])
        
        # Win streak analysis
        df['date'] = pd.to_datetime(df['datetime'])
        df = df.sort_values('date')
        
        # Calculate current win streaks
        shayne_streak = 0
        matt_streak = 0
        for winner in reversed(df['winner']):
            if winner == 'Shayne':
                if matt_streak > 0:
                    break
                shayne_streak += 1
            else:
                if shayne_streak > 0:
                    break
                matt_streak += 1
                
        stats['current_streak'] = {
            'player': 'Shayne' if shayne_streak > 0 else 'Matt',
            'length': shayne_streak if shayne_streak > 0 else matt_streak
        }
        
        # Monthly activity
        df['month'] = df['date'].dt.strftime('%Y-%m')
        monthly_games = df.groupby('month').size().tail(6).to_dict()  # Show last 6 months
        stats['monthly_activity'] = [
            {'month': month, 'games': count}
            for month, count in monthly_games.items()
        ]
        
        # Character matchup stats
        matchup_stats = df.groupby(['shayne_character', 'matt_character']).agg({
            'winner': lambda x: (x == 'Shayne').sum(),
            'datetime': 'count'
        }).reset_index()
        matchup_stats.columns = ['shayne_character', 'matt_character', 'shayne_wins', 'total_games']
        matchup_stats['matt_wins'] = matchup_stats['total_games'] - matchup_stats['shayne_wins']
        
        # Get top 5 most played matchups
        top_matchups = matchup_stats.nlargest(5, 'total_games')
        stats['top_matchups'] = top_matchups.to_dict('records')
        
        # Win rate by character for each player
        shayne_win_rates = df.groupby('shayne_character').agg({
            'winner': [lambda x: (x == 'Shayne').mean() * 100, 'count']
        }).round(1).reset_index()
        shayne_win_rates.columns = ['character', 'win_rate', 'games_played']
        shayne_win_rates = shayne_win_rates.sort_values('games_played', ascending=False)
        stats['shayne_character_win_rates'] = shayne_win_rates.to_dict('records')
        
        matt_win_rates = df.groupby('matt_character').agg({
            'winner': [lambda x: (x == 'Matt').mean() * 100, 'count']
        }).round(1).reset_index()
        matt_win_rates.columns = ['character', 'win_rate', 'games_played']
        matt_win_rates = matt_win_rates.sort_values('games_played', ascending=False)
        stats['matt_character_win_rates'] = matt_win_rates.to_dict('records')
        
        return stats

# Initialize data manager
data_manager = GameDataManager('game_results.csv')

@app.route('/')
def home():
    """Render the main page."""
    return render_template('index.html')

@app.route('/log_game', methods=['POST'])
def log_game():
    """Handle game logging POST requests."""
    try:
        data = request.json
        success = data_manager.add_game(data)
        
        if success:
            # Get updated matchup stats
            df = data_manager._load_data()
            matchup_data = df[
                (df['shayne_character'] == data['shayneCharacter']) & 
                (df['matt_character'] == data['mattCharacter'])
            ]
            
            stats = {
                "total_games": len(matchup_data),
                "shayne_wins": len(matchup_data[matchup_data['winner'] == 'Shayne']),
                "matt_wins": len(matchup_data[matchup_data['winner'] == 'Matt']),
                "recent_games": matchup_data.sort_values('datetime', ascending=False)
                                      .head(5)
                                      .to_dict('records')
            }
            
            return jsonify({
                "status": "success",
                "message": "Game logged successfully",
                "stats": stats
            })
        else:
            return jsonify({
                "status": "error",
                "message": "Failed to log game"
            }), 500
            
    except Exception as e:
        logger.error(f"Error in log_game endpoint: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route('/stats')
def stats_page():
    """Render the statistics page."""
    return render_template('stats.html')

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Return basic statistics about the games."""
    try:
        stats = data_manager.get_stats()
        return jsonify({
            "status": "success",
            "data": stats
        })
    except Exception as e:
        logger.error(f"Error in stats endpoint: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route('/recent_games', methods=['GET'])
def get_recent_games():
    """Return the 5 most recent games."""
    try:
        recent_games = data_manager.get_recent_games()
        return jsonify({
            "status": "success",
            "data": recent_games.to_dict('records')
        })
    except Exception as e:
        logger.error(f"Error in recent_games endpoint: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route('/matchup_stats', methods=['GET'])
def get_matchup_stats():
    """Get historical stats for a specific character matchup."""
    shayne_char = request.args.get('shayne_character')
    matt_char = request.args.get('matt_character')
    
    if not shayne_char or not matt_char:
        return jsonify({"error": "Both characters must be specified"}), 400
        
    df = data_manager._load_data()
    
    # Filter for this specific matchup
    matchup_data = df[
        (df['shayne_character'] == shayne_char) & 
        (df['matt_character'] == matt_char)
    ]
    
    if len(matchup_data) == 0:
        return jsonify({
            "total_games": 0,
            "shayne_wins": 0,
            "matt_wins": 0,
            "recent_games": []
        })
    
    stats = {
        "total_games": len(matchup_data),
        "shayne_wins": len(matchup_data[matchup_data['winner'] == 'Shayne']),
        "matt_wins": len(matchup_data[matchup_data['winner'] == 'Matt']),
        "recent_games": matchup_data.sort_values('datetime', ascending=False)
                                  .head(5)
                                  .to_dict('records')
    }
    
    return jsonify(stats)

if __name__ == '__main__':
    app.run(debug=True)