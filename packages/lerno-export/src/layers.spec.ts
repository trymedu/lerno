import { describe, expect, it } from 'bun:test';
import { createCanvas } from '@napi-rs/canvas';
import { defineDocument, type InteractionLayer } from '@medu/lerno';
import { layersAtTime, paintLayer, unpaintedLayers } from './layers';

const document = defineDocument({
  id: 'layers',
  type: 'lesson',
  metadata: { title: 'Katmanlar' },
  components: [
    { type: 'ui.switch', version: 1 },
    { type: 'lab.readout', version: 1 },
  ],
  variables: { airOn: { type: 'boolean', initial: false } },
  nodes: [
    {
      id: 'clip',
      type: 'media',
      assetId: 'clip',
      layers: [
        {
          id: 'air',
          component: 'ui.switch',
          fromMs: 0,
          toMs: 1000,
          fadeMs: 200,
          bind: { value: 'airOn' },
          props: { label: 'Hava direnci' },
        },
        {
          id: 'readout',
          component: 'lab.readout',
          fromMs: 1000,
          props: { title: 'Instantaneous', rows: [{ label: 'g', value: 10 }] },
        },
      ],
    },
  ],
});

describe('layersAtTime', () => {
  it('returns visible layers and bound values for a time', () => {
    const [first] = layersAtTime(document, 'clip', 500, { airOn: true });

    expect(first.layer.id).toBe('air');
    expect(first.value).toBe(true);
    expect(first.props.label).toBe('Hava direnci');
    expect(first.opacity).toBe(1);
  });

  it('lowers opacity in the fade window', () => {
    const [first] = layersAtTime(document, 'clip', 100, { airOn: false });
    expect(first.opacity).toBeCloseTo(0.5);
  });

  it('drops a finished layer from the list', () => {
    const visible = layersAtTime(document, 'clip', 1500, { airOn: false });
    expect(visible.map((entry) => entry.layer.id)).toEqual(['readout']);
  });

  it('returns an empty array for an unknown node', () => {
    expect(layersAtTime(document, 'missing', 0, {})).toEqual([]);
  });
});

describe('paintLayer', () => {
  const canvas = createCanvas(320, 180);
  const ctx = canvas.getContext('2d');

  function paintedPixels(layer: InteractionLayer, value: boolean): number {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 320, 180);
    paintLayer(ctx, layer, { label: 'Hava direnci' }, value, { width: 320, height: 180 }, { tone: 'light' });
    const data = ctx.getImageData(0, 0, 320, 180).data;
    let count = 0;
    for (let index = 0; index < data.length; index += 4) {
      if (data[index] < 240 || data[index + 1] < 240 || data[index + 2] < 240) count += 1;
    }
    return count;
  }

  const switchLayer: InteractionLayer = {
    id: 'air',
    component: 'ui.switch',
    fromMs: 0,
    placement: { x: 0.5, y: 0.1, w: 0.4, h: 0.2 },
    props: {},
    bind: {},
    fadeMs: 0,
  };

  it('draws a switch that changes with state', () => {
    const off = paintedPixels(switchLayer, false);
    const on = paintedPixels(switchLayer, true);

    expect(off).toBeGreaterThan(100);
    expect(on).not.toBe(off);
  });

  it('returns true for every built-in component', () => {
    const frame = { width: 320, height: 180 };
    for (const component of ['ui.switch', 'ui.button', 'ui.select', 'ui.slider', 'lab.readout']) {
      const layer = { ...switchLayer, component };
      expect(paintLayer(ctx, layer, {}, undefined, frame, { tone: 'light' })).toBe(true);
    }
  });

  it('returns false for an unknown component', () => {
    const layer = { ...switchLayer, component: 'app.custom' };
    expect(paintLayer(ctx, layer, {}, undefined, { width: 320, height: 180 })).toBe(false);
  });
});

describe('unpaintedLayers', () => {
  it('reports types without a canvas painter', () => {
    const withCustom = defineDocument({
      id: 'custom',
      type: 'lesson',
      metadata: { title: 'Ozel' },
      components: [{ type: 'app.custom', version: 1 }],
      nodes: [
        {
          id: 'clip',
          type: 'media',
          assetId: 'clip',
          layers: [{ id: 'x', component: 'app.custom', fromMs: 0 }],
        },
      ],
    });

    expect(unpaintedLayers(withCustom)).toEqual(['app.custom']);
    expect(unpaintedLayers(document)).toEqual([]);
  });
});
