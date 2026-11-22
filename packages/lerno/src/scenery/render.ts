import type { Shape } from '../kite/shape';
import type { PointerEventType, PointerInfo } from './input';

/**
 * Render tree: framework-agnostic plain data.
 * A display in React and SVG, Canvas, WebGL, or a test draws it, which lets the
 * same scene run everywhere and keeps custom nodes easy to add.
 */

export interface RenderSource {
  readonly inputEnabled: boolean;
  /**
   * Forwards a pointer event to this render element's source node.
   * @param type - Phase of the pointer: down, move, or up.
   * @param pointer - Coordinates in scene space, with delta for drags.
   */
  handlePointer(type: PointerEventType, pointer: PointerInfo): void;
}

/** Shape of `RenderBase`. */
export interface RenderBase {
  transform?: string;
  opacity?: number;
  visible?: boolean;
  /** Interaction source; Display forwards pointer events here. */
  source?: RenderSource;
}

/** Shape of `GroupRender`. */
export interface GroupRender extends RenderBase {
  type: 'group';
  children: RenderElement[];
}

/** Shape of `RectRender`. */
export interface RectRender extends RenderBase {
  type: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
  radius?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

/** Shape of `CircleRender`. */
export interface CircleRender extends RenderBase {
  type: 'circle';
  centerX: number;
  centerY: number;
  radius: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

/** Shape of `LineRender`. */
export interface LineRender extends RenderBase {
  type: 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke?: string;
  strokeWidth?: number;
  dash?: string;
}

/** Shape of `PathRender`. */
export interface PathRender extends RenderBase {
  type: 'path';
  shape: Shape;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  dash?: string;
}

/** Shape of `TextRender`. */
export interface TextRender extends RenderBase {
  type: 'text';
  x: number;
  y: number;
  text: string;
  fill?: string;
  fontSize?: number;
  fontWeight?: number;
  anchor?: 'start' | 'middle' | 'end';
  baseline?: 'auto' | 'middle' | 'hanging';
}

/** Shape of `ImageRender`. */
export interface ImageRender extends RenderBase {
  type: 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  href: string;
  alt?: string;
}

/** Shape of `MathRender`. */
export interface MathRender extends RenderBase {
  type: 'math';
  /** LaTeX source. The display owns the typesetting engine, not the core. */
  latex: string;
  x: number;
  y: number;
  fill?: string;
  fontSize?: number;
  anchor?: 'start' | 'middle' | 'end';
}

/** Shape of `ExtensionRender`. */
export interface ExtensionRender extends RenderBase {
  type: 'extension';
  rendererId: string;
  data: unknown;
}

/** Framework-agnostic node of the render tree. */
export type RenderElement =
  | GroupRender
  | RectRender
  | CircleRender
  | LineRender
  | PathRender
  | TextRender
  | ImageRender
  | MathRender
  | ExtensionRender;
