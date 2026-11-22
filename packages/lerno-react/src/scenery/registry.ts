import type { ReactNode } from 'react';

/**
 * Renderer for an {@link ExtensionNode}, given the raw data it carries.
 *
 * The data arrives as `unknown`, so a renderer narrows it before use.
 */
export type NodeRenderer = (data: unknown) => ReactNode;

const registry = new Map<string, NodeRenderer>();

/**
 * Registers a custom renderer for {@link ExtensionNode}.
 *
 * The registry is module-level, so a renderer installed once is available to
 * every `Display` in the application.
 *
 * @param id - Renderer id referenced by the node's `rendererId`.
 * @param renderer - Component that turns the node's data into React elements.
 * @returns A function that unregisters this renderer.
 */
export function registerNodeRenderer(id: string, renderer: NodeRenderer): () => void {
  registry.set(id, renderer);
  return () => {
    registry.delete(id);
  };
}

/**
 * Looks up a registered custom renderer.
 *
 * @param id - Renderer id referenced by a node's `rendererId`.
 * @returns The renderer, or `undefined` when nothing is registered for it.
 */
export function getNodeRenderer(id: string): NodeRenderer | undefined {
  return registry.get(id);
}

/**
 * Lists every registered custom renderer id.
 *
 * @returns Registered ids in registration order.
 */
export function listNodeRenderers(): string[] {
  return [...registry.keys()];
}
