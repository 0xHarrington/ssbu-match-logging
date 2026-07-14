// Shared seed palette for the dither chart family. Mirrors the seeds in
// `dither-chart.tsx` so a series rendered through the composable engine reads
// with the exact same fill / line / star hues as the legacy sparkline.

export type Rgb = [number, number, number]

export type DitherColor =
  | "green"
  | "blue"
  | "purple"
  | "pink"
  | "orange"
  | "red"
  | "yellow"
  | "aqua"
  | "grey"

export type Seed = { fill: Rgb; line: Rgb; star: Rgb }

// Each seed: the area-fill hue, the bright series line, and the star sparkle.
export const PALETTE: Record<DitherColor, Seed> = {
  // Gruvbox retune (vendored change): fills sit on the gruvbox accents so
  // every chart reads in-theme; line/star are progressively brighter tints.
  green: { fill: [184, 187, 38], line: [215, 219, 90], star: [235, 238, 150] },
  blue: { fill: [131, 165, 152], line: [170, 200, 190], star: [208, 226, 220] },
  purple: { fill: [177, 98, 134], line: [211, 134, 155], star: [232, 180, 200] },
  pink: { fill: [211, 134, 155], line: [235, 175, 195], star: [246, 210, 226] },
  orange: { fill: [254, 128, 25], line: [255, 178, 100], star: [255, 214, 165] },
  red: { fill: [251, 73, 52], line: [255, 140, 120], star: [255, 192, 178] },
  yellow: { fill: [250, 189, 47], line: [255, 215, 110], star: [255, 236, 175] },
  aqua: { fill: [142, 192, 124], line: [180, 220, 162], star: [216, 240, 202] },
  // No-data: muted gruvbox gray so empty metrics read as "nothing here".
  grey: { fill: [146, 131, 116], line: [175, 162, 144], star: [205, 196, 180] },
}

export const rgb = ([r, g, b]: Rgb, k = 1, a = 1) =>
  `rgba(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)},${a})`

export const seedOfColor = (color: DitherColor): Seed => PALETTE[color]

export const isDitherColor = (value: unknown): value is DitherColor =>
  typeof value === "string" && value in PALETTE
