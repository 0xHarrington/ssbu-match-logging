// LogTab — the mobile fast-log flow: who won (with fighter pickers), a
// sticky/expandable stage, stocks, and Log it.
import { useState } from 'react';
import CharacterPicker from '../components/CharacterPicker';
import { WinnerPicker, StageGrid, StocksPicker } from '../components/formControls';
import { ACTIVE_STAGES, type LogFormState } from '../useLogForm';
import { PLAYER_HEX } from '../palette';
import type { Player } from '../../types';

const MonoLabel = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: 11, color: 'var(--gray)', fontFamily: 'var(--font-mono)', marginBottom: 9 }}>{children}</div>
);

export default function LogTab({
  form,
  characters,
}: {
  form: LogFormState;
  characters: string[];
}) {
  const [pickerFor, setPickerFor] = useState<Player | null>(null);
  const [stageOpen, setStageOpen] = useState(false);

  return (
    <div style={{ padding: '8px 18px 24px' }}>
      <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--fg-light)', marginBottom: 4, fontFamily: 'var(--font-display)' }}>
        Log a match
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)', marginBottom: 16 }}>
        Tap through — last stage stays sticky
      </div>

      <MonoLabel>WHO WON?</MonoLabel>
      <div style={{ marginBottom: 18 }}>
        <WinnerPicker
          shayneChar={form.shayneChar}
          mattChar={form.mattChar}
          value={form.winner}
          onChange={form.setWinner}
          layout="row"
          tokenSize={40}
          onTokenClick={(p) => setPickerFor((cur) => (cur === p ? null : p))}
          tokenSlot={(p) =>
            pickerFor === p ? (
              <CharacterPicker
                characters={characters}
                current={p === 'Shayne' ? form.shayneChar : form.mattChar}
                accent={PLAYER_HEX[p]}
                onSelect={(c) => (p === 'Shayne' ? form.setShayneChar(c) : form.setMattChar(c))}
                onClose={() => setPickerFor(null)}
              />
            ) : null
          }
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
        <span style={{ fontSize: 11, color: 'var(--gray)', fontFamily: 'var(--font-mono)' }}>STAGE</span>
        <button
          onClick={() => setStageOpen((v) => !v)}
          style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 8, padding: '5px 10px', color: 'var(--fg)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-display)' }}
        >
          {form.stage} {stageOpen ? '▲' : '▾'}
        </button>
      </div>
      {stageOpen && (
        <div style={{ marginBottom: 20 }}>
          <StageGrid
            stages={ACTIVE_STAGES}
            value={form.stage}
            onChange={(s) => {
              form.setStage(s);
              setStageOpen(false);
            }}
            variant="chip"
          />
        </div>
      )}
      {!stageOpen && <div style={{ marginBottom: 20 }} />}

      <MonoLabel>STOCKS LEFT</MonoLabel>
      <div style={{ marginBottom: 20 }}>
        <StocksPicker value={form.stocks} onChange={form.setStocks} padY={16} />
      </div>

      {form.error && <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 12 }}>{form.error}</div>}

      <button
        onClick={() => form.submit()}
        disabled={!form.ready || form.submitting}
        style={{
          width: '100%',
          border: 'none',
          borderRadius: 14,
          padding: 16,
          fontFamily: 'var(--font-display)',
          fontSize: 15,
          fontWeight: 700,
          transition: 'all 0.15s',
          background: form.ready ? 'var(--home)' : '#2a2624',
          color: form.ready ? '#1b1817' : 'var(--faint)',
          cursor: form.ready && !form.submitting ? 'pointer' : 'not-allowed',
        }}
      >
        {form.submitting ? 'Logging…' : 'Log it'}
      </button>
    </div>
  );
}
