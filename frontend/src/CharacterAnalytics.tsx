import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, type ChartConfig } from './components/dither';
import { LoadingState, ErrorState } from './components/Feedback';
import { PageColumn, PageHeader, SectionTitle, Card, TierBadge, winRateTier } from './components/ui';
import CharToken from './session/components/CharToken';
import type { Player } from './types';

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

interface UsageChartRow {
  name: string;
  usage: number;
  games: number;
}

interface WinRateBinRow {
  range: string;
  count: number;
}

// win_rate is a PERCENT (0-100): the bins compare directly against it and it is
// rendered with a trailing "%". winRateTier() also expects a percent.
const WIN_RATE_BINS = [0, 20, 40, 50, 60, 80, 100];
const WIN_RATE_BIN_LABELS = ['0-20%', '20-40%', '40-50%', '50-60%', '60-80%', '80-100%'];

const usageChartConfig: ChartConfig = {
  usage: { label: 'Usage %', color: 'blue' },
};

const winRateDistConfig: ChartConfig = {
  count: { label: 'Characters', color: 'blue' },
};

/** Whoever uses this character more sets its token color. */
const dominantPlayer = (stats: CharacterOverviewData): Player =>
  stats.shayne_usage >= stats.matt_usage ? 'Shayne' : 'Matt';

