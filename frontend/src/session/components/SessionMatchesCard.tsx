// SessionMatchesCard — the 5 most-recent session matches with a "see all"
// button and per-row edit.
import MatchRow from './MatchRow';
import type { Match } from '../../types';

interface SessionMatchesCardProps {
  matches: Match[];
  total: number;
  onSeeAll: () => void;
  onEdit: (match: Match) => void;
}

export default function SessionMatchesCard({ matches, total, onSeeAll, onEdit }: SessionMatchesCardProps) {
  return (
    <div style={{ background: 'var(--panel)', border: '1px solid var(--line-2)', borderRadius: 18, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-light)', fontFamily: 'var(--font-display)' }}>
          Session Matches
        </span>
        <button
          onClick={onSeeAll}
          style={{
            background: 'var(--card)',
            border: '1px solid var(--line)',
            borderRadius: 8,
            padding: '5px 11px',
            color: 'var(--blue)',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            cursor: 'pointer',
          }}
        >
          See all {total} →
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {matches.slice(0, 5).map((m) => (
          <MatchRow key={m.match_id} match={m} onEdit={onEdit} />
        ))}
      </div>
    </div>
  );
}
