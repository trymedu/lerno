import { Vector2, v2 } from './vector2';

/**
 * Affine 2D transform matrix stored as a row-major 3 by 3 grid.
 * ```
 * | m00 m01 m02 |
 * | m10 m11 m12 |
 * |  0   0   1  |
 * ```
 */
export class Matrix3 {
  static readonly IDENTITY = new Matrix3(1, 0, 0, 0, 1, 0, 0, 0, 1);

  /**
   * Affine 2D matrix stored in row-major order.
   * The six values cover translation, rotation, and scaling; the last row stays
   * zero, zero, one so points transform with a single multiply.
   */
  constructor(
    readonly m00: number,
    readonly m01: number,
    readonly m02: number,
    readonly m10: number,
    readonly m11: number,
    readonly m12: number,
    readonly m20 = 0,
    readonly m21 = 0,
    readonly m22 = 1,
  ) {}

  /**
   * Builds a translation matrix.
   * @param x - Horizontal offset.
   * @param y - Vertical offset.
   * @returns A matrix that moves points by x and y.
   */
  static translation(x: number, y: number): Matrix3 {
    return new Matrix3(1, 0, x, 0, 1, y, 0, 0, 1);
  }

  /**
   * Builds a rotation matrix around the origin.
   * @param radians - Angle to rotate by, positive counter-clockwise.
   * @returns A matrix that rotates points by that angle.
   */
  static rotation(radians: number): Matrix3 {
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    return new Matrix3(cos, -sin, 0, sin, cos, 0, 0, 0, 1);
  }

  /**
   * Builds an axis-aligned scaling matrix.
   * @param sx - Horizontal scale factor.
   * @param sy - Vertical scale factor; defaults to sx.
   * @returns A matrix that scales points about the origin.
   */
  static scaling(sx: number, sy = sx): Matrix3 {
    return new Matrix3(sx, 0, 0, 0, sy, 0, 0, 0, 1);
  }

  /**
   * Multiplies this matrix by another, applying other first.
   * @param other - Matrix applied before this one.
   * @returns The combined transform.
   */
  times(other: Matrix3): Matrix3 {
    return new Matrix3(
      this.m00 * other.m00 + this.m01 * other.m10 + this.m02 * other.m20,
      this.m00 * other.m01 + this.m01 * other.m11 + this.m02 * other.m21,
      this.m00 * other.m02 + this.m01 * other.m12 + this.m02 * other.m22,
      this.m10 * other.m00 + this.m11 * other.m10 + this.m12 * other.m20,
      this.m10 * other.m01 + this.m11 * other.m11 + this.m12 * other.m21,
      this.m10 * other.m02 + this.m11 * other.m12 + this.m12 * other.m22,
      this.m20 * other.m00 + this.m21 * other.m10 + this.m22 * other.m20,
      this.m20 * other.m01 + this.m21 * other.m11 + this.m22 * other.m21,
      this.m20 * other.m02 + this.m21 * other.m12 + this.m22 * other.m22,
    );
  }

  /**
   * Transforms a point, including the translation component.
   * @param point - Point in the source space.
   * @returns The transformed point.
   */
  transformPoint(point: Vector2): Vector2 {
    return v2(
      this.m00 * point.x + this.m01 * point.y + this.m02,
      this.m10 * point.x + this.m11 * point.y + this.m12,
    );
  }

  /**
   * Transforms a direction, ignoring translation.
   * @param delta - Direction or difference vector.
   * @returns The transformed direction.
   */
  transformDelta(delta: Vector2): Vector2 {
    return v2(this.m00 * delta.x + this.m01 * delta.y, this.m10 * delta.x + this.m11 * delta.y);
  }

  /**
   * Translation component of the matrix as a vector.
   */
  get translation(): Vector2 {
    return v2(this.m02, this.m12);
  }

  /**
   * Determinant of the matrix; zero means the transform is not invertible.
   */
  get determinant(): number {
    return this.m00 * this.m11 - this.m01 * this.m10;
  }

  /**
   * Computes the inverse of this matrix.
   * @returns The inverse matrix.
   * @throws Error When the determinant is zero, meaning the transform collapses space.
   */
  inverted(): Matrix3 {
    const det = this.determinant;
    if (Math.abs(det) < 1e-12) throw new Error('Matrix3 is not invertible (determinant 0)');
    const inv00 = this.m11 / det;
    const inv01 = -this.m01 / det;
    const inv10 = -this.m10 / det;
    const inv11 = this.m00 / det;
    return new Matrix3(
      inv00,
      inv01,
      -(inv00 * this.m02 + inv01 * this.m12),
      inv10,
      inv11,
      -(inv10 * this.m02 + inv11 * this.m12),
      0,
      0,
      1,
    );
  }

  /**
   * Compares all nine values within a tolerance.
   * @param other - Matrix to compare against.
   * @param epsilon - Maximum absolute difference per value. Defaults to zero.
   * @returns True when every value matches within the tolerance.
   */
  equals(other: Matrix3, epsilon = 0): boolean {
    const a = [this.m00, this.m01, this.m02, this.m10, this.m11, this.m12];
    const b = [other.m00, other.m01, other.m02, other.m10, other.m11, other.m12];
    return a.every((value, index) => Math.abs(value - b[index]) <= epsilon);
  }

  /**
   * Renders the matrix as an SVG transform attribute value.
   * @returns A matrix(...) string accepted by SVG and CSS.
   */
  toSVG(): string {
    return `matrix(${this.m00} ${this.m10} ${this.m01} ${this.m11} ${this.m02} ${this.m12})`;
  }
}
