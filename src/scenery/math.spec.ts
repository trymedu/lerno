import { MathNode } from './node';

describe('MathNode', () => {
  it('carries the source into the render tree unchanged', () => {
    const node = new MathNode('x^2 + y^2 = r^2', 120, 80);
    const render = node.toRender();

    expect(render.type).toBe('math');
    if (render.type !== 'math') throw new Error('render type must be math');
    expect(render.latex).toBe('x^2 + y^2 = r^2');
    expect(render.x).toBe(120);
    expect(render.y).toBe(80);
  });

  it('passes style fields into the render output', () => {
    const node = new MathNode('\\frac{a}{b}', 10, 20, { fill: '#111', fontSize: 24, anchor: 'middle' });
    const render = node.toRender();
    if (render.type !== 'math') throw new Error('render type must be math');

    expect(render.fill).toBe('#111');
    expect(render.fontSize).toBe(24);
    expect(render.anchor).toBe('middle');
  });

  it('without style, fields stay undefined and no default is applied', () => {
    const node = new MathNode('E=mc^2', 0, 0);
    const render = node.toRender();
    if (render.type !== 'math') throw new Error('render type must be math');

    expect(render.fill).toBeUndefined();
    expect(render.fontSize).toBeUndefined();
  });

  it('transform and visibility come from the base class', () => {
    const node = new MathNode('x', 0, 0, { translation: { x: 5, y: 7 } as never, visible: false });
    const render = node.toRender();

    expect(render.visible).toBe(false);
    expect(render.transform).toBe('matrix(1 0 0 1 5 7)');
  });
});
