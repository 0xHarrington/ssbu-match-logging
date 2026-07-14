// Small proportional-bar primitives shared across the Session screens.
import type { Player } from '../../types';

interface SplitBarProps {
  shayne: number;
  matt: number;
  height?: number;
  radius?: number;
}

/** Two-segment proportional bar: Shayne (orange) | Matt (green).
 *  A zero-zero split renders an empty track rather than dividing by zero. */
export function SplitBar({ shayne, matt, height = 8, radius = 5 }: SplitBarProps) {
  const empty = shayne <= 0 && matt <= 0;
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
      <div style={{ flex: empty ? 1 : shayne, background: 'var(--shayne)', borderRadius: radius - 1 }} />
      <div style={{ flex: empty ? 1 : matt, background: 'var(--matt)', borderRadius: radius - 1 }} />
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
