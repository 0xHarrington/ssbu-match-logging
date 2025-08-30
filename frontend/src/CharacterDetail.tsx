import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Bar } from 'react-chartjs-2';
import CharacterDisplay from './components/CharacterDisplay';

interface MatchupData {
  opponent: string;
  games: number;
  wins: number;
  losses: number;
  win_rate: number;
}

interface StagePerformance {
  stage: string;
  games: number;
  wins: number;
  win_rate: number;
}

interface PlayerStats {
  games: number;
  wins: number;
  win_rate: number;
}

interface RecentPerformance {
  games: number;
  wins: number;
  win_rate: number;
}

interface CharacterStatsData {
  success: boolean;
  character: string;
  total_games: number;
  global_win_rate: number;
  shayne_stats: PlayerStats;
  matt_stats: PlayerStats;
  best_matchups: MatchupData[];
  worst_matchups: MatchupData[];
  stage_performance: StagePerformance[];
  recent_performance: RecentPerformance;
  shayne_matchups: MatchupData[];
  matt_matchups: MatchupData[];
}

const CharacterDetail: React.FC = () => {
  const { character } = useParams<{ character: string }>();
  const [data, setData] = useState<CharacterStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!character) return;

    const fetchData = async () => {
      try {
        const response = await fetch(`/api/characters/${encodeURIComponent(character)}/stats`);
        const result = await response.json();
        if (result.success) {
          setData(result);
        } else {
          setError(result.message || 'Failed to load character data');
        }
      } catch (err) {
        setError('Failed to fetch character details');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [character]);

  if (loading) return <div className="stats-container"><div>Loading character details...</div></div>;
  if (error) return <div className="stats-container"><div className="error">{error}</div></div>;
  if (!data || !character) return null;

  // Chart data for stage performance
  const stageChartData = {
    labels: data.stage_performance.map(stage => stage.stage),
    datasets: [
      {
        label: 'Win Rate (%)',
        data: data.stage_performance.map(stage => stage.win_rate),
        backgroundColor: '#83a598',
        borderColor: '#282828',
        borderWidth: 1,
      },
      {
        label: 'Games Played',
        data: data.stage_performance.map(stage => (stage.games / data.total_games) * 100),
        backgroundColor: '#b8bb26',
        borderColor: '#282828',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#ebdbb2',
        },
      },
      title: {
        display: true,
        text: `${character} Stage Performance`,
        color: '#ebdbb2',
        font: {
          size: 16,
          weight: 'bold' as const,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        grid: {
          color: '#3c3836',
        },
        ticks: {
          color: '#ebdbb2',
        },
      },
      x: {
        grid: {
          color: '#3c3836',
        },
        ticks: {
          color: '#ebdbb2',
          maxRotation: 45,
        },
      },
    },
  };

  return (
    <div className="stats-container">
      {/* Header */}
      <div className="character-header" style={{
        background: 'var(--bg1)',
        borderRadius: 'var(--card-radius)',
        padding: '2rem',
        border: '1px solid var(--bg-light)',
        marginBottom: '2rem',
        textAlign: 'center'
      }}>
        <Link to="/characters" style={{ 
          color: 'var(--blue)', 
          textDecoration: 'none', 
          fontSize: '0.9rem',
          marginBottom: '1rem',
          display: 'inline-block'
        }}>
          ← Back to Character Analytics
        </Link>
        
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <CharacterDisplay character={character} hideText={false} />
        </div>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '1.5rem',
          marginTop: '1.5rem'
        }}>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--blue)' }}>
              {data.total_games}
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--fg-light)' }}>Total Games</div>
          </div>
          <div>
            <div style={{ 
              fontSize: '2rem', 
              fontWeight: 'bold', 
              color: data.global_win_rate >= 50 ? 'var(--green)' : 'var(--red)' 
            }}>
              {data.global_win_rate}%
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--fg-light)' }}>Global Win Rate</div>
          </div>
          <div>
            <div style={{ 
              fontSize: '2rem', 
              fontWeight: 'bold', 
              color: data.recent_performance.win_rate >= 50 ? 'var(--green)' : 'var(--red)' 
            }}>
              {Math.round(data.recent_performance.win_rate)}%
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--fg-light)' }}>
              Recent Form (Last {data.recent_performance.games})
            </div>
          </div>
        </div>
      </div>

      {/* Player Stats Comparison */}
      <section className="stats-section">
        <h2>Player Performance</h2>
        <div className="player-comparison" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1.5rem'
        }}>
          <div className="player-stats-card" style={{
            background: 'var(--bg1)',
            borderRadius: 'var(--card-radius)',
            padding: '1.5rem',
            border: '2px solid #d65d0e',
            textAlign: 'center'
          }}>
            <h3 style={{ color: '#d65d0e', marginBottom: '1rem' }}>Shayne</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--fg)' }}>
                  {data.shayne_stats.games}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--fg-light)' }}>Games</div>
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--fg)' }}>
                  {data.shayne_stats.wins}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--fg-light)' }}>Wins</div>
              </div>
            </div>
            <div style={{ 
              fontSize: '2rem', 
              fontWeight: 'bold', 
              color: data.shayne_stats.win_rate >= 50 ? 'var(--green)' : 'var(--red)',
              marginTop: '1rem'
            }}>
              {Math.round(data.shayne_stats.win_rate)}%
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--fg-light)' }}>Win Rate</div>
          </div>

          <div className="player-stats-card" style={{
            background: 'var(--bg1)',
            borderRadius: 'var(--card-radius)',
            padding: '1.5rem',
            border: '2px solid #98971a',
            textAlign: 'center'
          }}>
            <h3 style={{ color: '#98971a', marginBottom: '1rem' }}>Matt</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--fg)' }}>
                  {data.matt_stats.games}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--fg-light)' }}>Games</div>
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--fg)' }}>
                  {data.matt_stats.wins}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--fg-light)' }}>Wins</div>
              </div>
            </div>
            <div style={{ 
              fontSize: '2rem', 
              fontWeight: 'bold', 
              color: data.matt_stats.win_rate >= 50 ? 'var(--green)' : 'var(--red)',
              marginTop: '1rem'
            }}>
              {Math.round(data.matt_stats.win_rate)}%
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--fg-light)' }}>Win Rate</div>
          </div>
        </div>
      </section>

      {/* Stage Performance Chart */}
      {data.stage_performance.length > 0 && (
        <section className="stats-section">
          <h2>Stage Performance</h2>
          <div className="card">
            <div style={{ height: '400px', marginBottom: '1rem' }}>
              <Bar data={stageChartData} options={chartOptions} />
            </div>
          </div>
        </section>
      )}

      {/* Matchups Analysis */}
      <section className="stats-section">
        <h2>Matchup Analysis</h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '1.5rem'
        }}>
          {/* Best Matchups */}
          <div className="matchup-section" style={{
            background: 'var(--bg1)',
            borderRadius: 'var(--card-radius)',
            padding: '1.5rem',
            border: '1px solid var(--bg-light)'
          }}>
            <h3 style={{ color: 'var(--green)', marginBottom: '1rem' }}>Best Matchups</h3>
            {data.best_matchups.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {data.best_matchups.slice(0, 5).map((matchup, index) => (
                  <div key={matchup.opponent} style={{
                    background: 'var(--bg2)',
                    borderRadius: 'var(--card-radius)',
                    padding: '1rem',
                    border: '1px solid var(--bg-light)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <CharacterDisplay character={matchup.opponent} />
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ 
                          fontSize: '1.2rem', 
                          fontWeight: 'bold', 
                          color: 'var(--green)' 
                        }}>
                          {Math.round(matchup.win_rate)}%
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--fg-light)' }}>
                          {matchup.wins}W - {matchup.losses}L ({matchup.games} games)
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--fg-light)', fontStyle: 'italic' }}>
                No significant matchup data available
              </p>
            )}
          </div>

          {/* Worst Matchups */}
          <div className="matchup-section" style={{
            background: 'var(--bg1)',
            borderRadius: 'var(--card-radius)',
            padding: '1.5rem',
            border: '1px solid var(--bg-light)'
          }}>
            <h3 style={{ color: 'var(--red)', marginBottom: '1rem' }}>Challenging Matchups</h3>
            {data.worst_matchups.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {data.worst_matchups.slice(0, 5).map((matchup, index) => (
                  <div key={matchup.opponent} style={{
                    background: 'var(--bg2)',
                    borderRadius: 'var(--card-radius)',
                    padding: '1rem',
                    border: '1px solid var(--bg-light)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <CharacterDisplay character={matchup.opponent} />
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ 
                          fontSize: '1.2rem', 
                          fontWeight: 'bold', 
                          color: 'var(--red)' 
                        }}>
                          {Math.round(matchup.win_rate)}%
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--fg-light)' }}>
                          {matchup.wins}W - {matchup.losses}L ({matchup.games} games)
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--fg-light)', fontStyle: 'italic' }}>
                No significant matchup data available
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Stage Performance Table */}
      {data.stage_performance.length > 0 && (
        <section className="stats-section">
          <h2>Stage Breakdown</h2>
          <div className="card">
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem'
            }}>
              {data.stage_performance.map((stage, index) => (
                <div key={stage.stage} style={{
                  background: 'var(--bg2)',
                  borderRadius: 'var(--card-radius)',
                  padding: '1rem',
                  border: '1px solid var(--bg-light)',
                  textAlign: 'center'
                }}>
                  <h4 style={{ marginBottom: '0.5rem', fontSize: '1rem' }}>{stage.stage}</h4>
                  <div style={{ 
                    fontSize: '1.5rem', 
                    fontWeight: 'bold', 
                    color: stage.win_rate >= 50 ? 'var(--green)' : 'var(--red)',
                    marginBottom: '0.25rem'
                  }}>
                    {Math.round(stage.win_rate)}%
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--fg-light)' }}>
                    {stage.wins}W - {stage.games - stage.wins}L ({stage.games} games)
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default CharacterDetail;
