// StatsTab — the mobile all-time overview: donut, record, two tiles, and a
// win-rate-over-time sparkline. This is where global/all-time stats live (the
// Session tab stays session-scoped, per the design's key decision).
import { useEffect, useState } from 'react';
import { PieChart, Pie, Sparkline } from '../../components/dither';
import { ErrorState, LoadingState } from '../../components/Feedback';
import { getAllTimeStats, getHeadToHead, getSessions, getWinRateTimeline } from '../../lib/api';
import type { AllTimeStats, HeadToHeadStats } from '../../types';

interface Overview {
  stats: AllTimeStats;
  h2h: HeadToHeadStats;
  sessionCount: number;
  winRates: number[];
}

export default function StatsTab() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let active = true;
    setError(null);
    Promise.all([getAllTimeStats(), getHeadToHead(), getSessions(), getWinRateTimeline('Shayne').catch(() => null)])
      .then(([stats, h2h, sessions, timeline]) => {
        if (!active) return;
        setData({
          stats,
          h2h,
          sessionCount: sessions.length,
          winRates: timeline?.data.win_rates ?? [],
        });
      })
      .catch((e) => active && setError(e instanceof Error ? e.message : 'Failed to load stats'));
    return () => {
      active = false;
    };
  }, [nonce]);

  if (error) return <ErrorState message={error} onRetry={() => setNonce((n) => n + 1)} />;
  if (!data) return <LoadingState label="Loading all-time…" />;

  const { stats, h2h, sessionCount, winRates } = data;
  const totalGames = stats.shayne_wins + stats.matt_wins;
  const longest = h2h.streaks?.longest_win_streaks;
  const sStreak = longest?.Shayne?.length ?? 0;
  const mStreak = longest?.Matt?.length ?? 0;
  const longestStreak = sStreak >= mStreak ? { player: 'Shayne', length: sStreak } : { player: 'Matt', length: mStreak };

  return (
    <div style={{ padding: '8px 18px 24px' }}>
      <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--fg-light)', marginBottom: 4, fontFamily: 'var(--font-display)' }}>All-time</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)', marginBottom: 18 }}>
        {totalGames.toLocaleString()} matches · {sessionCount} sessions
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 18, padding: 18, marginBottom: 14 }}>
        <div style={{ width: 96, height: 96, flex: '0 0 auto' }}>
          <PieChart
            data={[
              { player: 'Shayne', wins: stats.shayne_wins },
              { player: 'Matt', wins: stats.matt_wins },
            ]}
            config={{ Shayne: { label: 'Shayne', color: 'orange' }, Matt: { label: 'Matt', color: 'green' } }}
            dataKey="wins"
            nameKey="player"
            innerRadius={0.62}
          >
            <Pie variant="gradient" />
          </PieChart>
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 30, fontWeight: 700, color: 'var(--fg-light)', lineHeight: 1 }}>
            {stats.shayne_wins}
            <span style={{ color: 'var(--faint)' }}>–</span>
            {stats.matt_wins}
          </div>
          <div style={{ fontSize: 12, color: 'var(--gray)', marginTop: 6 }}>
            Shayne <span style={{ color: 'var(--shayne)', fontWeight: 600 }}>{stats.shayne_win_rate.toFixed(1)}%</span> · Matt{' '}
            <span style={{ color: 'var(--matt)', fontWeight: 600 }}>{stats.matt_win_rate.toFixed(1)}%</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
            {Math.abs(stats.shayne_wins - stats.matt_wins)}-game margin
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, padding: 14 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 700, color: 'var(--yellow)' }}>{longestStreak.length}</div>
          <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 3 }}>Longest streak ({longestStreak.player})</div>
        </div>
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, padding: 14 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 700, color: 'var(--blue)' }}>{sessionCount}</div>
          <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 3 }}>Sessions played</div>
        </div>
      </div>

      {winRates.length >= 2 && (
        <>
          <div style={{ fontSize: 11, color: 'var(--gray)', fontFamily: 'var(--font-mono)', marginBottom: 10 }}>SHAYNE WIN RATE OVER TIME</div>
          <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, padding: '14px 12px 8px' }}>
            <div style={{ height: 70, width: '100%' }}>
              <Sparkline data={winRates} color="orange" variant="gradient" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
