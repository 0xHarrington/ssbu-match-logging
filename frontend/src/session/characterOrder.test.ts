// Unit tests for the character pickers' usage-based fighter ordering.
// Pure function, no DOM/network — plain vitest.
import { describe, it, expect } from 'vitest';
import { byUsage } from './characterOrder';

// Fighter-number order, as characters.json serves it.
const ROSTER = ['Mario', 'Donkey Kong', 'Link', 'Samus'];

describe('byUsage', () => {
  it('orders the roster from most-picked to least-picked', () => {
    expect(byUsage(ROSTER, { Mario: 2, 'Donkey Kong': 9, Link: 5, Samus: 0 })).toEqual([
      'Donkey Kong',
      'Link',
      'Mario',
      'Samus',
    ]);
  });

  it('keeps fighter-number order among characters with equal counts', () => {
    expect(byUsage(ROSTER, { Mario: 3, 'Donkey Kong': 3, Link: 3, Samus: 3 })).toEqual(ROSTER);
  });

  it('leaves never-played fighters in fighter-number order at the tail', () => {
    expect(byUsage(ROSTER, { Link: 4 })).toEqual(['Link', 'Mario', 'Donkey Kong', 'Samus']);
  });

  it('returns the roster unchanged when usage is missing or empty', () => {
    expect(byUsage(ROSTER)).toEqual(ROSTER);
    expect(byUsage(ROSTER, {})).toEqual(ROSTER);
  });

  it('ignores counts for characters absent from the roster', () => {
    expect(byUsage(ROSTER, { Kirby: 99, Samus: 1 })).toEqual([
      'Samus',
      'Mario',
      'Donkey Kong',
      'Link',
    ]);
  });

  it('does not mutate the roster it was given', () => {
    const roster = [...ROSTER];
    byUsage(roster, { Samus: 7, Mario: 1 });
    expect(roster).toEqual(ROSTER);
  });
});
