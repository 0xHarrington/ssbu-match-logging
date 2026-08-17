import { useEffect, useState } from 'react';

/** Subscribe to a media query; re-renders when it flips. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** The redesign switches from the desktop dashboard to the mobile app below 1220px. */
export const MOBILE_BREAKPOINT = 1220;
export const useIsMobile = () => useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
