import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import * as echarts from 'echarts';
import styles from './UserStats.module.css';
import CharacterDisplay from '../CharacterDisplay';

// Import stage images
import bfImage from '../../assets/stages/bf.avif';
import fdImage from '../../assets/stages/fd.avif';
import ps2Image from '../../assets/stages/ps2.avif';
import sbfImage from '../../assets/stages/sbf.avif';
import tncImage from '../../assets/stages/tnc.avif';
import kalosImage from '../../assets/stages/kalos.avif';
import hollowImage from '../../assets/stages/hollow.avif';
import yoshisImage from '../../assets/stages/yoshis.avif';
import smashvilleImage from '../../assets/stages/smashville.avif';

// Stage image mapping
const stageImages: { [key: string]: string } = {
  'Battlefield': bfImage,
  'Small Battlefield': sbfImage,
  'Final Destination': fdImage,
  'Pokemon Stadium 2': ps2Image,
  'Smashville': smashvilleImage,
  'Town & City': tncImage,
  'Kalos Pokemon League': kalosImage,
  'Yoshi\'s Story': yoshisImage,
  'Hollow Bastion': hollowImage,
};

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

interface CharacterStats {
  character: string;
  winRate: number;
  totalGames: number;
}

interface StageStats {
  stage: string;
  winRate: number;
  totalGames: number;
  wins: number;
  losses: number;
}

interface MostFacedCharacter {
  character: string;
  games: number;
  wins: number;
}

interface UserStatsData {
  overallWinRate: number;
  totalGames: number;
  avgStocksWhenWinning: number;
  currentStreak: {
    count: number;
    type: 'win' | 'loss' | null;
  };
  maxStreak: {
    count: number;
    type: 'win' | 'loss' | null;
  };
  recentPerformance: {
    games: number;
    winRate: number;
  };
  characterStats: CharacterStats[];
  stageStats: StageStats[];
  mostFacedCharacters: MostFacedCharacter[];
}

