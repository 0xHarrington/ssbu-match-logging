// Scoreboard — the cinematic desktop VS hero. The logged-in (home) player on
// the left, two player cells mirrored around a center VS/GAME column, each
// with the session's full character roster beneath the name, then a momentum
// strip (split bar + run pips). Sizes clamp with the viewport so the card
// compresses instead of overflowing when the window narrows.
import CharToken from './CharToken';
import { SplitBar, RunPips } from './bars';
import { PLAYER_COLOR_VAR } from '../palette';
import { useViewer } from '../../viewer';
import type { CharacterSessionUsage } from '../../hooks/useLiveSession';
import type { Player } from '../../types';

interface ScoreboardProps {
  shayneChar: string;
  mattChar: string;
  shayneWins: number;
  mattWins: number;
  gameNumber: number;
  runPips: Player[];
  shayneRoster: CharacterSessionUsage[];
  mattRoster: CharacterSessionUsage[];
}

const GLOW: Record<Player, string> = {
  Matt: 'rgba(184,187,38,0.14)',
  Shayne: 'rgba(254,128,25,0.14)',
};

/** The session characters beyond the one on deck, as small tokens. */
function RosterStrip({
  roster,
  current,
  player,
  mirror,
}: {
  roster: CharacterSessionUsage[];
  current: string;
  player: Player;
  mirror?: boolean;
}) {
  const extras = roster.filter((u) => u.character !== current);
  if (extras.length === 0) return null;
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 5,
        marginTop: 8,
        justifyContent: mirror ? 'flex-end' : 'flex-start',
      }}
    >
      {extras.map((u) => (
        <span
          key={u.character}
          title={`${u.character} — ${u.wins}W / ${u.games - u.wins}L this session`}
        >
          <CharToken character={u.character} player={player} size={26} radius={8} />
        </span>
      ))}
    </div>
  );
}

function PlayerCell({
  player,
  character,
  score,
  roster,
  mirror,
}: {
  player: Player;
  character: string;
  score: number;
  roster: CharacterSessionUsage[];
  mirror?: boolean;
}) {
  const color = PLAYER_COLOR_VAR[player];
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'clamp(8px, 1.5vw, 16px)',
        minWidth: 0,
        flexDirection: mirror ? 'row-reverse' : 'row',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(8px, 1.5vw, 16px)', minWidth: 0, flexDirection: mirror ? 'row-reverse' : 'row' }}>
        <CharToken character={character} player={player} size={84} radius={22} glow />
        <div style={{ minWidth: 0, textAlign: mirror ? 'right' : 'left' }}>
          <div style={{ fontSize: 15, color, fontWeight: 700, letterSpacing: '0.5px', fontFamily: 'var(--font-display)' }}>
            {player.toUpperCase()}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--gray)', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {character || '—'}
          </div>
          <RosterStrip roster={roster} current={character} player={player} mirror={mirror} />
        </div>
      </div>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'clamp(44px, 7vw, 100px)',
          fontWeight: 700,
          color: 'var(--fg-light)',
          lineHeight: 0.8,
          flex: '0 0 auto',
        }}
      >
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
  shayneRoster,
  mattRoster,
}: ScoreboardProps) {
  const { home, away } = useViewer();
  const cellFor = (p: Player) =>
    p === 'Shayne'
      ? { character: shayneChar, score: shayneWins, roster: shayneRoster }
      : { character: mattChar, score: mattWins, roster: mattRoster };
  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 24,
        border: '1px solid var(--line)',
        background: 'linear-gradient(135deg,#221f1e,#1a1716)',
        padding: 'clamp(20px, 2.5vw, 34px) clamp(20px, 2.8vw, 38px)',
      }}
    >
      <div style={{ position: 'absolute', top: '-50%', left: '-8%', width: '46%', height: '200%', background: `radial-gradient(circle,${GLOW[home]},transparent 62%)` }} />
      <div style={{ position: 'absolute', top: '-50%', right: '-8%', width: '46%', height: '200%', background: `radial-gradient(circle,${GLOW[away]},transparent 62%)` }} />
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto minmax(0,1fr)', alignItems: 'center', gap: 'clamp(10px, 1.8vw, 24px)' }}>
          <PlayerCell player={home} {...cellFor(home)} />
          <div style={{ textAlign: 'center', padding: '0 6px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: 'var(--faint)', fontWeight: 600, letterSpacing: 2 }}>VS</div>
            <div style={{ width: 1, height: 56, background: 'linear-gradient(#3c3836,transparent,#3c3836)', margin: '10px auto' }} />
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--faint)' }}>GAME {gameNumber}</div>
          </div>
          <PlayerCell player={away} {...cellFor(away)} mirror />
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
