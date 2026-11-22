import type { RenderElement } from '@medu/lerno';
import type { RenderContext2D } from './context2d';

/** Draws a custom node type; keyed by the id an `ExtensionNode` carries. */
export type ExtensionRenderer = (ctx: RenderContext2D, data: unknown) => void;

/** Options every call to {@link renderToCanvas} accepts. */
export interface RenderOptions {
  /**
   * Font family used for every `text` element.
   *
   * It is required rather than defaulted because a generic family such as
   * `sans-serif` silently renders `Ç`, `Ş`, `ç`, `ş` as tofu boxes depending on
   * the host — register a font and name it explicitly.
   */
  fontFamily: string;
  /**
   * Returns an already-loaded bitmap for an image href.
   *
   * Loading is deliberately not done here: it is async, and rendering is not.
   * Preload with the host's loader and hand the resolver the results.
   */
  resolveImage?: (href: string) => unknown | undefined;
  /** Renderers for `ExtensionNode` kinds; an unknown id fails loudly. */
  extensions?: Record<string, ExtensionRenderer>;
}

/** Tokens making up an SVG path string. */
const PATH_TOKEN = /([MmLlHhVvQqCcSsTtAaZz])|(-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)/g;

/**
 * Parses an SVG path string into canvas calls.
 *
 * Only the commands `Shape` produces are supported — `M`, `L`, `Q`, `C`, `Z`,
 * in absolute and relative form. Anything else (`H`, `V`, arcs) is a shape this
 * library never builds, so it fails loudly instead of drawing the wrong outline.
 *
 * @param ctx - Context receiving the path commands.
 * @param pathData - SVG path string, for example `M 0 0 L 10 0 Z`.
 */
function buildPath(ctx: RenderContext2D, pathData: string): void {
  const tokens = pathData.match(PATH_TOKEN);
  if (!tokens) return;

  let index = 0;
  let command = '';
  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;

  const take = (): number => Number(tokens[index++]);

  while (index < tokens.length) {
    const token = tokens[index];
    if (/[MmLlHhVvQqCcSsTtAaZz]/.test(token)) {
      command = token;
      index += 1;
    } else if (!command) {
      throw new Error(`Path data must start with a command, got "${token}"`);
    }

    const relative = command === command.toLowerCase();
    switch (command.toUpperCase()) {
      case 'M': {
        const px = take();
        const py = take();
        x = relative ? x + px : px;
        y = relative ? y + py : py;
        startX = x;
        startY = y;
        ctx.moveTo(x, y);
        break;
      }
      case 'L': {
        const px = take();
        const py = take();
        x = relative ? x + px : px;
        y = relative ? y + py : py;
        ctx.lineTo(x, y);
        break;
      }
      case 'Q': {
        const cx = take();
        const cy = take();
        const px = take();
        const py = take();
        const qx = relative ? x + cx : cx;
        const qy = relative ? y + cy : cy;
        x = relative ? x + px : px;
        y = relative ? y + py : py;
        ctx.quadraticCurveTo(qx, qy, x, y);
        break;
      }
      case 'C': {
        const c1x = take();
        const c1y = take();
        const c2x = take();
        const c2y = take();
        const px = take();
        const py = take();
        const bx1 = relative ? x + c1x : c1x;
        const by1 = relative ? y + c1y : c1y;
        const bx2 = relative ? x + c2x : c2x;
        const by2 = relative ? y + c2y : c2y;
        x = relative ? x + px : px;
        y = relative ? y + py : py;
        ctx.bezierCurveTo(bx1, by1, bx2, by2, x, y);
        break;
      }
      case 'Z':
        ctx.closePath();
        x = startX;
        y = startY;
        break;
      default:
        throw new Error(`Unsupported path command "${command}" — Shape only emits M, L, Q, C and Z`);
    }
  }
}

/**
 * Parses an SVG `matrix(...)` transform into canvas coefficients.
 * SVG and canvas use the same tuple order, so the values pass straight through.
 *
 * @param transform - Transform string, for example `matrix(1 0 0 1 5 7)`.
 * @returns Coefficients for `ctx.transform`, or null for an empty transform.
 */
function parseTransform(transform: string): [number, number, number, number, number, number] | null {
  const match = /matrix\(([^)]*)\)/.exec(transform);
  if (!match) return null;
  const values = match[1].trim().split(/[\s,]+/).map(Number);
  if (values.length !== 6 || values.some((value) => !Number.isFinite(value))) {
    throw new Error(`Unsupported transform "${transform}" — only matrix() is produced by Node.toRender()`);
  }
  return [values[0], values[1], values[2], values[3], values[4], values[5]];
}

/** Parses `stroke-dasharray` text into the number list `setLineDash` wants. */
function parseDash(dash: string): number[] {
  return dash
    .trim()
    .split(/[\s,]+/)
    .map(Number)
    .filter((value) => Number.isFinite(value));
}

/** Paint fields an element may carry; not every element type has all of them. */
type PaintFields = {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  dash?: string;
};

/**
 * Applies paint and dash to the context for one element.
 * @param ctx - Context being styled.
 * @param element - Element carrying fill, stroke, width, and dash.
 */
function applyPaint(ctx: RenderContext2D, element: PaintFields): void {
  if (element.fill !== undefined) ctx.fillStyle = element.fill;
  if (element.stroke !== undefined) ctx.strokeStyle = element.stroke;
  if (element.strokeWidth !== undefined) ctx.lineWidth = element.strokeWidth;
  if (element.dash !== undefined) ctx.setLineDash(parseDash(element.dash));
}

/**
 * Raises a clear error instead of silently dropping content.
 * @param message - What could not be drawn and what to do about it.
 */
function refuse(message: string): never {
  throw new Error(message);
}

