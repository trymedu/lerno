import { spawn } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/** What {@link encodeFrames} needs to know to write a file. */
export interface EncodeOptions {
  /** Frame width in pixels. */
  width: number;
  /** Frame height in pixels. */
  height: number;
  /** Frame rate written to the file. */
  fps: number;
  /** Output path. */
  out: string;
  /** H.264 constant rate factor; lower is better and larger. Defaults to `20`. */
  crf?: number;
  /** x264 speed preset. Defaults to `veryfast`. */
  preset?: string;
  /** ffmpeg binary; defaults to `FFMPEG_PATH`, then `ffmpeg-static`, then PATH. */
  ffmpegPath?: string;
  /**
   * Audio file muxed into the output, for example narration or a music bed.
   * The video stream is copied from the rendered frames; the track is encoded
   * as AAC and trimmed to the shorter of the two.
   */
  audio?: string;
}

/** What a finished encode reports. */
export interface EncodeResult {
  /** Output path. */
  out: string;
  /** Frames written. */
  frames: number;
  /** Encoded file size in bytes. */
  bytes: number;
}

/**
 * Finds an ffmpeg binary, in order of preference.
 * @param override - Explicit path to use instead of resolving.
 * @returns The binary path or name.
 * @throws When nothing can be found, naming every place that was tried.
 */
export function resolveFfmpeg(override?: string): string {
  if (override) {
    if (!existsSync(override)) throw new Error(`ffmpeg not found at ${override}`);
    return override;
  }
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;

  // Optional dependency: only installed when the consumer chose the ffmpeg path.
  try {
    const staticPath = require('ffmpeg-static') as string | null;
    if (staticPath && existsSync(staticPath)) return staticPath;
  } catch {
    // not installed — fall through to PATH
  }

  return 'ffmpeg';
}

/** Frames feed the encoder as raw RGBA buffers, one per frame. */
export type FrameSource = Iterable<Uint8Array> | AsyncIterable<Uint8Array>;

/**
 * Pipes raw RGBA frames into ffmpeg and writes an H.264 MP4.
 *
 * Frames go straight from the rasterizer to the encoder's stdin: no intermediate
 * image files, no second quality step, and the model never waits on disk.
 *
 * @param frames - One RGBA buffer per frame, each `width * height * 4` bytes.
 * @param options - Dimensions, frame rate, output path, and codec settings.
 * @returns The path, frame count, and encoded size.
 */
export async function encodeFrames(frames: FrameSource, options: EncodeOptions): Promise<EncodeResult> {
  const { width, height, fps, out } = options;
  const expected = width * height * 4;
  const audio = options.audio;

  if (audio && !existsSync(audio)) throw new Error(`Audio track not found: ${audio}`);

  const child = spawn(
    resolveFfmpeg(options.ffmpegPath),
    [
      '-y',
      '-loglevel', 'error',
      '-f', 'rawvideo',
      '-pix_fmt', 'rgba',
      '-s', `${width}x${height}`,
      '-framerate', String(fps),
      '-i', '-',
      ...(audio ? ['-i', audio, '-map', '0:v:0', '-map', '1:a:0', '-c:a', 'aac', '-b:a', '192k', '-shortest'] : []),
      '-c:v', 'libx264',
      '-preset', options.preset ?? 'veryfast',
      '-crf', String(options.crf ?? 20),
      '-pix_fmt', 'yuv420p',
      out,
    ],
    { stdio: ['pipe', 'ignore', 'pipe'] },
  );

  let stderr = '';
  child.stderr.on('data', (chunk: Buffer) => {
    stderr += chunk.toString();
  });

  const exited = new Promise<number>((resolve, reject) => {
    child.on('error', reject);
    child.on('close', (code) => resolve(code ?? 1));
  });

  let count = 0;
  try {
    for await (const frame of frames as AsyncIterable<Uint8Array>) {
      if (frame.byteLength !== expected) {
        throw new Error(`Frame ${count} is ${frame.byteLength} bytes, expected ${expected} (${width}x${height} RGBA)`);
      }
      count += 1;
      if (!child.stdin.write(frame)) {
        await new Promise<void>((resolve) => child.stdin.once('drain', resolve));
      }
    }
    child.stdin.end();
  } catch (error) {
    child.kill('SIGKILL');
    throw error;
  }

  const code = await exited;
  if (code !== 0) {
    throw new Error(
      `ffmpeg exited with code ${code} after ${count} frames:\n${stderr.trim().split('\n').slice(-8).join('\n')}`,
    );
  }

  if (!existsSync(out)) throw new Error(`ffmpeg reported success but ${out} was not created`);
  return { out, frames: count, bytes: statSync(out).size };
}
