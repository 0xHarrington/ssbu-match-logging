import React from 'react';

interface CharacterDisplayProps {
  character: string;
  className?: string;
  hideText?: boolean;
  textClassName?: string;
  iconClassName?: string;
}

const CharacterDisplay: React.FC<CharacterDisplayProps> = ({ 
  character, 
  className = '',
  hideText = false,
  textClassName = '',
  iconClassName = ''
}) => {
  // Handle special cases where the character name in the data doesn't match the filename
  const getIconFileName = (char: string) => {
    const specialCases: { [key: string]: string } = {
      'Mr. Game & Watch': 'MrGameWatch',
      'Rosalina & Luma': 'Rosalina',
      'Banjo & Kazooie': 'BanjoKazooie',
      'Pyra/Mythra': 'Pyra',
      'R.O.B.': 'ROB',
      'Dr. Mario': 'DrMario',
      'Zero Suit Samus': 'ZeroSuitSamus',
      'Mii Brawler': 'MiiFighter',
      'Mii Swordfighter': 'MiiSwordfighter',
      'Mii Gunner': 'MiiGunner',
      'Pokemon Trainer': 'PokemonTrainer',
      'King K. Rool': 'KingKRool',
      'Bowser Jr.': 'BowserJr',
      'Duck Hunt': 'DuckHunt',
      'Pac-Man': 'Pac-Man',
    };

    const fileName = specialCases[char] || char.replace(/[^a-zA-Z]/g, '');
    return `/src/assets/characters/${fileName}.png`;
  };

  return (
    <div className={`character-display ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
      <img 
        src={getIconFileName(character)} 
        alt={character} 
        className={iconClassName}
        style={{ 
          width: '24px', 
          height: '24px',
          objectFit: 'contain',
          verticalAlign: 'middle',
          background: 'none',
          border: 'none'
        }} 
      />
      {!hideText && <span className={textClassName}>{character}</span>}
    </div>
  );
};

export default CharacterDisplay; 