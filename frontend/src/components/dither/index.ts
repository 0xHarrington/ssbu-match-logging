// Vendored from https://github.com/Boring-Software-Inc/dither-kit (MIT),
// upstream commit 9fb0b14. Local changes: Tailwind utilities replaced by the
// scoped dither.css (Gruvbox values), cn() drops tailwind-merge, palette
// retuned to Gruvbox, and the standalone avatar/button/gradient components
// are not vendored. Aesthetic credit: Evil Charts (evilcharts.com).
export { Line, type SeriesProps } from "./area"
export { LineChart } from "./area-chart"
export { Bar, type BarProps } from "./bar"
export { BarChart } from "./bar-chart"
export type { CartesianChartProps } from "./cartesian-root"
export type {
  AreaVariant,
  ChartConfig,
  ChartType,
  Margins,
  SeriesKind,
  StrokeVariant,
} from "./chart-context"
export type {
  BloomBlend,
  BloomConfig,
  BloomInput,
  BloomLevel,
} from "./dither-paint"
export { ActiveDot } from "./dot"
export { Grid } from "./grid"
export { Legend } from "./legend"
export type { DitherColor } from "./palette"
export type { PixelBloom, PixelColor } from "./pixel"
export { Pie, type PieProps } from "./pie"
export { PieChart, type PieChartProps } from "./pie-chart"
export type { StackType } from "./scales"
export { Tooltip, type TooltipVariant } from "./tooltip"
export { XAxis } from "./x-axis"
export { YAxis } from "./y-axis"
export { DitherHeatmap, type DitherHeatmapCell, type DitherHeatmapProps } from "./dither-heatmap"
