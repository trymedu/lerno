import { describe, expect, it } from 'bun:test';
import { existsSync, mkdtempSync, statSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { CircleNode, Node, PathNode,  Shape, TextNode, v2 } from '@medu/lerno';
import { resolveFfmpeg } from './encoder';
import { exportMp4, rgbaFrames } from './export';
import { registerFont } from './font';

const ffmpegAvailable = spawnSync(resolveFfmpeg(), ['-version'], { stdio: 'ignore' }).status === 0;

/** A scene that moves and draws — close to what an export really sees. */
function demoScene() {
  const ball = new CircleNode(40, 40, 18, { fill: '#3B82F6' });
  const trace = new PathNode(Shape.polyline([v2(0, 0)]), { stroke: '#F59E0B', strokeWidth: 4 });
  const label = new TextNode('Step Step Solution', 20, 220, { fill: '#F8FAFC', fontSize: 26 });
  const root = new Node({ children: [trace, ball, label] });
  let t = 0;
  const points = [v2(0, 0)];
  return {
    root,
    step(dtSeconds: number) {
      t += dtSeconds;
      const x = 40 + 150 * t;
      const y = 40 + 60 * Math.sin(t * 4);
      ball.translation = v2(x - 40, y - 40);
      points.push(v2(x, y));
      trace.shape = Shape.polyline(points);
    },
  };
}

const base = { width: 320, height: 240, fps: 20, duration: 0.5, fontFamily: 'Helvetica' };

describe('rgbaFrames', () => {
  it('frame count and buffer size are correct', () => {
    const buffers = [...rgbaFrames(demoScene(), base)];
    expect(buffers).toHaveLength(10);
    expect(buffers[0]).toHaveLength(base.width * base.height * 4);
  });

  it('frames differ, so the scene really moves', () => {
    const buffers = [...rgbaFrames(demoScene(), base)];
    expect(Buffer.compare(Buffer.from(buffers[0]), Buffer.from(buffers[9]))).not.toBe(0);
  });

  it('the same scene yields identical bytes across runs', () => {
    const run = () => [...rgbaFrames(demoScene(), base)].map((b) => Buffer.from(b).toString('base64')).join('|');
    expect(run()).toBe(run());
  });

  it('applies the background color', () => {
    const frame = [...rgbaFrames(demoScene(), { ...base, background: '#ff0000' })][0];
    // sol ust kosede toptan uzak, arka plan kirmizi olmali
    expect([frame[0], frame[1], frame[2]]).toEqual([255, 0, 0]);
  });

  it('a scene with math throws instead of being silently incomplete', () => {
    const math = { type: 'math', latex: 'x^2', x: 1, y: 2 };
    const scene = { root: { toRender: () => math } as never, step: () => {} };
    expect(() => [...rgbaFrames(scene, base)]).toThrow('no TeX engine');
  });
});

describe('exportMp4', () => {
  it('probes glyph coverage first, so video never contains tofu', async () => {
    const out = join(tmpdir(), 'lerno-should-not-exist.mp4');
    // Hicbir ailede olmayan karakter: kapsam denetimi encode'dan once patlamali,
    // sahnenin kendi metnine bakildigi icin.
    const scene = { root: { toRender: () => new TextNode('͸', 0, 0).toRender() } as never, step: () => {} };
    await expect(exportMp4(scene, { ...base, out })).rejects.toThrow('cannot render');
    expect(existsSync(out)).toBe(false);
  });

  it.skipIf(!ffmpegAvailable)('produces a real MP4 end to end', async () => {
    const out = join(mkdtempSync(join(tmpdir(), 'lerno-e2e-')), 'demo.mp4');
    const result = await exportMp4(demoScene(), { ...base, out, crf: 26 });

    expect(result.frames).toBe(10);
    expect(statSync(out).size).toBeGreaterThan(1000);

    const probe = spawnSync(
      'ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-show_entries', 'stream=width,height,nb_frames', '-of', 'csv=p=0', out],
      { encoding: 'utf8' },
    );
    const lines = probe.stdout.trim().split('\n').join(' ');
    // ffprobe CSV: width,height,nb_frames sonra duration
    expect(lines).toContain('320,240,10');
    expect(lines).toContain('0.500000');

    // cozulebilir mi?
    const decode = spawnSync('ffmpeg', ['-v', 'error', '-i', out, '-f', 'null', '-'], { encoding: 'utf8' });
    expect(decode.status).toBe(0);
    unlinkSync(out);
  });

  it.skipIf(!ffmpegAvailable)('two identical calls produce the same file: deterministic output', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'lerno-det-'));
    const a = await exportMp4(demoScene(), { ...base, out: join(dir, 'a.mp4'), crf: 30 });
    const b = await exportMp4(demoScene(), { ...base, out: join(dir, 'b.mp4'), crf: 30 });
    expect(a.bytes).toBe(b.bytes);
    unlinkSync(a.out);
    unlinkSync(b.out);
  });
});

describe('font — ucuca denetim', () => {
  it('a scene without text passes any family because the probe follows the scene', async () => {
    const out = join(tmpdir(), 'lerno-no-text.mp4');
    const ball = new CircleNode(40, 40, 18, { fill: '#3B82F6' });
    const scene = { root: new Node({ children: [ball] }), step: () => {} };
    const result = await exportMp4(scene, { ...base, fontFamily: 'NoSuchFont-XYZ', out });
    expect(result.frames).toBe(10);
    unlinkSync(out);
  });

  it('registerFont rejects a file that does not exist', () => {
    expect(() => registerFont({ family: 'NoSuchFont', path: '/nonexistent' })).toThrow('Could not register font');
  });
});
