import { Property } from '../axon';
import { Vector2, clamp, easeInOutRatio, lerp } from '../dot';

/** Easing function that maps linear progress to eased progress. */
export type Easing = (ratio: number) => number;

/** Named easing functions used by tweens and keyframes. */
export const Easings: Record<string, Easing> = {
  linear: (ratio) => ratio,
  easeIn: (ratio) => ratio * ratio,
  easeOut: (ratio) => 1 - (1 - ratio) * (1 - ratio),
  easeInOut: easeInOutRatio,
  cubic: (ratio) => (ratio < 0.5 ? 4 * ratio * ratio * ratio : 1 - Math.pow(-2 * ratio + 2, 3) / 2),
};

/** Options accepted by `tween`. */
export interface TweenOptions {
  /** Duration in seconds. */
  duration?: number;
  /** Delay in seconds before starting. */
  delay?: number;
  easing?: Easing;
  onComplete?: () => void;
}

/** Anything that can advance by a time delta. */
export interface Steppable {
  /**
   * Advances the animation by one step.
   * @param dtSeconds - Elapsed time in seconds.
   * @returns True while the animation still needs steps.
   */
  step(dtSeconds: number): boolean;
  readonly isFinished: boolean;
}

/**
 * Generic tween between two values of any type.
 * A reader supplies both the current value and the interpolation, so the tween
 * knows nothing about the value it moves.
 */
export class Tween implements Steppable {
  private elapsed = 0;
  private finished = false;
  readonly from: number;
  readonly to: number;

  /**
   * Creates a tween.
   * @param from - Value the tween starts from.
   * @param to - Value the tween ends at.
   * @param duration - Total duration in seconds.
   * @param read - Reads the current value for the first frame.
   * @param write - Applies an interpolated value.
   * @param easing - Easing applied to normalized progress. Defaults to linear.
   * @param onComplete - Called once when the duration is reached.
   */
  constructor(
    from: number,
    to: number,
    private readonly options: TweenOptions = {},
  ) {
    this.from = from;
    this.to = to;
  }

  private get duration(): number {
    return Math.max(0, this.options.duration ?? 1);
  }

  /**
   * Normalized progress between zero and one, after easing.
   */
  get ratio(): number {
    const active = this.elapsed - (this.options.delay ?? 0);
    return this.duration === 0 ? 1 : clamp(active / this.duration, 0, 1);
  }

  /**
   * Current interpolated value at the eased progress.
   */
  get value(): number {
    return lerp(this.from, this.to, this.options.easing ? this.options.easing(this.ratio) : this.ratio);
  }

  /**
   * True once the duration has been reached.
   */
  get isFinished(): boolean {
    return this.finished;
  }

  /**
   * Advances the tween by dtSeconds and writes the new value.
   * @param dtSeconds - Elapsed time in seconds.
   * @returns True while time remains in the tween.
   */
  step(dtSeconds: number): boolean {
    if (this.finished) return false;
    this.elapsed += dtSeconds;
    if (this.ratio >= 1) {
      this.finished = true;
      this.options.onComplete?.();
      return false;
    }
    return true;
  }
}

/**
 * Tween bound directly to a Property, so no reader and writer are needed.
 */
export class PropertyAnimation<T> implements Steppable {
  private elapsed = 0;
  private finished = false;
  private readonly from: T;
  private readonly duration: number;
  private readonly delay: number;
  private readonly easing: Easing;

  /**
   * Creates a property animation.
   * @param property - Property written on every step.
   * @param from - Starting value applied immediately.
   * @param to - Target value.
   * @param options - Duration, easing, delay, and completion callback.
   */
  constructor(
    readonly property: Property<T>,
    private readonly to: T,
    private readonly interpolate: (from: T, to: T, ratio: number) => T,
    private readonly options: TweenOptions = {},
  ) {
    this.from = property.get();
    this.duration = Math.max(0, options.duration ?? 1);
    this.delay = options.delay ?? 0;
    this.easing = options.easing ?? Easings.easeInOut;
  }

  /**
   * Normalized progress between zero and one, after easing.
   */
  get ratio(): number {
    const active = this.elapsed - this.delay;
    return this.duration === 0 ? 1 : clamp(active / this.duration, 0, 1);
  }

  /**
   * True once the duration has been reached.
   */
  get isFinished(): boolean {
    return this.finished;
  }

  /**
   * Advances the animation by dtSeconds and writes the property.
   * @param dtSeconds - Elapsed time in seconds.
   * @returns True while time remains in the animation.
   */
  step(dtSeconds: number): boolean {
    if (this.finished) return false;
    this.elapsed += dtSeconds;
    this.property.set(this.interpolate(this.from, this.to, this.easing(this.ratio)));
    if (this.ratio >= 1) {
      this.finished = true;
      this.options.onComplete?.();
      return false;
    }
    return true;
  }
}

/**
 * Animates a numeric property to a target value.
 * @param property - Property to animate; its current value becomes the start.
 * @param to - Target value.
 * @param options - Duration, easing, delay, and completion callback.
 * @returns A steppable animation ready for an animation loop.
 */
export function animateNumber(property: Property<number>, to: number, options: TweenOptions = {}): PropertyAnimation<number> {
  return new PropertyAnimation(property, to, (from, target, ratio) => lerp(from, target, ratio), options);
}

/**
 * Animates a vector property to a target point.
 * @param property - Property to animate; its current value becomes the start.
 * @param to - Target point.
 * @param options - Duration, easing, delay, and completion callback.
 * @returns A steppable animation ready for an animation loop.
 */
export function animateVector2(property: Property<Vector2>, to: Vector2, options: TweenOptions = {}): PropertyAnimation<Vector2> {
  return new PropertyAnimation(property, to, (from, target, ratio) => from.lerp(target, ratio), options);
}

/**
 * Collection that advances several steppable animations together.
 * Items run concurrently; use sequence from @medu/lerno-motion when they must
 * run one after another.
 */
export class AnimationTimeline {
  private readonly items = new Set<Steppable>();

  /**
   * Adds an animation to the timeline.
   * @param item - Animation stepped on every step call.
   * @returns This timeline, so calls can be chained.
   */
  add(item: Steppable): this {
    this.items.add(item);
    return this;
  }

  /**
   * Advances every running animation once.
   * @param dtSeconds - Elapsed time in seconds, shared by all items.
   */
  step(dtSeconds: number): void {
    for (const item of [...this.items]) {
      if (!item.step(dtSeconds)) this.items.delete(item);
    }
  }

  /**
   * True when the timeline holds no animation that still needs steps.
   */
  get isFinished(): boolean {
    return this.items.size === 0;
  }

  /**
   * Removes every animation from the timeline.
   */
  clear(): void {
    this.items.clear();
  }
}
