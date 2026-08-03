import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import CharacterDisplay from './components/CharacterDisplay';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, DitherHeatmap, Grid, type DitherHeatmapCell } from './components/dither';
import { LoadingState, ErrorState } from './components/Feedback';
import { PageColumn, PageHeader, SectionTitle, Card, GlowPanel, StatTile } from './components/ui';
import { SplitBar } from './session/components/bars';
import { useViewer } from './viewer';
import type { Player } from './types';

// ===== TYPE DEFINITIONS =====
interface MonthlyActivityItem {
  month: string;
  games: number;
}

interface TopMatchup {
  shayne_character: string;
  matt_character: string;
  total_games: number;
  shayne_wins: number;
  matt_wins: number;
}

interface StatsData {
  total_games: number;
  shayne_wins: number;
  matt_wins: number;
  shayne_win_rate: number;
  matt_win_rate: number;
  most_played_shayne: string;
  most_played_matt: string;
  last_game_date: string | null;
  games_this_week: number;
  current_streak: { player: string; length: number } | null;
  monthly_activity: MonthlyActivityItem[];
  top_matchups: TopMatchup[];
}

interface CharacterWinRates {
  [character: string]: {
    wins: number;
    losses: number;
    total: number;
  };
}

interface CharacterWinRatesData {
  shayne: CharacterWinRates;
  matt: CharacterWinRates;
}

interface HeadToHeadStats {
  recent_form: {
    last_10: { shayne_wins: number; matt_wins: number; total_games: number };
    last_20: { shayne_wins: number; matt_wins: number; total_games: number };
    last_50: { shayne_wins: number; matt_wins: number; total_games: number };
  };
  monthly_breakdown: Array<{
    month: string;
    shayne_wins: number;
    matt_wins: number;
    total_games: number;
  }>;
  streaks: {
    current_streak: { player: string; length: number };
    longest_win_streaks: {
      Shayne: { length: number; date: string | null };
      Matt: { length: number; date: string | null };
    };
    longest_loss_streaks: {
      Shayne: { length: number; date: string | null };
      Matt: { length: number; date: string | null };
    };
  };
  avg_stock_differential: {
    shayne: number;
    matt: number;
  };
}

interface AdvancedMetrics {
  two_stock_wins: {
    shayne: { two_stock_wins: number; total_wins: number; two_stock_rate: number; of_all_games: number };
    matt: { two_stock_wins: number; total_wins: number; two_stock_rate: number; of_all_games: number };
  };
  dominance_factor: {
    shayne: { three_stock_wins: number; total_wins: number; dominance_rate: number; of_all_games: number };
    matt: { three_stock_wins: number; total_wins: number; dominance_rate: number; of_all_games: number };
  };
  consistency_score: {
    shayne: number;
    matt: number;
  };
  momentum_analysis: {
    shayne: { win_after_win: number; win_after_loss: number };
    matt: { win_after_win: number; win_after_loss: number };
  };
  close_game_record: {
    shayne: { wins: number; total_wins: number; win_rate: number; of_all_games: number };
    matt: { wins: number; total_wins: number; win_rate: number; of_all_games: number };
  };
}

interface MatchupRow {
  shayne_character: string;
  matt_character: string;
  total_games: number;
  shayne_wins: number;
  matt_wins: number;
  shayne_win_rate: number;
  matt_win_rate: number;
}

interface MatchupMatrix {
  matrix: {
    [key: string]: MatchupRow;
  };
  top_matchups: MatchupRow[];
  best_matchups: {
    shayne: Array<unknown>;
    matt: Array<unknown>;
  };
  worst_matchups: {
    shayne: Array<unknown>;
    matt: Array<unknown>;
  };
}

interface UserStageStat {
  stage: string;
  winRate: number;
  totalGames: number;
  wins: number;
  losses: number;
}

interface HeatmapCell {
  hour: number;
  day: number;
  win_rate: number;
  game_count: number;
}

// ===== VIEWER-RELATIVE HELPERS =====
// The stats API is denominated in fixed player names (`shayne_wins`, `{shayne,
// matt}`, …). The UI is denominated in home/away, so every read goes through
// one of these rather than naming a player literally.

/** Player -> CSS custom property holding their brand color. */
const CSS_COLOR: Record<Player, string> = { Shayne: 'var(--shayne)', Matt: 'var(--matt)' };

/** Player -> dither-kit palette name (see components/dither/palette.ts). */
const CHART_COLOR: Record<Player, 'orange' | 'green'> = { Shayne: 'orange', Matt: 'green' };

