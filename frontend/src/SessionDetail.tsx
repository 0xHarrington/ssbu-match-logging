import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
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

interface SessionStats {
  success: boolean;
  session_id: string;
  start_time: string;
  end_time: string;
  total_games: number;
  shayne_wins: number;
  matt_wins: number;
  shayne_characters: { [key: string]: number };
  matt_characters: { [key: string]: number };
  stage_stats: Array<{ stage: string; count: number }>;
  matchup_stats: Array<{
    shayne_character: string;
    matt_character: string;
    total_games: number;
    shayne_wins: number;
    matt_wins: number;
  }>;
}

function SessionDetail() {
  const { session_id } = useParams<{ session_id: string }>();
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (session_id) {
      fetchSessionStats();
    }
  }, [session_id]);

  const fetchSessionStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${session_id}`);
      const data = await res.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to load session stats');
      }
      
      setStats(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Mini donut chart
  useEffect(() => {
    if (!chartRef.current || !stats) return;

    const chartInstance = echarts.init(chartRef.current);

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

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const calculateDuration = () => {
    if (!stats) return '';
    const start = new Date(stats.start_time);
    const end = new Date(stats.end_time);
    const minutes = Math.floor((end.getTime() - start.getTime()) / 60000);
    
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const handleGenerateTearsheet = () => {
    window.open(`/session-tearsheet?session_id=${session_id}`, '_blank', 'width=900,height=1200');
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#a89984' }}>
        Loading session...
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#fb4934' }}>
        Error: {error || 'Session not found'}
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Back Button */}
      <Link 
        to="/sessions"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: '#83a598',
          textDecoration: 'none',
          marginBottom: '1.5rem',
          fontSize: '0.9rem'
        }}
      >
        ← Back to Sessions
      </Link>

      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '2rem'
      }}>
        <div>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: 'bold',
            color: '#fbf1c7',
            marginBottom: '0.5rem'
          }}>
            Session Details
          </h1>
          <div style={{ color: '#a89984', fontSize: '0.95rem' }}>
            {formatDateTime(stats.start_time)} → {formatDateTime(stats.end_time)}
          </div>
          <div style={{ color: '#a89984', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Duration: {calculateDuration()}
          </div>
        </div>

        <button
          onClick={handleGenerateTearsheet}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#83a598',
            color: '#282828',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.9rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.2s'
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
          📊 Generate Tearsheet
        </button>
      </div>

      {/* Hero Stats */}
      <div style={{
        background: 'linear-gradient(135deg, #3c3836 0%, #282828 100%)',
        borderRadius: '16px',
        padding: '2rem',
        marginBottom: '2rem',
        border: '2px solid #504945'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '2rem', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#a89984', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Session Score
            </div>
            <div style={{ display: 'flex', gap: '2rem', marginBottom: '0.75rem' }}>
              <div>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#fe8019', lineHeight: 1 }}>
                  {stats.shayne_wins}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#a89984', marginTop: '0.25rem' }}>Shayne</div>
              </div>
              <div style={{ fontSize: '2rem', color: '#504945', alignSelf: 'center' }}>-</div>
              <div>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#b8bb26', lineHeight: 1 }}>
                  {stats.matt_wins}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#a89984', marginTop: '0.25rem' }}>Matt</div>
              </div>
            </div>
            <div style={{ fontSize: '0.85rem', color: '#a89984' }}>
              {stats.total_games} games played
            </div>
          </div>
          <div ref={chartRef} style={{ width: 120, height: 120 }} />
        </div>
      </div>

      {/* Matchups */}
      {stats.matchup_stats && stats.matchup_stats.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.3rem', marginBottom: '1rem', color: '#fbf1c7', fontWeight: 'bold' }}>
            Character Matchups
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {stats.matchup_stats.map((matchup, idx) => (
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
                    marginBottom: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}>
                    <span style={{ color: '#fe8019' }}>
                      <CharacterDisplay character={matchup.shayne_character} />
                    </span>
                    <span style={{ color: '#a89984', fontSize: '0.85rem' }}>vs</span>
                    <span style={{ color: '#b8bb26' }}>
                      <CharacterDisplay character={matchup.matt_character} />
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#a89984' }}>
                    {matchup.total_games} {matchup.total_games === 1 ? 'game' : 'games'}
                  </div>
                </div>
                <div style={{
                  display: 'flex',
                  gap: '1.5rem',
                  alignItems: 'center'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fe8019' }}>
                      {matchup.shayne_wins}
                    </div>
                  </div>
                  <div style={{ fontSize: '1.2rem', color: '#504945' }}>-</div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#b8bb26' }}>
                      {matchup.matt_wins}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Character Usage */}
      {(Object.keys(stats.shayne_characters).length > 0 || Object.keys(stats.matt_characters).length > 0) && (
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.3rem', marginBottom: '1rem', color: '#fbf1c7', fontWeight: 'bold' }}>
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
                .sort(([, a], [, b]) => b - a)
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
                .sort(([, a], [, b]) => b - a)
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
        <div>
          <h3 style={{ fontSize: '1.3rem', marginBottom: '1rem', color: '#fbf1c7', fontWeight: 'bold' }}>
            Stage Breakdown
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '0.75rem'
          }}>
            {stats.stage_stats.map(stat => (
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
                  fontSize: '0.9rem',
                  color: '#fbf1c7',
                  fontWeight: 'bold',
                  textShadow: '0 2px 4px rgba(0,0,0,0.9)'
                }}>
                  {stat.stage}
                </div>
                <div style={{
                  position: 'relative',
                  zIndex: 2,
                  fontSize: '2rem',
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
    </div>
  );
}

export default SessionDetail;

