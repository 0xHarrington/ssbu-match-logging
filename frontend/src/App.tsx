import React, { useRef } from 'react';
import MatchLogger from './MatchLogger';
import RecentMatches, { type RecentMatchesRef } from './RecentMatches';
import SessionStats, { type SessionStatsRef } from './SessionStats';

function App() {
  const recentMatchesRef = useRef<RecentMatchesRef>(null);
  const sessionStatsRef = useRef<SessionStatsRef>(null);

  // Callback to refresh both session stats and recent matches after a match is logged
  const handleMatchLogged = () => {
    recentMatchesRef.current?.refresh();
    sessionStatsRef.current?.refresh();
  };

  return (
    <div className="match-logger" style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', justifyContent: 'center' }}>
      <div style={{ flex: 1, minWidth: 350, maxWidth: 600 }}>
        <MatchLogger onMatchLogged={handleMatchLogged} />
      </div>
      <div style={{ flex: 1, minWidth: 350, maxWidth: 500, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <SessionStats ref={sessionStatsRef} />
        <RecentMatches ref={recentMatchesRef} />
      </div>
    </div>
  );
}

export default App;
