import { describe, expect, it } from 'bun:test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineDocument } from '@medu/lerno';
import { exportHtml } from './html';

const document = defineDocument({
  id: 'html',
  type: 'lesson',
  metadata: { title: 'Free fall' },
  components: [
    { type: 'ui.switch', version: 1 },
    { type: 'lab.readout', version: 1 },
  ],
  variables: {
    airOn: { type: 'boolean', initial: false },
    g: { type: 'number', initial: 10 },
  },
  nodes: [
    {
      id: 'clip',
      type: 'media',
      assetId: 'clip',
      anchors: [{ id: 'a1', atMs: 2000, kind: 'pause', label: 'Why?' }],
      layers: [
        {
          id: 'air',
          component: 'ui.switch',
          fromMs: 0,
          bind: { value: 'airOn' },
          placement: { x: 0.6, y: 0.1, w: 0.3, h: 0.12 },
          props: { label: 'Air resistance' },
        },
        {
          id: 'readout',
          component: 'lab.readout',
          fromMs: 0,
          placement: { x: 0.6, y: 0.3, w: 0.3, h: 0.3 },
          props: { title: 'Instantaneous', rows: [{ label: 'g', value: { $var: 'g' } }] },
        },
      ],
    },
  ],
});

function vttFile(): string {
  const dir = mkdtempSync(join(tmpdir(), 'lerno-html-'));
  const path = join(dir, 'tr.vtt');
  writeFileSync(path, 'WEBVTT\n\n00:00:00.000 --> 00:00:02.000\nFirst cue\n');
  return path;
}

describe('exportHtml', () => {
  const html = exportHtml(document, { nodeId: 'clip', video: '/media/clip.mp4', vtt: vttFile() });

  it('produces a complete HTML document', () => {
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('</html>');
    expect(html).toContain('src="/media/clip.mp4"');
  });

  it('renders the play button, control bar, and captions', () => {
    expect(html).toContain('id="play"');
    expect(html).toContain('id="toggle"');
    expect(html).toContain('id="seek"');
    expect(html).toContain('First cue');
    expect(html).toContain('"cues"');
  });

  it('writes layers with data bindings', () => {
    expect(html).toContain('data-toggle="airOn"');
    expect(html).toContain('data-readout="g"');
    expect(html).toContain('data-from="0"');
    expect(html).toContain('class="control switch"');
  });

  it('embeds anchor data', () => {
    expect(html).toContain('"anchors"');
    expect(html).toContain('Why?');
  });

  it('escapes the title', () => {
    const dangerous = exportHtml(document, { nodeId: 'clip', video: '/v.mp4', title: '<script>x</script>' });
    expect(dangerous).toContain('&lt;script&gt;x&lt;/script&gt;');
    expect(dangerous).not.toContain('<script>x</script>');
  });

  it('throws for an unknown node', () => {
    expect(() => exportHtml(document, { nodeId: 'missing', video: '/v.mp4' })).toThrow('Media node not found');
  });
});
