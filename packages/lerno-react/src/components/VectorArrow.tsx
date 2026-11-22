'use client';

import type { CoordinatePlane, Vector2D } from '@medu/lerno';

import { sceneColors } from '../theme.js';
/** Props accepted by `VectorArrow`. */
export interface VectorArrowProps {
  plane: CoordinatePlane;
  vector: Vector2D;
  tail?: { x: number; y: number };
  color?: string;
  label?: string;
}

/**
 * Draws a labelled arrow for a vector quantity.
 * Used for velocity, force, and gradient arrows where direction matters.
 */
export function VectorArrow({
  plane,
  vector,
  tail = { x: 0, y: 0 },
  color = sceneColors.accent,
  label,
}: VectorArrowProps) {
  const { pathData, headPx } = vector.renderArrow(plane, tail);

  return (
    <g>
      <path d={pathData} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      {label ? (
        <text x={headPx.px + 10} y={headPx.py - 8} fill={color} fontSize={18} fontWeight={600}>
          {label}
        </text>
      ) : null}
    </g>
  );
}
