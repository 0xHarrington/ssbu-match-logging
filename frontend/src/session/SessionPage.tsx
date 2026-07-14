// SessionPage — top-level orchestrator for the Session experience.
//
// Owns the live-session fetch, the shared log form, modal + undo state, and the
// character roster. Renders the desktop dashboard (mobile layout arrives in a
// follow-up). Modals and the undo toast are rendered here so they overlay the
// whole page.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ErrorState, LoadingState } from '../components/Feedback';
import { useLiveSession } from '../hooks/useLiveSession';
import { useIsMobile } from '../hooks/useMediaQuery';
import { getCharacters, undoLastGame } from '../lib/api';
import { useLogForm, type OnDeckSeed } from './useLogForm';
import SessionDesktop, { type SessionDesktopHandle } from './SessionDesktop';
import SessionMobile, { type SessionMobileHandle } from './mobile/SessionMobile';
import LogRail from './components/LogRail';
import SeeAllModal from './components/SeeAllModal';
import EditMatchModal from './components/EditMatchModal';
import AutoDetectSheet from './components/AutoDetectSheet';
import UndoToast from './components/UndoToast';
import type { Match, Player } from '../types';

const UNDO_MS = 4500;

export default function SessionPage() {
  const { data: live, loading, error, empty, refresh } = useLiveSession();
  const isMobile = useIsMobile();
  const [characters, setCharacters] = useState<string[]>([]);
  const [modal, setModal] = useState<'all' | null>(null);
  const [editMatch, setEditMatch] = useState<Match | null>(null);
  const [showAuto, setShowAuto] = useState(false);
  const [undo, setUndo] = useState<{ winner: Player } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mobileRef = useRef<SessionMobileHandle>(null);
  const desktopRef = useRef<SessionDesktopHandle>(null);

  useEffect(() => {
    let active = true;
    getCharacters()
      .then((r) => active && setCharacters(r.all_characters ?? []))
      .catch(() => active && setCharacters([]));
    return () => {
      active = false;
    };
  }, []);

  const clearUndoTimer = () => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = null;
  };
  useEffect(() => clearUndoTimer, []);

  const onLogged = useCallback(
    (winner: Player) => {
      refresh();
      setUndo({ winner });
      clearUndoTimer();
      undoTimer.current = setTimeout(() => setUndo(null), UNDO_MS);
    },
    [refresh],
  );

  const rematchSeed: OnDeckSeed | null = useMemo(() => {
    if (!live?.onDeck) return null;
    return {
      shayneChar: live.onDeck.shayneChar,
      mattChar: live.onDeck.mattChar,
      stage: live.matches[0]?.stage ?? '',
    };
  }, [live]);

  const form = useLogForm(rematchSeed, onLogged);

  const handleUndo = useCallback(async () => {
    clearUndoTimer();
    setUndo(null);
    try {
      await undoLastGame();
    } finally {
      refresh();
    }
  }, [refresh]);

  const handleEditSaved = useCallback(() => {
    setEditMatch(null);
    refresh();
  }, [refresh]);

  if (loading) return <LoadingState label="Loading session…" />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;

  // Mobile: the self-contained tab app handles its own empty state.
  if (isMobile) {
    return (
      <>
        <SessionMobile
          ref={mobileRef}
          live={empty ? null : live}
          form={form}
          characters={characters}
          rematchSeed={rematchSeed}
          onAutoDetect={() => setShowAuto(true)}
        />
        {showAuto && (
          <AutoDetectSheet
            mobile
            onClose={() => setShowAuto(false)}
            onLogManually={() => {
              setShowAuto(false);
              mobileRef.current?.goToLogTab();
            }}
          />
        )}
        {undo && <UndoToast winner={undo.winner} onUndo={handleUndo} bottomOffset={92} />}
      </>
    );
  }

  // Desktop, no games yet: still offer the log form so the first match can start a session.
  if (empty || !live) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', minHeight: '100vh' }}>
        <div style={{ padding: '48px 34px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 10 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg-light)', fontFamily: 'var(--font-display)' }}>
            No active session
          </div>
          <div style={{ color: 'var(--gray)', maxWidth: 360 }}>
            Log your first match in the rail to start a new session. It'll come to life here — scoreboard, momentum, and the on-deck matchup.
          </div>
        </div>
        <LogRail form={form} characters={characters} rematchSeed={rematchSeed} />
        {undo && <UndoToast winner={undo.winner} onUndo={handleUndo} />}
      </div>
    );
  }

  return (
    <>
      <SessionDesktop
        ref={desktopRef}
        live={live}
        form={form}
        characters={characters}
        rematchSeed={rematchSeed}
        onSeeAll={() => setModal('all')}
        onEditMatch={setEditMatch}
        onAutoDetect={() => setShowAuto(true)}
      />

      {modal === 'all' && (
        <SeeAllModal
          sessionName={live.displayName}
          matches={live.matches}
          onClose={() => setModal(null)}
          onEdit={(m) => {
            setModal(null);
            setEditMatch(m);
          }}
        />
      )}

      {editMatch && (
        <EditMatchModal
          match={editMatch}
          characters={characters}
          onClose={() => setEditMatch(null)}
          onSaved={handleEditSaved}
          onDeleted={handleEditSaved}
        />
      )}

      {showAuto && (
        <AutoDetectSheet
          onClose={() => setShowAuto(false)}
          onLogManually={() => {
            setShowAuto(false);
            desktopRef.current?.focusLogRail();
          }}
        />
      )}

      {undo && <UndoToast winner={undo.winner} onUndo={handleUndo} />}
    </>
  );
}
