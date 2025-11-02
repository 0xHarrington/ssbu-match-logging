import React, { useEffect, useState, useRef } from 'react';
import * as echarts from 'echarts';
import CharacterDisplay from './components/CharacterDisplay';

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
    shayne: { two_stock_wins: number; total_wins: number; two_stock_rate: number };
    matt: { two_stock_wins: number; total_wins: number; two_stock_rate: number };
  };
  dominance_factor: {
    shayne: { three_stock_wins: number; total_wins: number; dominance_rate: number };
    matt: { three_stock_wins: number; total_wins: number; dominance_rate: number };
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
    shayne: { wins: number; losses: number; win_rate: number };
    matt: { wins: number; losses: number; win_rate: number };
  };
}

interface MatchupMatrix {
  matrix: {
    [key: string]: {
      shayne_character: string;
      matt_character: string;
      total_games: number;
      shayne_wins: number;
      matt_wins: number;
      shayne_win_rate: number;
      matt_win_rate: number;
    };
  };
  top_matchups: Array<{
    shayne_character: string;
    matt_character: string;
    total_games: number;
    shayne_wins: number;
    matt_wins: number;
    shayne_win_rate: number;
    matt_win_rate: number;
  }>;
  best_matchups: {
    shayne: Array<any>;
    matt: Array<any>;
  };
  worst_matchups: {
    shayne: Array<any>;
    matt: Array<any>;
  };
}

