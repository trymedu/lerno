import { Vector2D } from './vector';
import { CoordinatePlane } from './coordinates';

describe('Vector2D', () => {
  let plane: CoordinatePlane;

  beforeEach(() => {
    plane = new CoordinatePlane({ xRange: [-5, 5], yRange: [-5, 5] });
  });

  it('should calculate magnitude, addition and dot product', () => {
    const v1 = new Vector2D(3, 4);
    expect(v1.magnitude()).toBe(5);

    const v2 = new Vector2D(1, 2);
    const vSum = v1.add(v2);
    expect(vSum.x).toBe(4);
    expect(vSum.y).toBe(6);

    const dot = v1.dot(v2);
    expect(dot).toBe(3 * 1 + 4 * 2); // 11
  });

  it('should render SVG arrow path and coordinates', () => {
    const v = new Vector2D(3, 4);
    const arrow = v.renderArrow(plane, { x: 0, y: 0 });

    expect(arrow.tailPx).toBeDefined();
    expect(arrow.headPx).toBeDefined();
    expect(arrow.pathData).toContain('M');
  });
});
