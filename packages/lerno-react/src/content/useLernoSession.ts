'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createLerno,
  createSession,
  type LernoDocument,
  type LernoExtension,
  type LernoHost,
  type LernoRegistry,
  type LernoSessionState,
  type VariableValue,
} from '@medu/lerno';

/** Options accepted by `UseLernoSession`. */
export interface UseLernoSessionOptions {
  host?: Partial<LernoHost>;
  extensions?: LernoExtension[];
}

/**
 * Binds a session to a document for the lifetime of the component.
 * The session is created once per document, so answers survive re-renders and are
 * dropped only when the document or the reset call changes.
 */
export function useLernoSession(document: LernoDocument, options: UseLernoSessionOptions = {}) {
  const [{ host, registry }] = useState<{ host: LernoHost; registry: LernoRegistry }>(() =>
    createLerno({ host: options.host, extensions: options.extensions }),
  );

  const session = useMemo(() => createSession(document, { host, registry }), [document, host, registry]);
  const [state, setState] = useState<LernoSessionState>(() => session.getState());

  useEffect(() => {
    setState(session.getState());
    return session.subscribe(setState);
  }, [session]);

  const answer = useCallback((questionId: string, response: unknown) => session.answer(questionId, response), [session]);
  const setVariable = useCallback((variable: string, value: VariableValue) => session.setVariable(variable, value), [session]);
  const next = useCallback(() => session.next(), [session]);
  const back = useCallback(() => session.back(), [session]);
  const choose = useCallback((nodeId: string, choiceId: string) => session.choose(nodeId, choiceId), [session]);
  const reset = useCallback(() => session.reset(), [session]);

  return { session, state, host, registry, answer, setVariable, next, back, choose, reset };
}
