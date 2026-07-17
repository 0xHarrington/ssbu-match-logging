// TitleStrip — session name + streak chip + meta line + tearsheet/auto-detect
// pills.
import { Link } from 'react-router-dom';
import { TearsheetIcon } from '../../components/shell/icons';
import { formatDuration } from '../format';
import type { LiveSession } from '../../hooks/useLiveSession';

interface TitleStripProps {
  live: LiveSession;
  onAutoDetect: () => void;
  size?: 'desktop' | 'mobile';
}

export default function TitleStrip({ live, onAutoDetect, size = 'desktop' }: TitleStripProps) {
  const desktop = size === 'desktop';
  const run = live.currentRun;
  const metaParts = [
    live.ordinal ? `Session #${live.ordinal}` : 'Session',
    `${live.totalGames} game${live.totalGames === 1 ? '' : 's'}`,
    formatDuration(live.durationMinutes),
    live.isActive ? 'live' : 'ended',
  ];

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h2
            style={{
              fontSize: desktop ? 26 : 19,
              fontWeight: 700,
              color: 'var(--fg-light)',
              letterSpacing: '-0.5px',
              margin: 0,
              fontFamily: 'var(--font-display)',
            }}
          >
            {live.displayName}
          </h2>
          {run && (
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: '#1f2410',
                border: '1px solid #4a5410',
                borderRadius: 20,
                padding: '5px 11px',
              }}
            >
              <span style={{ animation: 'flamePulse 1.4s infinite', fontSize: 13 }}>🔥</span>
              <span style={{ fontSize: 12, color: 'var(--matt)', fontWeight: 600 }}>
                {run.player} on a {run.length}-win run
              </span>
            </span>
          )}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--gray)', marginTop: 6 }}>
          {metaParts.join(' · ')}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flex: '0 0 auto' }}>
        <Link
          to={`/session-tearsheet?session_id=${encodeURIComponent(live.sessionId)}`}
          title="Generate a shareable tearsheet for this session"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--deep1)',
            color: 'var(--fg)',
            border: '1px solid var(--line-2)',
            borderRadius: 12,
            padding: '6px 14px',
            fontSize: 12,
            fontWeight: 600,
            fontFamily: 'var(--font-mono)',
            textDecoration: 'none',
          }}
        >
          <TearsheetIcon size={14} />
          Tearsheet
        </Link>
        <button
          onClick={onAutoDetect}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--blue)',
            color: '#1b1817',
            border: 'none',
            borderRadius: 12,
            padding: '6px 8px 6px 14px',
            fontSize: 12,
            fontWeight: 600,
            fontFamily: 'var(--font-mono)',
            cursor: 'pointer',
          }}
        >
          Auto-detect
          <span style={{ width: 22, height: 22, borderRadius: 7, background: 'rgba(27,24,23,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>◉</span>
        </button>
      </div>
      <style>{`@keyframes flamePulse { 0%,100%{ transform:scale(1);} 50%{ transform:scale(1.12);} }`}</style>
    </div>
  );
}
