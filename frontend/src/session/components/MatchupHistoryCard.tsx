// MatchupHistoryCard — the on-deck matchup's record, surfaced for mid-session
// coaching: all-time, last 50, and this session (per the design's key decision).
import CharToken from './CharToken';
import { SplitBar } from './bars';
import type { MatchupRecord, OnDeckMatchup } from '../../hooks/useLiveSession';

interface Column {
  label: string;
  record: MatchupRecord | null;
}

function MatchupColumn({ label, record }: Column) {
  const games = record?.games ?? 0;
  const s = record?.shayneWins ?? 0;
  const m = record?.mattWins ?? 0;
  const pct = games > 0 ? Math.round((s / games) * 100) : null;

  return (
    <div style={{ background: 'var(--deep0)', border: '1px solid var(--line-2)', borderRadius: 14, padding: 15 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 12, color: 'var(--gray)', fontFamily: 'var(--font-mono)', letterSpacing: 0.5 }}>{label}</span>
        <span style={{ fontSize: 10, color: 'var(--faint)', fontFamily: 'var(--font-mono)' }}>{games} games</span>
      </div>
      {record ? (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '8px 0 10px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 700, color: 'var(--fg-light)' }}>
              {s}–{m}
            </span>
            {pct != null && <span style={{ fontSize: 12, color: 'var(--shayne)', fontWeight: 600 }}>{pct}%</span>}
          </div>
          <SplitBar shayne={s} matt={m} height={7} radius={4} />
        </>
      ) : (
        <div style={{ fontSize: 12, color: 'var(--faint)', margin: '12px 0 6px', fontFamily: 'var(--font-mono)' }}>
          No games yet
        </div>
      )}
    </div>
  );
}

export default function MatchupHistoryCard({ onDeck }: { onDeck: OnDeckMatchup }) {
  const columns: Column[] = [
    { label: 'All-time', record: onDeck.allTime },
    { label: 'Last 50', record: onDeck.last50 },
    { label: 'This session', record: onDeck.thisSession },
  ];
  return (
    <div style={{ background: 'linear-gradient(135deg,#201d1c,#1a1716)', border: '1px solid var(--line)', borderRadius: 18, padding: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <CharToken character={onDeck.shayneChar} player="Shayne" size={38} radius={11} />
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg-light)', fontFamily: 'var(--font-display)' }}>
            {onDeck.shayneChar} <span style={{ color: 'var(--faint)', fontWeight: 400 }}>vs</span> {onDeck.mattChar}
          </span>
          <CharToken character={onDeck.mattChar} player="Matt" size={38} radius={11} />
        </div>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--blue)',
            background: 'var(--deep0)',
            border: '1px solid var(--line-2)',
            borderRadius: 8,
            padding: '5px 10px',
          }}
        >
          on-deck matchup · how it's gone
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
        {columns.map((c) => (
          <MatchupColumn key={c.label} {...c} />
        ))}
      </div>
    </div>
  );
}
