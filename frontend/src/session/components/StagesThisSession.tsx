// StagesThisSession — per-stage game counts + home–away split for the stages
// actually played this session.
import { SplitBar } from './bars';
import { useViewer } from '../../viewer';
import type { StageSplit } from '../../hooks/useLiveSession';

export default function StagesThisSession({ stages }: { stages: StageSplit[] }) {
  const { home, away } = useViewer();
  const winsFor = (st: StageSplit, p: 'Matt' | 'Shayne') =>
    p === 'Matt' ? st.mattWins : st.shayneWins;
  return (
    <div style={{ background: 'var(--panel)', border: '1px solid var(--line-2)', borderRadius: 18, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-light)', fontFamily: 'var(--font-display)' }}>
          Stages this session
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)' }}>{home[0]}–{away[0]}</span>
      </div>
      {stages.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--faint)', fontFamily: 'var(--font-mono)' }}>No stages logged yet</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
          {stages.map((st) => (
            <div key={st.stage}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: 'var(--fg)', fontWeight: 500 }}>{st.stage}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)' }}>
                  {st.games} game{st.games === 1 ? '' : 's'} · {winsFor(st, home)}–{winsFor(st, away)}
                </span>
              </div>
              <SplitBar shayne={st.shayneWins} matt={st.mattWins} height={6} radius={3} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
