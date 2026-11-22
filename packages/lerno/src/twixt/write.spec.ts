import { Shape } from '../kite';
import { WriteShape } from './write';

describe('WriteShape', () => {
  const square = Shape.rect(0, 0, 100, 100);

  it('advances over the duration and notifies on completion', () => {
    const write = new WriteShape(square, { duration: 1 });
    expect(write.step(0.5)).toBe(true);
    expect(write.isFinished).toBe(false);
    expect(write.progress).toBeCloseTo(0.5);

    expect(write.step(0.6)).toBe(false);
    expect(write.isFinished).toBe(true);
    expect(write.progress).toBe(1);
  });

  it('yields steps in ascending order', () => {
    const seen: string[] = [];
    const write = new WriteShape(square, { duration: 1, onUpdate: (shape) => seen.push(shape.pathData) });
    write.step(0.25);
    write.step(0.25);
    write.step(0.5);

    expect(seen).toHaveLength(3);
    expect(seen[0].length).toBeLessThan(seen[1].length);
    expect(seen[1].length).toBeLessThanOrEqual(seen[2].length);
    expect(seen[2]).toBe(square.pathData);
  });

  it('onComplete is called once', () => {
    let completed = 0;
    const write = new WriteShape(square, { duration: 0.5, onComplete: () => (completed += 1) });
    write.step(1);
    write.step(1);
    expect(completed).toBe(1);
    expect(write.step(1)).toBe(false);
  });

  it('completes on the first step when duration is zero', () => {
    const write = new WriteShape(square, { duration: 0 });
    expect(write.step(0)).toBe(false);
    expect(write.isFinished).toBe(true);
  });

  it('reports eased progress', () => {
    const write = new WriteShape(square, { duration: 1, easing: (ratio) => ratio * ratio });
    write.step(0.5);
    expect(write.progress).toBeCloseTo(0.25);
  });
});
