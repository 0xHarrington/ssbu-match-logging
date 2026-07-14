// LOCAL EXTENSION — not part of upstream dither-kit. A day×hour heatmap in the
// same ordered-dither texture, built on the kit's pixel primitives so it reads
// as one family with the vendored charts. Replaces the former ECharts heatmaps.
import { useEffect, useRef, useState } from "react"
import { BAYER4, clamp01 } from "./pixel"
import { type DitherColor, PALETTE, rgb } from "./palette"
import "./dither.css"

export interface DitherHeatmapCell {
  day: number // 0 (Sun) – 6 (Sat)
  hour: number // 0–23
  winRate: number | null // 0–100, null = no data
  games: number
}

export interface DitherHeatmapProps {
  cells: DitherHeatmapCell[]
  height?: number
  lowColor?: DitherColor
  highColor?: DitherColor
  /** Label for the tooltip metric, e.g. "win rate" */
  metricLabel?: string
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const LEFT = 36 // px reserved for day labels
const BOTTOM = 18 // px reserved for hour labels
const GAP = 2 // px between cells
const DITHER = 2 // css px per dither cell (matches the kit's CELL)

export function DitherHeatmap({
  cells,
  height = 260,
  lowColor = "red",
  highColor = "green",
  metricLabel = "win rate",
}: DitherHeatmapProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [width, setWidth] = useState(0)
  const [hover, setHover] = useState<{
    x: number
    y: number
    cell: DitherHeatmapCell
  } | null>(null)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  const maxGames = Math.max(1, ...cells.map((c) => c.games))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || width === 0) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)

    const gridW = width - LEFT
    const gridH = height - BOTTOM
    const cw = gridW / 24
    const ch = gridH / 7

    const low = PALETTE[lowColor]
    const high = PALETTE[highColor]
    const byPos = new Map(cells.map((c) => [`${c.day}-${c.hour}`, c]))

    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const x0 = LEFT + hour * cw
        const y0 = day * ch
        const w = cw - GAP
        const h = ch - GAP
        const cell = byPos.get(`${day}-${hour}`)

        if (!cell || cell.winRate == null || cell.games === 0) {
          ctx.fillStyle = "rgba(80, 73, 69, 0.25)" // empty: faint gruvbox bg2
          ctx.fillRect(x0, y0, w, h)
          continue
        }

        const t = clamp01(cell.winRate / 100)
        // More games -> denser, more confident cell
        const weight = 0.55 + 0.45 * clamp01(cell.games / maxGames)
        const cols = Math.max(1, Math.floor(w / DITHER))
        const rows = Math.max(1, Math.floor(h / DITHER))
        for (let cy = 0; cy < rows; cy++) {
          for (let cx = 0; cx < cols; cx++) {
            // Ordered dither: threshold decides low- vs high-seed pixel
            const threshold = BAYER4[cy & 3][cx & 3]
            const seed = t > threshold ? high : low
            const bright = t > threshold ? t : 1 - t
            ctx.fillStyle = rgb(seed.fill, 0.55 + 0.45 * bright, weight)
            ctx.fillRect(
              x0 + cx * DITHER,
              y0 + cy * DITHER,
              Math.min(DITHER, w - cx * DITHER),
              Math.min(DITHER, h - cy * DITHER)
            )
          }
        }
      }
    }

    // Labels
    ctx.fillStyle = "#a89984"
    ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace"
    ctx.textBaseline = "middle"
    DAYS.forEach((d, i) => ctx.fillText(d, 0, i * ch + ch / 2))
    ctx.textBaseline = "top"
    for (let hour = 0; hour < 24; hour += 3) {
      ctx.fillText(String(hour), LEFT + hour * cw, height - BOTTOM + 4)
    }
  }, [cells, width, height, lowColor, highColor, maxGames])

  const handleMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top
    const cw = (width - LEFT) / 24
    const ch = (height - BOTTOM) / 7
    const hour = Math.floor((px - LEFT) / cw)
    const day = Math.floor(py / ch)
    if (hour < 0 || hour > 23 || day < 0 || day > 6) return setHover(null)
    const cell = cells.find((c) => c.day === day && c.hour === hour)
    if (!cell || cell.winRate == null || cell.games === 0) return setHover(null)
    setHover({ x: px, y: py, cell })
  }

  return (
    <div
      ref={wrapRef}
      className="dither-root"
      style={{ height, position: "relative", width: "100%" }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block" }}
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
      />
      {hover && (
        <div
          className="pointer-events-none absolute z-10 rounded-md border bg-popover px-2 py-1 shadow-sm font-mono text-[11px] text-popover-foreground"
          style={{
            left: Math.min(hover.x + 10, width - 150),
            top: Math.max(hover.y - 34, 0),
          }}
        >
          {DAYS[hover.cell.day]} {String(hover.cell.hour).padStart(2, "0")}:00 —{" "}
          {Math.round(hover.cell.winRate ?? 0)}% {metricLabel} (
          {hover.cell.games} games)
        </div>
      )}
    </div>
  )
}
