import React, { useEffect, useMemo, useRef, useState } from 'react';
import CharacterDisplay, { getCharacterIconUrl } from './CharacterDisplay';
import { stageImages } from '../lib/stages';

// Shape shared by /api/matches rows and /api/recent_games rows (the latter may
// omit session_id/timestamp, hence optional).
export interface EditableMatch {
  match_id: string;
  datetime: string;
  shayne_character: string;
  matt_character: string;
  winner: string;
  stage: string;
  stocks_remaining: number | string | null;
  session_id?: string;
  timestamp?: string;
}

interface MatchUpdatePayload {
  shayneCharacter?: string;
  mattCharacter?: string;
  winner?: string;
  stage?: string;
  stocksRemaining?: number | null;
}

interface ApiEnvelope {
  success?: boolean;
  message?: string;
}

interface CharactersResponse {
  all_characters?: string[];
}

type Stocks = 1 | 2 | 3 | null;

const SHAYNE_COLOR = '#fe8019';
const MATT_COLOR = '#b8bb26';

const normalizeStocks = (value: EditableMatch['stocks_remaining']): Stocks => {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return n === 1 || n === 2 || n === 3 ? (n as 1 | 2 | 3) : null;
};

const parseJson = async (res: Response): Promise<ApiEnvelope> => {
  try {
    return (await res.json()) as ApiEnvelope;
  } catch {
    throw new Error('Server returned an invalid response.');
  }
};

const errorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : String(err);

