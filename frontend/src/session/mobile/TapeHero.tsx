// TapeHero — hero direction C: a dense Matt-vs-Shayne stat table plus the
// session's most-played matchup. Session rows derive from live data; the two
// all-time rows come from /api/stats.
import { useEffect, useState } from 'react';
import { SplitBar } from '../components/bars';
import { getAllTimeStats } from '../../lib/api';
import { parseStocks } from '../format';
import { PLAYER_COLOR_VAR } from '../palette';
import { useViewer } from '../../viewer';
import type { LiveSession } from '../../hooks/useLiveSession';
import type { AllTimeStats, Player } from '../../types';

interface TapeRow {
  label: string;
  left: string; // Matt
  right: string; // Shayne
}

function avgStocksWhenWinning(live: LiveSession, player: Player): string {
  const wins = live.matches.filter((m) => m.winner === player);
  if (wins.length === 0) return '—';
  const total = wins.reduce((sum, m) => sum + (parseStocks(m.stocks_remaining) ?? 0), 0);
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
  const { home, away } = useViewer();
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
  const sessionWins = (p: Player) => (p === 'Matt' ? live.mattWins : live.shayneWins);
  const allTimeWins = (p: Player) =>
    allTime ? String(p === 'Matt' ? allTime.matt_wins : allTime.shayne_wins) : '—';
  const allTimeRate = (p: Player) =>
    allTime ? `${Math.round(p === 'Matt' ? allTime.matt_win_rate : allTime.shayne_win_rate)}` : '—';
  // Left column is the home (logged-in) player.
  const rows: TapeRow[] = [
    { label: 'this session', left: String(sessionWins(home)), right: String(sessionWins(away)) },
    { label: 'win rate', left: `${Math.round((sessionWins(home) / total) * 100)}%`, right: `${Math.round((sessionWins(away) / total) * 100)}%` },
    { label: 'avg stocks', left: avgStocksWhenWinning(live, home), right: avgStocksWhenWinning(live, away) },
    { label: 'best run', left: bestRun(live, home), right: bestRun(live, away) },
    { label: 'all-time', left: allTimeWins(home), right: allTimeWins(away) },
    { label: 'all-time %', left: allTimeRate(home), right: allTimeRate(away) },
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
            <div style={chip(PLAYER_COLOR_VAR[home], 'right')}>{r.left}</div>
            <div style={{ fontSize: 9, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center', fontFamily: 'var(--font-mono)', padding: '0 4px' }}>
              {r.label}
            </div>
            <div style={chip(PLAYER_COLOR_VAR[away], 'left')}>{r.right}</div>
          </div>
        ))}
      </div>

      {top && (
        <div style={{ marginTop: 16, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, padding: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--gray)', fontFamily: 'var(--font-mono)', marginBottom: 10 }}>TOP MATCHUP THIS SESSION</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: PLAYER_COLOR_VAR[home], whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{home === 'Matt' ? top.m : top.s}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--fg-light)', flex: '0 0 auto' }}>{home === 'Matt' ? top.mWins : top.sWins} – {home === 'Matt' ? top.sWins : top.mWins}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: PLAYER_COLOR_VAR[away], whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'right' }}>{home === 'Matt' ? top.s : top.m}</span>
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
