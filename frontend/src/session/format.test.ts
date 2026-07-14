// Characterization + regression tests for the Session screens' formatting
// helpers. Pure functions, no DOM/network — plain vitest.
import { describe, it, expect } from 'vitest';
import { matchTime, formatDuration, sessionDisplayName, stocksLabel, parseStocks } from './format';

describe('matchTime', () => {
  it('extracts HH:MM from a "YYYY-MM-DD HH:MM:SS" datetime', () => {
    expect(matchTime('2025-12-11 21:05:18')).toBe('21:05');
  });

  it('falls back to the raw string when no HH:MM pattern is found', () => {
    expect(matchTime('not-a-date')).toBe('not-a-date');
  });
});

describe('formatDuration', () => {
  it('returns "0m" for falsy or sub-minute durations', () => {
    expect(formatDuration(0)).toBe('0m');
    expect(formatDuration(0.5)).toBe('0m');
  });

  it('formats durations under an hour as "Nm"', () => {
    expect(formatDuration(52)).toBe('52m');
  });

  it('formats durations over an hour as "Hh MMm", zero-padded', () => {
    expect(formatDuration(64)).toBe('1h 04m');
  });

  it('carries a rounded 60m into the next hour instead of showing "1h 60m"', () => {
    expect(formatDuration(119.7)).toBe('2h 00m');
  });
});

describe('sessionDisplayName', () => {
  it('returns "Session" when there is no start time', () => {
    expect(sessionDisplayName(null)).toBe('Session');
  });

  it('labels morning/afternoon/night/late-night by hour', () => {
    expect(sessionDisplayName('2025-12-11 09:30:00')).toBe('Thursday Morning Set');
    expect(sessionDisplayName('2025-12-11 14:00:00')).toBe('Thursday Afternoon Set');
    expect(sessionDisplayName('2025-12-11 18:00:00')).toBe('Thursday Night Set');
    expect(sessionDisplayName('2025-12-11 22:30:00')).toBe('Thursday Late Night Set');
  });
});

describe('parseStocks', () => {
  it('returns null for null', () => {
    expect(parseStocks(null)).toBeNull();
  });

  it('passes through a finite number', () => {
    expect(parseStocks(2)).toBe(2);
    expect(parseStocks(2.7)).toBe(2.7);
  });

  it('parses a numeric string', () => {
    expect(parseStocks('1')).toBe(1);
  });

  it('returns null for a non-numeric string', () => {
    expect(parseStocks('abc')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(parseStocks('')).toBeNull();
  });
});

describe('stocksLabel', () => {
  it('renders an em dash for null/empty', () => {
    expect(stocksLabel(null)).toBe('–');
    expect(stocksLabel('')).toBe('–');
  });

  it('rounds a numeric value to a string', () => {
    expect(stocksLabel(2)).toBe('2');
    expect(stocksLabel(2.6)).toBe('3');
  });

  it('parses numeric strings', () => {
    expect(stocksLabel('1')).toBe('1');
  });

  it('renders an em dash for non-numeric strings', () => {
    expect(stocksLabel('abc')).toBe('–');
  });
});
