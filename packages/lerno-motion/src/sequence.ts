import type { Property, Steppable } from '@medu/lerno';

/**
 * Runs steppable animations one after another.
 *
 * The current item receives every step until it reports completion, then the
 * sequence advances. The sequence itself never completes on its own when the
 * item list is empty; `isFinished` reports `true` immediately in that case.
 */
export class Sequence implements Steppable {
  private index = 0;

  /**
   * @param items - Animations to run in order.
   */
  constructor(private readonly items: readonly Steppable[]) {}

  /** `true` once every item has finished. */
  get isFinished(): boolean {
    return this.index >= this.items.length;
  }

  /** Zero-based index of the item currently receiving steps. */
  get currentIndex(): number {
    return this.index;
  }

  /**
   * Advances the current item by `dtSeconds`.
   *
   * @param dtSeconds - Elapsed time for this step, in seconds.
   * @returns `true` while at least one item still needs steps.
   */
  step(dtSeconds: number): boolean {
    const item = this.items[this.index];
    if (!item) return false;
    const running = item.step(dtSeconds);
    if (!running) this.index += 1;
    return this.index < this.items.length;
  }
}

/**
 * Builds a sequence from the given items.
 *
 * @param items - Animations to run in order.
 * @returns A steppable sequence.
 */
export function sequence(items: readonly Steppable[]): Sequence {
  return new Sequence(items);
}

/**
 * Produces linearly increasing start offsets for staggered animations.
 *
 * Offsets are produced in seconds, so each entry can be handed to a delayed
 * stepper to fan a set of animations out in time.
 *
 * @param count - Number of animations to stagger.
 * @param eachSeconds - Delay added between consecutive starts.
 * @returns `count` start offsets: `0, eachSeconds, 2 × eachSeconds, …`.
 */
export function stagger(count: number, eachSeconds: number): number[] {
  return Array.from({ length: count }, (_, index) => index * eachSeconds);
}

/**
 * Value that oscillates continuously between two bounds.
 *
 * The motion is a raised sine wave, so it starts at `from`, reaches `to` at
 * half a period, and returns. It never reports completion, which makes it
 * suitable for ambient or decorative motion driven by an outer loop.
 */
export class Oscillator implements Steppable {
  private elapsed = 0;

  /**
   * @param property - Scalar property written on every step.
   * @param from - Lower bound of the oscillation.
   * @param to - Upper bound of the oscillation.
   * @param periodSeconds - Duration of one full cycle. Defaults to `2`.
   */
  constructor(
    readonly property: Property<number>,
    private readonly from: number,
    private readonly to: number,
    private readonly periodSeconds = 2,
  ) {}

  /** Always `false`; an oscillator runs until it is discarded. */
  get isFinished(): boolean {
    return false;
  }

  /**
   * Advances the phase by `dtSeconds` and writes the current value.
   *
   * @param dtSeconds - Elapsed time for this step, in seconds.
   * @returns Always `true`.
   */
  step(dtSeconds: number): boolean {
    this.elapsed += dtSeconds;
    const ratio = (Math.sin((this.elapsed / this.periodSeconds) * Math.PI * 2) + 1) / 2;
    this.property.set(this.from + (this.to - this.from) * ratio);
    return true;
  }
}
