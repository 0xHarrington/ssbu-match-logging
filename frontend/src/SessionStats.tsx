import { useEffect, useState, forwardRef, useImperativeHandle } from 'react';

interface CharacterUsage {
  [character: string]: number;
}

interface StageStat {
  stage: string;
  count: number;
}

interface SessionStatsData {
  total_games: number;
  shayne_wins: number;
  matt_wins: number;
  shayne_characters: CharacterUsage;
  matt_characters: CharacterUsage;
  stage_stats: StageStat[];
}

export interface SessionStatsRef {
  refresh: () => void;
}

const SessionStats = forwardRef<SessionStatsRef>((props, ref) => {
  const [stats, setStats] = useState<SessionStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/session_stats');
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to load session stats');
      setStats(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useImperativeHandle(ref, () => ({
    refresh: fetchStats,
  }));

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="session-stats">
      <h2>Today's Session Stats</h2>
      {loading && <div>Loading...</div>}
      {error && <div className="error">{error}</div>}
      {!loading && !error && stats && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value" id="totalGames">{stats.total_games}</div>
              <div className="stat-label">Total Games</div>
            </div>
            <div className="stat-card">
              <div className="stat-value shayne" id="shayneWins">{stats.shayne_wins}</div>
              <div className="stat-label">Shayne Wins</div>
            </div>
            <div className="stat-card">
              <div className="stat-value matt" id="mattWins">{stats.matt_wins}</div>
              <div className="stat-label">Matt Wins</div>
            </div>
          </div>
          <div className="character-stats">
            <h3>Character Usage</h3>
            <div className="character-grid">
              <div className="character-stat-card">
                <h4>Shayne's Characters</h4>
                <div className="character-stat-list" id="shayneCharacters">
                  {Object.entries(stats.shayne_characters).sort(([,a],[,b])=>b-a).map(([char, count]) => (
                    <div className="character-stat-item" key={char}>
                      <span className="character-stat-name">{char}</span>
                      <span className="character-stat-value shayne">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="character-stat-card">
                <h4>Matt's Characters</h4>
                <div className="character-stat-list" id="mattCharacters">
                  {Object.entries(stats.matt_characters).sort(([,a],[,b])=>b-a).map(([char, count]) => (
                    <div className="character-stat-item" key={char}>
                      <span className="character-stat-name">{char}</span>
                      <span className="character-stat-value matt">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="stage-stats">
            <h3>Stage Usage</h3>
            <div className="stage-stats-grid" id="stageStats">
              {stats.stage_stats.map(stat => (
                <div className="stage-stat-card" key={stat.stage}>
                  <div className="stage-stat-name">{stat.stage}</div>
                  <div className="stage-stat-value">{stat.count}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
});

export default SessionStats; 