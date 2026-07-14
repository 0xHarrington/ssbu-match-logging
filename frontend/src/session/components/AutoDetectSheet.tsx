// AutoDetectSheet — the phone-camera auto-log confirm UI from the design.
//
// Honesty note: the detection backend (camera / WebSocket pending-queue) is
// roadmap P5 and does not exist yet. Rather than fabricate a "detected" result
// and write it to the CSV, this renders the designed capture visuals as a clearly
// labelled preview whose real action routes to manual logging. No data is
// written from here.
import { useEffect } from 'react';

interface AutoDetectSheetProps {
  onClose: () => void;
  /** Route into the manual log flow (mobile Log tab / desktop rail focus). */
  onLogManually: () => void;
  /** true on mobile -> dock to the bottom as a sheet; else center as a card. */
  mobile?: boolean;
}

export default function AutoDetectSheet({ onClose, onLogManually, mobile = false }: AutoDetectSheetProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 180,
        background: 'rgba(12,10,9,0.82)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: mobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        padding: mobile ? 0 : 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: mobile ? '100%' : 440,
          maxWidth: '100%',
          background: 'var(--panel)',
          border: '1px solid var(--border-light)',
          borderRadius: mobile ? '28px 28px 0 0' : 20,
          padding: mobile ? '22px 20px 30px' : 24,
          animation: 'popIn 0.3s ease',
        }}
      >
        {mobile && <div style={{ width: 40, height: 4, background: 'var(--border-light)', borderRadius: 2, margin: '0 auto 18px' }} />}

        <div
          style={{
            position: 'relative',
            height: 132,
            borderRadius: 16,
            overflow: 'hidden',
            marginBottom: 16,
            background: 'var(--deep2)',
            border: '1px solid var(--line)',
          }}
        >
          <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(131,165,152,0.05) 3px,rgba(131,165,152,0.05) 4px)' }} />
          <div style={{ position: 'absolute', left: '6%', right: '6%', height: 2, background: 'linear-gradient(90deg,transparent,#8ec07c,transparent)', animation: 'scan 2.2s ease-in-out infinite alternate' }} />
          <div style={{ position: 'absolute', top: 12, left: 12, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--aqua)', letterSpacing: 1 }}>
            ◉ CAMERA AUTO-LOG
          </div>
          <div style={{ position: 'absolute', bottom: 12, left: 12, right: 12, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)' }}>
            Point your phone at the TV — coming soon
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--aqua)', boxShadow: '0 0 8px var(--aqua)' }} />
          <span style={{ fontSize: 13, color: 'var(--aqua)', fontFamily: 'var(--font-mono)' }}>Roadmap preview</span>
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--fg-light)', marginBottom: 2, fontFamily: 'var(--font-display)' }}>
          Auto-detect is on the way
        </div>
        <div style={{ fontSize: 13, color: 'var(--gray)', marginBottom: 20 }}>
          Soon a phone pointed at the TV will read the GAME! screen and pre-fill the result for you to confirm. For now, log it manually.
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              background: 'var(--card)',
              border: '1px solid var(--border-light)',
              borderRadius: 14,
              padding: 14,
              color: 'var(--gray)',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
              fontFamily: 'var(--font-display)',
            }}
          >
            Dismiss
          </button>
          <button
            onClick={onLogManually}
            style={{
              flex: 1.6,
              background: 'var(--aqua)',
              border: 'none',
              borderRadius: 14,
              padding: 14,
              color: '#1b1817',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              fontFamily: 'var(--font-display)',
            }}
          >
            Log manually
          </button>
        </div>
        <style>{`
          @keyframes scan { 0%{ top:6%;} 100%{ top:92%;} }
          @keyframes popIn { from { opacity:0; transform:translateY(10px) scale(.97);} to {opacity:1; transform:none;} }
        `}</style>
      </div>
    </div>
  );
}
