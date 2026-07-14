// useLogForm — shared state + submit for the match log form.
//
// Used by both the desktop log rail and the mobile Log tab so "Quick Rematch",
// defaults, and submission behave identically. Characters default to the
// on-deck (last-game) matchup for couch-fast logging; winner/stocks stay empty
// until the game is over.
import { useCallback, useEffect, useState } from 'react';
import { logGame } from '../lib/api';
import type { Player } from '../types';

export interface OnDeckSeed {
  shayneChar: string;
  mattChar: string;
  stage: string;
}

export interface LogFormState {
  shayneChar: string;
  mattChar: string;
  winner: Player | null;
  stocks: number | null;
  stage: string;
  submitting: boolean;
  error: string | null;
  ready: boolean;
  setShayneChar: (c: string) => void;
  setMattChar: (c: string) => void;
  setWinner: (w: Player) => void;
  setStocks: (s: number) => void;
  setStage: (s: string) => void;
  /** Pre-fill the matchup (chars + stage) from the last game; clear result. */
  quickRematch: (seed: OnDeckSeed) => void;
  /** POST the game. Returns the winner on success (for the undo toast). */
  submit: () => Promise<Player | null>;
}

const DEFAULT_STAGE = 'Battlefield';

export function useLogForm(seed: OnDeckSeed | null, onLogged: (winner: Player) => void): LogFormState {
  const [shayneChar, setShayneChar] = useState('');
  const [mattChar, setMattChar] = useState('');
  const [winner, setWinner] = useState<Player | null>(null);
  const [stocks, setStocks] = useState<number | null>(null);
  const [stage, setStage] = useState(DEFAULT_STAGE);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seeded, setSeeded] = useState(false);

  // Seed character/stage defaults once, when the on-deck matchup first arrives.
  useEffect(() => {
    if (!seeded && seed && (seed.shayneChar || seed.mattChar)) {
      setShayneChar(seed.shayneChar);
      setMattChar(seed.mattChar);
      if (seed.stage) setStage(seed.stage);
      setSeeded(true);
    }
  }, [seed, seeded]);

  const quickRematch = useCallback((s: OnDeckSeed) => {
    setShayneChar(s.shayneChar);
    setMattChar(s.mattChar);
    if (s.stage) setStage(s.stage);
    setWinner(null);
    setStocks(null);
    setError(null);
  }, []);

  const ready = Boolean(winner && stocks && shayneChar && mattChar && stage);

  const submit = useCallback(async (): Promise<Player | null> => {
    if (!winner || !stocks || !shayneChar || !mattChar || !stage) return null;
    setSubmitting(true);
    setError(null);
    try {
      await logGame({
        shayneCharacter: shayneChar,
        mattCharacter: mattChar,
        winner,
        stocksRemaining: stocks,
        stage,
      });
      // Keep chars + stage (likely rematch); clear the result.
      setWinner(null);
      setStocks(null);
      onLogged(winner);
      return winner;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log match');
      return null;
    } finally {
      setSubmitting(false);
    }
  }, [winner, stocks, shayneChar, mattChar, stage, onLogged]);

  return {
    shayneChar,
    mattChar,
    winner,
    stocks,
    stage,
    submitting,
    error,
    ready,
    setShayneChar,
    setMattChar,
    setWinner,
    setStocks,
    setStage,
    quickRematch,
    submit,
  };
}

/** The 8 active stages, in the picker order the design specifies. */
export const ACTIVE_STAGES: string[] = [
  'Battlefield',
  'Small Battlefield',
  'Final Destination',
  'Pokemon Stadium 2',
  'Smashville',
  'Town & City',
  'Kalos Pokemon League',
  'Hollow Bastion',
];
