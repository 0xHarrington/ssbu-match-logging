import React, { useState, useEffect, useRef } from 'react';
import { useUser } from './App';

interface Game {
  datetime: string;
  shayne_character: string;
  matt_character: string;
  winner: string;
  stage: string;
}

export interface RecentMatchesRef {
  refresh: () => void;
}

export default function RecentMatches({ ref }: { ref: React.RefObject<RecentMatchesRef> }) {
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useUser();

  const fetchGames = async () => {
    try {
      const res = await fetch('/api/recent_games');
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to fetch recent games');
      setGames(data.games);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
  }, []);

  React.useImperativeHandle(ref, () => ({
    refresh: fetchGames
  }));

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="recent-matches">
      <h2>Recent Matches</h2>
      <div className="matches-list">
        {games.map((game, index) => (
          <div key={index} className="match-item">
            <div className="match-header">
              <span className="match-date">{new Date(game.datetime).toLocaleString()}</span>
              <span className="match-winner">{game.winner} won</span>
            </div>
            <div className="match-details">
              <div className="player">
                <span className="player-name">{user?.username}</span>
                <span className="character">{game.character}</span>
              </div>
              <div className="player">
                <span className="player-name">Matt</span>
                <span className="character">{game.opponent_character}</span>
              </div>
              <div className="match-info">
                <span className="stage">{game.stage}</span>
                <span className="stocks">{game.stocks_remaining} stocks</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 