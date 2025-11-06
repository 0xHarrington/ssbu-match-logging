import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import * as echarts from 'echarts';

interface Session {
  session_id: string;
  start_time: string;
  end_time: string;
  total_games: number;
  shayne_wins: number;
  matt_wins: number;
  duration_minutes: number;
}

interface TimelineData {
  session_id: string;
  date: string;
  datetime: string;
  games: number;
  shayne_wins: number;
  matt_wins: number;
  duration_minutes: number;
}

function SessionHistory() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterMinGames, setFilterMinGames] = useState(0);
  const [timelineData, setTimelineData] = useState<TimelineData[]>([]);
  const timelineChartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSessions();
    fetchTimeline();
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/sessions');
      const data = await res.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to load sessions');
      }
      
      setSessions(data.sessions);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeline = async () => {
    try {
      const res = await fetch('/api/sessions/timeline');
      const data = await res.json();
      
      if (data.success && data.data) {
        setTimelineData(data.data);
      }
    } catch (err) {
      console.error('Error fetching timeline:', err);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit' 
    });
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const filteredSessions = sessions.filter(s => s.total_games >= filterMinGames);

  // Calculate statistics
  const totalGames = sessions.reduce((sum, s) => sum + s.total_games, 0);
  const avgGamesPerSession = sessions.length > 0 ? (totalGames / sessions.length).toFixed(1) : 0;
  const avgDuration = sessions.length > 0 
    ? Math.round(sessions.reduce((sum, s) => sum + s.duration_minutes, 0) / sessions.length)
    : 0;

  // Timeline Chart
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
          const shayneWR = session.games > 0 ? ((session.shayne_wins / session.games) * 100).toFixed(1) : '0';
          const mattWR = session.games > 0 ? ((session.matt_wins / session.games) * 100).toFixed(1) : '0';
          
          let tooltip = `<div style="font-weight: bold; margin-bottom: 4px;">${formattedDate}</div>`;
          
          params.forEach((param: any) => {
            if (param.seriesName === 'Games') {
              tooltip += `<div style="color: #83a598;">Games: ${param.value}</div>`;
            } else if (param.seriesName === 'Trend') {
              tooltip += `<div style="color: #fabd2f;">Avg: ${param.value}</div>`;
            }
          });
          
          tooltip += `<div style="color: #fe8019;">Shayne: ${session.shayne_wins}W (${shayneWR}%)</div>` +
                     `<div style="color: #b8bb26;">Matt: ${session.matt_wins}W (${mattWR}%)</div>` +
                     `<div style="color: #a89984; font-size: 10px;">Duration: ${session.duration_minutes}min</div>`;
          
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
            color: '#83a598',
            borderRadius: [4, 4, 0, 0]
          },
          emphasis: {
            itemStyle: {
              color: '#a3c0b8'
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
      <div style={{ 
        padding: '2rem', 
        textAlign: 'center',
        color: '#a89984' 
      }}>
        Loading sessions...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        padding: '2rem', 
        textAlign: 'center',
        color: '#fb4934' 
      }}>
        Error: {error}
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '2rem',
      maxWidth: '1400px',
      margin: '0 auto'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        marginBottom: '1.5rem' 
      }}>
        <div>
          <h1 style={{ 
            fontSize: '1.5rem', 
            fontWeight: 'bold',
            color: '#fbf1c7',
            marginBottom: '0.25rem'
          }}>
            📊 Session History
          </h1>
          <p style={{ color: '#a89984', fontSize: '0.8rem' }}>
            View and analyze all your gaming sessions
          </p>
        </div>
        <Link
          to="/sessions/compare"
          style={{
            padding: '0.5rem 1rem',
            background: '#83a598',
            color: '#282828',
            border: 'none',
            borderRadius: '6px',
            fontSize: '0.8rem',
            fontWeight: 'bold',
            textDecoration: 'none',
            display: 'inline-block',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#a3c0b8';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#83a598';
            e.currentTarget.style.transform = 'none';
          }}
        >
          🔄 Compare Sessions
        </Link>
      </div>

      {/* Summary Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '0.75rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{
          background: '#3c3836',
          borderRadius: '8px',
          padding: '0.875rem',
          border: '1px solid #504945'
        }}>
          <div style={{ fontSize: '0.625rem', color: '#a89984', marginBottom: '0.375rem', textTransform: 'uppercase' }}>
            Total Sessions
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#83a598' }}>
            {sessions.length}
          </div>
        </div>

        <div style={{
          background: '#3c3836',
          borderRadius: '8px',
          padding: '0.875rem',
          border: '1px solid #504945'
        }}>
          <div style={{ fontSize: '0.625rem', color: '#a89984', marginBottom: '0.375rem', textTransform: 'uppercase' }}>
            Total Games
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#b8bb26' }}>
            {totalGames}
          </div>
        </div>

        <div style={{
          background: '#3c3836',
          borderRadius: '8px',
          padding: '0.875rem',
          border: '1px solid #504945'
        }}>
          <div style={{ fontSize: '0.625rem', color: '#a89984', marginBottom: '0.375rem', textTransform: 'uppercase' }}>
            Avg Games/Session
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fabd2f' }}>
            {avgGamesPerSession}
          </div>
        </div>

        <div style={{
          background: '#3c3836',
          borderRadius: '8px',
          padding: '0.875rem',
          border: '1px solid #504945'
        }}>
          <div style={{ fontSize: '0.625rem', color: '#a89984', marginBottom: '0.375rem', textTransform: 'uppercase' }}>
            Avg Duration
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fe8019' }}>
            {formatDuration(avgDuration)}
          </div>
        </div>
      </div>

      {/* Timeline Chart */}
      {timelineData.length > 0 && (
        <div style={{
          background: '#3c3836',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '1.5rem',
          border: '1px solid #504945',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
        }}>
          <h2 style={{ 
            fontSize: '1.2rem', 
            marginBottom: '1rem', 
            color: '#fbf1c7',
            fontWeight: 'bold'
          }}>
            📊 Session Activity Over Time
          </h2>
          <div style={{ 
            fontSize: '0.85rem', 
            color: '#a89984', 
            marginBottom: '1rem' 
          }}>
            Games played across {timelineData.length} session{timelineData.length !== 1 ? 's' : ''}
          </div>
          <div ref={timelineChartRef} style={{ height: '300px', width: '100%' }}></div>
        </div>
      )}

      {/* Filter */}
      <div style={{
        background: '#3c3836',
        borderRadius: '8px',
        padding: '0.75rem',
        marginBottom: '1.25rem',
        border: '1px solid #504945',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem'
      }}>
        <label style={{ color: '#ebdbb2', fontSize: '0.75rem' }}>
          Minimum Games:
        </label>
        <input
          type="number"
          min="0"
          value={filterMinGames}
          onChange={(e) => setFilterMinGames(parseInt(e.target.value) || 0)}
          style={{
            background: '#282828',
            border: '1px solid #504945',
            borderRadius: '4px',
            padding: '0.375rem',
            color: '#ebdbb2',
            width: '60px',
            fontSize: '0.75rem'
          }}
        />
        <span style={{ color: '#a89984', fontSize: '0.7rem' }}>
          Showing {filteredSessions.length} of {sessions.length} sessions
        </span>
      </div>

      {/* Sessions List */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '1rem'
      }}>
        {filteredSessions.map((session) => {
          const shayneWinRate = session.total_games > 0 
            ? (session.shayne_wins / session.total_games * 100).toFixed(1)
            : 0;
          const winner = session.shayne_wins > session.matt_wins ? 'Shayne' : 
                        session.matt_wins > session.shayne_wins ? 'Matt' : 'Tie';
          
          return (
            <Link
              key={session.session_id}
              to={`/sessions/${session.session_id}`}
              style={{ textDecoration: 'none' }}
            >
              <div style={{
                background: '#3c3836',
                borderRadius: '8px',
                padding: '0.875rem',
                border: '1px solid #504945',
                transition: 'all 0.2s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#504945';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#3c3836';
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = 'none';
              }}>
                {/* Date Header */}
                <div style={{ 
                  marginBottom: '0.625rem',
                  paddingBottom: '0.5rem',
                  borderBottom: '1px solid #504945'
                }}>
                  <div style={{ 
                    fontSize: '0.85rem', 
                    fontWeight: 'bold',
                    color: '#fbf1c7',
                    marginBottom: '0.125rem'
                  }}>
                    📅 {formatDate(session.start_time)}
                  </div>
                  <div style={{ 
                    fontSize: '0.7rem',
                    color: '#a89984'
                  }}>
                    {formatTime(session.start_time)} → {formatTime(session.end_time)}
                  </div>
                </div>

                {/* Game Count and Duration */}
                <div style={{
                  display: 'flex',
                  gap: '1rem',
                  marginBottom: '0.625rem'
                }}>
                  <div>
                    <div style={{ fontSize: '0.625rem', color: '#a89984', marginBottom: '0.125rem' }}>
                      Games
                    </div>
                    <div style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#83a598' }}>
                      {session.total_games}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.625rem', color: '#a89984', marginBottom: '0.125rem' }}>
                      Duration
                    </div>
                    <div style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#fabd2f' }}>
                      {formatDuration(session.duration_minutes)}
                    </div>
                  </div>
                </div>

                {/* Score */}
                <div style={{ marginBottom: '0.5rem' }}>
                  <div style={{ 
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.375rem'
                  }}>
                    <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#fe8019' }}>
                      Shayne {session.shayne_wins}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#a89984' }}>-</span>
                    <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#b8bb26' }}>
                      {session.matt_wins} Matt
                    </span>
                  </div>
                  
                  {/* Win Rate Bar */}
                  <div style={{
                    height: '4px',
                    background: '#282828',
                    borderRadius: '2px',
                    overflow: 'hidden',
                    display: 'flex'
                  }}>
                    <div style={{
                      width: `${shayneWinRate}%`,
                      background: '#fe8019'
                    }} />
                    <div style={{
                      width: `${100 - parseFloat(shayneWinRate as string)}%`,
                      background: '#b8bb26'
                    }} />
                  </div>
                </div>

                {/* Winner Badge */}
                <div style={{
                  display: 'inline-block',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '12px',
                  fontSize: '0.65rem',
                  fontWeight: 'bold',
                  background: winner === 'Tie' ? '#83a598' : winner === 'Shayne' ? '#fe8019' : '#b8bb26',
                  color: '#282828'
                }}>
                  {winner === 'Tie' ? '🤝 Tied' : `🏆 ${winner} Won`}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {filteredSessions.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '3rem',
          color: '#a89984'
        }}>
          No sessions found matching your criteria
        </div>
      )}
    </div>
  );
}

export default SessionHistory;

