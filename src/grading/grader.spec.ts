import {
  MultipleChoiceItemSchema,
  type MultipleChoiceItem,
  type QuestionItem,
} from '../content/schema';
import {
  conceptMapQuestion,
  defaultQuestions,
  equationQuestion,
  fillBlanksQuestion,
  matchingQuestion,
  multipleChoiceQuestion,
  numericQuestion,
  openQuestion,
  orderingQuestion,
  pollQuestion,
  shortAnswerQuestion,
  solutionStepsQuestion,
  ungradedOutcome,
} from './grader';

function grade(kind: string, item: QuestionItem, response: unknown) {
  const definition = defaultQuestions.find((entry) => entry.kind === kind);
  if (!definition) throw new Error(`no definition: ${kind}`);
  return definition.grade(item, response);
}

const mc: MultipleChoiceItem = MultipleChoiceItemSchema.parse({
  kind: 'multiple-choice',
  prompt: '2 + 2?',
  choices: [
    { id: 'a', label: '3', misconception: 'one too many in the sum' },
    { id: 'b', label: '4' },
    { id: 'c', label: '5', misconception: 'two too many in the sum' },
  ],
  correct: ['b'],
});

describe('multiple-choice', () => {
  it('accepts the correct selection', () => {
    const outcome = multipleChoiceQuestion.grade(mc, { selected: ['b'] });
    expect(outcome.status).toBe('correct');
    expect(outcome.score).toBe(1);
  });

  it('reports the misconception for a wrong selection', () => {
    const outcome = multipleChoiceQuestion.grade(mc, { selected: ['c'] });
    expect(outcome.status).toBe('incorrect');
    expect(outcome.misconceptions).toEqual(['two too many in the sum']);
  });

  it('grants partial credit for multi-select', () => {
    const multi = MultipleChoiceItemSchema.parse({ ...mc, multiple: true, correct: ['a', 'b'] });
    const outcome = multipleChoiceQuestion.grade(multi, { selected: ['a'] });
    expect(outcome.status).toBe('partial');
    expect(outcome.score).toBe(1);
    expect(outcome.maxScore).toBe(2);
  });

  it('marks an invalid response as pending', () => {
    const outcome = multipleChoiceQuestion.grade(mc, {});
    expect(outcome.status).toBe('pending');
    expect(outcome.maxScore).toBe(1);
  });
});

describe('other graders', () => {
  it('true-false', () => {
    const item: QuestionItem = { kind: 'true-false', prompt: 'p', correct: true };
    expect(grade('true-false', item, { value: true }).status).toBe('correct');
    expect(grade('true-false', item, { value: false }).status).toBe('incorrect');
  });

  it('short-answer normalizes Turkish case and whitespace', () => {
    const item: QuestionItem = { kind: 'short-answer', prompt: 'p', accepted: ['İstanbul'], caseSensitive: false };
    expect(shortAnswerQuestion.grade(item, { text: '  istanbul ' }).status).toBe('correct');
  });

  it('numeric tolerance', () => {
    const item: QuestionItem = { kind: 'numeric', prompt: 'p', value: 3.14, tolerance: 0.01 };
    expect(numericQuestion.grade(item, { value: 3.145 }).status).toBe('correct');
    expect(numericQuestion.grade(item, { value: 3.2 }).status).toBe('incorrect');
  });

  it('fill-blanks partial credit', () => {
    const item: QuestionItem = {
      kind: 'fill-blanks',
      prompt: 'p',
      text: '{{0}} + {{1}} = 2',
      blanks: [{ accepted: ['1'], caseSensitive: false }, { accepted: ['1'], caseSensitive: false }],
    };
    const outcome = fillBlanksQuestion.grade(item, { values: ['1', '2'] });
    expect(outcome.status).toBe('partial');
    expect(outcome.score).toBe(1);
    expect(outcome.maxScore).toBe(2);
  });

  it('ordering grades the sequence', () => {
    const item: QuestionItem = { kind: 'ordering', prompt: 'p', items: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }] };
    expect(orderingQuestion.grade(item, { order: ['a', 'b'] }).status).toBe('correct');
    expect(orderingQuestion.grade(item, { order: ['b', 'a'] }).score).toBe(0);
  });

  it('matching grades the pairs', () => {
    const item: QuestionItem = { kind: 'matching', prompt: 'p', pairs: [{ left: 'A', right: '1' }, { left: 'B', right: '2' }] };
    const outcome = matchingQuestion.grade(item, { pairs: [{ left: 'A', right: '1' }] });
    expect(outcome.score).toBe(1);
    expect(outcome.maxScore).toBe(2);
  });

  it('open stays pending until the rubric is scored', () => {
    const item: QuestionItem = {
      kind: 'open',
      prompt: 'p',
      rubric: [{ id: 'r1', label: 'Accuracy', points: 6 }, { id: 'r2', label: 'Layout', points: 4 }],
    };
    expect(openQuestion.grade(item, { text: 'answer' }).status).toBe('pending');
    const graded = openQuestion.grade(item, { text: 'answer', rubricScores: { r1: 6, r2: 4 } });
    expect(graded.status).toBe('correct');
    expect(graded.score).toBe(10);
  });

  it('poll and scale are not scored', () => {
    const poll: QuestionItem = { kind: 'poll', prompt: 'p', choices: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }] };
    expect(pollQuestion.grade(poll, { selected: [] }).status).toBe('ungraded');
    expect(ungradedOutcome().status).toBe('ungraded');
  });

  it('equation normalizes notation differences', () => {
    const item: QuestionItem = { kind: 'equation', prompt: 'p', accepted: ['2x+3'], caseSensitive: false };
    expect(equationQuestion.grade(item, { text: ' 2X + 3 ' }).status).toBe('correct');
    expect(equationQuestion.grade(item, { text: 'y = 2x + 3' }).status).toBe('incorrect');
    expect(equationQuestion.grade(item, { text: '2x+4' }).status).toBe('incorrect');
  });

  it('concept-map treats relations as undirected and scores partially', () => {
    const item: QuestionItem = {
      kind: 'concept-map',
      prompt: 'p',
      concepts: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }],
      relations: [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }],
    };
    const partial = conceptMapQuestion.grade(item, { relations: [{ from: 'b', to: 'a' }] });
    expect(partial.status).toBe('partial');
    expect(partial.score).toBe(1);
    expect(conceptMapQuestion.grade(item, { relations: [{ from: 'a', to: 'b' }, { from: 'c', to: 'b' }] }).status).toBe('correct');
  });

  it('solution-steps grades step by step', () => {
    const item: QuestionItem = {
      kind: 'solution-steps',
      prompt: 'p',
      steps: [
        { id: 's1', accepted: ['2x'], caseSensitive: false },
        { id: 's2', accepted: ['2'], caseSensitive: false },
      ],
    };
    const outcome = solutionStepsQuestion.grade(item, { steps: ['2x', '3'] });
    expect(outcome.status).toBe('partial');
    expect(outcome.score).toBe(1);
    expect(outcome.maxScore).toBe(2);
  });
});
