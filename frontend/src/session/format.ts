// Small formatting helpers for the Session screens.
import type { Match } from '../types';

/** "2025-12-11 21:05:18" -> "21:05". Falls back to the raw string on parse fail. */
export function matchTime(datetime: string): string {
  const m = /\b(\d{2}):(\d{2})/.exec(datetime);
  return m ? `${m[1]}:${m[2]}` : datetime;
}

/** Minutes -> "1h 04m" / "52m". */
export function formatDuration(minutes: number): string {
  if (!minutes || minutes < 1) return '0m';
  let h = Math.floor(minutes / 60);
  let m = Math.round(minutes % 60);
  if (m === 60) {
    h += 1;
    m = 0;
  }
  if (h === 0) return `${m}m`;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

function parseDate(startTime: string | null): Date | null {
  if (!startTime) return null;
  const d = new Date(startTime.replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** A friendly session label from its start time, e.g. "Friday Night Set". */
export function sessionDisplayName(startTime: string | null): string {
  const d = parseDate(startTime);
  if (!d) return 'Session';
  const weekday = d.toLocaleDateString(undefined, { weekday: 'long' });
  const hour = d.getHours();
  const part = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : hour < 21 ? 'Night' : 'Late Night';
  return `${weekday} ${part} Set`;
}

/** "DEC" / "11" stack parts for a session date. */
export function monthDay(startTime: string | null): { mon: string; day: string } {
  const d = parseDate(startTime);
  if (!d) return { mon: '', day: '' };
  return { mon: d.toLocaleDateString(undefined, { month: 'short' }).toUpperCase(), day: String(d.getDate()) };
}

/** Coerce a possibly-string/nullable stocks value to a finite number, or null. */
export function parseStocks(stocks: Match['stocks_remaining']): number | null {
  const n = typeof stocks === 'string' ? parseFloat(stocks) : stocks;
  return Number.isFinite(n) ? n : null;
}

/** Coerce a possibly-string/nullable stocks value to a display string. */
export function stocksLabel(stocks: number | string | null): string {
  if (stocks == null || stocks === '') return '–';
  const n = parseStocks(stocks);
  return n === null ? '–' : String(Math.round(n));
}
