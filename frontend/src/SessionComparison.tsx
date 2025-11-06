import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import * as echarts from 'echarts';

interface Session {
  session_id: string;
  start_time: string;
  end_time: string;
  total_games: number;
  shayne_wins: number;
  matt_wins: number;
  duration_minutes: number;
}

interface SessionStats {
  session_id: string;
  start_time: string;
  end_time: string;
  total_games: number;
  shayne_wins: number;
  matt_wins: number;
  shayne_characters: { [key: string]: number };
  matt_characters: { [key: string]: number };
}

function SessionComparison() {
  const [searchParams, setSearchParams] = useSearchParams();
  const session1Id = searchParams.get('session1');
  const session2Id = searchParams.get('session2');
  
  const [sessions, setSessions] = useState<Session[]>([]);
  const [session1Stats, setSession1Stats] = useState<SessionStats | null>(null);
  const [session2Stats, setSession2Stats] = useState<SessionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (session1Id && session2Id) {
      fetchComparisonData();
    }
  }, [session1Id, session2Id]);

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/sessions');
      const data = await res.json();
      if (data.success) {
        setSessions(data.sessions);
      }
    } catch (err: any) {
      console.error('Failed to load sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchComparisonData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [res1, res2] = await Promise.all([
        fetch(`/api/sessions/${session1Id}`),
        fetch(`/api/sessions/${session2Id}`)
      ]);
      
      const data1 = await res1.json();
      const data2 = await res2.json();
      
      if (!data1.success || !data2.success) {
        throw new Error('Failed to load session data');
      }
      
      setSession1Stats(data1);
      setSession2Stats(data2);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSessionSelect = (sessionNum: 1 | 2, sessionId: string) => {
    const params = new URLSearchParams(searchParams);
    params.set(`session${sessionNum}`, sessionId);
    setSearchParams(params);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const calculateDiff = (val1: number, val2: number) => {
    const diff = val1 - val2;
    return {
      value: Math.abs(diff),
      positive: diff > 0,
      percentage: val2 !== 0 ? ((diff / val2) * 100).toFixed(1) : '∞'
    };
  };

  const renderSessionSelector = (sessionNum: 1 | 2, selectedId: string | null) => (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ 
        display: 'block', 
        marginBottom: '0.5rem', 
        color: '#ebdbb2',
        fontSize: '0.9rem',
        fontWeight: 'bold'
      }}>
        Session {sessionNum}:
      </label>
      <select
        value={selectedId || ''}
        onChange={(e) => handleSessionSelect(sessionNum, e.target.value)}
        style={{
          width: '100%',
          padding: '0.75rem',
          background: '#282828',
          border: '1px solid #504945',
          borderRadius: '8px',
          color: '#ebdbb2',
          fontSize: '0.9rem'
        }}
      >
        <option value="">Select a session...</option>
        {sessions.map(session => (
          <option key={session.session_id} value={session.session_id}>
            {formatDate(session.start_time)} - {session.total_games} games
          </option>
        ))}
      </select>
    </div>
  );

  const renderComparisonCard = (
    title: string,
    value1: number | string,
    value2: number | string,
    color1: string = '#83a598',
    color2: string = '#fabd2f'
  ) => (
    <div style={{
      background: '#3c3836',
      borderRadius: '12px',
      padding: '1.5rem',
      border: '1px solid #504945'
    }}>
      <div style={{
        fontSize: '0.75rem',
        color: '#a89984',
        marginBottom: '1rem',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        textAlign: 'center'
      }}>
        {title}
      </div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: color1 }}>
            {value1}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#a89984', marginTop: '0.25rem' }}>
            Session 1
          </div>
        </div>
        <div style={{ fontSize: '1.5rem', color: '#504945' }}>vs</div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: color2 }}>
            {value2}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#a89984', marginTop: '0.25rem' }}>
            Session 2
          </div>
        </div>
      </div>
    </div>
  );

  if (loading && !sessions.length) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#a89984' }}>
        Loading...
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
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          color: '#fbf1c7',
          marginBottom: '0.5rem'
        }}>
          📊 Session Comparison
        </h1>
        <p style={{ color: '#a89984', fontSize: '0.95rem' }}>
          Compare statistics between two gaming sessions
        </p>
      </div>

      {/* Session Selectors */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        <div style={{
          background: '#3c3836',
          borderRadius: '12px',
          padding: '1.5rem',
          border: '1px solid #504945'
        }}>
          {renderSessionSelector(1, session1Id)}
        </div>
        <div style={{
          background: '#3c3836',
          borderRadius: '12px',
          padding: '1.5rem',
          border: '1px solid #504945'
        }}>
          {renderSessionSelector(2, session2Id)}
        </div>
      </div>

      {/* Comparison Results */}
      {session1Stats && session2Stats && !loading && (
        <>
          {/* Session Info */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '1.5rem',
            marginBottom: '2rem'
          }}>
            <div style={{
              background: '#3c3836',
              borderRadius: '12px',
              padding: '1.5rem',
              border: '2px solid #83a598'
            }}>
              <div style={{
                fontSize: '0.75rem',
                color: '#a89984',
                marginBottom: '0.5rem',
                textTransform: 'uppercase'
              }}>
                Session 1
              </div>
              <div style={{ fontSize: '0.9rem', color: '#ebdbb2', marginBottom: '0.5rem' }}>
                {formatDate(session1Stats.start_time)}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#a89984' }}>
                {session1Stats.total_games} games
              </div>
            </div>
            <div style={{
              background: '#3c3836',
              borderRadius: '12px',
              padding: '1.5rem',
              border: '2px solid #fabd2f'
            }}>
              <div style={{
                fontSize: '0.75rem',
                color: '#a89984',
                marginBottom: '0.5rem',
                textTransform: 'uppercase'
              }}>
                Session 2
              </div>
              <div style={{ fontSize: '0.9rem', color: '#ebdbb2', marginBottom: '0.5rem' }}>
                {formatDate(session2Stats.start_time)}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#a89984' }}>
                {session2Stats.total_games} games
              </div>
            </div>
          </div>

          {/* Comparison Stats Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2rem'
          }}>
            {renderComparisonCard(
              'Total Games',
              session1Stats.total_games,
              session2Stats.total_games
            )}
            {renderComparisonCard(
              'Shayne Wins',
              session1Stats.shayne_wins,
              session2Stats.shayne_wins,
              '#fe8019',
              '#fe8019'
            )}
            {renderComparisonCard(
              'Matt Wins',
              session1Stats.matt_wins,
              session2Stats.matt_wins,
              '#b8bb26',
              '#b8bb26'
            )}
            {renderComparisonCard(
              'Shayne Win Rate',
              `${((session1Stats.shayne_wins / session1Stats.total_games) * 100).toFixed(1)}%`,
              `${((session2Stats.shayne_wins / session2Stats.total_games) * 100).toFixed(1)}%`,
              '#fe8019',
              '#fe8019'
            )}
            {renderComparisonCard(
              'Matt Win Rate',
              `${((session1Stats.matt_wins / session1Stats.total_games) * 100).toFixed(1)}%`,
              `${((session2Stats.matt_wins / session2Stats.total_games) * 100).toFixed(1)}%`,
              '#b8bb26',
              '#b8bb26'
            )}
            {renderComparisonCard(
              'Unique Characters (Shayne)',
              Object.keys(session1Stats.shayne_characters).length,
              Object.keys(session2Stats.shayne_characters).length
            )}
            {renderComparisonCard(
              'Unique Characters (Matt)',
              Object.keys(session1Stats.matt_characters).length,
              Object.keys(session2Stats.matt_characters).length
            )}
          </div>

          {/* Character Usage Comparison */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{
              fontSize: '1.3rem',
              marginBottom: '1rem',
              color: '#fbf1c7',
              fontWeight: 'bold'
            }}>
              Character Usage Comparison
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '1.5rem'
            }}>
              {/* Shayne's Characters */}
              <div style={{
                background: '#3c3836',
                borderRadius: '12px',
                padding: '1.5rem',
                border: '1px solid #504945'
              }}>
                <div style={{
                  fontSize: '1rem',
                  color: '#fe8019',
                  marginBottom: '1rem',
                  fontWeight: 'bold'
                }}>
                  Shayne's Most Played
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#a89984', marginBottom: '0.5rem' }}>
                      Session 1
                    </div>
                    {Object.entries(session1Stats.shayne_characters)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 5)
                      .map(([char, count]) => (
                        <div key={char} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '0.5rem',
                          background: '#282828',
                          borderRadius: '6px',
                          marginBottom: '0.5rem'
                        }}>
                          <span style={{ fontSize: '0.85rem' }}>{char}</span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#83a598' }}>
                            {count}
                          </span>
                        </div>
                      ))}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#a89984', marginBottom: '0.5rem' }}>
                      Session 2
                    </div>
                    {Object.entries(session2Stats.shayne_characters)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 5)
                      .map(([char, count]) => (
                        <div key={char} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '0.5rem',
                          background: '#282828',
                          borderRadius: '6px',
                          marginBottom: '0.5rem'
                        }}>
                          <span style={{ fontSize: '0.85rem' }}>{char}</span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#fabd2f' }}>
                            {count}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              {/* Matt's Characters */}
              <div style={{
                background: '#3c3836',
                borderRadius: '12px',
                padding: '1.5rem',
                border: '1px solid #504945'
              }}>
                <div style={{
                  fontSize: '1rem',
                  color: '#b8bb26',
                  marginBottom: '1rem',
                  fontWeight: 'bold'
                }}>
                  Matt's Most Played
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#a89984', marginBottom: '0.5rem' }}>
                      Session 1
                    </div>
                    {Object.entries(session1Stats.matt_characters)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 5)
                      .map(([char, count]) => (
                        <div key={char} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '0.5rem',
                          background: '#282828',
                          borderRadius: '6px',
                          marginBottom: '0.5rem'
                        }}>
                          <span style={{ fontSize: '0.85rem' }}>{char}</span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#83a598' }}>
                            {count}
                          </span>
                        </div>
                      ))}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#a89984', marginBottom: '0.5rem' }}>
                      Session 2
                    </div>
                    {Object.entries(session2Stats.matt_characters)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 5)
                      .map(([char, count]) => (
                        <div key={char} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '0.5rem',
                          background: '#282828',
                          borderRadius: '6px',
                          marginBottom: '0.5rem'
                        }}>
                          <span style={{ fontSize: '0.85rem' }}>{char}</span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#fabd2f' }}>
                            {count}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {error && (
        <div style={{
          padding: '2rem',
          textAlign: 'center',
          color: '#fb4934',
          background: '#3c3836',
          borderRadius: '12px',
          border: '1px solid #fb4934'
        }}>
          Error: {error}
        </div>
      )}

      {!session1Id || !session2Id ? (
        <div style={{
          padding: '3rem',
          textAlign: 'center',
          color: '#a89984',
          background: '#3c3836',
          borderRadius: '12px',
          border: '1px solid #504945'
        }}>
          Select two sessions to compare
        </div>
      ) : null}
    </div>
  );
}

export default SessionComparison;

