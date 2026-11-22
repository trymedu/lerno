import { Easings, Property, Vector2, clamp, lerp, type Easing, type Steppable } from '@medu/lerno';

/** Timing options shared by every keyframe animation. */
export interface KeyframeOptions {
  /** Total duration in seconds. Defaults to `1`. */
  duration?: number;
  /**
   * Normalized position of each keyframe on the overall timeline (`0`–`1`).
   * When omitted, or when the length differs from `values`, keyframes are
   * spaced evenly.
   */
  times?: readonly number[];
  /** Easing applied to the timeline progress, not to individual segments. */
  easing?: Easing;
  /** Called exactly once when the last keyframe is reached. */
  onComplete?: () => void;
}

/**
 * Animation that interpolates a property through an ordered list of values.
 *
 * Progress is measured on a single timeline, so a non-uniform `times` array can
 * hold a segment for longer without duplicating values. The animation finishes
 * by snapping the property to its final value, which removes residual drift
 * from floating-point accumulation.
 *
 * @typeParam T - Value type of the animated property.
 */
export class KeyframeAnimation<T> implements Steppable {
  private elapsed = 0;
  private finished = false;
  private readonly duration: number;
  private readonly times: readonly number[];
  private readonly easing: Easing;

  /**
   * @param property - Property written on every step.
   * @param values - Ordered keyframes; at least two are required.
   * @param interpolate - Function that blends two consecutive keyframes.
   * @param options - Timing, keyframe positions, and easing.
   * @throws RangeError If fewer than two keyframes are supplied.
   */
  constructor(
    readonly property: Property<T>,
    private readonly values: readonly T[],
    private readonly interpolate: (from: T, to: T, ratio: number) => T,
    private readonly options: KeyframeOptions = {},
  ) {
    if (values.length < 2) throw new RangeError('keyframe animation requires at least two values');
    this.duration = Math.max(0, options.duration ?? 1);
    this.times =
      options.times && options.times.length === values.length
        ? options.times
        : values.map((_, index) => index / (values.length - 1));
    this.easing = options.easing ?? Easings.easeInOut;
  }

  /** `true` once the final keyframe has been written. */
  get isFinished(): boolean {
    return this.finished;
  }

  /**
   * Advances the timeline by `dtSeconds` and writes the interpolated value.
   *
   * @param dtSeconds - Elapsed time for this step, in seconds.
   * @returns `true` while the timeline still has time left, `false` once done.
   */
  step(dtSeconds: number): boolean {
    if (this.finished) return false;
    this.elapsed = Math.min(this.duration, this.elapsed + dtSeconds);
    const progress = this.duration === 0 ? 1 : this.easing(clamp(this.elapsed / this.duration, 0, 1));

    let segment = 0;
    while (segment < this.times.length - 2 && progress > this.times[segment + 1]) segment += 1;

    const start = this.times[segment];
    const end = this.times[segment + 1];
    const localRatio = end === start ? 0 : clamp((progress - start) / (end - start), 0, 1);
    this.property.set(this.interpolate(this.values[segment], this.values[segment + 1], localRatio));

    if (this.elapsed >= this.duration) {
      this.property.set(this.values[this.values.length - 1]);
      this.finished = true;
      this.options.onComplete?.();
      return false;
    }
    return true;
  }
}

/**
 * Creates a keyframe animation over a scalar property.
 *
 * @param property - Scalar property written on every step.
 * @param values - Ordered keyframes; at least two are required.
 * @param options - Timing, keyframe positions, and easing.
 * @returns A steppable animation ready for an animation loop.
 */
export function keyframesNumber(property: Property<number>, values: readonly number[], options: KeyframeOptions = {}): KeyframeAnimation<number> {
  return new KeyframeAnimation(property, values, (from, to, ratio) => lerp(from, to, ratio), options);
}

/**
 * Creates a keyframe animation over a vector property.
 *
 * @param property - Vector property written on every step.
 * @param values - Ordered keyframes; at least two are required.
 * @param options - Timing, keyframe positions, and easing.
 * @returns A steppable animation ready for an animation loop.
 */
export function keyframesVector2(property: Property<Vector2>, values: readonly Vector2[], options: KeyframeOptions = {}): KeyframeAnimation<Vector2> {
  return new KeyframeAnimation(property, values, (from, to, ratio) => from.lerp(to, ratio), options);
}
