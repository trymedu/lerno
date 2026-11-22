import { Matrix3, clamp, easeInOutRatio, lerp, v2 } from './index';

describe('Vector2', () => {
  it('basic operations are immutable', () => {
    const a = v2(3, 4);
    const b = v2(1, -2);
    expect(a.plus(b).toArray()).toEqual([4, 2]);
    expect(a.minus(b).toArray()).toEqual([2, 6]);
    expect(a.times(2).toArray()).toEqual([6, 8]);
    expect(a.dot(b)).toBe(-5);
    expect(a.cross(b)).toBe(-10);
    expect(a.magnitude).toBe(5);
    expect(a.equals(v2(3, 4))).toBe(true);
  });

  it('normalize and rotate', () => {
    expect(v2(0, 5).normalized().toArray()).toEqual([0, 1]);
    const rotated = v2(1, 0).rotated(Math.PI / 2);
    expect(rotated.x).toBeCloseTo(0, 6);
    expect(rotated.y).toBeCloseTo(1, 6);
  });
});

describe('Matrix3', () => {
  it('translation and point transform', () => {
    const matrix = Matrix3.translation(10, 20);
    expect(matrix.transformPoint(v2(1, 2)).toArray()).toEqual([11, 22]);
    expect(matrix.transformDelta(v2(1, 2)).toArray()).toEqual([1, 2]);
  });

  it('composed transform: rotate then translate', () => {
    const matrix = Matrix3.translation(5, 0).times(Matrix3.rotation(Math.PI / 2));
    const point = matrix.transformPoint(v2(1, 0));
    expect(point.x).toBeCloseTo(5, 6);
    expect(point.y).toBeCloseTo(1, 6);
  });

  it('invertible', () => {
    const matrix = Matrix3.translation(3, -4).times(Matrix3.scaling(2, 2));
    const roundTrip = matrix.inverted().transformPoint(matrix.transformPoint(v2(7, 8)));
    expect(roundTrip.x).toBeCloseTo(7, 6);
    expect(roundTrip.y).toBeCloseTo(8, 6);
  });

  it('SVG form and identity', () => {
    expect(Matrix3.IDENTITY.toSVG()).toBe('matrix(1 0 0 1 0 0)');
    expect(Matrix3.translation(2, 3).equals(new Matrix3(1, 0, 2, 0, 1, 3))).toBe(true);
  });
});

describe('helpers', () => {
  it('clamp / lerp / ease', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(lerp(0, 10, 0.25)).toBe(2.5);
    expect(easeInOutRatio(0)).toBe(0);
    expect(easeInOutRatio(1)).toBe(1);
    expect(easeInOutRatio(0.5)).toBeCloseTo(0.5, 6);
  });
});