// ===== MAIN COMPONENT =====
const StatsPage: React.FC = () => {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [charWinRates, setCharWinRates] = useState<CharacterWinRatesData | null>(null);
  const [headToHead, setHeadToHead] = useState<HeadToHeadStats | null>(null);
  const [advancedMetrics, setAdvancedMetrics] = useState<AdvancedMetrics | null>(null);
  const [matchupMatrix, setMatchupMatrix] = useState<MatchupMatrix | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const [statsRes, charRes, h2hRes, advRes, matchupRes] = await Promise.all([
          fetch('/api/stats'),
          fetch('/api/character_win_rates'),
          fetch('/api/head_to_head_stats'),
          fetch('/api/advanced_metrics'),
          fetch('/api/matchup_matrix'),
        ]);
        
        const statsData = await statsRes.json();
        const charData = await charRes.json();
        const h2hData = await h2hRes.json();
        const advData = await advRes.json();
        const matchupData = await matchupRes.json();
        
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
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  // Initialize eCharts chart for monthly activity
  useEffect(() => {
    if (!chartRef.current || !stats) return;

    const chartInstance = echarts.init(chartRef.current);
    chartInstanceRef.current = chartInstance;

    const months = stats.monthly_activity.map(item => {
      const [year, month] = item.month.split('-');
      const monthName = new Date(Number(year), Number(month) - 1).toLocaleString('default', { month: 'short' });
      const yearShort = year.slice(-2);
      return `${monthName}. '${yearShort}`;
    });
    const gamesData = stats.monthly_activity.map(item => item.games);

    const option = {
      backgroundColor: 'transparent',
      grid: {
        left: '8%',
        right: '8%',
        top: '10%',
        bottom: stats.monthly_activity.length > 12 ? '15%' : '10%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: months,
        axisLine: { lineStyle: { color: '#504945' } },
        axisLabel: {
          color: '#ebdbb2',
          fontSize: 11,
          rotate: stats.monthly_activity.length > 12 ? -45 : 0
        },
        axisTick: { lineStyle: { color: '#504945' } }
      },
      yAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: '#504945' } },
        axisLabel: { color: '#ebdbb2', fontSize: 11 },
        splitLine: { lineStyle: { color: '#3c3836' } }
      },
      series: [{
        type: 'bar',
        data: gamesData,
        itemStyle: {
          color: '#83a598',
          borderRadius: [4, 4, 0, 0]
        },
        barWidth: '50%',
        label: {
          show: true,
          position: 'top',
          color: '#ebdbb2',
          fontSize: 11,
          fontWeight: 'bold'
        }
      }],
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(60, 56, 54, 0.95)',
        borderColor: '#504945',
        textStyle: { color: '#ebdbb2' },
        formatter: (params: any) => {
          const param = params[0];
          return `${param.name}<br/>Games: ${param.value}`;
        }
      }
    };

    chartInstance.setOption(option);

    const handleResize = () => chartInstance.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.dispose();
    };
  }, [stats]);

  if (loading) return <div className="stats-container"><div style={{ textAlign: 'center', padding: '3rem', fontSize: '1.2rem' }}>Loading statistics...</div></div>;
  if (error) return <div className="stats-container"><div className="error" style={{ textAlign: 'center', padding: '2rem' }}>{error}</div></div>;
  if (!stats || !charWinRates || !headToHead || !advancedMetrics || !matchupMatrix) return null;

  const getTop5 = (data: CharacterWinRates) =>
    Object.entries(data)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5);

  return (
    <div className="stats-container" style={{ maxWidth: '1400px', padding: '1.5rem', gap: '1.5rem' }}>
      
      {/* HERO SECTION - Compact Overview */}
      <section className="stats-section" style={{ marginBottom: '1rem' }}>
        <div style={{ 
          background: 'linear-gradient(135deg, #3c3836 0%, #282828 100%)',
          borderRadius: '16px',
          padding: '1.5rem',
          border: '1px solid #504945',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
            gap: '1rem',
            marginBottom: '1rem'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#a89984', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Games</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#83a598' }}>{stats.total_games}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#a89984', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Shayne</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fe8019' }}>{stats.shayne_wins}</div>
              <div style={{ fontSize: '0.8rem', color: '#fe8019', opacity: 0.8 }}>{stats.shayne_win_rate}%</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#a89984', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Matt</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#b8bb26' }}>{stats.matt_wins}</div>
              <div style={{ fontSize: '0.8rem', color: '#b8bb26', opacity: 0.8 }}>{stats.matt_win_rate}%</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#a89984', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Current Streak</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: stats.current_streak?.player === 'Shayne' ? '#fe8019' : '#b8bb26' }}>
                {stats.current_streak?.length || 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#a89984' }}>{stats.current_streak?.player || 'None'}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#a89984', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>This Week</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#d3869b' }}>{stats.games_this_week}</div>
              <div style={{ fontSize: '0.75rem', color: '#a89984' }}>games</div>
            </div>
          </div>
        </div>
      </section>

      {/* RECENT FORM - Compact Cards */}
      <section className="stats-section">
        <h2 style={{ fontSize: '1.3rem', marginBottom: '0.75rem', color: '#fbf1c7' }}>Recent Form</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
          {[
            { label: 'Last 10', data: headToHead.recent_form.last_10 },
            { label: 'Last 20', data: headToHead.recent_form.last_20 },
            { label: 'Last 50', data: headToHead.recent_form.last_50 },
          ].map((item) => {
            const shayneWR = ((item.data.shayne_wins / item.data.total_games) * 100).toFixed(1);
            const mattWR = ((item.data.matt_wins / item.data.total_games) * 100).toFixed(1);
            return (
              <div key={item.label} className="stat-card" style={{ padding: '0.75rem', minHeight: 'auto' }}>
                <div style={{ fontSize: '0.8rem', color: '#a89984', marginBottom: '0.5rem', fontWeight: '600' }}>{item.label} Games</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fe8019' }}>{item.data.shayne_wins}</div>
                    <div style={{ fontSize: '0.7rem', color: '#fe8019', opacity: 0.8 }}>{shayneWR}%</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#b8bb26' }}>{item.data.matt_wins}</div>
                    <div style={{ fontSize: '0.7rem', color: '#b8bb26', opacity: 0.8 }}>{mattWR}%</div>
                  </div>
                </div>
                <div style={{ 
                  height: '4px', 
                  background: '#3c3836', 
                  borderRadius: '2px', 
                  overflow: 'hidden',
                  display: 'flex'
                }}>
                  <div style={{ width: `${shayneWR}%`, background: '#fe8019' }}></div>
                  <div style={{ width: `${mattWR}%`, background: '#b8bb26' }}></div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ADVANCED METRICS - Compact Grid */}
      <section className="stats-section">
        <h2 style={{ fontSize: '1.3rem', marginBottom: '0.75rem', color: '#fbf1c7' }}>Advanced Metrics</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
          {/* Two-Stock Wins */}
          <div className="stat-card" style={{ padding: '0.75rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#a89984', marginBottom: '0.5rem', fontWeight: '600' }}>💪 Solid Wins</div>
            <div style={{ fontSize: '0.7rem', color: '#a89984', marginBottom: '0.5rem' }}>2-stock victories</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#fe8019' }}>{advancedMetrics.two_stock_wins.shayne.two_stock_wins}</div>
                <div style={{ fontSize: '0.7rem', color: '#fe8019', opacity: 0.8 }}>{advancedMetrics.two_stock_wins.shayne.two_stock_rate}%</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#b8bb26' }}>{advancedMetrics.two_stock_wins.matt.two_stock_wins}</div>
                <div style={{ fontSize: '0.7rem', color: '#b8bb26', opacity: 0.8 }}>{advancedMetrics.two_stock_wins.matt.two_stock_rate}%</div>
              </div>
            </div>
          </div>

          {/* Dominance Factor */}
          <div className="stat-card" style={{ padding: '0.75rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#a89984', marginBottom: '0.5rem', fontWeight: '600' }}>⚡ Dominance</div>
            <div style={{ fontSize: '0.7rem', color: '#a89984', marginBottom: '0.5rem' }}>3-stock wins</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#fe8019' }}>{advancedMetrics.dominance_factor.shayne.three_stock_wins}</div>
                <div style={{ fontSize: '0.7rem', color: '#fe8019', opacity: 0.8 }}>{advancedMetrics.dominance_factor.shayne.dominance_rate}%</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#b8bb26' }}>{advancedMetrics.dominance_factor.matt.three_stock_wins}</div>
                <div style={{ fontSize: '0.7rem', color: '#b8bb26', opacity: 0.8 }}>{advancedMetrics.dominance_factor.matt.dominance_rate}%</div>
              </div>
            </div>
          </div>

          {/* Momentum */}
          <div className="stat-card" style={{ padding: '0.75rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#a89984', marginBottom: '0.5rem', fontWeight: '600' }}>📈 Momentum</div>
            <div style={{ fontSize: '0.7rem', color: '#a89984', marginBottom: '0.5rem' }}>Win after win</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#fe8019' }}>{advancedMetrics.momentum_analysis.shayne.win_after_win}%</div>
                <div style={{ fontSize: '0.7rem', color: '#a89984' }}>Shayne</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#b8bb26' }}>{advancedMetrics.momentum_analysis.matt.win_after_win}%</div>
                <div style={{ fontSize: '0.7rem', color: '#a89984' }}>Matt</div>
              </div>
            </div>
          </div>

          {/* Close Games */}
          <div className="stat-card" style={{ padding: '0.75rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#a89984', marginBottom: '0.5rem', fontWeight: '600' }}>⚔️ Close Games</div>
            <div style={{ fontSize: '0.7rem', color: '#a89984', marginBottom: '0.5rem' }}>1-stock differential</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#fe8019' }}>{advancedMetrics.close_game_record.shayne.win_rate}%</div>
                <div style={{ fontSize: '0.7rem', color: '#a89984' }}>{advancedMetrics.close_game_record.shayne.wins}W</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#b8bb26' }}>{advancedMetrics.close_game_record.matt.win_rate}%</div>
                <div style={{ fontSize: '0.7rem', color: '#a89984' }}>{advancedMetrics.close_game_record.matt.wins}W</div>
              </div>
            </div>
          </div>

          {/* Avg Stock Differential */}
          <div className="stat-card" style={{ padding: '0.75rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#a89984', marginBottom: '0.5rem', fontWeight: '600' }}>💪 Avg Stocks Left</div>
            <div style={{ fontSize: '0.7rem', color: '#a89984', marginBottom: '0.5rem' }}>When winning</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#fe8019' }}>{headToHead.avg_stock_differential.shayne}</div>
                <div style={{ fontSize: '0.7rem', color: '#a89984' }}>Shayne</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#b8bb26' }}>{headToHead.avg_stock_differential.matt}</div>
                <div style={{ fontSize: '0.7rem', color: '#a89984' }}>Matt</div>
              </div>
            </div>
          </div>

          {/* Consistency */}
          <div className="stat-card" style={{ padding: '0.75rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#a89984', marginBottom: '0.5rem', fontWeight: '600' }}>📊 Consistency</div>
            <div style={{ fontSize: '0.7rem', color: '#a89984', marginBottom: '0.5rem' }}>Lower is better</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#fe8019' }}>{advancedMetrics.consistency_score.shayne}</div>
                <div style={{ fontSize: '0.7rem', color: '#a89984' }}>Shayne</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#b8bb26' }}>{advancedMetrics.consistency_score.matt}</div>
                <div style={{ fontSize: '0.7rem', color: '#a89984' }}>Matt</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STREAK RECORDS */}
      <section className="stats-section">
        <h2 style={{ fontSize: '1.3rem', marginBottom: '0.75rem', color: '#fbf1c7' }}>Streak Records</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
          <div className="stat-card" style={{ padding: '0.75rem', background: 'linear-gradient(135deg, #3c3836 0%, #504945 100%)' }}>
            <div style={{ fontSize: '0.75rem', color: '#a89984', marginBottom: '0.5rem', fontWeight: '600' }}>🔥 Longest Win Streak</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fe8019' }}>{headToHead.streaks.longest_win_streaks.Shayne.length}</div>
                <div style={{ fontSize: '0.7rem', color: '#a89984' }}>Shayne</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#b8bb26' }}>{headToHead.streaks.longest_win_streaks.Matt.length}</div>
                <div style={{ fontSize: '0.7rem', color: '#a89984' }}>Matt</div>
              </div>
            </div>
          </div>
          <div className="stat-card" style={{ padding: '0.75rem', background: 'linear-gradient(135deg, #3c3836 0%, #504945 100%)' }}>
            <div style={{ fontSize: '0.75rem', color: '#a89984', marginBottom: '0.5rem', fontWeight: '600' }}>❄️ Longest Loss Streak</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fb4934' }}>{headToHead.streaks.longest_loss_streaks.Shayne.length}</div>
                <div style={{ fontSize: '0.7rem', color: '#a89984' }}>Shayne</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fb4934' }}>{headToHead.streaks.longest_loss_streaks.Matt.length}</div>
                <div style={{ fontSize: '0.7rem', color: '#a89984' }}>Matt</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CHARACTER WIN RATES - Compact */}
      <section className="stats-section">
        <h2 style={{ fontSize: '1.3rem', marginBottom: '0.75rem', color: '#fbf1c7' }}>Top Characters</h2>
        <div className="stats-grid" style={{ gap: '1rem' }}>
          <div className="stats-card" style={{ padding: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', textAlign: 'center', color: '#fe8019' }}>Shayne</h3>
            <div className="character-list" style={{ gap: '0.5rem' }}>
              {getTop5(charWinRates.shayne).map(([character, stats]) => {
                const winRate = Math.round((stats.wins / stats.total) * 100);
                return (
                  <div className="character-stats" key={character} style={{ padding: '0.75rem', marginBottom: '0.5rem' }}>
                    <div className="character-name" style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
                      <CharacterDisplay character={character} />
                    </div>
                    <div className="stats-bar" style={{ height: '24px', marginBottom: '0.4rem' }}>
                      <div className="win-bar shayne" style={{ width: `${(stats.wins / stats.total) * 100}%`, fontSize: '0.85rem', padding: '0 0.5rem' }}>{stats.wins}W</div>
                      <div className="loss-bar" style={{ width: `${(stats.losses / stats.total) * 100}%`, fontSize: '0.85rem', padding: '0 0.5rem' }}>{stats.losses}L</div>
                    </div>
                    <div className="stats-total" style={{ fontSize: '0.8rem' }}>
                      <span className="win-rate shayne">{winRate}%</span>
                      <span className="games-played">{stats.total} games</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="stats-card" style={{ padding: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', textAlign: 'center', color: '#b8bb26' }}>Matt</h3>
            <div className="character-list" style={{ gap: '0.5rem' }}>
              {getTop5(charWinRates.matt).map(([character, stats]) => {
                const winRate = Math.round((stats.wins / stats.total) * 100);
                return (
                  <div className="character-stats" key={character} style={{ padding: '0.75rem', marginBottom: '0.5rem' }}>
                    <div className="character-name" style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
                      <CharacterDisplay character={character} />
                    </div>
                    <div className="stats-bar" style={{ height: '24px', marginBottom: '0.4rem' }}>
                      <div className="win-bar matt" style={{ width: `${(stats.wins / stats.total) * 100}%`, fontSize: '0.85rem', padding: '0 0.5rem' }}>{stats.wins}W</div>
                      <div className="loss-bar" style={{ width: `${(stats.losses / stats.total) * 100}%`, fontSize: '0.85rem', padding: '0 0.5rem' }}>{stats.losses}L</div>
                    </div>
                    <div className="stats-total" style={{ fontSize: '0.8rem' }}>
                      <span className="win-rate matt">{winRate}%</span>
                      <span className="games-played">{stats.total} games</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* TOP MATCHUPS - Compact */}
      <section className="stats-section">
        <h2 style={{ fontSize: '1.3rem', marginBottom: '0.75rem', color: '#fbf1c7' }}>Top Matchups</h2>
        <div className="matchups-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
          {matchupMatrix.top_matchups.slice(0, 6).map((matchup, i) => {
            const shayneWinRate = matchup.shayne_win_rate;
            const mattWinRate = matchup.matt_win_rate;
            return (
              <div className="matchup-item" key={i} style={{ padding: '0.75rem' }}>
                <div className="matchup-header" style={{ marginBottom: '0.5rem', paddingBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.9rem' }}>
                    <CharacterDisplay character={matchup.shayne_character} /> vs <CharacterDisplay character={matchup.matt_character} />
                  </span>
                  <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem' }}>{matchup.total_games} games</span>
                </div>
                <div className="matchup-stats">
                  <div style={{ marginBottom: '0.5rem' }}>
                    <div style={{ fontSize: '0.75rem', marginBottom: '0.2rem' }}>Shayne</div>
                    <div className="win-count" style={{ fontSize: '1rem', marginBottom: '0.3rem' }}>
                      {matchup.shayne_wins}
                      <span className="win-percentage" style={{ fontSize: '0.8rem' }}> ({shayneWinRate}%)</span>
                    </div>
                    <div className="win-rate-bar" style={{ height: '4px' }}>
                      <div className="win-rate-fill" style={{ width: `${shayneWinRate}%`, background: '#fe8019' }}></div>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', marginBottom: '0.2rem' }}>Matt</div>
                    <div className="win-count" style={{ fontSize: '1rem', marginBottom: '0.3rem' }}>
                      {matchup.matt_wins}
                      <span className="win-percentage" style={{ fontSize: '0.8rem' }}> ({mattWinRate}%)</span>
                    </div>
                    <div className="win-rate-bar" style={{ height: '4px' }}>
                      <div className="win-rate-fill" style={{ width: `${mattWinRate}%`, background: '#b8bb26' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* MONTHLY ACTIVITY CHART - Compact */}
      <section className="stats-section">
        <h2 style={{ fontSize: '1.3rem', marginBottom: '0.75rem', color: '#fbf1c7' }}>Games by Month</h2>
        <div className="card" style={{ padding: '1rem' }}>
          <div ref={chartRef} style={{ width: '100%', height: 300 }} />
        </div>
      </section>

    </div>
  );
};

export default StatsPage;
