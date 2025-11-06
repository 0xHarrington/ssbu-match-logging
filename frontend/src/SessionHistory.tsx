import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface Session {
  session_id: string;
  start_time: string;
  end_time: string;
  total_games: number;
  shayne_wins: number;
  matt_wins: number;
  duration_minutes: number;
}

function SessionHistory() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterMinGames, setFilterMinGames] = useState(0);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/sessions');
      const data = await res.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to load sessions');
      }
      
      setSessions(data.sessions);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit' 
    });
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const filteredSessions = sessions.filter(s => s.total_games >= filterMinGames);

  // Calculate statistics
  const totalGames = sessions.reduce((sum, s) => sum + s.total_games, 0);
  const avgGamesPerSession = sessions.length > 0 ? (totalGames / sessions.length).toFixed(1) : 0;
  const avgDuration = sessions.length > 0 
    ? Math.round(sessions.reduce((sum, s) => sum + s.duration_minutes, 0) / sessions.length)
    : 0;

  if (loading) {
    return (
      <div style={{ 
        padding: '2rem', 
        textAlign: 'center',
        color: '#a89984' 
      }}>
        Loading sessions...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        padding: '2rem', 
        textAlign: 'center',
        color: '#fb4934' 
      }}>
        Error: {error}
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '2rem',
      maxWidth: '1400px',
      margin: '0 auto'
    }}>
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
            📊 Session History
          </h1>
          <p style={{ color: '#a89984', fontSize: '0.95rem' }}>
            View and analyze all your gaming sessions
          </p>
        </div>
        <Link
          to="/sessions/compare"
          style={{
            padding: '0.75rem 1.5rem',
            background: '#83a598',
            color: '#282828',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.9rem',
            fontWeight: 'bold',
            textDecoration: 'none',
            display: 'inline-block',
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
          🔄 Compare Sessions
        </Link>
      </div>

      {/* Summary Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div style={{
          background: '#3c3836',
          borderRadius: '12px',
          padding: '1.5rem',
          border: '1px solid #504945'
        }}>
          <div style={{ fontSize: '0.75rem', color: '#a89984', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
            Total Sessions
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#83a598' }}>
            {sessions.length}
          </div>
        </div>

        <div style={{
          background: '#3c3836',
          borderRadius: '12px',
          padding: '1.5rem',
          border: '1px solid #504945'
        }}>
          <div style={{ fontSize: '0.75rem', color: '#a89984', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
            Total Games
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#b8bb26' }}>
            {totalGames}
          </div>
        </div>

        <div style={{
          background: '#3c3836',
          borderRadius: '12px',
          padding: '1.5rem',
          border: '1px solid #504945'
        }}>
          <div style={{ fontSize: '0.75rem', color: '#a89984', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
            Avg Games/Session
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fabd2f' }}>
            {avgGamesPerSession}
          </div>
        </div>

        <div style={{
          background: '#3c3836',
          borderRadius: '12px',
          padding: '1.5rem',
          border: '1px solid #504945'
        }}>
          <div style={{ fontSize: '0.75rem', color: '#a89984', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
            Avg Duration
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fe8019' }}>
            {formatDuration(avgDuration)}
          </div>
        </div>
      </div>

      {/* Filter */}
      <div style={{
        background: '#3c3836',
        borderRadius: '12px',
        padding: '1rem',
        marginBottom: '1.5rem',
        border: '1px solid #504945',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem'
      }}>
        <label style={{ color: '#ebdbb2', fontSize: '0.9rem' }}>
          Minimum Games:
        </label>
        <input
          type="number"
          min="0"
          value={filterMinGames}
          onChange={(e) => setFilterMinGames(parseInt(e.target.value) || 0)}
          style={{
            background: '#282828',
            border: '1px solid #504945',
            borderRadius: '6px',
            padding: '0.5rem',
            color: '#ebdbb2',
            width: '80px'
          }}
        />
        <span style={{ color: '#a89984', fontSize: '0.85rem' }}>
          Showing {filteredSessions.length} of {sessions.length} sessions
        </span>
      </div>

      {/* Sessions List */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
        gap: '1.5rem'
      }}>
        {filteredSessions.map((session) => {
          const shayneWinRate = session.total_games > 0 
            ? (session.shayne_wins / session.total_games * 100).toFixed(1)
            : 0;
          const winner = session.shayne_wins > session.matt_wins ? 'Shayne' : 
                        session.matt_wins > session.shayne_wins ? 'Matt' : 'Tie';
          
          return (
            <Link
              key={session.session_id}
              to={`/sessions/${session.session_id}`}
              style={{ textDecoration: 'none' }}
            >
              <div style={{
                background: '#3c3836',
                borderRadius: '12px',
                padding: '1.5rem',
                border: '1px solid #504945',
                transition: 'all 0.2s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#504945';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#3c3836';
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = 'none';
              }}>
                {/* Date Header */}
                <div style={{ 
                  marginBottom: '1rem',
                  paddingBottom: '0.75rem',
                  borderBottom: '1px solid #504945'
                }}>
                  <div style={{ 
                    fontSize: '1.1rem', 
                    fontWeight: 'bold',
                    color: '#fbf1c7',
                    marginBottom: '0.25rem'
                  }}>
                    📅 {formatDate(session.start_time)}
                  </div>
                  <div style={{ 
                    fontSize: '0.85rem',
                    color: '#a89984'
                  }}>
                    {formatTime(session.start_time)} → {formatTime(session.end_time)}
                  </div>
                </div>

                {/* Game Count and Duration */}
                <div style={{
                  display: 'flex',
                  gap: '1.5rem',
                  marginBottom: '1rem'
                }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#a89984', marginBottom: '0.25rem' }}>
                      Games
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#83a598' }}>
                      {session.total_games}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#a89984', marginBottom: '0.25rem' }}>
                      Duration
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fabd2f' }}>
                      {formatDuration(session.duration_minutes)}
                    </div>
                  </div>
                </div>

                {/* Score */}
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ 
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.5rem'
                  }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fe8019' }}>
                      Shayne {session.shayne_wins}
                    </span>
                    <span style={{ fontSize: '0.9rem', color: '#a89984' }}>-</span>
                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#b8bb26' }}>
                      {session.matt_wins} Matt
                    </span>
                  </div>
                  
                  {/* Win Rate Bar */}
                  <div style={{
                    height: '6px',
                    background: '#282828',
                    borderRadius: '3px',
                    overflow: 'hidden',
                    display: 'flex'
                  }}>
                    <div style={{
                      width: `${shayneWinRate}%`,
                      background: '#fe8019'
                    }} />
                    <div style={{
                      width: `${100 - parseFloat(shayneWinRate as string)}%`,
                      background: '#b8bb26'
                    }} />
                  </div>
                </div>

                {/* Winner Badge */}
                {winner !== 'Tie' && (
                  <div style={{
                    display: 'inline-block',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    background: winner === 'Shayne' ? '#fe8019' : '#b8bb26',
                    color: '#282828'
                  }}>
                    🏆 {winner} Won
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {filteredSessions.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '3rem',
          color: '#a89984'
        }}>
          No sessions found matching your criteria
        </div>
      )}
    </div>
  );
}

export default SessionHistory;

