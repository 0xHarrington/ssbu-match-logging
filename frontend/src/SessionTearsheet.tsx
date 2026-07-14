import { useCallback, useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import html2canvas from 'html2canvas';
import CharacterDisplay from './components/CharacterDisplay';
import CharToken from './session/components/CharToken';
import { LoadingState, ErrorState } from './components/Feedback';
import { stageImages } from './lib/stages';

interface CharacterUsage {
  [character: string]: number;
}

interface StageStat {
  stage: string;
  count: number;
}

interface MatchupStat {
  shayne_character: string;
  matt_character: string;
  total_games: number;
  shayne_wins: number;
  matt_wins: number;
}

interface SessionStatsData {
  total_games: number;
  shayne_wins: number;
  matt_wins: number;
  shayne_characters: CharacterUsage;
  matt_characters: CharacterUsage;
  stage_stats: StageStat[];
  matchup_stats: MatchupStat[];
}

interface LifetimeStats {
  total_games: number;
  shayne_wins: number;
  matt_wins: number;
  shayne_win_rate: number;
  matt_win_rate: number;
}

interface HeadToHeadStats {
  recent_form: {
    last_10: { shayne_wins: number; matt_wins: number; total_games: number };
  };
  streaks: {
    current_streak: { player: string; length: number };
  };
}

interface AdvancedMetrics {
  two_stock_wins: {
    shayne: { two_stock_wins: number; two_stock_rate: number };
    matt: { two_stock_wins: number; two_stock_rate: number };
  };
  dominance_factor: {
    shayne: { three_stock_wins: number };
    matt: { three_stock_wins: number };
  };
}

interface Game {
  datetime: string;
  shayne_character: string;
  matt_character: string;
  winner: string;
  stage: string;
  stocks_remaining: number;
}

// The tearsheet card uses LITERAL hex (not CSS vars): it's a fixed shareable PNG
// artifact captured by html2canvas, and must render identically regardless of
// theme or var-resolution quirks in the capture engine.
const HEX = {
  card: '#161312',
  panel: '#1b1817',
  sub: '#221f1e',
  line: '#2a2624',
  line2: '#3c3836',
  fg: '#ebdbb2',
  fgLight: '#fbf1c7',
  dim: '#a89984',
  faint: '#665c54',
  bl: '#504945',
  shayne: '#fe8019',
  matt: '#b8bb26',
  blue: '#83a598',
  aqua: '#8ec07c',
  yellow: '#d79921',
};

function topCharacter(usage: CharacterUsage): string {
  let best = '';
  let bestN = -1;
  for (const [c, n] of Object.entries(usage)) {
    if (n > bestN) {
      bestN = n;
      best = c;
    }
  }
  return best;
}

function SessionTearsheet() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [stats, setStats] = useState<SessionStatsData | null>(null);
  const [lifetimeStats, setLifetimeStats] = useState<LifetimeStats | null>(null);
  const [headToHead, setHeadToHead] = useState<HeadToHeadStats | null>(null);
  const [advancedMetrics, setAdvancedMetrics] = useState<AdvancedMetrics | null>(null);
  const [recentGames, setRecentGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const tearsheetRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sessionStatsUrl = sessionId
        ? `/api/session_stats?session_id=${sessionId}`
        : '/api/session_stats';

      const [sessionRes, lifetimeRes, h2hRes, advRes, gamesRes] = await Promise.all([
        fetch(sessionStatsUrl),
        fetch('/api/stats'),
        fetch('/api/head_to_head_stats'),
        fetch('/api/advanced_metrics'),
        fetch('/api/recent_games'),
      ]);

      const sessionData = await sessionRes.json();
      const lifetimeData = await lifetimeRes.json();
      const h2hData = await h2hRes.json();
      const advData = await advRes.json();
      const gamesData = await gamesRes.json();

      if (!sessionData.success) throw new Error(sessionData.message || 'Failed to load session stats');
      if (!lifetimeData.success) throw new Error(lifetimeData.message || 'Failed to load lifetime stats');
      if (!h2hData.success) throw new Error(h2hData.message || 'Failed to load head-to-head stats');
      if (!advData.success) throw new Error(advData.message || 'Failed to load advanced metrics');
      if (!gamesData.success) throw new Error(gamesData.message || 'Failed to load recent games');

      setStats(sessionData);
      setLifetimeStats(lifetimeData.stats);
      setHeadToHead(h2hData);
      setAdvancedMetrics(advData);
      setRecentGames(gamesData.games);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session stats');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const generatePNG = async () => {
    if (!tearsheetRef.current) return;
    setGenerating(true);
    try {
      const canvas = await html2canvas(tearsheetRef.current, {
        backgroundColor: HEX.card,
        scale: 2,
        logging: false,
        useCORS: true,
      });
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          const date = new Date().toISOString().split('T')[0];
          link.download = `smash-session-${date}.png`;
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);
        }
      });
    } catch (err) {
      console.error('Failed to generate PNG:', err);
      alert('Failed to generate PNG. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    if (!tearsheetRef.current) return;
    setGenerating(true);
    try {
      const canvas = await html2canvas(tearsheetRef.current, {
        backgroundColor: HEX.card,
        scale: 2,
        logging: false,
        useCORS: true,
      });
      canvas.toBlob(async (blob) => {
        if (blob) {
          try {
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            alert('Session stats copied to clipboard!');
          } catch (err) {
            console.error('Failed to copy to clipboard:', err);
            alert('Failed to copy to clipboard. Try downloading instead.');
          }
        }
      });
    } catch (err) {
      console.error('Failed to generate image:', err);
      alert('Failed to generate image. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const formatTime = (datetime: string) => {
    const date = new Date(datetime);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--deep0)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <LoadingState label="Loading session stats…" />
      </div>
    );
  }

  if (error || !stats || !lifetimeStats || !headToHead || !advancedMetrics) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--deep0)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <ErrorState message={error || 'Failed to load session stats'} onRetry={fetchData} />
      </div>
    );
  }

  const getSessionDateDisplay = () => {
    if (stats && 'start_time' in stats && 'end_time' in stats) {
      const start = new Date((stats as unknown as { start_time: string }).start_time);
      const end = new Date((stats as unknown as { end_time: string }).end_time);
      const sameDay = start.toDateString() === end.toDateString();
      if (sameDay) {
        return start.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      }
      const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
      const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
      return `${startStr} → ${endStr}`;
    }
    return new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const sessionDateDisplay = getSessionDateDisplay();
  const streak = headToHead.streaks.current_streak;
  const last10 = headToHead.recent_form.last_10;
  const last10Total = last10.total_games || 1;
  const topShayne = topCharacter(stats.shayne_characters);
  const topMatt = topCharacter(stats.matt_characters);

  const mono = "'IBM Plex Mono', monospace";
  const display = "'Space Grotesk', sans-serif";
  const toolBtn = (bg: string, color: string): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 8, background: bg, border: 'none', borderRadius: 11,
    padding: '11px 18px', color, fontFamily: display, fontSize: 13, fontWeight: 700,
    cursor: generating ? 'not-allowed' : 'pointer', opacity: generating ? 0.6 : 1,
  });

  return (
    <div style={{ minHeight: '100vh', background: 'var(--deep0)', color: HEX.fg, padding: '32px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
      {/* export toolbar (excluded from capture) */}
      <div style={{ width: 800, maxWidth: '100%', display: 'flex', gap: 10 }}>
        <button onClick={copyToClipboard} disabled={generating} style={toolBtn(HEX.blue, '#1b1817')}>
          <span style={{ fontSize: 14 }}>⎘</span>{generating ? 'Generating…' : 'Copy to clipboard'}
        </button>
        <button onClick={generatePNG} disabled={generating} style={toolBtn(HEX.shayne, '#1b1817')}>
          <span style={{ fontSize: 14 }}>↓</span>{generating ? 'Generating…' : 'Download PNG'}
        </button>
        <div style={{ flex: 1 }} />
        <button onClick={() => window.close()} style={{ background: HEX.sub, border: `1px solid ${HEX.bl}`, borderRadius: 11, padding: '11px 16px', color: HEX.dim, fontFamily: display, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          Close
        </button>
      </div>

      {/* the tearsheet card (800px export frame) */}
      <div ref={tearsheetRef} style={{ width: 800, maxWidth: '100%', position: 'relative', overflow: 'hidden', background: HEX.card, border: `1px solid ${HEX.line2}`, borderRadius: 22, boxShadow: '0 30px 70px -25px rgba(0,0,0,0.7)' }}>
        <div style={{ height: 5, display: 'flex' }}>
          <div style={{ flex: 1, background: HEX.shayne }} />
          <div style={{ flex: 1, background: HEX.matt }} />
        </div>
        <div style={{ padding: '38px 40px' }}>
          {/* header lockup */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, paddingBottom: 24, borderBottom: `1px solid ${HEX.line}` }}>
            <div>
              <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: 3, color: HEX.shayne, textTransform: 'uppercase' }}>Session Tearsheet</div>
              <div style={{ fontSize: 30, fontWeight: 700, color: HEX.fgLight, letterSpacing: '-0.5px', marginTop: 8, fontFamily: display }}>Session Recap</div>
              <div style={{ fontFamily: mono, fontSize: 12, color: HEX.dim, marginTop: 4 }}>{sessionDateDisplay} · {stats.total_games} games</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <CharToken character={topShayne} player="Shayne" size={44} radius={12} />
              <span style={{ fontFamily: mono, fontSize: 13, color: HEX.faint }}>vs</span>
              <CharToken character={topMatt} player="Matt" size={44} radius={12} />
            </div>
          </div>

          {/* lifetime strip */}
          <div style={{ marginTop: 24, background: HEX.panel, border: `1px solid ${HEX.line}`, borderRadius: 16, padding: '18px 20px' }}>
            <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: 2, color: HEX.yellow, textTransform: 'uppercase', textAlign: 'center', marginBottom: 16 }}>Lifetime statistics</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr 1px 1fr', gap: 20, alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: HEX.dim, fontFamily: mono, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>All-time record</div>
                <div style={{ fontFamily: mono, fontSize: 24, fontWeight: 700 }}>
                  <span style={{ color: HEX.shayne }}>{lifetimeStats.shayne_wins}</span><span style={{ color: HEX.bl }}>–</span><span style={{ color: HEX.matt }}>{lifetimeStats.matt_wins}</span>
                </div>
                <div style={{ fontSize: 10, color: HEX.faint, fontFamily: mono, marginTop: 3 }}>{lifetimeStats.total_games.toLocaleString()} games</div>
              </div>
              <div style={{ width: 1, height: 44, background: HEX.line }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: HEX.dim, fontFamily: mono, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Win rates</div>
                <div style={{ display: 'flex', gap: 18, justifyContent: 'center' }}>
                  <div><div style={{ fontFamily: mono, fontSize: 18, fontWeight: 700, color: HEX.shayne }}>{lifetimeStats.shayne_win_rate.toFixed(1)}%</div><div style={{ fontSize: 10, color: HEX.dim }}>Shayne</div></div>
                  <div><div style={{ fontFamily: mono, fontSize: 18, fontWeight: 700, color: HEX.matt }}>{lifetimeStats.matt_win_rate.toFixed(1)}%</div><div style={{ fontSize: 10, color: HEX.dim }}>Matt</div></div>
                </div>
              </div>
              <div style={{ width: 1, height: 44, background: HEX.line }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: HEX.dim, fontFamily: mono, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Dominance wins</div>
                <div style={{ display: 'flex', gap: 18, justifyContent: 'center' }}>
                  <div><div style={{ fontFamily: mono, fontSize: 18, fontWeight: 700, color: HEX.fgLight }}>{advancedMetrics.dominance_factor.shayne.three_stock_wins}<span style={{ color: HEX.faint, fontSize: 12 }}>|</span>{advancedMetrics.dominance_factor.matt.three_stock_wins}</div><div style={{ fontSize: 10, color: HEX.dim }}>3-stock</div></div>
                  <div><div style={{ fontFamily: mono, fontSize: 18, fontWeight: 700, color: HEX.fgLight }}>{advancedMetrics.two_stock_wins.shayne.two_stock_wins}<span style={{ color: HEX.faint, fontSize: 12 }}>|</span>{advancedMetrics.two_stock_wins.matt.two_stock_wins}</div><div style={{ fontSize: 10, color: HEX.dim }}>2-stock</div></div>
                </div>
              </div>
            </div>
          </div>

          {/* tonight divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '26px 0' }}>
            <div style={{ flex: 1, height: 1, background: `linear-gradient(to right,transparent,${HEX.line2})` }} />
            <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: 2, color: '#1b1817', background: `linear-gradient(135deg,${HEX.blue},${HEX.aqua})`, padding: '6px 18px', borderRadius: 20, fontWeight: 700, textTransform: 'uppercase' }}>This session</div>
            <div style={{ flex: 1, height: 1, background: `linear-gradient(to left,transparent,${HEX.line2})` }} />
          </div>

          {/* session score + quick stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16, marginBottom: 22 }}>
            <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 18, border: `1px solid ${HEX.line2}`, background: 'linear-gradient(135deg,#221f1e,#1a1716)', padding: 24, textAlign: 'center' }}>
              <div style={{ position: 'absolute', top: '-40%', left: '-10%', width: '50%', height: '180%', background: 'radial-gradient(circle,rgba(254,128,25,0.14),transparent 62%)' }} />
              <div style={{ position: 'absolute', top: '-40%', right: '-10%', width: '50%', height: '180%', background: 'radial-gradient(circle,rgba(184,187,38,0.14),transparent 62%)' }} />
              <div style={{ position: 'relative' }}>
                <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: 2, color: HEX.dim, textTransform: 'uppercase', marginBottom: 12 }}>Session score</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 28 }}>
                  <div><div style={{ fontFamily: mono, fontSize: 56, fontWeight: 700, color: HEX.shayne, lineHeight: 1 }}>{stats.shayne_wins}</div><div style={{ fontSize: 12, color: HEX.shayne, fontWeight: 600, marginTop: 6 }}>Shayne</div></div>
                  <div style={{ fontFamily: mono, fontSize: 30, color: HEX.bl }}>–</div>
                  <div><div style={{ fontFamily: mono, fontSize: 56, fontWeight: 700, color: HEX.matt, lineHeight: 1 }}>{stats.matt_wins}</div><div style={{ fontSize: 12, color: HEX.matt, fontWeight: 600, marginTop: 6 }}>Matt</div></div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ flex: 1, background: HEX.panel, border: `1px solid ${HEX.line}`, borderRadius: 14, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 22 }}>🔥</span>
                <div><div style={{ fontFamily: mono, fontSize: 22, fontWeight: 700, color: streak.player === 'Shayne' ? HEX.shayne : HEX.matt, lineHeight: 1 }}>{streak.length}</div><div style={{ fontSize: 11, color: HEX.dim, marginTop: 3 }}>Current streak · {streak.player}</div></div>
              </div>
              <div style={{ flex: 1, background: HEX.panel, border: `1px solid ${HEX.line}`, borderRadius: 14, padding: 16 }}>
                <div style={{ fontFamily: mono, fontSize: 10, color: HEX.dim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Last 10 games</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontFamily: mono, fontSize: 18, fontWeight: 700, color: HEX.shayne }}>{last10.shayne_wins}</span>
                  <span style={{ fontFamily: mono, fontSize: 18, fontWeight: 700, color: HEX.matt }}>{last10.matt_wins}</span>
                </div>
                <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${(last10.shayne_wins / last10Total) * 100}%`, background: HEX.shayne }} />
                  <div style={{ width: `${(last10.matt_wins / last10Total) * 100}%`, background: HEX.matt }} />
                </div>
              </div>
            </div>
          </div>

          {/* tonight's matchups */}
          {stats.matchup_stats.length > 0 && (
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: HEX.fgLight, marginBottom: 12, fontFamily: display }}>This session's matchups</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {stats.matchup_stats.map((m, idx) => (
                  <div key={idx} style={{ background: HEX.panel, border: `1px solid ${HEX.line}`, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: HEX.shayne }}><CharacterDisplay character={m.shayne_character} /></span>
                        <span style={{ color: HEX.faint, fontSize: 12 }}>vs</span>
                        <span style={{ color: HEX.matt }}><CharacterDisplay character={m.matt_character} /></span>
                      </div>
                      <div style={{ fontFamily: mono, fontSize: 10, color: HEX.dim, marginTop: 2 }}>{m.total_games} {m.total_games === 1 ? 'game' : 'games'}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <span style={{ fontFamily: mono, fontSize: 20, fontWeight: 700, color: HEX.shayne }}>{m.shayne_wins}</span>
                      <span style={{ fontFamily: mono, fontSize: 14, color: HEX.bl }}>–</span>
                      <span style={{ fontFamily: mono, fontSize: 20, fontWeight: 700, color: HEX.matt }}>{m.matt_wins}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* character usage */}
          {(Object.keys(stats.shayne_characters).length > 0 || Object.keys(stats.matt_characters).length > 0) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 22 }}>
              {([['Shayne', stats.shayne_characters, HEX.shayne], ['Matt', stats.matt_characters, HEX.matt]] as const).map(([name, usage, color]) => (
                <div key={name} style={{ background: HEX.panel, border: `1px solid ${HEX.line}`, borderRadius: 14, padding: 18 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 12 }}>{name} played</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {Object.entries(usage).sort(([, a], [, b]) => b - a).slice(0, 4).map(([char, count]) => (
                      <div key={char} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 11px', background: HEX.card, borderRadius: 8 }}>
                        <span style={{ fontSize: 13, color: HEX.fg }}><CharacterDisplay character={char} /></span>
                        <span style={{ fontFamily: mono, fontSize: 15, fontWeight: 700, color }}>{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* stage breakdown */}
          {stats.stage_stats.length > 0 && (
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: HEX.fgLight, marginBottom: 12, fontFamily: display }}>Stage breakdown</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                {stats.stage_stats.slice(0, 4).map((st) => (
                  <div key={st.stage} style={{ position: 'relative', overflow: 'hidden', borderRadius: 12, border: `1px solid ${HEX.line2}`, minHeight: 88, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 12, backgroundImage: stageImages[st.stage] ? `url(${stageImages[st.stage]})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(12,10,9,0.58)' }} />
                    <div style={{ position: 'relative', fontSize: 11, color: HEX.fgLight, fontWeight: 600, textShadow: '0 2px 4px rgba(0,0,0,0.9)' }}>{st.stage}</div>
                    <div style={{ position: 'relative', fontFamily: mono, fontSize: 24, fontWeight: 700, color: HEX.blue, textShadow: '0 2px 4px rgba(0,0,0,0.9)' }}>{st.count}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* recent games */}
          {recentGames.length > 0 && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: HEX.fgLight, marginBottom: 12, fontFamily: display }}>Recent games</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recentGames.slice(0, 7).map((game, idx) => {
                  const isShayneWin = game.winner === 'Shayne';
                  const accent = isShayneWin ? HEX.shayne : HEX.matt;
                  return (
                    <div key={idx} style={{ background: HEX.panel, border: `1px solid ${HEX.line}`, borderLeft: `4px solid ${accent}`, borderRadius: 10, padding: '11px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ color: HEX.shayne }}><CharacterDisplay character={game.shayne_character} /></span>
                          <span style={{ color: HEX.faint, fontSize: 11 }}>vs</span>
                          <span style={{ color: HEX.matt }}><CharacterDisplay character={game.matt_character} /></span>
                        </div>
                        <div style={{ fontFamily: mono, fontSize: 10, color: HEX.dim, marginTop: 2 }}>{formatTime(game.datetime)} · {game.stage}</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
                        <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: accent }}>{game.winner}</span>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {[...Array(Math.max(0, game.stocks_remaining || 0))].map((_, i) => (
                            <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: accent }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* footer */}
          <div style={{ marginTop: 26, paddingTop: 18, borderTop: `1px solid ${HEX.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: HEX.fgLight, fontFamily: display }}>Smash<span style={{ color: HEX.shayne }}>Log</span></span>
            <span style={{ fontFamily: mono, fontSize: 11, color: HEX.faint }}>Smash Match Logger</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SessionTearsheet;
