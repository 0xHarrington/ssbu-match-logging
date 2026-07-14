// Scoreboard — the cinematic desktop VS hero. Two player cells mirrored around
// a center VS/GAME column, then a momentum strip (split bar + run pips).
import CharToken from './CharToken';
import { SplitBar, RunPips } from './bars';
import { PLAYER_COLOR_VAR } from '../palette';
import type { Player } from '../../types';

interface ScoreboardProps {
  shayneChar: string;
  mattChar: string;
  shayneWins: number;
  mattWins: number;
  gameNumber: number;
  runPips: Player[];
}

function PlayerCell({
  player,
  character,
  score,
  mirror,
}: {
  player: Player;
  character: string;
  score: number;
  mirror?: boolean;
}) {
  const color = PLAYER_COLOR_VAR[player];
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        flexDirection: mirror ? 'row-reverse' : 'row',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0, flexDirection: mirror ? 'row-reverse' : 'row' }}>
        <CharToken character={character} player={player} size={84} radius={22} glow />
        <div style={{ minWidth: 0, textAlign: mirror ? 'right' : 'left' }}>
          <div style={{ fontSize: 15, color, fontWeight: 700, letterSpacing: '0.5px', fontFamily: 'var(--font-display)' }}>
            {player.toUpperCase()}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--gray)', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {character || '—'}
          </div>
        </div>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 100, fontWeight: 700, color: 'var(--fg-light)', lineHeight: 0.8 }}>
        {score}
      </div>
    </div>
  );
}

export default function Scoreboard({
  shayneChar,
  mattChar,
  shayneWins,
  mattWins,
  gameNumber,
  runPips,
}: ScoreboardProps) {
  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 24,
        border: '1px solid var(--line)',
        background: 'linear-gradient(135deg,#221f1e,#1a1716)',
        padding: '34px 38px',
      }}
    >
      <div style={{ position: 'absolute', top: '-50%', left: '-8%', width: '46%', height: '200%', background: 'radial-gradient(circle,rgba(254,128,25,0.14),transparent 62%)' }} />
      <div style={{ position: 'absolute', top: '-50%', right: '-8%', width: '46%', height: '200%', background: 'radial-gradient(circle,rgba(184,187,38,0.14),transparent 62%)' }} />
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 24 }}>
          <PlayerCell player="Shayne" character={shayneChar} score={shayneWins} />
          <div style={{ textAlign: 'center', padding: '0 6px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: 'var(--faint)', fontWeight: 600, letterSpacing: 2 }}>VS</div>
            <div style={{ width: 1, height: 56, background: 'linear-gradient(#3c3836,transparent,#3c3836)', margin: '10px auto' }} />
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--faint)' }}>GAME {gameNumber}</div>
          </div>
          <PlayerCell player="Matt" character={mattChar} score={mattWins} mirror />
        </div>

        <div style={{ marginTop: 28, paddingTop: 22, borderTop: '1px solid var(--line-2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 11 }}>
            <span style={{ fontSize: 11, color: 'var(--gray)', fontFamily: 'var(--font-mono)', letterSpacing: 1 }}>SESSION MOMENTUM</span>
            <span style={{ fontSize: 12, color: 'var(--gray)' }}>last {runPips.length} games, newest right</span>
          </div>
          <div style={{ marginBottom: 12 }}>
            <SplitBar shayne={shayneWins} matt={mattWins} height={10} radius={6} />
          </div>
          <RunPips pips={runPips} />
        </div>
      </div>
    </div>
  );
}
