import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Bar } from 'react-chartjs-2';
import * as echarts from 'echarts';
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
  const matchupRadarRef = useRef<HTMLDivElement>(null);
  const playerComparisonRef = useRef<HTMLDivElement>(null);

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

  // ECharts visualizations
  useEffect(() => {
    if (!data) return;

    // Matchup Radar Chart (Top 5 best + Top 5 worst)
    if (matchupRadarRef.current) {
      const chart = echarts.init(matchupRadarRef.current);
      
      const topMatchups = [...data.best_matchups.slice(0, 5), ...data.worst_matchups.slice(0, 5)];
      const indicators = topMatchups.map(m => ({ name: m.opponent, max: 100 }));
      const values = topMatchups.map(m => m.win_rate);

      chart.setOption({
        backgroundColor: 'transparent',
        tooltip: {
          backgroundColor: '#3c3836',
          borderColor: '#504945',
          textStyle: { color: '#ebdbb2' }
        },
        radar: {
          indicator: indicators,
          shape: 'polygon',
          splitNumber: 4,
          axisName: {
            color: '#a89984',
            fontSize: 10
          },
          splitLine: {
            lineStyle: { color: '#3c3836' }
          },
          splitArea: {
            show: true,
            areaStyle: {
              color: ['rgba(60, 56, 54, 0.1)', 'rgba(60, 56, 54, 0.2)']
            }
          },
          axisLine: {
            lineStyle: { color: '#504945' }
          }
        },
        series: [{
          type: 'radar',
          data: [{
            value: values,
            name: 'Win Rate',
            areaStyle: {
              color: 'rgba(131, 165, 152, 0.3)'
            },
            lineStyle: {
              color: '#83a598',
              width: 2
            },
            itemStyle: {
              color: '#83a598'
            }
          }]
        }]
      });

      return () => chart.dispose();
    }
  }, [data]);

  useEffect(() => {
    if (!data) return;

    // Player Comparison Chart
    if (playerComparisonRef.current) {
      const chart = echarts.init(playerComparisonRef.current);

      chart.setOption({
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          backgroundColor: '#3c3836',
          borderColor: '#504945',
          textStyle: { color: '#ebdbb2' }
        },
        legend: {
          data: ['Shayne', 'Matt'],
          textStyle: { color: '#a89984' },
          top: 0
        },
        grid: { left: '8%', right: '4%', top: '15%', bottom: '10%', containLabel: true },
        xAxis: {
          type: 'category',
          data: ['Games', 'Wins', 'Win Rate'],
          axisLine: { lineStyle: { color: '#504945' } },
          axisLabel: { color: '#a89984', fontSize: 10 }
        },
        yAxis: {
          type: 'value',
          axisLine: { lineStyle: { color: '#504945' } },
          axisLabel: { color: '#a89984', fontSize: 10 },
          splitLine: { lineStyle: { color: '#3c3836', type: 'dashed' } }
        },
        series: [
          {
            name: 'Shayne',
            type: 'bar',
            data: [data.shayne_stats.games, data.shayne_stats.wins, data.shayne_stats.win_rate],
            itemStyle: { color: '#fe8019' }
          },
          {
            name: 'Matt',
            type: 'bar',
            data: [data.matt_stats.games, data.matt_stats.wins, data.matt_stats.win_rate],
            itemStyle: { color: '#b8bb26' }
          }
        ]
      });

      return () => chart.dispose();
    }
  }, [data]);

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
          font: { size: 11 },
          padding: 10,
          boxWidth: 12
        },
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        grid: {
          color: '#3c3836',
          lineWidth: 0.5
        },
        ticks: {
          color: '#a89984',
          font: { size: 10 },
          callback: (value: any) => `${value}%`
        },
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: '#a89984',
          font: { size: 10 },
          maxRotation: 45,
        },
      },
    },
  };

  return (
    <div className="stats-container" style={{ padding: '1.5rem' }}>
      {/* Compact Header */}
      <div style={{
        background: 'var(--bg1)',
        borderRadius: 'var(--card-radius)',
        padding: '1rem',
        border: '1px solid var(--bg-light)',
        marginBottom: '1rem',
        textAlign: 'center'
      }}>
        <Link to="/characters" style={{ 
          color: 'var(--blue)', 
          textDecoration: 'none', 
          fontSize: '0.85rem',
          marginBottom: '0.75rem',
          display: 'inline-block'
        }}>
          ← Back
        </Link>
        
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <CharacterDisplay character={character} hideText={false} />
        </div>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '1rem',
          marginTop: '0.75rem'
        }}>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--blue)' }}>
              {data.total_games}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--fg-light)' }}>Games</div>
          </div>
          <div>
            <div style={{ 
              fontSize: '1.5rem', 
              fontWeight: 'bold', 
              color: data.global_win_rate >= 50 ? 'var(--green)' : 'var(--red)' 
            }}>
              {data.global_win_rate}%
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--fg-light)' }}>Win Rate</div>
          </div>
          <div>
            <div style={{ 
              fontSize: '1.5rem', 
              fontWeight: 'bold', 
              color: data.recent_performance.win_rate >= 50 ? 'var(--green)' : 'var(--red)' 
            }}>
              {Math.round(data.recent_performance.win_rate)}%
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--fg-light)' }}>
              Recent (L{data.recent_performance.games})
            </div>
          </div>
        </div>
      </div>

      {/* Visualizations Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        <div className="card" style={{ padding: '1rem' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: '#fbf1c7' }}>📊 Player Comparison</h3>
          <div ref={playerComparisonRef} style={{ height: '220px', width: '100%' }}></div>
        </div>
        <div className="card" style={{ padding: '1rem' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: '#fbf1c7' }}>🎯 Matchup Radar</h3>
          <div ref={matchupRadarRef} style={{ height: '220px', width: '100%' }}></div>
        </div>
      </div>

      {/* Player Stats - Compact Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '0.75rem',
        marginBottom: '1rem'
      }}>
        <div style={{
          background: 'var(--bg1)',
          borderRadius: 'var(--card-radius)',
          padding: '1rem',
          border: '2px solid #fe8019',
          textAlign: 'center'
        }}>
          <h3 style={{ color: '#fe8019', marginBottom: '0.5rem', fontSize: '1rem' }}>Shayne</h3>
          <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '0.5rem' }}>
            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--fg)' }}>
                {data.shayne_stats.games}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--fg-light)' }}>Games</div>
            </div>
            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--fg)' }}>
                {data.shayne_stats.wins}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--fg-light)' }}>Wins</div>
            </div>
          </div>
          <div style={{ 
            fontSize: '1.5rem', 
            fontWeight: 'bold', 
            color: data.shayne_stats.win_rate >= 50 ? 'var(--green)' : 'var(--red)'
          }}>
            {Math.round(data.shayne_stats.win_rate)}%
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--fg-light)' }}>Win Rate</div>
        </div>

        <div style={{
          background: 'var(--bg1)',
          borderRadius: 'var(--card-radius)',
          padding: '1rem',
          border: '2px solid #b8bb26',
          textAlign: 'center'
        }}>
          <h3 style={{ color: '#b8bb26', marginBottom: '0.5rem', fontSize: '1rem' }}>Matt</h3>
          <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '0.5rem' }}>
            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--fg)' }}>
                {data.matt_stats.games}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--fg-light)' }}>Games</div>
            </div>
            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--fg)' }}>
                {data.matt_stats.wins}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--fg-light)' }}>Wins</div>
            </div>
          </div>
          <div style={{ 
            fontSize: '1.5rem', 
            fontWeight: 'bold', 
            color: data.matt_stats.win_rate >= 50 ? 'var(--green)' : 'var(--red)'
          }}>
            {Math.round(data.matt_stats.win_rate)}%
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--fg-light)' }}>Win Rate</div>
        </div>
      </div>

      {/* Stage Performance - Compact */}
      {data.stage_performance.length > 0 && (
        <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Stage Performance</h2>
          <div style={{ height: '240px', marginBottom: '0.75rem' }}>
            <Bar data={stageChartData} options={chartOptions} />
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '0.5rem'
          }}>
            {data.stage_performance.map((stage) => (
              <div key={stage.stage} style={{
                background: 'var(--bg2)',
                borderRadius: 'var(--card-radius)',
                padding: '0.6rem',
                border: '1px solid var(--bg-light)',
                textAlign: 'center'
              }}>
                <h4 style={{ marginBottom: '0.3rem', fontSize: '0.85rem' }}>{stage.stage}</h4>
                <div style={{ 
                  fontSize: '1.2rem', 
                  fontWeight: 'bold', 
                  color: stage.win_rate >= 50 ? 'var(--green)' : 'var(--red)',
                  marginBottom: '0.2rem'
                }}>
                  {Math.round(stage.win_rate)}%
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--fg-light)' }}>
                  {stage.wins}W-{stage.games - stage.wins}L
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Matchups - Compact Side by Side */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '0.75rem'
      }}>
        {/* Best Matchups */}
        <div style={{
          background: 'var(--bg1)',
          borderRadius: 'var(--card-radius)',
          padding: '1rem',
          border: '1px solid var(--bg-light)'
        }}>
          <h3 style={{ color: 'var(--green)', marginBottom: '0.75rem', fontSize: '1rem' }}>✅ Best Matchups</h3>
          {data.best_matchups.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {data.best_matchups.slice(0, 5).map((matchup) => (
                <div key={matchup.opponent} style={{
                  background: 'var(--bg2)',
                  borderRadius: 'var(--card-radius)',
                  padding: '0.6rem',
                  border: '1px solid var(--bg-light)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <CharacterDisplay character={matchup.opponent} />
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ 
                      fontSize: '1rem', 
                      fontWeight: 'bold', 
                      color: 'var(--green)' 
                    }}>
                      {Math.round(matchup.win_rate)}%
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--fg-light)' }}>
                      {matchup.wins}W-{matchup.losses}L
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--fg-light)', fontStyle: 'italic', fontSize: '0.85rem' }}>
              No data
            </p>
          )}
        </div>

        {/* Worst Matchups */}
        <div style={{
          background: 'var(--bg1)',
          borderRadius: 'var(--card-radius)',
          padding: '1rem',
          border: '1px solid var(--bg-light)'
        }}>
          <h3 style={{ color: 'var(--red)', marginBottom: '0.75rem', fontSize: '1rem' }}>⚠️ Tough Matchups</h3>
          {data.worst_matchups.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {data.worst_matchups.slice(0, 5).map((matchup) => (
                <div key={matchup.opponent} style={{
                  background: 'var(--bg2)',
                  borderRadius: 'var(--card-radius)',
                  padding: '0.6rem',
                  border: '1px solid var(--bg-light)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <CharacterDisplay character={matchup.opponent} />
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ 
                      fontSize: '1rem', 
                      fontWeight: 'bold', 
                      color: 'var(--red)' 
                    }}>
                      {Math.round(matchup.win_rate)}%
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--fg-light)' }}>
                      {matchup.wins}W-{matchup.losses}L
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--fg-light)', fontStyle: 'italic', fontSize: '0.85rem' }}>
              No data
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CharacterDetail;
