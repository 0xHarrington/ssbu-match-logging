import React, { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import { useUser } from './App';

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

const StatsPage: React.FC = () => {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [charWinRates, setCharWinRates] = useState<CharacterWinRatesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useUser();

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const [statsRes, charRes] = await Promise.all([
          fetch('/api/stats'),
          fetch('/api/character_win_rates'),
        ]);
        const statsData = await statsRes.json();
        const charData = await charRes.json();
        if (!statsData.success) throw new Error(statsData.message || 'Failed to load stats');
        if (!charData.success) throw new Error(charData.message || 'Failed to load character win rates');
        setStats(statsData.stats);
        setCharWinRates(charData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div className="stats-container"><div>Loading...</div></div>;
  if (error) return <div className="stats-container"><div className="error">{error}</div></div>;
  if (!stats || !charWinRates) return null;

  // Prepare chart data
  const chartData = [{
    x: stats.monthly_activity.map(item => item.month),
    y: stats.monthly_activity.map(item => item.games),
    type: 'bar',
    marker: {
      color: '#458588',
      line: { color: '#3c3836', width: 1 },
    },
  }];
  const chartLayout = {
    title: {
      text: 'Games Played by Month',
      font: { color: '#ebdbb2' },
    },
    xaxis: {
      title: { text: 'Month', font: { color: '#ebdbb2', size: 14 } },
      tickfont: { color: '#ebdbb2', size: 12 },
      gridcolor: '#3c3836',
      zerolinecolor: '#3c3836',
      linecolor: '#3c3836',
      tickcolor: '#ebdbb2',
      tickmode: 'array',
      ticktext: stats.monthly_activity.map(item => {
        const [year, month] = item.month.split('-');
        const monthName = new Date(Number(year), Number(month) - 1).toLocaleString('default', { month: 'short' });
        const yearShort = year.slice(-2);
        return `${monthName}. '${yearShort}`;
      }),
      tickvals: stats.monthly_activity.map(item => item.month),
    },
    yaxis: {
      title: { text: 'Number of Games', font: { color: '#ebdbb2', size: 14 } },
      tickfont: { color: '#ebdbb2', size: 12 },
      gridcolor: '#3c3836',
      zerolinecolor: '#3c3836',
      linecolor: '#3c3836',
      tickcolor: '#ebdbb2',
    },
    paper_bgcolor: '#282828',
    plot_bgcolor: '#282828',
    font: { color: '#ebdbb2' },
    bargap: 0.2,
    bargroupgap: 0.1,
    showlegend: false,
    margin: { l: 50, r: 20, t: 50, b: 50 },
  };

  // Top 8 characters by games played for each player
  const getTop8 = (data: CharacterWinRates) =>
    Object.entries(data)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 8);

  return (
    <div className="stats-container">
      {/* Overview Section */}
      <section className="stats-section">
        <h2>Overview</h2>
        <div className="grid">
          <div className="stat-card highlight">
            <div className="stat-label">Total Games</div>
            <div className="stat-value" id="totalGames">{stats.total_games}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">{user?.username} Wins</div>
            <div className="stat-value shayne" id="shayneWins">{stats.shayne_wins}</div>
            <div className="stat-label shayne" id="shayneWinRate">{stats.shayne_win_rate}% Win Rate</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Matt Wins</div>
            <div className="stat-value matt" id="mattWins">{stats.matt_wins}</div>
            <div className="stat-label matt" id="mattWinRate">{stats.matt_win_rate}% Win Rate</div>
          </div>
        </div>
      </section>
      {/* Activity Section */}
      <section className="stats-section">
        <h2>Recent Activity</h2>
        <div className="grid">
          <div className="stat-card">
            <div className="stat-label">Last Game</div>
            <div className="stat-value" id="lastGameDate">{stats.last_game_date ? new Date(stats.last_game_date).toLocaleDateString() : '-'}</div>
            <div className="stat-label" id="gamesThisWeek">{stats.games_this_week} games this week</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Current Streak</div>
            <div className="stat-value" id="currentStreak">{stats.current_streak && stats.current_streak.length > 0 ? `${stats.current_streak.player} - ${stats.current_streak.length} games` : 'No active streak'}</div>
          </div>
        </div>
      </section>
      {/* Character Usage Section */}
      <section className="stats-section">
        <h2>Character Usage</h2>
        <div className="grid">
          <div className="stat-card">
            <div className="stat-label">Most Played (Shayne)</div>
            <div className="stat-value" id="mostPlayedShayne">{stats.most_played_shayne || '-'}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Most Played (Matt)</div>
            <div className="stat-value" id="mostPlayedMatt">{stats.most_played_matt || '-'}</div>
          </div>
        </div>
      </section>
      {/* Monthly Activity Chart */}
      <section className="stats-section">
        <h2>Games Played by Month</h2>
        <div className="card">
          <div id="weeklyActivityChart" className="chart">
            <Plot data={chartData} layout={chartLayout} config={{ displayModeBar: false, responsive: true }} style={{ width: '100%', height: 400 }} />
          </div>
        </div>
      </section>
      {/* Matchups Section */}
      <section className="stats-section">
        <h2>Top Matchups</h2>
        <div className="card">
          <div id="topMatchups" className="matchups-grid">
            {stats.top_matchups.map((matchup, i) => {
              const shayneWinRate = Math.round((matchup.shayne_wins / matchup.total_games) * 100);
              const mattWinRate = Math.round((matchup.matt_wins / matchup.total_games) * 100);
              return (
                <div className="matchup-item" key={i}>
                  <div className="matchup-header">
                    <span>{matchup.shayne_character} vs {matchup.matt_character}</span>
                    <span>{matchup.total_games} games</span>
                  </div>
                  <div className="matchup-stats">
                    <div>
                      <div>Shayne Wins</div>
                      <div className="win-count">{matchup.shayne_wins}<span className="win-percentage"> ({shayneWinRate}%)</span></div>
                      <div className="win-rate-bar">
                        <div className="win-rate-fill" style={{ width: `${(matchup.shayne_wins / matchup.total_games * 100)}%`, background: '#d65d0e' }}></div>
                      </div>
                    </div>
                    <div>
                      <div>Matt Wins</div>
                      <div className="win-count">{matchup.matt_wins}<span className="win-percentage"> ({mattWinRate}%)</span></div>
                      <div className="win-rate-bar">
                        <div className="win-rate-fill" style={{ width: `${(matchup.matt_wins / matchup.total_games * 100)}%`, background: '#98971a' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      {/* Character Win Rates Section */}
      <section className="stats-section">
        <h2>Character Win Rates</h2>
        <div className="stats-grid">
          <div className="stats-card">
            <h3>Shayne's Characters</h3>
            <div id="shayneCharacterStats" className="character-list">
              {getTop8(charWinRates.shayne).map(([character, stats]) => {
                const winRate = Math.round((stats.wins / stats.total) * 100);
                return (
                  <div className="character-stats" key={character}>
                    <div className="character-name">{character}</div>
                    <div className="stats-bar">
                      <div className="win-bar shayne" style={{ width: `${(stats.wins / stats.total) * 100}%` }}>{stats.wins}W</div>
                      <div className="loss-bar" style={{ width: `${(stats.losses / stats.total) * 100}%` }}>{stats.losses}L</div>
                    </div>
                    <div className="stats-total">
                      <span className="win-rate shayne">{winRate}% WR</span>
                      <span className="games-played">{stats.total} games</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="stats-card">
            <h3>Matt's Characters</h3>
            <div id="mattCharacterStats" className="character-list">
              {getTop8(charWinRates.matt).map(([character, stats]) => {
                const winRate = Math.round((stats.wins / stats.total) * 100);
                return (
                  <div className="character-stats" key={character}>
                    <div className="character-name">{character}</div>
                    <div className="stats-bar">
                      <div className="win-bar matt" style={{ width: `${(stats.wins / stats.total) * 100}%` }}>{stats.wins}W</div>
                      <div className="loss-bar" style={{ width: `${(stats.losses / stats.total) * 100}%` }}>{stats.losses}L</div>
                    </div>
                    <div className="stats-total">
                      <span className="win-rate matt">{winRate}% WR</span>
                      <span className="games-played">{stats.total} games</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default StatsPage; 