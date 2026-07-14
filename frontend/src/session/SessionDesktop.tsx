// SessionDesktop — the 1360-class dashboard: main analytics column + docked
// log rail. Consumes the live session and the shared log form; modals and the
// undo toast are rendered by SessionPage above this.
import TitleStrip from './components/TitleStrip';
import Scoreboard from './components/Scoreboard';
import MatchupHistoryCard from './components/MatchupHistoryCard';
import SessionTiles from './components/SessionTiles';
import SessionMatchesCard from './components/SessionMatchesCard';
import StagesThisSession from './components/StagesThisSession';
import LogRail from './components/LogRail';
import type { LiveSession } from '../hooks/useLiveSession';
import type { LogFormState, OnDeckSeed } from './useLogForm';
import type { Match } from '../types';

interface SessionDesktopProps {
  live: LiveSession;
  form: LogFormState;
  characters: string[];
  rematchSeed: OnDeckSeed | null;
  onSeeAll: () => void;
  onEditMatch: (m: Match) => void;
  onAutoDetect: () => void;
}

export default function SessionDesktop({
  live,
  form,
  characters,
  rematchSeed,
  onSeeAll,
  onEditMatch,
  onAutoDetect,
}: SessionDesktopProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', minHeight: '100vh' }}>
      <div style={{ padding: '30px 34px', display: 'flex', flexDirection: 'column', gap: 22, minWidth: 0 }}>
        <TitleStrip live={live} onAutoDetect={onAutoDetect} />
        <Scoreboard
          shayneChar={live.onDeck?.shayneChar ?? ''}
          mattChar={live.onDeck?.mattChar ?? ''}
          shayneWins={live.shayneWins}
          mattWins={live.mattWins}
          gameNumber={live.totalGames + 1}
          runPips={live.runPips}
        />
        {live.onDeck && <MatchupHistoryCard onDeck={live.onDeck} />}
        <SessionTiles live={live} />
        <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 20 }}>
          <SessionMatchesCard matches={live.matches} total={live.totalGames} onSeeAll={onSeeAll} onEdit={onEditMatch} />
          <StagesThisSession stages={live.stages} />
        </div>
      </div>
      <LogRail form={form} characters={characters} rematchSeed={rematchSeed} />
    </div>
  );
}
