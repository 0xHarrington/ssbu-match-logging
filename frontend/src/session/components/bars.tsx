// Small proportional-bar primitives shared across the Session screens.
// Ordering is viewer-relative: the logged-in (home) player's segment first.
import { useViewer } from '../../viewer';
import type { Player } from '../../types';

interface SplitBarProps {
  shayne: number;
  matt: number;
  height?: number;
  radius?: number;
}

/** Two-segment proportional bar, home player's segment first.
 *  A zero-zero split renders an empty track rather than dividing by zero. */
export function SplitBar({ shayne, matt, height = 8, radius = 5 }: SplitBarProps) {
  const { home } = useViewer();
  const empty = shayne <= 0 && matt <= 0;
  const mattSeg = { player: 'Matt' as Player, value: matt, color: 'var(--matt)' };
  const shayneSeg = { player: 'Shayne' as Player, value: shayne, color: 'var(--shayne)' };
  const segments = home === 'Matt' ? [mattSeg, shayneSeg] : [shayneSeg, mattSeg];
  return (
    <div
      style={{
        display: 'flex',
        height,
        borderRadius: radius,
        overflow: 'hidden',
        gap: 2,
        background: empty ? 'var(--deep1)' : undefined,
      }}
    >
      {segments.map((s) => (
        <div
          key={s.player}
          style={{ flex: empty ? 1 : s.value, background: s.color, borderRadius: radius - 1 }}
        />
      ))}
    </div>
  );
}

interface RunPipsProps {
  pips: Player[];
  height?: number;
}

/** A row of per-game winner pips, oldest -> newest (newest rightmost). */
export function RunPips({ pips, height = 14 }: RunPipsProps) {
  if (pips.length === 0) return null;
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {pips.map((p, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height,
            borderRadius: 3,
            background: p === 'Shayne' ? 'var(--shayne)' : 'var(--matt)',
          }}
        />
      ))}
    </div>
  );
}
