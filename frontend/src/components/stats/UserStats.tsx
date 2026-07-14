import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import styles from './UserStats.module.css';
import CharacterDisplay from '../CharacterDisplay';
import { LoadingState, ErrorState } from '../Feedback';
import { stageImages } from '../../lib/stages';
import {
  ActiveDot,
  Bar,
  BarChart,
  DitherHeatmap,
  Legend,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
  type DitherColor,
  type DitherHeatmapCell,
} from '../dither';

interface CharacterStats {
  character: string;
  winRate: number;
  totalGames: number;
}

interface StageStats {
  stage: string;
  winRate: number;
  totalGames: number;
  wins: number;
  losses: number;
}

interface MostFacedCharacter {
  character: string;
  games: number;
  wins: number;
}

interface UserStatsData {
  overallWinRate: number;
  totalGames: number;
  avgStocksWhenWinning: number;
  currentStreak: {
    count: number;
    type: 'win' | 'loss' | null;
  };
  maxStreak: {
    count: number;
    type: 'win' | 'loss' | null;
  };
  recentPerformance: {
    games: number;
    winRate: number;
  };
  characterStats: CharacterStats[];
  stageStats: StageStats[];
  mostFacedCharacters: MostFacedCharacter[];
}

interface TimelineInfo {
  game_numbers: number[];
  win_rates: number[];
  date_ranges?: string[];
}

interface HeatmapPoint {
  hour: number;
  day: number;
  win_rate: number;
  game_count: number;
}

interface TimelineRow {
  game: string;
  label: string;
  winRate: number;
}

interface CharacterRow {
  character: string;
  winRate: number;
  usage: number;
}

// Seeded random number generator for consistent simulated data
function seededRandom(seed: number) {
  let value = seed;
  return function() {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

// Simulated fallback timeline that trends around the overall win rate
function buildSimulatedTimeline(
  seed: number,
  totalGames: number,
  overallWinRate: number
): TimelineRow[] {
  const random = seededRandom(seed);
  const numPoints = Math.min(100, Math.floor(totalGames / 20));
  const rows: TimelineRow[] = [];
  let currentValue = overallWinRate + (random() - 0.5) * 20;

  for (let i = 0; i < numPoints; i++) {
    // Add some randomness but keep it smooth
    const change = (random() - 0.5) * 15;
    currentValue = Math.max(20, Math.min(80, currentValue + change));

    // Gradually pull towards overall win rate for realism
    currentValue = currentValue * 0.92 + overallWinRate * 0.08;

    rows.push({
      game: `${i + 1}`,
      label: `Window ${i + 1}`,
      winRate: parseFloat(currentValue.toFixed(1)),
    });
  }

  return rows;
}

// Simulated fallback heatmap with realistic gaming patterns (evening-heavy)
function buildSimulatedHeatmapCells(seed: number): DitherHeatmapCell[] {
  const random = seededRandom(seed);
  const cells: DitherHeatmapCell[] = [];

  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      let baseValue = random() * 40;
      let gameCount = Math.floor(random() * 5);

      if (h >= 18 && h <= 23) {
        baseValue += 40; // Evening boost
        gameCount += Math.floor(random() * 20) + 5;
      } else if (h >= 12 && h < 18) {
        baseValue += 20; // Afternoon boost
        gameCount += Math.floor(random() * 10) + 2;
      } else if (h >= 0 && h < 6) {
        baseValue -= 20; // Late night penalty
        gameCount = Math.floor(random() * 3);
      }

      const winRate = Math.max(0, Math.min(100, baseValue + random() * 30));
      cells.push({
        day: d,
        hour: h,
        winRate: gameCount === 0 ? null : Math.round(winRate),
        games: gameCount,
      });
    }
  }

  return cells;
}

