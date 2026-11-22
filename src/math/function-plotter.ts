import { CoordinatePlane } from './coordinates';

/** Options accepted by `FunctionPlot`. */
export interface FunctionPlotOptions {
  fn: (x: number) => number;
  domain?: [number, number];
  samples?: number;
  color?: string;
  strokeWidth?: number;
  drawProgress?: number; // 0.0 to 1.0 (for Remotion animations)
}

/**
 * Samples a function and produces its SVG path.
 * Plotting is separate from the scene graph, so the same plotter can be rendered
 * by an SVG path, a canvas, or a headless test.
 */
export class FunctionPlotter {
  public fn: (x: number) => number;
  public domain: [number, number];
  public samples: number;
  public color: string;
  public strokeWidth: number;
  public drawProgress: number;

  /**
   * Creates a plotter for one function.
   * @param options - Function, domain, sample count, color, and draw progress.
   */
  constructor(options: FunctionPlotOptions) {
    this.fn = options.fn;
    this.domain = options.domain || [-10, 10];
    this.samples = options.samples || 200;
    this.color = options.color || '#10B981';
    this.strokeWidth = options.strokeWidth || 3;
    this.drawProgress = Math.max(0, Math.min(1, options.drawProgress ?? 1));
  }

  /**
   * Generates SVG path 'd' attribute based on mathematical function and draw progress.
   */
  generatePath(plane: CoordinatePlane): { pathData: string; points: { x: number; y: number; px: number; py: number }[] } {
    const [xStart, xEnd] = this.domain;
    const currentEnd = xStart + (xEnd - xStart) * this.drawProgress;
    const currentSamples = Math.max(2, Math.floor(this.samples * this.drawProgress));

    const points: { x: number; y: number; px: number; py: number }[] = [];
    const step = (currentEnd - xStart) / (currentSamples - 1);

    for (let i = 0; i < currentSamples; i++) {
      const x = xStart + i * step;
      try {
        const y = this.fn(x);
        if (Number.isFinite(y)) {
          const { px, py } = plane.toPixels(x, y);
          points.push({ x, y, px, py });
        }
      } catch {
        // Skip domain discontinuities
      }
    }

    if (points.length === 0) {
      return { pathData: '', points: [] };
    }

    let pathData = `M ${points[0].px.toFixed(2)} ${points[0].py.toFixed(2)}`;
    for (let i = 1; i < points.length; i++) {
      pathData += ` L ${points[i].px.toFixed(2)} ${points[i].py.toFixed(2)}`;
    }

    return { pathData, points };
  }
}
