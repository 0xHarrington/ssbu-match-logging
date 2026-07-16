// Shared page-level UI primitives for the interior platform pages (Statistics,
// Character Analytics, Session History/Detail, Tearsheet). These carry the
// redesign's visual language — the app shell already provides the sidebar; these
// build the main content column that sits inside it.
import type { CSSProperties, ReactNode } from 'react';

/** The main content column: matches the design's `padding:30px 34px; gap:22px`,
 *  tightened on mobile. Every interior page wraps its body in this. */
export function PageColumn({ children, gap = 22 }: { children: ReactNode; gap?: number }) {
  return (
    <div className="page-column" style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap }}>
      {children}
      <style>{`
        .page-column { padding: 30px 34px; }
        @media (max-width: 640px) { .page-column { padding: 18px 16px; } }
      `}</style>
    </div>
  );
}

/** Page title + mono subtitle, with an optional right-aligned action slot. */
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
      <div style={{ minWidth: 0 }}>
        <h2 style={{ fontSize: 26, fontWeight: 700, color: 'var(--fg-light)', letterSpacing: '-0.5px', margin: 0, fontFamily: 'var(--font-display)' }}>
          {title}
        </h2>
        {subtitle && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--gray)', marginTop: 6 }}>{subtitle}</div>
        )}
      </div>
      {action}
    </div>
  );
}

/** A section heading inside a page column. */
export function SectionTitle({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14, gap: 12 }}>
      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-light)', fontFamily: 'var(--font-display)' }}>{children}</span>
      {hint && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)' }}>{hint}</span>}
    </div>
  );
}

/** A bordered panel surface (the --panel card used everywhere). */
export function Card({ children, style, padding = 22 }: { children: ReactNode; style?: CSSProperties; padding?: number }) {
  return (
    <div style={{ background: 'var(--panel)', border: '1px solid var(--line-2)', borderRadius: 18, padding, ...style }}>
      {children}
    </div>
  );
}

/** The dark gradient hero with two side radial glows (Statistics/Session hero). */
export function GlowPanel({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 24,
        border: '1px solid var(--line)',
        background: 'linear-gradient(135deg,#221f1e,#1a1716)',
        ...style,
      }}
    >
      <div style={{ position: 'absolute', top: '-50%', left: '-6%', width: '44%', height: '200%', background: 'radial-gradient(circle,rgba(254,128,25,0.13),transparent 62%)' }} />
      <div style={{ position: 'absolute', top: '-50%', right: '-6%', width: '44%', height: '200%', background: 'radial-gradient(circle,rgba(184,187,38,0.13),transparent 62%)' }} />
      <div style={{ position: 'relative' }}>{children}</div>
    </div>
  );
}

/** A single stat tile: big mono value + label. `caps` puts a small uppercase
 *  label above the value instead (Session History variant). `size` overrides
 *  the value's font-size (defaults to the original 26px). */
export function StatTile({
  value,
  label,
  color = 'var(--fg-light)',
  caps = false,
  size = 26,
}: {
  value: ReactNode;
  label: string;
  color?: string;
  caps?: boolean;
  size?: number;
}) {
  if (caps) {
    return (
      <div style={{ background: 'var(--panel)', border: '1px solid var(--line-2)', borderRadius: 16, padding: 18 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gray)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: size, fontWeight: 700, color }}>{value}</div>
      </div>
    );
  }
  return (
    <div style={{ background: 'var(--panel)', border: '1px solid var(--line-2)', borderRadius: 16, padding: 18 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: size, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 5 }}>{label}</div>
    </div>
  );
}

const TIER_COLOR: Record<string, string> = {
  S: '#fabd2f',
  A: '#8ec07c',
  B: '#83a598',
  C: '#665c54',
};

/** Win-rate tier badge (S/A/B/C). */
export function TierBadge({ tier }: { tier: string }) {
  return (
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        fontWeight: 700,
        padding: '2px 7px',
        borderRadius: 6,
        color: '#1b1817',
        background: TIER_COLOR[tier] ?? 'var(--faint)',
      }}
    >
      {tier}
    </span>
  );
}

/** Win-rate -> tier band. */
export function winRateTier(winRatePct: number): string {
  if (winRatePct >= 55) return 'S';
  if (winRatePct >= 50) return 'A';
  if (winRatePct >= 45) return 'B';
  return 'C';
}
