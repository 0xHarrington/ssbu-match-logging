// MomentumHero — hero direction B: session-lead sparkline + recent match feed.
import { LineChart, Line } from '../../components/dither';
import MatchRow from '../components/MatchRow';
import { sessionLead } from '../palette';
import { useViewer } from '../../viewer';
import type { LiveSession } from '../../hooks/useLiveSession';

export default function MomentumHero({ live }: { live: LiveSession }) {
  const { home, away } = useViewer();
  const { label: leadLabel, color: leadColor } = sessionLead(live.shayneWins, live.mattWins, home);
  // Line needs >=2 points; pad a single-game session with a leading zero.
  const series = live.momentum.length >= 2 ? live.momentum : [0, ...live.momentum];
  const chartData = series.map((v, i) => ({ i, v }));

  return (
    <div style={{ animation: 'popIn 0.3s ease' }}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 18, padding: 16, marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
          <span style={{ fontSize: 13, color: 'var(--gray)' }}>Session lead</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: leadColor, fontWeight: 600 }}>{leadLabel}</span>
        </div>
        {/* Momentum is viewer-denominated: up = the logged-in player ahead. */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--faint)', fontFamily: 'var(--font-mono)' }}>
          <span>{home.toUpperCase()}</span>
        </div>
        <div style={{ height: 74, width: '100%' }}>
          <LineChart data={chartData} config={{ v: { label: 'Session lead', color: 'aqua' } }} interactive={false} animate={false} margins={{ top: 6, right: 4, bottom: 6, left: 4 }}>
            <Line dataKey="v" variant="gradient" />
          </LineChart>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--faint)', fontFamily: 'var(--font-mono)' }}>
          <span>{away.toUpperCase()}</span>
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
