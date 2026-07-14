import { useRef, useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import AppShell from './components/shell/AppShell';
import MatchLogger from './MatchLogger';
import RecentMatches, { type RecentMatchesRef } from './RecentMatches';
import SessionStats, { type SessionStatsRef } from './SessionStats';

// Route-level code splitting: everything outside the logging homepage loads on demand.
const StatsPage = lazy(() => import('./StatsPage'));
const UserStats = lazy(() =>
  import('./components/stats/UserStats').then(m => ({ default: m.UserStats }))
);
const CharacterAnalytics = lazy(() => import('./CharacterAnalytics'));
const CharacterDetail = lazy(() => import('./CharacterDetail'));
const SessionTearsheet = lazy(() => import('./SessionTearsheet'));
const PlayerTearsheet = lazy(() => import('./PlayerTearsheet'));
const SessionHistory = lazy(() => import('./SessionHistory'));
const SessionDetail = lazy(() => import('./SessionDetail'));
const SessionComparison = lazy(() => import('./SessionComparison'));

function RouteFallback() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '50vh',
        background: 'var(--bg0, #282828)',
        color: 'var(--fg, #ebdbb2)'
      }}
    >
      Loading…
    </div>
  );
}

function NotFound() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '50vh',
        gap: '1rem',
        color: 'var(--fg, #ebdbb2)'
      }}
    >
      <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--fg-light, #fbf1c7)' }}>
        Page not found
      </div>
      <Link
        to="/"
        style={{
          textDecoration: 'none',
          padding: '0.4rem 0.75rem',
          borderRadius: 8,
          background: 'var(--blue, #83a598)',
          color: 'var(--bg0, #282828)',
          fontSize: '0.875rem',
          transition: 'all 0.2s'
        }}
      >
        Back to Game Logger
      </Link>
    </div>
  );
}

function LoggingHome() {
  const recentMatchesRef = useRef<RecentMatchesRef>(null);
  const sessionStatsRef = useRef<SessionStatsRef>(null);
  const [selectedCharacters, setSelectedCharacters] = useState<{
    shayneCharacter: string;
    mattCharacter: string;
  }>({ shayneCharacter: '', mattCharacter: '' });

  // Callback to refresh both session stats and recent matches after a match is logged
  const handleMatchLogged = () => {
    recentMatchesRef.current?.refresh();
    sessionStatsRef.current?.refresh();
  };

  // Handle character selection changes - only update if values actually changed
  const handleCharacterSelect = (shayneChar: string, mattChar: string) => {
    setSelectedCharacters(prev => {
      if (prev.shayneCharacter === shayneChar && prev.mattCharacter === mattChar) {
        return prev;
      }
      return {
        shayneCharacter: shayneChar,
        mattCharacter: mattChar
      };
    });
  };

  return (
    <div className="match-logger-pane">
      <div className="match-form-col">
        <MatchLogger 
          onMatchLogged={handleMatchLogged}
          onCharacterSelect={handleCharacterSelect}
          selectedCharacters={selectedCharacters}
        />
      </div>
      <div className="session-stats-col">
        <SessionStats 
          ref={sessionStatsRef}
          shayneCharacter={selectedCharacters.shayneCharacter}
          mattCharacter={selectedCharacters.mattCharacter}
        />
      </div>
      <div className="recent-matches-col">
        <RecentMatches ref={recentMatchesRef} />
      </div>
    </div>
  );
}

// Component to update page title based on route
function PageTitle() {
  const location = useLocation();
  
  useEffect(() => {
    const path = location.pathname;
    let title = 'Smash Match Logger';
    
    if (path === '/') {
      title = 'Session - Smash Match Logger';
    } else if (path === '/stats') {
      title = 'Statistics - Smash Match Logger';
    } else if (path.startsWith('/users/')) {
      const username = path.split('/')[2];
      title = `${username}'s Stats - Smash Match Logger`;
    } else if (path === '/characters') {
      title = 'Character Analytics - Smash Match Logger';
    } else if (path.startsWith('/characters/')) {
      const character = decodeURIComponent(path.split('/')[2]);
      title = `${character} - Smash Match Logger`;
    } else if (path === '/sessions') {
      title = 'Sessions - Smash Match Logger';
    } else if (path.startsWith('/sessions/')) {
      title = 'Session Details - Smash Match Logger';
    }
    
    document.title = title;
  }, [location]);
  
  return null;
}

function App() {
  return (
    <>
      <PageTitle />
      <AppShell>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<LoggingHome />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/users/:username" element={<UserStats />} />
            <Route path="/characters" element={<CharacterAnalytics />} />
            <Route path="/characters/:character" element={<CharacterDetail />} />
            <Route path="/sessions" element={<SessionHistory />} />
            <Route path="/sessions/compare" element={<SessionComparison />} />
            <Route path="/sessions/:session_id" element={<SessionDetail />} />
            <Route path="/session-tearsheet" element={<SessionTearsheet />} />
            <Route path="/player-tearsheet" element={<PlayerTearsheet />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </AppShell>
    </>
  );
}

export default App;
