import { z } from 'zod';
import {
  ConceptMapItemSchema,
  EquationItemSchema,
  FillBlanksItemSchema,
  MatchingItemSchema,
  MultipleChoiceItemSchema,
  NumericItemSchema,
  OpenItemSchema,
  OrderingItemSchema,
  PollItemSchema,
  ScaleItemSchema,
  ShortAnswerItemSchema,
  SolutionStepsItemSchema,
  TrueFalseItemSchema,
  type QuestionItem,
} from '../content/schema';

/** Status of a graded answer. */
export type GradeStatus = 'correct' | 'incorrect' | 'partial' | 'pending' | 'ungraded';

/** Result of grading one answer. */
export interface GradeOutcome {
  status: GradeStatus;
  score: number;
  maxScore: number;
  detail?: string;
  /** Misconceptions signalled by the selected distractors (diagnostics). */
  misconceptions?: string[];
}

/** Definition of a question kind: schemas and grader. */
export interface QuestionDefinition {
  kind: string;
  /**
   * Grades one response against a question item.
   * @param item - Question definition carrying the schema and the accepted answers.
   * @param response - Raw answer of any type; the grader narrows it.
   * @returns Score, status, and any misconceptions detected.
   */
  grade(item: QuestionItem, response: unknown): GradeOutcome;
}

// ---------------------------------------------------------------------------
// Response schemas
// ---------------------------------------------------------------------------

/** Zod schema for a multiple-choice response. */
export const MultipleChoiceResponseSchema = z.object({ selected: z.array(z.string()) });
/** Zod schema for a true/false response. */
export const TrueFalseResponseSchema = z.object({ value: z.boolean() });
/** Zod schema for a short-answer response. */
export const ShortAnswerResponseSchema = z.object({ text: z.string() });
/** Zod schema for a numeric response. */
export const NumericResponseSchema = z.object({ value: z.number() });
/** Zod schema for a fill-the-blanks response. */
export const FillBlanksResponseSchema = z.object({ values: z.array(z.string()) });
/** Zod schema for an ordering response. */
export const OrderingResponseSchema = z.object({ order: z.array(z.string()) });
/** Zod schema for a matching response. */
export const MatchingResponseSchema = z.object({
  pairs: z.array(z.object({ left: z.string(), right: z.string() })),
});
/** Zod schema for an open response. */
export const OpenResponseSchema = z.object({
  text: z.string().optional(),
  rubricScores: z.record(z.string(), z.number()).default({}),
});
/** Zod schema for a poll response. */
export const PollResponseSchema = z.object({ selected: z.array(z.string()) });
/** Zod schema for a scale response. */
export const ScaleResponseSchema = z.object({ value: z.number() });
/** Zod schema for a concept-map response. */
export const ConceptMapResponseSchema = z.object({
  relations: z.array(z.object({ from: z.string(), to: z.string() })),
});
/** Zod schema for a step-by-step solution response. */
export const SolutionStepsResponseSchema = z.object({ steps: z.array(z.string()) });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Trims a response and lowercases it unless comparison is case-sensitive.
 * @param value - Raw response text.
 * @param caseSensitive - When true, the text is returned trimmed only.
 * @returns The comparable form of the response.
 */
function normalize(value: string, caseSensitive: boolean): string {
  const trimmed = value.trim().replace(/\s+/g, ' ');
  return caseSensitive ? trimmed : trimmed.toLocaleLowerCase('tr');
}

/**
 * Builds a graded outcome from a partial-credit ratio.
 * @param correct - Number of correct selections.
 * @param total - Number of gradable selections.
 * @param misconceptions - Tags of the wrong choices the learner selected.
 * @returns An outcome with status, score, and the tag list.
 */
function ratioOutcome(correct: number, total: number, misconceptions: string[] = []): GradeOutcome {
  if (total === 0) return { status: 'ungraded', score: 0, maxScore: 0 };
  const score = Math.max(0, Math.min(total, correct));
  const status: GradeStatus = score === total ? 'correct' : score === 0 ? 'incorrect' : 'partial';
  const outcome: GradeOutcome = { status, score, maxScore: total };
  if (misconceptions.length > 0) outcome.misconceptions = misconceptions;
  return outcome;
}

/**
 * Canonicalizes an equation so algebraically equal responses compare as equal.
 * @param value - Raw equation text.
 * @param caseSensitive - When true, only whitespace and separators are normalized.
 * @returns The canonical form of the equation.
 */
function normalizeEquation(value: string, caseSensitive: boolean): string {
  const result = value
    .replace(/\\(left|right|cdot|times|,)/g, '')
    .replace(/[²]/g, '^2')
    .replace(/[³]/g, '^3')
    .replace(/[×·⋅∗]/g, '*')
    .replace(/[−–—]/g, '-')
    .replace(/\(\s*\)/g, '')
    .replace(/\s+/g, '')
    .replace(/[{}]/g, '')
    .replace(/\*{2}/g, '^');
  return caseSensitive ? result : result.toLocaleLowerCase('tr');
}

