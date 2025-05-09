import { useRef, createContext, useState, useContext } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import MatchLogger from './MatchLogger';
import RecentMatches, { type RecentMatchesRef } from './RecentMatches';
import SessionStats, { type SessionStatsRef } from './SessionStats';
import StatsPage from './StatsPage';

interface User {
  id: number;
  username: string;
  email: string;
}

interface UserContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const UserContext = createContext<UserContextType | null>(null);

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within a UserProvider');
  return context;
};

function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  const login = async (username: string, password: string) => {
    const res = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) throw new Error('Login failed');
    const data = await res.json();
    setUser(data.user);
    navigate('/');
  };

  const register = async (username: string, email: string, password: string) => {
    const res = await fetch('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });
    if (!res.ok) throw new Error('Registration failed');
    const data = await res.json();
    setUser(data.user);
    navigate('/');
  };

  const logout = async () => {
    await fetch('/auth/logout');
    setUser(null);
    navigate('/login');
  };

  return (
    <UserContext.Provider value={{ user, login, register, logout }}>
      {children}
    </UserContext.Provider>
  );
}

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(username, password);
    } catch (err) {
      alert('Login failed');
    }
  };

  return (
    <div>
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
        <button type="submit">Login</button>
      </form>
    </div>
  );
}

function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { register } = useUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register(username, email, password);
    } catch (err) {
      alert('Registration failed');
    }
  };

  return (
    <div>
      <h2>Register</h2>
      <form onSubmit={handleSubmit}>
        <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required />
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
        <button type="submit">Register</button>
      </form>
    </div>
  );
}

function LoggingHome() {
  const recentMatchesRef = useRef<RecentMatchesRef | null>(null);
  const sessionStatsRef = useRef<SessionStatsRef | null>(null);

  // Callback to refresh both session stats and recent matches after a match is logged
  const handleMatchLogged = () => {
    recentMatchesRef.current?.refresh();
    sessionStatsRef.current?.refresh();
  };

  return (
    <div className="match-logger-pane">
      <div className="match-form-col">
        <MatchLogger onMatchLogged={handleMatchLogged} />
      </div>
      <div className="session-stats-col">
        <SessionStats ref={sessionStatsRef} />
      </div>
      <div className="recent-matches-col">
        <RecentMatches ref={recentMatchesRef} />
      </div>
    </div>
  );
}

function Header() {
  const location = useLocation();
  const { user, logout } = useUser();
  return (
    <header className="main-header" style={{ background: 'var(--bg1, #3c3836)', padding: '0 2rem', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', position: 'sticky', top: 0, zIndex: 100 }}>
      <Link to="/" className="header-title" style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--fg-light, #fbf1c7)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        Smash Match Logger
      </Link>
      <nav style={{ display: 'flex', gap: '1rem' }}>
        {user ? (
          <>
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
            <button onClick={logout} style={{
              textDecoration: 'none',
              padding: '0.5rem 1rem',
              borderRadius: 12,
              transition: 'all 0.2s',
              background: 'none',
              color: 'var(--fg, #ebdbb2)',
              border: 'none',
              cursor: 'pointer'
            }}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" className={`nav-link${location.pathname === '/login' ? ' active' : ''}`} style={{
              textDecoration: 'none',
              padding: '0.5rem 1rem',
              borderRadius: 12,
              transition: 'all 0.2s',
              background: location.pathname === '/login' ? 'var(--blue, #83a598)' : 'none',
              color: location.pathname === '/login' ? 'var(--bg0, #282828)' : 'var(--fg, #ebdbb2)'
            }}>Login</Link>
            <Link to="/register" className={`nav-link${location.pathname === '/register' ? ' active' : ''}`} style={{
              textDecoration: 'none',
              padding: '0.5rem 1rem',
              borderRadius: 12,
              transition: 'all 0.2s',
              background: location.pathname === '/register' ? 'var(--blue, #83a598)' : 'none',
              color: location.pathname === '/register' ? 'var(--bg0, #282828)' : 'var(--fg, #ebdbb2)'
            }}>Register</Link>
          </>
        )}
      </nav>
    </header>
  );
}

function App() {
  return (
    <UserProvider>
      <div className="min-h-screen bg-gray-100">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<LoggingHome />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Routes>
        </main>
      </div>
    </UserProvider>
  );
}

export default App;
