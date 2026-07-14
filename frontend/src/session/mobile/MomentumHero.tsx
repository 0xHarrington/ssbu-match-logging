// MomentumHero — hero direction B: session-lead sparkline + recent match feed.
import { Sparkline } from '../../components/dither';
import MatchRow from '../components/MatchRow';
import type { LiveSession } from '../../hooks/useLiveSession';

export default function MomentumHero({ live }: { live: LiveSession }) {
  const lead = live.shayneWins - live.mattWins;
  const leadLabel = lead === 0 ? 'Even' : lead > 0 ? `Shayne +${lead}` : `Matt +${-lead}`;
  const leadColor = lead === 0 ? 'var(--gray)' : lead > 0 ? 'var(--shayne)' : 'var(--matt)';
  // Sparkline needs >=2 points; pad a single-game session with a leading zero.
  const series = live.momentum.length >= 2 ? live.momentum : [0, ...live.momentum];

  return (
    <div style={{ animation: 'popIn 0.3s ease' }}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 18, padding: 16, marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
          <span style={{ fontSize: 13, color: 'var(--gray)' }}>Session lead</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: leadColor, fontWeight: 600 }}>{leadLabel}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--faint)', fontFamily: 'var(--font-mono)' }}>
          <span>SHAYNE</span>
        </div>
        <div style={{ height: 74, width: '100%' }}>
          <Sparkline data={series} color="aqua" variant="gradient" />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--faint)', fontFamily: 'var(--font-mono)' }}>
          <span>MATT</span>
        </div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--gray)', fontFamily: 'var(--font-mono)', letterSpacing: '0.5px', marginBottom: 10 }}>
        THIS SESSION · NEWEST FIRST
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {live.matches.slice(0, 6).map((m) => (
          <MatchRow key={m.match_id} match={m} compact />
        ))}
      </div>
      <style>{`@keyframes popIn { from { opacity:0; transform:translateY(10px) scale(.97);} to {opacity:1; transform:none;} }`}</style>
    </div>
  );
}
