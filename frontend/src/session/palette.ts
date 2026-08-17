// Player identity helpers for the Session experience. The redesign's canonical
// accents live as CSS vars (--shayne / --matt); these expose them to inline
// styles and give the raw hex where a computed value (e.g. a glow rgba) is
// needed.
import type { Player } from '../types';

export const PLAYER_COLOR_VAR = {
  Shayne: 'var(--shayne)',
  Matt: 'var(--matt)',
} satisfies Record<Player, string>;

export const PLAYER_HEX = {
  Shayne: '#fe8019',
  Matt: '#b8bb26',
} satisfies Record<Player, string>;

/** Panel gradient + border used by the scoreboard player panels. */
export const PLAYER_PANEL = {
  Shayne: {
    bg: 'linear-gradient(160deg,#2a1c0e,#1f1712)',
    border: '#5a3410',
    glow: 'rgba(254,128,25,0.18)',
  },
  Matt: {
    bg: 'linear-gradient(160deg,#1e2410,#171f12)',
    border: '#4a5410',
    glow: 'rgba(184,187,38,0.18)',
  },
} satisfies Record<Player, { bg: string; border: string; glow: string }>;

/** Selected-state background for a player's pick button (log/edit forms). */
export const PLAYER_PICK_BG = {
  Shayne: '#2a1c0e',
  Matt: '#1e2410',
} satisfies Record<Player, string>;

export function winnerColorVar(winner: string): string {
  if (winner === 'Shayne') return PLAYER_COLOR_VAR.Shayne;
  if (winner === 'Matt') return PLAYER_COLOR_VAR.Matt;
  return 'var(--faint)';
}

/** Session-lead label + color from each player's win count.
 *  Viewer-denominated: positive lead = the home (logged-in) player ahead. */
export interface SessionLead {
  lead: number;
  label: string;
  color: string;
}

export function sessionLead(
  shayneWins: number,
  mattWins: number,
  home: Player = 'Matt',
): SessionLead {
  const away: Player = home === 'Matt' ? 'Shayne' : 'Matt';
  const homeWins = home === 'Matt' ? mattWins : shayneWins;
  const awayWins = home === 'Matt' ? shayneWins : mattWins;
  const lead = homeWins - awayWins;
  const label = lead === 0 ? 'Even' : lead > 0 ? `${home} +${lead}` : `${away} +${-lead}`;
  const color =
    lead === 0 ? 'var(--gray)' : lead > 0 ? PLAYER_COLOR_VAR[home] : PLAYER_COLOR_VAR[away];
  return { lead, label, color };
}
