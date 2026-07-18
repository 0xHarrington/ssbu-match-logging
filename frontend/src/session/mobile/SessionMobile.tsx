// SessionMobile — the phone experience: a Session/Log/Stats/History tab app
// with the three live-session hero directions and a bottom tab bar.
import { forwardRef, useImperativeHandle, useState } from 'react';
import ScoreboardMobile from './ScoreboardMobile';
import MomentumHero from './MomentumHero';
import TapeHero from './TapeHero';
import LogTab from './LogTab';
import StatsTab from './StatsTab';
import HistoryTab from './HistoryTab';
import { SessionIcon } from '../../components/shell/icons';
import type { LiveSession } from '../../hooks/useLiveSession';
import type { LogFormState } from '../useLogForm';
import { formatDuration } from '../format';

type Tab = 'session' | 'log' | 'stats' | 'history';
type Hero = 'scoreboard' | 'momentum' | 'tape';

const HEROES: Array<{ key: Hero; label: string }> = [
  { key: 'scoreboard', label: 'Scoreboard' },
  { key: 'momentum', label: 'Momentum' },
  { key: 'tape', label: 'Tale of tape' },
];

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'session', label: 'Session' },
  { key: 'log', label: 'Log' },
  { key: 'stats', label: 'Stats' },
  { key: 'history', label: 'History' },
];

interface SessionMobileProps {
  live: LiveSession | null;
  form: LogFormState;
  characters: string[];
  onAutoDetect: () => void;
}

function HeroSwitcher({ hero, onPick }: { hero: Hero; onPick: (h: Hero) => void }) {
  return (
    <div style={{ display: 'flex', gap: 5, background: 'var(--deep1)', border: '1px solid var(--line-2)', borderRadius: 12, padding: 4, marginBottom: 18 }}>
      {HEROES.map((h) => {
        const active = hero === h.key;
        return (
          <button
            key={h.key}
            onClick={() => onPick(h.key)}
            style={{
              flex: 1,
              border: 'none',
              cursor: 'pointer',
              borderRadius: 9,
              padding: '9px 4px',
              fontFamily: 'var(--font-display)',
              fontSize: 12,
              fontWeight: 600,
              transition: 'all 0.15s',
              background: active ? 'var(--home)' : 'transparent',
              color: active ? '#1b1817' : 'var(--gray)',
            }}
          >
            {h.label}
          </button>
        );
      })}
    </div>
  );
}

function SessionTab({
  live,
  hero,
  setHero,
  onLog,
  onAutoDetect,
}: {
  live: LiveSession;
  hero: Hero;
  setHero: (h: Hero) => void;
  onLog: () => void;
  onAutoDetect: () => void;
}) {
  return (
    <div style={{ padding: '8px 18px 24px' }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--fg-light)', letterSpacing: '-0.3px', fontFamily: 'var(--font-display)' }}>
          {live.displayName}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)', marginTop: 2 }}>
          {live.ordinal ? `Session #${live.ordinal}` : 'Session'} · {live.totalGames} game{live.totalGames === 1 ? '' : 's'} · {formatDuration(live.durationMinutes)}
        </div>
      </div>

      <HeroSwitcher hero={hero} onPick={setHero} />

      {hero === 'scoreboard' && <ScoreboardMobile live={live} />}
      {hero === 'momentum' && <MomentumHero live={live} />}
      {hero === 'tape' && <TapeHero live={live} />}

      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <button
          onClick={onLog}
          style={{ flex: 1, background: 'var(--home)', border: 'none', borderRadius: 14, padding: 14, color: '#1b1817', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
        >
          + Log match
        </button>
      </div>
      <button
        onClick={onAutoDetect}
        style={{ width: '100%', marginTop: 10, background: 'transparent', border: '1px dashed var(--border-light)', borderRadius: 14, padding: 12, color: 'var(--blue)', fontFamily: 'var(--font-mono)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
      >
        <span style={{ fontSize: 14 }}>◉</span>Auto-detect from TV camera
      </button>
    </div>
  );
}

function BottomNav({ tab, onPick }: { tab: Tab; onPick: (t: Tab) => void }) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 72,
        background: 'var(--deep1)',
        borderTop: '1px solid var(--line-2)',
        display: 'flex',
        alignItems: 'flex-start',
        padding: '12px 8px 0',
        zIndex: 45,
      }}
    >
      {TABS.map((t) => {
        const active = tab === t.key;
        return (
          <button
            key={t.key}
            onClick={() => onPick(t.key)}
            style={{ flex: 1, background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: 4, color: active ? 'var(--home)' : 'var(--faint)' }}
          >
            <div style={{ width: 20, height: 20, borderRadius: 6, background: active ? 'var(--home)' : 'var(--line)' }} />
            <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: active ? 600 : 400 }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Imperative handle so `SessionPage` can drive the tab bar from outside
 *  (e.g. AutoDetectSheet's "Log manually" CTA) without lifting tab state up. */
export interface SessionMobileHandle {
  goToLogTab: () => void;
}

const SessionMobile = forwardRef<SessionMobileHandle, SessionMobileProps>(function SessionMobile(
  { live, form, characters, onAutoDetect },
  ref,
) {
  const [tab, setTab] = useState<Tab>('session');
  const [hero, setHero] = useState<Hero>('scoreboard');

  useImperativeHandle(ref, () => ({
    goToLogTab: () => setTab('log'),
  }));

  const goLog = () => setTab('log');

  return (
    <div style={{ paddingBottom: 84, minHeight: '100vh' }}>
      {tab === 'session' &&
        (live ? (
          <SessionTab live={live} hero={hero} setHero={setHero} onLog={goLog} onAutoDetect={onAutoDetect} />
        ) : (
          <EmptyMobile />
        ))}
      {tab === 'log' && <LogTab form={form} characters={characters} />}
      {tab === 'stats' && <StatsTab />}
      {tab === 'history' && <HistoryTab />}
      <BottomNav tab={tab} onPick={setTab} />
    </div>
  );
});

export default SessionMobile;

function EmptyMobile() {
  return (
    <div style={{ padding: '60px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <SessionIcon size={30} />
      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg-light)', fontFamily: 'var(--font-display)' }}>No active session</div>
      <div style={{ color: 'var(--gray)', fontSize: 13 }}>Tap the Log tab to log your first match and start a session.</div>
    </div>
  );
}
