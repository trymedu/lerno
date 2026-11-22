import { describe, expect, it } from 'bun:test';
import { Node, PathNode, RectNode, Shape, v2 } from '@medu/lerno';
import { THREE_HEADLESS_ERROR, frameTrees, serializeTree, type Scene } from './frames';

/** A scene whose state changes every step. */
function slideScene() {
  const rect = new RectNode(0, 0, 20, 20, { fill: '#ff0000' });
  const root = new Node({ children: [rect] });
  let x = 0;
  return {
    root,
    step(dtSeconds: number) {
      x += dtSeconds * 60;
      rect.translation = v2(x, 0);
    },
  };
}

describe('frameTrees', () => {
  it('produces the frame count from fps and duration', () => {
    expect([...frameTrees(slideScene(), { fps: 30, duration: 2 })]).toHaveLength(60);
    expect([...frameTrees(slideScene(), { fps: 60, duration: 1 })]).toHaveLength(60);
    expect([...frameTrees(slideScene(), { fps: 10, duration: 0.5 })]).toHaveLength(5);
  });

  it('the first frame is the state before stepping', () => {
    const first = [...frameTrees(slideScene(), { fps: 10, duration: 0.3 })][0];
    expect(JSON.stringify(serializeTree(first))).toContain('"x":0');
  });

  it('frames change as the scene steps', () => {
    const trees = [...frameTrees(slideScene(), { fps: 10, duration: 0.5 })];
    const asJson = trees.map((tree) => JSON.stringify(serializeTree(tree)));
    expect(new Set(asJson).size).toBe(asJson.length);
  });

  it('running the same scene twice yields identical bytes', () => {
    const run = () =>
      JSON.stringify([...frameTrees(slideScene(), { fps: 30, duration: 1 })].map(serializeTree));
    expect(run()).toBe(run());
  });

  it('because dt derives from fps, the time curve changes with fps', () => {
    const slow = [...frameTrees(slideScene(), { fps: 5, duration: 1 })];
    const fast = [...frameTrees(slideScene(), { fps: 60, duration: 1 })];
    expect(slow).toHaveLength(5);
    expect(fast).toHaveLength(60);
    const slowLast = JSON.stringify(serializeTree(slow[slow.length - 1]));
    const fastLast = JSON.stringify(serializeTree(fast[fast.length - 1]));
    expect(slowLast).not.toBe(fastLast);
  });

  it('invalid fps and duration throw', () => {
    expect(() => [...frameTrees(slideScene(), { fps: 0 })]).toThrow('fps must be positive');
    expect(() => [...frameTrees(slideScene(), { duration: -1 })]).toThrow('must not be negative');
  });
});

describe('timeScale', () => {
  /** Counts model time without drawing anything. */
  function clockScene() {
    const root = new Node();
    let elapsed = 0;
    return {
      root,
      step(dtSeconds: number) {
        elapsed += dtSeconds;
      },
      get elapsed() {
        return elapsed;
      },
    };
  }

  const consume = (timeScale?: number) => {
    const scene = clockScene();
    Array.from(frameTrees(scene, { fps: 10, duration: 1, ...(timeScale === undefined ? {} : { timeScale }) }));
    return scene.elapsed;
  };

  it('at the default 1x, model and video stay aligned', () => {
    expect(consume()).toBeCloseTo(1.0, 5);
    expect(consume(1)).toBeCloseTo(1.0, 5);
  });

  it('0.5 advances the model at half speed for slow motion', () => {
    expect(consume(0.5)).toBeCloseTo(0.5, 5);
    expect(consume(0.5)).toBeCloseTo(consume() * 0.5, 5);
  });

  it('2 advances the model at double speed for a time-lapse', () => {
    expect(consume(2)).toBeCloseTo(2.0, 5);
    expect(consume(2)).toBeCloseTo(consume() * 2, 5);
  });

  it('keeps the frame count and only changes the model path', () => {
    expect([...frameTrees(clockScene(), { fps: 10, duration: 1 })]).toHaveLength(10);
    expect([...frameTrees(clockScene(), { fps: 10, duration: 1, timeScale: 0.5 })]).toHaveLength(10);
    expect([...frameTrees(clockScene(), { fps: 10, duration: 1, timeScale: 4 })]).toHaveLength(10);
  });

  it('zero and negative timeScale throw', () => {
    expect(() => [...frameTrees(clockScene(), { timeScale: 0 })]).toThrow('timeScale must be positive');
    expect(() => [...frameTrees(clockScene(), { timeScale: -1 })]).toThrow('timeScale must be positive');
  });
});

describe('serializeTree', () => {
  it('lowers a Shape to its pathData', () => {
    const node = new PathNode(Shape.rect(0, 0, 10, 10), { fill: '#fff' });
    const json = JSON.stringify(serializeTree(node.toRender()));
    expect(json).toContain('"pathData"');
    expect(json).not.toContain('"commands"');
    expect(json).not.toContain('"xs"');
  });

  it('stays JSON-serializable with no cycles', () => {
    const root = new Node({ children: [new RectNode(0, 0, 1, 1, { fill: '#000' })] });
    expect(() => JSON.stringify(serializeTree(root.toRender()))).not.toThrow();
  });

  it('drops the source binding', () => {
    const rect = new RectNode(0, 0, 10, 10, { fill: '#000' });
    rect.addInputListener({ down: () => {}, move: () => {}, up: () => {} });
    const json = JSON.stringify(serializeTree(rect.toRender()));
    expect(json).not.toContain('"source"');
  });
});


describe('headless guard', () => {
  it('rejects a three.js scene with a decisive error', () => {
    const scene = { root: { isObject3D: true, type: 'Scene' }, step() {} } as unknown as Scene;
    expect(() => [...frameTrees(scene)]).toThrow(THREE_HEADLESS_ERROR);
  });

  it('rejects a ThreeRuntime-shaped object with a decisive error', () => {
    const scene = { scene: {}, camera: {}, step() {} } as unknown as Scene;
    expect(() => [...frameTrees(scene)]).toThrow(THREE_HEADLESS_ERROR);
  });

  it('rejects a root without toRender with a readable type error', () => {
    const scene = { root: {}, step() {} } as unknown as Scene;
    expect(() => [...frameTrees(scene)]).toThrow('scene.root to be a Lerno Node with toRender()');
  });
});
