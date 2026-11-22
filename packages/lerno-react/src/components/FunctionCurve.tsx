'use client';

import type { CoordinatePlane, FunctionPlotter } from '@medu/lerno';

/** Props accepted by `FunctionCurve`. */
export interface FunctionCurveProps {
  plane: CoordinatePlane;
  plotter: FunctionPlotter;
}

/**
 * Draws the sampled path of a function plotter onto a coordinate plane.
 * The plotter owns the sampling, so changing draw progress animates the curve
 * without rebuilding the scene.
 */
export function FunctionCurve({ plane, plotter }: FunctionCurveProps) {
  const { pathData } = plotter.generatePath(plane);
  if (!pathData) return null;

  return (
    <path
      d={pathData}
      fill="none"
      stroke={plotter.color}
      strokeWidth={plotter.strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}
