// HistoryTab — the mobile sessions list. Each row is tappable through to the
// existing session detail page.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ErrorState, LoadingState } from '../../components/Feedback';
import { getSessions } from '../../lib/api';
import { formatDuration, monthDay, sessionDisplayName } from '../format';
import type { SessionSummary } from '../../types';

export default function HistoryTab() {
  const [sessions, setSessions] = useState<SessionSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    setError(null);
    getSessions()
      .then((s) => active && setSessions(s))
      .catch((e) => active && setError(e instanceof Error ? e.message : 'Failed to load sessions'));
    return () => {
      active = false;
    };
  }, [nonce]);

  if (error) return <ErrorState message={error} onRetry={() => setNonce((n) => n + 1)} />;
  if (!sessions) return <LoadingState label="Loading sessions…" />;

  // Newest first.
  const ordered = [...sessions].sort((a, b) => b.start_time.localeCompare(a.start_time));

  return (
    <div style={{ padding: '8px 18px 24px' }}>
      <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--fg-light)', marginBottom: 4, fontFamily: 'var(--font-display)' }}>Sessions</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)', marginBottom: 16 }}>
        {sessions.length} sets · tap for the detail
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {ordered.map((s) => {
          const { mon, day } = monthDay(s.start_time);
          const tie = s.shayne_wins === s.matt_wins;
          const shayneWon = s.shayne_wins > s.matt_wins;
          const winner = tie ? 'Even' : shayneWon ? 'Shayne' : 'Matt';
          const winColor = tie ? 'var(--gray)' : shayneWon ? 'var(--shayne)' : 'var(--matt)';
          return (
            <button
              key={s.session_id}
              onClick={() => navigate(`/sessions/${encodeURIComponent(s.session_id)}`)}
              style={{
                background: 'var(--card)',
                border: '1px solid var(--line)',
                borderRadius: 14,
                padding: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
              }}
            >
              <div style={{ textAlign: 'center', flex: '0 0 auto' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--faint)' }}>{mon}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color: 'var(--fg-light)', lineHeight: 1 }}>{day}</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-light)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {sessionDisplayName(s.start_time)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--gray)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                  {s.total_games} games · {formatDuration(s.duration_minutes)}
                </div>
              </div>
              <div style={{ textAlign: 'right', flex: '0 0 auto' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700 }}>
                  <span style={{ color: 'var(--shayne)' }}>{s.shayne_wins}</span>
                  <span style={{ color: 'var(--faint)' }}>–</span>
                  <span style={{ color: 'var(--matt)' }}>{s.matt_wins}</span>
                </div>
                <div style={{ fontSize: 10, color: winColor, fontFamily: 'var(--font-mono)', marginTop: 2 }}>{winner}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
