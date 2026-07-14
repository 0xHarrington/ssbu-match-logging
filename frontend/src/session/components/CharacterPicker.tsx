// CharacterPicker — a compact searchable roster popover.
//
// Opens from a player token to let the log/edit forms change fighters: a
// filterable icon list backed by /api/characters' all_characters.
import { useEffect, useMemo, useRef, useState } from 'react';
import { getCharacterIconUrl } from '../../components/CharacterDisplay';

interface CharacterPickerProps {
  characters: string[];
  current?: string;
  accent: string;
  onSelect: (character: string) => void;
  onClose: () => void;
}

export default function CharacterPicker({
  characters,
  current,
  accent,
  onSelect,
  onClose,
}: CharacterPickerProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Every call site passes a fresh `onClose` arrow, so route the listeners
  // below through a ref rather than depending on it directly — otherwise any
  // parent re-render would re-run the effect and steal focus back to the
  // input mid-interaction.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Mount-only: focus the search input once, not on every parent re-render.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Listeners installed once for the life of the popover.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCloseRef.current();
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) onCloseRef.current();
    };
    document.addEventListener('keydown', onKey);
    // Defer so the opening click doesn't immediately close it.
    const t = setTimeout(() => document.addEventListener('mousedown', onClick), 0);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
      clearTimeout(t);
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return characters;
    return characters.filter((c) => c.toLowerCase().includes(q));
  }, [characters, query]);

  return (
    <div
      ref={rootRef}
      style={{
        position: 'absolute',
        top: 'calc(100% + 6px)',
        left: 0,
        zIndex: 50,
        width: 260,
        maxWidth: '90vw',
        background: 'var(--panel)',
        border: '1px solid var(--line)',
        borderRadius: 14,
        boxShadow: '0 20px 50px -20px rgba(0,0,0,0.7)',
        padding: 10,
      }}
    >
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search fighters…"
        style={{
          width: '100%',
          background: 'var(--deep1)',
          border: '1px solid var(--line)',
          borderRadius: 9,
          padding: '9px 11px',
          color: 'var(--fg)',
          fontSize: 13,
          fontFamily: 'var(--font-display)',
          outline: 'none',
          marginBottom: 8,
        }}
      />
      <div style={{ maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {filtered.length === 0 && (
          <div style={{ color: 'var(--faint)', fontSize: 12, padding: 8, textAlign: 'center' }}>
            No fighters match "{query}"
          </div>
        )}
        {filtered.map((c) => {
          const selected = c === current;
          const icon = getCharacterIconUrl(c);
          return (
            <button
              key={c}
              onClick={() => {
                onSelect(c);
                onClose();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                padding: '7px 9px',
                borderRadius: 9,
                border: selected ? `1px solid ${accent}` : '1px solid transparent',
                background: selected ? 'rgba(254,128,25,0.08)' : 'transparent',
                color: 'var(--fg)',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: 13,
                fontFamily: 'var(--font-display)',
                width: '100%',
              }}
              onMouseEnter={(e) => {
                if (!selected) e.currentTarget.style.background = 'var(--card)';
              }}
              onMouseLeave={(e) => {
                if (!selected) e.currentTarget.style.background = 'transparent';
              }}
            >
              {icon ? (
                <img src={icon} alt="" style={{ width: 22, height: 22, objectFit: 'contain', flex: '0 0 auto' }} />
              ) : (
                <span style={{ width: 22, height: 22, flex: '0 0 auto' }} />
              )}
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
