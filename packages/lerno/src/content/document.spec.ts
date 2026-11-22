import {
  LernoValidationError,
  collectQuestions,
  defineDocument,
  getDocumentPoints,
  getNode,
  getNodePoints,
  parseDocument,
} from './document';
import { LernoDocumentSchema } from './schema';

const baseDocument = {
  id: 'demo',
  type: 'lesson',
  metadata: { title: 'Demo Lesson' },
  nodes: [
    { id: 's1', type: 'slide', blocks: [{ type: 'text', markdown: 'Hello' }] },
    {
      id: 'q1',
      type: 'question',
      item: {
        kind: 'multiple-choice',
        prompt: 'What is 2 + 2?',
        choices: [
          { id: 'a', label: '3', misconception: 'addition error' },
          { id: 'b', label: '4' },
        ],
        correct: ['b'],
      },
    },
    {
      id: 'm1',
      type: 'media',
      assetId: 'video-1',
      anchors: [{ id: 'anchor-1', atMs: 1500, kind: 'question', label: 'Stop and think', item: { kind: 'true-false', prompt: 'Is it correct?', correct: true } }],
    },
  ],
};

describe('LernoDocument schema', () => {
  it('applies defaults', () => {
    const document = defineDocument(baseDocument);

    expect(document.schemaVersion).toBe(1);
    expect(document.metadata.language).toBe('tr');
    expect(document.flow.mode).toBe('linear');
    expect(document.scoring.mode).toBe('sum');
    expect(document.theme.colors).toEqual({});
    expect(document.nodes[1]).toMatchObject({ type: 'question', points: 1 });
  });

  it('rejects an invalid document', () => {
    const result = parseDocument({ id: 'x', type: 'lesson', metadata: { title: 'x' }, nodes: [] });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown node type', () => {
    const result = parseDocument({
      ...baseDocument,
      nodes: [{ id: 'x', type: 'bilinmeyen' }],
    });
    expect(result.success).toBe(false);
  });

  it('defineDocument throws LernoValidationError on invalid input', () => {
    expect(() => defineDocument({})).toThrow(LernoValidationError);
  });

  it('collects questions and points', () => {
    const document = defineDocument(baseDocument);

    const questions = collectQuestions(document);
    expect(questions.map((entry) => entry.id)).toEqual(['q1', 'anchor-1']);
    expect(getNodePoints(getNode(document, 'q1')!)).toBe(1);
    expect(getNodePoints(getNode(document, 'm1')!)).toBe(1);
    expect(getDocumentPoints(document)).toBe(2);
  });

  it('the schema can be used directly', () => {
    const parsed = LernoDocumentSchema.parse(baseDocument);
    expect(parsed.nodes).toHaveLength(3);
  });
});

describe('defineDocument — referans butunlugu', () => {
  function issuesOf(run: () => unknown): string[] {
    try {
      run();
    } catch (error) {
      const issues = (error as { issues?: { message: string }[] }).issues ?? [];
      return issues.map((issue) => issue.message);
    }
    return [];
  }

  const base = {
    id: 'refs',
    type: 'lesson',
    metadata: { title: 'Referanslar' },
    nodes: [
      { id: 'a', type: 'slide', blocks: [] },
      { id: 'b', type: 'slide', blocks: [] },
    ],
  };

  it('rejects a duplicate node id', () => {
    const input = { ...base, nodes: [{ id: 'a', type: 'slide', blocks: [] }, { id: 'a', type: 'slide', blocks: [] }] };
    expect(issuesOf(() => defineDocument(input))).toContain('Duplicate node id: a');
  });

  it('rejects a missing next target', () => {
    const input = {
      ...base,
      nodes: [{ id: 'a', type: 'info', panels: [{ title: 'Info', body: 'Text' }], next: 'missing' }],
    };
    expect(issuesOf(() => defineDocument(input))).toContain('next target not found: missing');
  });

  it('rejects a missing branch target', () => {
    const input = {
      ...base,
      nodes: [{ id: 'a', type: 'branch', prompt: 'Which one?', choices: [{ id: 'x', label: 'Git', target: 'missing' }] }],
    };
    expect(issuesOf(() => defineDocument(input))).toContain('Branch target not found: missing');
  });

  it('rejects a correct answer that is not among the choices', () => {
    const input = {
      ...base,
      nodes: [
        {
          id: 'q',
          type: 'question',
          item: {
            kind: 'multiple-choice',
            prompt: 'How many?',
            choices: [{ id: 'x', label: 'One' }, { id: 'y', label: 'Two' }],
            correct: ['z'],
          },
        },
      ],
    };
    expect(issuesOf(() => defineDocument(input))).toContain('Correct answer is not among the choices: z');
  });

  it('rejects a duplicate anchor id', () => {
    const input = {
      ...base,
      nodes: [
        {
          id: 'clip',
          type: 'media',
          assetId: 'clip',
          anchors: [
            { id: 'a1', atMs: 0, kind: 'info', label: 'One' },
            { id: 'a1', atMs: 1000, kind: 'info', label: 'Two' },
          ],
        },
      ],
    };
    expect(issuesOf(() => defineDocument(input))).toContain('Duplicate anchor id: a1');
  });
});
