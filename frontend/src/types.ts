// Shared domain types for the Session Command Center redesign.
//
// Scope note: this consolidates only the shapes the new Session/shell screens
// consume. Older pages keep their locally-declared interfaces; this is not a
// full type-consolidation sweep.

/** The two fixed players. Their string form matches the CSV `winner` column. */
export type Player = 'Shayne' | 'Matt';

/** A raw match row as returned by /api/matches, /api/recent_games, etc. */
export interface Match {
  match_id: string;
  datetime: string;
  shayne_character: string;
  matt_character: string;
  winner: Player | string;
  stage: string;
  stocks_remaining: number | string | null;
  session_id?: string;
}

/** One session summary row from /api/sessions. */
export interface SessionSummary {
  session_id: string;
  start_time: string;
  end_time: string;
  total_games: number;
  shayne_wins: number;
  matt_wins: number;
  duration_minutes: number;
}

/** /api/sessions/current — note: score is NOT included here (derive it). */
export interface CurrentSession {
  success: boolean;
  session_id: string | null;
  start_time?: string;
  game_count: number;
  is_active: boolean;
}

export interface StageStat {
  stage: string;
  count: number;
}

export interface SessionMatchupStat {
  shayne_character: string;
  matt_character: string;
  shayne_wins: number;
  matt_wins: number;
  total_games: number;
}

/** /api/sessions/<id> and /api/session_stats?session_id= */
export interface SessionStats {
  success?: boolean;
  session_id?: string;
  start_time?: string;
  end_time?: string;
  total_games: number;
  shayne_wins: number;
  matt_wins: number;
  shayne_characters: Record<string, number>;
  matt_characters: Record<string, number>;
  stage_stats: StageStat[];
  matchup_stats: SessionMatchupStat[];
}

/** /matchup_stats — all-time head-to-head for one char-vs-char pairing.
 *  `recent_n` is populated only when the recent_n query param is passed
 *  (added to the backend as part of this redesign). */
export interface MatchupStats {
  total_games: number;
  shayne_wins: number;
  matt_wins: number;
  recent_games: Array<{ datetime: string; winner: string; stocks_remaining: number | null }>;
  recent_n?: {
    n: number;
    games: number;
    shayne_wins: number;
    matt_wins: number;
  };
}

/** Subset of /api/stats used by the redesign (all-time overview). */
export interface AllTimeStats {
  total_games: number;
  shayne_wins: number;
  matt_wins: number;
  shayne_win_rate: number;
  matt_win_rate: number;
  current_streak: { player: string; length: number } | null;
  monthly_activity?: Array<{ month: string; games: number }>;
}

/** Subset of /api/head_to_head_stats used by the redesign. */
export interface HeadToHeadStats {
  recent_form: {
    last_10: { shayne_wins: number; matt_wins: number; total_games: number };
    last_20: { shayne_wins: number; matt_wins: number; total_games: number };
    last_50: { shayne_wins: number; matt_wins: number; total_games: number };
  };
  streaks: {
    current_streak: { player: string; length: number } | null;
    longest_win_streaks: Record<Player, { length: number; date: string }>;
    longest_loss_streaks: Record<Player, { length: number; date: string }>;
  };
}

/** Body accepted by POST /api/log_game. */
export interface LogGamePayload {
  shayneCharacter: string;
  mattCharacter: string;
  stage: string;
  winner: Player;
  stocksRemaining: number;
}

/** Body accepted by PUT /api/matches/<id>. */
export interface MatchUpdatePayload {
  shayneCharacter?: string;
  mattCharacter?: string;
  winner?: Player;
  stage?: string;
  stocksRemaining?: number | null;
}

/** A vision-extracted match awaiting human confirmation (plans/010 V0).
 *  Character/stage fields may be null or non-canonical when the model
 *  couldn't read them — `needsReview` lists which. */
export interface VisionPendingMatch {
  id: string;
  shayneCharacter: string | null;
  mattCharacter: string | null;
  winner: Player;
  stocksRemaining: number | null;
  stage: string | null;
  confidence: number;
  needsReview: string[];
  frameUrl: string | null;
  createdAt: number;
}

/** POST /api/vision/keyframe response. */
export interface VisionKeyframeResult {
  success: boolean;
  screenType: string;
  pendingCount: number;
  callsToday: number;
}
