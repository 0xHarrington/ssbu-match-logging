import { useRef, useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import MatchLogger from './MatchLogger';
import RecentMatches, { type RecentMatchesRef } from './RecentMatches';
import SessionStats, { type SessionStatsRef } from './SessionStats';
import StatsPage from './StatsPage';

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

function Header() {
  const location = useLocation();
  return (
    <header className="main-header" style={{ background: 'var(--bg1, #3c3836)', padding: '0 2rem', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', position: 'sticky', top: 0, zIndex: 100 }}>
      <Link to="/" className="header-title" style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--fg-light, #fbf1c7)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        Smash Match Logger
      </Link>
      <nav style={{ display: 'flex', gap: '1rem' }}>
        <Link to="/" className={`nav-link${location.pathname === '/' ? ' active' : ''}`} style={{
          textDecoration: 'none',
          padding: '0.5rem 1rem',
          borderRadius: 12,
          transition: 'all 0.2s',
          background: location.pathname === '/' ? 'var(--blue, #83a598)' : 'none',
          color: location.pathname === '/' ? 'var(--bg0, #282828)' : 'var(--fg, #ebdbb2)'
        }}>Game Logger</Link>
        <Link to="/stats" className={`nav-link${location.pathname === '/stats' ? ' active' : ''}`} style={{
          textDecoration: 'none',
          padding: '0.5rem 1rem',
          borderRadius: 12,
          transition: 'all 0.2s',
          background: location.pathname === '/stats' ? 'var(--blue, #83a598)' : 'none',
          color: location.pathname === '/stats' ? 'var(--bg0, #282828)' : 'var(--fg, #ebdbb2)'
        }}>Statistics</Link>
      </nav>
    </header>
  );
}

function App() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg0, #282828)', color: 'var(--fg, #ebdbb2)', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <main style={{ flex: 1, width: '100%', maxWidth: 1920, margin: '0 auto' }}>
        <Routes>
          <Route path="/" element={<LoggingHome />} />
          <Route path="/stats" element={<StatsPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