/**
 * Draws one render element and its subtree onto a 2D context.
 *
 * This is the headless twin of `Display` in `@medu/lerno-react`: same render
 * tree, no React, no DOM. Groups push and pop their transform, opacity, and dash
 * so siblings never inherit each other's state.
 *
 * @param ctx - Canvas context in scene coordinates.
 * @param element - Lowered render element to draw.
 * @param options - Font family and custom node renderers.
 */
function drawElement(ctx: RenderContext2D, element: RenderElement, options: RenderOptions): void {
  if (element.visible === false) return;

  ctx.save();

  if (element.transform) {
    const matrix = parseTransform(element.transform);
    if (matrix) ctx.transform(...matrix);
  }
  if (element.opacity !== undefined) ctx.globalAlpha *= element.opacity;

  switch (element.type) {
    case 'group': {
      for (const child of element.children) drawElement(ctx, child, options);
      break;
    }
    case 'rect': {
      applyPaint(ctx, element);
      ctx.beginPath();
      if (element.radius) {
        const r = Math.min(element.radius, element.width / 2, element.height / 2);
        ctx.moveTo(element.x + r, element.y);
        ctx.lineTo(element.x + element.width - r, element.y);
        ctx.quadraticCurveTo(element.x + element.width, element.y, element.x + element.width, element.y + r);
        ctx.lineTo(element.x + element.width, element.y + element.height - r);
        ctx.quadraticCurveTo(element.x + element.width, element.y + element.height, element.x + element.width - r, element.y + element.height);
        ctx.lineTo(element.x + r, element.y + element.height);
        ctx.quadraticCurveTo(element.x, element.y + element.height, element.x, element.y + element.height - r);
        ctx.lineTo(element.x, element.y + r);
        ctx.quadraticCurveTo(element.x, element.y, element.x + r, element.y);
        ctx.closePath();
      } else {
        ctx.moveTo(element.x, element.y);
        ctx.lineTo(element.x + element.width, element.y);
        ctx.lineTo(element.x + element.width, element.y + element.height);
        ctx.lineTo(element.x, element.y + element.height);
        ctx.closePath();
      }
      if (element.fill !== undefined) ctx.fill();
      if (element.stroke !== undefined) ctx.stroke();
      break;
    }
    case 'circle': {
      applyPaint(ctx, element);
      ctx.beginPath();
      const { centerX, centerY, radius } = element;
      // Four quadratic curves, exactly as Shape.circle builds it.
      ctx.moveTo(centerX - radius, centerY);
      ctx.quadraticCurveTo(centerX - radius, centerY - radius, centerX, centerY - radius);
      ctx.quadraticCurveTo(centerX + radius, centerY - radius, centerX + radius, centerY);
      ctx.quadraticCurveTo(centerX + radius, centerY + radius, centerX, centerY + radius);
      ctx.quadraticCurveTo(centerX - radius, centerY + radius, centerX - radius, centerY);
      ctx.closePath();
      if (element.fill !== undefined) ctx.fill();
      if (element.stroke !== undefined) ctx.stroke();
      break;
    }
    case 'line': {
      applyPaint(ctx, element);
      ctx.beginPath();
      ctx.moveTo(element.x1, element.y1);
      ctx.lineTo(element.x2, element.y2);
      ctx.stroke();
      break;
    }
    case 'path': {
      applyPaint(ctx, element);
      ctx.beginPath();
      buildPath(ctx, element.shape.pathData);
      if (element.fill !== undefined) ctx.fill();
      if (element.stroke !== undefined) ctx.stroke();
      break;
    }
    case 'text': {
      if (!options.fontFamily) {
        refuse(
          'renderToCanvas requires options.fontFamily — a generic family like "sans-serif" falls back ' +
            'differently per host and can render any script as tofu, so the family is named explicitly.',
        );
      }
      ctx.fillStyle = element.fill ?? ctx.fillStyle;
      ctx.font = `${element.fontSize ?? 16}px ${options.fontFamily}`;
      ctx.textAlign = element.anchor === 'middle' ? 'center' : element.anchor === 'end' ? 'right' : 'left';
      ctx.textBaseline =
        element.baseline === 'middle' ? 'middle' : element.baseline === 'hanging' ? 'hanging' : 'alphabetic';
      ctx.fillText(element.text, element.x, element.y);
      break;
    }
    case 'image': {
      const image = options.resolveImage?.(element.href);
      if (!image) {
        refuse(
          `Image "${element.href}" has no loaded bitmap — pass options.resolveImage with a preloaded image, ` +
            'otherwise the export would silently drop it.',
        );
      }
      ctx.drawImage(image, element.x, element.y, element.width, element.height);
      break;
    }
    case 'math':
      refuse(
        `MathNode "${element.latex}" cannot be typeset headlessly: this renderer has no TeX engine. ` +
          'Render math in the browser, or add a MathJax SVG adapter.',
      );
      break;
    case 'extension': {
      const renderer = options.extensions?.[element.rendererId];
      if (!renderer) {
        refuse(`No headless renderer registered for extension node "${element.rendererId}".`);
      }
      renderer(ctx, element.data);
      break;
    }
  }

  ctx.restore();
}

/**
 * Draws a render tree onto a 2D context — the headless twin of `Display`.
 *
 * Coordinates are scene units: size the canvas and its transform before calling,
 * or pass a canvas whose pixel size already matches.
 *
 * @param ctx - Context to draw into.
 * @param tree - Render tree root, the value `root.toRender()` returns.
 * @param options - Font family (required) and extension renderers.
 */
export function renderToCanvas(ctx: RenderContext2D, tree: RenderElement, options: RenderOptions): void {
  drawElement(ctx, tree, options);
}
