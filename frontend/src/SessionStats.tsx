import { useEffect, useState, forwardRef, useImperativeHandle, useRef } from 'react';
import * as echarts from 'echarts';
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

interface HeadToHeadStats {
  recent_form: {
    last_10: { shayne_wins: number; matt_wins: number; total_games: number };
  };
  streaks: {
    current_streak: { player: string; length: number };
  };
}

interface AdvancedMetrics {
  two_stock_wins: {
    shayne: { two_stock_wins: number; two_stock_rate: number };
    matt: { two_stock_wins: number; two_stock_rate: number };
  };
  dominance_factor: {
    shayne: { three_stock_wins: number };
    matt: { three_stock_wins: number };
  };
}

interface LifetimeStats {
  total_games: number;
  shayne_wins: number;
  matt_wins: number;
  shayne_win_rate: number;
  matt_win_rate: number;
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
  const [lifetimeStats, setLifetimeStats] = useState<LifetimeStats | null>(null);
  const [matchupStats, setMatchupStats] = useState<MatchupStats | null>(null);
  const [headToHead, setHeadToHead] = useState<HeadToHeadStats | null>(null);
  const [advancedMetrics, setAdvancedMetrics] = useState<AdvancedMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sessionRes, lifetimeRes, h2hRes, advRes] = await Promise.all([
        fetch('/api/session_stats'),
        fetch('/api/stats'),
        fetch('/api/head_to_head_stats'),
        fetch('/api/advanced_metrics'),
      ]);
      
      const sessionData = await sessionRes.json();
      const lifetimeData = await lifetimeRes.json();
      const h2hData = await h2hRes.json();
      const advData = await advRes.json();
      
      if (!sessionData.success) throw new Error(sessionData.message || 'Failed to load session stats');
      if (!lifetimeData.success) throw new Error(lifetimeData.message || 'Failed to load lifetime stats');
      if (!h2hData.success) throw new Error(h2hData.message || 'Failed to load head-to-head stats');
      if (!advData.success) throw new Error(advData.message || 'Failed to load advanced metrics');
      
      setStats(sessionData);
      setLifetimeStats(lifetimeData.stats);
      setHeadToHead(h2hData);
      setAdvancedMetrics(advData);
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

  // Mini donut chart for win distribution
  useEffect(() => {
    if (!chartRef.current || !stats) return;

    const chartInstance = echarts.init(chartRef.current);
    chartInstanceRef.current = chartInstance;

    const option = {
      backgroundColor: 'transparent',
      series: [{
        type: 'pie',
        radius: ['60%', '85%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: false,
        label: { show: false },
        labelLine: { show: false },
        data: [
          { value: stats.shayne_wins, name: 'Shayne', itemStyle: { color: '#fe8019' } },
          { value: stats.matt_wins, name: 'Matt', itemStyle: { color: '#b8bb26' } }
        ],
        emphasis: {
          scale: false,
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }]
    };

    chartInstance.setOption(option);

    const handleResize = () => chartInstance.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.dispose();
    };
  }, [stats]);

  const handleShareSession = () => {
    window.open('/session-tearsheet', '_blank', 'width=900,height=1200');
  };

  return (
    <div className="session-stats" style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Session Stats</h2>
        {!loading && !error && stats && stats.total_games > 0 && (
          <button
            onClick={handleShareSession}
            style={{
              padding: '0.5rem 0.75rem',
              background: '#83a598',
              color: '#282828',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#a3c0b8';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#83a598';
              e.currentTarget.style.transform = 'none';
            }}
          >
            📊 Share Session
          </button>
        )}
      </div>
      {loading && <div style={{ fontSize: '0.85rem', color: '#a89984' }}>Loading...</div>}
      {error && <div className="error" style={{ fontSize: '0.85rem', padding: '0.5rem' }}>{error}</div>}
      {!loading && !error && stats && lifetimeStats && headToHead && advancedMetrics && (
        <>
          {/* Lifetime Stats Compact Banner */}
          <div style={{ 
            background: 'linear-gradient(135deg, #1d2021 0%, #282828 100%)',
            borderRadius: '8px',
            padding: '0.75rem',
            marginBottom: '1rem',
            border: '1px solid #3c3836',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.65rem', color: '#a89984', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                All-Time
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 'bold' }}>
                <span style={{ color: '#fe8019' }}>{lifetimeStats.shayne_wins}</span>
                <span style={{ color: '#504945', margin: '0 0.3rem' }}>-</span>
                <span style={{ color: '#b8bb26' }}>{lifetimeStats.matt_wins}</span>
              </div>
              <div style={{ fontSize: '0.65rem', color: '#a89984' }}>
                {lifetimeStats.total_games} games
              </div>
            </div>
            <div style={{ width: '1px', height: '40px', background: '#3c3836' }} />
            <div style={{ flex: 1, textAlign: 'right' }}>
              <div style={{ fontSize: '0.65rem', color: '#a89984', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Win Rates
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>
                <span style={{ color: '#fe8019' }}>{lifetimeStats.shayne_win_rate.toFixed(1)}%</span>
                <span style={{ color: '#504945', margin: '0 0.3rem' }}>|</span>
                <span style={{ color: '#b8bb26' }}>{lifetimeStats.matt_win_rate.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Today's Session Label */}
          <div style={{ 
            textAlign: 'center',
            marginBottom: '0.75rem'
          }}>
            <div style={{ 
              display: 'inline-block',
              background: '#83a598',
              color: '#282828',
              padding: '0.3rem 0.75rem',
              borderRadius: '12px',
              fontSize: '0.7rem',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              📅 Today's Session
            </div>
          </div>

          {/* Hero Stats with Mini Chart */}
          <div style={{ 
            background: 'linear-gradient(135deg, #3c3836 0%, #282828 100%)',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '1rem',
            border: '1px solid #504945'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#a89984', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Today's Session
                </div>
                <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '0.5rem' }}>
                  <div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#fe8019', lineHeight: 1 }}>{stats.shayne_wins}</div>
                    <div style={{ fontSize: '0.7rem', color: '#a89984' }}>Shayne</div>
                  </div>
                  <div style={{ fontSize: '1.5rem', color: '#504945', alignSelf: 'center' }}>-</div>
                  <div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#b8bb26', lineHeight: 1 }}>{stats.matt_wins}</div>
                    <div style={{ fontSize: '0.7rem', color: '#a89984' }}>Matt</div>
                  </div>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#a89984' }}>
                  {stats.total_games} games played
                </div>
              </div>
              <div ref={chartRef} style={{ width: 80, height: 80 }} />
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
            <div className="stat-card" style={{ padding: '0.6rem', minHeight: 'auto' }}>
              <div style={{ fontSize: '0.7rem', color: '#a89984', marginBottom: '0.3rem' }}>🔥 Current Streak</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: headToHead.streaks.current_streak.player === 'Shayne' ? '#fe8019' : '#b8bb26' }}>
                {headToHead.streaks.current_streak.length}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#a89984' }}>{headToHead.streaks.current_streak.player}</div>
            </div>
            
            <div className="stat-card" style={{ padding: '0.6rem', minHeight: 'auto' }}>
              <div style={{ fontSize: '0.7rem', color: '#a89984', marginBottom: '0.3rem' }}>📊 Last 10</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>
                <span style={{ color: '#fe8019' }}>{headToHead.recent_form.last_10.shayne_wins}</span>
                <span style={{ color: '#a89984', margin: '0 0.3rem' }}>-</span>
                <span style={{ color: '#b8bb26' }}>{headToHead.recent_form.last_10.matt_wins}</span>
              </div>
              <div style={{ 
                height: '3px', 
                background: '#3c3836', 
                borderRadius: '2px', 
                overflow: 'hidden',
                display: 'flex',
                marginTop: '0.3rem'
              }}>
                <div style={{ width: `${(headToHead.recent_form.last_10.shayne_wins / headToHead.recent_form.last_10.total_games) * 100}%`, background: '#fe8019' }}></div>
                <div style={{ width: `${(headToHead.recent_form.last_10.matt_wins / headToHead.recent_form.last_10.total_games) * 100}%`, background: '#b8bb26' }}></div>
              </div>
            </div>

            <div className="stat-card" style={{ padding: '0.6rem', minHeight: 'auto' }}>
              <div style={{ fontSize: '0.7rem', color: '#a89984', marginBottom: '0.3rem' }}>⚡ 3-Stocks</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>
                <span style={{ color: '#fe8019' }}>{advancedMetrics.dominance_factor.shayne.three_stock_wins}</span>
                <span style={{ color: '#a89984', margin: '0 0.3rem' }}>|</span>
                <span style={{ color: '#b8bb26' }}>{advancedMetrics.dominance_factor.matt.three_stock_wins}</span>
              </div>
            </div>

            <div className="stat-card" style={{ padding: '0.6rem', minHeight: 'auto' }}>
              <div style={{ fontSize: '0.7rem', color: '#a89984', marginBottom: '0.3rem' }}>💪 2-Stocks</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>
                <span style={{ color: '#fe8019' }}>{advancedMetrics.two_stock_wins.shayne.two_stock_wins}</span>
                <span style={{ color: '#a89984', margin: '0 0.3rem' }}>|</span>
                <span style={{ color: '#b8bb26' }}>{advancedMetrics.two_stock_wins.matt.two_stock_wins}</span>
              </div>
            </div>
          </div>

          {/* Matchup Stats */}
          {matchupStats && shayneCharacter && mattCharacter && (
            <div style={{ 
              background: '#3c3836',
              borderRadius: '12px',
              padding: '0.75rem',
              marginBottom: '1rem',
              border: '1px solid #504945'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#fbf1c7' }}>
                  <CharacterDisplay character={shayneCharacter} /> vs <CharacterDisplay character={mattCharacter} />
                </div>
                <div style={{ fontSize: '0.7rem', color: '#a89984' }}>
                  {matchupStats.total_games} games
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fe8019' }}>{matchupStats.shayne_wins}</div>
                  <div style={{ fontSize: '0.7rem', color: '#a89984' }}>
                    {Math.round((matchupStats.shayne_wins / matchupStats.total_games) * 100) || 0}%
                  </div>
                  <div style={{ 
                    height: '3px', 
                    background: '#282828', 
                    borderRadius: '2px', 
                    marginTop: '0.3rem',
                    overflow: 'hidden'
                  }}>
                    <div style={{ 
                      width: `${(matchupStats.shayne_wins / matchupStats.total_games) * 100}%`,
                      height: '100%',
                      background: '#fe8019'
                    }}></div>
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#b8bb26' }}>{matchupStats.matt_wins}</div>
                  <div style={{ fontSize: '0.7rem', color: '#a89984' }}>
                    {Math.round((matchupStats.matt_wins / matchupStats.total_games) * 100) || 0}%
                  </div>
                  <div style={{ 
                    height: '3px', 
                    background: '#282828', 
                    borderRadius: '2px', 
                    marginTop: '0.3rem',
                    overflow: 'hidden'
                  }}>
                    <div style={{ 
                      width: `${(matchupStats.matt_wins / matchupStats.total_games) * 100}%`,
                      height: '100%',
                      background: '#b8bb26'
                    }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Character Usage - Compact */}
          {(Object.keys(stats.shayne_characters).length > 0 || Object.keys(stats.matt_characters).length > 0) && (
            <div style={{ marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: '#fbf1c7' }}>Today's Characters</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div style={{ background: '#3c3836', borderRadius: '8px', padding: '0.6rem', border: '1px solid #504945' }}>
                  <div style={{ fontSize: '0.75rem', color: '#fe8019', marginBottom: '0.4rem', fontWeight: '600' }}>Shayne</div>
                  {Object.entries(stats.shayne_characters).sort(([,a],[,b])=>b-a).slice(0, 3).map(([char, count]) => (
                    <div key={char} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                      <div style={{ fontSize: '0.8rem' }}><CharacterDisplay character={char} /></div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#fe8019' }}>{count}</span>
                    </div>
                  ))}
                </div>
                <div style={{ background: '#3c3836', borderRadius: '8px', padding: '0.6rem', border: '1px solid #504945' }}>
                  <div style={{ fontSize: '0.75rem', color: '#b8bb26', marginBottom: '0.4rem', fontWeight: '600' }}>Matt</div>
                  {Object.entries(stats.matt_characters).sort(([,a],[,b])=>b-a).slice(0, 3).map(([char, count]) => (
                    <div key={char} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                      <div style={{ fontSize: '0.8rem' }}><CharacterDisplay character={char} /></div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#b8bb26' }}>{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Stage Stats - Compact */}
          {stats.stage_stats.length > 0 && (
            <div>
              <h3 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: '#fbf1c7' }}>Today's Stages</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem' }}>
                {stats.stage_stats.slice(0, 6).map(stat => (
                  <div 
                    key={stat.stage}
                    style={{
                      backgroundImage: stageImages[stat.stage] ? `url(${stageImages[stat.stage]})` : 'none',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      borderRadius: '8px',
                      padding: '0.5rem',
                      minHeight: '50px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      position: 'relative',
                      overflow: 'hidden',
                      border: '1px solid #504945'
                    }}
                  >
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'rgba(0, 0, 0, 0.7)',
                      zIndex: 1,
                    }} />
                    <div style={{ position: 'relative', zIndex: 2, fontSize: '0.7rem', color: '#fbf1c7', fontWeight: '600', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                      {stat.stage}
                    </div>
                    <div style={{ position: 'relative', zIndex: 2, fontSize: '1.1rem', fontWeight: 'bold', color: '#83a598', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                      {stat.count}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
});

export default SessionStats;
