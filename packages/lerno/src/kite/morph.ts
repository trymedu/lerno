import { Shape } from './shape';

/**
 * Geometric transitions between shapes: morphing one path into another, and
 * revealing a path progressively the way a pen would draw it.
 *
 * Both operations are pure and headless — they read {@link Shape.commandList}
 * and return a new Shape, so they are testable without a DOM and usable by the
 * SVG display, a canvas, or a video renderer alike.
 */

/** One parsed SVG path segment: its command letter and numeric operands. */
interface Segment {
  type: 'M' | 'L' | 'Q' | 'C' | 'Z';
  values: number[];
}

/** Operand count each command expects; anything else is not a shape we built. */
const ARITY: Record<Segment['type'], number> = { M: 2, L: 2, Q: 4, C: 6, Z: 0 };

function clamp(ratio: number): number {
  return ratio < 0 ? 0 : ratio > 1 ? 1 : ratio;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Parses a shape's commands back into typed segments.
 * @param commands - Raw segments from {@link Shape.commandList}.
 * @returns The segments, or null when a command is unknown or malformed.
 */
function parse(commands: readonly string[]): Segment[] | null {
  const segments: Segment[] = [];
  for (const raw of commands) {
    const parts = raw.trim().split(/\s+/);
    const type = parts[0] as Segment['type'];
    if (ARITY[type] === undefined) return null;
    const values = parts.slice(1).map(Number);
    if (values.length !== ARITY[type]) return null;
    if (values.some((value) => !Number.isFinite(value))) return null;
    segments.push({ type, values });
  }
  return segments;
}

/**
 * Appends one already-interpolated segment to a shape being rebuilt.
 * @param target - Shape receiving the segment.
 * @param segment - Segment to append.
 */
function append(target: Shape, segment: Segment): void {
  const v = segment.values;
  switch (segment.type) {
    case 'M':
      target.moveTo(v[0], v[1]);
      break;
    case 'L':
      target.lineTo(v[0], v[1]);
      break;
    case 'Q':
      target.quadraticCurveTo(v[0], v[1], v[2], v[3]);
      break;
    case 'C':
      target.bezierCurveTo(v[0], v[1], v[2], v[3], v[4], v[5]);
      break;
    case 'Z':
      target.close();
      break;
  }
}

/**
 * Checks whether two shapes have compatible command sequences.
 *
 * Morphing is only defined when both paths use the same commands in the same
 * order with the same operand counts — a rectangle into a circle built from
 * curves, yes; a rectangle into an open polyline, no.
 *
 * @param from - Shape the transition starts from.
 * @param to - Shape the transition ends at.
 * @returns True when every segment lines up one to one.
 */
export function canMorph(from: Shape, to: Shape): boolean {
  const a = parse(from.commandList);
  const b = parse(to.commandList);
  if (!a || !b || a.length !== b.length) return false;
  return a.every((segment, index) => segment.type === b[index].type && segment.values.length === b[index].values.length);
}

/**
 * Interpolates one shape into another.
 *
 * Every operand moves linearly from its value in `from` to its value in `to`.
 * Curves stay curves: control points interpolate, so the outline never snaps
 * through a polygon.
 *
 * @param from - Shape the transition starts from.
 * @param to - Shape the transition ends at.
 * @param ratio - Progress, clamped to 0…1.
 * @returns The interpolated shape, or null when the two shapes cannot morph.
 */
export function morphShape(from: Shape, to: Shape, ratio: number): Shape | null {
  const a = parse(from.commandList);
  const b = parse(to.commandList);
  if (!a || !b || a.length !== b.length) return null;

  const t = clamp(ratio);
  const result = new Shape();
  for (let index = 0; index < a.length; index++) {
    const start = a[index];
    const end = b[index];
    if (start.type !== end.type || start.values.length !== end.values.length) return null;
    append(result, { type: start.type, values: start.values.map((value, i) => lerp(value, end.values[i], t)) });
  }
  return result;
}

/**
 * Splits a quadratic curve at `t` and keeps the first half.
 * @param cx - Control point x-coordinate.
 * @param cy - Control point y-coordinate.
 * @param x - End point x-coordinate.
 * @param y - End point y-coordinate.
 * @param start - Point the curve starts from.
 * @param t - Split position along the curve.
 * @returns Control point and end point of the retained half.
 */
function splitQuadratic(
  cx: number,
  cy: number,
  x: number,
  y: number,
  start: { x: number; y: number },
  t: number,
): { c: { x: number; y: number }; e: { x: number; y: number } } {
  const a = { x: lerp(start.x, cx, t), y: lerp(start.y, cy, t) };
  const b = { x: lerp(cx, x, t), y: lerp(cy, y, t) };
  return { c: a, e: { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) } };
}

