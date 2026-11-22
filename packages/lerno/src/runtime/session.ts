import { collectQuestions, getNode, type QuestionRef } from '../content/document';
import type { LernoDocument, LernoNode, VariableValue } from '../content/schema';
import { ungradedOutcome, type GradeOutcome } from '../grading/grader';
import { createHost, type LernoHost } from '../extensions/host';
import { createRegistry, type LernoRegistry } from '../extensions/registry';
import { initialVariables, variableError, withVariableDefaults } from './variables';

/** Shape of `AnswerRecord`. */
export interface AnswerRecord {
  questionId: string;
  nodeId: string;
  response: unknown;
  outcome: GradeOutcome;
  answeredAt: number;
}

/** State of `LernoSession`. */
export interface LernoSessionState {
  documentId: string;
  schemaVersion: number;
  cursor: string;
  visited: string[];
  answers: Record<string, AnswerRecord>;
  /** Current document variables; the component layer reads them here. */
  variables: Record<string, VariableValue>;
  status: 'in-progress' | 'completed';
}

/** Shape of `SessionScore`. */
export interface SessionScore {
  earned: number;
  max: number;
  ratio: number;
  passed: boolean | null;
}

/** Options accepted by `Session`. */
export interface SessionOptions {
  host?: LernoHost;
  registry?: LernoRegistry;
  /** Resume from a saved session. */
  state?: LernoSessionState;
}

/** Shape of `LernoSession`. */
export interface LernoSession {
  readonly document: LernoDocument;
  /**
   * Reads the current session state.
   * @returns A plain snapshot that can be serialized and restored.
   */
  getState(): LernoSessionState;
  /**
   * Reads the node currently under the cursor.
   * @returns The node, or undefined when the session has no cursor.
   */
  currentNode(): LernoNode | undefined;
  /**
   * Grades and stores an answer for a question node.
   * @param questionId - Id of the question being answered.
   * @param response - Raw response of the question's expected type.
   * @returns The record holding the response and its graded outcome.
   */
  answer(questionId: string, response: unknown): AnswerRecord;
  /**
   * Updates a document variable and notifies listeners.
   * @param variableId - Variable name declared on the document.
   * @param value - New value matching the definition.
   */
  setVariable(variableId: string, value: VariableValue): void;
  /**
   * Follows a branch choice from a node.
   * @param nodeId - Id of the branch node.
   * @param choiceId - Id of the selected choice.
   * @returns The id of the target node, or null when the choice does not resolve.
   */
  choose(nodeId: string, choiceId: string): string | null;
  /**
   * Moves the cursor to the next node in document order.
   * @returns The new cursor, or null when the document ends.
   */
  next(): string | null;
  /**
   * Moves the cursor to the previous node in history.
   * @returns The previous cursor, or null when there is no history to return to.
   */
  back(): string | null;
  /**
   * Moves the cursor to an arbitrary node.
   * @param nodeId - Id of the node to visit; unknown ids are ignored.
   */
  goTo(nodeId: string): void;
  /**
   * Computes the session score from graded answers.
   * @returns Earned points, available points, and the passing ratio.
   */
  score(): SessionScore;
  /**
   * Subscribes to every session state change.
   * @param listener - Called after each mutation with the new state.
   * @returns A function that unsubscribes the listener.
   */
  subscribe(listener: (state: LernoSessionState) => void): () => void;
  /**
   * Clears answers and history and returns the cursor to the first node.
   */
  reset(): void;
}

/**
 * Deterministic content session.
 * Flow, answering, scoring, and progress are managed here, while persistence,
 * telemetry, and flow resolution arrive from host adapters.
 */
