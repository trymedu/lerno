import type { Node, RenderElement } from '@medu/lerno';

/**
 * A scene this package can record: a 2D root to draw and a way to advance it.
 *
 * Three.js scenes are rejected at runtime; they draw with WebGL and do not
 * produce a render tree.
 */
export interface Scene {
  /** Root of the scene graph; re-read after every step. */
  root: Node;
  /**
   * Advances the model by one frame.
   * @param dtSeconds - Exactly `1 / fps`, never read from a clock.
   */
  step(dtSeconds: number): void;
}

/**
 * Raised when a Three.js scene is handed to the 2D exporter.
 *
 * Exported as a stable string so applications and tests can match it without
 * importing the renderer packages.
 */
export const THREE_HEADLESS_ERROR =
  'Three.js scenes cannot be exported headlessly: @medu/lerno-export records Lerno 2D node trees. Render the 3D layer with a browser or WebGL backend and composite it through exportMp4({ video }).';

/** Detects three.js objects and runtimes by their public flags and shape. */
function isThreeLike(value: unknown): boolean {
  if (value === null || typeof value !== 'object') return false;
  const candidate = value as {
    isObject3D?: unknown;
    isScene?: unknown;
    scene?: unknown;
    camera?: unknown;
  };
  return (
    candidate.isObject3D === true ||
    candidate.isScene === true ||
    (candidate.scene !== undefined && candidate.camera !== undefined)
  );
}

/**
 * Rejects inputs that the 2D renderer cannot record.
 *
 * The check is runtime-only because JavaScript callers can bypass the `Scene`
 * type. Three.js scenes fail with a dedicated message instead of a cryptic
 * `root.toRender is not a function`.
 *
 * @param scene - Value passed as a scene.
 * @throws TypeError When the shape is not a Lerno scene.
 * @throws Error When the input is a Three.js scene or runtime.
 */
function assertLernoScene(scene: Scene): void {
  if (scene === null || typeof scene !== 'object') {
    throw new TypeError('frameTrees expects a Lerno scene: { root: Node, step(dt) }.');
  }
  if (typeof scene.step !== 'function') {
    throw new TypeError(
      'frameTrees expects scene.step(dt). Three.js scenes cannot be exported headlessly; render the 3D layer with a browser or WebGL backend.',
    );
  }
  const root = scene.root as unknown;
  if (typeof (root as { toRender?: unknown } | null)?.toRender === 'function') return;
  if (isThreeLike(root) || isThreeLike(scene)) throw new Error(THREE_HEADLESS_ERROR);
  throw new TypeError(
    'frameTrees expects scene.root to be a Lerno Node with toRender(). Three.js scenes cannot be exported headlessly.',
  );
}

/** Timing options for {@link frameTrees}. */
export interface FrameOptions {
  /** Frames per second. Defaults to `60`. */
  fps?: number;
  /** Length of the recording in seconds. Defaults to `1`. */
  duration?: number;
  /**
   * How fast the model advances relative to the recording. `1` is real time.
   *
   * This is what separates authoring from playback: a scene can be written to
   * feel snappy at real speed and still export as a slow, readable video — or a
   * real-time simulation can be time-lapsed — without touching the model.
   *
   * `0.5` plays the scene at half speed, `4` four times faster. The model still
   * has every intermediate state, which is why a scene that jumps straight to
   * its final state cannot be slowed down: there is nothing in between to show.
   */
  timeScale?: number;
}

/**
 * Yields the render tree for every frame, stepping the model between frames.
 *
 * Frame 0 is the model untouched, so a recording starts exactly where the scene
 * is built. `dt` is derived from `fps` rather than measured, which is what makes
 * two runs of the same scene produce identical trees.
 *
 * @param scene - Root and step function to record.
 * @param options - Frame rate and duration.
 * @returns One render tree per frame, `fps * duration` in total.
 */
export function* frameTrees(scene: Scene, options: FrameOptions = {}): Generator<RenderElement, void, undefined> {
  assertLernoScene(scene);
  const fps = options.fps ?? 60;
  const duration = options.duration ?? 1;
  const timeScale = options.timeScale ?? 1;
  if (fps <= 0) throw new Error(`fps must be positive, received ${fps}`);
  if (duration < 0) throw new Error(`duration must not be negative, received ${duration}`);
  if (timeScale <= 0) throw new Error(`timeScale must be positive, received ${timeScale}`);

  const total = Math.round(fps * duration);
  const dt = (1 / fps) * timeScale;
  for (let frame = 0; frame < total; frame += 1) {
    yield scene.root.toRender();
    scene.step(dt);
  }
}

/** A render tree with every value reduced to something JSON can hold. */
export type SerializedTree = unknown;

/**
 * Converts a render tree into plain JSON-safe data.
 *
 * `Shape` carries its command list privately, so `JSON.stringify` alone would
 * emit internal bookkeeping instead of the path. Functions and the interactive
 * `source` back-reference are dropped for the same reason.
 *
 * @param tree - Render tree to normalise.
 * @returns A structure that survives `JSON.stringify` unchanged.
 */
export function serializeTree(tree: RenderElement): SerializedTree {
  const visit = (value: unknown): unknown => {
    if (value === null || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map(visit);

    const shape = value as { pathData?: unknown; commandList?: unknown };
    if (typeof shape.pathData === 'string' && Array.isArray(shape.commandList)) {
      return { type: 'shape', pathData: shape.pathData };
    }

    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (key === 'source') continue;
      if (typeof entry === 'function') continue;
      out[key] = visit(entry);
    }
    return out;
  };
  return visit(tree);
}
