import { Matrix3, Vector2, v2 } from '../dot';
import type { Shape } from '../kite/shape';
import type { InputListener, PointerEventType, PointerInfo } from './input';
import type { RenderElement, RenderSource } from './render';

/** Options accepted by `Node`. */
export interface NodeOptions {
  visible?: boolean;
  opacity?: number;
  translation?: Vector2;
  rotation?: number;
  scale?: number | Vector2;
  children?: readonly Node[];
}

interface PaintStyle {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  dash?: string;
}

/**
 * Applies the default values of a paint style.
 * @param style - Partial style supplied by the caller.
 * @returns The same object with fill, stroke, and stroke width resolved.
 */
function paint(style: PaintStyle): PaintStyle {
  return { fill: style.fill, stroke: style.stroke, strokeWidth: style.strokeWidth, dash: style.dash };
}

/**
 * Scene graph node that carries children, a transform, and visibility with opacity.
 * Simplified from the PhET scenery Node. toRender lowers the subtree into a
 * framework-agnostic render tree that any display can draw.
 */
export class Node implements RenderSource {
  readonly children: Node[] = [];
  visible: boolean;
  opacity: number;
  translation: Vector2;
  rotation: number;
  scale: Vector2;
  inputEnabled = false;
  private readonly inputListeners: InputListener[] = [];

  /**
   * Creates a node that composes transform, visibility, opacity, and children.
   * @param options - Transform and paint options applied to this node.
   */
  constructor(options: NodeOptions = {}) {
    this.visible = options.visible ?? true;
    this.opacity = options.opacity ?? 1;
    this.translation = options.translation ?? Vector2.ZERO;
    this.rotation = options.rotation ?? 0;
    this.scale =
      typeof options.scale === 'number' ? new Vector2(options.scale, options.scale) : (options.scale ?? new Vector2(1, 1));
    for (const child of options.children ?? []) this.children.push(child);
  }

  /**
   * Appends a child to the end of the child list.
   * @param child - Node to append.
   * @returns This node, so calls can be chained.
   */
  addChild(child: Node): this {
    this.children.push(child);
    return this;
  }

  /**
   * Removes a direct child.
   * @param child - Node to remove; missing children are ignored.
   * @returns This node, so calls can be chained.
   */
  removeChild(child: Node): this {
    const index = this.children.indexOf(child);
    if (index >= 0) this.children.splice(index, 1);
    return this;
  }

  /**
   * Removes every direct child.
   * @returns This node, so calls can be chained.
   */
  clearChildren(): this {
    this.children.length = 0;
    return this;
  }

  /**
   * Number of direct children of this node.
   */
  get childCount(): number {
    return this.children.length;
  }

  /**
   * Builds the combined transform of this node.
   * @returns The local matrix produced from translation, rotation, scale, and the optional transform.
   */
  getTransform(): Matrix3 {
    return Matrix3.translation(this.translation.x, this.translation.y)
      .times(Matrix3.rotation(this.rotation))
      .times(Matrix3.scaling(this.scale.x, this.scale.y));
  }

  /** Subclasses produce their own drawing here. */
  protected renderSelf(): RenderElement {
    return { type: 'group', children: [] };
  }

  /**
   * Attaches an input listener and enables pointer events for this node.
   * @param listener - Object receiving down, move, and up callbacks.
   * @returns This node, so calls can be chained.
   */
  addInputListener(listener: InputListener): this {
    this.inputListeners.push(listener);
    this.inputEnabled = true;
    return this;
  }

  /**
   * Detaches an input listener.
   * @param listener - Listener to remove.
   * @returns This node. Pointer events stay enabled until the last listener is gone.
   */
  removeInputListener(listener: InputListener): this {
    const index = this.inputListeners.indexOf(listener);
    if (index >= 0) this.inputListeners.splice(index, 1);
    this.inputEnabled = this.inputListeners.length > 0;
    return this;
  }

  /**
   * Number of listeners currently attached to this node.
   */
  get listenerCount(): number {
    return this.inputListeners.length;
  }

  /**
   * Dispatches a pointer event to every attached listener.
   * Called by the renderer; applications normally register a listener instead.
   * @param type - Phase of the pointer: down, move, or up.
   * @param pointer - Coordinates in scene space, with delta for drags.
   */
  handlePointer(type: PointerEventType, pointer: PointerInfo): void {
    for (const listener of [...this.inputListeners]) {
      if (type === 'down') listener.down?.(pointer);
      else if (type === 'move') listener.move?.(pointer);
      else listener.up?.(pointer);
    }
  }

