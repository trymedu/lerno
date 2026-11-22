import { defineDocument } from '../content/document';
import { createHost, type TelemetryEvent } from '../extensions/host';
import { createRegistry } from '../extensions/registry';
import { createSession } from './session';

const linearDocument = defineDocument({
  id: 'linear',
  type: 'lesson',
  metadata: { title: 'Linear' },
  scoring: { mode: 'sum', passingRatio: 0.5 },
  nodes: [
    { id: 's1', type: 'slide', blocks: [{ type: 'text', markdown: 'Introduction' }] },
    {
      id: 'q1',
      type: 'question',
      item: {
        kind: 'multiple-choice',
        prompt: '2 + 2?',
        choices: [{ id: 'a', label: '3' }, { id: 'b', label: '4' }],
        correct: ['b'],
      },
    },
    { id: 's2', type: 'slide', blocks: [{ type: 'text', markdown: 'End' }] },
  ],
});

const graphDocument = defineDocument({
  id: 'graph',
  type: 'scenario',
  metadata: { title: 'Branching' },
  flow: { mode: 'graph' },
  nodes: [
    { id: 'start', type: 'info', panels: [{ title: 'Start', body: '...' }], next: 'fork' },
    {
      id: 'fork',
      type: 'branch',
      prompt: 'Which path?',
      choices: [
        { id: 'c1', label: 'Correct path', target: 'good' },
        { id: 'c2', label: 'Wrong path', target: 'bad', tag: 'error' },
      ],
    },
    { id: 'good', type: 'slide', blocks: [] },
    { id: 'bad', type: 'slide', blocks: [] },
  ],
});

describe('createSession: linear flow', () => {
  it('advances, answers, and scores', () => {
    const events: TelemetryEvent[] = [];
    const host = createHost({ telemetry: { emit: (event) => events.push(event) }, clock: () => 1000 });
    const session = createSession(linearDocument, { host });

    expect(session.getState().cursor).toBe('s1');
    expect(session.next()).toBe('q1');

    const record = session.answer('q1', { selected: ['b'] });
    expect(record.outcome.status).toBe('correct');

    const score = session.score();
    expect(score.earned).toBe(1);
    expect(score.max).toBe(1);
    expect(score.passed).toBe(true);

    expect(session.next()).toBe('s2');
    expect(session.next()).toBeNull();
    expect(session.getState().status).toBe('completed');

    expect(events.map((event) => event.name)).toContain('session.completed');
    expect(host.storage.load('linear')?.status).toBe('completed');
  });

  it('goes back and persists state', () => {
    const host = createHost();
    const session = createSession(linearDocument, { host });

    session.next();
    session.next();
    expect(session.getState().cursor).toBe('s2');
    expect(session.back()).toBe('q1');
    expect(session.getState().status).toBe('in-progress');

    // Resume from the saved state
    const resumed = createSession(linearDocument, { host, state: session.getState() });
    expect(resumed.getState().cursor).toBe('q1');
  });
});

describe('createSession: graph and branching', () => {
  it('moves a branch choice to its target', () => {
    const session = createSession(graphDocument);

    expect(session.next()).toBe('fork');
    expect(session.next()).toBeNull(); // branch seçim bekler
    expect(session.choose('fork', 'c2')).toBe('bad');
    expect(session.getState().cursor).toBe('bad');
  });
});

describe('createSession — adaptive', () => {
  it('uses the host.flow resolver', () => {
    const adaptiveDocument = defineDocument({
      ...linearDocument,
      id: 'adaptive',
      flow: { mode: 'adaptive' },
    });
    const host = createHost({ flow: () => 's2' });
    const session = createSession(adaptiveDocument, { host });
    expect(session.next()).toBe('s2');
  });

  it('uses the registered adaptive flow resolver', () => {
    const adaptiveDocument = defineDocument({
      ...linearDocument,
      id: 'adaptive-registry',
      flow: { mode: 'adaptive' },
    });
    const host = createHost();
    const registry = createRegistry();
    registry.addFlow('adaptive', () => 's2');
    const withFlow = createSession(adaptiveDocument, { host, registry });
    expect(withFlow.next()).toBe('s2');
  });
});

