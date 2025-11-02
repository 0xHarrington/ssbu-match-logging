import { useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import CharacterDisplay from './components/CharacterDisplay';

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

  const formatTime = (datetime: string) => {
    const date = new Date(datetime);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="recent-matches" style={{ padding: '1rem' }}>
      <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Recent Matches</h2>
      <div className="matches-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {loading && <div style={{ fontSize: '0.85rem', color: '#a89984' }}>Loading...</div>}
        {error && <div className="error" style={{ fontSize: '0.85rem', padding: '0.5rem' }}>{error}</div>}
        {!loading && !error && matches.length === 0 && <div style={{ fontSize: '0.85rem', color: '#a89984' }}>No recent matches.</div>}
        {!loading && !error && matches.map((game, idx) => {
          const isShayneWin = game.winner === 'Shayne';
          return (
            <div 
              key={idx}
              style={{
                background: '#3c3836',
                borderRadius: '8px',
                padding: '0.6rem',
                border: '1px solid #504945',
                borderLeft: `3px solid ${isShayneWin ? '#fe8019' : '#b8bb26'}`,
                transition: 'all 0.2s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateX(2px)';
                e.currentTarget.style.background = '#504945';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.background = '#3c3836';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#fbf1c7', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <CharacterDisplay character={game.shayne_character} />
                    <span style={{ color: '#a89984', fontSize: '0.75rem' }}>vs</span>
                    <CharacterDisplay character={game.matt_character} />
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#a89984', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>{formatTime(game.datetime)}</span>
                    <span>•</span>
                    <span>{game.stage}</span>
                  </div>
                </div>
                <div style={{ 
                  textAlign: 'right',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  gap: '0.2rem'
                }}>
                  <div style={{ 
                    fontSize: '0.75rem', 
                    fontWeight: 'bold', 
                    color: isShayneWin ? '#fe8019' : '#b8bb26',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {game.winner}
                  </div>
                  <div style={{ 
                    fontSize: '0.7rem', 
                    color: '#a89984',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.2rem'
                  }}>
                    {[...Array(game.stocks_remaining)].map((_, i) => (
                      <div key={i} style={{ 
                        width: '6px', 
                        height: '6px', 
                        borderRadius: '50%', 
                        background: isShayneWin ? '#fe8019' : '#b8bb26' 
                      }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default RecentMatches;