/** Player -> the lowercased key the API uses in `{shayne, matt}` payloads. */
const KEY: Record<Player, 'shayne' | 'matt'> = { Shayne: 'shayne', Matt: 'matt' };

const formWins = (d: { shayne_wins: number; matt_wins: number }, p: Player): number =>
  p === 'Shayne' ? d.shayne_wins : d.matt_wins;

const muChar = (mu: MatchupRow, p: Player): string =>
  p === 'Shayne' ? mu.shayne_character : mu.matt_character;

const muRate = (mu: MatchupRow, p: Player): number =>
  p === 'Shayne' ? mu.shayne_win_rate : mu.matt_win_rate;

const TOOLTIPS: Record<string, { title: string; body: React.ReactNode }> = {
  close: {
    title: '1-Stock Victory Percentages',
    body: (
      <>
        <div style={{ marginBottom: '0.3rem' }}><span style={{ color: 'var(--blue)', fontWeight: 700 }}>First %:</span> of this player's wins, what % were 1-stock victories</div>
        <div><span style={{ color: 'var(--blue)', fontWeight: 700 }}>Second %:</span> of all games, what % were 1-stock victories for this player</div>
      </>
    ),
  },
  two: {
    title: '2-Stock Victory Percentages',
    body: (
      <>
        <div style={{ marginBottom: '0.3rem' }}><span style={{ color: 'var(--blue)', fontWeight: 700 }}>First %:</span> of this player's wins, what % were 2-stock victories</div>
        <div><span style={{ color: 'var(--blue)', fontWeight: 700 }}>Second %:</span> of all games, what % were 2-stock victories for this player</div>
      </>
    ),
  },
  three: {
    title: '3-Stock Victory Percentages',
    body: (
      <>
        <div style={{ marginBottom: '0.3rem' }}><span style={{ color: 'var(--blue)', fontWeight: 700 }}>First %:</span> of this player's wins, what % were 3-stock victories</div>
        <div><span style={{ color: 'var(--blue)', fontWeight: 700 }}>Second %:</span> of all games, what % were 3-stock victories for this player</div>
      </>
    ),
  },
  momentum: {
    title: 'Momentum',
    body: 'The share of games won immediately after winning the previous game. Higher values mean a stronger ability to maintain winning streaks.',
  },
  consistency: {
    title: 'Consistency',
    body: 'Win-rate volatility — the standard deviation of performance across rolling 20-game windows. Lower is steadier.',
  },
};

