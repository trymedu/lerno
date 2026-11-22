import { CoordinatePlane } from './coordinates';
import { FunctionPlotter } from './function-plotter';

describe('FunctionPlotter', () => {
  let plane: CoordinatePlane;

  beforeEach(() => {
    plane = new CoordinatePlane({ xRange: [-5, 5], yRange: [-5, 5] });
  });

  it('should generate valid SVG path for quadratic function f(x) = x^2', () => {
    const plotter = new FunctionPlotter({
      fn: (x) => x * x,
      domain: [-2, 2],
      samples: 20,
    });

    const result = plotter.generatePath(plane);
    expect(result.pathData).toMatch(/^M \d+(\.\d+)? \d+(\.\d+)? L/);
    expect(result.points.length).toBe(20);
  });

  it('should interpolate path length according to drawProgress', () => {
    const halfPlotter = new FunctionPlotter({
      fn: (x) => Math.sin(x),
      domain: [0, Math.PI * 2],
      samples: 50,
      drawProgress: 0.5,
    });

    const result = halfPlotter.generatePath(plane);
    expect(result.points.length).toBe(25);
  });
});