/**
 * Order-insensitive equality for choice lists.
 * @param a - First list.
 * @param b - Second list.
 * @returns True when both lists hold the same members regardless of order.
 */
function setEquals(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((value) => set.has(value));
}

/**
 * Builds a canonical key for an equivalence relation regardless of direction.
 * @param from - Left side of the relation.
 * @param to - Right side of the relation.
 * @returns A key that is identical for a relation and its inverse.
 */
function relationKey(from: string, to: string): string {
  return [from, to].sort().join('|');
}

/**
 * Type-safe question definition.
 * The incoming item and response are validated by schema, and grade only ever
 * works on narrowed types, so no any is involved.
 */
export function defineQuestion<Item extends QuestionItem, Response>(config: {
  kind: Item['kind'];
  itemSchema: z.ZodType<Item>;
  responseSchema: z.ZodType<Response>;
  maxScore?: (item: Item) => number;
  /**
   * Grades one response with this grading strategy.
   * @param item - Question definition.
   * @param response - Raw answer of the strategy's response type.
   * @returns Score, status, and any misconceptions detected.
   */
  grade(item: Item, response: Response): GradeOutcome;
}): QuestionDefinition {
  return {
    kind: config.kind,
    grade(item, response) {
      const parsedItem = config.itemSchema.safeParse(item);
      if (!parsedItem.success) {
        return { status: 'pending', score: 0, maxScore: 0, detail: 'Question could not be validated' };
      }

      const parsedResponse = config.responseSchema.safeParse(response);
      if (!parsedResponse.success) {
        const max = config.maxScore?.(parsedItem.data) ?? 1;
        return { status: 'pending', score: 0, maxScore: max, detail: 'Awaiting answer' };
      }

      return config.grade(parsedItem.data, parsedResponse.data);
    },
  };
}

// ---------------------------------------------------------------------------
// Core graders
// ---------------------------------------------------------------------------

/** Built-in question definition for multiple-choice items. */
export const multipleChoiceQuestion = defineQuestion({
  kind: 'multiple-choice',
  itemSchema: MultipleChoiceItemSchema,
  responseSchema: MultipleChoiceResponseSchema,
  maxScore: (item) => item.correct.length,
  grade: (item, response) => {
    const selected = new Set(response.selected);
    const misconceptions = item.choices
      .filter((choice) => selected.has(choice.id) && !item.correct.includes(choice.id) && choice.misconception)
      .map((choice) => choice.misconception as string);

    if (setEquals(item.correct, response.selected)) {
      return ratioOutcome(item.correct.length, item.correct.length);
    }

    if (!item.multiple) {
      const outcome = ratioOutcome(0, item.correct.length);
      if (misconceptions.length > 0) outcome.misconceptions = misconceptions;
      return outcome;
    }

    const hits = item.correct.filter((id) => selected.has(id)).length;
    const misses = response.selected.filter((id) => !item.correct.includes(id)).length;
    return ratioOutcome(hits - misses, item.correct.length, misconceptions);
  },
});

/** Built-in question definition for true/false items. */
export const trueFalseQuestion = defineQuestion({
  kind: 'true-false',
  itemSchema: TrueFalseItemSchema,
  responseSchema: TrueFalseResponseSchema,
  grade: (item, response) => ratioOutcome(item.correct === response.value ? 1 : 0, 1),
});

/** Built-in question definition for short-answer items. */
export const shortAnswerQuestion = defineQuestion({
  kind: 'short-answer',
  itemSchema: ShortAnswerItemSchema,
  responseSchema: ShortAnswerResponseSchema,
  grade: (item, response) => {
    const answer = normalize(response.text, item.caseSensitive);
    const hit = item.accepted.some((accepted) => normalize(accepted, item.caseSensitive) === answer);
    return ratioOutcome(hit ? 1 : 0, 1);
  },
});

/** Built-in question definition for numeric items. */
export const numericQuestion = defineQuestion({
  kind: 'numeric',
  itemSchema: NumericItemSchema,
  responseSchema: NumericResponseSchema,
  grade: (item, response) => {
    const hit = Math.abs(response.value - item.value) <= item.tolerance;
    return ratioOutcome(hit ? 1 : 0, 1);
  },
});

/** Built-in question definition for fill-the-blanks items. */
export const fillBlanksQuestion = defineQuestion({
  kind: 'fill-blanks',
  itemSchema: FillBlanksItemSchema,
  responseSchema: FillBlanksResponseSchema,
  maxScore: (item) => item.blanks.length,
  grade: (item, response) => {
    const hits = item.blanks.reduce((total, blank, index) => {
      const given = response.values[index];
      if (given === undefined) return total;
      const hit = blank.accepted.some((accepted) => normalize(accepted, blank.caseSensitive) === normalize(given, blank.caseSensitive));
      return hit ? total + 1 : total;
    }, 0);
    return ratioOutcome(hits, item.blanks.length);
  },
});

