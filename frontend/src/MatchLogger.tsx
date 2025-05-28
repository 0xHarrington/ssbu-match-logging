import React, { useState, useEffect, useRef } from 'react';
import CharacterDisplay from './components/CharacterDisplay';

// Import stage images
import bfImage from './assets/stages/bf.avif';
import fdImage from './assets/stages/fd.avif';
import ps2Image from './assets/stages/ps2.avif';
import sbfImage from './assets/stages/sbf.avif';
import tncImage from './assets/stages/tnc.avif';
import kalosImage from './assets/stages/kalos.avif';
import hollowImage from './assets/stages/hollow.avif';
import yoshisImage from './assets/stages/yoshis.avif';
import smashvilleImage from './assets/stages/smashville.avif';

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

// Stage image mapping
const stageImages: { [key: string]: string } = {
  'Battlefield': bfImage,
  'Small Battlefield': sbfImage,
  'Final Destination': fdImage,
  'Pokemon Stadium 2': ps2Image,
  'Smashville': smashvilleImage,
  'Town & City': tncImage,
  'Kalos Pokemon League': kalosImage,
  'Yoshi\'s Story': yoshisImage,
  'Hollow Bastion': hollowImage,
};

function CharacterSearch({ label, value, setValue, localStorageKey }: {
  label: string;
  value: string;
  setValue: (v: string) => void;
  localStorageKey: string;
}) {
  const [search, setSearch] = useState(value);
  const [active, setActive] = useState(false);
  const [characterData, setCharacterData] = useState<{
    shayne: { [key: string]: number };
    matt: { [key: string]: number };
    all_characters: string[];
  } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const initialLoadDone = useRef(false);

  useEffect(() => {
    // Fetch character data on component mount
    fetch('/api/characters')
      .then(res => res.json())
      .then(data => setCharacterData(data))
      .catch(err => console.error('Error fetching character data:', err));
  }, []);

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

  const getSortedCharacters = () => {
    if (!characterData) return [];

    const isShayneSearch = localStorageKey === 'shayneCharacter';
    const playerData = isShayneSearch ? characterData.shayne : characterData.matt;
    
    // Filter characters based on search
    const filtered = characterData.all_characters.filter(char => 
      char.toLowerCase().includes(search.toLowerCase())
    );

    // Sort characters: first by usage (descending), then alphabetically for unused characters
    return filtered.sort((a, b) => {
      const usageA = playerData[a] || 0;
      const usageB = playerData[b] || 0;
      if (usageA !== usageB) return usageB - usageA;
      return a.localeCompare(b);
    });
  };

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
            {getSortedCharacters().map(char => {
              const isShayneSearch = localStorageKey === 'shayneCharacter';
              const usageCount = characterData ? 
                (isShayneSearch ? characterData.shayne[char] : characterData.matt[char]) || 0 
                : 0;
              
              return (
                <div
                  key={char}
                  className={`character-option ${isShayneSearch ? 'shayne' : 'matt'}`}
                  onClick={() => {
                    setSearch(char);
                    setValue(char);
                    localStorage.setItem(localStorageKey, char);
                    setActive(false);
                  }}
                >
                  <CharacterDisplay character={char} />
                  {usageCount > 0 && (
                    <span className="character-usage-count">
                      ({usageCount})
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export interface MatchLoggerProps {
  onMatchLogged?: () => void;
  onCharacterSelect?: (shayneChar: string, mattChar: string) => void;
  selectedCharacters?: {
    shayneCharacter: string;
    mattCharacter: string;
  };
}

export default function MatchLogger({ onMatchLogged, onCharacterSelect, selectedCharacters }: MatchLoggerProps) {
  const [shayneCharacter, setShayneCharacter] = useState(selectedCharacters?.shayneCharacter || '');
  const [mattCharacter, setMattCharacter] = useState(selectedCharacters?.mattCharacter || '');
  const [stage, setStage] = useState('');
  const [winner, setWinner] = useState('');
  const [stocks, setStocks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Update local state when selectedCharacters prop changes
  useEffect(() => {
    if (selectedCharacters) {
      if (selectedCharacters.shayneCharacter !== shayneCharacter) {
        setShayneCharacter(selectedCharacters.shayneCharacter);
      }
      if (selectedCharacters.mattCharacter !== mattCharacter) {
        setMattCharacter(selectedCharacters.mattCharacter);
      }
    }
  }, [selectedCharacters]);

  // Make success message disappear after 2 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Notify parent of character selections, but only when they actually change
  const handleShayneCharacterChange = (char: string) => {
    setShayneCharacter(char);
    if (onCharacterSelect && char !== shayneCharacter) {
      onCharacterSelect(char, mattCharacter);
    }
  };

  const handleMattCharacterChange = (char: string) => {
    setMattCharacter(char);
    if (onCharacterSelect && char !== mattCharacter) {
      onCharacterSelect(shayneCharacter, char);
    }
  };

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
              <h3>Shayne</h3>
              <CharacterSearch 
                label="Character" 
                value={shayneCharacter} 
                setValue={handleShayneCharacterChange} 
                localStorageKey="shayneCharacter" 
              />
            </div>
            <div className="player-section">
              <h3>Matt</h3>
              <CharacterSearch 
                label="Character" 
                value={mattCharacter} 
                setValue={handleMattCharacterChange} 
                localStorageKey="mattCharacter" 
              />
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
                  style={{
                    backgroundImage: `url(${stageImages[s]})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    zIndex: 1,
                  }} />
                  <span className="stage-name" style={{ position: 'relative', zIndex: 2 }}>{s}</span>
                </button>
              ))}
            </div>
          </div>
          <input type="hidden" name="stage" value={stage} />
          
          <div className="form-grid">
            <div className="player-section">
              <h3>Winner</h3>
              <div className="radio-group">
                <div className="radio-button">
                  <input type="radio" id="winner-shayne" name="winner" value="Shayne" checked={winner === 'Shayne'} onChange={() => setWinner('Shayne')} required />
                  <label htmlFor="winner-shayne" className="shayne">Shayne</label>
                </div>
                <div className="radio-button">
                  <input type="radio" id="winner-matt" name="winner" value="Matt" checked={winner === 'Matt'} onChange={() => setWinner('Matt')} required />
                  <label htmlFor="winner-matt" className="matt">Matt</label>
                </div>
              </div>
            </div>
            <div className="player-section">
              <h3>Stocks Remaining</h3>
              <div className="stocks-buttons">
                {[1, 2, 3].map(n => (
                  <button
                    type="button"
                    key={n}
                    className={`stocks-button${stocks === String(n) ? ' selected' : ''}`}
                    onClick={() => setStocks(String(n))}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && <div className="error" style={{ marginTop: 16 }}>{error}</div>}
          {success && <div className="success" style={{ marginTop: 16 }}>{success}</div>}
          <button type="submit" className="submit-button" disabled={submitting}>
            {submitting ? 'Logging...' : 'Log Match'}
          </button>
        </form>
      </div>
    </div>
  );
} 