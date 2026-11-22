import { revealShape, type Shape } from '../kite';
import type { Easing, Steppable } from './tween';

/** Timing options for {@link WriteShape}. */
export interface WriteShapeOptions {
  /** Seconds the draw takes. Defaults to `1`. */
  duration?: number;
  /** Easing applied to drawing progress. Defaults to linear, which reads as a steady pen. */
  easing?: Easing;
  /** Called on every step with the shape drawn so far. */
  onUpdate?: (shape: Shape) => void;
  /** Called once when the last command has been drawn. */
  onComplete?: () => void;
}

/**
 * Draws a shape stroke by stroke, the way a pen would.
 *
 * The animation advances on `step`, so it runs inside a {@link Sequence}, a
 * `PropertyAnimation`, or any other `Steppable` container without knowing
 * anything about the display. Progress is a fraction of the command list, not a
 * dash offset, which keeps the same code path headless and in the browser.
 *
 * @example
 * ```ts
 * const write = new WriteShape(shape, { duration: 2, onUpdate: (s) => (node.shape = s) });
 * write.step(1 / 60);
 * ```
 */
export class WriteShape implements Steppable {
  private elapsed = 0;
  private finished = false;
  private readonly duration: number;
  private readonly easing: Easing;

  /**
   * Creates a drawing animation over one shape.
   * @param shape - Shape to draw in full.
   * @param options - Duration, easing, and callbacks.
   */
  constructor(
    private readonly shape: Shape,
    options: WriteShapeOptions = {},
  ) {
    this.duration = Math.max(0, options.duration ?? 1);
    this.easing = options.easing ?? ((ratio) => ratio);
    this.onUpdate = options.onUpdate;
    this.onComplete = options.onComplete;
  }

  private readonly onUpdate?: (shape: Shape) => void;
  private readonly onComplete?: () => void;

  /**
   * Advances the drawing by one step.
   * @param dtSeconds - Elapsed time in seconds.
   * @returns True while the drawing still needs steps.
   */
  step(dtSeconds: number): boolean {
    if (this.finished) return false;
    this.elapsed += dtSeconds;
    const raw = this.duration <= 0 ? 1 : Math.min(this.elapsed / this.duration, 1);
    this.onUpdate?.(revealShape(this.shape, this.easing(raw)));
    if (raw >= 1) {
      this.finished = true;
      this.onComplete?.();
    }
    return !this.finished;
  }

  /** True once the last command has been drawn. */
  get isFinished(): boolean {
    return this.finished;
  }

  /**
   * Fraction of the shape drawn so far, after easing.
   * @returns A value between 0 and 1.
   */
  get progress(): number {
    const raw = this.duration <= 0 ? 1 : Math.min(this.elapsed / this.duration, 1);
    return this.easing(raw);
  }
}