  /**
   * Lowers the node and its subtree into framework-agnostic render data.
   * @returns The element for this node, carrying children and its input source when
   * listeners are attached.
   */
  toRender(): RenderElement {
    const self = this.renderSelf();
    const childRenders = this.children.map((child) => child.toRender());
    let element: RenderElement = self;
    if (self.type === 'group') {
      element = { ...self, children: [...self.children, ...childRenders] };
    } else if (childRenders.length > 0) {
      element = { type: 'group', children: [self, ...childRenders] };
    }

    const transform = this.getTransform();
    const transformed: RenderElement = transform.equals(Matrix3.IDENTITY) ? element : { ...element, transform: transform.toSVG() };
    const withSource: RenderElement = this.inputEnabled ? { ...transformed, source: this } : transformed;
    if (!this.visible) return { ...withSource, visible: false };
    if (this.opacity !== 1) return { ...withSource, opacity: this.opacity };
    return withSource;
  }
}

/** Options accepted by `RectNode`. */
export interface RectNodeOptions extends NodeOptions, PaintStyle {
  radius?: number;
}

/**
 * Axis-aligned rectangle node drawn from its top-left corner.
 */
export class RectNode extends Node {
  /**
   * Creates a rectangle.
   * @param x - Left edge.
   * @param y - Top edge.
   * @param width - Width in scene units.
   * @param height - Height in scene units.
   * @param style - Paint options and optional corner radius.
   */
  constructor(
    public x: number,
    public y: number,
    public width: number,
    public height: number,
    private style: RectNodeOptions = {},
  ) {
    super(style);
  }

  protected renderSelf(): RenderElement {
    return { type: 'rect', x: this.x, y: this.y, width: this.width, height: this.height, radius: this.style.radius, ...paint(this.style) };
  }
}

/** Options accepted by `CircleNode`. */
export interface CircleNodeOptions extends NodeOptions, PaintStyle {}

/**
 * Circle node positioned by its center.
 */
export class CircleNode extends Node {
  /**
   * Creates a circle.
   * @param centerX - Center x-coordinate.
   * @param centerY - Center y-coordinate.
   * @param radius - Radius in scene units.
   * @param style - Paint options.
   */
  constructor(
    public centerX: number,
    public centerY: number,
    public radius: number,
    private style: CircleNodeOptions = {},
  ) {
    super(style);
  }

  protected renderSelf(): RenderElement {
    return { type: 'circle', centerX: this.centerX, centerY: this.centerY, radius: this.radius, ...paint(this.style) };
  }
}

/** Options accepted by `LineNode`. */
export interface LineNodeOptions extends NodeOptions, PaintStyle {}

/**
 * Straight line segment between two points.
 */
export class LineNode extends Node {
  /**
   * Creates a line.
   * @param x1 - Start x-coordinate.
   * @param y1 - Start y-coordinate.
   * @param x2 - End x-coordinate.
   * @param y2 - End y-coordinate.
   * @param style - Paint options; stroke width matters most here.
   */
  constructor(
    public x1: number,
    public y1: number,
    public x2: number,
    public y2: number,
    private style: LineNodeOptions = {},
  ) {
    super(style);
  }

  protected renderSelf(): RenderElement {
    return { type: 'line', x1: this.x1, y1: this.y1, x2: this.x2, y2: this.y2, ...paint(this.style) };
  }
}

/** Options accepted by `PathNode`. */
export interface PathNodeOptions extends NodeOptions, PaintStyle {}

/**
 * Node that draws an arbitrary path from a Shape.
 */
export class PathNode extends Node {
  /**
   * Creates a path node.
   * @param shape - Geometry to draw; Shape exposes SVG path strings through pathData.
   * @param style - Paint options.
   */
  constructor(
    public shape: Shape,
    private style: PathNodeOptions = {},
  ) {
    super(style);
  }

  protected renderSelf(): RenderElement {
    return { type: 'path', shape: this.shape, ...paint(this.style) };
  }
}

/** Options accepted by `TextNode`. */
export interface TextNodeOptions extends NodeOptions {
  fill?: string;
  fontSize?: number;
  fontWeight?: number;
  anchor?: 'start' | 'middle' | 'end';
  baseline?: 'auto' | 'middle' | 'hanging';
}

/**
 * Text node drawn at an anchor point.
 */
