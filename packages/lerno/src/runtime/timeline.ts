import { z } from 'zod';

/** Deterministic timeline for video, animation, and interaction anchors. */
export interface TimelineOptions {
  durationMs: number;
  fps?: number;
  loop?: boolean;
}

/**
 * Linear timeline that maps elapsed time onto keyframes and media anchors.
 * The timeline is the only clock in the runtime; nothing else reads a system timer.
 */
export class Timeline {
  private time = 0;

  readonly durationMs: number;
  readonly fps: number;
  readonly loop: boolean;

  /**
   * Creates a timeline.
   * @param options - Total duration in milliseconds and optional keyframes.
   */
  constructor(options: TimelineOptions) {
    if (options.durationMs <= 0) {
      throw new RangeError('durationMs must be greater than 0');
    }
    this.durationMs = options.durationMs;
    this.fps = options.fps ?? 30;
    this.loop = options.loop ?? false;
  }

  /**
   * Current playhead position in milliseconds.
   */
  get timeMs(): number {
    return this.time;
  }

  /**
   * Number of times the playhead has advanced since the last reset.
   */
  get frame(): number {
    return Math.floor((this.time / 1000) * this.fps);
  }

  /**
   * Playhead position as a fraction of the duration, between zero and one.
   */
  get progress(): number {
    return Math.min(1, this.time / this.durationMs);
  }

  /**
   * True once the playhead reaches the end of the duration.
   */
  get finished(): boolean {
    return !this.loop && this.time >= this.durationMs;
  }

  /**
   * Moves the playhead to an absolute position.
   * The jump is clamped to the duration, so a seek past the end lands on the end.
   * @param timeMs - Target position in milliseconds.
   */
  seek(timeMs: number): void {
    this.time = Math.max(0, Math.min(this.durationMs, timeMs));
  }

  /**
   * Moves the playhead to a fraction of the duration.
   * @param progress - Fraction between zero and one; values outside are clamped.
   */
  seekProgress(progress: number): void {
    this.seek(progress * this.durationMs);
  }

  /**
   * Moves the playhead forward by an elapsed amount.
   * @param deltaMs - Elapsed time in milliseconds.
   */
  advance(deltaMs: number): void {
    const next = this.time + deltaMs;
    if (this.loop) {
      this.time = ((next % this.durationMs) + this.durationMs) % this.durationMs;
      return;
    }
    this.time = Math.max(0, Math.min(this.durationMs, next));
  }

  /**
   * Returns the playhead to the start and clears the frame counter.
   */
  reset(): void {
    this.time = 0;
  }
}

/** An interaction point in time. */
export interface TimelineAnchor<T = unknown> {
  atMs: number;
  value: T;
}

/**
 * Finds the first anchor the playhead crossed in the last interval.
 * Anchors are sorted by time, so a single backward seek reports no crossing and
 * media keeps playing forward only.
 * @param anchors - Anchors to test, sorted by ascending time.
 * @param previousMs - Playhead position before this frame.
 * @param currentMs - Playhead position after this frame.
 * @returns The crossed anchor, or undefined when none lies in the interval.
 */
export function findCrossedAnchor<T>(anchors: readonly TimelineAnchor<T>[], previousMs: number, currentMs: number): TimelineAnchor<T> | undefined {
  return anchors.find((anchor) => anchor.atMs > previousMs && anchor.atMs <= currentMs);
}

/** Zod schema for timeline options. */
export const TimelineOptionsSchema = z.object({
  durationMs: z.number().positive(),
  fps: z.number().int().positive().default(30),
  loop: z.boolean().default(false),
});
