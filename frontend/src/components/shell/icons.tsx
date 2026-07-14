// Minimal line icons for the shell nav. 18px, stroke = currentColor so the
// active/idle color is driven entirely by the link's text color.
import type { CSSProperties } from 'react';

interface IconProps {
  size?: number;
  style?: CSSProperties;
}

const base = (size: number, style?: CSSProperties) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  style,
});

export const SessionIcon = ({ size = 18, style }: IconProps) => (
  <svg {...base(size, style)}>
    <rect x="3" y="4" width="18" height="12" rx="2" />
    <path d="M8 20h8M12 16v4" />
  </svg>
);

export const StatsIcon = ({ size = 18, style }: IconProps) => (
  <svg {...base(size, style)}>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </svg>
);

export const CharactersIcon = ({ size = 18, style }: IconProps) => (
  <svg {...base(size, style)}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
);

export const SessionsIcon = ({ size = 18, style }: IconProps) => (
  <svg {...base(size, style)}>
    <rect x="3" y="4" width="18" height="17" rx="2" />
    <path d="M3 9h18M8 2v4M16 2v4" />
  </svg>
);

export const TearsheetIcon = ({ size = 18, style }: IconProps) => (
  <svg {...base(size, style)}>
    <path d="M6 2h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" />
    <path d="M14 2v6h6M9 13h6M9 17h6" />
  </svg>
);

export const MenuIcon = ({ size = 22, style }: IconProps) => (
  <svg {...base(size, style)}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

export const CloseIcon = ({ size = 22, style }: IconProps) => (
  <svg {...base(size, style)}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);