/**
 * Splits a cubic curve at `t` and keeps the first half (de Casteljau).
 * @param c1x - First control point x-coordinate.
 * @param c1y - First control point y-coordinate.
 * @param c2x - Second control point x-coordinate.
 * @param c2y - Second control point y-coordinate.
 * @param x - End point x-coordinate.
 * @param y - End point y-coordinate.
 * @param start - Point the curve starts from.
 * @param t - Split position along the curve.
 * @returns Both control points and the end point of the retained half.
 */
function splitCubic(
  c1x: number,
  c1y: number,
  c2x: number,
  c2y: number,
  x: number,
  y: number,
  start: { x: number; y: number },
  t: number,
): { c1: { x: number; y: number }; c2: { x: number; y: number }; e: { x: number; y: number } } {
  const a = { x: lerp(start.x, c1x, t), y: lerp(start.y, c1y, t) };
  const b = { x: lerp(c1x, c2x, t), y: lerp(c1y, c2y, t) };
  const c = { x: lerp(c2x, x, t), y: lerp(c2y, y, t) };
  const d = { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
  const e = { x: lerp(b.x, c.x, t), y: lerp(b.y, c.y, t) };
  return { c1: a, c2: d, e: { x: lerp(d.x, e.x, t), y: lerp(d.y, e.y, t) } };
}

/**
 * Reveals a shape up to a fraction of its path — the stroke-by-stroke draw.
 *
 * Whole commands are emitted in order, and the one straddling the cut is split
 * geometrically: straight segments shorten, curves are cut with de Casteljau so
 * the partial outline stays exactly on the original path.
 *
 * @param shape - Shape to draw.
 * @param ratio - How much of the path to show, clamped to 0…1.
 * @returns The visible prefix; a fresh empty shape at 0, and `shape` itself at 1.
 */
export function revealShape(shape: Shape, ratio: number): Shape {
  const t = clamp(ratio);
  const segments = parse(shape.commandList);
  if (!segments || segments.length === 0 || t <= 0) return new Shape();
  if (t >= 1) return shape;

  const target = t * segments.length;
  const whole = Math.floor(target);
  const fraction = target - whole;

  const result = new Shape();
  let current = { x: 0, y: 0 };

  for (let index = 0; index < whole; index++) {
    const segment = segments[index];
    append(result, segment);
    if (segment.type !== 'Z') {
      const v = segment.values;
      current =
        segment.type === 'Q'
          ? { x: v[2], y: v[3] }
          : segment.type === 'C'
            ? { x: v[4], y: v[5] }
            : { x: v[0], y: v[1] };
    }
  }

  const next = segments[whole];
  if (!next || fraction <= 0) return result;

  const v = next.values;
  switch (next.type) {
    case 'M':
    case 'Z':
      // A move draws nothing and a close has no length, so both complete.
      append(result, next);
      break;
    case 'L':
      result.lineTo(lerp(current.x, v[0], fraction), lerp(current.y, v[1], fraction));
      break;
    case 'Q': {
      const half = splitQuadratic(v[0], v[1], v[2], v[3], current, fraction);
      result.quadraticCurveTo(half.c.x, half.c.y, half.e.x, half.e.y);
      break;
    }
    case 'C': {
      const half = splitCubic(v[0], v[1], v[2], v[3], v[4], v[5], current, fraction);
      result.bezierCurveTo(half.c1.x, half.c1.y, half.c2.x, half.c2.y, half.e.x, half.e.y);
      break;
    }
  }

  return result;
}
