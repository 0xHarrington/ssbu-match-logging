import { useEffect, useState, useRef } from 'react';
import html2canvas from 'html2canvas';
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

interface LifetimeStats {
  total_games: number;
  shayne_wins: number;
  matt_wins: number;
  shayne_win_rate: number;
  matt_win_rate: number;
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

interface Game {
  datetime: string;
  shayne_character: string;
  matt_character: string;
  winner: string;
  stage: string;
  stocks_remaining: number;
}

function SessionTearsheet() {
  const [stats, setStats] = useState<SessionStatsData | null>(null);
  const [lifetimeStats, setLifetimeStats] = useState<LifetimeStats | null>(null);
  const [headToHead, setHeadToHead] = useState<HeadToHeadStats | null>(null);
  const [advancedMetrics, setAdvancedMetrics] = useState<AdvancedMetrics | null>(null);
  const [recentGames, setRecentGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const tearsheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [sessionRes, lifetimeRes, h2hRes, advRes, gamesRes] = await Promise.all([
          fetch('/api/session_stats'),
          fetch('/api/stats'),
          fetch('/api/head_to_head_stats'),
          fetch('/api/advanced_metrics'),
          fetch('/api/recent_games'),
        ]);
        
        const sessionData = await sessionRes.json();
        const lifetimeData = await lifetimeRes.json();
        const h2hData = await h2hRes.json();
        const advData = await advRes.json();
        const gamesData = await gamesRes.json();
        
        if (!sessionData.success) throw new Error(sessionData.message || 'Failed to load session stats');
        if (!lifetimeData.success) throw new Error(lifetimeData.message || 'Failed to load lifetime stats');
        if (!h2hData.success) throw new Error(h2hData.message || 'Failed to load head-to-head stats');
        if (!advData.success) throw new Error(advData.message || 'Failed to load advanced metrics');
        if (!gamesData.success) throw new Error(gamesData.message || 'Failed to load recent games');
        
        setStats(sessionData);
        setLifetimeStats(lifetimeData.stats);
        setHeadToHead(h2hData);
        setAdvancedMetrics(advData);
        setRecentGames(gamesData.games);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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
      
      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          const date = new Date().toISOString().split('T')[0];
          link.download = `smash-session-${date}.png`;
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
            alert('Session stats copied to clipboard!');
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

  const formatTime = (datetime: string) => {
    const date = new Date(datetime);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
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
        <div style={{ fontSize: '1.2rem', color: '#a89984' }}>Loading session stats...</div>
      </div>
    );
  }

  if (error || !stats || !lifetimeStats || !headToHead || !advancedMetrics) {
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
        <div style={{ fontSize: '1.2rem', color: '#fb4934' }}>
          {error || 'Failed to load session stats'}
        </div>
      </div>
    );
  }