describe('createSession: variables', () => {
  const variableDocument = defineDocument({
    id: 'variables',
    type: 'lesson',
    metadata: { title: 'Variables' },
    components: [{ type: 'ui.switch', version: 1 }],
    variables: {
      airOn: { type: 'boolean', initial: false },
      g: { type: 'number', initial: 10, enum: [9.8, 10] },
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
            fromMs: 0,
            placement: { x: 0.7, y: 0.1, w: 0.25, h: 0.12 },
            bind: { value: 'airOn' },
          },
        ],
      },
    ],
  });

  it('initializes from the document, writes, and emits telemetry', () => {
    const events: TelemetryEvent[] = [];
    const host = createHost({ telemetry: { emit: (event) => events.push(event) }, clock: () => 42 });
    const session = createSession(variableDocument, { host });

    expect(session.getState().variables).toEqual({ airOn: false, g: 10 });
    session.setVariable('airOn', true);

    expect(session.getState().variables.airOn).toBe(true);
    expect(events).toContainEqual(
      expect.objectContaining({
        name: 'variable.changed',
        at: 42,
        payload: { variable: 'airOn', value: true },
      }),
    );
    expect(host.storage.load('variables')?.variables.airOn).toBe(true);
  });

  it('rejects an unknown variable and a value outside the enum', () => {
    const session = createSession(variableDocument);

    expect(() => session.setVariable('missing', true)).toThrow('Unknown variable: missing');
    expect(() => session.setVariable('g', 5)).toThrow('Value outside the enum: 5');
    expect(session.getState().variables.g).toBe(10);
  });

  it('fills missing variables from an old record and reset returns to the start', () => {
    const host = createHost();
    const session = createSession(variableDocument, { host });
    session.setVariable('g', 9.8);

    const restored = createSession(variableDocument, { host });
    expect(restored.getState().variables).toEqual({ airOn: false, g: 9.8 });

    restored.reset();
    expect(restored.getState().variables).toEqual({ airOn: false, g: 10 });
  });
});

describe('createSession: scoring contract', () => {
  const threeQuestions = defineDocument({
    id: 'score',
    type: 'quiz',
    metadata: { title: 'Score' },
    scoring: { mode: 'sum', passingRatio: 0.5 },
    nodes: [
      { id: 'q1', type: 'question', item: { kind: 'true-false', prompt: 'a', correct: true } },
      { id: 'q2', type: 'question', item: { kind: 'true-false', prompt: 'b', correct: true } },
      { id: 'q3', type: 'question', item: { kind: 'true-false', prompt: 'c', correct: true } },
    ],
  });

  it('keeps unanswered questions in the denominator', () => {
    const session = createSession(threeQuestions);
    session.answer('q1', { value: true });

    expect(session.score()).toEqual({ earned: 1, max: 3, ratio: 1 / 3, passed: false });
  });

  it('averages question ratios in average mode', () => {
    const document = defineDocument({
      ...threeQuestions,
      id: 'average',
      scoring: { mode: 'average', passingRatio: 0.8 },
      nodes: threeQuestions.nodes.slice(0, 2),
    });
    const session = createSession(document);
    session.answer('q1', { value: true });

    expect(session.score().ratio).toBe(0.5);
    expect(session.score().passed).toBe(false);
  });

  it('excludes poll and scale questions from the denominator', () => {
    const document = defineDocument({
      id: 'poll',
      type: 'quiz',
      metadata: { title: 'Anket' },
      nodes: [
        { id: 'q1', type: 'question', item: { kind: 'true-false', prompt: 'a', correct: true } },
        { id: 'p1', type: 'question', item: { kind: 'poll', prompt: 'p', choices: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }] } },
        { id: 's1', type: 'question', item: { kind: 'scale', prompt: 's' } },
      ],
    });
    const session = createSession(document);
    session.answer('q1', { value: true });

    expect(session.score().max).toBe(1);
    expect(session.score().ratio).toBe(1);
  });
});