export class TextNode extends Node {
  /**
   * Creates a text run.
   * @param text - Content to draw.
   * @param x - Anchor x-coordinate.
   * @param y - Anchor y-coordinate.
   * @param style - Fill, font size, weight, anchor, and baseline.
   */
  constructor(
    public text: string,
    public x: number,
    public y: number,
    private style: TextNodeOptions = {},
  ) {
    super(style);
  }

  protected renderSelf(): RenderElement {
    return {
      type: 'text',
      x: this.x,
      y: this.y,
      text: this.text,
      fill: this.style.fill,
      fontSize: this.style.fontSize,
      fontWeight: this.style.fontWeight,
      anchor: this.style.anchor,
      baseline: this.style.baseline,
    };
  }
}

/** Options accepted by `ImageNode`. */
export interface ImageNodeOptions extends NodeOptions {
  alt?: string;
}

/**
 * Bitmap drawn at a fixed rectangle.
 */
export class ImageNode extends Node {
  /**
   * Creates an image node.
   * @param src - Image URL or data URI.
   * @param x - Left edge.
   * @param y - Top edge.
   * @param width - Drawn width in scene units.
   * @param height - Drawn height in scene units.
   * @param options - Transform, opacity, and visibility options.
   */
  constructor(
    public href: string,
    public x: number,
    public y: number,
    public width: number,
    public height: number,
    private style: ImageNodeOptions = {},
  ) {
    super(style);
  }

  protected renderSelf(): RenderElement {
    return { type: 'image', href: this.href, x: this.x, y: this.y, width: this.width, height: this.height, alt: this.style.alt };
  }
}

/** Options accepted by `MathNode`. */
export interface MathNodeOptions extends NodeOptions {
  fill?: string;
  fontSize?: number;
  anchor?: 'start' | 'middle' | 'end';
}

/**
 * Typeset mathematics placed at an anchor point.
 * The node carries the LaTeX source and nothing else: turning glyphs into
 * pixels belongs to the display, so the core needs no TeX engine and a headless
 * test can assert on the source it will hand over.
 */
export class MathNode extends Node {
  /**
   * Creates a math node.
   * @param latex - LaTeX source, for example `x^2 + y^2 = r^2`.
   * @param x - Anchor x-coordinate.
   * @param y - Anchor y-coordinate.
   * @param style - Fill, font size, and anchor.
   */
  constructor(
    public latex: string,
    public x: number,
    public y: number,
    private style: MathNodeOptions = {},
  ) {
    super(style);
  }

  protected renderSelf(): RenderElement {
    return {
      type: 'math',
      latex: this.latex,
      x: this.x,
      y: this.y,
      fill: this.style.fill,
      fontSize: this.style.fontSize,
      anchor: this.style.anchor,
    };
  }
}

/**
 * Extension node for custom rendering.
 * The rendererId is resolved through a display registry and the data is owned
 * entirely by the application.
 */
export class ExtensionNode extends Node {
  /**
   * Creates a node whose rendering is delegated to a registered renderer.
   * @param rendererId - Id resolved through the renderer registry.
   * @param data - Arbitrary payload handed to the renderer unchanged.
   */
  constructor(
    readonly rendererId: string,
    readonly data: unknown,
    options: NodeOptions = {},
  ) {
    super(options);
  }

  protected renderSelf(): RenderElement {
    return { type: 'extension', rendererId: this.rendererId, data: this.data };
  }
}

/**
 * Creates an empty grouping node.
 * @param options - Transform applied to the whole group.
 * @returns An empty node ready to receive children.
 */
export function group(options: NodeOptions = {}): Node {
  return new Node(options);
}

/**
 * Builds a line with an arrowhead pointing at the target.
 * @param from - Start of the arrow.
 * @param to - Tip of the arrow.
 * @param style - Stroke options for the shaft.
 * @returns A group holding the shaft and the head.
 */
export function arrow(from: Vector2, to: Vector2, style: LineNodeOptions = {}): Node {
  const headLength = 12;
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const left = v2(to.x - headLength * Math.cos(angle - Math.PI / 7), to.y - headLength * Math.sin(angle - Math.PI / 7));
  const right = v2(to.x - headLength * Math.cos(angle + Math.PI / 7), to.y - headLength * Math.sin(angle + Math.PI / 7));
  return group({
    ...style,
    children: [
      new LineNode(from.x, from.y, to.x, to.y, style),
      new LineNode(left.x, left.y, to.x, to.y, style),
      new LineNode(right.x, right.y, to.x, to.y, style),
    ],
  });
}
