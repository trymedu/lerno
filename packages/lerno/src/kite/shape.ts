import { Vector2 } from '../dot';

/** Shape of `Bounds2`. */
export interface Bounds2 {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Two-dimensional shape that produces SVG path commands.
 * Simplified from the PhET kite Shape; every command is chainable.
 */
export class Shape {
  private readonly commands: string[] = [];
  private readonly xs: number[] = [];
  private readonly ys: number[] = [];

  private track(x: number, y: number): void {
    this.xs.push(x);
    this.ys.push(y);
  }

  /**
   * Starts a new subpath at the given point.
   * @param x - Target x-coordinate.
   * @param y - Target y-coordinate.
   * @returns This shape, so drawing commands can be chained.
   */
  moveTo(x: number, y: number): this {
    this.commands.push(`M ${x} ${y}`);
    this.track(x, y);
    return this;
  }

  /**
   * Appends a straight segment to the current point.
   * @param x - Target x-coordinate.
   * @param y - Target y-coordinate.
   * @returns This shape, so drawing commands can be chained.
   */
  lineTo(x: number, y: number): this {
    this.commands.push(`L ${x} ${y}`);
    this.track(x, y);
    return this;
  }

  /**
   * Appends a quadratic curve through a single control point.
   * @param cx - Control point x-coordinate.
   * @param cy - Control point y-coordinate.
   * @param x - End point x-coordinate.
   * @param y - End point y-coordinate.
   * @returns This shape, so drawing commands can be chained.
   */
  quadraticCurveTo(cx: number, cy: number, x: number, y: number): this {
    this.commands.push(`Q ${cx} ${cy} ${x} ${y}`);
    this.track(cx, cy);
    this.track(x, y);
    return this;
  }

  /**
   * Appends a cubic curve through two control points.
   * @param c1x - First control point x-coordinate.
   * @param c1y - First control point y-coordinate.
   * @param c2x - Second control point x-coordinate.
   * @param c2y - Second control point y-coordinate.
   * @param x - End point x-coordinate.
   * @param y - End point y-coordinate.
   * @returns This shape, so drawing commands can be chained.
   */
  bezierCurveTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number): this {
    this.commands.push(`C ${c1x} ${c1y} ${c2x} ${c2y} ${x} ${y}`);
    this.track(c1x, c1y);
    this.track(c2x, c2y);
    this.track(x, y);
    return this;
  }

  /**
   * Closes the current subpath with a straight line back to its start.
   * @returns This shape, so drawing commands can be chained.
   */
  close(): this {
    this.commands.push('Z');
    return this;
  }

  /**
   * The SVG path string built from every drawing command.
   * An empty shape yields an empty string, which renders nothing rather than failing.
   */
  get pathData(): string {
    return this.commands.join(' ');
  }

  /**
   * Raw drawing commands in insertion order, as SVG path segments.
   * Geometry helpers read this instead of parsing {@link Shape.pathData}.
   */
  get commandList(): readonly string[] {
    return this.commands;
  }

  /**
   * True when the shape holds no drawing commands.
   */
  get isEmpty(): boolean {
    return this.commands.length === 0;
  }

  /**
   * Axis-aligned bounding box of the shape.
   * @returns The box in scene units, or null for an empty shape.
   */
  get bounds(): Bounds2 | null {
    if (this.xs.length === 0) return null;
    return {
      minX: Math.min(...this.xs),
      minY: Math.min(...this.ys),
      maxX: Math.max(...this.xs),
      maxY: Math.max(...this.ys),
    };
  }

  /**
   * Builds a rectangle, optionally with rounded corners.
   * @param x - Left edge.
   * @param y - Top edge.
   * @param width - Width in scene units.
   * @param height - Height in scene units.
   * @param radius - Corner radius in scene units; zero gives sharp corners.
   * @returns The rectangle as a shape.
   */
  static rect(x: number, y: number, width: number, height: number, radius = 0): Shape {
    const shape = new Shape();
    if (radius <= 0) return shape.moveTo(x, y).lineTo(x + width, y).lineTo(x + width, y + height).lineTo(x, y + height).close();

    const r = Math.min(radius, width / 2, height / 2);
    return shape
      .moveTo(x + r, y)
      .lineTo(x + width - r, y)
      .quadraticCurveTo(x + width, y, x + width, y + r)
      .lineTo(x + width, y + height - r)
      .quadraticCurveTo(x + width, y + height, x + width - r, y + height)
      .lineTo(x + r, y + height)
      .quadraticCurveTo(x, y + height, x, y + height - r)
      .lineTo(x, y + r)
      .quadraticCurveTo(x, y, x + r, y)
      .close();
  }

  /**
   * Builds a circle from four quadratic curves, which keeps the path short.
   * @param centerX - Center x-coordinate.
   * @param centerY - Center y-coordinate.
   * @param radius - Radius in scene units.
   * @returns The circle as a shape.
   */
  static circle(centerX: number, centerY: number, radius: number): Shape {
    return new Shape()
      .moveTo(centerX - radius, centerY)
      .quadraticCurveTo(centerX - radius, centerY - radius, centerX, centerY - radius)
      .quadraticCurveTo(centerX + radius, centerY - radius, centerX + radius, centerY)
      .quadraticCurveTo(centerX + radius, centerY + radius, centerX, centerY + radius)
      .quadraticCurveTo(centerX - radius, centerY + radius, centerX - radius, centerY)
      .close();
  }

  /**
   * Builds a closed polygon through the given points.
   * @param points - Vertices in order; the path closes itself.
   * @returns The polygon as a shape.
   */
  static polygon(points: readonly Vector2[]): Shape {
    const shape = new Shape();
    if (points.length === 0) return shape;
    shape.moveTo(points[0].x, points[0].y);
    for (let index = 1; index < points.length; index += 1) shape.lineTo(points[index].x, points[index].y);
    return shape.close();
  }

  /**
   * Builds an open polyline through the given points.
   * @param points - Vertices in order; the path stays open.
   * @returns The polyline as a shape.
   */
  static polyline(points: readonly Vector2[]): Shape {
    const shape = new Shape();
    if (points.length === 0) return shape;
    shape.moveTo(points[0].x, points[0].y);
    for (let index = 1; index < points.length; index += 1) shape.lineTo(points[index].x, points[index].y);
    return shape;
  }
}
