import React, { useState, useEffect, useRef } from 'react';
import { useUser } from './App';

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
  "Kalos Pokemon League", "Yoshi's Story", "Hollow Bastion", "Northern Cave", "Yoshi's Island", "Lylat Cruise"
];

function CharacterSearch({ label, value, setValue, localStorageKey }: {
  label: string;
  value: string;
  setValue: (v: string) => void;
  localStorageKey: string;
}) {
  const [search, setSearch] = useState(value || '');
  const [active, setActive] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load saved character from localStorage
    const saved = localStorage.getItem(localStorageKey);
    if (saved) {
      setSearch(saved);
      setValue(saved);
    }
  }, [localStorageKey, setValue]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setActive(false);
      }
    }
    if (active) {
      document.addEventListener('mousedown', handleClick);
    } else {
      document.removeEventListener('mousedown', handleClick);
    }
    return () => document.removeEventListener('mousedown', handleClick);
  }, [active]);

  const filtered = characters.filter(char => char.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="character-select">
      <label>{label}</label>
      <div className="custom-select" ref={ref}>
        <input
          type="text"
          className="search-input"
          placeholder="Search character..."
          value={search}
          onFocus={() => setActive(true)}
          onChange={e => {
            setSearch(e.target.value);
            setValue(e.target.value);
          }}
          autoComplete="off"
        />
        <div className={`character-list${active ? ' active' : ''}`}
          style={{ display: active ? 'block' : 'none' }}>
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
      </div>
    </div>
  );
}

export default function MatchLogger({ onMatchLogged }: { onMatchLogged?: () => void }) {
  const { user } = useUser();
  const [shayneCharacter, setShayneCharacter] = useState('');
  const [mattCharacter, setMattCharacter] = useState('');
  const [stage, setStage] = useState('');
  const [winner, setWinner] = useState('');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!shayneCharacter) return setError("Please select Shayne's character");
    if (!mattCharacter) return setError("Please select Matt's character");
    if (!stage) return setError("Please select a stage");
    if (!winner) return setError("Please select a winner");
    if (!stocks) return setError("Please select stocks remaining");
    setSubmitting(true);
    try {
      const formData = {
        shayneCharacter,
        mattCharacter,
        stage: stage.trim(),
        winner,
        stocksRemaining: parseInt(stocks)
      };
      const res = await fetch('/api/log_game', {
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
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to log match');
      setSuccess('Match logged successfully!');
      setStage('');
      setWinner('');
      setStocks('');
      // Don't clear character selections (per original logic)
      if (onMatchLogged) onMatchLogged();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="match-logger">
      <div className="match-form">
        <h2>Log a Match</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="player-section">
              <h3>{user?.username}</h3>
              <CharacterSearch label="Character" value={shayneCharacter} setValue={setShayneCharacter} localStorageKey="shayneCharacter" />
            </div>
            <div className="player-section">
              <h3>Matt</h3>
              <CharacterSearch label="Character" value={mattCharacter} setValue={setMattCharacter} localStorageKey="mattCharacter" />
            </div>
          </div>
          <div className="stage-select">
            <label>Stage</label>
            <div className="stage-buttons">
              {stages.map(s => (
                <button
                  type="button"
                  key={s}
                  className={`stage-button${stage === s ? ' selected' : ''}`}
                  onClick={() => setStage(s)}
                >
                  <span className="stage-name">{s}</span>
                </button>
              ))}
            </div>
          </div>
          <input type="hidden" name="stage" value={stage} />
          <div className="match-details">
            <div className="winner-select">
              <label>Winner</label>
              <div className="radio-group">
                <div className="radio-button">
                  <input type="radio" id="winner-shayne" name="winner" value={user?.username} checked={winner === user?.username} onChange={() => setWinner(user?.username || '')} required />
                  <label htmlFor="winner-shayne" className="shayne">{user?.username}</label>
                </div>
                <div className="radio-button">
                  <input type="radio" id="winner-matt" name="winner" value="Matt" checked={winner === 'Matt'} onChange={() => setWinner('Matt')} required />
                  <label htmlFor="winner-matt" className="matt">Matt</label>
                </div>
              </div>
            </div>
            <div className="stocks-input">
              <label>Stocks Remaining</label>
              <input
                type="number"
                min="1"
                max="3"
                value={stocks}
                onChange={e => setStocks(e.target.value)}
                required
              />
            </div>
          </div>
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
          <button type="submit" disabled={submitting}>
            {submitting ? "Logging..." : "Log Match"}
          </button>
        </form>
      </div>
    </div>
  );
} 