// Seeded random number generator for consistent simulated data
function seededRandom(seed: number) {
  let value = seed;
  return function() {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

export const UserStats: React.FC = () => {
  const { username = '' } = useParams<{ username: string }>();
  const [stats, setStats] = useState<UserStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [heatmapData, setHeatmapData] = useState<any>(null);
  const [usingSimulatedData, setUsingSimulatedData] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);
  const [timelineData, setTimelineData] = useState<any>(null);
  const [usingSimulatedTimeline, setUsingSimulatedTimeline] = useState(false);
  
  // Refs for ECharts - must be declared before any early returns
  const winRateTimelineRef = useRef<HTMLDivElement>(null);
  const performanceHeatmapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!username) {
      setError('Username is required');
      setLoading(false);
      return;
    }

    const fetchStats = async () => {
      try {
        const response = await fetch(`/api/users/${username}/stats`);
        if (!response.ok) {
          throw new Error('Failed to fetch user stats');
        }
        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [username]);

  // Fetch timeline data
  useEffect(() => {
    if (!username) return;

    const fetchTimelineData = async () => {
      try {
        const response = await fetch(`/api/users/${username}/win-rate-timeline`);
        if (!response.ok) {
          throw new Error('Failed to fetch timeline data');
        }
        const result = await response.json();
        
        if (result.success && result.data) {
          setTimelineData(result.data);
          setUsingSimulatedTimeline(false);
        } else {
          setUsingSimulatedTimeline(true);
        }
      } catch (err) {
        console.error('Error fetching timeline data:', err);
        setUsingSimulatedTimeline(true);
      }
    };

    fetchTimelineData();
  }, [username]);

  // Fetch heatmap data
  useEffect(() => {
    if (!username) return;

    const fetchHeatmapData = async () => {
      try {
        const url = selectedCharacter 
          ? `/api/users/${username}/heatmap?character=${encodeURIComponent(selectedCharacter)}`
          : `/api/users/${username}/heatmap`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to fetch heatmap data');
        }
        const result = await response.json();
        
        if (result.success && result.data && result.data.length > 0) {
          setHeatmapData(result.data);
          setUsingSimulatedData(false);
        } else {
          // No real data available, use seeded random
          setUsingSimulatedData(true);
        }
      } catch (err) {
        console.error('Error fetching heatmap data:', err);
        setUsingSimulatedData(true);
      }
    };

    fetchHeatmapData();
  }, [username, selectedCharacter]);

  // Initialize ECharts visualizations
  useEffect(() => {
    if (!stats) return;

    // Win Rate Timeline Chart
    if (winRateTimelineRef.current) {
      const chart = echarts.init(winRateTimelineRef.current);
      
      let xData: string[];
      let yData: number[];
      let dateRanges: string[] = [];
      
      if (timelineData && !usingSimulatedTimeline) {
        // Use real data from backend
        xData = timelineData.game_numbers.map((n: number) => `${n}`);
        yData = timelineData.win_rates;
        dateRanges = timelineData.date_ranges || [];
      } else {
        // Generate seeded random data for consistent display
        const seed = (username?.charCodeAt(0) || 0) * 1000;
        const random = seededRandom(seed);
        
        // Generate 100 data points (or fewer if not enough games)
        const numPoints = Math.min(100, Math.floor(stats.totalGames / 20));
        xData = Array.from({ length: numPoints }, (_, i) => `${i + 1}`);
        
        // Create simulated data that trends around overall win rate
        const baseWinRate = stats.overallWinRate;
        yData = [];
        let currentValue = baseWinRate + (random() - 0.5) * 20;
        
        for (let i = 0; i < numPoints; i++) {
          // Add some randomness but keep it smooth
          const change = (random() - 0.5) * 15;
          currentValue = Math.max(20, Math.min(80, currentValue + change));
          
          // Gradually pull towards overall win rate for realism
          currentValue = currentValue * 0.92 + baseWinRate * 0.08;
          
          yData.push(parseFloat(currentValue.toFixed(1)));
        }
      }

      chart.setOption({
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'axis',
          backgroundColor: '#3c3836',
          borderColor: '#504945',
          textStyle: { color: '#ebdbb2', fontSize: 11 },
          formatter: (params: any) => {
            const point = params[0];
            const windowIndex = point.dataIndex;
            let tooltip = `20-Game Win Rate: ${point.value.toFixed(1)}%`;
            
            // Add date range if available
            if (dateRanges.length > windowIndex) {
              tooltip += `<br/>Period: ${dateRanges[windowIndex]}`;
            }
            
            return tooltip;
          }
        },
        grid: { left: '8%', right: '12%', top: '15%', bottom: '12%', containLabel: true },
        xAxis: {
          type: 'category',
          data: xData,
          axisLine: { lineStyle: { color: '#504945' } },
          axisLabel: { color: '#a89984', fontSize: 9, interval: Math.floor(xData.length / 10) },
          name: '20-Game Windows (Last 2000 Games)',
          nameTextStyle: { color: '#a89984', fontSize: 10 },
          nameLocation: 'middle',
          nameGap: 25
        },
        yAxis: {
          type: 'value',
          axisLine: { lineStyle: { color: '#504945' } },
          axisLabel: { color: '#a89984', fontSize: 9, formatter: '{value}%' },
          splitLine: { lineStyle: { color: '#3c3836', type: 'dashed' } },
          min: 0,
          max: 100
        },
        series: [{
          data: yData,
          type: 'line',
          smooth: true,
          symbol: 'none',
          lineStyle: { color: username === 'Shayne' ? '#fe8019' : '#b8bb26', width: 2 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: username === 'Shayne' ? 'rgba(254, 128, 25, 0.3)' : 'rgba(184, 187, 38, 0.3)' },
              { offset: 1, color: 'rgba(60, 56, 54, 0.1)' }
            ])
          },
          markLine: {
            silent: true,
            symbol: 'none',
            data: [
              {
                yAxis: 50,
                lineStyle: { color: 'rgba(168, 153, 132, 0.2)', type: 'dashed', width: 1 },
                label: { show: false }
              },
              {
                yAxis: stats.overallWinRate,
                lineStyle: { color: '#83a598', type: 'solid', width: 1 },
                label: { formatter: 'Overall Avg: {c}%', color: '#83a598', fontSize: 9 }
              }
            ]
          }
        }]
      });

      return () => chart.dispose();
    }
  }, [stats, username, timelineData, usingSimulatedTimeline]);

  useEffect(() => {
    if (!stats) return;

    // Performance Heatmap (Day of Week vs Hour) - More granular with 24 hours
    if (performanceHeatmapRef.current) {
      const chart = echarts.init(performanceHeatmapRef.current);
      
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const hours = Array.from({ length: 24 }, (_, i) => {
        if (i === 0) return '12a';
        if (i < 12) return `${i}a`;
        if (i === 12) return '12p';
        return `${i - 12}p`;
      });
      
      // Format: [hour, day, winRate, gameCount]
      let data: [number, number, number, number][] = [];
      let maxGames = 30;
      
      if (heatmapData && !usingSimulatedData) {
        // Use real data from backend
        data = heatmapData.map((item: any) => [
          item.hour,
          item.day,
          item.win_rate,
          item.game_count
        ]);
        
        // Calculate actual max games for normalization
        maxGames = Math.max(...heatmapData.map((item: any) => item.game_count), 1);
      } else {
        // Use seeded random data for consistent display
        const random = seededRandom(username.charCodeAt(0) * 1000);
        
      for (let d = 0; d < 7; d++) {
          for (let h = 0; h < 24; h++) {
            // Simulate realistic gaming patterns (higher activity in evenings)
            let baseValue = random() * 40;
            let gameCount = Math.floor(random() * 5); // Base game count
            
            if (h >= 18 && h <= 23) {
              baseValue += 40; // Evening boost
              gameCount += Math.floor(random() * 20) + 5; // More games in evening
            } else if (h >= 12 && h < 18) {
              baseValue += 20; // Afternoon boost
              gameCount += Math.floor(random() * 10) + 2; // Some games in afternoon
            } else if (h >= 0 && h < 6) {
              baseValue -= 20; // Late night penalty
              gameCount = Math.floor(random() * 3); // Very few games late night
            }
            
            const winRate = Math.max(0, Math.min(100, baseValue + (random() * 30)));
            data.push([h, d, Math.round(winRate), gameCount]);
          }
        }
      }

      chart.setOption({
        backgroundColor: 'transparent',
        tooltip: {
          position: 'top',
          backgroundColor: '#3c3836',
          borderColor: '#504945',
          textStyle: { color: '#ebdbb2', fontSize: 11 },
          formatter: (params: any) => {
            const winRate = params.value[2];
            const games = params.value[3];
            if (games === 0) {
              return `${days[params.value[1]]} ${hours[params.value[0]]}<br/>No games played`;
            }
            return `${days[params.value[1]]} ${hours[params.value[0]]}<br/>Win Rate: ${winRate}%<br/>Games: ${games}`;
          }
        },
        grid: { left: '8%', right: '2%', top: '3%', bottom: '15%', containLabel: true },
        xAxis: {
          type: 'category',
          data: hours,
          splitArea: { show: false },
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { 
            color: '#a89984', 
            fontSize: 9,
            interval: 2, // Show every 3rd hour
            rotate: 0
          }
        },
        yAxis: {
          type: 'category',
          data: days,
          splitArea: { show: false },
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { color: '#a89984', fontSize: 10 },
          inverse: true // Display from top to bottom (Sunday at top, Saturday at bottom)
        },
        visualMap: {
          show: false, // Hide the visual map since we're using custom colors
          min: 0,
          max: 100
        },
        series: [{
          type: 'heatmap',
          data: data.map(item => {
            const [hour, day, winRate, gameCount] = item;
            
            // Special handling for cells with no games
            if (gameCount === 0) {
              // Use neutral yellow color with very low opacity
              return {
                value: [hour, day, 50, 0], // Show as 50% win rate
                itemStyle: {
                  color: 'rgba(250, 189, 47, 0.05)' // Yellow with 5% opacity
                }
              };
            }
            
            // Calculate brightness based on game count (0.3 to 1.0)
            // More games = brighter, fewer games = darker
            const brightness = Math.max(0.3, Math.min(1.0, gameCount / maxGames));
            
            // Determine color based on win rate
            let baseColor;
            if (winRate < 35) {
              baseColor = [251, 73, 52]; // Red (#fb4934)
            } else if (winRate < 45) {
              baseColor = [254, 128, 25]; // Orange (#fe8019)
            } else if (winRate < 55) {
              baseColor = [250, 189, 47]; // Yellow (#fabd2f)
            } else if (winRate < 65) {
              baseColor = [184, 187, 38]; // Light green (#b8bb26)
            } else {
              baseColor = [152, 151, 26]; // Dark green (#98971a)
            }
            
            // Apply brightness to the color
            const adjustedColor = baseColor.map(c => Math.round(c * brightness));
            const colorString = `rgb(${adjustedColor[0]}, ${adjustedColor[1]}, ${adjustedColor[2]})`;
            
            return {
              value: [hour, day, winRate, gameCount],
              itemStyle: {
                color: colorString
              }
            };
          }),
          label: { show: false },
          itemStyle: {
            borderColor: '#282828',
            borderWidth: 1
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
              borderColor: '#fbf1c7',
              borderWidth: 2
            }
          }
        }]
      });

      return () => chart.dispose();
    }
  }, [stats, heatmapData, usingSimulatedData, username]);

  // Early returns after all hooks
  if (loading) return <div className="loading">Loading stats...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!stats) return <div className="error">No stats available</div>;

  // Calculate win rate trend (comparing recent to overall)
  const winRateTrend = stats.recentPerformance.winRate - stats.overallWinRate;
  const trendDirection = winRateTrend >= 0 ? 'positive' : 'negative';
  
  // Get most played character
  const mostPlayedChar = stats.characterStats[0];
  const bestChar = stats.characterStats
    .filter(char => char.totalGames >= 20) // Minimum 20 games for significance
    .sort((a, b) => b.winRate - a.winRate)[0];

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      datalabels: {
        display: false, // Disable for cleaner look
      },
      legend: {
        position: 'top' as const,
        labels: {
          color: '#ebdbb2',
          font: { size: 11 },
          padding: 10,
          boxWidth: 12,
          boxHeight: 12
        },
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#3c3836',
        titleColor: '#ebdbb2',
        bodyColor: '#ebdbb2',
        borderColor: '#504945',
        borderWidth: 1,
        padding: 10,
        titleFont: { size: 12, weight: 'bold' as const },
        bodyFont: { size: 11 },
        callbacks: {
          label: (context: any) => {
            const value = context.raw;
            const label = context.dataset.label;
            if (label === 'Games Played') {
              return `Usage: ${value.toFixed(1)}%`;
            }
            return `Win Rate: ${value.toFixed(1)}%`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        grid: { color: '#3c3836', lineWidth: 0.5 },
        ticks: {
          color: '#a89984',
          font: { size: 10 },
          callback: (value: any) => `${value}%`
        },
      },
      x: {
        grid: { display: false },
        ticks: {
          color: '#a89984',
          font: { size: 10 },
          maxRotation: 45,
          minRotation: 0,
        },
      },
    },
  };

  const characterChartData = {
    labels: stats.characterStats.map(stat => stat.character),
    datasets: [
      {
        label: 'Win Rate (%)',
        data: stats.characterStats.map(stat => stat.winRate),
        backgroundColor: username && username === 'Shayne' ? '#fe8019' : '#b8bb26',
        borderColor: '#282828',
        borderWidth: 1,
      },
      {
        label: 'Games Played',
        data: stats.characterStats.map(stat => (stat.totalGames / stats.totalGames) * 100),
        backgroundColor: '#83a598',
        borderColor: '#282828',
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className={styles['stats-container']}>
      {/* Compact Header */}
      <div className={styles['stats-header']}>
        <div className={styles['stats-header-content']}>
          <h1 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>{username}'s Dashboard</h1>
          <p className={styles['stats-subtitle']} style={{ fontSize: '0.95rem', margin: '0.5rem 0' }}>
            {stats.totalGames} matches • <span className={styles['player-tag']}>{stats.overallWinRate.toFixed(1)}% WR</span>
          </p>
          
          <div className={styles['stats-summary']} style={{ gap: '1rem', marginTop: '1rem', paddingTop: '1rem' }}>
            <div className={styles['summary-item']} style={{ padding: '0.25rem' }}>
              <div className={styles['summary-label']} style={{ fontSize: '0.75rem', marginBottom: '0.3rem' }}>Most Played</div>
              <div className={styles['summary-value']} style={{ fontSize: '1.1rem' }}>
                <div className={styles['character-name']}>
                  {mostPlayedChar && <CharacterDisplay character={mostPlayedChar.character} />}
                </div>
                <div className={styles['stat-subtitle']} style={{ fontSize: '0.75rem' }}>
                  {mostPlayedChar ? `${mostPlayedChar.totalGames} games` : 'N/A'}
                </div>
              </div>
            </div>
            
            <div className={styles['summary-item']} style={{ padding: '0.25rem' }}>
              <div className={styles['summary-label']} style={{ fontSize: '0.75rem', marginBottom: '0.3rem' }}>Best Character</div>
              <div className={styles['summary-value']} style={{ fontSize: '1.1rem' }}>
                <div className={styles['character-name']}>
                  {bestChar && <CharacterDisplay character={bestChar.character} />}
                </div>
                <div className={styles['stat-subtitle']} style={{ fontSize: '0.75rem' }}>
                  {bestChar ? `${bestChar.winRate.toFixed(1)}%` : 'N/A'}
                </div>
              </div>
            </div>

            <div className={styles['summary-item']} style={{ padding: '0.25rem' }}>
              <div className={styles['summary-label']} style={{ fontSize: '0.75rem', marginBottom: '0.3rem' }}>Streak</div>
              <div className={`${styles['summary-value']} ${styles[stats.currentStreak.type || '']}`} style={{ fontSize: '1.1rem' }}>
                {stats.currentStreak.count} {stats.currentStreak.type}s
                <div className={styles['stat-subtitle']} style={{ fontSize: '0.75rem' }}>
                  Max: {stats.maxStreak.count}
                </div>
              </div>
            </div>
            
            <div className={styles['summary-item']} style={{ padding: '0.25rem' }}>
              <div className={styles['summary-label']} style={{ fontSize: '0.75rem', marginBottom: '0.3rem' }}>Recent Form</div>
              <div className={`${styles['summary-value']} ${styles[trendDirection]}`} style={{ fontSize: '1.1rem' }}>
                {stats.recentPerformance.winRate.toFixed(1)}%
                <div className={styles['stat-subtitle']} style={{ fontSize: '0.75rem' }}>
                  Last {stats.recentPerformance.games}
                </div>
              </div>
            </div>

            <div className={styles['summary-item']} style={{ padding: '0.25rem' }}>
              <div className={styles['summary-label']} style={{ fontSize: '0.75rem', marginBottom: '0.3rem' }}>Avg Stocks</div>
              <div className={styles['summary-value']} style={{ fontSize: '1.1rem' }}>
                {stats.avgStocksWhenWinning.toFixed(2)}
                <div className={styles['stat-subtitle']} style={{ fontSize: '0.75rem' }}>
                  When winning
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Visualizations */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        <div className="card" style={{ padding: '1rem' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: '#fbf1c7' }}>
            📈 Win Rate Trend
            {usingSimulatedTimeline && (
              <span style={{ fontSize: '0.7rem', color: '#fabd2f', marginLeft: '0.5rem', fontWeight: 'normal' }}>
                ⚠️ Using simulated data
              </span>
            )}
          </h3>
          <div ref={winRateTimelineRef} style={{ height: '220px', width: '100%' }}></div>
        </div>
        <div className="card" style={{ padding: '1rem' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: '#fbf1c7' }}>
            🔥 Performance Heatmap (24hr)
            {usingSimulatedData && (
              <span style={{ fontSize: '0.7rem', color: '#fabd2f', marginLeft: '0.5rem', fontWeight: 'normal' }}>
                ⚠️ Using simulated data
              </span>
            )}
          </h3>
          <div style={{ fontSize: '0.7rem', color: '#a89984', marginBottom: '0.5rem', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <span>Color = Win Rate (🔴 Low → 🟡 Mid → 🟢 High)</span>
            <span>Brightness = Games Played (Darker = Fewer, Brighter = More)</span>
          </div>
          <div ref={performanceHeatmapRef} style={{ height: '260px', width: '100%' }}></div>
          
          {/* Character Filter */}
          {stats && stats.characterStats && stats.characterStats.length > 0 && (
            <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #504945' }}>
              <div style={{ fontSize: '0.75rem', color: '#a89984', marginBottom: '0.5rem', textAlign: 'center' }}>
                Filter by Character:
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setSelectedCharacter(null)}
                  style={{
                    padding: '0.4rem 0.6rem',
                    background: selectedCharacter === null ? '#83a598' : '#3c3836',
                    color: selectedCharacter === null ? '#282828' : '#ebdbb2',
                    border: '1px solid #504945',
                    borderRadius: '6px',
                    fontSize: '0.7rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontWeight: selectedCharacter === null ? 'bold' : 'normal'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedCharacter !== null) e.currentTarget.style.background = '#504945';
                  }}
                  onMouseLeave={(e) => {
                    if (selectedCharacter !== null) e.currentTarget.style.background = '#3c3836';
                  }}
                >
                  All Characters
                </button>
                {stats.characterStats.slice(0, 8).map((charStat) => (
                  <button
                    key={charStat.character}
                    onClick={() => setSelectedCharacter(charStat.character)}
                    style={{
                      padding: '0.3rem',
                      background: selectedCharacter === charStat.character ? '#83a598' : '#3c3836',
                      border: selectedCharacter === charStat.character ? '2px solid #83a598' : '1px solid #504945',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedCharacter !== charStat.character) e.currentTarget.style.background = '#504945';
                    }}
                    onMouseLeave={(e) => {
                      if (selectedCharacter !== charStat.character) e.currentTarget.style.background = '#3c3836';
                    }}
                    title={`${charStat.character} (${charStat.totalGames} games, ${charStat.winRate.toFixed(1)}% WR)`}
                  >
                    <CharacterDisplay character={charStat.character} hideText={true} />
                    <span style={{ fontSize: '0.65rem', color: selectedCharacter === charStat.character ? '#282828' : '#a89984' }}>
                      {charStat.totalGames}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Character & Stage Performance - Side by Side */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1rem' }}>
        {/* Character Performance */}
        <div className="card" style={{ padding: '1rem' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>🎯 Character Performance</h2>
          <div style={{ height: '280px', marginBottom: '0.75rem' }}>
            <Bar data={characterChartData} options={chartOptions} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
            {stats.characterStats.slice(0, 4).map((stat) => (
              <div key={stat.character} style={{
                background: '#32302f',
                borderRadius: '6px',
                padding: '0.5rem',
                border: '1px solid #3c3836'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                  <CharacterDisplay character={stat.character} hideText={true} iconClassName={styles['character-icon']} />
                  <h4 style={{ fontSize: '0.85rem', margin: 0 }}>{stat.character}</h4>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                  <span style={{ color: '#a89984' }}>WR:</span>
                  <span style={{ color: username === 'Shayne' ? '#fe8019' : '#b8bb26', fontWeight: 'bold' }}>
                    {stat.winRate.toFixed(1)}%
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                  <span style={{ color: '#a89984' }}>Games:</span>
                  <span style={{ color: '#ebdbb2' }}>{stat.totalGames}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stage Performance */}
        <div className="card" style={{ padding: '1rem' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>🎯 Stage Performance</h2>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', 
            gap: '0.75rem' 
          }}>
            {stats.stageStats
              .filter(stat => stat.stage !== 'No Stage' && stat.stage !== 'Northern Cave')
              .map((stat) => {
              const winRate = Math.round(stat.winRate);
              const color = winRate >= 60 ? '#b8bb26' : 
                           winRate >= 50 ? '#83a598' : 
                           winRate >= 40 ? '#fe8019' : '#fb4934';
              
              return (
                <div 
                  key={stat.stage}
                  style={{
                    backgroundImage: stageImages[stat.stage] ? `url(${stageImages[stat.stage]})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    borderRadius: '12px',
                    padding: '1rem',
                    minHeight: '100px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                    overflow: 'hidden',
                    border: '2px solid #504945',
                    transition: 'all 0.2s',
                    cursor: 'default'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.65)',
                    zIndex: 1,
                  }} />
                  <div style={{ 
                    position: 'relative',
                    zIndex: 2,
                    fontSize: '0.85rem',
                    color: '#fbf1c7',
                    fontWeight: 'bold',
                    textShadow: '0 2px 4px rgba(0,0,0,0.9)',
                    marginBottom: '0.5rem'
                  }}>
                    {stat.stage}
                  </div>
                  <div style={{
                    position: 'relative',
                    zIndex: 2
                  }}>
                    <div style={{ 
                      fontSize: '2rem',
                      fontWeight: 'bold',
                      color: color,
                      textShadow: '0 2px 4px rgba(0,0,0,0.9)',
                      lineHeight: 1
                    }}>
                      {winRate}%
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#a89984',
                      textShadow: '0 2px 4px rgba(0,0,0,0.9)',
                      marginTop: '0.25rem'
                    }}>
                      {stat.wins}W-{stat.losses}L ({stat.totalGames}g)
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Most Faced Characters */}
      {stats.mostFacedCharacters.length > 0 && (
        <div className="card" style={{ padding: '1rem', marginTop: '1rem' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Most Faced Opponents</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.5rem' }}>
            {stats.mostFacedCharacters.slice(0, 6).map((opponent) => (
              <div key={opponent.character} style={{
                background: '#32302f',
                borderRadius: '6px',
                padding: '0.6rem',
                border: '1px solid #3c3836',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <CharacterDisplay character={opponent.character} hideText={true} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#ebdbb2' }}>{opponent.character}</div>
                  <div style={{ fontSize: '0.7rem', color: '#a89984' }}>
                    {opponent.wins}W-{opponent.games - opponent.wins}L ({opponent.games} games)
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: opponent.wins / opponent.games >= 0.5 ? '#b8bb26' : '#fb4934' }}>
                    {((opponent.wins / opponent.games) * 100).toFixed(0)}% WR
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}; 