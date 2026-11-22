'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  createLessonStage,
  createLerno,
  type LernoDocument,
  type LernoExtension,
  type LernoHost,
  type LessonStage,
  type LessonStageState,
  type VariableValue,
} from '@medu/lerno';

/** Options accepted by `UseLessonStage`. */
export interface UseLessonStageOptions {
  host?: Partial<LernoHost>;
  extensions?: LernoExtension[];
  durationMs?: number;
  fps?: number;
  loop?: boolean;
  /** Resume from a saved session. */
  state?: LessonStageState['session'];
}

function buildStage(document: LernoDocument, options: UseLessonStageOptions): LessonStage {
  const { host, registry } = createLerno({ host: options.host, extensions: options.extensions });
  return createLessonStage(document, {
    host,
    registry,
    durationMs: options.durationMs,
    fps: options.fps,
    loop: options.loop,
    state: options.state,
  });
}

/**
 * Binds a document to a single lesson stage.
 * Time, variables, answers, and layers are managed through the same `LessonStage`.
 * Replacing the document rebuilds the stage instead of replaying the old one.
 */
export function useLessonStage(document: LernoDocument, options: UseLessonStageOptions = {}) {
  const [stage, setStage] = useState<LessonStage>(() => buildStage(document, options));

  const [state, setState] = useState<LessonStageState>(() => stage.getState());

  useEffect(() => {
    if (stage.document === document) return;
    setStage(buildStage(document, options));
  }, [document, stage, options]);

  useEffect(() => {
    setState(stage.getState());
    const unsubscribe = stage.subscribe(setState);
    return () => {
      unsubscribe();
      stage.destroy();
    };
  }, [stage]);

  const setVariable = useCallback((variable: string, value: VariableValue) => stage.setVariable(variable, value), [stage]);
  const answer = useCallback((questionId: string, response: unknown) => stage.answer(questionId, response), [stage]);
  const next = useCallback(() => stage.next(), [stage]);
  const back = useCallback(() => stage.back(), [stage]);
  const choose = useCallback((nodeId: string, choiceId: string) => stage.choose(nodeId, choiceId), [stage]);
  const goTo = useCallback((nodeId: string) => stage.goTo(nodeId), [stage]);
  const seek = useCallback((timeMs: number) => stage.seek(timeMs), [stage]);
  const advance = useCallback((deltaMs: number) => stage.advance(deltaMs), [stage]);
  const reset = useCallback(() => stage.reset(), [stage]);

  return {
    stage,
    state,
    sessionState: state.session,
    timeMs: state.timeMs,
    host: stage.host,
    registry: stage.registry,
    setVariable,
    answer,
    next,
    back,
    choose,
    goTo,
    seek,
    advance,
    reset,
  };
}
