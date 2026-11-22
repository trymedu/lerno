import type { Node } from '../scenery';
import type { Steppable } from '../twixt';

/**
 * Deterministic frame counter that integrates elapsed time.
 * The clock never reads a system timer; callers supply the delta, which keeps
 * runs reproducible and lets a test or a video exporter drive the simulation.
 */
export class Clock {
  private _elapsed = 0;
  private _frame = 0;

  /**
   * Advances the clock by one frame.
   * @param dtSeconds - Elapsed time in seconds supplied by the caller.
   */
  step(dtSeconds: number): void {
    this._elapsed += dtSeconds;
    this._frame += 1;
  }

  /**
   * Total seconds the clock has been advanced since the last reset.
   */
  get elapsed(): number {
    return this._elapsed;
  }

  /**
   * Number of steps applied since the last reset.
   */
  get frame(): number {
    return this._frame;
  }

  /**
   * Returns the clock to zero elapsed time and zero frames.
   */
  reset(): void {
    this._elapsed = 0;
    this._frame = 0;
  }
}

/**
 * A screen pairs an observable model with a scene graph view.
 * The model stays completely unaware of the view, following the PhET MVC split.
 */
export class SimScreen {
  private model: unknown;

  /**
   * Binds a model factory and a view factory that turn model state into a node tree.
   */
  constructor(
    readonly name: string,
    private readonly createModelFn: () => unknown,
    private readonly createViewFn: (model: unknown) => Node,
    readonly icon?: Node,
  ) {}

  /**
   * Instantiates the model for the current session.
   * Calling it again replaces the previous instance.
   * @returns The new model.
   */
  createModel(): unknown {
    this.model = this.createModelFn();
    return this.model;
  }

  /**
   * Reads the model of the current session.
   * @returns The live model, or undefined before createModel has been called.
   */
  getModel(): unknown {
    return this.model;
  }

  /**
   * Builds the view for the current model.
   * The returned node tracks model state through Property listeners, so it stays
   * correct without React.
   * @returns The root of the view.
   */
  createView(): Node {
    return this.createViewFn(this.model);
  }

  /**
   * Advances the model by one step and lets the view react.
   * @param dtSeconds - Elapsed time in seconds.
   */
  step(dtSeconds: number): void {
    const model = this.model as Partial<Steppable> | undefined;
    if (model && typeof model.step === 'function') model.step(dtSeconds);
  }
}

/**
 * Builds a screen from a model factory and a view factory.
 * @param name - Human-readable screen name shown by multi-screen navigation.
 * @param createModel - Creates a fresh model for a session.
 * @param createView - Produces the view for a given model.
 * @param icon - Optional node used as a screen icon.
 * @returns A screen ready to be handed to Sim.
 */
export function createScreen<M>(name: string, createModel: () => M, createView: (model: M) => Node, icon?: Node): SimScreen {
  return new SimScreen(name, createModel, (model) => createView(model as M), icon);
}

/** Options accepted by `Sim`. */
export interface SimOptions {
  screens: readonly SimScreen[];
  title?: string;
  width?: number;
  height?: number;
}

/**
 * Simulation driver that owns a clock and a set of screens.
 * The simulation advances only through step(dt), so a loop, a test, and a video
 * exporter drive it identically.
 */
export class Sim {
  readonly clock = new Clock();
  readonly screens: readonly SimScreen[];
  readonly title: string;
  readonly width: number;
  readonly height: number;

  /**
   * Creates a simulation.
   * @param options - Screens to manage and the size passed to each view.
   */
  constructor(options: SimOptions) {
    this.screens = options.screens;
    this.title = options.title ?? 'Lerno';
    this.width = options.width ?? 960;
    this.height = options.height ?? 540;
  }

  /**
   * Advances the clock and the active screen by one step.
   * @param dtSeconds - Elapsed time in seconds.
   */
  step(dtSeconds: number): void {
    this.clock.step(dtSeconds);
    for (const screen of this.screens) screen.step(dtSeconds);
  }

  /**
   * Returns the clock and the active screen to their initial state.
   */
  reset(): void {
    this.clock.reset();
  }
}
