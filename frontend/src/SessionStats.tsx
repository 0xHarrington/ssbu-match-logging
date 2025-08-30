import { useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import CharacterDisplay from './components/CharacterDisplay';

// Import stage images
import bfImage from './assets/stages/bf.avif';
import fdImage from './assets/stages/fd.avif';
import ps2Image from './assets/stages/ps2.avif';
import sbfImage from './assets/stages/sbf.avif';
import tncImage from './assets/stages/tnc.avif';
import kalosImage from './assets/stages/kalos.avif';
import hollowImage from './assets/stages/hollow.avif';
import yoshisImage from './assets/stages/yoshis.avif';
import smashvilleImage from './assets/stages/smashville.avif';

// Stage image mapping
const stageImages: { [key: string]: string } = {
  'Battlefield': bfImage,
  'Small Battlefield': sbfImage,
  'Final Destination': fdImage,
  'Pokemon Stadium 2': ps2Image,
  'Smashville': smashvilleImage,
  'Town & City': tncImage,
  'Kalos Pokemon League': kalosImage,
  'Yoshi\'s Story': yoshisImage,
  'Hollow Bastion': hollowImage,
};

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

interface MatchupStats {
  total_games: number;
  shayne_wins: number;
  matt_wins: number;
  recent_games: Array<{
    datetime: string;
    winner: string;
    stocks_remaining: number;
  }>;
}

export interface SessionStatsProps {
  shayneCharacter?: string;
  mattCharacter?: string;
}

export interface SessionStatsRef {
  refresh: () => void;
}

const SessionStats = forwardRef<SessionStatsRef, SessionStatsProps>(({ shayneCharacter, mattCharacter }, ref) => {
  const [stats, setStats] = useState<SessionStatsData | null>(null);
  const [matchupStats, setMatchupStats] = useState<MatchupStats | null>(null);
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

  const fetchMatchupStats = async () => {
    if (!shayneCharacter || !mattCharacter) {
      setMatchupStats(null);
      return;
    }

    try {
      const res = await fetch(`/matchup_stats?shayne_character=${encodeURIComponent(shayneCharacter)}&matt_character=${encodeURIComponent(mattCharacter)}`);
      const data = await res.json();
      setMatchupStats(data);
    } catch (err: any) {
      console.error('Failed to fetch matchup stats:', err);
    }
  };

  useImperativeHandle(ref, () => ({
    refresh: () => {
      fetchStats();
      fetchMatchupStats();
    },
  }));

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchMatchupStats();
  }, [shayneCharacter, mattCharacter]);

  return (
    <div className="session-stats">
      <h2>Heads-up Stats</h2>
      {loading && <div>Loading...</div>}
      {error && <div className="error">{error}</div>}
      {!loading && !error && stats && (
        <>
          {/* Matchup Stats */}
          {matchupStats && shayneCharacter && mattCharacter && (
            <div className="matchup-stats">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h3 style={{ margin: 0, border: 'none', padding: 0 }}>
                  <CharacterDisplay character={shayneCharacter} /> vs <CharacterDisplay character={mattCharacter} />
                </h3>
                <div className="matchup-total-games">
                  <div className="stat-label">Matchup Games</div>
                  <div className="stat-value">{matchupStats.total_games}</div>
                </div>
              </div>

              <div className="matchup-stats-grid">
                <div className="matchup-player-stats shayne">
                  <div className="stat-value shayne">{matchupStats.shayne_wins}</div>
                  <div className="stat-label">
                    Shayne's Wins ({Math.round((matchupStats.shayne_wins / matchupStats.total_games) * 100) || 0}%)
                  </div>
                  <div className="win-rate-bar">
                    <div 
                      className="win-rate-fill shayne" 
                      style={{ 
                        width: `${(matchupStats.shayne_wins / matchupStats.total_games) * 100}%`,
                        height: '100%',
                        transition: 'width 0.3s ease',
                        backgroundColor: '#d65d0e',
                        boxShadow: '0 1px 2px rgba(214, 93, 14, 0.3)'
                      }}
                    />
                  </div>
                </div>
                <div className="matchup-player-stats matt">
                  <div className="stat-value matt">{matchupStats.matt_wins}</div>
                  <div className="stat-label">
                    Matt's Wins ({Math.round((matchupStats.matt_wins / matchupStats.total_games) * 100) || 0}%)
                  </div>
                  <div className="win-rate-bar">
                    <div 
                      className="win-rate-fill matt" 
                      style={{ 
                        width: `${(matchupStats.matt_wins / matchupStats.total_games) * 100}%`,
                        height: '100%',
                        transition: 'width 0.3s ease',
                        backgroundColor: '#98971a',
                        boxShadow: '0 1px 2px rgba(152, 151, 26, 0.3)'
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Today's Session Stats */}
          <div className="matchup-stats">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h3 style={{ margin: 0, border: 'none', padding: 0 }}>Today's Session</h3>
              <div className="matchup-total-games">
                <div className="stat-label">Total Games</div>
                <div className="stat-value">{stats.total_games}</div>
              </div>
            </div>

            <div className="matchup-stats-grid">
              <div className="matchup-player-stats shayne">
                <div className="stat-value shayne">{stats.shayne_wins}</div>
                <div className="stat-label">
                  Shayne's Wins ({Math.round((stats.shayne_wins / stats.total_games) * 100) || 0}%)
                </div>
                <div className="win-rate-bar">
                  <div 
                    className="win-rate-fill shayne" 
                    style={{ 
                      width: `${(stats.shayne_wins / stats.total_games) * 100}%`,
                      height: '100%',
                      transition: 'width 0.3s ease',
                      backgroundColor: '#d65d0e',
                      boxShadow: '0 1px 2px rgba(214, 93, 14, 0.3)'
                    }}
                  />
                </div>
              </div>
              <div className="matchup-player-stats matt">
                <div className="stat-value matt">{stats.matt_wins}</div>
                <div className="stat-label">
                  Matt's Wins ({Math.round((stats.matt_wins / stats.total_games) * 100) || 0}%)
                </div>
                <div className="win-rate-bar">
                  <div 
                    className="win-rate-fill matt" 
                    style={{ 
                      width: `${(stats.matt_wins / stats.total_games) * 100}%`,
                      height: '100%',
                      transition: 'width 0.3s ease',
                      backgroundColor: '#98971a',
                      boxShadow: '0 1px 2px rgba(152, 151, 26, 0.3)'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Character Usage */}
          <div className="character-stats-grid">
            <h3>Today's Character Usage</h3>
            <div className="character-grid">
              <div className="character-stat-card">
                <h4>Shayne's Characters</h4>
                <div className="character-stat-list" id="shayneCharacters">
                  {Object.entries(stats.shayne_characters).sort(([,a],[,b])=>b-a).map(([char, count]) => (
                    <div className="character-stat-item" key={char}>
                      <CharacterDisplay character={char} />
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
                      <CharacterDisplay character={char} />
                      <span className="character-stat-value matt">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Stage Stats */}
          <div className="stage-stats">
            <h3>Today's Stage Usage</h3>
            <div className="stage-stats-grid" id="stageStats">
              {stats.stage_stats.map(stat => (
                <div 
                  className="stage-stat-card" 
                  key={stat.stage}
                  style={{
                    backgroundImage: stageImages[stat.stage] ? `url(${stageImages[stat.stage]})` : 'none'
                  }}
                >
                  <div className="stage-name">{stat.stage}</div>
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