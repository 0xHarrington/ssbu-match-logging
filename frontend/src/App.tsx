import { useRef, useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import MatchLogger from './MatchLogger';
import RecentMatches, { type RecentMatchesRef } from './RecentMatches';
import SessionStats, { type SessionStatsRef } from './SessionStats';
import StatsPage from './StatsPage';
import { UserStats } from './components/stats/UserStats';
import CharacterAnalytics from './CharacterAnalytics';
import CharacterDetail from './CharacterDetail';
import SessionTearsheet from './SessionTearsheet';
import SessionHistory from './SessionHistory';
import SessionDetail from './SessionDetail';
import SessionComparison from './SessionComparison';

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
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { to: '/', label: 'Game Logger', match: (path: string) => path === '/' },
    { to: '/stats', label: 'Statistics', match: (path: string) => path === '/stats' },
    { to: '/users/Shayne', label: "Shayne's Stats", match: (path: string) => path === '/users/Shayne' },
    { to: '/users/Matt', label: "Matt's Stats", match: (path: string) => path === '/users/Matt' },
    { to: '/characters', label: 'Character Analytics', match: (path: string) => path === '/characters' },
    { to: '/sessions', label: 'Sessions', match: (path: string) => path.startsWith('/sessions') },
  ];

  const NavLink = ({ to, label, match, mobile = false }: { to: string; label: string; match: (path: string) => boolean; mobile?: boolean }) => {
    const isActive = match(location.pathname);
    const [isHovered, setIsHovered] = useState(false);

    return (
      <Link
        to={to}
        onClick={() => mobile && setMenuOpen(false)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          textDecoration: 'none',
          padding: mobile ? '0.75rem 1rem' : 'clamp(0.35rem, 1vw, 0.5rem) clamp(0.5rem, 1.5vw, 1rem)',
          borderRadius: mobile ? 8 : 12,
          transition: 'all 0.2s',
          background: isActive ? 'var(--blue, #83a598)' : isHovered ? 'rgba(131, 165, 152, 0.2)' : 'none',
          color: isActive ? 'var(--bg0, #282828)' : 'var(--fg, #ebdbb2)',
          fontSize: mobile ? '1rem' : 'clamp(0.75rem, 1.5vw, 0.95rem)',
          whiteSpace: 'nowrap',
          display: 'block',
          transform: isHovered && !isActive ? 'translateY(-1px)' : 'none',
          boxShadow: isHovered && !isActive ? '0 2px 8px rgba(131, 165, 152, 0.3)' : 'none'
        }}
      >
        {label}
      </Link>
    );
  };

  return (
    <header className="main-header" style={{ 
      background: 'var(--bg1, #3c3836)', 
      padding: '0.75rem clamp(0.5rem, 2vw, 2rem)',
      minHeight: '60px',
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between',
      gap: '0.75rem',
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)', 
      position: 'sticky', 
      top: 0, 
      zIndex: 100,
      flexWrap: 'wrap'
    }}>
      <Link to="/" className="header-title" style={{ 
        fontSize: 'clamp(1rem, 3vw, 1.5rem)',
        fontWeight: 'bold', 
        color: 'var(--fg-light, #fbf1c7)', 
        textDecoration: 'none', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.5rem',
        whiteSpace: 'nowrap',
        minWidth: 'fit-content'
      }}>
        Smash Match Logger
      </Link>

      {/* Hamburger Button */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        style={{
          display: 'none',
          background: 'none',
          border: 'none',
          color: 'var(--fg, #ebdbb2)',
          fontSize: '1.5rem',
          cursor: 'pointer',
          padding: '0.5rem',
          transition: 'all 0.2s',
          borderRadius: '8px'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(131, 165, 152, 0.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'none';
        }}
        className="hamburger-menu"
      >
        {menuOpen ? '✕' : '☰'}
      </button>

      {/* Desktop Navigation */}
      <nav className="desktop-nav" style={{ 
        display: 'flex', 
        gap: 'clamp(0.25rem, 1vw, 1rem)',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'flex-end',
        flex: '1 1 auto',
        minWidth: 0
      }}>
        {navLinks.map((link) => (
          <NavLink key={link.to} {...link} />
        ))}
      </nav>

      {/* Mobile Navigation */}
      {menuOpen && (
        <nav
          className="mobile-nav"
          style={{
            display: 'none',
            flexDirection: 'column',
            width: '100%',
            background: 'var(--bg2, #504945)',
            borderRadius: '8px',
            padding: '0.5rem',
            gap: '0.25rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            animation: 'slideDown 0.2s ease-out'
          }}
        >
          {navLinks.map((link) => (
            <NavLink key={link.to} {...link} mobile />
          ))}
        </nav>
      )}

      <style>{`
        @media (max-width: 1024px) {
          .hamburger-menu {
            display: block !important;
          }
          .desktop-nav {
            display: none !important;
          }
          .mobile-nav {
            display: flex !important;
          }
        }
        
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </header>
  );
}

// Component to update page title based on route
function PageTitle() {
  const location = useLocation();
  
  useEffect(() => {
    const path = location.pathname;
    let title = 'Smash Match Logger';
    
    if (path === '/') {
      title = 'Game Logger - Smash Match Logger';
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
    <div style={{ minHeight: '100vh', background: 'var(--bg0, #282828)', color: 'var(--fg, #ebdbb2)', display: 'flex', flexDirection: 'column' }}>
      <PageTitle />
      <Header />
      <main style={{ flex: 1, width: '100%', maxWidth: 1920, margin: '0 auto' }}>
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
        </Routes>
      </main>
    </div>
  );
}

export default App;
