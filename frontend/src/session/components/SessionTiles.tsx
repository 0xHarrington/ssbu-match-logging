// SessionTiles — four session-scoped stat tiles. All numbers are about THIS
// session (global/all-time stats live on the Stats page, per the design).
import { StatTile } from '../../components/ui';
import type { LiveSession } from '../../hooks/useLiveSession';
import { parseStocks } from '../format';
import { sessionLead } from '../palette';

interface Tile {
  value: string;
  label: string;
  color: string;
}

function deriveTiles(live: LiveSession): Tile[] {
  const { label: leadLabel, color: leadColor } = sessionLead(live.shayneWins, live.mattWins);

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
        <StatTile key={t.label} value={t.value} label={t.label} color={t.color} size={24} />
      ))}
    </div>
  );
}
