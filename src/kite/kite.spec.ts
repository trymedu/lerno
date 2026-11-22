import { v2 } from '../dot';
import { Shape } from './shape';

describe('Shape', () => {
  it('produces path commands', () => {
    const shape = new Shape().moveTo(0, 0).lineTo(10, 0).lineTo(10, 10).close();
    expect(shape.pathData).toBe('M 0 0 L 10 0 L 10 10 Z');
    expect(shape.bounds).toEqual({ minX: 0, minY: 0, maxX: 10, maxY: 10 });
  });

  it('rounded rectangle', () => {
    const shape = Shape.rect(0, 0, 100, 50, 8);
    expect(shape.pathData).toContain('Q');
    expect(shape.pathData.endsWith('Z')).toBe(true);
    expect(shape.bounds?.maxX).toBe(100);
  });

  it('rectangle and circle', () => {
    expect(Shape.rect(0, 0, 4, 2).pathData).toBe('M 0 0 L 4 0 L 4 2 L 0 2 Z');
    expect(Shape.circle(5, 5, 3).bounds).toEqual({ minX: 2, minY: 2, maxX: 8, maxY: 8 });
  });

  it('polygon and polyline', () => {
    const polygon = Shape.polygon([v2(0, 0), v2(10, 0), v2(5, 8)]);
    expect(polygon.pathData).toBe('M 0 0 L 10 0 L 5 8 Z');
    const polyline = Shape.polyline([v2(0, 0), v2(10, 0)]);
    expect(polyline.pathData).toBe('M 0 0 L 10 0');
  });

  it('empty shape', () => {
    expect(new Shape().isEmpty).toBe(true);
    expect(new Shape().bounds).toBeNull();
  });
});
