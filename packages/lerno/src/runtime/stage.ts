import type { LernoDocument, LernoNode, VariableValue } from '../content/schema';
import { createHost, type LernoHost } from '../extensions/host';
import { createRegistry, type LernoRegistry } from '../extensions/registry';
import { createInteractionRuntime, type InteractionRuntime, type ResolvedLayer } from './interactions';
import {
  createSession,
  type AnswerRecord,
  type LernoSession,
  type LernoSessionState,
  type SessionOptions,
} from './session';
import { Timeline } from './timeline';

/** Options accepted by `LessonStage`. */
export interface LessonStageOptions extends SessionOptions {
  /** Total stage duration in ms; defaults to 60s. */
  durationMs?: number;
  fps?: number;
  loop?: boolean;
  /** When provided, host and registry are not rebuilt. */
  host?: LernoHost;
  registry?: LernoRegistry;
}

/** State of `LessonStage`. */
export interface LessonStageState {
  session: LernoSessionState;
  timeMs: number;
}

/**
 * Single lesson stage: session, timeline, and interaction layers share
 * one source. Slide, video, and scene renderers read only this object.
 */
export interface LessonStage {
  readonly document: LernoDocument;
  readonly session: LernoSession;
  readonly host: LernoHost;
  readonly registry: LernoRegistry;
  readonly timeline: Timeline;
  readonly interactions: InteractionRuntime;
  getState(): LessonStageState;
  current(): LernoNode | undefined;
  variables(): Record<string, VariableValue>;
  setVariable(variable: string, value: VariableValue): void;
  answer(questionId: string, response: unknown): AnswerRecord;
  next(): string | null;
  back(): string | null;
  choose(nodeId: string, choiceId: string): string | null;
  goTo(nodeId: string): void;
  reset(): void;
  seek(timeMs: number): void;
  advance(deltaMs: number): void;
  /** Layers of a media node; uses stage time when `timeMs` is omitted. */
  layersAt(nodeId: string, timeMs?: number): ResolvedLayer[];
  subscribe(listener: (state: LessonStageState) => void): () => void;
  /** Releases session and stage listeners. */
  destroy(): void;
}

/**
 * Builds a single lesson stage from a document.
 * Media players drive video time; stage time advances with `seek`/`advance`.
 */
export function createLessonStage(document: LernoDocument, options: LessonStageOptions = {}): LessonStage {
  const host = options.host ?? createHost();
  const registry = options.registry ?? createRegistry();
  const session = createSession(document, { host, registry, state: options.state });
  const timeline = new Timeline({
    durationMs: options.durationMs ?? 60_000,
    fps: options.fps,
    loop: options.loop,
  });
  const interactions = createInteractionRuntime(document, session);
  const listeners = new Set<(state: LessonStageState) => void>();

  if (!options.state) {
    const remembered = host.storage.loadTime?.(document.id);
    if (remembered !== undefined && remembered > 0) timeline.seek(remembered);
  }

  function getState(): LessonStageState {
    return { session: session.getState(), timeMs: timeline.timeMs };
  }

  function emit(): void {
    const state = getState();
    for (const listener of listeners) listener(state);
  }

  const unsubscribeSession = session.subscribe(() => emit());

  return {
    document,
    session,
    host,
    registry,
    timeline,
    interactions,
    getState,
    current: () => session.currentNode(),
    variables: () => session.getState().variables,
    setVariable: (variable, value) => session.setVariable(variable, value),
    answer: (questionId, response) => session.answer(questionId, response),
    next: () => session.next(),
    back: () => session.back(),
    choose: (nodeId, choiceId) => session.choose(nodeId, choiceId),
    goTo: (nodeId) => session.goTo(nodeId),
    reset() {
      session.reset();
      timeline.reset();
      emit();
    },
    seek(timeMs) {
      timeline.seek(timeMs);
      host.storage.saveTime?.(document.id, timeline.timeMs);
      emit();
    },
    advance(deltaMs) {
      timeline.advance(deltaMs);
      emit();
    },
    layersAt(nodeId, timeMs) {
      return interactions.layersAt(nodeId, timeMs ?? timeline.timeMs);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    destroy() {
      host.storage.saveTime?.(document.id, timeline.timeMs);
      unsubscribeSession();
      listeners.clear();
    },
  };
}
