import {
  activeLayers,
  layerOpacity,
  resolveLayerProps,
  type InteractionLayer,
  type LernoDocument,
  type VariableValue,
} from '@medu/lerno';
import type { SKRSContext2D } from '@napi-rs/canvas';

/**
 * Canvas painters for the built-in component layers.
 *
 * The interactive player renders these as React components; this module draws
 * the same five controls with canvas primitives so an MP4 keeps them instead of
 * dropping to a bare video. The geometry mirrors the React set: 44 px control
 * height, 12 px radius, 14 px padding. Only the built-ins are painted; an
 * unknown component draws nothing and is reported by `unpaintedLayers`.
 */

export type LayerTone = 'light' | 'dark';

/** A layer resolved for one frame. */
export interface ResolvedLayerPaint {
  layer: InteractionLayer;
  props: Record<string, unknown>;
  value: VariableValue | undefined;
  opacity: number;
}

/** Options for painting the layer set of one frame. */
export interface LayerBurnOptions {
  document: LernoDocument;
  /** Media node whose layers are burned. */
  nodeId: string;
  /** Variable snapshot; defaults to the document's initial values. */
  variables?: Record<string, VariableValue>;
  tone?: LayerTone;
}

interface Palette {
  surface: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  accentText: string;
  track: string;
  knob: string;
}

const PALETTES: Record<LayerTone, Palette> = {
  light: {
    surface: '#FFFFFF',
    border: '#E4E4E7',
    text: '#18181B',
    muted: '#71717A',
    accent: '#18181B',
    accentText: '#FAFAFA',
    track: '#E4E4E7',
    knob: '#FFFFFF',
  },
  dark: {
    surface: 'rgba(9, 9, 11, 0.86)',
    border: 'rgba(255, 255, 255, 0.18)',
    text: '#FAFAFA',
    muted: '#A1A1AA',
    accent: '#FAFAFA',
    accentText: '#18181B',
    track: 'rgba(255, 255, 255, 0.28)',
    knob: '#FAFAFA',
  },
};

const CONTROL_HEIGHT = 44;
const RADIUS = 12;
const PADDING = 14;
const FONT_STACK = 'Arial, Helvetica, sans-serif';

/** Components with a canvas painter. */
export const PAINTED_COMPONENTS = ['ui.switch', 'ui.button', 'ui.select', 'ui.slider', 'lab.readout'] as const;

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

function displayValue(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'On' : 'Off';
  if (typeof value === 'number') return value.toLocaleString('tr-TR');
  if (typeof value === 'string') return value;
  return '—';
}

