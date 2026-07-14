import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PieChart, Pie } from './components/dither';
import CharacterDisplay from './components/CharacterDisplay';
import MatchEditorModal, { type EditableMatch } from './components/MatchEditorModal';
import { LoadingState, ErrorState } from './components/Feedback';
import { stageImages } from './lib/stages';
import { PageColumn, SectionTitle, Card, GlowPanel } from './components/ui';
import { sessionDisplayName, formatDuration, matchTime, stocksLabel } from './session/format';

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

interface WinSplitRow {
  player: string;
  wins: number;
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session');
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

  // Mini donut chart rows (Shayne vs Matt win split)
  const winSplitData: WinSplitRow[] = stats
    ? [
        { player: 'Shayne', wins: stats.shayne_wins },
        { player: 'Matt', wins: stats.matt_wins },
      ]
    : [];

  const formatTimeOfDay = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const formatDatePart = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const durationMinutes = () => {
    if (!stats) return 0;
    const start = new Date(stats.start_time);
    const end = new Date(stats.end_time);
    return Math.floor((end.getTime() - start.getTime()) / 60000);
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
    <PageColumn gap={24}>
      {/* Back link */}
      <Link
        to="/sessions"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          color: 'var(--blue)',
          textDecoration: 'none',
        }}
      >
        ← Back to Sessions
      </Link>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ fontSize: 26, fontWeight: 700, color: 'var(--fg-light)', letterSpacing: '-0.5px', margin: 0, fontFamily: 'var(--font-display)' }}>
            {sessionDisplayName(stats.start_time)}
          </h2>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--gray)', marginTop: 6 }}>
            {formatDatePart(stats.start_time)} · {formatTimeOfDay(stats.start_time)} → {formatTimeOfDay(stats.end_time)}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--faint)', marginTop: 2 }}>
            Duration: {formatDuration(durationMinutes())}
          </div>
        </div>

        <button
          onClick={handleGenerateTearsheet}
          style={{
            background: 'var(--blue)',
            border: 'none',
            borderRadius: 12,
            padding: '11px 18px',
            color: 'var(--deep0)',
            fontFamily: 'var(--font-display)',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Generate tearsheet
        </button>
      </div>

      {/* Score hero */}
      <GlowPanel style={{ padding: '28px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)', letterSpacing: 2, marginBottom: 12 }}>
              SESSION SCORE
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 20 }}>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 56, fontWeight: 700, color: 'var(--shayne)', lineHeight: 1 }}>
                  {stats.shayne_wins}
                </div>
                <div style={{ fontSize: 13, color: 'var(--gray)', marginTop: 4 }}>Shayne</div>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 36, color: 'var(--border-light)' }}>–</div>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 56, fontWeight: 700, color: 'var(--matt)', lineHeight: 1 }}>
                  {stats.matt_wins}
                </div>
                <div style={{ fontSize: 13, color: 'var(--gray)', marginTop: 4 }}>Matt</div>
              </div>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--gray)', marginTop: 14 }}>
              {stats.total_games} games played
            </div>
          </div>
          <div style={{ width: 116, height: 116, flex: '0 0 auto' }}>
            <PieChart
              data={winSplitData}
              config={{
                Shayne: { label: 'Shayne', color: 'orange' },
                Matt: { label: 'Matt', color: 'green' },
              }}
              dataKey="wins"
              nameKey="player"
              innerRadius={0.7}
            >
              <Pie variant="gradient" />
            </PieChart>
          </div>
        </div>
      </GlowPanel>

      {/* Character matchups */}
      {stats.matchup_stats && stats.matchup_stats.length > 0 && (
        <div>
          <SectionTitle>Character matchups</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {stats.matchup_stats.map((matchup, idx) => (
              <div
                key={idx}
                style={{
                  background: 'var(--panel)',
                  border: '1px solid var(--line-2)',
                  borderRadius: 12,
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ color: 'var(--shayne)' }}>{matchup.shayne_character}</span>
                    <span style={{ color: 'var(--faint)', fontSize: 13 }}>vs</span>
                    <span style={{ color: 'var(--matt)' }}>{matchup.matt_character}</span>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)', marginTop: 3 }}>
                    {matchup.total_games} games
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color: 'var(--shayne)' }}>
                    {matchup.shayne_wins}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: 'var(--border-light)' }}>–</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color: 'var(--matt)' }}>
                    {matchup.matt_wins}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Character usage */}
      {(Object.keys(stats.shayne_characters).length > 0 || Object.keys(stats.matt_characters).length > 0) && (
        <div>
          <SectionTitle>Character usage</SectionTitle>
          <div className="char-usage-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {([
              ['Shayne', stats.shayne_characters, 'var(--shayne)'] as const,
              ['Matt', stats.matt_characters, 'var(--matt)'] as const,
            ]).map(([name, chars, color]) => (
              <div
                key={name}
                style={{
                  background: 'var(--panel)',
                  border: '1px solid var(--line-2)',
                  borderRadius: 14,
                  padding: 18,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 14 }}>{name}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {Object.entries(chars)
                    .sort(([, a], [, b]) => b - a)
                    .map(([char, count]) => (
                      <div
                        key={char}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}
                      >
                        <CharacterDisplay character={char} />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700, color }}>
                          {count}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
          <style>{`
            @media (max-width: 640px) {
              .char-usage-grid { grid-template-columns: 1fr !important; }
            }
          `}</style>
        </div>
      )}

      {/* Stage breakdown */}
      {stats.stage_stats.length > 0 && (
        <div>
          <SectionTitle>Stage breakdown</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12 }}>
            {stats.stage_stats.map((stat) => {
              const img = stageImages[stat.stage];
              return (
                <div
                  key={stat.stage}
                  style={{
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: 14,
                    border: '1px solid var(--line)',
                    minHeight: 100,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: 14,
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundImage: img
                        ? `url(${img})`
                        : 'repeating-linear-gradient(115deg,#2a2624,#2a2624 8px,#302b28 8px,#302b28 16px)',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  />
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(12,10,9,.55)' }} />
                  <div style={{ position: 'relative', fontSize: 12, color: 'var(--fg-light)', fontWeight: 600 }}>
                    {stat.stage}
                  </div>
                  <div style={{ position: 'relative', fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 700, color: 'var(--aqua)' }}>
                    {stat.count}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Matches */}
      <div>
        <SectionTitle>Matches</SectionTitle>
        <Card style={{ borderRadius: 14 }} padding={12}>
          {matchesLoading && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--gray)', padding: 8 }}>Loading matches...</div>
          )}
          {matchesError && (
            <div className="error" style={{ fontSize: 12, padding: 8 }}>{matchesError}</div>
          )}
          {!matchesLoading && !matchesError && matches.length === 0 && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--gray)', padding: 8 }}>No matches found for this session.</div>
          )}
          {!matchesLoading && !matchesError && matches.map((match) => {
            const isShayneWin = match.winner === 'Shayne';
            const winColor = isShayneWin ? 'var(--shayne)' : 'var(--matt)';
            return (
              <div
                key={match.match_id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  flexWrap: 'wrap',
                  padding: '10px 8px',
                  borderBottom: '1px solid var(--line-2)',
                }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)', minWidth: 40 }}>
                  {matchTime(match.datetime)}
                </span>
                <span style={{ flex: 1, minWidth: 160, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ color: 'var(--shayne)' }}>{match.shayne_character}</span>
                  <span style={{ color: 'var(--faint)', fontSize: 11 }}>vs</span>
                  <span style={{ color: 'var(--matt)' }}>{match.matt_character}</span>
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    fontWeight: 700,
                    color: winColor,
                    background: `color-mix(in srgb, ${winColor} 18%, transparent)`,
                    borderRadius: 6,
                    padding: '2px 8px',
                  }}
                >
                  {match.winner}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)', minWidth: 110 }}>
                  {match.stage || 'No stage'}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)', minWidth: 44, textAlign: 'right' }}>
                  {stocksLabel(match.stocks_remaining ?? null)}
                </span>
                <button
                  type="button"
                  aria-label="Edit match"
                  title="Edit match"
                  onClick={() => setEditingMatch(match)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--gray)',
                    fontSize: 14,
                    cursor: 'pointer',
                    padding: 2,
                    lineHeight: 1,
                  }}
                >
                  ✎
                </button>
              </div>
            );
          })}
        </Card>
      </div>

      {editingMatch && (
        <MatchEditorModal
          match={editingMatch}
          onClose={() => setEditingMatch(null)}
          onSaved={handleMatchSaved}
        />
      )}
    </PageColumn>
  );
}

export default SessionDetail;
