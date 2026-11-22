/**
 * Immutable two-dimensional vector; every operation returns a new instance.
 * Simplified from the Vector2 in the PhET dot library.
 */
export class Vector2 {
  static readonly ZERO = new Vector2(0, 0);
  static readonly X_UNIT = new Vector2(1, 0);
  static readonly Y_UNIT = new Vector2(0, 1);

  /**
   * Immutable 2D point or direction.
   * @param x - Horizontal component. Defaults to zero.
   * @param y - Vertical component. Defaults to zero.
   */
  constructor(
    readonly x: number = 0,
    readonly y: number = 0,
  ) {}

  /**
   * Vector addition.
   * @param other - Vector to add.
   * @returns A new vector; neither operand is mutated.
   */
  plus(other: Vector2): Vector2 {
    return new Vector2(this.x + other.x, this.y + other.y);
  }

  /**
   * Vector subtraction, this minus other.
   * @param other - Vector to subtract.
   * @returns A new vector; neither operand is mutated.
   */
  minus(other: Vector2): Vector2 {
    return new Vector2(this.x - other.x, this.y - other.y);
  }

  /**
   * Scales both components by a scalar.
   * @param scalar - Multiplier.
   * @returns A new scaled vector.
   */
  times(scalar: number): Vector2 {
    return new Vector2(this.x * scalar, this.y * scalar);
  }

  /**
   * Scales both components down by a scalar.
   * @param scalar - Divisor.
   * @returns A new scaled vector.
   */
  dividedBy(scalar: number): Vector2 {
    return new Vector2(this.x / scalar, this.y / scalar);
  }

  /**
   * Flips both components, pointing the vector the other way.
   * @returns A new vector mirrored through the origin.
   */
  negated(): Vector2 {
    return new Vector2(-this.x, -this.y);
  }

  /**
   * Dot product of the two vectors.
   * @param other - Second vector.
   * @returns The scalar product, equal to the product of lengths and the cosine of the angle.
   */
  dot(other: Vector2): number {
    return this.x * other.x + this.y * other.y;
  }

  /**
   * Two-dimensional cross product, the z-component of the 3D cross product.
   * @param other - Second vector.
   * @returns A scalar that is positive when other lies counter-clockwise of this vector.
   */
  cross(other: Vector2): number {
    return this.x * other.y - this.y * other.x;
  }

  /**
   * Length of the vector, computed as the square root of the squared components.
   */
  get magnitude(): number {
    return Math.hypot(this.x, this.y);
  }

  /**
   * Squared length of the vector; cheaper than magnitude for comparisons.
   */
  get magnitudeSquared(): number {
    return this.x * this.x + this.y * this.y;
  }

  /**
   * Direction measured from the positive x-axis, in radians.
   */
  get angle(): number {
    return Math.atan2(this.y, this.x);
  }

  /**
   * Unit vector pointing in the same direction.
   * @returns A vector of length one, or the zero vector when the magnitude is zero.
   */
  normalized(): Vector2 {
    const magnitude = this.magnitude;
    return magnitude === 0 ? new Vector2(0, 0) : this.dividedBy(magnitude);
  }

  /**
   * Rescales the vector to the requested length.
   * @param magnitude - Target length.
   * @returns A vector of that length, or the zero vector when the current magnitude is zero.
   */
  withMagnitude(magnitude: number): Vector2 {
    const current = this.magnitude;
    return current === 0 ? new Vector2(0, 0) : this.dividedBy(current).times(magnitude);
  }

  /**
   * Rotates the vector around the origin.
   * @param radians - Angle to rotate by, positive counter-clockwise.
   * @returns A new rotated vector.
   */
  rotated(radians: number): Vector2 {
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    return new Vector2(this.x * cos - this.y * sin, this.x * sin + this.y * cos);
  }

  /**
   * Rotates the vector 90 degrees counter-clockwise.
   * @returns A new vector perpendicular to this one.
   */
  perpendicular(): Vector2 {
    return new Vector2(-this.y, this.x);
  }

  /**
   * Linear interpolation toward another vector.
   * @param other - Target vector.
   * @param ratio - Blend factor; zero returns this vector, one returns other. Not clamped.
   * @returns The interpolated vector.
   */
  lerp(other: Vector2, ratio: number): Vector2 {
    return new Vector2(this.x + (other.x - this.x) * ratio, this.y + (other.y - this.y) * ratio);
  }

  /**
   * Euclidean distance to another point.
   * @param other - Target point.
   * @returns The straight-line distance.
   */
  distance(other: Vector2): number {
    return Math.hypot(this.x - other.x, this.y - other.y);
  }

  /**
   * Squared distance to another point.
   * @param other - Target point.
   * @returns The squared distance; cheaper than distance for comparisons.
   */
  distanceSquared(other: Vector2): number {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    return dx * dx + dy * dy;
  }

  /**
   * Compares both components within a tolerance.
   * @param other - Vector to compare against.
   * @param epsilon - Maximum absolute difference per component. Defaults to zero.
   * @returns True when both components match within the tolerance.
   */
  equals(other: Vector2, epsilon = 0): boolean {
    return Math.abs(this.x - other.x) <= epsilon && Math.abs(this.y - other.y) <= epsilon;
  }

  /**
   * Converts the vector to a plain tuple.
   * @returns The x and y components, suitable for structured clones and JSON.
   */
  toArray(): [number, number] {
    return [this.x, this.y];
  }

  /**
   * Creates an independent copy.
   * @returns A new vector with the same components.
   */
  copy(): Vector2 {
    return new Vector2(this.x, this.y);
  }
}

/**
 * Builds a vector without importing the class.
 * @param x - Horizontal component. Defaults to zero.
 * @param y - Vertical component. Defaults to zero.
 * @returns A new vector.
 */
export function v2(x = 0, y = 0): Vector2 {
  return new Vector2(x, y);
}

/**
 * Converts degrees to radians.
 * @param degrees - Angle in degrees.
 * @returns The same angle in radians.
 */
export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Converts radians to degrees.
 * @param radians - Angle in radians.
 * @returns The same angle in degrees.
 */
export function radiansToDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Constrains a value to a numeric range.
 * @param value - Value to constrain.
 * @param min - Lower bound.
 * @param max - Upper bound.
 * @returns The value when it lies within the range, otherwise the violated bound.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Linear interpolation between two numbers.
 * @param a - Start value, returned when ratio is zero.
 * @param b - End value, returned when ratio is one.
 * @param ratio - Blend factor; the result is not clamped.
 * @returns The interpolated value.
 */
export function lerp(a: number, b: number, ratio: number): number {
  return a + (b - a) * ratio;
}

/**
 * Applies an ease-in-out curve to a progress value.
 * @param ratio - Raw progress between zero and one; values outside are clamped.
 * @returns The eased progress with a smooth slope at both ends.
 */
export function easeInOutRatio(ratio: number): number {
  const clamped = clamp(ratio, 0, 1);
  return clamped < 0.5 ? 2 * clamped * clamped : 1 - 2 * (1 - clamped) * (1 - clamped);
}
