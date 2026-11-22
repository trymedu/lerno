import { describe, expect, it } from 'bun:test';
import { CircleNode, LineNode, Node, PathNode, RectNode, Shape, TextNode, v2 } from '@medu/lerno';
import { renderToCanvas } from './canvas';
import { createCanvas, type Canvas } from '@napi-rs/canvas';

const W = 200;
const H = 120;

function canvas() {
  const c = createCanvas(W, H);
  return { c, ctx: c.getContext('2d') as never };
}

/** Reads one pixel as `[r, g, b, a]`. */
function pixel(c: Canvas, x: number, y: number): number[] {
  const d = c.getContext('2d').getImageData(x, y, 1, 1).data;
  return [d[0], d[1], d[2], d[3]];
}

function render(node: Node, fontFamily = 'Helvetica') {
  const { c, ctx } = canvas();
  (ctx as unknown as { clearRect: (a: number, b: number, c: number, d: number) => void }).clearRect(0, 0, W, H);
  renderToCanvas(ctx, node.toRender(), { fontFamily });
  return c;
}

describe('renderToCanvas: rectangle', () => {
  it('paints the fill color into the right pixel', () => {
    const c = render(new RectNode(20, 20, 40, 30, { fill: '#ff0000' }));
    expect(pixel(c, 30, 30)).toEqual([255, 0, 0, 255]);
    expect(pixel(c, 10, 10)).toEqual([0, 0, 0, 0]);
  });

  it('rounds corners with radius while the center stays filled', () => {
    const c = render(new RectNode(20, 20, 40, 30, { fill: '#00ff00', radius: 10 }));
    expect(pixel(c, 40, 35)[1]).toBe(255);
    // the corner must fall outside the 10-unit arc centered at (20,20)
    expect(pixel(c, 21, 21)[1]).toBe(0);
  });

  it('draws nothing when visibility is off', () => {
    const c = render(new RectNode(20, 20, 40, 30, { fill: '#ff0000', visible: false }));
    expect(pixel(c, 30, 30)).toEqual([0, 0, 0, 0]);
  });
});

describe('renderToCanvas — daire', () => {
  it('center filled, edge empty', () => {
    const c = render(new CircleNode(100, 60, 30, { fill: '#0000ff' }));
    expect(pixel(c, 100, 60)[2]).toBe(255);
    expect(pixel(c, 190, 110)[2]).toBe(0);
  });
});

describe('renderToCanvas: line and path', () => {
  it('the line carries its stroke color', () => {
    const c = render(new LineNode(10, 10, 190, 10, { stroke: '#ffff00', strokeWidth: 4 }));
    expect(pixel(c, 100, 10)).toEqual([255, 255, 0, 255]);
  });

  it('draws a Shape path', () => {
    const node = new PathNode(Shape.rect(30, 30, 60, 40), { fill: '#ff00ff' });
    const c = render(node);
    expect(pixel(c, 60, 50)[0]).toBe(255);
    expect(pixel(c, 60, 50)[2]).toBe(255);
    expect(pixel(c, 150, 100)).toEqual([0, 0, 0, 0]);
  });

  it('an unsupported path command throws instead of drawing wrong', () => {
    const node = new PathNode(Shape.rect(0, 0, 10, 10), { fill: '#fff' });
    const { ctx } = canvas();
    // pathData'yi elle kirlet
    const rogue = { ...node, toRender: () => ({ type: 'path', shape: { pathData: 'M 0 0 A 5 5 0 0 1 10 10' } }) };
    expect(() => renderToCanvas(ctx, rogue.toRender() as never, { fontFamily: 'Helvetica' })).toThrow('Unsupported path command');
  });
});

describe('renderToCanvas: text and font', () => {
  it('fontFamily is required: it throws instead of producing tofu', () => {
    const { ctx } = canvas();
    const node = new TextNode('hi', 10, 20, { fill: '#fff' });
    // @ts-expect-error fontFamily is intentionally missing
    expect(() => renderToCanvas(ctx, node.toRender(), {})).toThrow('fontFamily');
  });

  it('Turkish characters render without tofu in Helvetica', () => {
    const node = new TextNode('Sugar Solution', 10, 40, { fill: '#ffffff', fontSize: 28 });
    const c = render(node, 'Helvetica');
    const ctx = c.getContext('2d');
    const data = ctx.getImageData(0, 0, W, 60).data;
    let white = 0;
    for (let i = 0; i < data.length; i += 4) if (data[i] > 200 && data[i + 3] > 200) white++;
    expect(white).toBeGreaterThan(300);
  });
});

describe('renderToCanvas: group and transform', () => {
  it('applies translation', () => {
    const child = new RectNode(0, 0, 20, 20, { fill: '#ff0000' });
    const parent = new Node({ translation: v2(100, 40), children: [child] });
    const c = render(parent);
    expect(pixel(c, 110, 50)[0]).toBe(255);
    expect(pixel(c, 10, 10)[0]).toBe(0);
  });

  it('applies opacity to both the node and its children', () => {
    const child = new RectNode(0, 0, 20, 20, { fill: '#ff0000' });
    const parent = new Node({ opacity: 0.5, children: [child] });
    const c = render(parent);
    const [r, , , a] = pixel(c, 10, 10);
    expect(r).toBe(255);
    expect(a).toBeGreaterThan(100);
    expect(a).toBeLessThan(160);
  });

  it("sibling groups do not inherit each other's state", () => {
    const first = new Node({ opacity: 0.2, children: [new RectNode(0, 0, 20, 20, { fill: '#ff0000' })] });
    const second = new Node({ children: [new RectNode(40, 0, 20, 20, { fill: '#00ff00' })] });
    const root = new Node({ children: [first, second] });
    const c = render(root);
    const [, , , aFirst] = pixel(c, 10, 10);
    const [, , , aSecond] = pixel(c, 50, 10);
    expect(aFirst).toBeLessThan(aSecond);
    expect(aSecond).toBe(255);
  });
});

describe('renderToCanvas: content it refuses to render silently', () => {
  it('MathNode throws an explicit error instead of being skipped', () => {
    const math = { type: 'math', latex: 'x^2', x: 1, y: 2 };
    const { ctx } = canvas();
    expect(() => renderToCanvas(ctx, math as never, { fontFamily: 'Helvetica' })).toThrow('no TeX engine');
  });

  it('an unregistered extension node throws', () => {
    const ext = { type: 'extension', rendererId: 'custom', data: {} };
    const { ctx } = canvas();
    expect(() => renderToCanvas(ctx, ext as never, { fontFamily: 'Helvetica' })).toThrow('extension node');
  });

  it('a registered extension is drawn', () => {
    const ext = { type: 'extension', rendererId: 'custom', data: { x: 5 } };
    const { ctx } = canvas();
    let seen: unknown;
    renderToCanvas(ctx, ext as never, {
      fontFamily: 'Helvetica',
      extensions: { custom: (target, data) => { seen = data; target.fillRect(0, 0, 1, 1); } },
    });
    expect(seen).toEqual({ x: 5 });
  });
});
