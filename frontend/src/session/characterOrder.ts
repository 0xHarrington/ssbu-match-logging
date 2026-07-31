// Fighter-list ordering for the per-player character pickers.
//
// /api/characters ships all-time pick counts per player alongside the roster
// (backend fills a count for every fighter, so unplayed ones arrive as 0). The
// pickers use them to float each player's mains to the top instead of showing
// the roster in SSBU fighter-number order.
import type { Player } from '../types';

/** Pick counts keyed by character name, as returned by /api/characters. */
export type UsageCounts = Record<string, number>;

/** All-time pick counts for both players. */
export type CharacterUsage = Record<Player, UsageCounts>;

/** Neutral starting value / fetch-failure fallback: orders fall back to roster order. */
export const EMPTY_USAGE: CharacterUsage = Object.freeze({ Shayne: {}, Matt: {} });

/**
 * `roster` ordered by pick count descending. Ties — including the long tail of
 * never-played fighters, which all sit at 0 — keep the roster's own order
 * (fighter number), so the bottom of the list stays where players expect it.
 *
 * Never mutates `roster`; returns it as-is when there are no counts to apply.
 */
export function byUsage(roster: string[], usage?: UsageCounts): string[] {
  if (!usage) return roster;
  return roster
    .map((name, index) => ({ name, index, count: usage[name] ?? 0 }))
    .sort((a, b) => b.count - a.count || a.index - b.index)
    .map(({ name }) => name);
}
