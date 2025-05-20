import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './context/AuthContext';

// Hardcoded character and stage lists (can be fetched from backend later)
const characters = [
  "Mario", "Donkey Kong", "Link", "Samus", "Dark Samus", "Yoshi", "Kirby", "Fox", "Pikachu",
  "Luigi", "Ness", "Captain Falcon", "Jigglypuff", "Peach", "Daisy", "Bowser", "Ice Climbers", "Sheik", "Zelda", "Dr. Mario",
  "Pichu", "Falco", "Marth", "Lucina", "Young Link", "Ganondorf", "Mewtwo", "Roy", "Chrom", "Mr. Game & Watch",
  "Meta Knight", "Pit", "Dark Pit", "Zero Suit Samus", "Wario", "Snake", "Ike", "Pokemon Trainer", "Diddy Kong", "Lucas",
  "Sonic", "King Dedede", "Olimar", "Lucario", "R.O.B.", "Toon Link", "Wolf", "Villager", "Mega Man", "Wii Fit Trainer",
  "Rosalina & Luma", "Little Mac", "Greninja", "Mii Brawler", "Mii Swordfighter", "Mii Gunner", "Palutena", "Pac-Man", "Robin",
  "Shulk", "Bowser Jr.", "Duck Hunt", "Ryu", "Ken", "Cloud", "Corrin", "Bayonetta", "Inkling", "Ridley", "Simon", "Richter",
  "King K. Rool", "Isabelle", "Incineroar", "Piranha Plant", "Joker", "Hero", "Banjo & Kazooie", "Terry", "Byleth", "Min Min",
  "Steve", "Sephiroth", "Pyra/Mythra", "Kazuya", "Sora"
];

const stages = [
  "Battlefield", "Small Battlefield", "Final Destination", "Pokemon Stadium 2", "Smashville", "Town & City",
  "Kalos Pokemon League", "Yoshi's Story", "Hollow Bastion"
];

function CharacterSearch({ label, value, setValue, localStorageKey }: {
  label: string;
  value: string;
  setValue: (v: string) => void;
  localStorageKey: string;
}) {
  const [search, setSearch] = useState(value);
  const [active, setActive] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const initialLoadDone = useRef(false);

  useEffect(() => {
    // Only load from localStorage on initial mount
    if (!initialLoadDone.current) {
      const saved = localStorage.getItem(localStorageKey);
      if (saved) {
        setSearch(saved);
        setValue(saved);
      }
      initialLoadDone.current = true;
    }
  }, [localStorageKey, setValue]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setActive(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Update search when value changes externally
  useEffect(() => {
    setSearch(value);
  }, [value]);

  const filtered = characters.filter(char => 
    char.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="character-select">
      <label>{label}</label>
      <div className="custom-select" ref={ref}>
        <input
          type="text"
          className="search-input"
          placeholder="Search character..."
          value={search}
          onChange={e => {
            setSearch(e.target.value);
            setActive(true);
          }}
          onFocus={() => setActive(true)}
          autoComplete="off"
        />
        {active && (
          <div className="character-list">
            {filtered.map(char => (
              <div
                key={char}
                className="character-option"
                onClick={() => {
                  setSearch(char);
                  setValue(char);
                  localStorage.setItem(localStorageKey, char);
                  setActive(false);
                }}
              >
                {char}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export interface MatchLoggerProps {
  onMatchLogged?: () => void;
  onCharacterSelect?: (player1Char: string, player2Char: string) => void;
}

export default function MatchLogger({ onMatchLogged, onCharacterSelect }: MatchLoggerProps) {
  const { user } = useAuth();
  const [player1Character, setPlayer1Character] = useState('');
  const [player2Character, setPlayer2Character] = useState('');
  const [stage, setStage] = useState('');
  const [winner, setWinner] = useState<number | null>(null);
  const [stocks, setStocks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Make success message disappear after 2 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Add effect to notify parent of character selections
  useEffect(() => {
    if (onCharacterSelect) {
      onCharacterSelect(player1Character, player2Character);
    }
  }, [player1Character, player2Character, onCharacterSelect]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!player1Character) return setError("Please select your character");
    if (!player2Character) return setError("Please select opponent's character");
    if (!stage) return setError("Please select a stage");
    if (winner === null) return setError("Please select a winner");
    if (!stocks) return setError("Please select stocks remaining");
    setSubmitting(true);
    try {
      const formData = {
        player1_character: player1Character,
        player2_character: player2Character,
        stage: stage.trim(),
        winner_id: winner,
        stocks_remaining: parseInt(stocks),
        player2_id: winner === user?.id ? user.id : (user?.id === 1 ? 2 : 1) // Temporary: assumes opponent is the other user
      };
      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        throw new Error('Server returned an invalid response.');
      }
      if (!res.ok) throw new Error(data.error || 'Failed to log match');
      setSuccess('Match logged successfully!');
      setStage('');
      setWinner(null);
      setStocks('');
      // Don't clear character selections (per original logic)
      if (onMatchLogged) onMatchLogged();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return <div>Please log in to log matches.</div>;
  }

  return (
    <div className="match-logger">
      <div className="match-form">
        <h2>Log a Match</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="player-section">
              <h3>You ({user.display_name})</h3>
              <CharacterSearch 
                label="Character" 
                value={player1Character} 
                setValue={setPlayer1Character} 
                localStorageKey="player1Character" 
              />
            </div>
            <div className="player-section">
              <h3>Opponent</h3>
              <CharacterSearch 
                label="Character" 
                value={player2Character} 
                setValue={setPlayer2Character} 
                localStorageKey="player2Character" 
              />
            </div>
          </div>

          <div className="form-row">
            <label>Stage</label>
            <select value={stage} onChange={e => setStage(e.target.value)} required>
              <option value="">Select stage...</option>
              {stages.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <label>Winner</label>
            <div className="winner-buttons">
              <button
                type="button"
                className={winner === user.id ? 'selected' : ''}
                onClick={() => setWinner(user.id)}
              >
                You
              </button>
              <button
                type="button"
                className={winner === (user.id === 1 ? 2 : 1) ? 'selected' : ''}
                onClick={() => setWinner(user.id === 1 ? 2 : 1)}
              >
                Opponent
              </button>
            </div>
          </div>

          <div className="form-row">
            <label>Winner's Stocks Remaining</label>
            <select value={stocks} onChange={e => setStocks(e.target.value)} required>
              <option value="">Select stocks...</option>
              {[1, 2, 3].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <button type="submit" disabled={submitting} className="submit-button">
            {submitting ? 'Logging...' : 'Log Match'}
          </button>
        </form>
      </div>
    </div>
  );
} 