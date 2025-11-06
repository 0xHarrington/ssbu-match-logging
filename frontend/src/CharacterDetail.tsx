import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import * as echarts from 'echarts';
import CharacterDisplay from './components/CharacterDisplay';
import { PerformanceHeatmap } from './components/PerformanceHeatmap';

// Import stage images
import bfImage from './assets/stages/bf.avif';
import fdImage from './assets/stages/fd.avif';
import ps2Image from './assets/stages/ps2.avif';
import sbfImage from './assets/stages/sbf.avif';
import tncImage from './assets/stages/tnc.avif';
import kalosImage from './assets/stages/kalos.avif';
import hollowImage from './assets/stages/hollow.avif';
import yoshisImage from './assets/stages/yoshis.avif';
import smashvilleImage from './assets/stages/smashville.avif';

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

interface MatchupData {
  opponent: string;
  games: number;
  wins: number;
  losses: number;
  win_rate: number;
}

interface StagePerformance {
  stage: string;
  games: number;
  wins: number;
  win_rate: number;
}

interface PlayerStats {
  games: number;
  wins: number;
  win_rate: number;
}

interface RecentPerformance {
  games: number;
  wins: number;
  win_rate: number;
}

interface CharacterStatsData {
  success: boolean;
  character: string;
  total_games: number;
  global_win_rate: number;
  shayne_stats: PlayerStats;
  matt_stats: PlayerStats;
  best_matchups: MatchupData[];
  worst_matchups: MatchupData[];
  stage_performance: StagePerformance[];
  recent_performance: RecentPerformance;
  shayne_matchups: MatchupData[];
  matt_matchups: MatchupData[];
}

interface TimelineData {
  session_id: string;
  date: string;
  datetime: string;
  games: number;
}

