'use client';

import type { CoordinatePlane } from '@medu/lerno';
import { CalculusEngine } from '@medu/lerno';

import { sceneColors } from '../theme.js';
/** Props accepted by `TangentLine`. */
export interface TangentLineProps {
  plane: CoordinatePlane;
  fn: (x: number) => number;
  x0: number;
  length?: number;
  color?: string;
  showPoint?: boolean;
}

/**
 * Draws the tangent line at a point on a curve.
 * The slope comes from the calculus engine, so the line matches the numeric
 * derivative shown by the lab.
 */
export function TangentLine({
  plane,
  fn,
  x0,
  length = 2,
  color = sceneColors.accent,
  showPoint = true,
}: TangentLineProps) {
  const tangent = CalculusEngine.getTangentLine(plane, fn, x0, length);

  return (
    <g className="lerno-tangent-line">
      <line
        x1={tangent.p1.px}
        y1={tangent.p1.py}
        x2={tangent.p2.px}
        y2={tangent.p2.py}
        stroke={color}
        strokeWidth={2.5}
        strokeDasharray="8 6"
      />
      {showPoint ? <circle cx={tangent.p0.px} cy={tangent.p0.py} r={6} fill={color} /> : null}
    </g>
  );
}
