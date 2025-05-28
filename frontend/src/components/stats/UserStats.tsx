import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import styles from './UserStats.module.css';
import CharacterDisplay from '../CharacterDisplay';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
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

export const UserStats: React.FC = () => {
  const { username = '' } = useParams<{ username: string }>();
  const [stats, setStats] = useState<UserStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        display: true,
        color: '#ebdbb2',
        anchor: 'end' as const,
        align: 'top' as const,
        offset: 4,
        font: {
          weight: 'bold' as const,
          size: 13,
        },
        formatter: (value: number) => {
          return `${value.toFixed(1)}%`;
        },
      },
      legend: {
        position: 'top' as const,
        labels: {
          color: '#ebdbb2',
          font: {
            size: 14,
          },
        },
      },
      title: {
        display: true,
        color: '#ebdbb2',
        font: {
          size: 16,
          weight: 'bold' as const,
        },
      },
      tooltip: {
        backgroundColor: '#3c3836',
        titleColor: '#ebdbb2',
        bodyColor: '#ebdbb2',
        borderColor: '#504945',
        borderWidth: 1,
        padding: 12,
        titleFont: {
          size: 14,
          weight: 'bold' as const,
        },
        bodyFont: {
          size: 13,
        },
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
        max: 80,
        grid: {
          color: '#3c3836',
        },
        ticks: {
          color: '#ebdbb2',
          font: {
            size: 12,
          },
        },
      },
      x: {
        grid: {
          color: '#3c3836',
        },
        ticks: {
          color: '#ebdbb2',
          font: {
            size: 12,
          },
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

  const stageChartData = {
    labels: stats.stageStats.map(stat => stat.stage),
    datasets: [
      {
        label: 'Win Rate (%)',
        data: stats.stageStats.map(stat => stat.winRate),
        backgroundColor: username && username === 'Shayne' ? '#fe8019' : '#b8bb26',
        borderColor: '#282828',
        borderWidth: 1,
      },
      {
        label: 'Games Played',
        data: stats.stageStats.map(stat => (stat.totalGames / stats.totalGames) * 100),
        backgroundColor: '#83a598',
        borderColor: '#282828',
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className={styles['stats-container']}>
      <div className={styles['stats-header']}>
        <div className={styles['stats-header-content']}>
          <h1>{username}'s Performance Dashboard</h1>
          <p className={styles['stats-subtitle']}>
            Tracking performance across {stats.totalGames} matches with a{' '}
            <span className={styles['player-tag']}>{stats.overallWinRate.toFixed(1)}% Win Rate</span>
          </p>
          
          <div className={styles['stats-summary']}>
            <div className={styles['summary-item']}>
              <div className={styles['summary-label']}>Most Played</div>
              <div className={styles['summary-value']}>
                <div className={styles['character-name']}>
                  {mostPlayedChar && (
                    <>
                      <CharacterDisplay character={mostPlayedChar.character} />
                    </>
                  )}
                </div>
                <div className={styles['stat-subtitle']}>
                  {mostPlayedChar ? `${mostPlayedChar.totalGames} games` : 'N/A'}
                </div>
              </div>
            </div>
            
            <div className={styles['summary-item']}>
              <div className={styles['summary-label']}>Best Character</div>
              <div className={styles['summary-value']}>
                <div className={styles['character-name']}>
                  {bestChar && (
                    <>
                      <CharacterDisplay character={bestChar.character} />
                    </>
                  )}
                </div>
                <div className={styles['stat-subtitle']}>
                  {bestChar ? `${bestChar.winRate.toFixed(1)}% win rate` : 'N/A'}
                </div>
              </div>
            </div>

            <div className={styles['summary-item']}>
              <div className={styles['summary-label']}>Current Streak</div>
              <div className={`${styles['summary-value']} ${styles[stats.currentStreak.type || '']}`}>
                {stats.currentStreak.count} {stats.currentStreak.type}s
                <div className={styles['stat-subtitle']}>
                  Best: {stats.maxStreak.count} {stats.maxStreak.type}s
                </div>
              </div>
            </div>
            
            <div className={styles['summary-item']}>
              <div className={styles['summary-label']}>Recent Performance</div>
              <div className={`${styles['summary-value']} ${styles[trendDirection]}`}>
                {stats.recentPerformance.winRate.toFixed(1)}%
                <div className={styles['stat-subtitle']}>
                  Last {stats.recentPerformance.games} games
                </div>
              </div>
            </div>

            <div className={styles['summary-item']}>
              <div className={styles['summary-label']}>Avg Stocks Left</div>
              <div className={styles['summary-value']}>
                {stats.avgStocksWhenWinning.toFixed(3)}
                <div className={styles['stat-subtitle']}>
                  When winning
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="stats-section">
        <div className="card">
          <h2>Character Performance</h2>
          <div className="chart-container">
            <Bar data={characterChartData} options={chartOptions} height={400} />
          </div>
          <div className="stats-grid">
            {stats.characterStats.slice(0, 4).map((stat) => (
              <div key={stat.character} className="character-stat-card">
                <div className={styles['character-header']}>
                  <CharacterDisplay 
                    character={stat.character} 
                    hideText={true}
                    iconClassName={styles['character-icon']}
                  />
                  <h4>{stat.character}</h4>
                </div>
                <div className="character-stat-list">
                  <div className="character-stat-item">
                    <span className="character-stat-name">Win Rate</span>
                    <span className={`character-stat-value ${username.toLowerCase()}`}>
                      {stat.winRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="character-stat-item">
                    <span className="character-stat-name">Games Played</span>
                    <span className="character-stat-value">{stat.totalGames}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="stats-section">
        <div className="card">
          <h2>Stage Performance</h2>
          <div className="chart-container">
            <Bar data={stageChartData} options={chartOptions} height={400} />
          </div>
          <div className="stats-grid">
            {stats.stageStats.slice(0, 4).map((stat) => (
              <div key={stat.stage} className="stage-stat-card">
                <h4>{stat.stage}</h4>
                <div className="stage-stat-list">
                  <div className="stage-stat-item">
                    <span className="stage-stat-name">Win Rate</span>
                    <span className={`stage-stat-value ${username.toLowerCase()}`}>
                      {stat.winRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="stage-stat-item">
                    <span className="stage-stat-name">Games Played</span>
                    <span className="stage-stat-value">{stat.totalGames}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}; 