function roundRect(ctx: SKRSContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function label(ctx: SKRSContext2D, text: string, x: number, y: number, size: number, color: string, weight: number, align: CanvasTextAlign = 'left'): void {
  ctx.font = `${weight} ${size}px ${FONT_STACK}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

function surface(ctx: SKRSContext2D, x: number, y: number, width: number, height: number, palette: Palette): void {
  roundRect(ctx, x, y, width, height, RADIUS);
  ctx.fillStyle = palette.surface;
  ctx.fill();
  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function paintSwitch(ctx: SKRSContext2D, x: number, y: number, width: number, layer: ResolvedLayerPaint, palette: Palette): void {
  const checked = layer.value === undefined ? asBoolean(layer.props.checked) : asBoolean(layer.value);
  surface(ctx, x, y, width, CONTROL_HEIGHT, palette);
  label(ctx, asString(layer.props.label, 'Toggle'), x + PADDING, y + CONTROL_HEIGHT / 2, 14, palette.text, 500);

  const trackWidth = 44;
  const trackHeight = 24;
  const trackX = x + width - PADDING - trackWidth;
  const trackY = y + (CONTROL_HEIGHT - trackHeight) / 2;
  roundRect(ctx, trackX, trackY, trackWidth, trackHeight, trackHeight / 2);
  ctx.fillStyle = checked ? palette.accent : palette.track;
  ctx.fill();

  const knobX = checked ? trackX + trackWidth - 12 : trackX + 12;
  ctx.beginPath();
  ctx.arc(knobX, trackY + trackHeight / 2, 10, 0, Math.PI * 2);
  ctx.fillStyle = checked ? palette.accentText : palette.knob;
  ctx.fill();
}

function paintButton(ctx: SKRSContext2D, x: number, y: number, width: number, layer: ResolvedLayerPaint, palette: Palette): void {
  const height = 40;
  const secondary = asString(layer.props.variant, 'primary') === 'secondary';
  roundRect(ctx, x, y, width, height, 10);
  ctx.fillStyle = secondary ? palette.surface : palette.accent;
  ctx.fill();
  if (secondary) {
    ctx.strokeStyle = palette.border;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  label(ctx, asString(layer.props.label, 'Continue'), x + width / 2, y + height / 2, 14, secondary ? palette.text : palette.accentText, 500, 'center');
}

function paintSelect(ctx: SKRSContext2D, x: number, y: number, width: number, layer: ResolvedLayerPaint, palette: Palette): void {
  const height = 58;
  surface(ctx, x, y, width, height, palette);
  label(ctx, asString(layer.props.label, 'Select').toUpperCase(), x + PADDING, y + 17, 10, palette.muted, 600);

  const options = Array.isArray(layer.props.options) ? layer.props.options : [];
  const selected = options.find((option) => {
    if (!option || typeof option !== 'object') return false;
    const entry = option as { value?: unknown; label?: unknown };
    return String(entry.value) === String(layer.value);
  }) as { label?: unknown } | undefined;
  label(ctx, asString(selected?.label, 'No options'), x + PADDING, y + 38, 14, palette.text, 500);

  const chevronX = x + width - PADDING - 6;
  const chevronY = y + height / 2;
  ctx.beginPath();
  ctx.moveTo(chevronX - 5, chevronY - 2);
  ctx.lineTo(chevronX, chevronY + 3);
  ctx.lineTo(chevronX + 5, chevronY - 2);
  ctx.strokeStyle = palette.muted;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.stroke();
}

function paintSlider(ctx: SKRSContext2D, x: number, y: number, width: number, layer: ResolvedLayerPaint, palette: Palette): void {
  const height = 58;
  surface(ctx, x, y, width, height, palette);
  const min = asNumber(layer.props.min, 0);
  const max = asNumber(layer.props.max, 100);
  const value = asNumber(layer.value ?? layer.props.value, min);
  const unit = asString(layer.props.unit);

  label(ctx, asString(layer.props.label, 'Value').toUpperCase(), x + PADDING, y + 17, 10, palette.muted, 600);
  label(ctx, `${value}${unit ? ` ${unit}` : ''}`, x + width - PADDING, y + 17, 12, palette.text, 600, 'right');

  const trackX = x + PADDING;
  const trackY = y + height - 16;
  const trackWidth = width - PADDING * 2;
  roundRect(ctx, trackX, trackY, trackWidth, 4, 2);
  ctx.fillStyle = palette.track;
  ctx.fill();

  const ratio = max === min ? 0 : Math.max(0, Math.min(1, (value - min) / (max - min)));
  roundRect(ctx, trackX, trackY, Math.max(4, trackWidth * ratio), 4, 2);
  ctx.fillStyle = palette.accent;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(trackX + trackWidth * ratio, trackY + 2, 7, 0, Math.PI * 2);
  ctx.fillStyle = palette.accent;
  ctx.fill();
}

function paintReadout(ctx: SKRSContext2D, x: number, y: number, width: number, layer: ResolvedLayerPaint, palette: Palette): void {
  const rows = Array.isArray(layer.props.rows)
    ? layer.props.rows.filter((row): row is { label: string; value: unknown } => {
        if (!row || typeof row !== 'object') return false;
        return typeof (row as { label?: unknown }).label === 'string';
      })
    : [];
  const height = 42 + rows.length * 20;
  surface(ctx, x, y, width, height, palette);
  label(ctx, asString(layer.props.title, 'Live values').toUpperCase(), x + PADDING, y + 18, 10, palette.muted, 600);

  rows.forEach((row, index) => {
    const rowY = y + 40 + index * 20;
    label(ctx, row.label, x + PADDING, rowY, 12, palette.muted, 400);
    label(ctx, displayValue(row.value), x + width - PADDING, rowY, 12, palette.text, 600, 'right');
  });
}

/**
 * Draws one component layer at its placement rectangle.
 *
 * @param ctx - Canvas context of the composed frame.
 * @param layer - Layer record (id, component, placement).
 * @param props - Props with `$var` references already resolved.
 * @param value - Value of the bound variable, when the layer binds one.
 * @param frame - Frame size in pixels; placement is normalized.
 * @param options - Tone and font.
 * @returns `false` when the component has no canvas painter.
 */
export function paintLayer(
  ctx: SKRSContext2D,
  layer: InteractionLayer,
  props: Record<string, unknown>,
  value: VariableValue | undefined,
  frame: { width: number; height: number },
  options: { tone?: LayerTone } = {},
): boolean {
  const palette = PALETTES[options.tone ?? 'light'];
  const x = layer.placement.x * frame.width;
  const y = layer.placement.y * frame.height;
  const width = layer.placement.w * frame.width;
  const resolved: ResolvedLayerPaint = { layer, props, value, opacity: 1 };

  switch (layer.component) {
    case 'ui.switch':
      paintSwitch(ctx, x, y, width, resolved, palette);
      return true;
    case 'ui.button':
      paintButton(ctx, x, y, width, resolved, palette);
      return true;
    case 'ui.select':
      paintSelect(ctx, x, y, width, resolved, palette);
      return true;
    case 'ui.slider':
      paintSlider(ctx, x, y, width, resolved, palette);
      return true;
    case 'lab.readout':
      paintReadout(ctx, x, y, width, resolved, palette);
      return true;
    default:
      return false;
  }
}

/** Layers of a media node visible at a playhead, with props and bindings resolved. */
export function layersAtTime(
  document: LernoDocument,
  nodeId: string,
  timeMs: number,
  variables: Record<string, VariableValue>,
): ResolvedLayerPaint[] {
  const node = document.nodes.find((entry) => entry.id === nodeId);
  if (!node || node.type !== 'media') return [];

  return activeLayers(node.layers, timeMs, variables).map((layer) => ({
    layer,
    props: resolveLayerProps(layer.props, variables) as Record<string, unknown>,
    value: layer.bind.value ? variables[layer.bind.value] : undefined,
    opacity: layerOpacity(layer, timeMs),
  }));
}

/** Component types a document uses that the canvas painter cannot draw. */
export function unpaintedLayers(document: LernoDocument): string[] {
  const painted = new Set<string>(PAINTED_COMPONENTS);
  const used = new Set<string>();
  for (const node of document.nodes) {
    if (node.type !== 'media') continue;
    for (const layer of node.layers) used.add(layer.component);
  }
  return [...used].filter((component) => !painted.has(component));
}