/** Built-in question definition for ordering items. */
export const orderingQuestion = defineQuestion({
  kind: 'ordering',
  itemSchema: OrderingItemSchema,
  responseSchema: OrderingResponseSchema,
  maxScore: (item) => item.items.length,
  grade: (item, response) => {
    const expected = item.items.map((entry) => entry.id);
    const hits = expected.filter((id, index) => response.order[index] === id).length;
    return ratioOutcome(hits, expected.length);
  },
});

/** Built-in question definition for matching items. */
export const matchingQuestion = defineQuestion({
  kind: 'matching',
  itemSchema: MatchingItemSchema,
  responseSchema: MatchingResponseSchema,
  maxScore: (item) => item.pairs.length,
  grade: (item, response) => {
    const hits = item.pairs.filter((pair) =>
      response.pairs.some((given) => given.left === pair.left && given.right === pair.right),
    ).length;
    return ratioOutcome(hits, item.pairs.length);
  },
});

/** Built-in question definition for open items. */
export const openQuestion = defineQuestion({
  kind: 'open',
  itemSchema: OpenItemSchema,
  responseSchema: OpenResponseSchema,
  maxScore: (item) => item.rubric.reduce((total, criterion) => total + criterion.points, 0) || 1,
  grade: (item, response) => {
    const maxScore = item.rubric.reduce((total, criterion) => total + criterion.points, 0) || 1;
    const scored = Object.values(response.rubricScores).reduce((total, value) => total + value, 0);
    if (Object.keys(response.rubricScores).length === 0) {
      return { status: 'pending', score: 0, maxScore, detail: 'Awaiting review' };
    }
    const score = Math.max(0, Math.min(maxScore, scored));
    return {
      status: score >= maxScore ? 'correct' : score === 0 ? 'incorrect' : 'partial',
      score,
      maxScore,
    };
  },
});

/** Built-in question definition for poll items. */
export const pollQuestion = defineQuestion({
  kind: 'poll',
  itemSchema: PollItemSchema,
  responseSchema: PollResponseSchema,
  grade: () => ({ status: 'ungraded', score: 0, maxScore: 0, detail: 'Anket sorusu puanlanmaz' }),
});

/** Built-in question definition for scale items. */
export const scaleQuestion = defineQuestion({
  kind: 'scale',
  itemSchema: ScaleItemSchema,
  responseSchema: ScaleResponseSchema,
  grade: () => ({ status: 'ungraded', score: 0, maxScore: 0, detail: 'Scale questions are not scored' }),
});

/** Built-in question definition for equation items. */
export const equationQuestion = defineQuestion({
  kind: 'equation',
  itemSchema: EquationItemSchema,
  responseSchema: ShortAnswerResponseSchema,
  grade: (item, response) => {
    const given = normalizeEquation(response.text, item.caseSensitive);
    const hit = item.accepted.some((accepted) => normalizeEquation(accepted, item.caseSensitive) === given);
    return ratioOutcome(hit ? 1 : 0, 1);
  },
});

/** Built-in question definition for concept-map items. */
export const conceptMapQuestion = defineQuestion({
  kind: 'concept-map',
  itemSchema: ConceptMapItemSchema,
  responseSchema: ConceptMapResponseSchema,
  maxScore: (item) => item.relations.length,
  grade: (item, response) => {
    const expected = new Set(item.relations.map((relation) => relationKey(relation.from, relation.to)));
    const given = new Set(response.relations.map((relation) => relationKey(relation.from, relation.to)));
    const hits = [...expected].filter((key) => given.has(key)).length;
    const misses = [...given].filter((key) => !expected.has(key)).length;
    return ratioOutcome(hits - misses, expected.size);
  },
});

/** Built-in question definition for step-by-step items. */
export const solutionStepsQuestion = defineQuestion({
  kind: 'solution-steps',
  itemSchema: SolutionStepsItemSchema,
  responseSchema: SolutionStepsResponseSchema,
  maxScore: (item) => item.steps.length,
  grade: (item, response) => {
    const hits = item.steps.reduce((total, step, index) => {
      const given = response.steps[index];
      if (given === undefined) return total;
      const hit = step.accepted.some((accepted) => normalize(accepted, step.caseSensitive) === normalize(given, step.caseSensitive));
      return hit ? total + 1 : total;
    }, 0);
    return ratioOutcome(hits, item.steps.length);
  },
});

/** Every built-in question definition. */
export const defaultQuestions: QuestionDefinition[] = [
  multipleChoiceQuestion,
  trueFalseQuestion,
  shortAnswerQuestion,
  numericQuestion,
  fillBlanksQuestion,
  orderingQuestion,
  matchingQuestion,
  openQuestion,
  pollQuestion,
  scaleQuestion,
  equationQuestion,
  conceptMapQuestion,
  solutionStepsQuestion,
];

/**
 * Builds the outcome used when no grader exists for a question kind.
 * @param detail - Reason surfaced to the learner and the report.
 * @returns An ungraded outcome with zero score.
 */
export function ungradedOutcome(detail = 'No grader for this question kind'): GradeOutcome {
  return { status: 'ungraded', score: 0, maxScore: 0, detail };
}
