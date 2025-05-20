import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Navigation() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (!user) {
    return (
      <header className="nav-header">
        <div className="nav-container">
          <Link to="/" className="nav-logo">
            Smash Match Logger
          </Link>
          <nav className="nav-links">
            <Link to="/login" className={`nav-link${location.pathname === '/login' ? ' active' : ''}`}>
              Login
            </Link>
            <Link to="/register" className={`nav-link${location.pathname === '/register' ? ' active' : ''}`}>
              Register
            </Link>
          </nav>
        </div>
      </header>
    );
  }

  return (
    <header className="nav-header">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          Smash Match Logger
        </Link>
        <nav className="nav-links">
          <Link to="/" className={`nav-link${location.pathname === '/' ? ' active' : ''}`}>
            Log Match
          </Link>
          <Link to="/stats" className={`nav-link${location.pathname === '/stats' ? ' active' : ''}`}>
            Statistics
          </Link>
          <Link to="/session" className={`nav-link${location.pathname === '/session' ? ' active' : ''}`}>
            Session
          </Link>
        </nav>
        <div className="user-info">
          <span>{user.display_name}</span>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </div>
    </header>
  );
} 