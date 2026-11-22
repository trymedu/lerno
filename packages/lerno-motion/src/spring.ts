import { Property, Vector2, type Steppable } from '@medu/lerno';

/**
 * Configuration for a spring simulation.
 *
 * Values follow the conventions of a damped harmonic oscillator: `stiffness`
 * pulls toward the target, `damping` removes energy, and `mass` scales inertia.
 * Rest thresholds decide when the simulation is considered settled.
 */
export interface SpringOptions {
  /** Spring constant `k`. Higher values pull toward the target more aggressively. */
  stiffness?: number;
  /** Damping coefficient `c`. Higher values settle sooner and overshoot less. */
  damping?: number;
  /** Moving mass `m`. Larger values make the motion lazier. */
  mass?: number;
  /** Below this absolute velocity the spring reports completion (default `0.01`). */
  restSpeed?: number;
  /** Within this absolute distance of the target the spring snaps and reports completion (default `0.01`). */
  restDelta?: number;
  /** Called exactly once when the spring first meets its rest thresholds. */
  onComplete?: () => void;
}

const DEFAULTS: Required<Omit<SpringOptions, 'onComplete'>> = {
  stiffness: 170,
  damping: 26,
  mass: 1,
  restSpeed: 0.01,
  restDelta: 0.01,
};

/** Mutable integrator state: the current value and its velocity. */
export interface SpringState {
  /** Current value of the spring. */
  value: number;
  /** Current velocity, in units per second. */
  velocity: number;
}

/**
 * Advances a spring by one fixed step.
 *
 * Integrates `a = (k·(target − value) − c·velocity) / mass` with an explicit
 * Euler step. The input state is not mutated; a new state is returned.
 *
 * @param state - Current value and velocity.
 * @param target - Value the spring is converging on.
 * @param dtSeconds - Elapsed time for this step, in seconds.
 * @param options - Spring constants and rest thresholds.
 * @returns The state after the step.
 */
export function stepSpring(state: SpringState, target: number, dtSeconds: number, options: SpringOptions = {}): SpringState {
  const { stiffness, damping, mass } = { ...DEFAULTS, ...options };
  const acceleration = (stiffness * (target - state.value) - damping * state.velocity) / mass;
  const velocity = state.velocity + acceleration * dtSeconds;
  const value = state.value + velocity * dtSeconds;
  return { value, velocity };
}

/**
 * Spring animation bound to a scalar `Property`.
 *
 * Implements `Steppable`, so it can be driven by an animation loop or by a
 * deterministic `step(dt)` sequence. Every step writes the interpolated value
 * into the bound property, which notifies its listeners.
 */
export class NumberSpring implements Steppable {
  private state: SpringState;
  private finished = false;

  /**
   * @param property - Scalar property updated on every step.
   * @param to - Target value the spring converges on.
   * @param options - Spring constants and rest thresholds.
   */
  constructor(
    readonly property: Property<number>,
    private readonly to: number,
    private readonly options: SpringOptions = {},
  ) {
    this.state = { value: property.get(), velocity: 0 };
  }

  /** `true` once the spring has met its rest thresholds and will stop stepping. */
  get isFinished(): boolean {
    return this.finished;
  }

  /** Current velocity in units per second, useful for driving secondary effects. */
  get velocity(): number {
    return this.state.velocity;
  }

  /**
   * Advances the spring by `dtSeconds` and writes the result to the property.
   *
   * @param dtSeconds - Elapsed time for this step, in seconds.
   * @returns `true` while the spring still needs steps, `false` once settled.
   */
  step(dtSeconds: number): boolean {
    if (this.finished) return false;
    const { restSpeed, restDelta } = { ...DEFAULTS, ...this.options };
    this.state = stepSpring(this.state, this.to, dtSeconds, this.options);
    this.property.set(this.state.value);

    if (Math.abs(this.to - this.state.value) <= restDelta && Math.abs(this.state.velocity) <= restSpeed) {
      this.property.set(this.to);
      this.finished = true;
      this.options.onComplete?.();
      return false;
    }
    return true;
  }
}

/**
 * Spring animation bound to a `Property<Vector2>`.
 *
 * Each axis integrates its own `SpringState`, so the two coordinates settle
 * independently while sharing the same options and completion callback.
 */
export class Vector2Spring implements Steppable {
  private readonly springs: [SpringState, SpringState];
  private finished = false;

  /**
   * @param property - Vector property updated on every step.
   * @param to - Target point the spring converges on.
   * @param options - Spring constants and rest thresholds.
   */
  constructor(
    readonly property: Property<Vector2>,
    private readonly to: Vector2,
    private readonly options: SpringOptions = {},
  ) {
    const start = property.get();
    this.springs = [
      { value: start.x, velocity: 0 },
      { value: start.y, velocity: 0 },
    ];
  }

  /** `true` once both axes have met their rest thresholds. */
  get isFinished(): boolean {
    return this.finished;
  }

  /**
   * Advances both axes by `dtSeconds` and writes the resulting vector.
   *
   * @param dtSeconds - Elapsed time for this step, in seconds.
   * @returns `true` while the spring still needs steps, `false` once settled.
   */
  step(dtSeconds: number): boolean {
    if (this.finished) return false;
    const { restSpeed, restDelta } = { ...DEFAULTS, ...this.options };
    this.springs[0] = stepSpring(this.springs[0], this.to.x, dtSeconds, this.options);
    this.springs[1] = stepSpring(this.springs[1], this.to.y, dtSeconds, this.options);
    this.property.set(new Vector2(this.springs[0].value, this.springs[1].value));

    const dx = this.to.x - this.springs[0].value;
    const dy = this.to.y - this.springs[1].value;
    if (Math.hypot(dx, dy) <= restDelta && Math.hypot(this.springs[0].velocity, this.springs[1].velocity) <= restSpeed) {
      this.property.set(this.to);
      this.finished = true;
      this.options.onComplete?.();
      return false;
    }
    return true;
  }
}

/**
 * Creates a spring that animates a scalar property toward `to`.
 *
 * @param property - Scalar property to animate.
 * @param to - Target value.
 * @param options - Spring constants and rest thresholds.
 * @returns A steppable spring; pass it to an animation loop or `step(dt)`.
 */
export function springNumber(property: Property<number>, to: number, options: SpringOptions = {}): NumberSpring {
  return new NumberSpring(property, to, options);
}

/**
 * Creates a spring that animates a vector property toward `to`.
 *
 * @param property - Vector property to animate.
 * @param to - Target point.
 * @param options - Spring constants and rest thresholds.
 * @returns A steppable spring; pass it to an animation loop or `step(dt)`.
 */
export function springVector2(property: Property<Vector2>, to: Vector2, options: SpringOptions = {}): Vector2Spring {
  return new Vector2Spring(property, to, options);
}
