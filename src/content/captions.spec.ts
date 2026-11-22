import { MediaNodeSchema } from './schema';

describe('MediaNodeSchema — captions', () => {
  it('returns an empty array when no caption track is defined', () => {
    const node = MediaNodeSchema.parse({ id: 'clip', type: 'media', assetId: 'clip' });

    expect(node.captions).toEqual([]);
    expect(node.anchors).toEqual([]);
    expect(node.layers).toEqual([]);
  });

  it('accepts the track list unchanged', () => {
    const node = MediaNodeSchema.parse({
      id: 'clip',
      type: 'media',
      assetId: 'clip',
      captions: [
        { src: '/captions/tr.vtt', lang: 'tr', label: 'Turkce' },
        { src: '/captions/en.vtt', lang: 'en', label: 'English', default: true },
      ],
    });

    expect(node.captions).toHaveLength(2);
    expect(node.captions[1].default).toBe(true);
    expect(node.captions[0].default).toBe(false);
  });

  it('rejects a missing src', () => {
    const result = MediaNodeSchema.safeParse({
      id: 'clip',
      type: 'media',
      assetId: 'clip',
      captions: [{ lang: 'tr', label: 'Turkce' }],
    });

    expect(result.success).toBe(false);
  });
});

describe('InteractionLayerSchema — fadeMs', () => {
  it('returns 0 when fade is not defined', () => {
    const node = MediaNodeSchema.parse({
      id: 'clip',
      type: 'media',
      assetId: 'clip',
      layers: [{ id: 'air', component: 'ui.switch', fromMs: 1000 }],
    });

    expect(node.layers[0].fadeMs).toBe(0);
  });

  it('rejects a negative fade', () => {
    const result = MediaNodeSchema.safeParse({
      id: 'clip',
      type: 'media',
      assetId: 'clip',
      layers: [{ id: 'air', component: 'ui.switch', fromMs: 1000, fadeMs: -100 }],
    });

    expect(result.success).toBe(false);
  });
});
