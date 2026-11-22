'use client';

import type { CoordinatePlane } from '@medu/lerno';

import { sceneColors } from '../theme.js';
/** Props accepted by `CoordinateGrid`. */
export interface CoordinateGridProps {
  plane: CoordinatePlane;
  showLabels?: boolean;
}

/**
 * Draws axes and grid lines for a coordinate plane.
 * The grid reads its ranges from the plane, so axis labels always match the curve.
 */
export function CoordinateGrid({ plane, showLabels = true }: CoordinateGridProps) {
  const { gridLines, ticks, xAxis, yAxis } = plane.renderSvgElements();

  return (
    <g className="lerno-coordinate-grid">
      {gridLines.map((line, index) => (
        <line
          key={`grid-${index}`}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke={sceneColors.grid}
          strokeWidth={1}
          strokeDasharray="4 4"
        />
      ))}

      <line x1={xAxis.x1} y1={xAxis.y1} x2={xAxis.x2} y2={xAxis.y2} stroke={sceneColors.axis} strokeWidth={2} />
      <line x1={yAxis.x1} y1={yAxis.y1} x2={yAxis.x2} y2={yAxis.y2} stroke={sceneColors.axis} strokeWidth={2} />

      {showLabels
        ? ticks.map((tick, index) => (
            <text
              key={`tick-${index}`}
              x={tick.px}
              y={tick.py}
              fill={sceneColors.muted}
              fontSize={14}
              textAnchor="middle"
            >
              {tick.label}
            </text>
          ))
        : null}
    </g>
  );
}
