import { describe, expect, it } from 'bun:test';
import { activeLayers, isLayerActive, resolveLayerProps } from './interactions';
import type { InteractionLayer } from '@medu/lerno';

const layer: InteractionLayer = {
  id: 'air',
  component: 'ui.switch',
  fromMs: 1000,
  toMs: 4000,
  placement: { x: 0.7, y: 0.1, w: 0.25, h: 0.12 },
  props: { label: 'Hava direnci', checked: { $var: 'airOn' } },
  bind: { value: 'airOn' },
  fadeMs: 0,
};

describe('interaction helpers', () => {
  it('applies the time window and the visibleWhen condition', () => {
    expect(isLayerActive(layer, 999, {})).toBe(false);
    expect(isLayerActive(layer, 1000, {})).toBe(true);
    expect(isLayerActive(layer, 4000, {})).toBe(false);

    const conditional = { ...layer, visibleWhen: { variable: 'airOn', equals: true } };
    expect(isLayerActive(conditional, 2000, { airOn: false })).toBe(false);
    expect(isLayerActive(conditional, 2000, { airOn: true })).toBe(true);
  });

  it('returns active layers in document order', () => {
    const second = { ...layer, id: 'second', fromMs: 0 };
    expect(activeLayers([layer, second], 1500, {}).map((entry) => entry.id)).toEqual(['air', 'second']);
  });

  it('resolves nested $var references', () => {
    const props = {
      label: 'Air',
      checked: { $var: 'airOn' },
      rows: [{ label: 'g', value: { $var: 'g' } }],
      missing: { $var: 'missing' },
    };

    expect(resolveLayerProps(props, { airOn: true, g: 10 })).toEqual({
      label: 'Air',
      checked: true,
      rows: [{ label: 'g', value: 10 }],
      missing: undefined,
    });
  });
});
