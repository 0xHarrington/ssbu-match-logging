// Typed API client for the Session Command Center redesign.
//
// The app historically calls `fetch` inline in every component with locally
// redeclared response types. New screens go through this module instead so the
// payload shapes live in one place (src/types.ts) and errors surface uniformly.
// Paths are relative — Vite proxies /api, /log_game, /matchup_stats to Flask in
// dev, and in prod the SPA is served same-origin by Flask.

import type {
  AllTimeStats,
  CurrentSession,
  HeadToHeadStats,
  LogGamePayload,
  Match,
  MatchupStats,
  MatchUpdatePayload,
  SessionStats,
  SessionSummary,
} from '../types';

/** Thrown for any non-2xx response or network failure. */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
  } catch (err) {
    // Network-level failure (server down, offline, CORS).
    throw new ApiError(
      err instanceof Error ? err.message : 'Network request failed',
      0,
    );
  }
  if (!res.ok) {
    // Prefer a server-supplied message when the body is JSON.
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body && typeof body.message === 'string') detail = body.message;
      else if (body && typeof body.error === 'string') detail = body.error;
    } catch {
      /* non-JSON error body — keep the generic message */
    }
    throw new ApiError(detail, res.status);
  }
  return (await res.json()) as T;
}

// --- Live session ---------------------------------------------------------

export const getCurrentSession = () =>
  request<CurrentSession>('/api/sessions/current');

export const getSession = (sessionId: string) =>
  request<SessionStats>(`/api/sessions/${encodeURIComponent(sessionId)}`);

export const getSessions = () =>
  request<{ success: boolean; sessions: SessionSummary[] }>('/api/sessions').then(
    (r) => r.sessions,
  );

export const getMatches = (params: {
  sessionId?: string;
  limit?: number;
  offset?: number;
}) => {
  const q = new URLSearchParams();
  if (params.sessionId) q.set('session_id', params.sessionId);
  if (params.limit != null) q.set('limit', String(params.limit));
  if (params.offset != null) q.set('offset', String(params.offset));
  const qs = q.toString();
  return request<{ success: boolean; matches: Match[]; total: number }>(
    `/api/matches${qs ? `?${qs}` : ''}`,
  );
};

// --- Matchup / stats ------------------------------------------------------

/** All-time head-to-head for one char-vs-char pairing. Pass `recentN` to also
 *  get a windowed record (e.g. last 50) via the redesign's backend param. */
export const getMatchupStats = (
  shayneCharacter: string,
  mattCharacter: string,
  recentN?: number,
) => {
  const q = new URLSearchParams({
    shayne_character: shayneCharacter,
    matt_character: mattCharacter,
  });
  if (recentN != null) q.set('recent_n', String(recentN));
  return request<MatchupStats>(`/matchup_stats?${q.toString()}`);
};

export const getAllTimeStats = () =>
  request<{ success: boolean; stats: AllTimeStats }>('/api/stats').then(
    (r) => r.stats,
  );

export const getHeadToHead = () => request<HeadToHeadStats>('/api/head_to_head_stats');

export const getWinRateTimeline = (username: string) =>
  request<{
    success: boolean;
    data: { game_numbers: number[]; win_rates: number[]; date_ranges: string[] };
    total_games: number;
    windows: number;
  }>(`/api/users/${encodeURIComponent(username)}/win-rate-timeline`);

// --- Mutations ------------------------------------------------------------

export const logGame = (payload: LogGamePayload) =>
  request<{ success: boolean; message: string }>('/api/log_game', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const undoLastGame = () =>
  request<{ success: boolean; removed?: Match; message?: string }>(
    '/api/undo_last_game',
    { method: 'POST' },
  );

export const updateMatch = (matchId: string, payload: MatchUpdatePayload) =>
  request<{ success: boolean; match: Match }>(
    `/api/matches/${encodeURIComponent(matchId)}`,
    { method: 'PUT', body: JSON.stringify(payload) },
  );

export const deleteMatch = (matchId: string) =>
  request<{ success: boolean; removed: Match }>(
    `/api/matches/${encodeURIComponent(matchId)}`,
    { method: 'DELETE' },
  );

export const getCharacters = () =>
  request<{
    shayne: Record<string, number>;
    matt: Record<string, number>;
    all_characters: string[];
  }>('/api/characters');
