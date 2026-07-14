// UndoToast — brief confirmation after logging, with a one-tap undo. Purely
// presentational; the parent owns the timer and the undo call.
import { winnerColorVar } from '../palette';
import type { Player } from '../../types';

interface UndoToastProps {
  winner: Player;
  onUndo: () => void;
  bottomOffset?: number;
}

export default function UndoToast({ winner, onUndo, bottomOffset = 24 }: UndoToastProps) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: bottomOffset,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'var(--deep2)',
        border: '1px solid var(--border-light)',
        borderRadius: 14,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        zIndex: 150,
        boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
        animation: 'toastUp 0.3s ease',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ fontSize: 13, color: 'var(--fg)' }}>
        Logged · <span style={{ color: winnerColorVar(winner), fontWeight: 600 }}>{winner}</span>
      </span>
      <button
        onClick={onUndo}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--shayne)',
          fontWeight: 700,
          fontSize: 13,
          cursor: 'pointer',
          fontFamily: 'var(--font-mono)',
        }}
      >
        UNDO
      </button>
      <style>{`@keyframes toastUp { from { opacity:0; transform:translate(-50%,16px);} to {opacity:1; transform:translate(-50%,0);} }`}</style>
    </div>
  );
}
