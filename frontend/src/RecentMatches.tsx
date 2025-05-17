import { useEffect, useState, forwardRef, useImperativeHandle } from 'react';

interface Game {
  datetime: string;
  shayne_character: string;
  matt_character: string;
  winner: string;
  stage: string;
  stocks_remaining: number;
}

export interface RecentMatchesRef {
  refresh: () => void;
}

const RecentMatches = forwardRef<RecentMatchesRef>((props, ref) => {
  const [matches, setMatches] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMatches = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/recent_games');
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to load recent matches');
      setMatches(data.games);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useImperativeHandle(ref, () => ({
    refresh: fetchMatches,
  }));

  useEffect(() => {
    fetchMatches();
  }, []);

  return (
    <div className="recent-matches">
      <h2>Recent Matches</h2>
      <div className="matches-list" id="recentMatches">
        {loading && <div>Loading...</div>}
        {error && <div className="error">{error}</div>}
        {!loading && !error && matches.length === 0 && <div>No recent matches.</div>}
        {!loading && !error && matches.map((game, idx) => {
          // Format date as in vanilla app
          const date = new Date(game.datetime);
          const options: Intl.DateTimeFormatOptions = {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            hour12: true
          };
          const formattedDate = date.toLocaleString('en-US', options);
          return (
            <div className="match-item" key={idx}>
              <div className="match-info">
                <div className="match-characters">
                  {game.shayne_character} vs {game.matt_character}
                </div>
                <div className="match-details">
                  {formattedDate} • {game.stage}
                </div>
              </div>
              <div className={`match-winner ${game.winner.toLowerCase()}`} style={{
                background: `linear-gradient(to right, ${game.winner === 'Shayne' ? 'rgba(214, 93, 14, 0.2)' : 'rgba(152, 151, 26, 0.2)'} ${(game.stocks_remaining / 3) * 100}%, transparent ${(game.stocks_remaining / 3) * 100}%)`
              }}>
                <div className="winner-text">{game.winner} wins</div>
                <div className="stocks-remaining">{game.stocks_remaining} stocks</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default RecentMatches; 