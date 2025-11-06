import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

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

export const PerformanceHeatmap: React.FC<HeatmapProps> = ({
  data,
  usingSimulatedData,
  username,
  character,
  height = '260px'
}) => {
  const heatmapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!heatmapRef.current) return;

    const chart = echarts.init(heatmapRef.current);
    
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const hours = Array.from({ length: 24 }, (_, i) => {
      if (i === 0) return '12a';
      if (i < 12) return `${i}a`;
      if (i === 12) return '12p';
      return `${i - 12}p`;
    });
    
    // Format: [hour, day, winRate, gameCount]
    let chartData: [number, number, number, number][] = [];
    let maxGames = 30;
    
    if (data && !usingSimulatedData) {
      // Use real data from backend
      chartData = data.map((item: any) => [
        item.hour,
        item.day,
        item.win_rate,
        item.game_count
      ]);
      
      // Calculate actual max games for normalization
      maxGames = Math.max(...data.map((item: any) => item.game_count), 1);
    } else {
      // Use seeded random data for consistent display
      const seed = (username?.charCodeAt(0) || 0) * 1000 + (character?.charCodeAt(0) || 0);
      const random = seededRandom(seed);
      
      for (let d = 0; d < 7; d++) {
        for (let h = 0; h < 24; h++) {
          // Simulate realistic gaming patterns (higher activity in evenings)
          let baseValue = random() * 40;
          let gameCount = Math.floor(random() * 5); // Base game count
          
          if (h >= 18 && h <= 23) {
            baseValue += 40; // Evening boost
            gameCount += Math.floor(random() * 20) + 5; // More games in evening
          } else if (h >= 12 && h < 18) {
            baseValue += 20; // Afternoon boost
            gameCount += Math.floor(random() * 10) + 2; // Some games in afternoon
          } else if (h >= 0 && h < 6) {
            baseValue -= 20; // Late night penalty
            gameCount = Math.floor(random() * 3); // Very few games late night
          }
          
          const winRate = Math.max(0, Math.min(100, baseValue + (random() * 30)));
          chartData.push([h, d, Math.round(winRate), gameCount]);
        }
      }
    }

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        position: 'top',
        backgroundColor: '#3c3836',
        borderColor: '#504945',
        textStyle: { color: '#ebdbb2', fontSize: 11 },
        formatter: (params: any) => {
          const winRate = params.value[2];
          const games = params.value[3];
          if (games === 0) {
            return `${days[params.value[1]]} ${hours[params.value[0]]}<br/>No games played`;
          }
          return `${days[params.value[1]]} ${hours[params.value[0]]}<br/>Win Rate: ${winRate}%<br/>Games: ${games}`;
        }
      },
      grid: { left: '8%', right: '2%', top: '3%', bottom: '15%', containLabel: true },
      xAxis: {
        type: 'category',
        data: hours,
        splitArea: { show: false },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { 
          color: '#a89984', 
          fontSize: 9,
          interval: 2, // Show every 3rd hour
          rotate: 0
        }
      },
      yAxis: {
        type: 'category',
        data: days,
        splitArea: { show: false },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#a89984', fontSize: 10 },
        inverse: true // Display from top to bottom (Sunday at top, Saturday at bottom)
      },
      visualMap: {
        show: false, // Hide the visual map since we're using custom colors
        min: 0,
        max: 100
      },
      series: [{
        type: 'heatmap',
        data: chartData.map(item => {
          const [hour, day, winRate, gameCount] = item;
          
          // Special handling for cells with no games
          if (gameCount === 0) {
            // Use neutral yellow color with very low opacity
            return {
              value: [hour, day, 50, 0], // Show as 50% win rate
              itemStyle: {
                color: 'rgba(250, 189, 47, 0.05)' // Yellow with 5% opacity
              }
            };
          }
          
          // Calculate brightness based on game count (0.3 to 1.0)
          // More games = brighter, fewer games = darker
          const brightness = Math.max(0.3, Math.min(1.0, gameCount / maxGames));
          
          // Determine color based on win rate
          let baseColor;
          if (winRate < 35) {
            baseColor = [251, 73, 52]; // Red (#fb4934)
          } else if (winRate < 45) {
            baseColor = [254, 128, 25]; // Orange (#fe8019)
          } else if (winRate < 55) {
            baseColor = [250, 189, 47]; // Yellow (#fabd2f)
          } else if (winRate < 65) {
            baseColor = [184, 187, 38]; // Light green (#b8bb26)
          } else {
            baseColor = [152, 151, 26]; // Dark green (#98971a)
          }
          
          // Apply brightness to the color
          const adjustedColor = baseColor.map(c => Math.round(c * brightness));
          const colorString = `rgb(${adjustedColor[0]}, ${adjustedColor[1]}, ${adjustedColor[2]})`;
          
          return {
            value: [hour, day, winRate, gameCount],
            itemStyle: {
              color: colorString
            }
          };
        }),
        label: { show: false },
        itemStyle: {
          borderColor: '#282828',
          borderWidth: 1
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
            borderColor: '#fbf1c7',
            borderWidth: 2
          }
        }
      }]
    });

    return () => chart.dispose();
  }, [data, usingSimulatedData, username, character, height]);

  return <div ref={heatmapRef} style={{ height, width: '100%' }}></div>;
};

