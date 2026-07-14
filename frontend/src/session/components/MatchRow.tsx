// MatchRow — a single logged match, shared by the session feed, the see-all
// modal, and the mobile momentum feed. A 6px accent bar in the winner's color,
// the char-vs-char line, stage/time, the winner label, and an optional edit ✎.
import { PLAYER_COLOR_VAR, winnerColorVar } from '../palette';
import { matchTime, stocksLabel } from '../format';
import type { Match } from '../../types';

interface MatchRowProps {
  match: Match;
  onEdit?: (match: Match) => void;
  compact?: boolean;
}

export default function MatchRow({ match, onEdit, compact = false }: MatchRowProps) {
  const winColor = winnerColorVar(String(match.winner));
  const fontSize = compact ? 13 : 14;

  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        background: 'var(--card)',
        border: '1px solid var(--line)',
        borderRadius: 12,
        padding: '10px 12px',
      }}
    >
      <div style={{ width: 6, alignSelf: 'stretch', borderRadius: 4, background: winColor, flex: '0 0 auto' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize, fontWeight: 600, color: 'var(--fg-light)' }}>
          <span style={{ color: PLAYER_COLOR_VAR.Shayne, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {match.shayne_character}
          </span>
          <span style={{ color: 'var(--faint)', fontSize: 12, flex: '0 0 auto' }}>vs</span>
          <span style={{ color: PLAYER_COLOR_VAR.Matt, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {match.matt_character}
          </span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--gray)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
          {match.stage || 'No Stage'} · {matchTime(match.datetime)}
        </div>
      </div>
      <div style={{ textAlign: 'right', flex: '0 0 auto' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: winColor }}>{String(match.winner)}</div>
        <div style={{ fontSize: 10, color: 'var(--faint)', fontFamily: 'var(--font-mono)' }}>
          {stocksLabel(match.stocks_remaining)} left
        </div>
      </div>
      {onEdit && (
        <button
          onClick={() => onEdit(match)}
          aria-label="Edit match"
          style={{
            flex: '0 0 auto',
            width: 30,
            height: 30,
            borderRadius: 9,
            background: 'var(--deep0)',
            border: '1px solid var(--line)',
            color: 'var(--gray)',
            cursor: 'pointer',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ✎
        </button>
      )}
    </div>
  );
}
