import { CoordinatePlane } from './coordinates';

/**
 * Mutable two-dimensional vector used by the math engines.
 * Unlike the immutable dot vector, arithmetic mutates in place so hot loops in
 * plotters and projectile code allocate nothing.
 */
export class Vector2D {
  public x: number;
  public y: number;

  /**
   * Creates a vector.
   * @param x - Horizontal component.
   * @param y - Vertical component.
   */
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  /**
   * Length of the vector, computed as the square root of the squared components.
   */
  magnitude(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  /**
   * Direction measured from the positive x-axis, in radians.
   */
  angle(): number {
    return Math.atan2(this.y, this.x);
  }

  /**
   * Adds another vector in place.
   * @param v - Vector to add.
   * @returns This vector, so calls can be chained.
   */
  add(v: Vector2D): Vector2D {
    return new Vector2D(this.x + v.x, this.y + v.y);
  }

  /**
   * Subtracts another vector in place.
   * @param v - Vector to subtract.
   * @returns This vector, so calls can be chained.
   */
  subtract(v: Vector2D): Vector2D {
    return new Vector2D(this.x - v.x, this.y - v.y);
  }

  /**
   * Multiplies both components by a scalar in place.
   * @param s - Multiplier.
   * @returns This vector, so calls can be chained.
   */
  scale(s: number): Vector2D {
    return new Vector2D(this.x * s, this.y * s);
  }

  /**
   * Dot product with another vector.
   * @param v - Second vector.
   * @returns The scalar product.
   */
  dot(v: Vector2D): number {
    return this.x * v.x + this.y * v.y;
  }

  /**
   * Generates SVG coordinates for an arrow from tail to head.
   */
  renderArrow(plane: CoordinatePlane, tail: { x: number; y: number } = { x: 0, y: 0 }) {
    const head = { x: tail.x + this.x, y: tail.y + this.y };
    const tailPx = plane.toPixels(tail.x, tail.y);
    const headPx = plane.toPixels(head.x, head.y);

    // Arrowhead geometry
    const angle = Math.atan2(headPx.py - tailPx.py, headPx.px - tailPx.px);
    const headLength = 16;
    const arrowAngle = Math.PI / 7;

    const leftHeadPx = {
      px: headPx.px - headLength * Math.cos(angle - arrowAngle),
      py: headPx.py - headLength * Math.sin(angle - arrowAngle),
    };

    const rightHeadPx = {
      px: headPx.px - headLength * Math.cos(angle + arrowAngle),
      py: headPx.py - headLength * Math.sin(angle + arrowAngle),
    };

    return {
      tailPx,
      headPx,
      leftHeadPx,
      rightHeadPx,
      pathData: `M ${tailPx.px} ${tailPx.py} L ${headPx.px} ${headPx.py} M ${leftHeadPx.px} ${leftHeadPx.py} L ${headPx.px} ${headPx.py} L ${rightHeadPx.px} ${rightHeadPx.py}`,
    };
  }
}
