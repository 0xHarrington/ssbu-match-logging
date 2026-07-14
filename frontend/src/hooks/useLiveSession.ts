// useLiveSession — the data brain of the Session dashboard.
//
// Run pips, a momentum sparkline, stage splits, and the on-deck matchup's
// history aren't backed by a single endpoint. This hook chains the
// live-session routes and derives all of it client-side:
//
//   /api/sessions/current            -> session_id + is_active
//   /api/sessions/<id>               -> authoritative score + this-session matchups
//   /api/matches?session_id=<id>     -> ordered match list (pips, momentum, streak)
//   /api/sessions                    -> ordinal + duration for the meta line
//   /matchup_stats?...&recent_n=50   -> on-deck matchup all-time + last-50 record
//
// Everything is recomputed on refresh() (called after a log/edit/undo).

import { useCallback, useEffect, useState } from 'react';
import {
  getCurrentSession,
  getMatches,
  getMatchupStats,
  getSession,
  getSessions,
} from '../lib/api';
import { sessionDisplayName } from '../session/format';
import type { Match, Player, SessionSummary } from '../types';

export interface StageSplit {
  stage: string;
  games: number;
  shayneWins: number;
  mattWins: number;
}

export interface MatchupRecord {
  games: number;
  shayneWins: number;
  mattWins: number;
}

export interface OnDeckMatchup {
  shayneChar: string;
  mattChar: string;
  allTime: MatchupRecord | null;
  last50: MatchupRecord | null;
  thisSession: MatchupRecord | null;
}

export interface LiveSession {
  sessionId: string;
  isActive: boolean;
  startTime: string | null;
  /** 1-based ordinal among all sessions (oldest = #1), or null if unknown. */
  ordinal: number | null;
  displayName: string;
  durationMinutes: number;
  totalGames: number;
  shayneWins: number;
  mattWins: number;
  /** Matches newest-first (as the API returns them). */
  matches: Match[];
  /** Winner per game, oldest -> newest (newest last / rightmost). */
  runPips: Player[];
  /** Cumulative (shayneWins - mattWins) after each game, oldest -> newest.
   *  Positive = Shayne ahead. */
  momentum: number[];
  /** Current within-session win run, from the newest games backward. */
  currentRun: { player: Player; length: number } | null;
  stages: StageSplit[];
  onDeck: OnDeckMatchup | null;
}

export interface UseLiveSessionResult {
  data: LiveSession | null;
  loading: boolean;
  error: string | null;
  /** True when there is no session/games yet (distinct from an error). */
  empty: boolean;
  refresh: () => void;
}

function toPlayer(winner: string): Player | null {
  return winner === 'Shayne' || winner === 'Matt' ? winner : null;
}

function computeCurrentRun(matchesNewestFirst: Match[]): { player: Player; length: number } | null {
  let run: { player: Player; length: number } | null = null;
  for (const m of matchesNewestFirst) {
    const p = toPlayer(String(m.winner));
    if (!p) break;
    if (!run) run = { player: p, length: 1 };
    else if (run.player === p) run.length += 1;
    else break;
  }
  return run;
}

/** The server clamps `limit` to 200 (backend/app.py), so long sessions need
 *  paginated follow-up requests to get the full match list — the pips /
 *  momentum / stages / currentRun derivations below need every game, not just
 *  the newest 200, to agree with the authoritative `session.total_games`. */
async function fetchAllSessionMatches(sessionId: string): Promise<{ matches: Match[]; total: number }> {
  const first = await getMatches({ sessionId, limit: 200 });
  let matches = first.matches;
  const total = first.total;
  const maxIterations = Math.ceil(total / 200) + 1;
  let iterations = 1;
  while (matches.length < total && iterations < maxIterations) {
    const page = await getMatches({ sessionId, limit: 200, offset: matches.length });
    if (page.matches.length === 0) break; // guard: server returned nothing further
    matches = matches.concat(page.matches);
    iterations += 1;
  }
  return { matches, total };
}

