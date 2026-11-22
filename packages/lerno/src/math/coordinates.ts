import { lernoTheme } from '../branding';

/** Options accepted by `Coordinate`. */
export interface CoordinateOptions {
  xRange?: [number, number];
  yRange?: [number, number];
  width?: number;
  height?: number;
  padding?: number;
  stepX?: number;
  stepY?: number;
  grid?: boolean;
}

/**
 * Maps mathematical coordinates onto pixel coordinates.
 * The mapping is the single place that knows about padding and range, so every
 * visual in a chart shares the same axes.
 */
export class CoordinatePlane {
  public xRange: [number, number];
  public yRange: [number, number];
  public width: number;
  public height: number;
  public padding: number;
  public stepX: number;
  public stepY: number;
  public grid: boolean;

  /**
   * Creates a coordinate plane.
   * @param options - Ranges, size, padding, grid steps, and grid visibility.
   */
  constructor(options: CoordinateOptions = {}) {
    this.xRange = options.xRange || [-10, 10];
    this.yRange = options.yRange || [-6, 6];
    this.width = options.width || lernoTheme.dimensions.width;
    this.height = options.height || lernoTheme.dimensions.height;
    this.padding = options.padding ?? 80;
    this.stepX = options.stepX || 1;
    this.stepY = options.stepY || 1;
    this.grid = options.grid ?? true;
  }

  /**
   * Converts mathematical (x, y) coordinates to Canvas/SVG pixel coordinates.
   */
  toPixels(x: number, y: number): { px: number; py: number } {
    const usableWidth = this.width - 2 * this.padding;
    const usableHeight = this.height - 2 * this.padding;

    const [xMin, xMax] = this.xRange;
    const [yMin, yMax] = this.yRange;

    const normX = (x - xMin) / (xMax - xMin);
    const normY = (y - yMin) / (yMax - yMin);

    const px = this.padding + normX * usableWidth;
    const py = this.height - this.padding - normY * usableHeight; // Flip Y for Cartesian orientation

    return { px, py };
  }

  /**
   * Converts Canvas/SVG pixels back to mathematical (x, y) coordinates.
   */
  toCoords(px: number, py: number): { x: number; y: number } {
    const usableWidth = this.width - 2 * this.padding;
    const usableHeight = this.height - 2 * this.padding;

    const [xMin, xMax] = this.xRange;
    const [yMin, yMax] = this.yRange;

    const normX = (px - this.padding) / usableWidth;
    const normY = (this.height - this.padding - py) / usableHeight;

    const x = xMin + normX * (xMax - xMin);
    const y = yMin + normY * (yMax - yMin);

    return { x, y };
  }

  /**
   * Generates SVG path data for grid lines and Cartesian axes.
   */
  renderSvgElements() {
    const [xMin, xMax] = this.xRange;
    const [yMin, yMax] = this.yRange;

    const gridLines: { x1: number; y1: number; x2: number; y2: number }[] = [];
    const ticks: { px: number; py: number; label: string; axis: 'x' | 'y' }[] = [];

    // Vertical grid lines (X steps)
    for (let x = Math.ceil(xMin); x <= Math.floor(xMax); x += this.stepX) {
      const top = this.toPixels(x, yMax);
      const bottom = this.toPixels(x, yMin);
      gridLines.push({ x1: top.px, y1: top.py, x2: bottom.px, y2: bottom.py });

      if (x !== 0) {
        const originY = Math.max(yMin, Math.min(yMax, 0));
        const tickPos = this.toPixels(x, originY);
        ticks.push({ px: tickPos.px, py: tickPos.py + 20, label: x.toString(), axis: 'x' });
      }
    }

    // Horizontal grid lines (Y steps)
    for (let y = Math.ceil(yMin); y <= Math.floor(yMax); y += this.stepY) {
      const left = this.toPixels(xMin, y);
      const right = this.toPixels(xMax, y);
      gridLines.push({ x1: left.px, y1: left.py, x2: right.px, y2: right.py });

      if (y !== 0) {
        const originX = Math.max(xMin, Math.min(xMax, 0));
        const tickPos = this.toPixels(originX, y);
        ticks.push({ px: tickPos.px - 20, py: tickPos.py + 5, label: y.toString(), axis: 'y' });
      }
    }

    // Main Axes (x=0, y=0)
    const origin = this.toPixels(0, 0);
    const xAxis = {
      x1: this.toPixels(xMin, 0).px,
      y1: origin.py,
      x2: this.toPixels(xMax, 0).px,
      y2: origin.py,
    };
    const yAxis = {
      x1: origin.px,
      y1: this.toPixels(0, yMin).py,
      x2: origin.px,
      y2: this.toPixels(0, yMax).py,
    };

    return { gridLines, ticks, xAxis, yAxis, origin };
  }
}
