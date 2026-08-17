// Shared row contract for the dither chart engine. Rows are caller-supplied
// records — a label column plus numeric series values — and the engine only
// ever reads label-ish strings and finite numbers from them, so the value
// contract is this closed union rather than `unknown`.
export type RowValue = string | number | boolean | Date | null | undefined

export type Row = Record<string, RowValue>

/** Narrow a row value to a number (tooltip/series reads). */
export const isRowNumber = (value: RowValue): value is number =>
  typeof value === "number"

/** Narrow a row value to a finite number (scale math). */
export const isFiniteRowNumber = (value: RowValue): value is number =>
  typeof value === "number" && Number.isFinite(value)
