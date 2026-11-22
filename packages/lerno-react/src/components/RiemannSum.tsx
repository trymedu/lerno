'use client';

import type { CoordinatePlane } from '@medu/lerno';
import { CalculusEngine } from '@medu/lerno';

import { sceneColors } from '../theme.js';
/** Props accepted by `RiemannSum`. */
export interface RiemannSumProps {
  plane: CoordinatePlane;
  fn: (x: number) => number;
  a: number;
  b: number;
  n?: number;
  method?: 'left' | 'right' | 'midpoint';
  color?: string;
}

/**
 * Draws the rectangles of a Riemann sum under a curve.
 * Rectangle count and sampling method come from the caller, which lets a lab
 * animate convergence while the axis stays fixed.
 */
export function RiemannSum({
  plane,
  fn,
  a,
  b,
  n = 10,
  method = 'left',
  color = sceneColors.primary,
}: RiemannSumProps) {
  const { rectangles } = CalculusEngine.getRiemannRectangles(plane, fn, a, b, n, method);

  return (
    <g className="lerno-riemann-sum">
      {rectangles.map((rect, index) => (
        <rect
          key={index}
          x={rect.rectPx.px}
          y={rect.rectPx.py}
          width={rect.rectPx.wPx}
          height={rect.rectPx.hPx}
          fill={color}
          fillOpacity={0.22}
          stroke={color}
          strokeWidth={1.5}
        />
      ))}
    </g>
  );
}
