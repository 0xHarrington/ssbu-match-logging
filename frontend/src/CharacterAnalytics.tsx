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
          axisPointer: { 
            type: 'shadow',
            shadowStyle: {
              color: 'rgba(131, 165, 152, 0.1)'
            }
          },
          backgroundColor: '#3c3836',
          borderColor: '#83a598',
          borderWidth: 2,
          textStyle: { color: '#ebdbb2', fontSize: 12 },
          padding: 12,
          formatter: (params: any) => {
            const p = params[0];
            const charData = activeChars[p.dataIndex];
            const games = charData[1].total_games;
            return `<div style="font-weight: bold; margin-bottom: 4px;">${p.name}</div>` +
                   `<div style="color: #83a598;">Usage: ${p.value.toFixed(1)}%</div>` +
                   `<div style="color: #a89984; font-size: 11px;">${games} games</div>`;
          }
        },
        grid: { left: '3%', right: '4%', top: '8%', bottom: '25%', containLabel: true },
        xAxis: {
          type: 'category',
          data: activeChars.map(([name]) => name),
          axisLine: { lineStyle: { color: '#504945', width: 2 } },
          axisLabel: { 
            color: '#a89984', 
            fontSize: 9, 
            rotate: 45,
            interval: 0,
            fontWeight: 500
          },
          axisTick: {
            show: true,
            lineStyle: { color: '#504945' }
          }
        },
        yAxis: {
          type: 'value',
          axisLine: { show: true, lineStyle: { color: '#504945', width: 2 } },
          axisLabel: { 
            color: '#a89984', 
            fontSize: 10, 
            formatter: '{value}%',
            fontWeight: 500
          },
          splitLine: { 
            lineStyle: { 
              color: '#3c3836', 
              type: 'dashed',
              width: 1
            } 
          }
        },
        series: [{
          data: activeChars.map(([_, stats]) => stats.usage_rate),
          type: 'bar',
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#83a598' },
              { offset: 0.5, color: '#689d6a' },
              { offset: 1, color: '#458588' }
            ]),
            borderRadius: [4, 4, 0, 0],
            shadowColor: 'rgba(131, 165, 152, 0.3)',
            shadowBlur: 8,
            shadowOffsetY: 2
          },
          emphasis: {
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: '#8ec07c' },
                { offset: 0.5, color: '#83a598' },
                { offset: 1, color: '#689d6a' }
              ]),
              shadowColor: 'rgba(131, 165, 152, 0.5)',
              shadowBlur: 12,
              shadowOffsetY: 4
            }
          },
          barWidth: '65%',
          animationDelay: (idx: number) => idx * 30
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
          axisPointer: { 
            type: 'shadow',
            shadowStyle: {
              color: 'rgba(251, 73, 52, 0.1)'
            }
          },
          backgroundColor: '#3c3836',
          borderColor: '#fe8019',
          borderWidth: 2,
          textStyle: { color: '#ebdbb2', fontSize: 12 },
          padding: 12,
          formatter: (params: any) => {
            const p = params[0];
            const range = p.name;
            const count = p.value;
            const total = binCounts.reduce((a: number, b: number) => a + b, 0);
            const percent = ((count / total) * 100).toFixed(1);
            return `<div style="font-weight: bold; margin-bottom: 4px;">${range} Win Rate</div>` +
                   `<div style="color: #fe8019;">${count} characters (${percent}%)</div>`;
          }
        },
        grid: { left: '8%', right: '4%', top: '8%', bottom: '15%', containLabel: true },
        xAxis: {
          type: 'category',
          data: ['0-20%', '20-40%', '40-50%', '50-60%', '60-80%', '80-100%'],
          axisLine: { lineStyle: { color: '#504945', width: 2 } },
          axisLabel: { 
            color: '#a89984', 
            fontSize: 10,
            fontWeight: 500
          },
          axisTick: {
            show: true,
            lineStyle: { color: '#504945' }
          }
        },
        yAxis: {
          type: 'value',
          axisLine: { show: true, lineStyle: { color: '#504945', width: 2 } },
          axisLabel: { 
            color: '#a89984', 
            fontSize: 10,
            fontWeight: 500
          },
          splitLine: { 
            lineStyle: { 
              color: '#3c3836', 
              type: 'dashed',
              width: 1
            } 
          }
        },
        series: [{
          data: binCounts,
          type: 'bar',
          itemStyle: {
            color: (params: any) => {
              const colors = [
                { start: '#fb4934', end: '#cc241d' },
                { start: '#fabd2f', end: '#d79921' },
                { start: '#fe8019', end: '#d65d0e' },
                { start: '#b8bb26', end: '#98971a' },
                { start: '#8ec07c', end: '#689d6a' },
                { start: '#83a598', end: '#458588' }
              ];
              const colorPair = colors[params.dataIndex];
              return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: colorPair.start },
                { offset: 1, color: colorPair.end }
              ]);
            },
            borderRadius: [4, 4, 0, 0],
            shadowColor: 'rgba(0, 0, 0, 0.3)',
            shadowBlur: 8,
            shadowOffsetY: 2
          },
          emphasis: {
            itemStyle: {
              shadowColor: 'rgba(0, 0, 0, 0.5)',
              shadowBlur: 12,
              shadowOffsetY: 4,
              borderColor: '#ebdbb2',
              borderWidth: 2
            }
          },
          barWidth: '75%',
          animationDelay: (idx: number) => idx * 50
        }]
      });

      return () => chart.dispose();
    }
  }, [data]);

  if (loading) {
    return (
      <div className="stats-container" style={{ 
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ 
          textAlign: 'center', 
          padding: '3rem', 
          fontSize: '1.2rem',
          color: '#a89984'
        }}>
          Loading character analytics...
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="stats-container" style={{ 
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ 
          textAlign: 'center', 
          padding: '2rem',
          fontSize: '1.2rem',
          color: '#fb4934'
        }}>
          {error}
        </div>
      </div>
    );
  }
  
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
    <div className="stats-container" style={{ 
      maxWidth: '1400px', 
      padding: '1.5rem',
      margin: '0 auto'
    }}>
      {/* Header Section */}
      <section className="stats-section" style={{ marginBottom: '1.5rem' }}>
        <div style={{
          background: 'linear-gradient(135deg, #3c3836 0%, #282828 100%)',
          borderRadius: '16px',
          padding: '1.5rem',
          border: '1px solid #504945',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          textAlign: 'center'
        }}>
          <h1 style={{ 
            fontSize: '1.8rem', 
            fontWeight: 'bold',
            marginBottom: '0.5rem',
            color: '#fbf1c7'
          }}>
            🎮 Character Analytics
          </h1>
          <p style={{ 
            color: '#a89984', 
            marginBottom: '1rem', 
            fontSize: '0.9rem' 
          }}>
            {data.total_matches} total matches • {activeCharacters.length} characters with data
          </p>
          
          {/* Quick Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '1rem',
            marginTop: '1rem'
          }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#a89984', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
                Most Used
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#83a598' }}>
                {activeCharacters[0] ? activeCharacters[0][0] : 'N/A'}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#a89984' }}>
                {activeCharacters[0] ? `${activeCharacters[0][1].usage_rate}%` : ''}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#a89984', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
                Highest Win Rate
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#b8bb26' }}>
                {sortedCharacters.filter(([_, s]) => s.total_games >= 20)[0] ? 
                  sortedCharacters.filter(([_, s]) => s.total_games >= 20).sort((a, b) => b[1].win_rate - a[1].win_rate)[0][0] : 'N/A'}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#a89984' }}>
                {sortedCharacters.filter(([_, s]) => s.total_games >= 20)[0] ? 
                  `${sortedCharacters.filter(([_, s]) => s.total_games >= 20).sort((a, b) => b[1].win_rate - a[1].win_rate)[0][1].win_rate}%` : ''}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#a89984', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
                Active Roster
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fabd2f' }}>
                {activeCharacters.length}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#a89984' }}>
                characters
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="stats-section">

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
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          background: '#3c3836',
          padding: '1rem',
          borderRadius: '12px',
          border: '1px solid #504945',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
        }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#a89984', marginRight: '0.5rem', fontWeight: '600' }}>
              Sort by:
            </span>
            <button
              onClick={() => setSortBy('usage_rate')}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.85rem',
                borderRadius: '8px',
                border: sortBy === 'usage_rate' ? '2px solid #83a598' : '1px solid #504945',
                background: sortBy === 'usage_rate' ? '#83a598' : '#282828',
                color: sortBy === 'usage_rate' ? '#282828' : '#ebdbb2',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontWeight: sortBy === 'usage_rate' ? 'bold' : 'normal'
              }}
              onMouseEnter={(e) => {
                if (sortBy !== 'usage_rate') e.currentTarget.style.background = '#3c3836';
              }}
              onMouseLeave={(e) => {
                if (sortBy !== 'usage_rate') e.currentTarget.style.background = '#282828';
              }}
            >
              📊 Usage
            </button>
            <button
              onClick={() => setSortBy('win_rate')}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.85rem',
                borderRadius: '8px',
                border: sortBy === 'win_rate' ? '2px solid #83a598' : '1px solid #504945',
                background: sortBy === 'win_rate' ? '#83a598' : '#282828',
                color: sortBy === 'win_rate' ? '#282828' : '#ebdbb2',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontWeight: sortBy === 'win_rate' ? 'bold' : 'normal'
              }}
              onMouseEnter={(e) => {
                if (sortBy !== 'win_rate') e.currentTarget.style.background = '#3c3836';
              }}
              onMouseLeave={(e) => {
                if (sortBy !== 'win_rate') e.currentTarget.style.background = '#282828';
              }}
            >
              🏆 Win Rate
            </button>
            <button
              onClick={() => setSortBy('total_games')}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.85rem',
                borderRadius: '8px',
                border: sortBy === 'total_games' ? '2px solid #83a598' : '1px solid #504945',
                background: sortBy === 'total_games' ? '#83a598' : '#282828',
                color: sortBy === 'total_games' ? '#282828' : '#ebdbb2',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontWeight: sortBy === 'total_games' ? 'bold' : 'normal'
              }}
              onMouseEnter={(e) => {
                if (sortBy !== 'total_games') e.currentTarget.style.background = '#3c3836';
              }}
              onMouseLeave={(e) => {
                if (sortBy !== 'total_games') e.currentTarget.style.background = '#282828';
              }}
            >
              🎮 Games
            </button>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <label style={{ fontSize: '0.8rem', color: '#a89984', fontWeight: '600' }}>
              Min Games:
            </label>
            <select 
              value={filterMinGames} 
              onChange={(e) => setFilterMinGames(Number(e.target.value))}
              style={{
                padding: '0.5rem 0.75rem',
                fontSize: '0.85rem',
                borderRadius: '8px',
                border: '1px solid #504945',
                background: '#282828',
                color: '#ebdbb2',
                cursor: 'pointer',
                fontWeight: '500',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#3c3836';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#282828';
              }}
            >
              <option value={0}>All Characters</option>
              <option value={5}>5+ games</option>
              <option value={10}>10+ games</option>
              <option value={20}>20+ games</option>
              <option value={50}>50+ games</option>
            </select>
          </div>
        </div>

        {/* Character Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '1rem'
        }}>
          {activeCharacters.map(([character, stats]) => (
            <Link
              key={character}
              to={`/characters/${encodeURIComponent(character)}`}
              style={{
                textDecoration: 'none',
                background: '#3c3836',
                borderRadius: '12px',
                padding: '1rem',
                border: '1px solid #504945',
                transition: 'all 0.2s',
                display: 'block',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.4)';
                e.currentTarget.style.borderColor = '#83a598';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
                e.currentTarget.style.borderColor = '#504945';
              }}
            >
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.75rem', 
                marginBottom: '0.75rem',
                paddingBottom: '0.75rem',
                borderBottom: '1px solid #504945'
              }}>
                <CharacterDisplay character={character} hideText={false} />
              </div>

              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '0.75rem', 
                marginBottom: '0.75rem' 
              }}>
                <div style={{
                  background: '#282828',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: '1px solid #3c3836'
                }}>
                  <div style={{ fontSize: '0.7rem', color: '#a89984', marginBottom: '0.25rem' }}>
                    Usage
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#83a598' }}>
                    {stats.usage_rate}%
                  </div>
                </div>
                <div style={{
                  background: '#282828',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: '1px solid #3c3836'
                }}>
                  <div style={{ fontSize: '0.7rem', color: '#a89984', marginBottom: '0.25rem' }}>
                    Win Rate
                  </div>
                  <div style={{ 
                    fontSize: '1.1rem', 
                    fontWeight: 'bold', 
                    color: stats.win_rate >= 50 ? '#b8bb26' : '#fb4934' 
                  }}>
                    {stats.win_rate}%
                  </div>
                </div>
                <div style={{
                  background: '#282828',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: '1px solid #3c3836'
                }}>
                  <div style={{ fontSize: '0.7rem', color: '#a89984', marginBottom: '0.25rem' }}>
                    Games
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#ebdbb2' }}>
                    {stats.total_games}
                  </div>
                </div>
                <div style={{
                  background: '#282828',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: '1px solid #3c3836'
                }}>
                  <div style={{ fontSize: '0.7rem', color: '#a89984', marginBottom: '0.25rem' }}>
                    Wins
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#ebdbb2' }}>
                    {stats.wins}
                  </div>
                </div>
              </div>

              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.75rem',
                background: '#282828',
                padding: '0.5rem',
                borderRadius: '6px',
                border: '1px solid #3c3836'
              }}>
                <div>
                  <span style={{ color: '#a89984', marginRight: '0.25rem' }}>Shayne:</span>
                  <span style={{ color: '#fe8019', fontWeight: 'bold' }}>{stats.shayne_usage}</span>
                </div>
                <div>
                  <span style={{ color: '#a89984', marginRight: '0.25rem' }}>Matt:</span>
                  <span style={{ color: '#b8bb26', fontWeight: 'bold' }}>{stats.matt_usage}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
};

export default CharacterAnalytics;
