import { z } from 'zod';
import { defineQuestion } from '../grading/grader';
import { createLerno, createRegistry, defineExtension } from './registry';

describe('createRegistry', () => {
  it('registers the core types', () => {
    const registry = createRegistry();

    expect(registry.nodes.has('slide')).toBe(true);
    expect(registry.nodes.has('custom')).toBe(true);
    expect(registry.questions.has('multiple-choice')).toBe(true);
    expect(registry.flows.has('linear')).toBe(true);
    expect(registry.components.size).toBe(0);
  });
});

describe('extension sistemi', () => {
  it('adds a new question, node, and flow', () => {
    const extension = defineExtension({
      name: 'test-ext',
      setup(registry) {
        registry.addQuestion(
          defineQuestion({
            kind: 'multiple-choice',
            itemSchema: z.object({ kind: z.literal('multiple-choice'), prompt: z.string(), choices: z.array(z.object({ id: z.string(), label: z.string() })), correct: z.array(z.string()), multiple: z.boolean() }),
            responseSchema: z.object({ selected: z.array(z.string()) }),
            // Custom grader replaces the built-in one
            grade: () => ({ status: 'correct', score: 99, maxScore: 99 }),
          }),
        );
        registry.addNode({ type: 'flashcard', label: 'Card' });
        registry.addFlow('always-first', (document) => document.nodes[0]?.id ?? null);
      },
    });

    const { registry } = createLerno({ extensions: [extension] });

    expect(registry.nodes.has('flashcard')).toBe(true);
    expect(registry.flows.has('always-first')).toBe(true);
    expect(registry.questions.get('multiple-choice')?.grade(
      { kind: 'multiple-choice', prompt: 'p', choices: [], correct: [], multiple: false },
      { selected: [] },
    ).score).toBe(99);
  });

  it('shares the host adapters', () => {
    const seen: string[] = [];
    const { host } = createLerno({
      host: { telemetry: { emit: (event) => seen.push(event.name) } },
    });
    host.telemetry.emit({ name: 'ping', at: 0 });
    expect(seen).toEqual(['ping']);
  });
});
