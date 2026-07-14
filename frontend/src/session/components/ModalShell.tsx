// ModalShell — shared overlay + card chrome for the Session modals. Backdrop
// click and Escape close; the card animates in with popIn.
import { useEffect, type ReactNode } from 'react';

interface ModalShellProps {
  width: number;
  title: string;
  subtitle?: string;
  onClose: () => void;
  /** Constrain height and let the caller's content scroll (see-all list). */
  maxHeight?: number;
  bodyScroll?: boolean;
  children: ReactNode;
}

export default function ModalShell({
  width,
  title,
  subtitle,
  onClose,
  maxHeight,
  bodyScroll = false,
  children,
}: ModalShellProps) {
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
        zIndex: 200,
        background: 'rgba(12,10,9,0.84)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width,
          maxWidth: '100%',
          maxHeight: maxHeight ?? '90vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--panel)',
          border: '1px solid var(--line)',
          borderRadius: 20,
          boxShadow: '0 30px 70px -20px rgba(0,0,0,0.7)',
          animation: 'popIn 0.3s ease',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 22px',
            borderBottom: '1px solid var(--line-2)',
            flex: '0 0 auto',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--fg-light)', fontFamily: 'var(--font-display)' }}>{title}</div>
            {subtitle && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)', marginTop: 2 }}>{subtitle}</div>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: 'var(--card)',
              border: '1px solid var(--line)',
              color: 'var(--gray)',
              cursor: 'pointer',
              fontSize: 15,
              flex: '0 0 auto',
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ flex: bodyScroll ? 1 : '0 0 auto', overflowY: bodyScroll ? 'auto' : 'visible', minHeight: 0 }}>
          {children}
        </div>
      </div>
      <style>{`@keyframes popIn { from { opacity:0; transform:translateY(10px) scale(.97);} to {opacity:1; transform:none;} }`}</style>
    </div>
  );
}
