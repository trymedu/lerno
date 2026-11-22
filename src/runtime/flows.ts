import type { LernoDocument, LernoNode } from '../content/schema';
import type { LernoSessionState } from './session';

/**
 * Reads the next node declared by a node itself.
 * @param node - Node that may carry an explicit next link.
 * @returns The declared id, or null when the node relies on document order.
 */
export function getExplicitNext(node: LernoNode): string | null {
  switch (node.type) {
    case 'question':
    case 'media':
    case 'info':
    case 'cards':
    case 'hotspot':
      return node.next ?? null;
    default:
      return null;
  }
}

/**
 * Resolves the next node by document order.
 * @param document - Document whose order defines the path.
 * @param state - Session carrying the current cursor.
 * @returns The next node id, or null at the end of the document.
 */
export function linearFlow(document: LernoDocument, state: LernoSessionState): string | null {
  const current = document.nodes.find((node) => node.id === state.cursor);
  if (current) {
    const explicit = getExplicitNext(current);
    if (explicit) return explicit;
  }

  const index = document.nodes.findIndex((node) => node.id === state.cursor);
  if (index < 0) return null;
  return document.nodes[index + 1]?.id ?? null;
}

/**
 * Resolves the next node from the graph of explicit links.
 * @param document - Document whose nodes carry next links.
 * @param state - Session carrying the current cursor.
 * @returns The declared target, falling back to document order when absent.
 */
export function graphFlow(document: LernoDocument, state: LernoSessionState): string | null {
  const node = document.nodes.find((entry) => entry.id === state.cursor);
  if (!node) return null;
  if (node.type === 'branch') return null; // waiting for a branch choice
  return linearFlow(document, state);
}
