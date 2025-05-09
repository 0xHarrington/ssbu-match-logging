import React, { useState, useEffect, useRef } from 'react';
import { useUser } from './App';

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

export default function SessionStats({ ref }: { ref: React.RefObject<SessionStatsRef> }) {
  const [stats, setStats] = useState<SessionStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useUser();

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/session_stats');
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to fetch session stats');
      setStats(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  React.useImperativeHandle(ref, () => ({
    refresh: fetchStats
  }));

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!stats) return <div>No stats available</div>;

  return (
    <div className="session-stats">
      <h2>Session Stats</h2>
      <div className="stats-grid">
        <div className="stat-item">
          <h3>Total Games</h3>
          <p>{stats.total_games}</p>
        </div>
        <div className="stat-item">
          <h3>{user?.username} Wins</h3>
          <p>{stats.shayne_wins}</p>
        </div>
        <div className="stat-item">
          <h3>Matt Wins</h3>
          <p>{stats.matt_wins}</p>
        </div>
      </div>
      <div className="character-stats">
        <h3>Character Usage</h3>
        <div className="character-grid">
          <div className="character-section">
            <h4>{user?.username}</h4>
            <ul>
              {Object.entries(stats.shayne_characters).map(([char, count]) => (
                <li key={char}>
                  <span className="character-name">{char}</span>
                  <span className="character-count">{count}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="character-section">
            <h4>Matt</h4>
            <ul>
              {Object.entries(stats.matt_characters).map(([char, count]) => (
                <li key={char}>
                  <span className="character-name">{char}</span>
                  <span className="character-count">{count}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <div className="stage-stats">
        <h3>Stage Usage</h3>
        <ul>
          {stats.stage_stats.map((stage: any) => (
            <li key={stage.stage}>
              <span className="stage-name">{stage.stage}</span>
              <span className="stage-count">{stage.count}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
} 