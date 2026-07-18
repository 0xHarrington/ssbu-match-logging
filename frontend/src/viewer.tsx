// Viewer identity — who is logged in, as a Player.
//
// The whole UI is denominated around the "home" player (the logged-in user):
// their side reads first, positive momentum/lead means they're ahead, and the
// brand accent (--home / --home-soft CSS vars) takes their color. Identity
// comes from /api/me (Basic-auth username); dev and legacy shared-password
// logins fall back to Matt.
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Player } from './types';

export interface Viewer {
  /** The logged-in player — reads first everywhere. */
  home: Player;
  /** The opponent. */
  away: Player;
  username: string;
}

const DEFAULT_VIEWER: Viewer = { home: 'Matt', away: 'Shayne', username: '' };

const HOME_SOFT: Record<Player, string> = {
  Matt: 'rgba(184, 187, 38, 0.08)',
  Shayne: 'rgba(254, 128, 25, 0.08)',
};

const ViewerContext = createContext<Viewer>(DEFAULT_VIEWER);

export const useViewer = (): Viewer => useContext(ViewerContext);

export function ViewerProvider({ children }: { children: ReactNode }) {
  const [viewer, setViewer] = useState<Viewer | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/me')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: { player?: string; username?: string }) => {
        if (!active) return;
        const home: Player = data.player === 'Shayne' ? 'Shayne' : 'Matt';
        setViewer({
          home,
          away: home === 'Matt' ? 'Shayne' : 'Matt',
          username: typeof data.username === 'string' ? data.username : '',
        });
      })
      .catch(() => active && setViewer(DEFAULT_VIEWER));
    return () => {
      active = false;
    };
  }, []);

  // Repoint the viewer-relative CSS vars at the home player's colors.
  useEffect(() => {
    if (!viewer) return;
    const root = document.documentElement;
    root.style.setProperty('--home', `var(--${viewer.home.toLowerCase()})`);
    root.style.setProperty('--home-soft', HOME_SOFT[viewer.home]);
  }, [viewer]);

  // Hold rendering for the one tiny /api/me round-trip so the UI never
  // flashes the wrong player ordering.
  if (!viewer) return null;

  return <ViewerContext.Provider value={viewer}>{children}</ViewerContext.Provider>;
}