  const todayDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

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
          width: '800px',
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
            color: '#fbf1c7',
            textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
          }}>
            🎮 Smash Session Stats
          </h1>
          <div style={{ fontSize: '1rem', color: '#a89984', fontWeight: '500' }}>
            {todayDate}
          </div>
        </div>

        {/* Lifetime Stats Banner */}
        <div style={{ 
          background: 'linear-gradient(135deg, #1d2021 0%, #282828 100%)',
          borderRadius: '12px',
          padding: '1rem',
          marginBottom: '2rem',
          border: '1px solid #3c3836',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: '#a89984', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
              All-Time Record
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>
              <span style={{ color: '#fe8019' }}>{lifetimeStats.shayne_wins}</span>
              <span style={{ color: '#504945', margin: '0 0.5rem' }}>-</span>
              <span style={{ color: '#b8bb26' }}>{lifetimeStats.matt_wins}</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: '#a89984', marginTop: '0.2rem' }}>
              {lifetimeStats.total_games} total games
            </div>
          </div>
          <div style={{ width: '1px', height: '50px', background: '#3c3836' }} />
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: '#a89984', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Win Rates
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#fe8019' }}>
                  {lifetimeStats.shayne_win_rate.toFixed(1)}%
                </div>
                <div style={{ fontSize: '0.65rem', color: '#a89984' }}>Shayne</div>
              </div>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#b8bb26' }}>
                  {lifetimeStats.matt_win_rate.toFixed(1)}%
                </div>
                <div style={{ fontSize: '0.65rem', color: '#a89984' }}>Matt</div>
              </div>
            </div>
          </div>
        </div>

        {/* Session Stats Section Header */}
        <div style={{ 
          textAlign: 'center',
          marginBottom: '1rem'
        }}>
          <div style={{ 
            display: 'inline-block',
            background: '#83a598',
            color: '#282828',
            padding: '0.5rem 1.5rem',
            borderRadius: '20px',
            fontSize: '0.85rem',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '1.5px'
          }}>
            📅 Today's Session
          </div>
        </div>

        {/* Hero Stats */}
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
            Session Score
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
                color: '#fe8019',
                lineHeight: 1,
                textShadow: '3px 3px 6px rgba(0,0,0,0.4)'
              }}>
                {stats.shayne_wins}
              </div>
              <div style={{ 
                fontSize: '1.2rem', 
                color: '#fe8019',
                marginTop: '0.5rem',
                fontWeight: 'bold'
              }}>
                Shayne
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
                color: '#b8bb26',
                lineHeight: 1,
                textShadow: '3px 3px 6px rgba(0,0,0,0.4)'
              }}>
                {stats.matt_wins}
              </div>
              <div style={{ 
                fontSize: '1.2rem', 
                color: '#b8bb26',
                marginTop: '0.5rem',
                fontWeight: 'bold'
              }}>
                Matt
              </div>
            </div>
          </div>
          <div style={{ 
            fontSize: '1rem', 
            color: '#a89984',
            marginTop: '1.5rem',
            fontWeight: '500'
          }}>
            {stats.total_games} games played
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
              🔥 Current Streak
            </div>
            <div style={{ 
              fontSize: '2.5rem', 
              fontWeight: 'bold',
              color: headToHead.streaks.current_streak.player === 'Shayne' ? '#fe8019' : '#b8bb26',
              lineHeight: 1
            }}>
              {headToHead.streaks.current_streak.length}
            </div>
            <div style={{ 
              fontSize: '1rem', 
              color: headToHead.streaks.current_streak.player === 'Shayne' ? '#fe8019' : '#b8bb26',
              marginTop: '0.5rem',
              fontWeight: 'bold'
            }}>
              {headToHead.streaks.current_streak.player}
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
              📊 Last 10 Games
            </div>
            <div style={{ 
              fontSize: '1.5rem', 
              fontWeight: 'bold',
              marginBottom: '0.75rem'
            }}>
              <span style={{ color: '#fe8019' }}>{headToHead.recent_form.last_10.shayne_wins}</span>
              <span style={{ color: '#a89984', margin: '0 0.5rem' }}>-</span>
              <span style={{ color: '#b8bb26' }}>{headToHead.recent_form.last_10.matt_wins}</span>
            </div>
            <div style={{ 
              height: '6px', 
              background: '#282828', 
              borderRadius: '3px', 
              overflow: 'hidden',
              display: 'flex'
            }}>
              <div style={{ 
                width: `${(headToHead.recent_form.last_10.shayne_wins / headToHead.recent_form.last_10.total_games) * 100}%`,
                background: '#fe8019'
              }}></div>
              <div style={{ 
                width: `${(headToHead.recent_form.last_10.matt_wins / headToHead.recent_form.last_10.total_games) * 100}%`,
                background: '#b8bb26'
              }}></div>
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
              ⚡ 3-Stock Wins
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
              <span style={{ color: '#fe8019' }}>{advancedMetrics.dominance_factor.shayne.three_stock_wins}</span>
              <span style={{ color: '#a89984', margin: '0 0.5rem' }}>|</span>
              <span style={{ color: '#b8bb26' }}>{advancedMetrics.dominance_factor.matt.three_stock_wins}</span>
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
              💪 2-Stock Wins
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
              <span style={{ color: '#fe8019' }}>{advancedMetrics.two_stock_wins.shayne.two_stock_wins}</span>
              <span style={{ color: '#a89984', margin: '0 0.5rem' }}>|</span>
              <span style={{ color: '#b8bb26' }}>{advancedMetrics.two_stock_wins.matt.two_stock_wins}</span>
            </div>
          </div>
        </div>

        {/* Character Usage */}
        {(Object.keys(stats.shayne_characters).length > 0 || Object.keys(stats.matt_characters).length > 0) && (
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ 
              fontSize: '1.2rem', 
              marginBottom: '1rem', 
              color: '#fbf1c7',
              fontWeight: 'bold'
            }}>
              Character Usage
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ 
                background: '#3c3836',
                borderRadius: '12px',
                padding: '1.25rem',
                border: '1px solid #504945'
              }}>
                <div style={{ 
                  fontSize: '1rem', 
                  color: '#fe8019',
                  marginBottom: '1rem',
                  fontWeight: 'bold'
                }}>
                  Shayne
                </div>
                {Object.entries(stats.shayne_characters)
                  .sort(([,a],[,b])=>b-a)
                  .slice(0, 5)
                  .map(([char, count]) => (
                    <div 
                      key={char}
                      style={{ 
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '0.75rem',
                        padding: '0.5rem',
                        background: '#282828',
                        borderRadius: '6px'
                      }}
                    >
                      <div style={{ fontSize: '0.95rem' }}>
                        <CharacterDisplay character={char} />
                      </div>
                      <span style={{ 
                        fontSize: '1.1rem',
                        fontWeight: 'bold',
                        color: '#fe8019'
                      }}>
                        {count}
                      </span>
                    </div>
                  ))}
              </div>
              <div style={{ 
                background: '#3c3836',
                borderRadius: '12px',
                padding: '1.25rem',
                border: '1px solid #504945'
              }}>
                <div style={{ 
                  fontSize: '1rem', 
                  color: '#b8bb26',
                  marginBottom: '1rem',
                  fontWeight: 'bold'
                }}>
                  Matt
                </div>
                {Object.entries(stats.matt_characters)
                  .sort(([,a],[,b])=>b-a)
                  .slice(0, 5)
                  .map(([char, count]) => (
                    <div 
                      key={char}
                      style={{ 
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '0.75rem',
                        padding: '0.5rem',
                        background: '#282828',
                        borderRadius: '6px'
                      }}
                    >
                      <div style={{ fontSize: '0.95rem' }}>
                        <CharacterDisplay character={char} />
                      </div>
                      <span style={{ 
                        fontSize: '1.1rem',
                        fontWeight: 'bold',
                        color: '#b8bb26'
                      }}>
                        {count}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Stage Stats */}
        {stats.stage_stats.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ 
              fontSize: '1.2rem', 
              marginBottom: '1rem', 
              color: '#fbf1c7',
              fontWeight: 'bold'
            }}>
              Stage Breakdown
            </h3>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(3, 1fr)', 
              gap: '0.75rem' 
            }}>
              {stats.stage_stats.slice(0, 6).map(stat => (
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
                    fontSize: '0.85rem',
                    color: '#fbf1c7',
                    fontWeight: 'bold',
                    textShadow: '0 2px 4px rgba(0,0,0,0.9)'
                  }}>
                    {stat.stage}
                  </div>
                  <div style={{ 
                    position: 'relative',
                    zIndex: 2,
                    fontSize: '1.8rem',
                    fontWeight: 'bold',
                    color: '#83a598',
                    textShadow: '0 2px 4px rgba(0,0,0,0.9)'
                  }}>
                    {stat.count}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Games */}
        {recentGames.length > 0 && (
          <div>
            <h3 style={{ 
              fontSize: '1.2rem', 
              marginBottom: '1rem', 
              color: '#fbf1c7',
              fontWeight: 'bold'
            }}>
              Recent Games
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recentGames.slice(0, 8).map((game, idx) => {
                const isShayneWin = game.winner === 'Shayne';
                return (
                  <div 
                    key={idx}
                    style={{
                      background: '#3c3836',
                      borderRadius: '10px',
                      padding: '0.9rem',
                      border: '1px solid #504945',
                      borderLeft: `4px solid ${isShayneWin ? '#fe8019' : '#b8bb26'}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontSize: '0.95rem',
                        fontWeight: '600',
                        color: '#fbf1c7',
                        marginBottom: '0.3rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <CharacterDisplay character={game.shayne_character} />
                        <span style={{ color: '#a89984', fontSize: '0.8rem' }}>vs</span>
                        <CharacterDisplay character={game.matt_character} />
                      </div>
                      <div style={{ 
                        fontSize: '0.75rem',
                        color: '#a89984',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
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
                      gap: '0.3rem'
                    }}>
                      <div style={{ 
                        fontSize: '0.85rem',
                        fontWeight: 'bold',
                        color: isShayneWin ? '#fe8019' : '#b8bb26',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        {game.winner}
                      </div>
                      <div style={{ 
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}>
                        {[...Array(game.stocks_remaining)].map((_, i) => (
                          <div key={i} style={{ 
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: isShayneWin ? '#fe8019' : '#b8bb26'
                          }} />
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
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

export default SessionTearsheet;

