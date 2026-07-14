import { useCallback, useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import html2canvas from 'html2canvas';
import CharacterDisplay from './components/CharacterDisplay';
import {
  ActiveDot,
  DitherHeatmap,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
  type DitherColor,
  type DitherHeatmapCell,
} from './components/dither';
import { LoadingState, ErrorState } from './components/Feedback';
import { stageImages } from './lib/stages';

interface CharacterUsage {
  character: string;
  games: number;
  wins: number;
  win_rate: number;
}

interface StageStat {
  stage: string;
  games: number;
  wins: number;
  win_rate: number;
}

interface Matchup {
  opponent_character: string;
  games: number;
  wins: number;
  losses: number;
  win_rate: number;
}

interface TearsheetData {
  success: boolean;
  username: string;
  opponent: string;
  overall_stats: {
    total_games: number;
    wins: number;
    losses: number;
    win_rate: number;
    avg_stocks_when_winning: number;
  };
  streaks: {
    current_streak: {
      count: number;
      type: string | null;
    };
    max_win_streak: number;
  };
  recent_form: {
    last_100: {
      wins: number;
      games: number;
      win_rate: number;
    };
  };
  dominance: {
    three_stock_wins: number;
    two_stock_wins: number;
    two_stock_rate: number;
  };
  character_usage: CharacterUsage[];
  stage_stats: StageStat[];
  best_matchups: Matchup[];
  worst_matchups: Matchup[];
}

interface TimelineData {
  success: boolean;
  data?: {
    game_numbers: number[];
    win_rates: number[];
    date_ranges?: string[];
  };
  game_numbers?: number[];
  win_rates?: number[];
  date_ranges?: string[];
}

interface HeatmapDataPoint {
  hour: number;
  day: number;
  win_rate: number;
  game_count: number;
}

interface HeatmapData {
  success: boolean;
  data: HeatmapDataPoint[];
  total_games: number;
}

interface TimelineRow {
  game: string;
  label: string;
  winRate: number;
}

function PlayerTearsheet() {
  const [searchParams] = useSearchParams();
  const username = searchParams.get('username') || 'Shayne';
  
  const [data, setData] = useState<TearsheetData | null>(null);
  const [timelineData, setTimelineData] = useState<TimelineData | null>(null);
  const [heatmapData, setHeatmapData] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const tearsheetRef = useRef<HTMLDivElement>(null);

  // Determine player colors (hex for text styling, palette name for charts)
  const playerColor = username === 'Shayne' ? '#fe8019' : '#b8bb26';
  const opponentColor = username === 'Shayne' ? '#b8bb26' : '#fe8019';
  const playerChartColor: DitherColor = username === 'Shayne' ? 'orange' : 'green';

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tearsheetRes, timelineRes, heatmapRes] = await Promise.all([
        fetch(`/api/users/${username}/tearsheet`),
        fetch(`/api/users/${username}/win-rate-timeline`),
        fetch(`/api/users/${username}/heatmap`)
      ]);
      
      const tearsheetResult = await tearsheetRes.json();
      const timelineResult = await timelineRes.json();
      const heatmapResult = await heatmapRes.json();
      
      if (!tearsheetResult.success) {
        throw new Error(tearsheetResult.message || 'Failed to load player stats');
      }
      
      setData(tearsheetResult);
      if (timelineResult.success) setTimelineData(timelineResult);
      if (heatmapResult.success) setHeatmapData(heatmapResult);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Chart data — dither-kit rows (handle both nested and flat timeline shapes)
  const timelineInfo = timelineData?.data ?? timelineData;
  const timelineRows: TimelineRow[] =
    timelineInfo?.game_numbers && timelineInfo.win_rates
      ? timelineInfo.game_numbers.map((n, i) => ({
          game: `${n}`,
          label: timelineInfo.date_ranges?.[i] ?? `Window ${n}`,
          winRate: timelineInfo.win_rates?.[i] ?? 0,
        }))
      : [];

  const heatmapCells: DitherHeatmapCell[] = Array.isArray(heatmapData?.data)
    ? heatmapData.data.map(point => ({
        day: point.day,
        hour: point.hour,
        winRate: point.game_count === 0 ? null : point.win_rate,
        games: point.game_count,
      }))
    : [];

  const generatePNG = async () => {
    if (!tearsheetRef.current) return;
    
    setGenerating(true);
    try {
      const canvas = await html2canvas(tearsheetRef.current, {
        backgroundColor: '#282828',
        scale: 2,
        logging: false,
        useCORS: true,
      });
      
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          const date = new Date().toISOString().split('T')[0];
          link.download = `${username}-stats-${date}.png`;
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);
        }
      });
    } catch (err) {
      console.error('Failed to generate PNG:', err);
      alert('Failed to generate PNG. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    if (!tearsheetRef.current) return;
    
    setGenerating(true);
    try {
      const canvas = await html2canvas(tearsheetRef.current, {
        backgroundColor: '#282828',
        scale: 2,
        logging: false,
        useCORS: true,
      });
      
      canvas.toBlob(async (blob) => {
        if (blob) {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ]);
            alert('Player stats copied to clipboard!');
          } catch (err) {
            console.error('Failed to copy to clipboard:', err);
            alert('Failed to copy to clipboard. Try downloading instead.');
          }
        }
      });
    } catch (err) {
      console.error('Failed to generate image:', err);
      alert('Failed to generate image. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: '#282828', 
        color: '#ebdbb2',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem'
      }}>
        <LoadingState label="Loading player stats..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: '#282828', 
        color: '#ebdbb2',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem'
      }}>
        <ErrorState message={error || 'Failed to load player stats'} onRetry={fetchData} />
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#1d2021', 
      color: '#ebdbb2',
      padding: '2rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '2rem'
    }}>
      {/* Action Buttons */}
      <div style={{ 
        display: 'flex', 
        gap: '1rem',
        position: 'sticky',
        top: '1rem',
        zIndex: 100,
        background: '#282828',
        padding: '1rem',
        borderRadius: '12px',
        border: '1px solid #504945',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
      }}>
        <button
          onClick={copyToClipboard}
          disabled={generating}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#83a598',
            color: '#282828',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: 'bold',
            cursor: generating ? 'not-allowed' : 'pointer',
            opacity: generating ? 0.6 : 1,
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => !generating && (e.currentTarget.style.background = '#a3c0b8')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#83a598')}
        >
          {generating ? 'Generating...' : '📋 Copy to Clipboard'}
        </button>
        <button
          onClick={generatePNG}
          disabled={generating}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#b8bb26',
            color: '#282828',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: 'bold',
            cursor: generating ? 'not-allowed' : 'pointer',
            opacity: generating ? 0.6 : 1,
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => !generating && (e.currentTarget.style.background = '#d8db46')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#b8bb26')}
        >
          {generating ? 'Generating...' : '💾 Download PNG'}
        </button>
        <button
          onClick={() => window.close()}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#504945',
            color: '#ebdbb2',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#665c54')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#504945')}
        >
          ✕ Close
        </button>
      </div>

      {/* Tearsheet */}
      <div 
        ref={tearsheetRef}
        style={{
          width: '1000px',
          background: '#282828',
          borderRadius: '16px',
          padding: '2.5rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          border: '2px solid #504945'
        }}
      >
        {/* Header */}
        <div style={{ 
          textAlign: 'center', 
          marginBottom: '2rem',
          borderBottom: '2px solid #504945',
          paddingBottom: '1.5rem'
        }}>
          <h1 style={{ 
            fontSize: '2.5rem', 
            fontWeight: 'bold', 
            margin: 0,
            marginBottom: '0.5rem',
            color: playerColor,
            textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
          }}>
            {username}'s Career Stats
          </h1>
          <div style={{ fontSize: '1rem', color: '#a89984', fontWeight: '500' }}>
            All-Time Performance
          </div>
        </div>

        {/* Overall Record */}
        <div style={{
          background: 'linear-gradient(135deg, #3c3836 0%, #282828 100%)',
          borderRadius: '16px',
          padding: '2rem',
          marginBottom: '2rem',
          border: '2px solid #504945',
          textAlign: 'center'
        }}>
          <div style={{ 
            fontSize: '0.9rem', 
            color: '#a89984', 
            marginBottom: '1rem',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            fontWeight: 'bold'
          }}>
            Career Record
          </div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            gap: '3rem'
          }}>
            <div>
              <div style={{ 
                fontSize: '4rem', 
                fontWeight: 'bold', 
                color: playerColor,
                lineHeight: 1,
                textShadow: '3px 3px 6px rgba(0,0,0,0.4)'
              }}>
                {data.overall_stats.wins}
              </div>
              <div style={{ 
                fontSize: '1.2rem', 
                color: playerColor,
                marginTop: '0.5rem',
                fontWeight: 'bold'
              }}>
                Wins
              </div>
            </div>
            <div style={{ 
              fontSize: '3rem', 
              color: '#504945',
              fontWeight: 'bold'
            }}>
              -
            </div>
            <div>
              <div style={{ 
                fontSize: '4rem', 
                fontWeight: 'bold', 
                color: opponentColor,
                lineHeight: 1,
                textShadow: '3px 3px 6px rgba(0,0,0,0.4)'
              }}>
                {data.overall_stats.losses}
              </div>
              <div style={{ 
                fontSize: '1.2rem', 
                color: opponentColor,
                marginTop: '0.5rem',
                fontWeight: 'bold'
              }}>
                Losses
              </div>
            </div>
          </div>
          <div style={{ 
            fontSize: '1.5rem', 
            color: '#fbf1c7',
            marginTop: '1.5rem',
            fontWeight: 'bold'
          }}>
            {data.overall_stats.win_rate}% Win Rate
          </div>
          <div style={{ 
            fontSize: '1rem', 
            color: '#a89984',
            marginTop: '0.5rem',
            fontWeight: '500'
          }}>
            {data.overall_stats.total_games} total games
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)', 
          gap: '1rem', 
          marginBottom: '2rem' 
        }}>
          <div style={{ 
            background: '#3c3836',
            borderRadius: '12px',
            padding: '1.5rem',
            border: '1px solid #504945'
          }}>
            <div style={{ 
              fontSize: '0.85rem', 
              color: '#a89984', 
              marginBottom: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              🏆 Best Win Streak
            </div>
            <div style={{ 
              fontSize: '2.5rem', 
              fontWeight: 'bold',
              color: playerColor,
              lineHeight: 1
            }}>
              {data.streaks.max_win_streak}
            </div>
            <div style={{ 
              fontSize: '1rem', 
              color: '#a89984',
              marginTop: '0.5rem',
              fontWeight: 'bold'
            }}>
              Games
            </div>
          </div>
          
          <div style={{ 
            background: '#3c3836',
            borderRadius: '12px',
            padding: '1.5rem',
            border: '1px solid #504945'
          }}>
            <div style={{ 
              fontSize: '0.85rem', 
              color: '#a89984', 
              marginBottom: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              📊 Last 100 Games
            </div>
            <div style={{ 
              fontSize: '2rem', 
              fontWeight: 'bold',
              marginBottom: '0.5rem'
            }}>
              <span style={{ color: playerColor }}>{data.recent_form.last_100.wins}</span>
              <span style={{ color: '#a89984', margin: '0 0.5rem' }}>-</span>
              <span style={{ color: opponentColor }}>{data.recent_form.last_100.games - data.recent_form.last_100.wins}</span>
            </div>
            <div style={{ 
              fontSize: '1rem',
              color: '#fbf1c7',
              fontWeight: 'bold'
            }}>
              {data.recent_form.last_100.win_rate}% Win Rate
            </div>
          </div>
        </div>

        {/* Dominance Stats */}
        <div style={{
          background: '#1d2021',
          borderRadius: '16px',
          padding: '1.5rem',
          marginBottom: '2rem',
          border: '2px solid #3c3836',
          boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.3)'
        }}>
          <div style={{
            textAlign: 'center',
            marginBottom: '1.25rem',
            paddingBottom: '0.75rem',
            borderBottom: '2px solid #3c3836'
          }}>
            <div style={{
              fontSize: '1rem',
              fontWeight: 'bold',
              color: '#d79921',
              textTransform: 'uppercase',
              letterSpacing: '2px'
            }}>
              💪 Dominance Stats
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            <div style={{ 
              background: '#282828',
              borderRadius: '10px',
              padding: '1rem',
              border: '1px solid #3c3836',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#a89984', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                ⚡ 3-Stocks
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: playerColor }}>
                {data.dominance.three_stock_wins}
              </div>
            </div>

            <div style={{ 
              background: '#282828',
              borderRadius: '10px',
              padding: '1rem',
              border: '1px solid #3c3836',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#a89984', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                💪 2-Stocks
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: playerColor }}>
                {data.dominance.two_stock_wins}
              </div>
            </div>

            <div style={{ 
              background: '#282828',
              borderRadius: '10px',
              padding: '1rem',
              border: '1px solid #3c3836',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#a89984', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                📊 Avg Stocks
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: playerColor }}>
                {data.overall_stats.avg_stocks_when_winning.toFixed(1)}
              </div>
            </div>
          </div>
        </div>

        {/* Win Rate Trend */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ 
            fontSize: '1.2rem', 
            marginBottom: '1rem', 
            color: '#fbf1c7',
            fontWeight: 'bold'
          }}>
            📈 Win Rate Trend
          </h3>
          <div
            style={{
              width: '100%',
              height: '280px',
              background: '#1d2021',
              borderRadius: '12px',
              border: '1px solid #3c3836',
              padding: '1rem'
            }}
          >
            <LineChart
              data={timelineRows}
              config={{ winRate: { label: '20-Game Win Rate', color: playerChartColor } }}
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

        {/* Performance Heatmap */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ 
            fontSize: '1.2rem', 
            marginBottom: '1rem', 
            color: '#fbf1c7',
            fontWeight: 'bold'
          }}>
            🔥 Performance Heatmap
          </h3>
          <div
            style={{
              width: '100%',
              height: '320px',
              background: '#1d2021',
              borderRadius: '12px',
              border: '1px solid #3c3836',
              padding: '1rem'
            }}
          >
            <DitherHeatmap cells={heatmapCells} height={280} metricLabel="win rate" />
          </div>
        </div>

        {/* Top Characters */}
        {data.character_usage.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ 
              fontSize: '1.2rem', 
              marginBottom: '1rem', 
              color: '#fbf1c7',
              fontWeight: 'bold'
            }}>
              Top Characters
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {data.character_usage.slice(0, 5).map((char, idx) => (
                <div 
                  key={idx}
                  style={{
                    background: '#3c3836',
                    borderRadius: '10px',
                    padding: '1rem',
                    border: '1px solid #504945',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      fontSize: '1rem',
                      fontWeight: 'bold',
                      marginBottom: '0.3rem'
                    }}>
                      <CharacterDisplay character={char.character} />
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#a89984' }}>
                      {char.games} games • {char.wins}W-{char.games - char.wins}L
                    </div>
                  </div>
                  <div style={{ 
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    color: char.win_rate >= 50 ? '#b8bb26' : '#fb4934'
                  }}>
                    {char.win_rate}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Best & Worst Matchups */}
        {(data.best_matchups.length > 0 || data.worst_matchups.length > 0) && (
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {/* Best Matchups */}
              <div>
                <h3 style={{ 
                  fontSize: '1rem', 
                  marginBottom: '0.75rem', 
                  color: '#b8bb26',
                  fontWeight: 'bold'
                }}>
                  ✅ Best Matchups
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {data.best_matchups.slice(0, 3).map((matchup, idx) => (
                    <div 
                      key={idx}
                      style={{
                        background: '#3c3836',
                        borderRadius: '8px',
                        padding: '0.75rem',
                        border: '1px solid #504945',
                        fontSize: '0.85rem'
                      }}
                    >
                      <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
                        <CharacterDisplay character={matchup.opponent_character} />
                      </div>
                      <div style={{ color: '#a89984', fontSize: '0.75rem' }}>
                        {matchup.wins}-{matchup.losses} ({matchup.win_rate}%)
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Worst Matchups */}
              <div>
                <h3 style={{ 
                  fontSize: '1rem', 
                  marginBottom: '0.75rem', 
                  color: '#fb4934',
                  fontWeight: 'bold'
                }}>
                  ❌ Worst Matchups
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {data.worst_matchups.slice(0, 3).map((matchup, idx) => (
                    <div 
                      key={idx}
                      style={{
                        background: '#3c3836',
                        borderRadius: '8px',
                        padding: '0.75rem',
                        border: '1px solid #504945',
                        fontSize: '0.85rem'
                      }}
                    >
                      <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
                        <CharacterDisplay character={matchup.opponent_character} />
                      </div>
                      <div style={{ color: '#a89984', fontSize: '0.75rem' }}>
                        {matchup.wins}-{matchup.losses} ({matchup.win_rate}%)
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stage Performance */}
        {data.stage_stats.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ 
              fontSize: '1.2rem', 
              marginBottom: '1rem', 
              color: '#fbf1c7',
              fontWeight: 'bold'
            }}>
              Stage Performance
            </h3>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(3, 1fr)', 
              gap: '0.75rem' 
            }}>
              {data.stage_stats.slice(0, 6).map(stat => (
                <div 
                  key={stat.stage}
                  style={{
                    backgroundImage: stageImages[stat.stage] ? `url(${stageImages[stat.stage]})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    borderRadius: '12px',
                    padding: '1rem',
                    minHeight: '80px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                    overflow: 'hidden',
                    border: '2px solid #504945'
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
                    fontSize: '0.75rem',
                    color: '#fbf1c7',
                    fontWeight: 'bold',
                    textShadow: '0 2px 4px rgba(0,0,0,0.9)'
                  }}>
                    {stat.stage}
                  </div>
                  <div style={{ 
                    position: 'relative',
                    zIndex: 2,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end'
                  }}>
                    <div style={{ 
                      fontSize: '0.75rem',
                      color: '#a89984',
                      textShadow: '0 2px 4px rgba(0,0,0,0.9)'
                    }}>
                      {stat.wins}-{stat.games - stat.wins}
                    </div>
                    <div style={{ 
                      fontSize: '1.2rem',
                      fontWeight: 'bold',
                      color: stat.win_rate >= 50 ? '#b8bb26' : '#fb4934',
                      textShadow: '0 2px 4px rgba(0,0,0,0.9)'
                    }}>
                      {stat.win_rate}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ 
          marginTop: '2rem',
          paddingTop: '1.5rem',
          borderTop: '2px solid #504945',
          textAlign: 'center',
          fontSize: '0.85rem',
          color: '#a89984'
        }}>
          Generated by Smash Match Logger
        </div>
      </div>
    </div>
  );
}

export default PlayerTearsheet;
