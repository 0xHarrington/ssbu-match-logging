// AppShell — the redesign's application frame.
//
// Desktop (>=1220px): a left sidebar (logo, nav, active-rivalry card) + a
// fluid content area. The sidebar collapses to an icon-only 68px ribbon; the
// choice persists in localStorage. The Session page supplies its own
// main+log-rail grid inside that area; other pages just fill it.
//
// Mobile (<1220px): a slim top bar with a hamburger that opens a left drawer
// for cross-page navigation. The Session page renders its own bottom tab bar.
import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useIsMobile } from '../../hooks/useMediaQuery';
import {
  CharactersIcon,
  CloseIcon,
  MenuIcon,
  SessionIcon,
  SessionsIcon,
  StatsIcon,
  TearsheetIcon,
} from './icons';

interface NavItem {
  to: string;
  label: string;
  icon: (p: { size?: number }) => ReactNode;
  isActive: (path: string) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Session', icon: SessionIcon, isActive: (p) => p === '/' },
  { to: '/stats', label: 'Statistics', icon: StatsIcon, isActive: (p) => p === '/stats' },
  {
    to: '/characters',
    label: 'Characters',
    icon: CharactersIcon,
    isActive: (p) => p.startsWith('/characters'),
  },
  {
    to: '/sessions',
    label: 'Sessions',
    icon: SessionsIcon,
    isActive: (p) => p.startsWith('/sessions'),
  },
  {
    to: '/player-tearsheet',
    label: 'Tearsheets',
    icon: TearsheetIcon,
    isActive: (p) => p.includes('tearsheet'),
  },
];

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      to="/"
      title="SmashLog"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        textDecoration: 'none',
      }}
    >
      <span
        style={{
          width: 30,
          height: 30,
          borderRadius: 9,
          background: 'var(--matt)',
          color: '#1b1817',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: 15,
          fontFamily: 'var(--font-display)',
          flex: '0 0 auto',
        }}
      >
        S
      </span>
      {!compact && (
        <span
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: 'var(--fg-light)',
            letterSpacing: '-0.3px',
            fontFamily: 'var(--font-display)',
          }}
        >
          Smash<span style={{ color: 'var(--matt)' }}>Log</span>
        </span>
      )}
    </Link>
  );
}

function NavLinks({ onNavigate, compact = false }: { onNavigate?: () => void; compact?: boolean }) {
  const { pathname } = useLocation();
  const [hovered, setHovered] = useState<string | null>(null);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {NAV_ITEMS.map((item) => {
        const active = item.isActive(pathname);
        const isHover = hovered === item.to && !active;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            onMouseEnter={() => setHovered(item.to)}
            onMouseLeave={() => setHovered(null)}
            title={compact ? item.label : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: compact ? 'center' : 'flex-start',
              gap: 12,
              padding: compact ? '11px 0' : '11px 12px',
              borderRadius: 11,
              textDecoration: 'none',
              transition: 'all 0.15s',
              background: active ? 'var(--matt)' : isHover ? 'rgba(184,187,38,0.08)' : 'transparent',
              color: active ? '#1b1817' : 'var(--gray)',
              fontFamily: 'var(--font-display)',
              fontSize: 14,
              fontWeight: active ? 600 : 500,
            }}
          >
            <item.icon size={18} />
            {!compact && <span>{item.label}</span>}
          </Link>
        );
      })}
    </div>
  );
}

function ActiveRivalryCard() {
  const players: Array<{ name: string; color: string }> = [
    { name: 'Matt', color: 'var(--matt)' },
    { name: 'Shayne', color: 'var(--shayne)' },
  ];
  return (
    <div
      style={{
        background: 'var(--deep0)',
        border: '1px solid var(--line-2)',
        borderRadius: 14,
        padding: 14,
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--faint)',
          letterSpacing: 1,
          marginBottom: 10,
        }}
      >
        ACTIVE RIVALRY
      </div>
      {players.map((p) => (
        <Link
          key={p.name}
          to={`/users/${p.name}`}
          title={`${p.name}'s stats`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 6,
            textDecoration: 'none',
          }}
        >
          <span
            style={{ width: 10, height: 10, borderRadius: 3, background: p.color, flex: '0 0 auto' }}
          />
          <span style={{ fontSize: 13, color: 'var(--fg)', fontWeight: 600 }}>{p.name}</span>
        </Link>
      ))}
    </div>
  );
}

