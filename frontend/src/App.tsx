import React, { useRef } from 'react';
import MatchLogger from './MatchLogger';
import RecentMatches, { type RecentMatchesRef } from './RecentMatches';

function App() {
  const recentMatchesRef = useRef<RecentMatchesRef>(null);

  // Callback to refresh recent matches after a match is logged
  const handleMatchLogged = () => {
    recentMatchesRef.current?.refresh();
  };

  return (
    <div className="match-logger" style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', justifyContent: 'center' }}>
      <MatchLogger onMatchLogged={handleMatchLogged} />
      <RecentMatches ref={recentMatchesRef} />
    </div>
  );
}

export default App;