const CharacterDetail: React.FC = () => {
  const { character } = useParams<{ character: string }>();
  const [data, setData] = useState<CharacterStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [heatmapData, setHeatmapData] = useState<any>(null);
  const [usingSimulatedHeatmap, setUsingSimulatedHeatmap] = useState(false);
  const [timelineData, setTimelineData] = useState<TimelineData[]>([]);
  const matchupRadarRef = useRef<HTMLDivElement>(null);
  const playerComparisonRef = useRef<HTMLDivElement>(null);
  const heatmapRef = useRef<HTMLDivElement>(null);
  const timelineChartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!character) return;

    const fetchData = async () => {
      try {
        const response = await fetch(`/api/characters/${encodeURIComponent(character)}/stats`);
        const result = await response.json();
        if (result.success) {
          setData(result);
        } else {
          setError(result.message || 'Failed to load character data');
        }
      } catch (err) {
        setError('Failed to fetch character details');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [character]);

  // Fetch heatmap data
  useEffect(() => {
    if (!character) return;

    const fetchHeatmapData = async () => {
      try {
        const response = await fetch(`/api/characters/${encodeURIComponent(character)}/heatmap`);
        const result = await response.json();
        
        if (result.success && result.data && result.data.length > 0) {
          setHeatmapData(result.data);
          setUsingSimulatedHeatmap(false);
        } else {
          setUsingSimulatedHeatmap(true);
        }
      } catch (err) {
        console.error('Error fetching heatmap data:', err);
        setUsingSimulatedHeatmap(true);
      }
    };

    fetchHeatmapData();
  }, [character]);

  // Fetch timeline data
  useEffect(() => {
    if (!character) return;

    const fetchTimelineData = async () => {
      try {
        const response = await fetch(`/api/characters/${encodeURIComponent(character)}/timeline`);
        const result = await response.json();
        
        if (result.success && result.data) {
          setTimelineData(result.data);
        }
      } catch (err) {
        console.error('Error fetching timeline data:', err);
      }
    };

    fetchTimelineData();
  }, [character]);

  // ECharts visualizations
  useEffect(() => {
    if (!data) return;

    // Top Matchups Bar Chart - Only matchups with 12+ games
    if (matchupRadarRef.current) {
      const chart = echarts.init(matchupRadarRef.current);
      
      // Combine all matchups and filter for 12+ games
      const allMatchups = [
        ...data.best_matchups.filter(m => m.games >= 12),
        ...data.worst_matchups.filter(m => m.games >= 12)
      ];
      
      // Remove duplicates and sort by total games
      const uniqueMatchups = Array.from(
        new Map(allMatchups.map(m => [m.opponent, m])).values()
      ).sort((a, b) => b.games - a.games).slice(0, 10);
      
      if (uniqueMatchups.length === 0) {
        // Show message if no significant matchups
        chart.setOption({
          backgroundColor: 'transparent',
          title: {
            text: 'Not enough data\n(12+ games needed per matchup)',
            left: 'center',
            top: 'center',
            textStyle: {
              color: '#a89984',
              fontSize: 12,
              fontStyle: 'italic'
            }
          }
        });
      } else {
        chart.setOption({
          backgroundColor: 'transparent',
          tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            backgroundColor: '#3c3836',
            borderColor: '#504945',
            borderWidth: 2,
            textStyle: { color: '#ebdbb2', fontSize: 11 },
            formatter: (params: any) => {
              const matchup = uniqueMatchups[params[0].dataIndex];
              return `<div style="font-weight: bold; margin-bottom: 4px;">${matchup.opponent}</div>` +
                     `<div style="color: ${matchup.win_rate >= 50 ? '#b8bb26' : '#fb4934'};">Win Rate: ${Math.round(matchup.win_rate)}%</div>` +
                     `<div style="color: #a89984; font-size: 10px;">Record: ${matchup.wins}W-${matchup.losses}L</div>` +
                     `<div style="color: #83a598; font-size: 10px;">${matchup.games} games played</div>`;
            }
          },
          grid: { 
            left: '20%', 
            right: '8%', 
            top: '5%', 
            bottom: '5%', 
            containLabel: false
          },
          xAxis: {
            type: 'value',
            max: 100,
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: { 
              color: '#a89984',
              fontSize: 9,
              formatter: '{value}%'
            },
            splitLine: {
              lineStyle: { color: '#3c3836', type: 'dashed' } 
            }
          },
          yAxis: {
            type: 'category',
            data: uniqueMatchups.map(m => m.opponent),
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: { 
              color: '#ebdbb2', 
              fontSize: 10,
              fontWeight: 500
            },
            inverse: true
          },
          series: [{
            type: 'bar',
            data: uniqueMatchups.map(matchup => ({
              value: matchup.win_rate,
              itemStyle: {
                color: matchup.win_rate >= 60 ? '#b8bb26' : 
                       matchup.win_rate >= 50 ? '#83a598' : 
                       matchup.win_rate >= 40 ? '#fe8019' : '#fb4934',
                borderRadius: [0, 4, 4, 0]
              }
            })),
            barMaxWidth: 20,
            label: {
              show: true,
              position: 'right',
              formatter: (params: any) => {
                const matchup = uniqueMatchups[params.dataIndex];
                return `${Math.round(matchup.win_rate)}% (${matchup.games}g)`;
              },
              color: '#ebdbb2',
              fontSize: 10,
              fontWeight: 'bold'
            },
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
              }
          }]
        });
      }

      return () => chart.dispose();
    }
  }, [data]);

  useEffect(() => {
    if (!data) return;

    // Player Comparison Chart
    if (playerComparisonRef.current) {
      const chart = echarts.init(playerComparisonRef.current);

      chart.setOption({
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          backgroundColor: '#3c3836',
          borderColor: '#504945',
          textStyle: { color: '#ebdbb2' }
        },
        legend: {
          data: ['Shayne', 'Matt'],
          textStyle: { color: '#a89984' },
          top: 0
        },
        grid: { left: '8%', right: '4%', top: '15%', bottom: '10%', containLabel: true },
        xAxis: {
          type: 'category',
          data: ['Games', 'Wins', 'Win Rate'],
          axisLine: { lineStyle: { color: '#504945' } },
          axisLabel: { color: '#a89984', fontSize: 10 }
        },
        yAxis: {
          type: 'value',
          axisLine: { lineStyle: { color: '#504945' } },
          axisLabel: { color: '#a89984', fontSize: 10 },
          splitLine: { lineStyle: { color: '#3c3836', type: 'dashed' } }
        },
        series: [
          {
            name: 'Shayne',
            type: 'bar',
            data: [data.shayne_stats.games, data.shayne_stats.wins, data.shayne_stats.win_rate],
            itemStyle: { color: '#fe8019' }
          },
          {
            name: 'Matt',
            type: 'bar',
            data: [data.matt_stats.games, data.matt_stats.wins, data.matt_stats.win_rate],
            itemStyle: { color: '#b8bb26' }
          }
        ]
      });

      return () => chart.dispose();
    }
  }, [data]);


  // Timeline Chart - Games per session
  useEffect(() => {
    if (!timelineData || timelineData.length === 0) return;
    if (!timelineChartRef.current) return;

    const chart = echarts.init(timelineChartRef.current);

    // Format dates for display
    const dates = timelineData.map(d => {
      const date = new Date(d.datetime);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    const games = timelineData.map(d => d.games);

    // Calculate rolling average (window of 5 sessions)
    const rollingAvg: number[] = [];
    const window = Math.min(5, Math.ceil(timelineData.length / 10)); // Adaptive window
    for (let i = 0; i < games.length; i++) {
      const start = Math.max(0, i - Math.floor(window / 2));
      const end = Math.min(games.length, i + Math.ceil(window / 2));
      const slice = games.slice(start, end);
      const avg = slice.reduce((sum, val) => sum + val, 0) / slice.length;
      rollingAvg.push(parseFloat(avg.toFixed(1)));
    }
      
      chart.setOption({
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'axis',
        axisPointer: { type: 'cross' },
          backgroundColor: '#3c3836',
          borderColor: '#504945',
        borderWidth: 2,
          textStyle: { color: '#ebdbb2', fontSize: 11 },
          formatter: (params: any) => {
          const dataIndex = params[0].dataIndex;
          const session = timelineData[dataIndex];
          const date = new Date(session.datetime);
          const formattedDate = date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
          });
          let tooltip = `<div style="font-weight: bold; margin-bottom: 4px;">${formattedDate}</div>`;
          
          params.forEach((param: any) => {
            if (param.seriesName === 'Games') {
              tooltip += `<div style="color: #689d6a;">Games: ${param.value}</div>`;
            } else if (param.seriesName === 'Trend') {
              tooltip += `<div style="color: #fabd2f;">Avg: ${param.value}</div>`;
            }
          });
          
          tooltip += `<div style="color: #a89984; font-size: 10px;">Session ${session.session_id}</div>`;
          return tooltip;
        }
      },
      legend: {
        data: ['Games', 'Trend'],
        textStyle: { color: '#a89984', fontSize: 11 },
        top: 0,
        right: '8%'
      },
        grid: { 
        left: '8%', 
          right: '8%', 
        top: '15%', 
        bottom: timelineData.length > 20 ? '20%' : '15%',
          containLabel: true 
        },
        xAxis: {
        type: 'category',
        data: dates,
        axisLine: { lineStyle: { color: '#504945', width: 2 } },
          axisLabel: { 
            color: '#a89984', 
            fontSize: 9,
          rotate: timelineData.length > 20 ? 45 : 0,
          interval: timelineData.length > 30 ? Math.floor(timelineData.length / 20) : 0
          },
        axisTick: { lineStyle: { color: '#504945' } }
        },
        yAxis: {
        type: 'value',
        axisLine: { show: true, lineStyle: { color: '#504945', width: 2 } },
        axisLabel: { color: '#a89984', fontSize: 10 },
        splitLine: { lineStyle: { color: '#3c3836', type: 'dashed' } }
      },
      series: [
        {
          name: 'Games',
          data: games,
          type: 'bar',
            itemStyle: {
            color: '#689d6a',
            borderRadius: [4, 4, 0, 0]
          },
          emphasis: {
            itemStyle: {
              color: '#8ec07c'
            }
          },
          barWidth: '60%',
          animationDelay: (idx: number) => idx * 20
        },
        {
          name: 'Trend',
          data: rollingAvg,
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: {
            color: '#fabd2f',
            width: 3
          },
          itemStyle: {
            color: '#fabd2f',
            borderColor: '#d79921',
            borderWidth: 2
          },
          emphasis: {
            itemStyle: {
              color: '#fabd2f',
              borderColor: '#d79921',
              borderWidth: 3,
              shadowBlur: 10,
              shadowColor: 'rgba(250, 189, 47, 0.5)'
            }
          },
          z: 10
        }
      ]
      });

      return () => chart.dispose();
  }, [timelineData]);

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
          Loading character details...
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
  
  if (!data || !character) return null;

  return (
    <div className="stats-container" style={{ 
      maxWidth: '1400px', 
      padding: '1.5rem',
      margin: '0 auto'
    }}>
      {/* Navigation */}
      <div style={{ marginBottom: '1rem' }}>
        <Link 
          to="/characters" 
          style={{ 
            color: '#83a598', 
          textDecoration: 'none', 
            fontSize: '0.9rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            background: '#3c3836',
            borderRadius: '8px',
            border: '1px solid #504945',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#504945';
            e.currentTarget.style.transform = 'translateX(-4px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#3c3836';
            e.currentTarget.style.transform = 'none';
          }}
        >
          ← Back to Characters
        </Link>
      </div>

      {/* Hero Header */}
      <div style={{
        background: 'linear-gradient(135deg, #3c3836 0%, #282828 100%)',
        borderRadius: '16px',
        padding: '2rem',
        border: '1px solid #504945',
        marginBottom: '1.5rem',
        textAlign: 'center',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          gap: '1rem', 
          marginBottom: '1.5rem' 
        }}>
          <CharacterDisplay character={character} hideText={false} />
        </div>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '1.5rem',
          marginTop: '1.5rem'
        }}>
          <div>
            <div style={{ 
              fontSize: '0.7rem', 
              color: '#a89984', 
              marginBottom: '0.5rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Total Games
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#83a598' }}>
              {data.total_games}
            </div>
          </div>
          <div>
            <div style={{ 
              fontSize: '0.7rem', 
              color: '#a89984', 
              marginBottom: '0.5rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Overall Win Rate
            </div>
            <div style={{ 
              fontSize: '2rem', 
              fontWeight: 'bold', 
              color: data.global_win_rate >= 50 ? '#b8bb26' : '#fb4934' 
            }}>
              {data.global_win_rate}%
            </div>
          </div>
          <div>
            <div style={{ 
              fontSize: '0.7rem', 
              color: '#a89984', 
              marginBottom: '0.5rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Recent Form
            </div>
            <div style={{ 
              fontSize: '2rem', 
              fontWeight: 'bold', 
              color: data.recent_performance.win_rate >= 50 ? '#b8bb26' : '#fb4934' 
            }}>
              {Math.round(data.recent_performance.win_rate)}%
            </div>
            <div style={{ fontSize: '0.7rem', color: '#a89984', marginTop: '0.25rem' }}>
              Last {data.recent_performance.games} games
            </div>
          </div>
        </div>
      </div>

      {/* Visualizations Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        <div className="card" style={{ padding: '1rem' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: '#fbf1c7' }}>📊 Player Comparison</h3>
          <div ref={playerComparisonRef} style={{ height: '220px', width: '100%' }}></div>
        </div>
        <div className="card" style={{ padding: '1rem' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: '#fbf1c7' }}>🎯 Top Matchups</h3>
          <div ref={matchupRadarRef} style={{ height: '220px', width: '100%' }}></div>
        </div>
      </div>

      {/* Performance Heatmap */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: '#fbf1c7', textAlign: 'center' }}>
          🔥 Performance by Time of Day
          {usingSimulatedHeatmap && (
            <span style={{ fontSize: '0.7rem', color: '#fabd2f', marginLeft: '0.5rem', fontWeight: 'normal' }}>
              ⚠️ Using simulated data
            </span>
          )}
        </h3>
        <div style={{ fontSize: '0.7rem', color: '#a89984', marginBottom: '0.5rem', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <span>Color = Win Rate (🔴 Low → 🟡 Mid → 🟢 High)</span>
          <span>Brightness = Games Played (Darker = Fewer, Brighter = More)</span>
        </div>
        <PerformanceHeatmap 
          data={heatmapData}
          usingSimulatedData={usingSimulatedHeatmap}
          character={character}
          height="260px"
        />
      </div>

      {/* Player Stats & Stage Performance - Side by Side Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Player Performance Card */}
        <div className="card" style={{ padding: '1rem' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>👥 Player Performance</h2>
          
          {/* Shayne Stats */}
          <div style={{
            background: '#32302f',
            borderRadius: '8px',
            padding: '0.75rem',
            marginBottom: '0.5rem',
            border: '2px solid #fe8019'
          }}>
            <div style={{ 
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.5rem'
            }}>
              <h3 style={{ 
                color: '#fe8019', 
                fontSize: '0.85rem',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                margin: 0
              }}>
                Shayne
              </h3>
              <div style={{ 
                fontSize: '1.5rem', 
                fontWeight: 'bold', 
                color: data.shayne_stats.win_rate >= 50 ? '#b8bb26' : '#fb4934'
              }}>
                {Math.round(data.shayne_stats.win_rate)}%
              </div>
            </div>
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '0.5rem',
              fontSize: '0.75rem'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#ebdbb2' }}>
                  {data.shayne_stats.games}
                </div>
                <div style={{ fontSize: '0.6rem', color: '#a89984', textTransform: 'uppercase' }}>
                  Games
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#b8bb26' }}>
                  {data.shayne_stats.wins}
                </div>
                <div style={{ fontSize: '0.6rem', color: '#a89984', textTransform: 'uppercase' }}>
                  Wins
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#fb4934' }}>
                  {data.shayne_stats.games - data.shayne_stats.wins}
                </div>
                <div style={{ fontSize: '0.6rem', color: '#a89984', textTransform: 'uppercase' }}>
                  Losses
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#83a598' }}>
                  {(() => {
                    const diff = data.shayne_stats.wins - (data.shayne_stats.games - data.shayne_stats.wins);
                    return diff > 0 ? `+${diff}` : diff;
                  })()}
                </div>
                <div style={{ fontSize: '0.6rem', color: '#a89984', textTransform: 'uppercase' }}>
                  Diff
                </div>
              </div>
            </div>
          </div>

          {/* Matt Stats */}
          <div style={{
            background: '#32302f',
            borderRadius: '8px',
            padding: '0.75rem',
            border: '2px solid #b8bb26'
          }}>
            <div style={{ 
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.5rem'
            }}>
              <h3 style={{ 
                color: '#b8bb26', 
                fontSize: '0.85rem',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                margin: 0
              }}>
                Matt
              </h3>
              <div style={{ 
                fontSize: '1.5rem', 
                fontWeight: 'bold', 
                color: data.matt_stats.win_rate >= 50 ? '#b8bb26' : '#fb4934'
              }}>
                {Math.round(data.matt_stats.win_rate)}%
              </div>
            </div>
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '0.5rem',
              fontSize: '0.75rem'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#ebdbb2' }}>
                  {data.matt_stats.games}
                </div>
                <div style={{ fontSize: '0.6rem', color: '#a89984', textTransform: 'uppercase' }}>
                  Games
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#b8bb26' }}>
                  {data.matt_stats.wins}
                </div>
                <div style={{ fontSize: '0.6rem', color: '#a89984', textTransform: 'uppercase' }}>
                  Wins
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#fb4934' }}>
                  {data.matt_stats.games - data.matt_stats.wins}
                </div>
                <div style={{ fontSize: '0.6rem', color: '#a89984', textTransform: 'uppercase' }}>
                  Losses
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#83a598' }}>
                  {(() => {
                    const diff = data.matt_stats.wins - (data.matt_stats.games - data.matt_stats.wins);
                    return diff > 0 ? `+${diff}` : diff;
                  })()}
                </div>
                <div style={{ fontSize: '0.6rem', color: '#a89984', textTransform: 'uppercase' }}>
                  Diff
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stage Performance Card */}
        {data.stage_performance.length > 0 && (
          <div className="card" style={{ padding: '1rem' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>🎯 Stage Performance</h2>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(3, 1fr)', 
              gap: '0.75rem' 
            }}>
              {data.stage_performance
                .filter(stage => stage.stage !== 'No Stage' && stage.stage !== 'Northern Cave')
                .sort((a, b) => b.win_rate - a.win_rate)
                .slice(0, 9)
                .map(stage => {
                const winRate = Math.round(stage.win_rate);
                const color = winRate >= 60 ? '#b8bb26' : 
                             winRate >= 50 ? '#83a598' : 
                             winRate >= 40 ? '#fe8019' : '#fb4934';
                
                return (
                  <div 
                    key={stage.stage}
                    style={{
                      backgroundImage: stageImages[stage.stage] ? `url(${stageImages[stage.stage]})` : 'none',
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
                      transition: 'all 0.2s'
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
                      {stage.stage}
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
                        {stage.wins}W-{stage.games - stage.wins}L ({stage.games}g)
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Usage Timeline */}
      {timelineData.length > 0 && (
        <div className="card" style={{ 
          padding: '1.5rem', 
          marginBottom: '1.5rem',
          background: '#3c3836',
          borderRadius: '12px',
          border: '1px solid #504945',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
        }}>
          <h2 style={{ 
            fontSize: '1.2rem', 
            marginBottom: '1rem', 
            color: '#fbf1c7',
            fontWeight: 'bold'
          }}>
            📈 Usage Over Time
          </h2>
          <div style={{ 
            fontSize: '0.85rem', 
            color: '#a89984', 
            marginBottom: '1rem' 
          }}>
            Games played with {character} across {timelineData.length} session{timelineData.length !== 1 ? 's' : ''}
          </div>
          <div ref={timelineChartRef} style={{ height: '300px', width: '100%' }}></div>
        </div>
      )}

      {/* Matchups - Enhanced Side by Side */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '1rem'
      }}>
        {/* Best Matchups */}
        <div style={{
          background: '#3c3836',
          borderRadius: '12px',
          padding: '1.25rem',
          border: '1px solid #504945',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
        }}>
          <h3 style={{ 
            color: '#b8bb26', 
            marginBottom: '0.75rem', 
            fontSize: '1.1rem',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            ✅ Best Matchups
          </h3>
          <div style={{ 
            fontSize: '0.7rem', 
            color: '#a89984', 
            marginBottom: '1rem',
            padding: '0.5rem',
            background: '#282828',
            borderRadius: '6px',
            textAlign: 'center'
          }}>
            Minimum 12 games required
          </div>
          {data.best_matchups.filter(m => m.games >= 12).length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {data.best_matchups.filter(m => m.games >= 12).slice(0, 5).map((matchup) => (
                <div key={matchup.opponent} style={{
                  background: '#282828',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  border: '1px solid #3c3836',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#3c3836';
                  e.currentTarget.style.borderColor = '#b8bb26';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#282828';
                  e.currentTarget.style.borderColor = '#3c3836';
                }}>
                  <CharacterDisplay character={matchup.opponent} />
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ 
                      fontSize: '1.2rem', 
                      fontWeight: 'bold', 
                      color: '#b8bb26',
                      marginBottom: '0.25rem'
                    }}>
                      {Math.round(matchup.win_rate)}%
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#a89984' }}>
                      {matchup.wins}W-{matchup.losses}L ({matchup.games}g)
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ 
              color: '#a89984', 
              fontStyle: 'italic', 
              fontSize: '0.85rem',
              textAlign: 'center',
              padding: '2rem 1rem',
              background: '#282828',
              borderRadius: '8px'
            }}>
              Not enough data yet<br/>
              <span style={{ fontSize: '0.75rem' }}>(need 12+ games per matchup)</span>
            </div>
          )}
        </div>

        {/* Worst Matchups */}
        <div style={{
          background: '#3c3836',
          borderRadius: '12px',
          padding: '1.25rem',
          border: '1px solid #504945',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
        }}>
          <h3 style={{ 
            color: '#fb4934', 
            marginBottom: '0.75rem', 
            fontSize: '1.1rem',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            ⚠️ Tough Matchups
          </h3>
          <div style={{ 
            fontSize: '0.7rem', 
            color: '#a89984', 
            marginBottom: '1rem',
            padding: '0.5rem',
            background: '#282828',
            borderRadius: '6px',
            textAlign: 'center'
          }}>
            Minimum 12 games required
          </div>
          {data.worst_matchups.filter(m => m.games >= 12).length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {data.worst_matchups.filter(m => m.games >= 12).slice(0, 5).map((matchup) => (
                <div key={matchup.opponent} style={{
                  background: '#282828',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  border: '1px solid #3c3836',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#3c3836';
                  e.currentTarget.style.borderColor = '#fb4934';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#282828';
                  e.currentTarget.style.borderColor = '#3c3836';
                }}>
                  <CharacterDisplay character={matchup.opponent} />
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ 
                      fontSize: '1.2rem', 
                      fontWeight: 'bold', 
                      color: '#fb4934',
                      marginBottom: '0.25rem'
                    }}>
                      {Math.round(matchup.win_rate)}%
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#a89984' }}>
                      {matchup.wins}W-{matchup.losses}L ({matchup.games}g)
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ 
              color: '#a89984', 
              fontStyle: 'italic', 
              fontSize: '0.85rem',
              textAlign: 'center',
              padding: '2rem 1rem',
              background: '#282828',
              borderRadius: '8px'
            }}>
              Not enough data yet<br/>
              <span style={{ fontSize: '0.75rem' }}>(need 12+ games per matchup)</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CharacterDetail;