function CharacterPicker({ label, accent, value, onChange, roster }: {
  label: string;
  accent: string;
  value: string;
  onChange: (character: string) => void;
  roster: string[];
}) {
  const [search, setSearch] = useState(value);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep the input in sync if the value changes from outside
  useEffect(() => {
    setSearch(value);
  }, [value]);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch(value);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [value]);

  const filtered = roster.filter(char =>
    char.toLowerCase().includes(search.toLowerCase())
  );

  const iconUrl = getCharacterIconUrl(value);

  return (
    <div ref={containerRef} style={{ position: 'relative', minWidth: 0 }}>
      <div style={{
        fontSize: '0.8rem',
        fontWeight: 'bold',
        color: accent,
        marginBottom: '0.35rem',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        {label}
      </div>
      <div style={{ position: 'relative' }}>
        {iconUrl && (
          <img
            src={iconUrl}
            alt={value}
            style={{
              position: 'absolute',
              left: '0.5rem',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '20px',
              height: '20px',
              objectFit: 'contain',
              pointerEvents: 'none'
            }}
          />
        )}
        <input
          type="text"
          value={search}
          placeholder="Search character..."
          autoComplete="off"
          onChange={e => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            background: '#282828',
            color: '#ebdbb2',
            border: `1px solid ${open ? accent : '#504945'}`,
            borderRadius: '6px',
            padding: iconUrl ? '0.5rem 0.5rem 0.5rem 2.1rem' : '0.5rem',
            fontSize: '0.85rem',
            outline: 'none'
          }}
        />
      </div>
      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '0.25rem',
          maxHeight: '200px',
          overflowY: 'auto',
          background: '#282828',
          border: '1px solid #504945',
          borderRadius: '6px',
          zIndex: 10,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
        }}>
          {filtered.length === 0 && (
            <div style={{ padding: '0.5rem', fontSize: '0.8rem', color: '#a89984' }}>
              No characters match.
            </div>
          )}
          {filtered.map(char => (
            <div
              key={char}
              onClick={() => {
                onChange(char);
                setSearch(char);
                setOpen(false);
              }}
              style={{
                padding: '0.4rem 0.5rem',
                fontSize: '0.85rem',
                cursor: 'pointer',
                borderLeft: char === value ? `3px solid ${accent}` : '3px solid transparent'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#3c3836'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <CharacterDisplay character={char} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export interface MatchEditorModalProps {
  match: EditableMatch;
  onClose: () => void;
  onSaved: () => void;
}

function MatchEditorModal({ match, onClose, onSaved }: MatchEditorModalProps) {
  const [roster, setRoster] = useState<string[]>([]);
  const [shayneCharacter, setShayneCharacter] = useState(match.shayne_character);
  const [mattCharacter, setMattCharacter] = useState(match.matt_character);
  const [stage, setStage] = useState(match.stage || '');
  const [winner, setWinner] = useState(match.winner);
  const [stocks, setStocks] = useState<Stocks>(normalizeStocks(match.stocks_remaining));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/characters')
      .then(res => res.json())
      .then((data: CharactersResponse) => {
        if (!cancelled && Array.isArray(data.all_characters)) {
          setRoster(data.all_characters);
        }
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load character roster.');
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const originalStocks = useMemo(() => normalizeStocks(match.stocks_remaining), [match]);

  const changes = useMemo<MatchUpdatePayload>(() => {
    const payload: MatchUpdatePayload = {};
    if (shayneCharacter !== match.shayne_character) payload.shayneCharacter = shayneCharacter;
    if (mattCharacter !== match.matt_character) payload.mattCharacter = mattCharacter;
    if (winner !== match.winner) payload.winner = winner;
    if (stage !== (match.stage || '')) payload.stage = stage;
    if (stocks !== originalStocks) payload.stocksRemaining = stocks;
    return payload;
  }, [shayneCharacter, mattCharacter, winner, stage, stocks, match, originalStocks]);

  const hasChanges = Object.keys(changes).length > 0;
  const inFlight = saving || deleting;

  const handleSave = async () => {
    if (!hasChanges || inFlight) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/matches/${encodeURIComponent(match.match_id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes)
      });
      const data = await parseJson(res);
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to save match.');
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (inFlight) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/matches/${encodeURIComponent(match.match_id)}`, {
        method: 'DELETE'
      });
      const data = await parseJson(res);
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to delete match.');
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(errorMessage(err));
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const sectionLabelStyle: React.CSSProperties = {
    fontSize: '0.8rem',
    fontWeight: 'bold',
    color: '#a89984',
    marginBottom: '0.5rem',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  };

  const toggleButtonStyle = (selected: boolean, accent: string): React.CSSProperties => ({
    padding: '0.5rem 0.75rem',
    borderRadius: '6px',
    border: `2px solid ${selected ? accent : '#504945'}`,
    background: selected ? accent : 'transparent',
    color: selected ? '#282828' : '#ebdbb2',
    fontSize: '0.85rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.15s'
  });

  const stageOptions = Object.keys(stageImages);

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.65)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
    >
      <div style={{
        background: '#3c3836',
        border: '1px solid #504945',
        borderRadius: '12px',
        padding: '1.25rem',
        width: 'min(600px, 94vw)',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '1rem'
        }}>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#fbf1c7' }}>
              Edit Match
            </div>
            <div style={{ fontSize: '0.75rem', color: '#a89984', marginTop: '0.2rem' }}>
              {formatDateTime(match.datetime)}
              {match.session_id ? ` · Session ${match.session_id}` : ''}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'none',
              border: 'none',
              color: '#a89984',
              fontSize: '1.1rem',
              cursor: 'pointer',
              padding: '0.2rem',
              lineHeight: 1
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#fbf1c7'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#a89984'; }}
          >
            ✕
          </button>
        </div>

        {/* Character pickers */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '0.75rem',
          marginBottom: '1rem'
        }}>
          <CharacterPicker
            label="Shayne"
            accent={SHAYNE_COLOR}
            value={shayneCharacter}
            onChange={setShayneCharacter}
            roster={roster}
          />
          <CharacterPicker
            label="Matt"
            accent={MATT_COLOR}
            value={mattCharacter}
            onChange={setMattCharacter}
            roster={roster}
          />
        </div>

        {/* Stage */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={sectionLabelStyle}>Stage</div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '0.5rem'
          }}>
            {stageOptions.map(s => {
              const selected = stage === s;
              return (
                <button
                  type="button"
                  key={s}
                  onClick={() => setStage(s)}
                  style={{
                    backgroundImage: `url(${stageImages[s]})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                    minHeight: '52px',
                    padding: '0.4rem',
                    borderRadius: '6px',
                    border: `2px solid ${selected ? '#fabd2f' : '#504945'}`,
                    cursor: 'pointer',
                    color: '#fbf1c7'
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: selected ? 'rgba(0, 0, 0, 0.35)' : 'rgba(0, 0, 0, 0.6)',
                    zIndex: 1
                  }} />
                  <span style={{
                    position: 'relative',
                    zIndex: 2,
                    fontSize: '0.7rem',
                    fontWeight: 'bold',
                    textShadow: '0 1px 3px rgba(0, 0, 0, 0.9)'
                  }}>
                    {s}
                  </span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setStage('')}
              style={{
                minHeight: '52px',
                padding: '0.4rem',
                borderRadius: '6px',
                border: `2px solid ${stage === '' ? '#fabd2f' : '#504945'}`,
                background: '#282828',
                color: stage === '' ? '#fbf1c7' : '#a89984',
                fontSize: '0.7rem',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              No Stage
            </button>
          </div>
        </div>

        {/* Winner + Stocks */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '0.75rem',
          marginBottom: '1rem'
        }}>
          <div>
            <div style={sectionLabelStyle}>Winner</div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setWinner('Shayne')}
                style={{ ...toggleButtonStyle(winner === 'Shayne', SHAYNE_COLOR), flex: 1 }}
              >
                Shayne
              </button>
              <button
                type="button"
                onClick={() => setWinner('Matt')}
                style={{ ...toggleButtonStyle(winner === 'Matt', MATT_COLOR), flex: 1 }}
              >
                Matt
              </button>
            </div>
          </div>
          <div>
            <div style={sectionLabelStyle}>Stocks Left</div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {([1, 2, 3] as const).map(n => (
                <button
                  type="button"
                  key={n}
                  onClick={() => setStocks(n)}
                  style={{ ...toggleButtonStyle(stocks === n, '#83a598'), flex: 1 }}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setStocks(null)}
                title="No stocks recorded"
                style={{ ...toggleButtonStyle(stocks === null, '#83a598'), flex: 1 }}
              >
                —
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="error" style={{ padding: '0.5rem', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
            {error}
          </div>
        )}

        {/* Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <button
            type="button"
            onClick={onClose}
            disabled={inFlight}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: '1px solid #665c54',
              background: 'transparent',
              color: '#ebdbb2',
              fontSize: '0.85rem',
              cursor: inFlight ? 'default' : 'pointer',
              opacity: inFlight ? 0.6 : 1
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={inFlight}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: '1px solid #fb4934',
              background: confirmDelete ? '#fb4934' : 'transparent',
              color: confirmDelete ? '#282828' : '#fb4934',
              fontSize: '0.85rem',
              fontWeight: 'bold',
              cursor: inFlight ? 'default' : 'pointer',
              opacity: inFlight ? 0.6 : 1
            }}
          >
            {deleting ? 'Deleting...' : confirmDelete ? 'Really delete?' : 'Delete'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasChanges || inFlight}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '6px',
              border: 'none',
              background: '#83a598',
              color: '#282828',
              fontSize: '0.85rem',
              fontWeight: 'bold',
              cursor: !hasChanges || inFlight ? 'default' : 'pointer',
              opacity: !hasChanges || inFlight ? 0.5 : 1
            }}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default MatchEditorModal;
