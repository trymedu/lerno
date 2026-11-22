import { CircleNode, Easings, LineNode, Node, PathNode, Shape, TextNode, revealShape, v2 } from '@medu/lerno';
import { exportMp4 } from '../src/index';

/**
 * A curve being drawn onto an axis grid, with a dot riding its tip.
 *
 * The scene is built by a factory that closes over its own state and returns the
 * two things a recording needs — a root to draw and a `step` to advance it — so
 * the export call stays declarative and the scene can be reused or tested on its
 * own.
 */
const lang = process.argv[3] === 'en' ? 'en' : 'tr';
const copy =
  lang === 'en'
    ? {
        title: 'A curve drawn step by step',
        subtitle: 'revealShape() · MP4 output with @medu/lerno-export',
      }
    : {
        title: 'Step-by-step curve reveal',
        subtitle: 'revealShape() · MP4 output from @medu/lerno-export',
      };

function curveReveal() {
  const WIDTH = 1280;
  const SAMPLES = 240;

  const root = new Node();

  // Grid
  for (let x = 80; x < WIDTH; x += 80) root.addChild(new LineNode(x, 90, x, 640, { stroke: '#1E293B', strokeWidth: 1 }));
  for (let y = 140; y < 640; y += 100) root.addChild(new LineNode(80, y, WIDTH - 80, y, { stroke: '#1E293B', strokeWidth: 1 }));

  // Axes
  root.addChild(new LineNode(80, 400, WIDTH - 80, 400, { stroke: '#475569', strokeWidth: 2 }));
  root.addChild(new LineNode(80, 90, 80, 640, { stroke: '#475569', strokeWidth: 2 }));

  // Labels
  root.addChild(new TextNode(copy.title, 80, 56, { fill: '#F8FAFC', fontSize: 34 }));
  root.addChild(new TextNode(copy.subtitle, 80, 690, { fill: '#94A3B8', fontSize: 21 }));
  const progressLabel = new TextNode('0%', WIDTH - 80, 56, { fill: '#94A3B8', fontSize: 26, anchor: 'end' });
  root.addChild(progressLabel);

  // The full curve, revealed progressively
  const points = Array.from({ length: SAMPLES + 1 }, (_, i) => {
    const u = i / SAMPLES;
    return v2(80 + u * (WIDTH - 160), 400 - 210 * Math.sin(u * Math.PI * 3) * Math.exp(-u * 2.1));
  });
  const full = Shape.polyline(points);
  const curve = new PathNode(revealShape(full, 0), { stroke: '#F59E0B', strokeWidth: 4 });
  root.addChild(curve);

  // The dot riding the tip of the curve
  const dot = new CircleNode(points[0].x, points[0].y, 9, { fill: '#3B82F6' });
  root.addChild(dot);

  let progress = 0;
  return {
    root,
    step(dt: number) {
      progress = Math.min(progress + dt, 1); // 1 model-second — snappy at real speed
      const eased = Easings.easeInOut(progress);
      const index = Math.round(eased * SAMPLES);

      curve.shape = revealShape(full, eased);
      dot.translation = v2(points[index].x - points[0].x, points[index].y - points[0].y);
      progressLabel.text = `${Math.round(eased * 100)}%`;
    },
  };
}

/**
 * Entry point: `bun examples/curve-reveal.ts <output.mp4>`.
 *
 * 30 fps rather than the 60 default: the reveal is slow enough that halving the
 * frames is invisible, and it roughly halves the file.
 */
const out = process.argv[2];
if (!out) throw new Error('Usage: bun examples/curve-reveal.ts <output.mp4>');

const result = await exportMp4(curveReveal(), {
  width: 1280,
  height: 720,
  fps: 30,
  duration: 3,
  timeScale: 0.5, // drawn over 2 video-seconds, then held for 1
  fontFamily: 'Helvetica',
  background: '#0B0F19',
  out,
  crf: 26,
});
console.log(`${result.out} — ${result.frames} frames, ${(result.bytes / 1024).toFixed(0)} KB`);
