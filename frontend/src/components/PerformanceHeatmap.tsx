import React from 'react';
import { DitherHeatmap, type DitherHeatmapCell } from './dither';

interface HeatmapProps {
  data: Array<{
    hour: number;
    day: number;
    win_rate: number;
    game_count: number;
  }> | null;
  usingSimulatedData: boolean;
  username?: string;
  character?: string;
  height?: string;
}

// Seeded random number generator for consistent simulated data
function seededRandom(seed: number) {
  let value = seed;
  return function() {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

// Simulated fallback: realistic gaming patterns (higher activity in evenings)
function buildSimulatedCells(seed: number): DitherHeatmapCell[] {
  const random = seededRandom(seed);
  const cells: DitherHeatmapCell[] = [];

  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      let baseValue = random() * 40;
      let gameCount = Math.floor(random() * 5);

      if (h >= 18 && h <= 23) {
        baseValue += 40; // Evening boost
        gameCount += Math.floor(random() * 20) + 5;
      } else if (h >= 12 && h < 18) {
        baseValue += 20; // Afternoon boost
        gameCount += Math.floor(random() * 10) + 2;
      } else if (h >= 0 && h < 6) {
        baseValue -= 20; // Late night penalty
        gameCount = Math.floor(random() * 3);
      }

      const winRate = Math.max(0, Math.min(100, baseValue + random() * 30));
      cells.push({
        day: d,
        hour: h,
        winRate: gameCount === 0 ? null : Math.round(winRate),
        games: gameCount
      });
    }
  }

  return cells;
}

export const PerformanceHeatmap: React.FC<HeatmapProps> = ({
  data,
  usingSimulatedData,
  username,
  character,
  height = '260px'
}) => {
  const cells: DitherHeatmapCell[] =
    data && !usingSimulatedData
      ? data.map(item => ({
          day: item.day,
          hour: item.hour,
          winRate: item.game_count === 0 ? null : item.win_rate,
          games: item.game_count
        }))
      : buildSimulatedCells(
          (username?.charCodeAt(0) || 0) * 1000 + (character?.charCodeAt(0) || 0)
        );

  const heightPx = Number.parseInt(height, 10) || 260;

  return <DitherHeatmap cells={cells} height={heightPx} metricLabel="win rate" />;
};
