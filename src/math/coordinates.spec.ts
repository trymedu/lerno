import { CoordinatePlane } from './coordinates';

describe('CoordinatePlane', () => {
  let plane: CoordinatePlane;

  beforeEach(() => {
    plane = new CoordinatePlane({
      xRange: [-10, 10],
      yRange: [-5, 5],
      width: 1000,
      height: 600,
      padding: 50,
    });
  });

  it('should calculate origin pixel position in canvas center', () => {
    const origin = plane.toPixels(0, 0);
    expect(origin.px).toBe(500);
    expect(origin.py).toBe(300);
  });

  it('should round-trip coordinates accurately', () => {
    const x = 3.5;
    const y = -2.25;
    const px = plane.toPixels(x, y);
    const back = plane.toCoords(px.px, px.py);

    expect(back.x).toBeCloseTo(x, 4);
    expect(back.y).toBeCloseTo(y, 4);
  });

  it('should render grid lines and axes metadata', () => {
    const elements = plane.renderSvgElements();
    expect(elements.gridLines.length).toBeGreaterThan(10);
    expect(elements.xAxis).toBeDefined();
    expect(elements.yAxis).toBeDefined();
    expect(elements.origin.px).toBe(500);
  });
});