// ===== MAIN COMPONENT =====
const StatsPage: React.FC = () => {
  const { home, away } = useViewer();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [charWinRates, setCharWinRates] = useState<CharacterWinRatesData | null>(null);
  const [headToHead, setHeadToHead] = useState<HeadToHeadStats | null>(null);
  const [advancedMetrics, setAdvancedMetrics] = useState<AdvancedMetrics | null>(null);
  const [matchupMatrix, setMatchupMatrix] = useState<MatchupMatrix | null>(null);
  const [stageStats, setStageStats] = useState<UserStageStat[]>([]);
  const [heatmap, setHeatmap] = useState<HeatmapCell[]>([]);
  const [winTimeline, setWinTimeline] = useState<number[]>([]);
  const [sessionCount, setSessionCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const fetchStats = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, charRes, h2hRes, advRes, matchupRes, userRes, heatRes, tlRes, sessRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/character_win_rates'),
        fetch('/api/head_to_head_stats'),
        fetch('/api/advanced_metrics'),
        fetch('/api/matchup_matrix'),
        fetch(`/api/users/${home}/stats`),
        fetch(`/api/users/${home}/heatmap`),
        fetch(`/api/users/${home}/win-rate-timeline`),
        fetch('/api/sessions'),
      ]);

      const statsData = await statsRes.json();
      const charData = await charRes.json();
      const h2hData = await h2hRes.json();
      const advData = await advRes.json();
      const matchupData = await matchupRes.json();
      const userData = await userRes.json().catch(() => null);
      const heatData = await heatRes.json().catch(() => null);
      const tlData = await tlRes.json().catch(() => null);
      const sessData = await sessRes.json().catch(() => null);

      if (!statsData.success) throw new Error(statsData.message || 'Failed to load stats');
      if (!charData.success) throw new Error(charData.message || 'Failed to load character win rates');
      if (!h2hData.success) throw new Error(h2hData.message || 'Failed to load head-to-head stats');
      if (!advData.success) throw new Error(advData.message || 'Failed to load advanced metrics');
      if (!matchupData.success) throw new Error(matchupData.message || 'Failed to load matchup matrix');

      setStats(statsData.stats);
      setCharWinRates(charData);
      setHeadToHead(h2hData);
      setAdvancedMetrics(advData);
      setMatchupMatrix(matchupData);
      setStageStats(userData?.stageStats ?? []);
      setHeatmap(heatData?.data ?? []);
      setWinTimeline(tlData?.data?.win_rates ?? []);
      setSessionCount(sessData?.sessions?.length ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  }, [home]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const monthlyChartData = stats
    ? stats.monthly_activity.map(item => {
        const [year, month] = item.month.split('-');
        const monthName = new Date(Number(year), Number(month) - 1).toLocaleString('default', { month: 'short' });
        return { month: `${monthName}. '${year.slice(-2)}`, games: item.games };
      })
    : [];

  if (loading) return <LoadingState label="Loading statistics…" />;
  if (error) return <ErrorState message={error} onRetry={fetchStats} />;
  if (!stats || !charWinRates || !headToHead || !advancedMetrics || !matchupMatrix) return null;

  const getTop5 = (data: CharacterWinRates) =>
    Object.entries(data)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5);

  const longestStreak = Math.max(
    headToHead.streaks.longest_win_streaks.Shayne.length,
    headToHead.streaks.longest_win_streaks.Matt.length,
  );

  // Home/away accessors over the fixed-name payloads.
  const hk = KEY[home];
  const ak = KEY[away];
  const wins = (p: Player) => (p === 'Shayne' ? stats.shayne_wins : stats.matt_wins);
  const winRate = (p: Player) => (p === 'Shayne' ? stats.shayne_win_rate : stats.matt_win_rate);
  // Signed from the home player's perspective: positive means they're ahead.
  const lead = wins(home) - wins(away);

  // Merged character win-rate bars (top by games, both players).
  const mergedChars = [
    ...Object.entries(charWinRates.shayne).map(([c, s]) => ({ character: c, player: 'Shayne' as const, ...s })),
    ...Object.entries(charWinRates.matt).map(([c, s]) => ({ character: c, player: 'Matt' as const, ...s })),
  ]
    .filter((c) => c.total >= 10)
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  const heatCells: DitherHeatmapCell[] = heatmap.map((c) => ({
    day: c.day,
    hour: c.hour,
    winRate: c.game_count > 0 ? c.win_rate : null,
    games: c.game_count,
  }));

  const timelineData = winTimeline.map((wr, i) => ({ i, wr }));

  // `h` / `a` are the home and away values; `hSub` / `aSub` their sub-labels.
  const metricCards = [
    { key: 'close', emoji: '⚔️', label: 'Close games', sub: '1-stock victories', h: advancedMetrics.close_game_record[hk].wins, a: advancedMetrics.close_game_record[ak].wins, hSub: `${advancedMetrics.close_game_record[hk].win_rate}% · ${advancedMetrics.close_game_record[hk].of_all_games}%`, aSub: `${advancedMetrics.close_game_record[ak].win_rate}% · ${advancedMetrics.close_game_record[ak].of_all_games}%` },
    { key: 'two', emoji: '💪', label: 'Solid wins', sub: '2-stock victories', h: advancedMetrics.two_stock_wins[hk].two_stock_wins, a: advancedMetrics.two_stock_wins[ak].two_stock_wins, hSub: `${advancedMetrics.two_stock_wins[hk].two_stock_rate}% · ${advancedMetrics.two_stock_wins[hk].of_all_games}%`, aSub: `${advancedMetrics.two_stock_wins[ak].two_stock_rate}% · ${advancedMetrics.two_stock_wins[ak].of_all_games}%` },
    { key: 'three', emoji: '⚡', label: 'Dominance', sub: '3-stock wins', h: advancedMetrics.dominance_factor[hk].three_stock_wins, a: advancedMetrics.dominance_factor[ak].three_stock_wins, hSub: `${advancedMetrics.dominance_factor[hk].dominance_rate}% · ${advancedMetrics.dominance_factor[hk].of_all_games}%`, aSub: `${advancedMetrics.dominance_factor[ak].dominance_rate}% · ${advancedMetrics.dominance_factor[ak].of_all_games}%` },
    { key: 'avg', emoji: '🎯', label: 'Avg stocks left', sub: 'when winning', h: headToHead.avg_stock_differential[hk], a: headToHead.avg_stock_differential[ak] },
    { key: 'momentum', emoji: '📈', label: 'Momentum', sub: 'win after win', h: `${advancedMetrics.momentum_analysis[hk].win_after_win}%`, a: `${advancedMetrics.momentum_analysis[ak].win_after_win}%` },
    { key: 'consistency', emoji: '📊', label: 'Consistency', sub: 'lower is steadier', h: advancedMetrics.consistency_score[hk], a: advancedMetrics.consistency_score[ak] },
  ];

  return (
    <PageColumn>
      <PageHeader title="Statistics" subtitle={`${home} vs ${away} · all-time`} />

      {/* H2H hero */}
      <GlowPanel style={{ padding: '28px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 36, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: 128, height: 128, flex: '0 0 auto' }}>
            <PieChart
              data={[{ player: home, wins: wins(home) }, { player: away, wins: wins(away) }]}
              config={{ Shayne: { label: 'Shayne', color: 'orange' }, Matt: { label: 'Matt', color: 'green' } }}
              dataKey="wins"
              nameKey="player"
              innerRadius={0.68}
            >
              <Pie variant="gradient" />
            </PieChart>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: 'var(--fg-light)' }}>{winRate(home)}%</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--gray)', letterSpacing: 1 }}>{home.toUpperCase()}</span>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)', letterSpacing: 2, marginBottom: 8 }}>ALL-TIME RECORD</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 52, fontWeight: 700, lineHeight: 1 }}>
              <span style={{ color: CSS_COLOR[home] }}>{wins(home)}</span>
              <span style={{ color: 'var(--border-light)' }}>–</span>
              <span style={{ color: CSS_COLOR[away] }}>{wins(away)}</span>
            </div>
            <div style={{ display: 'flex', gap: 24, marginTop: 14, flexWrap: 'wrap' }}>
              <div><div style={{ fontSize: 13, color: CSS_COLOR[home], fontWeight: 600 }}>{home} {winRate(home)}%</div><div style={{ fontSize: 11, color: 'var(--gray)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{wins(home)} wins</div></div>
              <div><div style={{ fontSize: 13, color: CSS_COLOR[away], fontWeight: 600 }}>{away} {winRate(away)}%</div><div style={{ fontSize: 11, color: 'var(--gray)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{wins(away)} wins</div></div>
              <div><div style={{ fontSize: 13, color: 'var(--fg)', fontWeight: 600 }}>{lead >= 0 ? '+' : '−'}{Math.abs(lead)}</div><div style={{ fontSize: 11, color: 'var(--gray)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>margin</div></div>
            </div>
          </div>
        </div>
      </GlowPanel>

      {/* quick tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 14 }}>
        <StatTile value={stats.total_games.toLocaleString()} label="Total matches" color="var(--blue)" />
        <StatTile value={stats.current_streak?.length ?? 0} label={`Current streak · ${stats.current_streak?.player ?? 'None'}`} color={stats.current_streak?.player === 'Shayne' ? CSS_COLOR.Shayne : CSS_COLOR.Matt} />
        <StatTile value={longestStreak} label="Longest streak" color="var(--yellow)" />
        <StatTile value={sessionCount} label="Sessions played" color="var(--purple)" />
      </div>

      {/* head-to-head over time */}
      {timelineData.length >= 2 && (
        <Card>
          <SectionTitle hint={`rolling win rate · ${home}`}>Head-to-head over time</SectionTitle>
          <div style={{ width: '100%', height: 180 }}>
            <LineChart data={timelineData} config={{ wr: { label: `${home} win rate`, color: CHART_COLOR[home] } }}>
              <Grid />
              <YAxis tickFormatter={(v) => `${Math.round(v)}%`} />
              <Line dataKey="wr" variant="gradient" />
            </LineChart>
          </div>
        </Card>
      )}

      {/* character win rates */}
      <Card>
        <SectionTitle>Character win rates</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {mergedChars.map((c) => {
            const wr = Math.round((c.wins / c.total) * 100);
            const color = CSS_COLOR[c.player];
            return (
              <div key={`${c.player}-${c.character}`} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 90, flex: '0 0 auto', fontSize: 13, color: 'var(--fg)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.character}</span>
                <div style={{ flex: 1, height: 8, background: 'var(--deep1)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${wr}%`, background: color, borderRadius: 4 }} />
                </div>
                <span style={{ width: 40, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color }}>{wr}%</span>
                <span style={{ width: 56, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--faint)' }}>{c.total}g</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* recent form */}
      <div>
        <SectionTitle>Recent form</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14 }}>
          {[
            { label: 'Last 10', data: headToHead.recent_form.last_10 },
            { label: 'Last 20', data: headToHead.recent_form.last_20 },
            { label: 'Last 50', data: headToHead.recent_form.last_50 },
          ].map((item) => {
            const tot = item.data.total_games || 1;
            const hWins = formWins(item.data, home);
            const aWins = formWins(item.data, away);
            const hWR = ((hWins / tot) * 100).toFixed(0);
            const aWR = ((aWins / tot) * 100).toFixed(0);
            return (
              <Card key={item.label} padding={18} style={{ borderRadius: 16 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)', letterSpacing: '0.5px', marginBottom: 12 }}>{item.label.toUpperCase()} GAMES</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                  <div><div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color: CSS_COLOR[home] }}>{hWins}</div><div style={{ fontSize: 11, color: CSS_COLOR[home], fontFamily: 'var(--font-mono)' }}>{hWR}%</div></div>
                  <div style={{ textAlign: 'right' }}><div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color: CSS_COLOR[away] }}>{aWins}</div><div style={{ fontSize: 11, color: CSS_COLOR[away], fontFamily: 'var(--font-mono)' }}>{aWR}%</div></div>
                </div>
                <SplitBar shayne={item.data.shayne_wins} matt={item.data.matt_wins} height={6} radius={3} />
              </Card>
            );
          })}
        </div>
      </div>

      {/* advanced metrics */}
      <div>
        <SectionTitle>Advanced metrics</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 }}>
          {metricCards.map((c) => {
            const tip = TOOLTIPS[c.key];
            return (
              <Card key={c.key} padding={18} style={{ borderRadius: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{c.emoji} {c.label}</span>
                  {tip && (
                    <span
                      onMouseEnter={() => setActiveTooltip(c.key)}
                      onMouseLeave={() => setActiveTooltip(null)}
                      style={{ cursor: 'help', width: 14, height: 14, borderRadius: '50%', border: '1px solid var(--border-light)', color: 'var(--faint)', fontSize: 9, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      i
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--faint)', fontFamily: 'var(--font-mono)', margin: '2px 0 12px' }}>{c.sub}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div><div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color: CSS_COLOR[home] }}>{c.h}</div>{'hSub' in c && c.hSub ? <div style={{ fontSize: 10, color: 'var(--gray)', fontFamily: 'var(--font-mono)' }}>{c.hSub}</div> : <div style={{ fontSize: 10, color: 'var(--gray)' }}>{home}</div>}</div>
                  <div style={{ textAlign: 'right' }}><div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color: CSS_COLOR[away] }}>{c.a}</div>{'aSub' in c && c.aSub ? <div style={{ fontSize: 10, color: 'var(--gray)', fontFamily: 'var(--font-mono)' }}>{c.aSub}</div> : <div style={{ fontSize: 10, color: 'var(--gray)' }}>{away}</div>}</div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* streak records */}
      <div>
        <SectionTitle>Streak records</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14 }}>
          {[
            { label: '🔥 LONGEST WIN STREAK', h: headToHead.streaks.longest_win_streaks[home].length, a: headToHead.streaks.longest_win_streaks[away].length, hc: CSS_COLOR[home], ac: CSS_COLOR[away] },
            { label: '❄️ LONGEST LOSS STREAK', h: headToHead.streaks.longest_loss_streaks[home].length, a: headToHead.streaks.longest_loss_streaks[away].length, hc: 'var(--red)', ac: 'var(--red)' },
          ].map((s) => (
            <GlowPanel key={s.label} style={{ borderRadius: 16, padding: '18px 20px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)', letterSpacing: '0.5px', marginBottom: 14 }}>{s.label}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div><div style={{ fontFamily: 'var(--font-mono)', fontSize: 30, fontWeight: 700, color: s.hc, lineHeight: 1 }}>{s.h}</div><div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 4 }}>{home}</div></div>
                <div style={{ textAlign: 'right' }}><div style={{ fontFamily: 'var(--font-mono)', fontSize: 30, fontWeight: 700, color: s.ac, lineHeight: 1 }}>{s.a}</div><div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 4 }}>{away}</div></div>
              </div>
            </GlowPanel>
          ))}
        </div>
      </div>

      {/* top characters */}
      <div>
        <SectionTitle>Top characters</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 20 }}>
          {([
            [home, charWinRates[hk], CSS_COLOR[home]],
            [away, charWinRates[ak], CSS_COLOR[away]],
          ] as Array<[Player, CharacterWinRates, string]>).map(([name, data, color]) => (
            <Card key={name} padding={20}>
              <div style={{ fontSize: 13, fontWeight: 700, color, textAlign: 'center', marginBottom: 16 }}>{name}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                {getTop5(data).map(([character, s]) => {
                  const wr = Math.round((s.wins / s.total) * 100);
                  const wPct = (s.wins / s.total) * 100;
                  return (
                    <div key={character}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, alignItems: 'center' }}>
                        <CharacterDisplay character={character} textClassName="stat-char-name" />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)' }}>{wr}% · {s.total}</span>
                      </div>
                      <div style={{ display: 'flex', height: 18, borderRadius: 5, overflow: 'hidden', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: '#1b1817' }}>
                        <div style={{ width: `${wPct}%`, background: color, display: 'flex', alignItems: 'center', paddingLeft: 6, minWidth: 24 }}>{s.wins}</div>
                        <div style={{ width: `${100 - wPct}%`, background: 'var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 6, color: 'var(--fg)', minWidth: 24 }}>{s.losses}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* top matchups */}
      <div>
        <SectionTitle>Top matchups</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 14 }}>
          {matchupMatrix.top_matchups.slice(0, 6).map((mu, i) => (
            <Card key={i} padding={18} style={{ borderRadius: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid var(--line-2)' }}>
                <span style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: CSS_COLOR[home] }}>{muChar(mu, home)}</span>
                  <span style={{ color: 'var(--faint)' }}>vs</span>
                  <span style={{ color: CSS_COLOR[away] }}>{muChar(mu, away)}</span>
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--faint)' }}>{mu.total_games}g</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: CSS_COLOR[home], fontWeight: 700 }}>{formWins(mu, home)} <span style={{ color: 'var(--gray)', fontWeight: 400 }}>{muRate(mu, home)}%</span></span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: CSS_COLOR[away], fontWeight: 700 }}><span style={{ color: 'var(--gray)', fontWeight: 400 }}>{muRate(mu, away)}%</span> {formWins(mu, away)}</span>
              </div>
              <SplitBar shayne={mu.shayne_wins} matt={mu.matt_wins} height={6} radius={3} />
            </Card>
          ))}
        </div>
      </div>

      {/* games by month */}
      <Card>
        <SectionTitle>Games by month</SectionTitle>
        <div style={{ width: '100%', height: 260 }}>
          <BarChart data={monthlyChartData} config={{ games: { label: 'Games', color: 'blue' } }}>
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip labelKey="month" />
            <Bar dataKey="games" variant="gradient" />
          </BarChart>
        </div>
      </Card>

      {/* NEW: heatmap + stage win rates */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 20 }}>
        <Card>
          <SectionTitle hint={`new · ${home}`}>Performance by day &amp; time</SectionTitle>
          {heatCells.length > 0 ? (
            <DitherHeatmap cells={heatCells} height={220} metricLabel="win rate" highColor={CHART_COLOR[home]} />
          ) : (
            <div style={{ fontSize: 12, color: 'var(--faint)', fontFamily: 'var(--font-mono)' }}>Not enough data</div>
          )}
        </Card>
        <Card>
          <SectionTitle hint={`new · ${home}`}>Stage win rates</SectionTitle>
          {stageStats.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {stageStats.slice(0, 8).map((st) => (
                <div key={st.stage} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, color: 'var(--fg)', width: 110, flex: '0 0 auto', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{st.stage}</span>
                  <div style={{ flex: 1, height: 7, background: 'var(--deep1)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${st.winRate}%`, background: CSS_COLOR[home], borderRadius: 4 }} />
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)', width: 34, textAlign: 'right' }}>{Math.round(st.winRate)}%</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--faint)', fontFamily: 'var(--font-mono)' }}>Not enough data</div>
          )}
        </Card>
      </div>

      {/* metric tooltips */}
      {activeTooltip && TOOLTIPS[activeTooltip] && createPortal(
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'var(--deep2)', border: '1px solid var(--border-light)', borderRadius: 10, padding: 14, width: 280, fontSize: 12, color: 'var(--fg)', lineHeight: 1.5, zIndex: 9999, boxShadow: '0 8px 24px rgba(0,0,0,0.8)', pointerEvents: 'none' }}>
          <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--yellow)' }}>{TOOLTIPS[activeTooltip].title}</div>
          {TOOLTIPS[activeTooltip].body}
        </div>,
        document.body,
      )}
    </PageColumn>
  );
};

export default StatsPage;
