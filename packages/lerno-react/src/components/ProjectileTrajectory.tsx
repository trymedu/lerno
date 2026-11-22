'use client';

import type { CoordinatePlane, ProjectileSimulation } from '@medu/lerno';

import { sceneColors } from '../theme.js';
/** Props accepted by `ProjectileTrajectory`. */
export interface ProjectileTrajectoryProps {
  plane: CoordinatePlane;
  projectile: ProjectileSimulation;
  /** Flight progress from 0.0 to 1.0. */
  progress?: number;
  color?: string;
  samples?: number;
}

/**
 * Draws the parabola of a projectile and marks its apex and range.
 * The path is computed from the same closed-form solution the simulation uses, so
 * the dashed trail and the moving marker always agree.
 */
export function ProjectileTrajectory({
  plane,
  projectile,
  progress = 1,
  color = sceneColors.success,
  samples = 120,
}: ProjectileTrajectoryProps) {
  const { pathData } = projectile.generateTrajectoryPath(plane, samples);
  const clamped = Math.max(0, Math.min(1, progress));
  const state = projectile.getStateAtTime(clamped * projectile.getFlightTime());

  const ball = plane.toPixels(state.x, state.y);
  const velocityTip = plane.toPixels(state.x + state.vx * 0.4, state.y + state.vy * 0.4);

  return (
    <g className="lerno-projectile">
      <path d={pathData} fill="none" stroke={color} strokeWidth={2.5} strokeDasharray="6 6" opacity={0.6} />
      <line
        x1={ball.px}
        y1={ball.py}
        x2={velocityTip.px}
        y2={velocityTip.py}
        stroke={sceneColors.accent}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <circle cx={ball.px} cy={ball.py} r={9} fill={sceneColors.accent} stroke="#ffffff" strokeWidth={2} />
    </g>
  );
}
