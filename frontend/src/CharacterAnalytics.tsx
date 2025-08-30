import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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

  if (loading) return <div className="stats-container"><div>Loading character analytics...</div></div>;
  if (error) return <div className="stats-container"><div className="error">{error}</div></div>;
  if (!data) return null;

  // Sort characters based on selected criteria
  const sortedCharacters = Object.entries(data.characters).sort((a, b) => {
    const aVal = a[1][sortBy];
    const bVal = b[1][sortBy];
    return bVal - aVal;
  });

  // Filter characters with at least some usage
  const activeCharacters = sortedCharacters.filter(([_, stats]) => stats.total_games > 0);

  return (
    <div className="stats-container">
      <section className="stats-section">
        <h2>Character Analytics</h2>
        <p style={{ textAlign: 'center', color: 'var(--fg-light)', marginBottom: '2rem' }}>
          Comprehensive analysis across {data.total_matches} total matches
        </p>

        {/* Sort Controls */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '1rem', 
          marginBottom: '2rem',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => setSortBy('usage_rate')}
            className={`sort-button ${sortBy === 'usage_rate' ? 'active' : ''}`}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 'var(--card-radius)',
              border: '1px solid var(--bg-light)',
              background: sortBy === 'usage_rate' ? 'var(--blue)' : 'var(--bg1)',
              color: sortBy === 'usage_rate' ? 'var(--bg0)' : 'var(--fg)',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Sort by Usage
          </button>
          <button
            onClick={() => setSortBy('win_rate')}
            className={`sort-button ${sortBy === 'win_rate' ? 'active' : ''}`}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 'var(--card-radius)',
              border: '1px solid var(--bg-light)',
              background: sortBy === 'win_rate' ? 'var(--blue)' : 'var(--bg1)',
              color: sortBy === 'win_rate' ? 'var(--bg0)' : 'var(--fg)',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Sort by Win Rate
          </button>
          <button
            onClick={() => setSortBy('total_games')}
            className={`sort-button ${sortBy === 'total_games' ? 'active' : ''}`}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 'var(--card-radius)',
              border: '1px solid var(--bg-light)',
              background: sortBy === 'total_games' ? 'var(--blue)' : 'var(--bg1)',
              color: sortBy === 'total_games' ? 'var(--bg0)' : 'var(--fg)',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Sort by Games
          </button>
        </div>

        {/* Character Grid */}
        <div className="character-analytics-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '1.5rem',
          margin: '2rem 0'
        }}>
          {activeCharacters.map(([character, stats]) => (
            <Link
              key={character}
              to={`/characters/${encodeURIComponent(character)}`}
              className="character-analytics-card"
              style={{
                textDecoration: 'none',
                background: 'var(--bg1)',
                borderRadius: 'var(--card-radius)',
                padding: '1.5rem',
                border: '1px solid var(--bg-light)',
                transition: 'all 0.2s',
                display: 'block'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.15)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.75rem', 
                marginBottom: '1rem' 
              }}>
                <CharacterDisplay character={character} hideText={false} />
              </div>

              <div className="character-stats-grid" style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.75rem',
                marginBottom: '1rem'
              }}>
                <div className="stat-item">
                  <div style={{ fontSize: '0.8rem', color: 'var(--fg-light)', marginBottom: '0.25rem' }}>
                    Usage Rate
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--blue)' }}>
                    {stats.usage_rate}%
                  </div>
                </div>
                <div className="stat-item">
                  <div style={{ fontSize: '0.8rem', color: 'var(--fg-light)', marginBottom: '0.25rem' }}>
                    Win Rate
                  </div>
                  <div style={{ 
                    fontSize: '1.2rem', 
                    fontWeight: 'bold', 
                    color: stats.win_rate >= 50 ? 'var(--green)' : 'var(--red)' 
                  }}>
                    {stats.win_rate}%
                  </div>
                </div>
                <div className="stat-item">
                  <div style={{ fontSize: '0.8rem', color: 'var(--fg-light)', marginBottom: '0.25rem' }}>
                    Total Games
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--fg)' }}>
                    {stats.total_games}
                  </div>
                </div>
                <div className="stat-item">
                  <div style={{ fontSize: '0.8rem', color: 'var(--fg-light)', marginBottom: '0.25rem' }}>
                    Total Wins
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--fg)' }}>
                    {stats.wins}
                  </div>
                </div>
              </div>

              {/* Player Usage Breakdown */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                fontSize: '0.85rem',
                color: 'var(--fg-light)',
                borderTop: '1px solid var(--bg-light)',
                paddingTop: '0.75rem'
              }}>
                <span>Shayne: {stats.shayne_usage} games</span>
                <span>Matt: {stats.matt_usage} games</span>
              </div>
            </Link>
          ))}
        </div>

        {/* Summary Stats */}
        <div className="summary-section" style={{
          background: 'var(--bg2)',
          borderRadius: 'var(--card-radius)',
          padding: '1.5rem',
          border: '1px solid var(--bg-light)',
          marginTop: '2rem'
        }}>
          <h3 style={{ textAlign: 'center', marginBottom: '1rem' }}>Summary</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--blue)' }}>
                {activeCharacters.length}
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--fg-light)' }}>
                Characters Played
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--green)' }}>
                {Math.round(activeCharacters.reduce((sum, [_, stats]) => sum + stats.win_rate, 0) / activeCharacters.length)}%
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--fg-light)' }}>
                Average Win Rate
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--orange)' }}>
                {activeCharacters[0]?.[0] || 'N/A'}
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--fg-light)' }}>
                Most Used Character
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CharacterAnalytics;
