import { describe, expect, it } from 'bun:test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { Node } from '@medu/lerno';
import { composeFrames } from './compose';
import { resolveFfmpeg } from './encoder';
import { exportMp4 } from './export';

const ffmpegAvailable = spawnSync(resolveFfmpeg(), ['-version'], { stdio: 'ignore' }).status === 0;

const W = 320;
const H = 180;
const FPS = 12;

function createScene() {
  const root = new Node();
  return {
    root,
    step() {
      root.clearChildren();
    },
  };
}

/** A red one-second plate at the export geometry. */
function makeVideo(dir: string): string {
  const path = join(dir, 'plate.mp4');
  const result = spawnSync(resolveFfmpeg(), [
    '-y', '-v', 'error',
    '-f', 'lavfi', '-i', `color=c=red:s=${W}x${H}:d=1:r=${FPS}`,
    '-pix_fmt', 'yuv420p',
    path,
  ]);
  if (result.status !== 0) throw new Error('could not build the test plate');
  return path;
}

function pixel(frame: Uint8Array, x: number, y: number): [number, number, number] {
  const offset = (y * W + x) * 4;
  return [frame[offset], frame[offset + 1], frame[offset + 2]];
}

/** Counts pixels the caption plate darkened by more than 30 levels of red. */
function darkenedPixels(plain: Uint8Array, captioned: Uint8Array): number {
  let changed = 0;
  for (let y = H - 40; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const [before] = pixel(plain, x, y);
      const [after] = pixel(captioned, x, y);
      if (before - after > 30) changed += 1;
    }
  }
  return changed;
}

describe.skipIf(!ffmpegAvailable)('composeFrames', () => {
  it('draws the video plate under the frames', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'lerno-compose-'));
    const video = makeVideo(dir);
    const frames: Uint8Array[] = [];

    for await (const frame of composeFrames(createScene(), {
      width: W,
      height: H,
      fps: FPS,
      duration: 1,
      fontFamily: 'Arial',
      video,
    })) {
      frames.push(frame);
    }

    expect(frames).toHaveLength(12);
    expect(frames[0].byteLength).toBe(W * H * 4);

    const [red, green, blue] = pixel(frames[0], 10, 10);
    expect(red).toBeGreaterThan(150);
    expect(green).toBeLessThan(100);
    expect(blue).toBeLessThan(100);
  });

  it('burns captions into the frame', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'lerno-compose-vtt-'));
    const video = makeVideo(dir);
    const vtt = join(dir, 'tr.vtt');
    writeFileSync(vtt, 'WEBVTT\n\n00:00:00.000 --> 00:01:00.000\nYer cekimi 9,8\n');

    const read = async (withVtt: boolean): Promise<Uint8Array> => {
      const options = {
        width: W,
        height: H,
        fps: FPS,
        duration: 1,
        fontFamily: 'Arial',
        video,
        ...(withVtt ? { vtt } : {}),
      };
      for await (const frame of composeFrames(createScene(), options)) return frame;
      throw new Error('no frames');
    };

    const plain = await read(false);
    const captioned = await read(true);

    expect(darkenedPixels(plain, captioned)).toBeGreaterThan(300);
    expect(captioned).not.toEqual(plain);
  });

  it('produces an MP4 with video and captions', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'lerno-compose-mp4-'));
    const video = makeVideo(dir);
    const out = join(dir, 'out.mp4');
    const result = await exportMp4(createScene(), {
      out,
      width: W,
      height: H,
      fps: FPS,
      duration: 1,
      fontFamily: 'Arial',
      video,
    });

    expect(result.frames).toBe(12);
    const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out], {
      encoding: 'utf8',
    });
    expect(Number(probe.stdout.trim())).toBeCloseTo(1, 1);
  });
});