export const UserStats: React.FC = () => {
  const { username = '' } = useParams<{ username: string }>();
  const [stats, setStats] = useState<UserStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [heatmapData, setHeatmapData] = useState<HeatmapPoint[] | null>(null);
  const [usingSimulatedData, setUsingSimulatedData] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);
  const [timelineData, setTimelineData] = useState<TimelineInfo | null>(null);
  const [usingSimulatedTimeline, setUsingSimulatedTimeline] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!username) {
      setError('Username is required');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/users/${username}/stats`);
      if (!response.ok) {
        throw new Error('Failed to fetch user stats');
      }
      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Fetch timeline data
  useEffect(() => {
    if (!username) return;

    const fetchTimelineData = async () => {
      try {
        const response = await fetch(`/api/users/${username}/win-rate-timeline`);
        if (!response.ok) {
          throw new Error('Failed to fetch timeline data');
        }
        const result = await response.json();
        
        if (result.success && result.data) {
          setTimelineData(result.data);
          setUsingSimulatedTimeline(false);
        } else {
          setUsingSimulatedTimeline(true);
        }
      } catch (err) {
        console.error('Error fetching timeline data:', err);
        setUsingSimulatedTimeline(true);
      }
    };

    fetchTimelineData();
  }, [username]);

  // Fetch heatmap data
  useEffect(() => {
    if (!username) return;

    const fetchHeatmapData = async () => {
      try {
        const url = selectedCharacter 
          ? `/api/users/${username}/heatmap?character=${encodeURIComponent(selectedCharacter)}`
          : `/api/users/${username}/heatmap`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to fetch heatmap data');
        }
        const result = await response.json();
        
        if (result.success && result.data && result.data.length > 0) {
          setHeatmapData(result.data);
          setUsingSimulatedData(false);
        } else {
          // No real data available, use seeded random
          setUsingSimulatedData(true);
        }
      } catch (err) {
        console.error('Error fetching heatmap data:', err);
        setUsingSimulatedData(true);
      }
    };

    fetchHeatmapData();
  }, [username, selectedCharacter]);

  // Early returns after all hooks
  if (loading) return <LoadingState label="Loading stats..." />;
  if (error) return <ErrorState message={error} onRetry={fetchStats} />;
  if (!stats) return <ErrorState message="No stats available" onRetry={fetchStats} />;

  // Calculate win rate trend (comparing recent to overall)
  const winRateTrend = stats.recentPerformance.winRate - stats.overallWinRate;
  const trendDirection = winRateTrend >= 0 ? 'positive' : 'negative';
  
  // Get most played character
  const mostPlayedChar = stats.characterStats[0];
  const bestChar = stats.characterStats
    .filter(char => char.totalGames >= 20) // Minimum 20 games for significance
    .sort((a, b) => b.winRate - a.winRate)[0];

  const openPlayerTearsheet = () => {
    window.open(`/player-tearsheet?username=${username}`, '_blank');
  };

  // Chart data — dither-kit rows
  const playerColor: DitherColor = username === 'Shayne' ? 'orange' : 'green';

  const timelineRows: TimelineRow[] =
    timelineData && !usingSimulatedTimeline
      ? timelineData.game_numbers.map((n, i) => ({
          game: `${n}`,
          label: timelineData.date_ranges?.[i] ?? `Window ${n}`,
          winRate: timelineData.win_rates[i],
        }))
      : buildSimulatedTimeline(
          (username?.charCodeAt(0) || 0) * 1000,
          stats.totalGames,
          stats.overallWinRate
        );

  const heatmapCells: DitherHeatmapCell[] =
    heatmapData && !usingSimulatedData
      ? heatmapData.map(point => ({
          day: point.day,
          hour: point.hour,
          winRate: point.game_count === 0 ? null : point.win_rate,
          games: point.game_count,
        }))
      : buildSimulatedHeatmapCells(username.charCodeAt(0) * 1000);

  const characterRows: CharacterRow[] = stats.characterStats.map(stat => ({
    character: stat.character,
    winRate: stat.winRate,
    usage: stats.totalGames > 0 ? (stat.totalGames / stats.totalGames) * 100 : 0,
  }));

  return (
    <div className={styles['stats-container']}>
      {/* Compact Header */}
      <div className={styles['stats-header']}>
        <div className={styles['stats-header-content']}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h1 style={{ fontSize: '1.8rem', margin: 0 }}>{username}'s Dashboard</h1>
            <button
              onClick={openPlayerTearsheet}
              style={{
                padding: '0.6rem 1.2rem',
                background: '#83a598',
                color: '#282828',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 2px 8px rgba(131, 165, 152, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#a3c0b8';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(131, 165, 152, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#83a598';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(131, 165, 152, 0.3)';
              }}
            >
              📊 View Tearsheet
            </button>
          </div>
          <p className={styles['stats-subtitle']} style={{ fontSize: '0.95rem', margin: '0.5rem 0' }}>
            {stats.totalGames} matches • <span className={styles['player-tag']}>{stats.overallWinRate.toFixed(1)}% WR</span>
          </p>
          
          <div className={styles['stats-summary']} style={{ gap: '1rem', marginTop: '1rem', paddingTop: '1rem' }}>
            <div className={styles['summary-item']} style={{ padding: '0.25rem' }}>
              <div className={styles['summary-label']} style={{ fontSize: '0.75rem', marginBottom: '0.3rem' }}>Most Played</div>
              <div className={styles['summary-value']} style={{ fontSize: '1.1rem' }}>
                <div className={styles['character-name']}>
                  {mostPlayedChar && <CharacterDisplay character={mostPlayedChar.character} />}
                </div>
                <div className={styles['stat-subtitle']} style={{ fontSize: '0.75rem' }}>
                  {mostPlayedChar ? `${mostPlayedChar.totalGames} games` : 'N/A'}
                </div>
              </div>
            </div>
            
            <div className={styles['summary-item']} style={{ padding: '0.25rem' }}>
              <div className={styles['summary-label']} style={{ fontSize: '0.75rem', marginBottom: '0.3rem' }}>Best Character</div>
              <div className={styles['summary-value']} style={{ fontSize: '1.1rem' }}>
                <div className={styles['character-name']}>
                  {bestChar && <CharacterDisplay character={bestChar.character} />}
                </div>
                <div className={styles['stat-subtitle']} style={{ fontSize: '0.75rem' }}>
                  {bestChar ? `${bestChar.winRate.toFixed(1)}%` : 'N/A'}
                </div>
              </div>
            </div>

            <div className={styles['summary-item']} style={{ padding: '0.25rem' }}>
              <div className={styles['summary-label']} style={{ fontSize: '0.75rem', marginBottom: '0.3rem' }}>Streak</div>
              <div className={`${styles['summary-value']} ${styles[stats.currentStreak.type || '']}`} style={{ fontSize: '1.1rem' }}>
                {stats.currentStreak.count} {stats.currentStreak.type}s
                <div className={styles['stat-subtitle']} style={{ fontSize: '0.75rem' }}>
                  Max: {stats.maxStreak.count}
                </div>
              </div>
            </div>
            
            <div className={styles['summary-item']} style={{ padding: '0.25rem' }}>
              <div className={styles['summary-label']} style={{ fontSize: '0.75rem', marginBottom: '0.3rem' }}>Recent Form</div>
              <div className={`${styles['summary-value']} ${styles[trendDirection]}`} style={{ fontSize: '1.1rem' }}>
                {stats.recentPerformance.winRate.toFixed(1)}%
                <div className={styles['stat-subtitle']} style={{ fontSize: '0.75rem' }}>
                  Last {stats.recentPerformance.games}
                </div>
              </div>
            </div>

            <div className={styles['summary-item']} style={{ padding: '0.25rem' }}>
              <div className={styles['summary-label']} style={{ fontSize: '0.75rem', marginBottom: '0.3rem' }}>Avg Stocks</div>
              <div className={styles['summary-value']} style={{ fontSize: '1.1rem' }}>
                {stats.avgStocksWhenWinning.toFixed(2)}
                <div className={styles['stat-subtitle']} style={{ fontSize: '0.75rem' }}>
                  When winning
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Visualizations */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        <div className="card" style={{ padding: '1rem' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: '#fbf1c7' }}>
            📈 Win Rate Trend
            {usingSimulatedTimeline && (
              <span style={{ fontSize: '0.7rem', color: '#fabd2f', marginLeft: '0.5rem', fontWeight: 'normal' }}>
                ⚠️ Using simulated data
              </span>
            )}
          </h3>
          <div style={{ height: '220px', width: '100%' }}>
            <LineChart
              data={timelineRows}
              config={{ winRate: { label: '20-Game Win Rate', color: playerColor } }}
            >
              <XAxis dataKey="game" />
              <YAxis tickFormatter={(value) => `${value}%`} />
              <Tooltip
                labelKey="label"
                valueFormatter={(value) => `${value.toFixed(1)}%`}
              />
              <Line dataKey="winRate" variant="gradient">
                <ActiveDot variant="colored-border" />
              </Line>
            </LineChart>
          </div>
        </div>
        <div className="card" style={{ padding: '1rem' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: '#fbf1c7' }}>
            🔥 Performance Heatmap (24hr)
            {usingSimulatedData && (
              <span style={{ fontSize: '0.7rem', color: '#fabd2f', marginLeft: '0.5rem', fontWeight: 'normal' }}>
                ⚠️ Using simulated data
              </span>
            )}
          </h3>
          <div style={{ fontSize: '0.7rem', color: '#a89984', marginBottom: '0.5rem', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <span>Color = Win Rate (🔴 Low → 🟢 High)</span>
            <span>Density = Games Played (Sparser = Fewer, Denser = More)</span>
          </div>
          <div style={{ width: '100%' }}>
            <DitherHeatmap cells={heatmapCells} height={260} metricLabel="win rate" />
          </div>
          
          {/* Character Filter */}
          {stats && stats.characterStats && stats.characterStats.length > 0 && (
            <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #504945' }}>
              <div style={{ fontSize: '0.75rem', color: '#a89984', marginBottom: '0.5rem', textAlign: 'center' }}>
                Filter by Character:
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setSelectedCharacter(null)}
                  style={{
                    padding: '0.4rem 0.6rem',
                    background: selectedCharacter === null ? '#83a598' : '#3c3836',
                    color: selectedCharacter === null ? '#282828' : '#ebdbb2',
                    border: '1px solid #504945',
                    borderRadius: '6px',
                    fontSize: '0.7rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontWeight: selectedCharacter === null ? 'bold' : 'normal'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedCharacter !== null) e.currentTarget.style.background = '#504945';
                  }}
                  onMouseLeave={(e) => {
                    if (selectedCharacter !== null) e.currentTarget.style.background = '#3c3836';
                  }}
                >
                  All Characters
                </button>
                {stats.characterStats.slice(0, 8).map((charStat) => (
                  <button
                    key={charStat.character}
                    onClick={() => setSelectedCharacter(charStat.character)}
                    style={{
                      padding: '0.3rem',
                      background: selectedCharacter === charStat.character ? '#83a598' : '#3c3836',
                      border: selectedCharacter === charStat.character ? '2px solid #83a598' : '1px solid #504945',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedCharacter !== charStat.character) e.currentTarget.style.background = '#504945';
                    }}
                    onMouseLeave={(e) => {
                      if (selectedCharacter !== charStat.character) e.currentTarget.style.background = '#3c3836';
                    }}
                    title={`${charStat.character} (${charStat.totalGames} games, ${charStat.winRate.toFixed(1)}% WR)`}
                  >
                    <CharacterDisplay character={charStat.character} hideText={true} />
                    <span style={{ fontSize: '0.65rem', color: selectedCharacter === charStat.character ? '#282828' : '#a89984' }}>
                      {charStat.totalGames}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Character & Stage Performance - Side by Side */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1rem' }}>
        {/* Character Performance */}
        <div className="card" style={{ padding: '1rem' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>👊 Character Performance</h2>
          <div style={{ height: '280px', marginBottom: '0.75rem' }}>
            <BarChart
              data={characterRows}
              config={{
                winRate: { label: 'Win Rate (%)', color: playerColor },
                usage: { label: 'Usage (%)', color: 'blue' },
              }}
            >
              <XAxis dataKey="character" />
              <YAxis tickFormatter={(value) => `${value}%`} />
              <Legend />
              <Tooltip
                labelKey="character"
                valueFormatter={(value) => `${value.toFixed(1)}%`}
              />
              <Bar dataKey="winRate" variant="gradient" />
              <Bar dataKey="usage" variant="gradient" />
            </BarChart>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
            {stats.characterStats.slice(0, 4).map((stat) => (
              <div key={stat.character} style={{
                background: '#32302f',
                borderRadius: '6px',
                padding: '0.5rem',
                border: '1px solid #3c3836'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                  <CharacterDisplay character={stat.character} hideText={true} iconClassName={styles['character-icon']} />
                  <h4 style={{ fontSize: '0.85rem', margin: 0 }}>{stat.character}</h4>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                  <span style={{ color: '#a89984' }}>WR:</span>
                  <span style={{ color: username === 'Shayne' ? '#fe8019' : '#b8bb26', fontWeight: 'bold' }}>
                    {stat.winRate.toFixed(1)}%
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                  <span style={{ color: '#a89984' }}>Games:</span>
                  <span style={{ color: '#ebdbb2' }}>{stat.totalGames}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stage Performance */}
        <div className="card" style={{ padding: '1rem' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>🎯 Stage Performance</h2>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', 
            gap: '0.75rem' 
          }}>
            {stats.stageStats
              .filter(stat => stat.stage !== 'No Stage' && stat.stage !== 'Northern Cave')
              .map((stat) => {
              const winRate = Math.round(stat.winRate);
              const color = winRate >= 60 ? '#b8bb26' : 
                           winRate >= 50 ? '#83a598' : 
                           winRate >= 40 ? '#fe8019' : '#fb4934';
              
              return (
                <div 
                  key={stat.stage}
                  style={{
                    backgroundImage: stageImages[stat.stage] ? `url(${stageImages[stat.stage]})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    borderRadius: '12px',
                    padding: '1rem',
                    minHeight: '100px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                    overflow: 'hidden',
                    border: '2px solid #504945',
                    transition: 'all 0.2s',
                    cursor: 'default'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.65)',
                    zIndex: 1,
                  }} />
                  <div style={{ 
                    position: 'relative',
                    zIndex: 2,
                    fontSize: '0.85rem',
                    color: '#fbf1c7',
                    fontWeight: 'bold',
                    textShadow: '0 2px 4px rgba(0,0,0,0.9)',
                    marginBottom: '0.5rem'
                  }}>
                    {stat.stage}
                  </div>
                  <div style={{
                    position: 'relative',
                    zIndex: 2
                  }}>
                    <div style={{ 
                      fontSize: '2rem',
                      fontWeight: 'bold',
                      color: color,
                      textShadow: '0 2px 4px rgba(0,0,0,0.9)',
                      lineHeight: 1
                    }}>
                      {winRate}%
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#a89984',
                      textShadow: '0 2px 4px rgba(0,0,0,0.9)',
                      marginTop: '0.25rem'
                    }}>
                      {stat.wins}W-{stat.losses}L ({stat.totalGames}g)
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Most Faced Characters */}
      {stats.mostFacedCharacters.length > 0 && (
        <div className="card" style={{ padding: '1rem', marginTop: '1rem' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>🤺 Most Faced Opponents</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.5rem' }}>
            {stats.mostFacedCharacters.slice(0, 6).map((opponent) => (
              <div key={opponent.character} style={{
                background: '#32302f',
                borderRadius: '6px',
                padding: '0.6rem',
                border: '1px solid #3c3836',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <CharacterDisplay character={opponent.character} hideText={true} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#ebdbb2' }}>{opponent.character}</div>
                  <div style={{ fontSize: '0.7rem', color: '#a89984' }}>
                    {opponent.wins}W-{opponent.games - opponent.wins}L ({opponent.games} games)
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: opponent.wins / opponent.games >= 0.5 ? '#b8bb26' : '#fb4934' }}>
                    {((opponent.wins / opponent.games) * 100).toFixed(0)}% WR
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}; 