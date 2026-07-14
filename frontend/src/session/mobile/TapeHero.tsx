// TapeHero — hero direction C: a dense Shayne-vs-Matt stat table plus the
// session's most-played matchup. Session rows derive from live data; the two
// all-time rows come from /api/stats.
import { useEffect, useState } from 'react';
import { SplitBar } from '../components/bars';
import { getAllTimeStats } from '../../lib/api';
import type { LiveSession } from '../../hooks/useLiveSession';
import type { AllTimeStats, Player } from '../../types';

interface TapeRow {
  label: string;
  left: string; // Shayne
  right: string; // Matt
}

function avgStocksWhenWinning(live: LiveSession, player: Player): string {
  const wins = live.matches.filter((m) => m.winner === player);
  if (wins.length === 0) return '—';
  const total = wins.reduce((sum, m) => {
    const s = typeof m.stocks_remaining === 'string' ? parseFloat(m.stocks_remaining) : m.stocks_remaining;
    return sum + (Number.isFinite(s as number) ? (s as number) : 0);
  }, 0);
  return (total / wins.length).toFixed(1);
}

function bestRun(live: LiveSession, player: Player): string {
  let best = 0;
  let cur = 0;
  for (const p of live.runPips) {
    if (p === player) {
      cur += 1;
      best = Math.max(best, cur);
    } else cur = 0;
  }
  return best > 0 ? `W${best}` : '—';
}

function topMatchup(live: LiveSession) {
  const map = new Map<string, { s: string; m: string; sWins: number; mWins: number; games: number }>();
  for (const match of live.matches) {
    const key = `${match.shayne_character}|${match.matt_character}`;
    const e = map.get(key) ?? { s: match.shayne_character, m: match.matt_character, sWins: 0, mWins: 0, games: 0 };
    e.games += 1;
    if (match.winner === 'Shayne') e.sWins += 1;
    else if (match.winner === 'Matt') e.mWins += 1;
    map.set(key, e);
  }
  let top: ReturnType<typeof map.get> | undefined;
  for (const e of map.values()) if (!top || e.games > top.games) top = e;
  return top;
}

export default function TapeHero({ live }: { live: LiveSession }) {
  const [allTime, setAllTime] = useState<AllTimeStats | null>(null);
  useEffect(() => {
    let active = true;
    getAllTimeStats()
      .then((s) => active && setAllTime(s))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const total = live.totalGames || 1;
  const rows: TapeRow[] = [
    { label: 'this session', left: String(live.shayneWins), right: String(live.mattWins) },
    { label: 'win rate', left: `${Math.round((live.shayneWins / total) * 100)}%`, right: `${Math.round((live.mattWins / total) * 100)}%` },
    { label: 'avg stocks', left: avgStocksWhenWinning(live, 'Shayne'), right: avgStocksWhenWinning(live, 'Matt') },
    { label: 'best run', left: bestRun(live, 'Shayne'), right: bestRun(live, 'Matt') },
    { label: 'all-time', left: allTime ? String(allTime.shayne_wins) : '—', right: allTime ? String(allTime.matt_wins) : '—' },
    { label: 'all-time %', left: allTime ? `${Math.round(allTime.shayne_win_rate)}` : '—', right: allTime ? `${Math.round(allTime.matt_win_rate)}` : '—' },
  ];

  const chip = (color: string, align: 'left' | 'right') =>
    ({
      textAlign: align,
      fontFamily: 'var(--font-mono)',
      fontSize: 18,
      fontWeight: 700,
      color,
      background: 'var(--card)',
      border: '1px solid var(--line)',
      borderRadius: 10,
      padding: '9px 12px',
    }) as const;

  const top = topMatchup(live);

  return (
    <div style={{ animation: 'popIn 0.3s ease' }}>
      <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--gray)', fontFamily: 'var(--font-mono)', letterSpacing: 1, marginBottom: 12 }}>
        TALE OF THE TAPE
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 6, alignItems: 'center' }}>
        {rows.map((r) => (
          <div key={r.label} style={{ display: 'contents' }}>
            <div style={chip('var(--shayne)', 'right')}>{r.left}</div>
            <div style={{ fontSize: 9, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center', fontFamily: 'var(--font-mono)', padding: '0 4px' }}>
              {r.label}
            </div>
            <div style={chip('var(--matt)', 'left')}>{r.right}</div>
          </div>
        ))}
      </div>

      {top && (
        <div style={{ marginTop: 16, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, padding: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--gray)', fontFamily: 'var(--font-mono)', marginBottom: 10 }}>TOP MATCHUP THIS SESSION</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--shayne)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{top.s}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--fg-light)', flex: '0 0 auto' }}>{top.sWins} – {top.mWins}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--matt)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'right' }}>{top.m}</span>
          </div>
          <div style={{ marginTop: 8 }}>
            <SplitBar shayne={top.sWins} matt={top.mWins} height={7} radius={4} />
          </div>
        </div>
      )}
      <style>{`@keyframes popIn { from { opacity:0; transform:translateY(10px) scale(.97);} to {opacity:1; transform:none;} }`}</style>
    </div>
  );
}
