import { spawn } from 'node:child_process';
import type { Readable } from 'node:stream';
import { resolveFfmpeg } from './encoder';

/** What {@link videoFrames} needs to decode. */
export interface VideoFrameOptions {
  width: number;
  height: number;
  fps: number;
  /** Number of frames to read; decoding stops after this many. */
  count: number;
  /** ffmpeg binary override. */
  ffmpegPath?: string;
}

/** Reads fixed-size RGBA frames from a byte stream. */
export async function* readFrames(stream: Readable, size: number): AsyncGenerator<Uint8Array> {
  let buffer = new Uint8Array(0);
  for await (const chunk of stream) {
    const bytes = chunk as Uint8Array;
    const merged = new Uint8Array(buffer.length + bytes.length);
    merged.set(buffer);
    merged.set(bytes, buffer.length);
    buffer = merged;

    while (buffer.length >= size) {
      yield buffer.subarray(0, size);
      buffer = buffer.subarray(size);
    }
  }
}

/**
 * Decodes a video into raw RGBA frames at the render size and frame rate.
 *
 * The source is scaled to fill the frame and centre-cropped, then resampled to
 * `fps`, so a 24 fps clip and a 30 fps export line up frame for frame instead of
 * drifting. This is the background plate the scene draws over.
 *
 * @param path - Video file.
 * @param options - Output geometry, frame rate, and count.
 * @returns One RGBA buffer per frame.
 */
export async function* videoFrames(path: string, options: VideoFrameOptions): AsyncGenerator<Uint8Array> {
  const { width, height, fps, count } = options;
  const child = spawn(
    resolveFfmpeg(options.ffmpegPath),
    [
      '-v', 'error',
      '-i', path,
      '-vf', `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},fps=${fps}`,
      '-frames:v', String(count),
      '-f', 'rawvideo',
      '-pix_fmt', 'rgba',
      '-',
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );

  let stderr = '';
  child.stderr.on('data', (chunk: Buffer) => {
    stderr += chunk.toString();
  });

  const exited = new Promise<number>((resolve, reject) => {
    child.on('error', reject);
    child.on('close', (code) => resolve(code ?? 1));
  });

  if (!child.stdout) throw new Error('ffmpeg produced no output stream');

  for await (const frame of readFrames(child.stdout, width * height * 4)) {
    yield frame;
  }

  const code = await exited;
  if (code !== 0) {
    throw new Error(`ffmpeg could not decode ${path}:\n${stderr.trim().split('\n').slice(-6).join('\n')}`);
  }
}
