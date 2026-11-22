'use client';

import { useEffect, useRef } from 'react';
import { DragListener, type Node, type PointerInfo } from '@medu/lerno';

/** Shape of `UseDragHandlers`. */
export interface UseDragHandlers {
  start?: (pointer: PointerInfo) => void;
  drag?: (pointer: PointerInfo) => void;
  end?: (pointer: PointerInfo) => void;
}

/**
 * Attaches a DragListener to a node and removes it when the component unmounts.
 * The node opens its inputEnabled flag with the first listener and closes it with
 * the last one.
 */
export function useDrag(node: Node, handlers: UseDragHandlers): void {
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    const listener = new DragListener({
      start: (pointer) => ref.current.start?.(pointer),
      drag: (pointer) => ref.current.drag?.(pointer),
      end: (pointer) => ref.current.end?.(pointer),
    });
    node.addInputListener(listener);
    return () => {
      node.removeInputListener(listener);
    };
  }, [node]);
}
