import { CoordinatePlane } from './coordinates';

/**
 * Static helpers for derivatives, tangents, and Riemann sums.
 * The engine is stateless, so a lab can call it on every frame without copying state.
 */
export class CalculusEngine {
  /**
   * Numerically computes first derivative f'(x) using central difference.
   */
  static derivative(fn: (x: number) => number, x: number, h = 1e-5): number {
    return (fn(x + h) - fn(x - h)) / (2 * h);
  }

  /**
   * Calculates Tangent Line segment at x0.
   */
  static getTangentLine(
    plane: CoordinatePlane,
    fn: (x: number) => number,
    x0: number,
    length = 2.0,
  ) {
    const y0 = fn(x0);
    const slope = this.derivative(fn, x0);

    const x1 = x0 - length;
    const y1 = y0 - slope * length;

    const x2 = x0 + length;
    const y2 = y0 + slope * length;

    const p1 = plane.toPixels(x1, y1);
    const p2 = plane.toPixels(x2, y2);
    const p0 = plane.toPixels(x0, y0);

    return {
      x0,
      y0,
      slope,
      p0,
      p1,
      p2,
      formula: `y - ${y0.toFixed(2)} = ${slope.toFixed(2)}(x - ${x0.toFixed(2)})`,
    };
  }

  /**
   * Generates Riemann Sum rectangles for definite integral approximation.
   */
  static getRiemannRectangles(
    plane: CoordinatePlane,
    fn: (x: number) => number,
    a: number,
    b: number,
    n = 10,
    method: 'left' | 'right' | 'midpoint' = 'left',
  ) {
    const dx = (b - a) / n;
    const rectangles: {
      x: number;
      y: number;
      width: number;
      height: number;
      rectPx: { px: number; py: number; wPx: number; hPx: number };
    }[] = [];

    let totalArea = 0;

    for (let i = 0; i < n; i++) {
      const xLeft = a + i * dx;
      const xRight = xLeft + dx;

      let sampleX = xLeft;
      if (method === 'right') sampleX = xRight;
      if (method === 'midpoint') sampleX = (xLeft + xRight) / 2;

      const yVal = fn(sampleX);
      const area = yVal * dx;
      totalArea += area;

      const topLeft = plane.toPixels(xLeft, Math.max(0, yVal));
      const bottomRight = plane.toPixels(xRight, Math.min(0, yVal));

      const wPx = Math.abs(bottomRight.px - topLeft.px);
      const hPx = Math.abs(bottomRight.py - topLeft.py);

      rectangles.push({
        x: xLeft,
        y: yVal,
        width: dx,
        height: yVal,
        rectPx: { px: topLeft.px, py: topLeft.py, wPx, hPx },
      });
    }

    return { n, dx, totalArea, rectangles };
  }
}
