import { readFileSync } from 'node:fs';
import { initialVariables } from '@medu/lerno';
import { ImageData, createCanvas, type SKRSContext2D } from '@napi-rs/canvas';
import { renderToCanvas } from './canvas';
import { frameTrees, type Scene } from './frames';
import type { ExportOptions } from './export';
import { layersAtTime, paintLayer, unpaintedLayers, type LayerBurnOptions } from './layers';
import { cueAt, parseVtt, type CaptionCue } from './vtt';
import { videoFrames } from './video';

/** Scene export with a video plate and burned-in captions. */
export interface ComposeOptions extends ExportOptions {
  /** Video drawn under the scene, scaled and cropped to the canvas. */
  video?: string;
  /** WebVTT file drawn over the scene. */
  vtt?: string;
  /** ffmpeg binary used to decode the video plate. */
  videoFfmpegPath?: string;
  /** Caption size in pixels; defaults to 4% of the height. */
  captionFontSize?: number;
  /** Component layers burned into the frames at their placement rectangles. */
  layers?: LayerBurnOptions;
}

/** Breaks text into lines that fit the measured width. */
export function wrapCaption(ctx: SKRSContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    let current = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = current.length > 0 ? `${current} ${word}` : word;
      if (current.length === 0 || ctx.measureText(candidate).width <= maxWidth) {
        current = candidate;
      } else {
        lines.push(current);
        current = word;
      }
    }
    if (current.length > 0) lines.push(current);
  }
  return lines;
}

/**
 * Draws one cue at the bottom of the frame on a dark plate.
 *
 * The plate is always drawn, even when the font measures zero, so a missing
 * font produces a visible empty bar instead of silently losing the subtitle.
 */
export function drawCaption(
  ctx: SKRSContext2D,
  cue: CaptionCue,
  width: number,
  height: number,
  fontFamily: string,
  fontSize?: number,
): void {
  const size = fontSize ?? Math.round(height * 0.04);
  ctx.save();
  ctx.font = `500 ${size}px ${fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const maxWidth = width * 0.8;
  const lines = wrapCaption(ctx, cue.text, maxWidth);
  const lineHeight = Math.round(size * 1.35);
  const paddingX = Math.round(size * 0.8);
  const paddingY = Math.round(size * 0.5);
  const textWidth = Math.max(0, ...lines.map((line) => ctx.measureText(line).width));
  const boxWidth = Math.min(width, textWidth + paddingX * 2);
  const boxHeight = lines.length * lineHeight + paddingY * 2;
  const bottom = height - Math.round(height * 0.06);
  const top = bottom - boxHeight;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
  ctx.fillRect(Math.round((width - boxWidth) / 2), top, boxWidth, boxHeight);

  ctx.fillStyle = '#FFFFFF';
  lines.forEach((line, index) => {
    ctx.fillText(line, width / 2, top + paddingY + lineHeight * (index + 0.5));
  });
  ctx.restore();
}

/**
 * Yields composited frames: video plate, then the scene, then the caption cue.
 *
 * The plate is decoded at the export size and frame rate, so the two streams
 * cannot drift. Without a video the background colour fills the frame, which
 * keeps this path interchangeable with `rgbaFrames`.
 *
 * @param scene - Root and step function to record.
 * @param options - Geometry, timing, plate, captions, and font.
 * @returns One RGBA buffer per frame.
 */
export async function* composeFrames(scene: Scene, options: ComposeOptions): AsyncGenerator<Uint8Array> {
  const { width, height, fontFamily } = options;
  const fps = options.fps ?? 60;
  const duration = options.duration ?? 1;
  const total = Math.round(fps * duration);
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  const cues = options.vtt ? parseVtt(readFileSync(options.vtt, 'utf8')) : [];
  const plate = options.video
    ? videoFrames(options.video, { width, height, fps, count: total, ffmpegPath: options.videoFfmpegPath })
    : undefined;
  const background = options.background ?? '#000000';
  const layerOptions = options.layers;
  const layerVariables = layerOptions
    ? (layerOptions.variables ?? initialVariables(layerOptions.document))
    : undefined;

  if (layerOptions) {
    const missing = unpaintedLayers(layerOptions.document);
    if (missing.length > 0) {
      console.warn(`[lerno-export] no canvas painter for: ${missing.join(', ')}; those layers are not burned.`);
    }
  }

  let index = 0;
  for (const tree of frameTrees(scene, options)) {
    if (plate) {
      const next = await plate.next();
      if (!next.done) {
        ctx.putImageData(new ImageData(new Uint8ClampedArray(next.value), width, height), 0, 0);
      }
    } else {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);
    }

    renderToCanvas(ctx, tree, {
      fontFamily,
      ...(options.extensions ? { extensions: options.extensions } : {}),
    });

    if (layerOptions && layerVariables) {
      const visible = layersAtTime(layerOptions.document, layerOptions.nodeId, (index / fps) * 1000, layerVariables);
      for (const entry of visible) {
        if (entry.opacity <= 0) continue;
        ctx.globalAlpha = entry.opacity;
        paintLayer(ctx, entry.layer, entry.props, entry.value, { width, height }, { tone: layerOptions.tone });
      }
      ctx.globalAlpha = 1;
    }

    const cue = cueAt(cues, (index / fps) * 1000);
    if (cue) drawCaption(ctx, cue, width, height, fontFamily, options.captionFontSize);

    const pixels = ctx.getImageData(0, 0, width, height).data;
    index += 1;
    yield new Uint8Array(pixels);
  }
}
