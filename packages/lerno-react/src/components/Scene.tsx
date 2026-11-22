'use client';

import type { CSSProperties, ReactNode } from 'react';
import { sceneColors } from '../theme.js';

/** Props accepted by `Scene`. */
export interface SceneProps {
  /** SVG design width (viewBox). Defaults to 960. */
  width?: number;
  /** SVG design height (viewBox). Defaults to 540. */
  height?: number;
  backgroundColor?: string;
  title?: string;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

/**
 * Responsive SVG canvas.
 * Its background and border follow the HeroUI theme tokens, so the same
 * scene adapts to light and dark mode without extra markup.
 */
export function Scene({
  width = 960,
  height = 540,
  backgroundColor = sceneColors.background,
  title,
  className,
  style,
  children,
}: SceneProps) {
  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl border border-border ${className ?? ''}`}
      style={{ background: backgroundColor, ...style }}
    >
      {title ? (
        <span className="pointer-events-none absolute left-4 top-3 text-xs tracking-wide text-muted">{title}</span>
      ) : null}
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label={title ?? 'Lerno visualization'} className="block w-full">
        {children}
      </svg>
    </div>
  );
}