const CharacterAnalytics: React.FC = () => {
  const [data, setData] = useState<CharactersStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'usage_rate' | 'win_rate' | 'total_games'>('win_rate');
  const [filterMinGames, setFilterMinGames] = useState(0);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/characters/overview');
      const result = await response.json();
      if (result.success) {
        setData(result);
      } else {
        setError(result.message || 'Failed to load character data');
      }
    } catch {
      setError('Failed to fetch character analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Top 15 characters by usage rate
  const usageChartData: UsageChartRow[] = data
    ? Object.entries(data.characters)
        .filter(([, stats]) => stats.total_games > 0)
        .sort((a, b) => b[1].usage_rate - a[1].usage_rate)
        .slice(0, 15)
        .map(([name, stats]) => ({
          name,
          usage: stats.usage_rate,
          games: stats.total_games,
        }))
    : [];

  // Win rate distribution across bins (last bin inclusive of 100%)
  const winRateDistData: WinRateBinRow[] = data
    ? WIN_RATE_BIN_LABELS.map((range, i) => ({
        range,
        count: Object.values(data.characters).filter(
          (stats) =>
            stats.total_games > 0 &&
            stats.win_rate >= WIN_RATE_BINS[i] &&
            (i === WIN_RATE_BIN_LABELS.length - 1
              ? stats.win_rate <= WIN_RATE_BINS[i + 1]
              : stats.win_rate < WIN_RATE_BINS[i + 1])
        ).length,
      }))
    : [];

  if (loading) return <LoadingState label="Loading character analytics…" />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;
  if (!data) return null;

  const charactersWithData = Object.entries(data.characters).filter(
    ([, stats]) => stats.total_games > 0
  );

  // Highest win rate among characters with a meaningful sample (>= 20 games).
  const winRateLeader = charactersWithData
    .filter(([, stats]) => stats.total_games >= 20)
    .sort((a, b) => b[1].win_rate - a[1].win_rate)[0];

  // Sort characters based on selected criteria, then filter by minimum games.
  const sortedCharacters = Object.entries(data.characters).sort(
    (a, b) => b[1][sortBy] - a[1][sortBy]
  );
  const activeCharacters = sortedCharacters.filter(
    ([, stats]) => stats.total_games >= filterMinGames
  );

  const sortOptions: Array<{ key: typeof sortBy; label: string }> = [
    { key: 'usage_rate', label: 'Usage' },
    { key: 'win_rate', label: 'Win rate' },
    { key: 'total_games', label: 'Games' },
  ];

  return (
    <PageColumn>
      <PageHeader
        title="Character Analytics"
        subtitle={`${data.total_matches.toLocaleString()} total matches · ${charactersWithData.length} characters with data`}
      />

      {/* Highest win rate callout + win-rate distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 20 }}>
        <div
          style={{
            background: 'linear-gradient(135deg,#2a1c0e,#1f1712)',
            border: '1px solid #5a3410',
            borderRadius: 18,
            padding: 22,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--shayne)', letterSpacing: 1, marginBottom: 10 }}>
            🏆 HIGHEST WIN RATE
          </div>
          {winRateLeader ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <CharToken
                character={winRateLeader[0]}
                player={dominantPlayer(winRateLeader[1])}
                size={54}
                radius={15}
              />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--fg-light)' }}>{winRateLeader[0]}</div>
                <div style={{ fontSize: 12, color: 'var(--gray)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                  {dominantPlayer(winRateLeader[1])} · {winRateLeader[1].total_games} games
                </div>
              </div>
              <div style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 34, fontWeight: 700, color: 'var(--shayne)' }}>
                {winRateLeader[1].win_rate}%
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--gray)' }}>Not enough games yet (min 20).</div>
          )}
        </div>

        <Card>
          <SectionTitle>Win rate distribution</SectionTitle>
          <div style={{ width: '100%', height: 200 }}>
            <BarChart data={winRateDistData} config={winRateDistConfig}>
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip labelKey="range" />
              <Bar dataKey="count" variant="gradient" />
            </BarChart>
          </div>
        </Card>
      </div>

      {/* Top 15 by usage */}
      <Card>
        <SectionTitle>Top 15 by usage</SectionTitle>
        <div style={{ width: '100%', height: 240 }}>
          <BarChart data={usageChartData} config={usageChartConfig}>
            <XAxis dataKey="name" tickFormatter={(value) => String(value).split(' ')[0]} />
            <YAxis tickFormatter={(value) => `${value}%`} />
            <Tooltip labelKey="name" />
            <Bar dataKey="usage" variant="gradient" />
          </BarChart>
        </div>
      </Card>

      {/* Controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          background: 'var(--panel)',
          border: '1px solid var(--line-2)',
          borderRadius: 14,
          padding: '12px 16px',
        }}
      >
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)', letterSpacing: '0.5px' }}>
            SORT
          </span>
          {sortOptions.map((opt) => {
            const active = sortBy === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => setSortBy(opt.key)}
                style={{
                  padding: '6px 14px',
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 999,
                  border: `1px solid ${active ? 'var(--shayne)' : 'var(--line-2)'}`,
                  background: active ? 'var(--shayne)' : 'var(--card)',
                  color: active ? 'var(--deep1)' : 'var(--fg)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  fontFamily: 'var(--font-display)',
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)', letterSpacing: '0.5px' }}>
            MIN GAMES
          </span>
          <select
            value={filterMinGames}
            onChange={(e) => setFilterMinGames(Number(e.target.value))}
            style={{
              padding: '6px 10px',
              fontSize: 12,
              borderRadius: 8,
              border: '1px solid var(--line-2)',
              background: 'var(--card)',
              color: 'var(--fg)',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
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

      {/* Roster */}
      <div>
        <SectionTitle>Roster — ranked by win rate</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 14 }}>
          {activeCharacters.map(([character, stats]) => (
            <Link
              key={character}
              to={`/characters/${encodeURIComponent(character)}`}
              style={{
                background: 'var(--panel)',
                border: '1px solid var(--line-2)',
                borderRadius: 16,
                padding: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                cursor: 'pointer',
                textDecoration: 'none',
              }}
            >
              <CharToken character={character} player={dominantPlayer(stats)} size={46} radius={13} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg-light)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {character}
                  </span>
                  <TierBadge tier={winRateTier(stats.win_rate)} />
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)', marginTop: 3 }}>
                  {stats.total_games} games
                </div>
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 22,
                  fontWeight: 700,
                  color: stats.win_rate >= 50 ? 'var(--shayne)' : 'var(--gray)',
                }}
              >
                {stats.win_rate}%
              </div>
            </Link>
          ))}
        </div>
      </div>
    </PageColumn>
  );
};

export default CharacterAnalytics;
