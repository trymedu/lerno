import { readFileSync } from 'node:fs';
import { createCanvas, type Canvas } from '@napi-rs/canvas';
import { renderToCanvas, type ExtensionRenderer } from './canvas';
import { composeFrames } from './compose';
import type { LayerBurnOptions } from './layers';
import { encodeFrames, type EncodeResult } from './encoder';
import { assertGlyphCoverage, collectText } from './font';
import { frameTrees, type FrameOptions, type Scene } from './frames';
import { parseVtt } from './vtt';

/** Geometry, timing, and look for a whole export. */
export interface ExportOptions extends FrameOptions {
  /** Output width in pixels. */
  width: number;
  /** Output height in pixels. */
  height: number;
  /**
   * Font family for every text element.
   *
   * Required because a generic family silently loses glyphs: the characters the
   * scene draws are probed with {@link assertGlyphCoverage} before encoding.
   */
  fontFamily: string;
  /** Painted behind the scene before each frame. Defaults to `#000000`. */
  background?: string;
  /** Renderers for `ExtensionNode` kinds. */
  extensions?: Record<string, ExtensionRenderer>;
}

/** Export options plus the destination and codec settings. */
export interface ExportMp4Options extends ExportOptions {
  /** Output path. */
  out: string;
  /** H.264 constant rate factor; lower is better and larger. Defaults to `20`. */
  crf?: number;
  /** x264 speed preset. Defaults to `veryfast`. */
  preset?: string;
  /** ffmpeg binary override; see `resolveFfmpeg`. */
  ffmpegPath?: string;
  /** Optional audio file muxed into the MP4. */
  audio?: string;
  /** Video drawn under the scene, scaled and cropped to the frame. */
  video?: string;
  /** WebVTT file burned into the composed frames. */
  vtt?: string;
  /** ffmpeg binary used to decode the video plate. */
  videoFfmpegPath?: string;
  /** Caption size in pixels; defaults to 4% of the height. */
  captionFontSize?: number;
  /** Component layers burned into the frames at their placement rectangles. */
  layers?: LayerBurnOptions;
}

/**
 * Renders each frame to raw RGBA without writing anything to disk.
 *
 * Frames are produced lazily, so a consumer can pipe them straight into an
 * encoder and the scene never waits on storage. Each buffer is a fresh copy —
 * correctness over the copy, which is ~8 MB per 1080p frame.
 *
 * @param scene - Root and step function to record.
 * @param options - Geometry, timing, font, and background.
 * @returns One RGBA buffer per frame, `width * height * 4` bytes each.
 */
export function* rgbaFrames(scene: Scene, options: ExportOptions): Generator<Uint8Array, void, undefined> {
  const { width, height, fontFamily } = options;
  const background = options.background ?? '#000000';
  const canvas: Canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  for (const tree of frameTrees(scene, options)) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
    renderToCanvas(ctx, tree, { fontFamily, ...(options.extensions ? { extensions: options.extensions } : {}) });
    const pixels = ctx.getImageData(0, 0, width, height).data;
    yield new Uint8Array(pixels);
  }
}

/**
 * Records a scene and encodes it straight to an H.264 MP4.
 *
 * The pipeline is one pass: step the model, rasterize, pipe to ffmpeg. No
 * intermediate images, no second quality step, and a deterministic `dt` means
 * two runs produce the same frames.
 *
 * When the scene draws text, the family is checked against **the characters that
 * scene actually uses** — not a preset sample — so a render that would produce
 * tofu boxes fails before it costs minutes. Only the first frame is inspected;
 * text introduced later can be checked with `collectText` and
 * `missingGlyphs` by the caller.
 *
 * @param scene - Root and step function to record.
 * @param options - Geometry, timing, font, and destination.
 * @returns The output path, frame count, and encoded size.
 */
export async function exportMp4(scene: Scene, options: ExportMp4Options): Promise<EncodeResult> {
  assertGlyphCoverage(options.fontFamily, collectText(scene.root.toRender()));

  if (options.video || options.vtt || options.layers) {
    if (options.vtt) {
      const cues = parseVtt(readFileSync(options.vtt, 'utf8'));
      assertGlyphCoverage(options.fontFamily, cues.map((cue) => cue.text).join(' '));
    }
    return encodeFrames(composeFrames(scene, options), { ...options, fps: options.fps ?? 60 });
  }

  return encodeFrames(rgbaFrames(scene, options), { ...options, fps: options.fps ?? 60 });
}
