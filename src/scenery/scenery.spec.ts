import { v2 } from '../dot';
import { Shape } from '../kite';
import { ExtensionNode, LineNode, Node, PathNode, RectNode, TextNode, arrow } from './node';
import { ModelViewTransform2 } from './model-view-transform';

describe('Node', () => {
  it('includes children in the render tree', () => {
    const root = new Node({ children: [new RectNode(0, 0, 10, 10, { fill: 'red' })] });
    const render = root.toRender();
    expect(render.type).toBe('group');
    if (render.type === 'group') {
      expect(render.children).toHaveLength(1);
      expect(render.children[0].type).toBe('rect');
    }
  });

  it('applies transform and visibility', () => {
    const node = new RectNode(0, 0, 10, 10, { translation: v2(5, 5), opacity: 0.5 });
    const render = node.toRender();
    expect(render.transform).toBe('matrix(1 0 0 1 5 5)');
    expect(render.opacity).toBe(0.5);
    expect(render.visible).toBeUndefined();

    node.visible = false;
    expect(node.toRender().visible).toBe(false);
  });

  it('shape and text nodes', () => {
    const circle = new PathNode(Shape.circle(0, 0, 5), { stroke: 'blue', strokeWidth: 2 });
    expect(circle.toRender().type).toBe('path');
    const text = new TextNode('F = m·a', 0, 0, { fontSize: 18, anchor: 'middle' });
    expect(text.toRender().type).toBe('text');
    const line = new LineNode(0, 0, 10, 10, { dash: '4 4' });
    expect(line.toRender().type).toBe('line');
  });

  it('produces an arrowhead', () => {
    const node = arrow(v2(0, 0), v2(100, 0), { stroke: 'black' });
    const render = node.toRender();
    if (render.type === 'group') {
      expect(render.children).toHaveLength(3);
    }
  });

  it('an extension node is an escape hatch', () => {
    const node = new ExtensionNode('my-renderer', { hello: 'world' });
    const render = node.toRender();
    expect(render.type).toBe('extension');
    if (render.type === 'extension') {
      expect(render.rendererId).toBe('my-renderer');
      expect(render.data).toEqual({ hello: 'world' });
    }
  });
});

describe('ModelViewTransform2', () => {
  it('model to view and back (inverted y)', () => {
    const transform = ModelViewTransform2.createSinglePointScaleInvertedYMapping(v2(0, 0), v2(400, 300), 10);
    const view = transform.modelToViewPosition(v2(1, 2));
    expect(view.x).toBeCloseTo(410, 6);
    expect(view.y).toBeCloseTo(280, 6);

    const model = transform.viewToModelPosition(view);
    expect(model.x).toBeCloseTo(1, 6);
    expect(model.y).toBeCloseTo(2, 6);
    expect(transform.scale).toBeCloseTo(10, 6);
  });
});
