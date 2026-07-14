// SessionTiles — four session-scoped stat tiles. All numbers are about THIS
// session (global/all-time stats live on the Stats page, per the design).
import type { LiveSession } from '../../hooks/useLiveSession';
import { parseStocks } from '../format';

interface Tile {
  value: string;
  label: string;
  color: string;
}

function deriveTiles(live: LiveSession): Tile[] {
  const lead = live.shayneWins - live.mattWins;
  const leadLabel =
    lead === 0 ? 'Even' : lead > 0 ? `Shayne +${lead}` : `Matt +${-lead}`;
  const leadColor = lead === 0 ? 'var(--gray)' : lead > 0 ? 'var(--shayne)' : 'var(--matt)';

  const run = live.currentRun;
  const runLabel = run ? `${run.player} W${run.length}` : '—';
  const runColor = run ? (run.player === 'Shayne' ? 'var(--shayne)' : 'var(--matt)') : 'var(--gray)';

  const lastStock = live.matches.filter((m) => parseStocks(m.stocks_remaining) === 1).length;

  return [
    { value: String(live.totalGames), label: 'Games this session', color: 'var(--fg-light)' },
    { value: runLabel, label: 'Current run', color: runColor },
    { value: leadLabel, label: 'Session lead', color: leadColor },
    { value: String(lastStock), label: 'Went to last stock', color: 'var(--blue)' },
  ];
}

export default function SessionTiles({ live }: { live: LiveSession }) {
  const tiles = deriveTiles(live);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
      {tiles.map((t) => (
        <div key={t.label} style={{ background: 'var(--panel)', border: '1px solid var(--line-2)', borderRadius: 16, padding: 18 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 700, color: t.color }}>{t.value}</div>
          <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 5 }}>{t.label}</div>
        </div>
      ))}
    </div>
  );
}
