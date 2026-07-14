import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import * as echarts from 'echarts';
import CharacterDisplay from './components/CharacterDisplay';
import MatchEditorModal, { type EditableMatch } from './components/MatchEditorModal';
import { LoadingState, ErrorState } from './components/Feedback';
import { stageImages } from './lib/stages';

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

interface SessionMatchesResponse {
  success: boolean;
  matches: EditableMatch[];
  total: number;
  message?: string;
}

function SessionDetail() {
  const { session_id } = useParams<{ session_id: string }>();
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<EditableMatch[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [matchesError, setMatchesError] = useState<string | null>(null);
  const [editingMatch, setEditingMatch] = useState<EditableMatch | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (session_id) {
      fetchSessionStats();
      fetchMatches();
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

  const fetchMatches = async () => {
    if (!session_id) return;
    setMatchesLoading(true);
    setMatchesError(null);
    try {
      const res = await fetch(`/api/matches?session_id=${encodeURIComponent(session_id)}&limit=200`);
      const data: SessionMatchesResponse = await res.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to load session matches');
      }

      setMatches(data.matches);
    } catch (err: unknown) {
      setMatchesError(err instanceof Error ? err.message : String(err));
    } finally {
      setMatchesLoading(false);
    }
  };

  const handleMatchSaved = () => {
    fetchMatches();
    fetchSessionStats();
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

  const formatMatchTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const formatStocks = (value: EditableMatch['stocks_remaining']): string => {
    if (value === null || value === undefined || value === '') return '—';
    return `${value} stk`;
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
    return <LoadingState label="Loading session..." />;
  }

  if (error || !stats) {
    return <ErrorState message={`Error: ${error || 'Session not found'}`} onRetry={fetchSessionStats} />;
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

      {/* Matches */}
      <div style={{ marginTop: '2rem' }}>
        <h3 style={{ fontSize: '1.3rem', marginBottom: '1rem', color: '#fbf1c7', fontWeight: 'bold' }}>
          Matches
        </h3>
        <div style={{
          background: '#3c3836',
          borderRadius: '12px',
          border: '1px solid #504945',
          padding: '0.75rem'
        }}>
          {matchesLoading && (
            <div style={{ fontSize: '0.85rem', color: '#a89984', padding: '0.5rem' }}>Loading matches...</div>
          )}
          {matchesError && (
            <div className="error" style={{ fontSize: '0.85rem', padding: '0.5rem' }}>{matchesError}</div>
          )}
          {!matchesLoading && !matchesError && matches.length === 0 && (
            <div style={{ fontSize: '0.85rem', color: '#a89984', padding: '0.5rem' }}>No matches found for this session.</div>
          )}
          {!matchesLoading && !matchesError && matches.map((match) => {
            const isShayneWin = match.winner === 'Shayne';
            return (
              <div
                key={match.match_id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  flexWrap: 'wrap',
                  padding: '0.6rem 0.5rem',
                  borderBottom: '1px solid #504945',
                  borderLeft: `3px solid ${isShayneWin ? '#fe8019' : '#b8bb26'}`,
                  borderRadius: '4px',
                  marginBottom: '0.25rem',
                  background: '#32302f'
                }}
              >
                <span style={{ fontSize: '0.75rem', color: '#a89984', fontVariantNumeric: 'tabular-nums', minWidth: '40px' }}>
                  {formatMatchTime(match.datetime)}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', flex: 1, minWidth: '160px', fontSize: '0.85rem' }}>
                  <span style={{ color: '#fe8019' }}>
                    <CharacterDisplay character={match.shayne_character} />
                  </span>
                  <span style={{ color: '#a89984', fontSize: '0.75rem' }}>vs</span>
                  <span style={{ color: '#b8bb26' }}>
                    <CharacterDisplay character={match.matt_character} />
                  </span>
                </span>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: '#282828',
                  background: isShayneWin ? '#fe8019' : '#b8bb26',
                  borderRadius: '4px',
                  padding: '0.15rem 0.5rem'
                }}>
                  {match.winner}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#a89984', minWidth: '90px' }}>
                  {match.stage || 'No stage'}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#a89984', minWidth: '38px', textAlign: 'right' }}>
                  {formatStocks(match.stocks_remaining)}
                </span>
                <button
                  type="button"
                  aria-label="Edit match"
                  title="Edit match"
                  onClick={() => setEditingMatch(match)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#a89984',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    padding: '0.2rem',
                    lineHeight: 1
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#fbf1c7'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#a89984'; }}
                >
                  ✎
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {editingMatch && (
        <MatchEditorModal
          match={editingMatch}
          onClose={() => setEditingMatch(null)}
          onSaved={handleMatchSaved}
        />
      )}
    </div>
  );
}

export default SessionDetail;