export function createSession(document: LernoDocument, options: SessionOptions = {}): LernoSession {
  const host = options.host ?? createHost();
  const registry = options.registry ?? createRegistry();

  const questions = new Map<string, QuestionRef>();
  for (const ref of collectQuestions(document)) questions.set(ref.id, ref);

  const firstNodeId = document.nodes[0]?.id ?? '';

  function initialState(): LernoSessionState {
    return {
      documentId: document.id,
      schemaVersion: document.schemaVersion,
      cursor: firstNodeId,
      visited: firstNodeId ? [firstNodeId] : [],
      answers: {},
      variables: initialVariables(document),
      status: 'in-progress',
    };
  }

  const restored = options.state ?? host.storage.load(document.id);
  let state: LernoSessionState = restored
    ? { ...restored, variables: withVariableDefaults(document, restored.variables) }
    : initialState();
  const listeners = new Set<(next: LernoSessionState) => void>();

  function commit(next: LernoSessionState): void {
    state = next;
    host.storage.save(document.id, state);
    for (const listener of listeners) listener(state);
  }

  function currentNode(): LernoNode | undefined {
    return getNode(document, state.cursor);
  }

  function answer(questionId: string, response: unknown): AnswerRecord {
    const ref = questions.get(questionId);
    const definition = ref ? registry.questions.get(ref.item.kind) : undefined;
    const outcome: GradeOutcome = ref
      ? definition
        ? definition.grade(ref.item, response)
        : ungradedOutcome()
      : ungradedOutcome('Bilinmeyen soru');

    const record: AnswerRecord = {
      questionId,
      nodeId: ref?.nodeId ?? state.cursor,
      response,
      outcome,
      answeredAt: host.clock(),
    };

    commit({ ...state, answers: { ...state.answers, [questionId]: record } });
    host.telemetry.emit({
      name: 'answered',
      at: record.answeredAt,
      nodeId: record.nodeId,
      payload: {
        questionId,
        status: outcome.status,
        score: outcome.score,
        maxScore: outcome.maxScore,
        correct: outcome.status === 'correct',
      },
    });

    return record;
  }

  function setVariable(variableId: string, value: VariableValue): void {
    const definition = document.variables[variableId];
    if (!definition) throw new RangeError(`Unknown variable: ${variableId}`);
    const error = variableError(definition, value);
    if (error) throw new RangeError(`Invalid value (${variableId}): ${error}`);

    commit({ ...state, variables: { ...state.variables, [variableId]: value } });
    host.telemetry.emit({
      name: 'variable.changed',
      at: host.clock(),
      nodeId: state.cursor,
      payload: { variable: variableId, value },
    });
  }

  function goTo(nodeId: string): void {
    if (!getNode(document, nodeId)) return;
    const visited = state.visited.includes(nodeId) ? state.visited : [...state.visited, nodeId];
    commit({ ...state, cursor: nodeId, visited, status: 'in-progress' });
    host.telemetry.emit({ name: 'node.visited', at: host.clock(), nodeId });
  }

  function resolveNext(): string | null {
    if (document.flow.mode === 'adaptive') {
      const resolver = host.flow ?? registry.flows.get('adaptive') ?? registry.flows.get('linear');
      return resolver ? resolver(document, state) : null;
    }
    const resolver = registry.flows.get(document.flow.mode) ?? registry.flows.get('linear');
    return resolver ? resolver(document, state) : null;
  }

  function next(): string | null {
    const node = currentNode();
    if (!node) return null;
    if (node.type === 'branch') return null;

    const target = resolveNext();
    if (!target) {
      commit({ ...state, status: 'completed' });
      host.telemetry.emit({ name: 'session.completed', at: host.clock() });
      return null;
    }

    goTo(target);
    return target;
  }

  function choose(nodeId: string, choiceId: string): string | null {
    const node = getNode(document, nodeId);
    if (!node || node.type !== 'branch') return null;

    const choice = node.choices.find((entry) => entry.id === choiceId);
    if (!choice) return null;

    host.telemetry.emit({
      name: 'branch.chosen',
      at: host.clock(),
      nodeId,
      payload: { choiceId, tag: choice.tag },
    });
    goTo(choice.target);
    return choice.target;
  }

  function back(): string | null {
    if (state.visited.length <= 1) return null;
    const visited = state.visited.slice(0, -1);
    const cursor = visited[visited.length - 1];
    commit({ ...state, cursor, visited, status: 'in-progress' });
    return cursor;
  }

  function score(): SessionScore {
    const gradable = [...questions.values()].filter(
      (ref) => ref.item.kind !== 'poll' && ref.item.kind !== 'scale',
    );
    const max = gradable.reduce((total, ref) => total + ref.points, 0);
    const ratios: number[] = [];
    let weighted = 0;

    for (const ref of gradable) {
      const record = state.answers[ref.id];
      const ratio = record && record.outcome.maxScore > 0
        ? Math.max(0, Math.min(1, record.outcome.score / record.outcome.maxScore))
        : 0;
      ratios.push(ratio);
      weighted += ratio * ref.points;
    }

    const weightedRatio = max > 0 ? weighted / max : 0;
    const ratio = document.scoring.mode === 'average' && ratios.length > 0
      ? ratios.reduce((total, value) => total + value, 0) / ratios.length
      : weightedRatio;
    const passingRatio = document.scoring.passingRatio;
    const passed = passingRatio === undefined ? null : ratio >= passingRatio;
    return { earned: weighted, max, ratio, passed };
  }

  function reset(): void {
    host.storage.clear(document.id);
    commit(initialState());
  }

  function subscribe(listener: (next: LernoSessionState) => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  host.telemetry.emit({ name: 'session.started', at: host.clock(), payload: { documentId: document.id } });

  return {
    document,
    getState: () => state,
    currentNode,
    answer,
    setVariable,
    choose,
    next,
    back,
    goTo,
    score,
    subscribe,
    reset,
  };
}
