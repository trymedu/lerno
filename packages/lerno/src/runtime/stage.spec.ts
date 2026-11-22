import { defineDocument } from '../content/document';
import { createHost } from '../extensions/host';
import { createLessonStage } from './stage';

const document = defineDocument({
  id: 'stage',
  type: 'lesson',
  metadata: { title: 'Sahne' },
  components: [{ type: 'ui.switch', version: 1 }],
  variables: { airOn: { type: 'boolean', initial: false } },
  nodes: [
    { id: 's1', type: 'slide', blocks: [] },
    {
      id: 'clip',
      type: 'media',
      assetId: 'clip',
      layers: [
        {
          id: 'air',
          component: 'ui.switch',
          fromMs: 1000,
          toMs: 4000,
          bind: { value: 'airOn' },
        },
      ],
    },
  ],
});

describe('createLessonStage', () => {
  it('provides session, time, and layers from one source', () => {
    const stage = createLessonStage(document, { durationMs: 10_000, host: createHost() });

    expect(stage.getState().timeMs).toBe(0);
    expect(stage.getState().session.cursor).toBe('s1');
    expect(stage.layersAt('clip')).toEqual([]);

    stage.seek(2000);
    expect(stage.getState().timeMs).toBe(2000);
    expect(stage.layersAt('clip')).toHaveLength(1);

    stage.setVariable('airOn', true);
    expect(stage.variables().airOn).toBe(true);
    expect(stage.layersAt('clip')[0].value).toBe(true);
  });

  it('publishes time and session listeners together', () => {
    const stage = createLessonStage(document, { durationMs: 10_000 });
    const seen: number[] = [];
    const stop = stage.subscribe((state) => seen.push(state.timeMs));

    stage.advance(1000);
    stage.next();
    stop();
    stage.advance(1000);

    expect(seen).toContain(1000);
    expect(seen.length).toBeGreaterThanOrEqual(2);
  });

  it('reset returns time and variables to the start', () => {
    const stage = createLessonStage(document, { durationMs: 10_000 });
    stage.seek(2500);
    stage.setVariable('airOn', true);

    stage.reset();

    expect(stage.getState().timeMs).toBe(0);
    expect(stage.variables().airOn).toBe(false);
  });
});

describe('playback position persistence', () => {
  it('starts from the saved time and writes on seek', () => {
    const saved: number[] = [];
    const host = createHost({
      storage: {
        load: () => undefined,
        save: () => undefined,
        clear: () => undefined,
        loadTime: () => 2500,
        saveTime: (_documentId: string, timeMs: number) => saved.push(timeMs),
      },
    });

    const stage = createLessonStage(document, { durationMs: 10_000, host });
    expect(stage.getState().timeMs).toBe(2500);

    stage.seek(4000);
    expect(saved).toContain(4000);

    stage.destroy();
    expect(saved.at(-1)).toBe(4000);
  });

  it('ignores the saved time when an open session state is supplied', () => {
    const host = createHost({
      storage: {
        load: () => undefined,
        save: () => undefined,
        clear: () => undefined,
        loadTime: () => 2500,
      },
    });

    const stage = createLessonStage(document, {
      durationMs: 10_000,
      host,
      state: {
        documentId: document.id,
        schemaVersion: document.schemaVersion,
        cursor: 'clip',
        visited: ['clip'],
        answers: {},
        variables: { airOn: false },
        status: 'in-progress',
      },
    });

    expect(stage.getState().timeMs).toBe(0);
  });
});
