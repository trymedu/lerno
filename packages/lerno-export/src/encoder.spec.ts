import { describe, expect, it } from 'bun:test';
import { existsSync, mkdtempSync, statSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { encodeFrames, resolveFfmpeg } from './encoder';

const ffmpegAvailable =
  spawnSync(resolveFfmpeg(), ['-version'], { stdio: 'ignore' }).status === 0;

const W = 64;
const H = 48;

/** Produces `count` distinct RGBA frames. */
function* frames(count: number): Generator<Uint8Array> {
  for (let frame = 0; frame < count; frame += 1) {
    const buffer = new Uint8Array(W * H * 4);
    for (let i = 0; i < W * H; i += 1) {
      buffer[i * 4] = (frame * 40) % 256;
      buffer[i * 4 + 1] = 60;
      buffer[i * 4 + 2] = 200;
      buffer[i * 4 + 3] = 255;
    }
    yield buffer;
  }
}

describe('resolveFfmpeg', () => {
  it('returns a usable path', () => {
    expect(resolveFfmpeg().length).toBeGreaterThan(0);
  });

  it('throws for an explicit missing path', () => {
    expect(() => resolveFfmpeg('/definitely/not/ffmpeg')).toThrow('ffmpeg not found');
  });
});

describe.skipIf(!ffmpegAvailable)('encodeFrames', () => {
  it('produces a playable MP4 from raw RGBA frames', async () => {
    const out = join(mkdtempSync(join(tmpdir(), 'lerno-export-')), 'out.mp4');
    const result = await encodeFrames(frames(12), { width: W, height: H, fps: 12, out, crf: 28 });

    expect(result.frames).toBe(12);
    expect(existsSync(out)).toBe(true);
    expect(statSync(out).size).toBeGreaterThan(0);

    const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out], {
      encoding: 'utf8',
    });
    expect(probe.stdout.trim()).toBe('1.000000');
    unlinkSync(out);
  });

  it('catches a wrong frame size before encoding', async () => {
    const out = join(tmpdir(), 'lerno-should-not-exist.mp4');
    const bad = [new Uint8Array(10)];
    await expect(encodeFrames(bad, { width: W, height: H, fps: 12, out })).rejects.toThrow('bytes, expected');
    expect(existsSync(out)).toBe(false);
  });
});

describe('encodeFrames — ffmpeg yokken', () => {
  it('throws explicitly for a missing binary', async () => {
    const out = join(tmpdir(), 'lerno-no-ffmpeg.mp4');
    await expect(
      encodeFrames(frames(1), { width: W, height: H, fps: 12, out, ffmpegPath: '/definitely/not/ffmpeg' }),
    ).rejects.toThrow('ffmpeg not found');
  });
});

describe.skipIf(!ffmpegAvailable)('encodeFrames — ses', () => {
  it('muxes an audio file into the MP4', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'lerno-export-audio-'));
    const wav = join(dir, 'tone.wav');
    const made = spawnSync(resolveFfmpeg(), [
      '-y', '-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=1', '-c:a', 'pcm_s16le', wav,
    ]);
    if (made.status !== 0) return;

    const out = join(dir, 'out.mp4');
    const result = await encodeFrames(frames(12), { width: W, height: H, fps: 12, out, audio: wav });
    expect(result.frames).toBe(12);

    const probe = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=codec_name', '-of', 'csv=p=0', out], {
      encoding: 'utf8',
    });
    expect(probe.stdout.trim()).toBe('aac');
  });

  it('rejects a missing audio file', async () => {
    const out = join(tmpdir(), 'lerno-no-audio.mp4');
    await expect(
      encodeFrames(frames(1), { width: W, height: H, fps: 12, out, audio: '/definitely/not/tone.wav' }),
    ).rejects.toThrow('Audio track not found');
  });
});
