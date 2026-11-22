import { collectQuestions } from './document';
import {
  branchingScenario,
  cardsDeck,
  coursePresentation,
  hotspotImage,
  infoPage,
  interactiveBook,
  interactiveVideo,
  questionSet,
  virtualLab,
} from './presets';
import type { QuestionItem } from './schema';

const mc = (prompt: string): QuestionItem => ({
  kind: 'multiple-choice',
  prompt,
  choices: [
    { id: 'a', label: 'A' },
    { id: 'b', label: 'B' },
  ],
  correct: ['a'],
  multiple: false,
});

describe('content type presets', () => {
  it('questionSet produces question nodes', () => {
    const document = questionSet('s1', { title: 'Quiz' }, [mc('One?'), mc('Two?')]);
    expect(document.type).toBe('question-set');
    expect(document.nodes.map((node) => node.type)).toEqual(['question', 'question']);
    expect(collectQuestions(document)).toHaveLength(2);
  });

  it('coursePresentation produces a slide sequence', () => {
    const document = coursePresentation('c1', { title: 'Sunum' }, [
      { title: 'Introduction', blocks: [{ type: 'text', markdown: 'Hello' }] },
      { blocks: [{ type: 'heading', text: 'Chapter', level: 2 }] },
    ]);
    expect(document.type).toBe('course-presentation');
    expect(document.nodes.map((node) => node.id)).toEqual(['slide-1', 'slide-2']);
  });

  it('interactiveBook preserves the type', () => {
    const document = interactiveBook('b1', { title: 'Kitap' }, [{ title: 'Chapter 1', blocks: [] }]);
    expect(document.type).toBe('interactive-book');
  });

  it('interactiveVideo carries anchors', () => {
    const document = interactiveVideo('v1', { title: 'Video' }, 'asset-1', [
      { id: 'a1', atMs: 3000, kind: 'question', label: 'Stop', item: mc('Stop and think') },
    ]);
    const node = document.nodes[0];
    expect(node.type).toBe('media');
    if (node.type === 'media') {
      expect(node.anchors).toHaveLength(1);
      expect(collectQuestions(document)).toHaveLength(1);
    }
  });

  it('branchingScenario builds a graph flow', () => {
    const document = branchingScenario('br1', { title: 'Senaryo' }, [
      {
        id: 'fork',
        type: 'branch',
        prompt: 'Choose a path',
        choices: [{ id: 'c1', label: 'A', target: 'end' }],
      },
      { id: 'end', type: 'slide', blocks: [] },
    ]);
    expect(document.flow.mode).toBe('graph');
  });

  it('cardsDeck produces cards', () => {
    const document = cardsDeck('d1', { title: 'Kartlar' }, [{ front: 'A', back: '1' }, { front: 'B', back: '2' }], 'match');
    const node = document.nodes[0];
    expect(node.type).toBe('cards');
    if (node.type === 'cards') {
      expect(node.mode).toBe('match');
      expect(node.cards).toHaveLength(2);
    }
  });

  it('hotspotImage and infoPage produce a single node', () => {
    const hotspot = hotspotImage('h1', { title: 'Harita' }, 'map', [
      { id: 's1', x: 0.5, y: 0.5, label: 'Capital', correct: true },
    ], 'find');
    expect(hotspot.nodes[0].type).toBe('hotspot');

    const info = infoPage('i1', { title: 'Summary' }, [{ title: 'Not', body: 'Text' }]);
    expect(info.nodes[0].type).toBe('info');
  });

  it('virtualLab combines setup and step questions', () => {
    const lab = virtualLab('lab1', { title: 'Pendulum Lab' }, {
      setup: 'Pendulum: L = 1.5 m, g = 9.8 m/s², initial angle 30°.',
      steps: [
        { instruction: 'Halve the length and observe the period.', question: mc('How does the period change?') },
      ],
    });
    expect(lab.type).toBe('virtual-lab');
    expect(lab.nodes[0].type).toBe('slide');
    expect(lab.nodes.map((node) => node.type)).toEqual(['slide', 'slide', 'question']);
    expect(collectQuestions(lab)).toHaveLength(1);
  });
});
