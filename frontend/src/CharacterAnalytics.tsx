import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import * as echarts from 'echarts';
import CharacterDisplay from './components/CharacterDisplay';

interface CharacterOverviewData {
  total_games: number;
  total_usage: number;
  wins: number;
  win_rate: number;
  usage_rate: number;
  shayne_usage: number;
  matt_usage: number;
}

interface CharacterOverview {
  [character: string]: CharacterOverviewData;
}

interface CharactersStatsResponse {
  success: boolean;
  characters: CharacterOverview;
  total_matches: number;
}

const CharacterAnalytics: React.FC = () => {
  const [data, setData] = useState<CharactersStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'usage_rate' | 'win_rate' | 'total_games'>('usage_rate');
  const [filterMinGames, setFilterMinGames] = useState(0);
  const usageChartRef = useRef<HTMLDivElement>(null);
  const winRateDistRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/characters/overview');
        const result = await response.json();
        if (result.success) {
          setData(result);
        } else {
          setError(result.message || 'Failed to load character data');
        }
      } catch (err) {
        setError('Failed to fetch character analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // ECharts visualizations
  useEffect(() => {
    if (!data) return;

    const activeChars = Object.entries(data.characters)
      .filter(([_, stats]) => stats.total_games > 0)
      .sort((a, b) => b[1].usage_rate - a[1].usage_rate)
      .slice(0, 15);

    // Usage Distribution Chart
    if (usageChartRef.current) {
      const chart = echarts.init(usageChartRef.current);
      
      chart.setOption({
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          backgroundColor: '#3c3836',
          borderColor: '#504945',
          textStyle: { color: '#ebdbb2' },
          formatter: (params: any) => {
            const p = params[0];
            return `${p.name}<br/>Usage: ${p.value}%`;
          }
        },
        grid: { left: '3%', right: '4%', top: '8%', bottom: '25%', containLabel: true },
        xAxis: {
          type: 'category',
          data: activeChars.map(([name]) => name),
          axisLine: { lineStyle: { color: '#504945' } },
          axisLabel: { 
            color: '#a89984', 
            fontSize: 9, 
            rotate: 45,
            interval: 0
          }
        },
        yAxis: {
          type: 'value',
          axisLine: { lineStyle: { color: '#504945' } },
          axisLabel: { color: '#a89984', fontSize: 10, formatter: '{value}%' },
          splitLine: { lineStyle: { color: '#3c3836', type: 'dashed' } }
        },
        series: [{
          data: activeChars.map(([_, stats]) => stats.usage_rate),
          type: 'bar',
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#83a598' },
              { offset: 1, color: '#458588' }
            ])
          },
          barWidth: '60%'
        }]
      });

      return () => chart.dispose();
    }
  }, [data]);

  useEffect(() => {
    if (!data) return;

    const activeChars = Object.entries(data.characters)
      .filter(([_, stats]) => stats.total_games > 0);

    // Win Rate Distribution
    if (winRateDistRef.current) {
      const chart = echarts.init(winRateDistRef.current);
      
      const bins = [0, 20, 40, 50, 60, 80, 100];
      const binCounts = new Array(bins.length - 1).fill(0);
      
      activeChars.forEach(([_, stats]) => {
        for (let i = 0; i < bins.length - 1; i++) {
          if (stats.win_rate >= bins[i] && stats.win_rate < bins[i + 1]) {
            binCounts[i]++;
            break;
          }
        }
      });

      chart.setOption({
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          backgroundColor: '#3c3836',
          borderColor: '#504945',
          textStyle: { color: '#ebdbb2' },
          formatter: (params: any) => {
            const p = params[0];
            return `${p.name}<br/>Characters: ${p.value}`;
          }
        },
        grid: { left: '8%', right: '4%', top: '8%', bottom: '15%', containLabel: true },
        xAxis: {
          type: 'category',
          data: ['0-20%', '20-40%', '40-50%', '50-60%', '60-80%', '80-100%'],
          axisLine: { lineStyle: { color: '#504945' } },
          axisLabel: { color: '#a89984', fontSize: 10 }
        },
        yAxis: {
          type: 'value',
          axisLine: { lineStyle: { color: '#504945' } },
          axisLabel: { color: '#a89984', fontSize: 10 },
          splitLine: { lineStyle: { color: '#3c3836', type: 'dashed' } }
        },
        series: [{
          data: binCounts,
          type: 'bar',
          itemStyle: {
            color: (params: any) => {
              const colors = ['#fb4934', '#fabd2f', '#fe8019', '#b8bb26', '#8ec07c', '#83a598'];
              return colors[params.dataIndex];
            }
          },
          barWidth: '70%'
        }]
      });

      return () => chart.dispose();
    }
  }, [data]);

  if (loading) return <div className="stats-container"><div>Loading character analytics...</div></div>;
  if (error) return <div className="stats-container"><div className="error">{error}</div></div>;
  if (!data) return null;

  // Sort characters based on selected criteria
  const sortedCharacters = Object.entries(data.characters).sort((a, b) => {
    const aVal = a[1][sortBy];
    const bVal = b[1][sortBy];
    return bVal - aVal;
  });

  // Filter characters with at least some usage and minimum games
  const activeCharacters = sortedCharacters.filter(([_, stats]) => stats.total_games >= filterMinGames);

  return (
    <div className="stats-container" style={{ padding: '1.5rem' }}>
      <section className="stats-section">
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Character Analytics</h2>
        <p style={{ textAlign: 'center', color: 'var(--fg-light)', marginBottom: '1rem', fontSize: '0.9rem' }}>
          {data.total_matches} total matches • {activeCharacters.length} characters
        </p>

        {/* Visualizations */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          <div className="card" style={{ padding: '1rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: '#fbf1c7' }}>📊 Top 15 by Usage</h3>
            <div ref={usageChartRef} style={{ height: '220px', width: '100%' }}></div>
          </div>
          <div className="card" style={{ padding: '1rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: '#fbf1c7' }}>📈 Win Rate Distribution</h3>
            <div ref={winRateDistRef} style={{ height: '220px', width: '100%' }}></div>
          </div>
        </div>

        {/* Controls */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem', 
          marginBottom: '1rem',
          flexWrap: 'wrap',
          background: 'var(--bg1)',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--card-radius)',
          border: '1px solid var(--bg-light)'
        }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setSortBy('usage_rate')}
              style={{
                padding: '0.4rem 0.8rem',
                fontSize: '0.85rem',
                borderRadius: 'var(--card-radius)',
                border: '1px solid var(--bg-light)',
                background: sortBy === 'usage_rate' ? 'var(--blue)' : 'var(--bg2)',
                color: sortBy === 'usage_rate' ? 'var(--bg0)' : 'var(--fg)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              📊 Usage
            </button>
            <button
              onClick={() => setSortBy('win_rate')}
              style={{
                padding: '0.4rem 0.8rem',
                fontSize: '0.85rem',
                borderRadius: 'var(--card-radius)',
                border: '1px solid var(--bg-light)',
                background: sortBy === 'win_rate' ? 'var(--blue)' : 'var(--bg2)',
                color: sortBy === 'win_rate' ? 'var(--bg0)' : 'var(--fg)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              🏆 Win Rate
            </button>
            <button
              onClick={() => setSortBy('total_games')}
              style={{
                padding: '0.4rem 0.8rem',
                fontSize: '0.85rem',
                borderRadius: 'var(--card-radius)',
                border: '1px solid var(--bg-light)',
                background: sortBy === 'total_games' ? 'var(--blue)' : 'var(--bg2)',
                color: sortBy === 'total_games' ? 'var(--bg0)' : 'var(--fg)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              🎮 Games
            </button>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--fg-light)' }}>Min Games:</label>
            <select 
              value={filterMinGames} 
              onChange={(e) => setFilterMinGames(Number(e.target.value))}
              style={{
                padding: '0.4rem 0.6rem',
                fontSize: '0.85rem',
                borderRadius: 'var(--card-radius)',
                border: '1px solid var(--bg-light)',
                background: 'var(--bg2)',
                color: 'var(--fg)',
                cursor: 'pointer'
              }}
            >
              <option value={0}>All</option>
              <option value={5}>5+</option>
              <option value={10}>10+</option>
              <option value={20}>20+</option>
              <option value={50}>50+</option>
            </select>
          </div>
        </div>

        {/* Character Grid - Compact */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '0.75rem'
        }}>
          {activeCharacters.map(([character, stats]) => (
            <Link
              key={character}
              to={`/characters/${encodeURIComponent(character)}`}
              style={{
                textDecoration: 'none',
                background: 'var(--bg1)',
                borderRadius: 'var(--card-radius)',
                padding: '0.75rem',
                border: '1px solid var(--bg-light)',
                transition: 'all 0.2s',
                display: 'block'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <CharacterDisplay character={character} hideText={false} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--fg-light)' }}>Usage</div>
                  <div style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--blue)' }}>
                    {stats.usage_rate}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--fg-light)' }}>Win Rate</div>
                  <div style={{ 
                    fontSize: '1rem', 
                    fontWeight: 'bold', 
                    color: stats.win_rate >= 50 ? 'var(--green)' : 'var(--red)' 
                  }}>
                    {stats.win_rate}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--fg-light)' }}>Games</div>
                  <div style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--fg)' }}>
                    {stats.total_games}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--fg-light)' }}>Wins</div>
                  <div style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--fg)' }}>
                    {stats.wins}
                  </div>
                </div>
              </div>

              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                fontSize: '0.7rem',
                color: 'var(--fg-light)',
                borderTop: '1px solid var(--bg-light)',
                paddingTop: '0.5rem'
              }}>
                <span style={{ color: '#fe8019' }}>S: {stats.shayne_usage}</span>
                <span style={{ color: '#b8bb26' }}>M: {stats.matt_usage}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
};

export default CharacterAnalytics;
