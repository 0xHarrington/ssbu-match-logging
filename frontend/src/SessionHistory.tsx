import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Legend, Tooltip } from './components/dither';
import { LoadingState, ErrorState } from './components/Feedback';
import { PageColumn, PageHeader, SectionTitle, Card, StatTile } from './components/ui';
import { SplitBar } from './session/components/bars';
import { formatDuration, sessionDisplayName } from './session/format';

interface Session {
  session_id: string;
  start_time: string;
  end_time: string;
  total_games: number;
  shayne_wins: number;
  matt_wins: number;
  duration_minutes: number;
}

interface TimelineData {
  session_id: string;
  date: string;
  datetime: string;
  games: number;
  shayne_wins: number;
  matt_wins: number;
  duration_minutes: number;
}

interface ActivityChartRow {
  date: string;
  shayne_wins: number;
  matt_wins: number;
}

function SessionHistory() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterMinGames, setFilterMinGames] = useState(0);
  const [timelineData, setTimelineData] = useState<TimelineData[]>([]);

  useEffect(() => {
    fetchSessions();
    fetchTimeline();
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeline = async () => {
    try {
      const res = await fetch('/api/sessions/timeline');
      const data = await res.json();

      if (data.success && data.data) {
        setTimelineData(data.data);
      }
    } catch (err) {
      console.error('Error fetching timeline:', err);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const filteredSessions = sessions.filter((s) => s.total_games >= filterMinGames);

  // Calculate statistics
  const totalGames = sessions.reduce((sum, s) => sum + s.total_games, 0);
  const avgGamesPerSession = sessions.length > 0 ? (totalGames / sessions.length).toFixed(1) : 0;
  const avgDuration =
    sessions.length > 0
      ? Math.round(sessions.reduce((sum, s) => sum + s.duration_minutes, 0) / sessions.length)
      : 0;

  // Timeline chart rows: one bar pair per session, stacked so total height = games played
  const activityChartData: ActivityChartRow[] = timelineData.map((d) => ({
    date: new Date(d.datetime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    shayne_wins: d.shayne_wins,
    matt_wins: d.matt_wins,
  }));

  if (loading) return <LoadingState label="Loading sessions…" />;
  if (error) return <ErrorState message={error} onRetry={fetchSessions} />;

  return (
    <PageColumn>
      <PageHeader
        title="Session History"
        subtitle="View and analyze all your gaming sessions"
        action={
          <Link
            to="/sessions/compare"
            style={{
              background: 'var(--blue)',
              color: '#1b1817',
              borderRadius: 12,
              padding: '11px 18px',
              fontWeight: 700,
              fontSize: 13,
              fontFamily: 'var(--font-display)',
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            ⇄ Compare sessions
          </Link>
        }
      />

      {/* summary tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 14 }}>
        <StatTile caps value={sessions.length} label="Total sessions" color="var(--blue)" />
        <StatTile caps value={totalGames} label="Total games" color="var(--yellow)" />
        <StatTile caps value={avgGamesPerSession} label="Avg games/session" color="var(--aqua)" />
        <StatTile caps value={formatDuration(avgDuration)} label="Avg duration" color="var(--purple)" />
      </div>

      {/* activity over time */}
      {timelineData.length > 0 && (
        <Card>
          <SectionTitle hint="Shayne / Matt">Session activity over time</SectionTitle>
          <div style={{ height: 260, width: '100%' }}>
            <BarChart
              data={activityChartData}
              config={{
                shayne_wins: { label: 'Shayne wins', color: 'orange' },
                matt_wins: { label: 'Matt wins', color: 'green' },
              }}
              stackType="stacked"
            >
              <XAxis dataKey="date" />
              <YAxis />
              <Legend isClickable />
              <Tooltip labelKey="date" />
              <Bar dataKey="shayne_wins" variant="hatched" />
              <Bar dataKey="matt_wins" variant="gradient" />
            </BarChart>
          </div>
        </Card>
      )}

      {/* filter bar */}
      <div
        style={{
          background: 'var(--panel)',
          border: '1px solid var(--line-2)',
          borderRadius: 12,
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          flexWrap: 'wrap',
        }}
      >
        <label style={{ fontSize: 13, color: 'var(--fg)' }}>Minimum games</label>
        <input
          type="number"
          min="0"
          value={filterMinGames}
          onChange={(e) => setFilterMinGames(parseInt(e.target.value) || 0)}
          style={{
            background: 'var(--deep1)',
            border: '1px solid var(--border-light)',
            borderRadius: 8,
            padding: '6px 10px',
            color: 'var(--fg)',
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            width: 64,
          }}
        />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--faint)' }}>
          Showing {filteredSessions.length} of {sessions.length} sessions
        </span>
      </div>

      {/* session card grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16 }}>
        {filteredSessions.map((session) => {
          const winner =
            session.shayne_wins > session.matt_wins
              ? 'Shayne'
              : session.matt_wins > session.shayne_wins
              ? 'Matt'
              : 'Even';
          const badge =
            winner === 'Shayne'
              ? { color: 'var(--shayne)', bg: 'rgba(254,128,25,0.15)' }
              : winner === 'Matt'
              ? { color: 'var(--matt)', bg: 'rgba(184,187,38,0.15)' }
              : { color: 'var(--gray)', bg: 'rgba(168,153,132,0.15)' };

          return (
            <Link
              key={session.session_id}
              to={`/sessions/${encodeURIComponent(session.session_id)}`}
              style={{
                background: 'var(--panel)',
                border: '1px solid var(--line-2)',
                borderRadius: 16,
                padding: 18,
                cursor: 'pointer',
                textDecoration: 'none',
                color: 'inherit',
                display: 'block',
              }}
            >
              {/* header */}
              <div style={{ paddingBottom: 12, marginBottom: 12, borderBottom: '1px solid var(--line-2)' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg-light)' }}>
                  {sessionDisplayName(session.start_time)}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)', marginTop: 3 }}>
                  {formatDate(session.start_time)}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--faint)', marginTop: 2 }}>
                  {formatTime(session.start_time)} → {formatTime(session.end_time)}
                </div>
              </div>

              {/* games + duration */}
              <div style={{ display: 'flex', gap: 24, marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--gray)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: 2 }}>
                    Games
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: 'var(--aqua)' }}>
                    {session.total_games}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--gray)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: 2 }}>
                    Duration
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: 'var(--yellow)' }}>
                    {formatDuration(session.duration_minutes)}
                  </div>
                </div>
              </div>

              {/* score */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--shayne)' }}>
                  Shayne {session.shayne_wins}
                </span>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--matt)' }}>
                  {session.matt_wins} Matt
                </span>
              </div>

              <div style={{ marginBottom: 14 }}>
                <SplitBar shayne={session.shayne_wins} matt={session.matt_wins} height={6} radius={3} />
              </div>

              {/* winner badge */}
              <span
                style={{
                  display: 'inline-block',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '3px 9px',
                  borderRadius: 6,
                  color: badge.color,
                  background: badge.bg,
                }}
              >
                {winner}
              </span>
            </Link>
          );
        })}
      </div>

      {filteredSessions.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--faint)' }}>
          No sessions match your filter
        </div>
      )}
    </PageColumn>
  );
}

export default SessionHistory;
