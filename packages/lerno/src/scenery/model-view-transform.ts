import { Matrix3, Vector2 } from '../dot';

/**
 * Mapping between model and view coordinates.
 * The model is measured in metres and the view in pixels; simplified from the
 * PhET ModelViewTransform2.
 */
export class ModelViewTransform2 {
  /**
   * Wraps a matrix that maps between model space and view space.
   * @param matrix - Combined scale and translation of the transform.
   */
  constructor(readonly matrix: Matrix3) {}

  /**
   * Single-point mapping with a uniform scale.
   * Because the mathematical y axis points up and the view y axis points down, y is
   * inverted by default.
   */
  static createSinglePointScaleInvertedYMapping(modelPoint: Vector2, viewPoint: Vector2, scale: number): ModelViewTransform2 {
    const matrix = new Matrix3(
      scale,
      0,
      viewPoint.x - modelPoint.x * scale,
      0,
      -scale,
      viewPoint.y + modelPoint.y * scale,
    );
    return new ModelViewTransform2(matrix);
  }

  /**
   * Converts a model coordinate into view pixels.
   * @param point - Position in model units, such as metres.
   * @returns The matching position in view units.
   */
  modelToViewPosition(point: Vector2): Vector2 {
    return this.matrix.transformPoint(point);
  }

  /**
   * Converts view pixels back into model coordinates.
   * @param point - Position in view units.
   * @returns The matching position in model units.
   */
  viewToModelPosition(point: Vector2): Vector2 {
    return this.matrix.inverted().transformPoint(point);
  }

  /**
   * Converts a model-space difference into view pixels, ignoring translation.
   * @param delta - Offset in model units.
   * @returns The same offset in view units.
   */
  modelToViewDelta(delta: Vector2): Vector2 {
    return this.matrix.transformDelta(delta);
  }

  /**
   * Converts one model x-coordinate into view pixels.
   * @param x - Coordinate in model units.
   * @returns The coordinate in view units.
   */
  modelToViewX(x: number): number {
    return this.matrix.transformPoint(new Vector2(x, 0)).x;
  }

  /**
   * Converts one model y-coordinate into view pixels.
   * @param y - Coordinate in model units.
   * @returns The coordinate in view units.
   */
  modelToViewY(y: number): number {
    return this.matrix.transformPoint(new Vector2(0, y)).y;
  }

  /**
   * Converts one view x-coordinate into model units.
   * @param x - Coordinate in view units.
   * @returns The coordinate in model units.
   */
  viewToModelX(x: number): number {
    return this.matrix.inverted().transformPoint(new Vector2(x, 0)).x;
  }

  /**
   * Converts one view y-coordinate into model units.
   * @param y - Coordinate in view units.
   * @returns The coordinate in model units.
   */
  viewToModelY(y: number): number {
    return this.matrix.inverted().transformPoint(new Vector2(0, y)).y;
  }

  /**
   * Uniform scale factor of the transform, used to size strokes and text consistently.
   */
  get scale(): number {
    return Math.hypot(this.matrix.m00, this.matrix.m10);
  }
}
