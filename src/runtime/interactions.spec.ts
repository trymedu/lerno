import { defineDocument } from '../content/document';
import { createHost } from '../extensions/host';
import { createInteractionRuntime, activeLayers, layerOpacity, resolveLayerProps } from './interactions';
import type { InteractionLayer } from '../content/schema';
import { createSession } from './session';

const document = defineDocument({
  id: 'interactions',
  type: 'lesson',
  metadata: { title: 'Interaction' },
  components: [{ type: 'ui.switch', version: 1 }],
  variables: {
    airOn: { type: 'boolean', initial: false },
    g: { type: 'number', initial: 10 },
  },
  nodes: [
    {
      id: 'clip',
      type: 'media',
      assetId: 'clip',
      layers: [
        {
          id: 'air',
          component: 'ui.switch',
          fromMs: 1000,
          toMs: 5000,
          bind: { value: 'airOn' },
          props: { label: 'Hava direnci', g: { $var: 'g' } },
        },
      ],
    },
  ],
});

describe('interactions runtime', () => {
  it('resolves layers in the playhead window', () => {
    const session = createSession(document);
    const runtime = createInteractionRuntime(document, session);

    expect(runtime.layersAt('clip', 500)).toEqual([]);

    const [layer] = runtime.layersAt('clip', 2000);
    expect(layer.layer.id).toBe('air');
    expect(layer.props).toEqual({ label: 'Hava direnci', g: 10 });
    expect(layer.value).toBe(false);

    expect(runtime.layersAt('clip', 5000)).toEqual([]);
    expect(runtime.layersAt('missing', 2000)).toEqual([]);
  });

  it('writes a variable through a binding and publishes to listeners', () => {
    const session = createSession(document);
    const runtime = createInteractionRuntime(document, session);
    const seen: boolean[] = [];
    const stop = runtime.subscribe((state) => seen.push(state.variables.airOn === true));

    const [resolved] = runtime.layersAt('clip', 2000);
    runtime.change(resolved.layer, true);

    expect(session.getState().variables.airOn).toBe(true);
    expect(runtime.layersAt('clip', 2000)[0].value).toBe(true);
    expect(seen).toContain(true);
    stop();
  });

  it('applies the visibleWhen condition', () => {
    const conditional = defineDocument({
      ...document,
      variables: {
        airOn: { type: 'boolean', initial: true },
        g: { type: 'number', initial: 10 },
      },
    });

    const layers = conditional.nodes[0];
    if (layers.type !== 'media') return;
    const layer = { ...layers.layers[0], visibleWhen: { variable: 'airOn', equals: false } };
    expect(activeLayers([layer], 2000, { airOn: true, g: 10 })).toEqual([]);
    expect(activeLayers([layer], 2000, { airOn: false, g: 10 })).toHaveLength(1);
  });

  it('resolves nested $var references', () => {
    expect(resolveLayerProps({ rows: [{ value: { $var: 'g' } }], missing: { $var: 'x' } }, { g: 10 })).toEqual({
      rows: [{ value: 10 }],
      missing: undefined,
    });
  });

  it('a session can be built over host storage', () => {
    const session = createSession(document, { host: createHost() });
    expect(createInteractionRuntime(document, session).layersAt('clip', 2000)).toHaveLength(1);
  });
});

describe('layerOpacity', () => {
  const layer: InteractionLayer = {
    id: 'fade',
    component: 'ui.switch',
    fromMs: 1000,
    toMs: 5000,
    fadeMs: 500,
    placement: { x: 0, y: 0, w: 1, h: 1 },
    props: {},
    bind: {},
  };

  it('returns 1 when there is no fade', () => {
    expect(layerOpacity({ ...layer, fadeMs: 0 }, 1000)).toBe(1);
    expect(layerOpacity({ ...layer, fadeMs: 0 }, 4999)).toBe(1);
  });

  it('rises from 0 to 1 in the entry window', () => {
    expect(layerOpacity(layer, 1000)).toBeCloseTo(0);
    expect(layerOpacity(layer, 1250)).toBeCloseTo(0.5);
    expect(layerOpacity(layer, 1500)).toBeCloseTo(1);
  });

  it('falls from 1 to 0 in the exit window', () => {
    expect(layerOpacity(layer, 4500)).toBeCloseTo(1);
    expect(layerOpacity(layer, 4750)).toBeCloseTo(0.5);
    expect(layerOpacity(layer, 5000)).toBeCloseTo(0);
  });

  it('clamps to 0 outside the window', () => {
    expect(layerOpacity(layer, 0)).toBe(0);
    expect(layerOpacity(layer, 6000)).toBe(0);
  });
});
