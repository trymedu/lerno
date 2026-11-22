import { Shape } from './shape';
import { canMorph, morphShape, revealShape } from './morph';

describe('morphShape: compatible shapes', () => {
  const from = Shape.rect(0, 0, 100, 100);
  const to = Shape.rect(0, 0, 200, 200);

  it('returns the source shape at the start', () => {
    expect(morphShape(from, to, 0)?.pathData).toBe(from.pathData);
  });

  it('returns the target shape at the end', () => {
    expect(morphShape(from, to, 1)?.pathData).toBe(to.pathData);
  });

  it('linearly interpolates every coordinate in between', () => {
    expect(morphShape(from, to, 0.5)?.pathData).toBe('M 0 0 L 150 0 L 150 150 L 0 150 Z');
  });

  it('ratio stays within its bounds', () => {
    expect(morphShape(from, to, -5)?.pathData).toBe(from.pathData);
    expect(morphShape(from, to, 5)?.pathData).toBe(to.pathData);
  });

  it('polygons with the same vertex count morph into each other', () => {
    const a = Shape.polygon([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 10 }] as never);
    const b = Shape.polygon([{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 0, y: 20 }] as never);
    const mid = morphShape(a, b, 0.5);
    expect(mid).not.toBeNull();
    expect(mid?.pathData).toContain('L 15 0');
  });
});

describe('morphShape: incompatible shapes', () => {
  it('returns null when command sequences differ', () => {
    // rect: M L L L Z, circle: M Q Q Q Q Z
    const rect = Shape.rect(0, 0, 10, 10);
    const circle = Shape.circle(0, 0, 10);
    expect(canMorph(rect, circle)).toBe(false);
    expect(morphShape(rect, circle, 0.5)).toBeNull();
  });

  it('returns null when command counts differ', () => {
    const triangle = Shape.polygon([{ x: 0, y: 0 }, { x: 9, y: 0 }, { x: 0, y: 9 }] as never);
    const square = Shape.rect(0, 0, 9, 9);
    expect(morphShape(triangle, square, 0.5)).toBeNull();
  });

  it('an empty shape does not morph into anything', () => {
    expect(morphShape(new Shape(), Shape.rect(0, 0, 1, 1), 0.5)).toBeNull();
  });
});

describe('revealShape: progressive drawing', () => {
  const square = Shape.rect(0, 0, 100, 100);

  it('returns an empty shape at zero', () => {
    const revealed = revealShape(square, 0);
    expect(revealed.isEmpty).toBe(true);
    expect(revealed.pathData).toBe('');
  });

  it('returns the full shape at one', () => {
    expect(revealShape(square, 1)).toBe(square);
  });

  it('cuts the partial segment that crosses the command boundary', () => {
    // Five commands; 0.5 → two full commands plus half an L
    expect(revealShape(square, 0.5).pathData).toBe('M 0 0 L 100 0 L 100 50');
  });

  it('clamps negative and excessive ratios', () => {
    expect(revealShape(square, -1).isEmpty).toBe(true);
    expect(revealShape(square, 9).pathData).toBe(square.pathData);
  });

  it('advances progressively: a larger ratio draws a longer path', () => {
    const lengths = [0.1, 0.3, 0.6, 0.9].map((ratio) => revealShape(square, ratio).pathData.length);
    for (let i = 1; i < lengths.length; i += 1) expect(lengths[i]).toBeGreaterThan(lengths[i - 1]);
  });

  it('the partial curve stays on the original curve', () => {
    const circle = Shape.circle(0, 0, 50);
    const half = revealShape(circle, 0.5);
    expect(half.pathData).toContain('Q');
    // First command is M; the partial Q stays within radius 50.
    const numbers = half.pathData.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
    expect(Math.max(...numbers.map(Math.abs))).toBeLessThanOrEqual(100);
  });

  it('does nothing on an empty shape and does not throw', () => {
    expect(revealShape(new Shape(), 0.5).isEmpty).toBe(true);
  });
});