function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <aside
      style={{
        background: 'var(--deep1)',
        borderRight: '1px solid var(--line-2)',
        padding: collapsed ? '26px 12px' : '26px 18px',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
      }}
    >
      <div
        style={{
          padding: collapsed ? 0 : '0 8px',
          marginBottom: 32,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <Logo compact={collapsed} />
      </div>
      <NavLinks compact={collapsed} />
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {!collapsed && <ActiveRivalryCard />}
        <button
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            background: 'transparent',
            border: '1px solid var(--line-2)',
            borderRadius: 10,
            padding: '8px 0',
            color: 'var(--gray)',
            cursor: 'pointer',
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            width: '100%',
          }}
        >
          {collapsed ? '»' : '« Collapse'}
        </button>
      </div>
    </aside>
  );
}

function MobileTopBar({ onMenu }: { onMenu: () => void }) {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        height: 56,
        background: 'var(--deep1)',
        borderBottom: '1px solid var(--line-2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
      }}
    >
      <Logo />
      <button
        onClick={onMenu}
        aria-label="Open menu"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--gray)',
          cursor: 'pointer',
          padding: 6,
          display: 'flex',
        }}
      >
        <MenuIcon />
      </button>
    </header>
  );
}

function MobileDrawer({ onClose }: { onClose: () => void }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        background: 'rgba(12,10,9,0.6)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
      }}
      onClick={onClose}
    >
      <nav
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 264,
          maxWidth: '80vw',
          height: '100%',
          background: 'var(--deep1)',
          borderRight: '1px solid var(--line-2)',
          padding: '20px 16px',
          display: 'flex',
          flexDirection: 'column',
          animation: 'drawerIn 0.2s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <Logo />
          <button
            onClick={onClose}
            aria-label="Close menu"
            style={{ background: 'transparent', border: 'none', color: 'var(--gray)', cursor: 'pointer', padding: 4, display: 'flex' }}
          >
            <CloseIcon />
          </button>
        </div>
        <NavLinks onNavigate={onClose} />
        <div style={{ marginTop: 'auto' }}>
          <ActiveRivalryCard />
        </div>
      </nav>
      <style>{`@keyframes drawerIn { from { transform: translateX(-100%); } to { transform: none; } }`}</style>
    </div>
  );
}

const SIDEBAR_COLLAPSED_KEY = 'smashlog-sidebar-collapsed';

function readSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

export default function AppShell({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(readSidebarCollapsed);

  const toggleSidebar = () => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0');
      } catch {
        /* private mode / storage denied — collapse still works for the session */
      }
      return next;
    });
  };

  // Close the drawer whenever the route changes.
  useEffect(() => setDrawerOpen(false), [location.pathname]);

  if (isMobile) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--deep0)', display: 'flex', flexDirection: 'column' }}>
        <MobileTopBar onMenu={() => setDrawerOpen(true)} />
        {drawerOpen && <MobileDrawer onClose={() => setDrawerOpen(false)} />}
        <main style={{ flex: 1, minWidth: 0 }}>{children}</main>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `${collapsed ? 68 : 224}px minmax(0, 1fr)`,
        minHeight: '100vh',
        background: 'var(--deep0)',
        transition: 'grid-template-columns 0.2s ease',
      }}
    >
      <Sidebar collapsed={collapsed} onToggle={toggleSidebar} />
      <main style={{ minWidth: 0 }}>{children}</main>
    </div>
  );
}
