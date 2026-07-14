// Small formatting helpers for the Session screens.

/** "2025-12-11 21:05:18" -> "21:05". Falls back to the raw string on parse fail. */
export function matchTime(datetime: string): string {
  const m = /\b(\d{2}):(\d{2})/.exec(datetime);
  return m ? `${m[1]}:${m[2]}` : datetime;
}

/** Minutes -> "1h 04m" / "52m". */
export function formatDuration(minutes: number): string {
  if (!minutes || minutes < 1) return '0m';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

/** Coerce a possibly-string/nullable stocks value to a display string. */
export function stocksLabel(stocks: number | string | null): string {
  if (stocks == null || stocks === '') return '–';
  const n = typeof stocks === 'string' ? parseFloat(stocks) : stocks;
  return Number.isFinite(n) ? String(Math.round(n)) : '–';
}
