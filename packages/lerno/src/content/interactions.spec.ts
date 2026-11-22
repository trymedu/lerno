import { defineDocument, parseDocument } from './document';

const base = {
  id: 'layers',
  type: 'lesson',
  metadata: { title: 'Katmanlar' },
  components: [
    { type: 'ui.switch', version: 1 },
    { type: 'lab.readout', version: 1 },
  ],
  variables: {
    airOn: { type: 'boolean', initial: false },
    g: { type: 'number', initial: 10, enum: [9.8, 10] },
  },
} as const;

function media(extra: Record<string, unknown> = {}) {
  return {
    id: 'clip',
    type: 'media' as const,
    assetId: 'clip',
    layers: [
      {
        id: 'air-switch',
        component: 'ui.switch',
        fromMs: 1200,
        toMs: 4000,
        placement: { x: 0.7, y: 0.1, w: 0.25, h: 0.12 },
        props: { label: 'Hava direnci' } as Record<string, unknown>,
        bind: { value: 'airOn' } as { value?: string },
      },
      {
        id: 'readout',
        component: 'lab.readout',
        fromMs: 1200,
        placement: { x: 0.7, y: 0.3, w: 0.25, h: 0.2 },
        props: { rows: [{ label: 'g', value: { $var: 'g' } }] } as Record<string, unknown>,
        bind: {} as { value?: string },
      },
    ],
    ...extra,
  };
}


function issuesOf(input: unknown) {
  const result = parseDocument(input);
  return result.success ? [] : result.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
}

describe('interaction layer contract', () => {
  it('accepts manifest, variable, and layer references', () => {
    const document = defineDocument({ ...base, nodes: [media()] });
    const layer = document.nodes[0];

    expect(layer.type).toBe('media');
    if (layer.type !== 'media') return;
    expect(layer.layers).toHaveLength(2);
    expect(layer.layers[0].bind.value).toBe('airOn');    expect(document.variables.airOn.initial).toBe(false);
  });

  it('rejects an unknown component type', () => {
    const document = { ...base, nodes: [media()] };
    const broken = structuredClone(document) as typeof document;
    broken.nodes[0].layers[0].component = 'ui.unknown';

    expect(issuesOf(broken)).toContain('nodes.0.layers.0.component: Layer component missing from the manifest: ui.unknown');
  });

  it('rejects an unknown variable reference', () => {
    const document = { ...base, nodes: [media()] };
    const broken = structuredClone(document) as typeof document;
    broken.nodes[0].layers[0].bind.value = 'missing';

    expect(issuesOf(broken)).toContain('nodes.0.layers.0.bind.value: Unknown variable: missing');
  });

  it('validates a $var reference inside props', () => {
    const document = { ...base, nodes: [media()] };
    const broken = structuredClone(document) as typeof document;
    broken.nodes[0].layers[1].props = { rows: [{ label: 'g', value: { $var: 'missing' } }] };

    expect(issuesOf(broken)).toContain('nodes.0.layers.1.props.rows.0.value.$var: Unknown variable: missing');
  });

  it('rejects a duplicate layer id and a reversed time window', () => {
    const document = { ...base, nodes: [media()] };
    const broken = structuredClone(document) as typeof document;
    broken.nodes[0].layers[1].id = 'air-switch';
    broken.nodes[0].layers[0].toMs = 100;

    expect(issuesOf(broken)).toContain('nodes.0.layers.1.id: Duplicate layer id: air-switch');
    expect(issuesOf(broken)).toContain('nodes.0.layers.0.toMs: "toMs" must be greater than "fromMs"');
  });

  it('fills v1 documents with an empty manifest and variables', () => {
    const document = defineDocument({
      id: 'v1',
      type: 'lesson',
      metadata: { title: 'Old' },
      nodes: [{ id: 's', type: 'slide', blocks: [] }],
    });

    expect(document.components).toEqual([]);
    expect(document.variables).toEqual({});
    expect(document.schemaVersion).toBe(1);
  });
});
