import { Vector2, v2 } from '../dot';

/** Simple pointer info. Framework-agnostic (not tied to DOM). */
export interface PointerInfo {
  x: number;
  y: number;
  /** Delta from drag start. */
  delta?: Vector2;
  originalEvent?: unknown;
}

/** Input event kinds delivered to listeners. */
export type PointerEventType = 'down' | 'move' | 'up';

/** Input listener attachable to a scene node (simplified PhET `InputListener`). */
export interface InputListener {
  down?(pointer: PointerInfo): void;
  move?(pointer: PointerInfo): void;
  up?(pointer: PointerInfo): void;
}

/**
 * Drag listener that remembers the press position and reports movement as deltas.
 * Custom interactions are built from the drag and end callbacks.
 */
export class DragListener implements InputListener {
  private start: Vector2 | null = null;
  private last: Vector2 | null = null;

  /**
   * Creates a drag listener.
   * @param handlers - Optional callbacks for the start, movement, and release phases.
   */
  constructor(
    private readonly handlers: {
      start?: (pointer: PointerInfo) => void;
      drag?: (pointer: PointerInfo) => void;
      end?: (pointer: PointerInfo) => void;
    } = {},
  ) {}

  /**
   * Starts a drag at the pointer position and fires the start handler.
   * @param pointer - Press position in scene coordinates.
   */
  down(pointer: PointerInfo): void {
    this.start = v2(pointer.x, pointer.y);
    this.last = this.start;
    this.handlers.start?.(pointer);
  }

  /**
   * Reports movement relative to the previous position.
   * Ignored until a press starts a drag, so stray motion is not treated as input.
   * @param pointer - Current position in scene coordinates; delta carries the step.
   */
  move(pointer: PointerInfo): void {
    if (!this.start || !this.last) return;
    const current = v2(pointer.x, pointer.y);
    this.handlers.drag?.({ ...pointer, delta: current.minus(this.last) });
    this.last = current;
  }

  /**
   * Ends the drag and fires the release handler.
   * @param pointer - Release position in scene coordinates.
   */
  up(pointer: PointerInfo): void {
    if (!this.start) return;
    this.handlers.end?.(pointer);
    this.start = null;
    this.last = null;
  }

  /**
   * True between a press and the matching release.
   */
  get isDragging(): boolean {
    return this.start !== null;
  }
}