function deriveStageSplits(matches: Match[]): StageSplit[] {
  const byStage = new Map<string, StageSplit>();
  for (const m of matches) {
    const stage = m.stage || 'No Stage';
    const entry = byStage.get(stage) ?? { stage, games: 0, shayneWins: 0, mattWins: 0 };
    entry.games += 1;
    if (m.winner === 'Shayne') entry.shayneWins += 1;
    else if (m.winner === 'Matt') entry.mattWins += 1;
    byStage.set(stage, entry);
  }
  return [...byStage.values()].sort((a, b) => b.games - a.games);
}

export function useLiveSession(): UseLiveSessionResult {
  const [data, setData] = useState<LiveSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [empty, setEmpty] = useState(false);
  const [nonce, setNonce] = useState(0);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const current = await getCurrentSession();
        if (!current.session_id) {
          if (!cancelled) {
            setEmpty(true);
            setData(null);
            setLoading(false);
          }
          return;
        }
        const sessionId = current.session_id;

        // Fan out the per-session reads together.
        const [session, matchesData, sessions] = await Promise.all([
          getSession(sessionId),
          fetchAllSessionMatches(sessionId),
          getSessions().catch(() => [] as SessionSummary[]),
        ]);

        const matches = matchesData.matches;
        if (matches.length === 0) {
          if (!cancelled) {
            setEmpty(true);
            setData(null);
            setLoading(false);
          }
          return;
        }

        // Oldest -> newest for pips / momentum.
        const chrono = [...matches].reverse();
        const runPips: Player[] = [];
        const momentum: number[] = [];
        let lead = 0;
        for (const m of chrono) {
          const p = toPlayer(String(m.winner));
          if (p) runPips.push(p);
          if (m.winner === 'Shayne') lead += 1;
          else if (m.winner === 'Matt') lead -= 1;
          momentum.push(lead);
        }

        // On-deck matchup = the characters in the most recent game.
        const newest = matches[0];
        const shayneChar = newest.shayne_character;
        const mattChar = newest.matt_character;

        const thisSessionMU = session.matchup_stats.find(
          (mu) => mu.shayne_character === shayneChar && mu.matt_character === mattChar,
        );

        let allTime: MatchupRecord | null = null;
        let last50: MatchupRecord | null = null;
        try {
          const mu = await getMatchupStats(shayneChar, mattChar, 50);
          allTime = {
            games: mu.total_games,
            shayneWins: mu.shayne_wins,
            mattWins: mu.matt_wins,
          };
          if (mu.recent_n) {
            last50 = {
              games: mu.recent_n.games,
              shayneWins: mu.recent_n.shayne_wins,
              mattWins: mu.recent_n.matt_wins,
            };
          }
        } catch {
          /* matchup endpoint failure is non-fatal — card just hides those columns */
        }

        const summary = sessions.find((s) => s.session_id === sessionId);
        const sorted = [...sessions].sort((a, b) => a.start_time.localeCompare(b.start_time));
        const ordinalIdx = sorted.findIndex((s) => s.session_id === sessionId);

        const live: LiveSession = {
          sessionId,
          isActive: current.is_active,
          startTime: current.start_time ?? session.start_time ?? null,
          ordinal: ordinalIdx >= 0 ? ordinalIdx + 1 : null,
          displayName: sessionDisplayName(current.start_time ?? session.start_time ?? null),
          durationMinutes: summary?.duration_minutes ?? 0,
          totalGames: session.total_games,
          shayneWins: session.shayne_wins,
          mattWins: session.matt_wins,
          matches,
          runPips,
          momentum,
          currentRun: computeCurrentRun(matches),
          stages: deriveStageSplits(matches),
          onDeck: {
            shayneChar,
            mattChar,
            allTime,
            last50,
            thisSession: thisSessionMU
              ? {
                  games: thisSessionMU.total_games,
                  shayneWins: thisSessionMU.shayne_wins,
                  mattWins: thisSessionMU.matt_wins,
                }
              : null,
          },
        };

        if (!cancelled) {
          setData(live);
          setEmpty(false);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load session');
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [nonce]);

  return { data, loading, error, empty, refresh };
}
