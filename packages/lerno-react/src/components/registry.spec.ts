import { describe, expect, it } from 'bun:test';
import { defineDocument } from '@medu/lerno';
import type { LernoComponentProps } from './component-types';
import { createComponentMap, missingComponentTypes, preloadComponents, componentVersionErrors, type LernoComponentLoader } from './registry';

const document = defineDocument({
  id: 'components',
  type: 'lesson',
  metadata: { title: 'Componentler' },
  components: [
    { type: 'ui.switch', version: 1 },
    { type: 'ui.select', version: 1 },
    { type: 'missing.type', version: 1 },
  ],
  nodes: [{ id: 'clip', type: 'media', assetId: 'clip' }],
});

function Stub(_props: LernoComponentProps) {
  return null;
}

describe('component registry', () => {
  it('merges the built-in set with application overrides', () => {
    const components = createComponentMap({ 'app.custom': Stub });
    expect(components['ui.switch']).toBeDefined();
    expect(components['app.custom']).toBe(Stub);
  });

  it('reports missing types', () => {
    expect(missingComponentTypes(document, createComponentMap())).toEqual(['missing.type']);
  });

  it('reports a version mismatch with a readable message', () => {
    const mismatched = defineDocument({
      ...document,
      components: [
        { type: 'ui.switch', version: 2 },
        { type: 'ui.select', version: 1 },
        { type: 'missing.type', version: 1 },
      ],
    });

    expect(componentVersionErrors(mismatched)).toEqual(['ui.switch@2 required, @1 registered']);
    expect(componentVersionErrors(document)).toEqual([]);
  });

  it('loads only declared types once', async () => {
    const calls: string[] = [];
    const loader = (type: string): LernoComponentLoader => async () => {
      calls.push(type);
      return { default: Stub };
    };

    const loaded = await preloadComponents(document, {
      'ui.switch': loader('ui.switch'),
      'ui.select': loader('ui.select'),
      'unused.type': loader('unused.type'),
    });

    expect(Object.keys(loaded).sort()).toEqual(['ui.select', 'ui.switch']);
    expect(calls.sort()).toEqual(['ui.select', 'ui.switch']);
    expect(loaded['missing.type']).toBeUndefined();
  });
});
