// Shared log/edit form controls: winner picker, stage grid, stocks picker.
// Selected-state colors mirror the prototype exactly.
import type { ReactNode } from 'react';
import CharToken from './CharToken';
import { stageImages } from '../../lib/stages';
import { PLAYER_HEX, PLAYER_PICK_BG } from '../palette';
import type { Player } from '../../types';

// --- Winner picker --------------------------------------------------------

interface WinnerPickerProps {
  shayneChar: string;
  mattChar: string;
  value: Player | null;
  onChange: (p: Player) => void;
  /** 'stack' = two full-width rows (desktop rail); 'row' = side-by-side. */
  layout?: 'stack' | 'row';
  tokenSize?: number;
  /** Optional click handler on the token itself (opens a character picker). */
  onTokenClick?: (p: Player) => void;
  tokenSlot?: (p: Player) => ReactNode;
}

export function WinnerPicker({
  shayneChar,
  mattChar,
  value,
  onChange,
  layout = 'stack',
  tokenSize = 44,
  onTokenClick,
  tokenSlot,
}: WinnerPickerProps) {
  const players: Player[] = ['Shayne', 'Matt'];
  const chars: Record<Player, string> = { Shayne: shayneChar, Matt: mattChar };

  return (
    <div
      style={{
        display: layout === 'stack' ? 'flex' : 'grid',
        flexDirection: layout === 'stack' ? 'column' : undefined,
        gridTemplateColumns: layout === 'row' ? '1fr 1fr' : undefined,
        gap: 9,
      }}
    >
      {players.map((p) => {
        const selected = value === p;
        return (
          <button
            key={p}
            onClick={() => onChange(p)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              borderRadius: 14,
              padding: 12,
              cursor: 'pointer',
              transition: 'all 0.15s',
              color: 'var(--fg)',
              fontFamily: 'var(--font-display)',
              fontSize: 15,
              fontWeight: 600,
              background: selected ? PLAYER_PICK_BG[p] : 'var(--card)',
              border: `1px solid ${selected ? PLAYER_HEX[p] : 'var(--line)'}`,
              width: '100%',
              textAlign: 'left',
            }}
          >
            <span
              onClick={
                onTokenClick
                  ? (e) => {
                      e.stopPropagation();
                      onTokenClick(p);
                    }
                  : undefined
              }
              style={{ position: 'relative', flex: '0 0 auto', cursor: onTokenClick ? 'pointer' : undefined }}
            >
              <CharToken character={chars[p]} player={p} size={tokenSize} />
              {tokenSlot?.(p)}
            </span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block' }}>{p}</span>
              <span
                style={{
                  display: 'block',
                  fontSize: 11,
                  color: 'var(--gray)',
                  fontWeight: 400,
                  fontFamily: 'var(--font-mono)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {chars[p] || 'Pick fighter'}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

// --- Stage grid -----------------------------------------------------------

interface StageGridProps {
  stages: string[];
  value: string;
  onChange: (stage: string) => void;
  /** 'tile' = art band + name (log rail); 'chip' = text chip (edit modal). */
  variant?: 'tile' | 'chip';
}

export function StageGrid({ stages, value, onChange, variant = 'tile' }: StageGridProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: variant === 'tile' ? 8 : 6 }}>
      {stages.map((stage) => {
        const selected = value === stage;
        if (variant === 'chip') {
          return (
            <button
              key={stage}
              onClick={() => onChange(stage)}
              style={{
                borderRadius: 9,
                padding: '8px 10px',
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: 600,
                fontFamily: 'var(--font-display)',
                transition: 'all 0.15s',
                textAlign: 'left',
                background: selected ? PLAYER_PICK_BG.Shayne : 'var(--card)',
                color: selected ? 'var(--shayne)' : 'var(--gray)',
                border: `1px solid ${selected ? 'var(--shayne)' : 'var(--line)'}`,
              }}
            >
              {stage}
            </button>
          );
        }
        const art = stageImages[stage];
        return (
          <button
            key={stage}
            onClick={() => onChange(stage)}
            style={{
              position: 'relative',
              overflow: 'hidden',
              borderRadius: 12,
              cursor: 'pointer',
              transition: 'all 0.15s',
              padding: 0,
              background: 'var(--card)',
              border: `1px solid ${selected ? 'var(--shayne)' : 'var(--line)'}`,
              boxShadow: selected ? '0 0 0 1px var(--shayne)' : undefined,
            }}
          >
            <div
              style={{
                height: 30,
                background: art
                  ? `center/cover no-repeat url(${art})`
                  : 'repeating-linear-gradient(115deg,#2a2624,#2a2624 6px,#302b28 6px,#302b28 12px)',
              }}
            />
            <div
              style={{
                padding: '7px 9px',
                fontSize: 11,
                fontWeight: 600,
                lineHeight: 1.25,
                minHeight: 38,
                display: 'flex',
                alignItems: 'center',
                fontFamily: 'var(--font-display)',
                color: selected ? 'var(--shayne)' : 'var(--fg)',
              }}
            >
              {stage}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// --- Stocks picker --------------------------------------------------------

interface StocksPickerProps {
  value: number | null;
  onChange: (n: number) => void;
  padY?: number;
}

export function StocksPicker({ value, onChange, padY = 14 }: StocksPickerProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
      {[1, 2, 3].map((n) => {
        const selected = value === n;
        return (
          <button
            key={n}
            onClick={() => onChange(n)}
            style={{
              borderRadius: 12,
              padding: `${padY}px 0`,
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: 18,
              fontWeight: 700,
              transition: 'all 0.15s',
              background: selected ? 'var(--blue)' : 'var(--card)',
              color: selected ? '#1b1817' : 'var(--fg)',
              border: `1px solid ${selected ? 'var(--blue)' : 'var(--line)'}`,
            }}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}
