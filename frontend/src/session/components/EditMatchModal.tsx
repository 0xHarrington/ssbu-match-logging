// EditMatchModal — edit or delete a logged match. Seeded from the row, writes
// to PUT/DELETE /api/matches/<id> (which also appends to edit_log.csv).
import { useState } from 'react';
import CharacterPicker from './CharacterPicker';
import { WinnerPicker, StageGrid, StocksPicker } from './formControls';
import ModalShell from './ModalShell';
import { ACTIVE_STAGES } from '../useLogForm';
import { matchTime, parseStocks } from '../format';
import { deleteMatch, updateMatch } from '../../lib/api';
import { PLAYER_HEX } from '../palette';
import type { Match, Player } from '../../types';

interface EditMatchModalProps {
  match: Match;
  characters: string[];
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}

function initialStocks(match: Match): number | null {
  return parseStocks(match.stocks_remaining);
}

export default function EditMatchModal({ match, characters, onClose, onSaved, onDeleted }: EditMatchModalProps) {
  const [shayneChar, setShayneChar] = useState(match.shayne_character);
  const [mattChar, setMattChar] = useState(match.matt_character);
  const [winner, setWinner] = useState<Player | null>(
    match.winner === 'Shayne' || match.winner === 'Matt' ? match.winner : null,
  );
  const [stage, setStage] = useState(match.stage || 'Battlefield');
  const [stocks, setStocks] = useState<number | null>(initialStocks(match));
  const [pickerFor, setPickerFor] = useState<Player | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = Boolean(winner && stocks && shayneChar && mattChar && stage);

  const handleSave = async () => {
    if (!canSave) return;
    setBusy(true);
    setError(null);
    try {
      await updateMatch(match.match_id, {
        shayneCharacter: shayneChar,
        mattCharacter: mattChar,
        winner: winner!,
        stage,
        stocksRemaining: stocks,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    setError(null);
    try {
      await deleteMatch(match.match_id);
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
      setBusy(false);
    }
  };

  const MonoLabel = ({ children }: { children: React.ReactNode }) => (
    <div style={{ fontSize: 11, color: 'var(--gray)', fontFamily: 'var(--font-mono)', marginBottom: 9 }}>{children}</div>
  );

  return (
    <ModalShell
      width={480}
      title="Edit match"
      subtitle={`${match.shayne_character} vs ${match.matt_character} · ${matchTime(match.datetime)}`}
      onClose={onClose}
    >
      <div style={{ padding: 22 }}>
        <MonoLabel>WINNER</MonoLabel>
        <div style={{ marginBottom: 20 }}>
          <WinnerPicker
            shayneChar={shayneChar}
            mattChar={mattChar}
            value={winner}
            onChange={setWinner}
            layout="row"
            tokenSize={40}
            onTokenClick={(p) => setPickerFor((cur) => (cur === p ? null : p))}
            tokenSlot={(p) =>
              pickerFor === p ? (
                <CharacterPicker
                  characters={characters}
                  current={p === 'Shayne' ? shayneChar : mattChar}
                  accent={PLAYER_HEX[p]}
                  onSelect={(c) => (p === 'Shayne' ? setShayneChar(c) : setMattChar(c))}
                  onClose={() => setPickerFor(null)}
                />
              ) : null
            }
          />
        </div>

        <MonoLabel>STAGE</MonoLabel>
        <div style={{ marginBottom: 20 }}>
          <StageGrid stages={ACTIVE_STAGES} value={stage} onChange={setStage} variant="chip" />
        </div>

        <MonoLabel>WINNER'S STOCKS LEFT</MonoLabel>
        <div style={{ marginBottom: 24 }}>
          <StocksPicker value={stocks} onChange={setStocks} padY={12} />
        </div>

        {error && <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 14 }}>{error}</div>}

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={handleDelete}
            disabled={busy}
            style={{
              background: 'transparent',
              border: '1px solid #5a2420',
              borderRadius: 12,
              padding: '13px 16px',
              color: 'var(--red)',
              fontFamily: 'var(--font-display)',
              fontSize: 13,
              fontWeight: 600,
              cursor: busy ? 'not-allowed' : 'pointer',
            }}
          >
            Delete
          </button>
          <div style={{ flex: 1 }} />
          <button
            onClick={onClose}
            disabled={busy}
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border-light)',
              borderRadius: 12,
              padding: '13px 20px',
              color: 'var(--gray)',
              fontFamily: 'var(--font-display)',
              fontSize: 13,
              fontWeight: 600,
              cursor: busy ? 'not-allowed' : 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave || busy}
            style={{
              background: canSave ? 'var(--shayne)' : '#2a2624',
              border: 'none',
              borderRadius: 12,
              padding: '13px 24px',
              color: canSave ? '#1b1817' : 'var(--faint)',
              fontFamily: 'var(--font-display)',
              fontSize: 13,
              fontWeight: 700,
              cursor: canSave && !busy ? 'pointer' : 'not-allowed',
            }}
          >
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
