// CharToken — a character avatar in a player-colored rounded frame.
//
// Renders the roster icon via the existing import.meta.glob resolver and
// falls back to the character's initial when no art resolves.
import type { CSSProperties } from 'react';
import { getCharacterIconUrl } from '../../components/CharacterDisplay';
import { PLAYER_HEX } from '../palette';
import type { Player } from '../../types';

interface CharTokenProps {
  character: string;
  player: Player;
  size?: number;
  radius?: number;
  glow?: boolean;
  style?: CSSProperties;
}

export default function CharToken({
  character,
  player,
  size = 52,
  radius,
  glow = false,
  style,
}: CharTokenProps) {
  const color = PLAYER_HEX[player];
  const iconUrl = character ? getCharacterIconUrl(character) : undefined;
  const r = radius ?? Math.round(size * 0.27);

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: r,
        background: 'radial-gradient(circle at 50% 32%,#3c3836,#221f1e)',
        border: `2px solid ${color}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: '0 0 auto',
        overflow: 'hidden',
        boxShadow: glow ? `0 0 30px -6px ${color}80` : undefined,
        ...style,
      }}
    >
      {iconUrl ? (
        <img
          src={iconUrl}
          alt={character}
          style={{
            width: '76%',
            height: '76%',
            objectFit: 'contain',
          }}
        />
      ) : (
        <span
          style={{
            color,
            fontWeight: 700,
            fontSize: Math.round(size * 0.42),
            fontFamily: 'var(--font-display)',
          }}
        >
          {(character || '?').charAt(0)}
        </span>
      )}
    </div>
  );
}
