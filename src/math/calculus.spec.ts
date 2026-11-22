import { CoordinatePlane } from './coordinates';
import { CalculusEngine } from './calculus';

describe('CalculusEngine', () => {
  let plane: CoordinatePlane;

  beforeEach(() => {
    plane = new CoordinatePlane({ xRange: [-5, 5], yRange: [-5, 5] });
  });

  it('should calculate accurate derivative for f(x) = x^2 at x=3 (slope=6)', () => {
    const slope = CalculusEngine.derivative((x) => x * x, 3);
    expect(slope).toBeCloseTo(6.0, 3);
  });

  it('should generate tangent line segment and formula', () => {
    const tangent = CalculusEngine.getTangentLine(plane, (x) => x * x, 2);
    expect(tangent.slope).toBeCloseTo(4.0, 3);
    expect(tangent.y0).toBe(4);
    expect(tangent.p0).toBeDefined();
  });

  it('should calculate Riemann sum area under curve', () => {
    // Integral of x from 0 to 2 is 2.0
    const sum = CalculusEngine.getRiemannRectangles(plane, (x) => x, 0, 2, 100, 'midpoint');
    expect(sum.totalArea).toBeCloseTo(2.0, 1);
    expect(sum.rectangles).toHaveLength(100);
  });
});
