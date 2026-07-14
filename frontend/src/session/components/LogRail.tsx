// LogRail — the docked desktop log form (right rail of the Session dashboard).
import { useState } from 'react';
import CharacterPicker from './CharacterPicker';
import { WinnerPicker, StageGrid, StocksPicker } from './formControls';
import { ACTIVE_STAGES, type LogFormState, type OnDeckSeed } from '../useLogForm';
import { PLAYER_HEX } from '../palette';
import type { Player } from '../../types';

interface LogRailProps {
  form: LogFormState;
  characters: string[];
  rematchSeed: OnDeckSeed | null;
}

const MonoLabel = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: 11, color: 'var(--gray)', fontFamily: 'var(--font-mono)', marginBottom: 9 }}>
    {children}
  </div>
);

export default function LogRail({ form, characters, rematchSeed }: LogRailProps) {
  const [pickerFor, setPickerFor] = useState<Player | null>(null);

  return (
    <div
      style={{
        background: 'var(--deep1)',
        borderLeft: '1px solid var(--line-2)',
        padding: '26px 22px',
        alignSelf: 'start',
        position: 'sticky',
        top: 0,
      }}
    >
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg-light)', fontFamily: 'var(--font-display)' }}>
        Log a match
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)', marginBottom: 18 }}>
        Winner · stage · stocks
      </div>

      {rematchSeed && (rematchSeed.shayneChar || rematchSeed.mattChar) && (
        <div
          style={{
            background: 'linear-gradient(120deg,#1f2410,#221f1e)',
            border: '1px solid #4a5410',
            borderRadius: 13,
            padding: '12px 14px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 10, color: 'var(--aqua)', fontFamily: 'var(--font-mono)', marginBottom: 3 }}>
              QUICK REMATCH
            </div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--fg)',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {rematchSeed.shayneChar} vs {rematchSeed.mattChar}
              {rematchSeed.stage ? ` · ${rematchSeed.stage}` : ''}
            </div>
          </div>
          <button
            onClick={() => form.quickRematch(rematchSeed)}
            style={{
              background: 'var(--matt)',
              border: 'none',
              borderRadius: 9,
              padding: '8px 12px',
              color: '#1b1817',
              fontWeight: 700,
              fontSize: 12,
              cursor: 'pointer',
              fontFamily: 'var(--font-display)',
              flex: '0 0 auto',
            }}
          >
            Use
          </button>
        </div>
      )}

      <MonoLabel>WHO WON?</MonoLabel>
      <div style={{ marginBottom: 20 }}>
        <WinnerPicker
          shayneChar={form.shayneChar}
          mattChar={form.mattChar}
          value={form.winner}
          onChange={form.setWinner}
          layout="stack"
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
        <div style={{ fontSize: 10, color: 'var(--faint)', fontFamily: 'var(--font-mono)', marginTop: 7 }}>
          Tap a fighter icon to change character
        </div>
      </div>

      <MonoLabel>STAGE</MonoLabel>
      <div style={{ marginBottom: 20 }}>
        <StageGrid stages={ACTIVE_STAGES} value={form.stage} onChange={form.setStage} variant="tile" />
      </div>

      <MonoLabel>WINNER'S STOCKS LEFT</MonoLabel>
      <div style={{ marginBottom: 22 }}>
        <StocksPicker value={form.stocks} onChange={form.setStocks} />
      </div>

      {form.error && (
        <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 12 }}>{form.error}</div>
      )}

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
          background: form.ready ? 'var(--shayne)' : '#2a2624',
          color: form.ready ? '#1b1817' : 'var(--faint)',
          cursor: form.ready && !form.submitting ? 'pointer' : 'not-allowed',
        }}
      >
        {form.submitting ? 'Logging…' : 'Log it'}
      </button>
    </div>
  );
}
