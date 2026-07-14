// ScoreboardMobile — hero direction A: two arcade VS panels + a momentum card.
import CharToken from '../components/CharToken';
import { SplitBar, RunPips } from '../components/bars';
import { PLAYER_PANEL } from '../palette';
import type { LiveSession } from '../../hooks/useLiveSession';
import type { Player } from '../../types';

function PlayerPanel({
  player,
  character,
  score,
}: {
  player: Player;
  character: string;
  score: number;
}) {
  const panel = PLAYER_PANEL[player];
  const color = player === 'Shayne' ? 'var(--shayne)' : 'var(--matt)';
  return (
    <div
      style={{
        background: panel.bg,
        border: `1px solid ${panel.border}`,
        borderRadius: 18,
        padding: '16px 12px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 0%, ${panel.glow}, transparent 70%)` }} />
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <CharToken character={character} player={player} size={52} radius={14} />
        </div>
        <div style={{ fontSize: 12, color, fontWeight: 600, letterSpacing: '0.5px', fontFamily: 'var(--font-display)' }}>
          {player.toUpperCase()}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 52, fontWeight: 700, color: 'var(--fg-light)', lineHeight: 1, marginTop: 6 }}>
          {score}
        </div>
        <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 4, fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {character || '—'}
        </div>
      </div>
    </div>
  );
}

export default function ScoreboardMobile({ live }: { live: LiveSession }) {
  const run = live.currentRun;
  return (
    <div style={{ animation: 'popIn 0.3s ease' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'stretch', marginBottom: 14 }}>
        <PlayerPanel player="Shayne" character={live.onDeck?.shayneChar ?? ''} score={live.shayneWins} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 2px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--faint)', fontWeight: 600 }}>VS</div>
          <div style={{ width: 1, flex: 1, background: 'linear-gradient(#3c3836,transparent,#3c3836)', margin: '8px 0' }} />
        </div>
        <PlayerPanel player="Matt" character={live.onDeck?.mattChar ?? ''} score={live.mattWins} />
      </div>

      <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, padding: '12px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 9 }}>
          <span style={{ fontSize: 11, color: 'var(--gray)', fontFamily: 'var(--font-mono)', letterSpacing: '0.5px' }}>MOMENTUM</span>
          {run && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: run.player === 'Shayne' ? 'var(--shayne)' : 'var(--matt)' }}>
              <span style={{ animation: 'flamePulse 1.4s infinite' }}>🔥</span>
              {run.player} on a {run.length}-win run
            </span>
          )}
        </div>
        <div style={{ marginBottom: 10 }}>
          <SplitBar shayne={live.shayneWins} matt={live.mattWins} height={8} radius={5} />
        </div>
        <RunPips pips={live.runPips} />
      </div>
      <style>{`
        @keyframes popIn { from { opacity:0; transform:translateY(10px) scale(.97);} to {opacity:1; transform:none;} }
        @keyframes flamePulse { 0%,100%{ transform:scale(1);} 50%{ transform:scale(1.12);} }
      `}</style>
    </div>
  );
}
