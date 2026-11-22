import type { InteractionLayer, LernoDocument, VariableValue } from '../content/schema';
import type { LernoSession, LernoSessionState } from './session';

/** Variable name → value; layer resolution reads this map. */
export type VariableMap = Record<string, VariableValue>;

/** A layer resolved at the playhead. */
export interface ResolvedLayer {
  layer: InteractionLayer;
  /** Props with `$var` references resolved to variable values. */
  props: Record<string, unknown>;
  /** Current value of `bind.value`, when bound. */
  value?: VariableValue;
}

/**
 * Framework-agnostic interaction runtime.
 * Video time, layer visibility, and variable bindings are resolved here; React,
 * vanilla DOM or canvas only renders the `layersAt` output.
 */
export interface InteractionRuntime {
  /** Session behind the runtime; variables and state live here. */
  readonly session: LernoSession;
  /**
   * Visible layers of a media node at the given playhead time.
   * @param nodeId - Media node id'si.
   * @param currentMs - Video time in milliseconds.
   */
  layersAt(nodeId: string, currentMs: number): ResolvedLayer[];
  /** Writes the bound variable; no-op when unbound. */
  change(layer: InteractionLayer, value: VariableValue): void;
  /** Listens for session changes. */
  subscribe(listener: (state: LernoSessionState) => void): () => void;
}

/**
 * Replaces `{ $var: "id" }` references with variable values.
 * Unresolved references return `undefined`; the layer draws it as empty.
 */
export function resolveLayerProps(value: unknown, variables: VariableMap): unknown {
  if (Array.isArray(value)) return value.map((entry) => resolveLayerProps(entry, variables));
  if (!value || typeof value !== 'object') return value;

  const record = value as Record<string, unknown>;
  const reference = record.$var;
  if (typeof reference === 'string') return variables[reference];

  const resolved: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(record)) {
    resolved[key] = resolveLayerProps(entry, variables);
  }
  return resolved;
}

/** Is a layer visible at the playhead? */
export function isLayerActive(layer: InteractionLayer, currentMs: number, variables: VariableMap): boolean {
  if (currentMs < layer.fromMs) return false;
  if (layer.toMs !== undefined && currentMs >= layer.toMs) return false;
  if (layer.visibleWhen && variables[layer.visibleWhen.variable] !== layer.visibleWhen.equals) return false;
  return true;
}

/** Returns visible layers at the playhead, preserving document order. */
export function activeLayers(
  layers: readonly InteractionLayer[],
  currentMs: number,
  variables: VariableMap,
): InteractionLayer[] {
  return layers.filter((layer) => isLayerActive(layer, currentMs, variables));
}

/**
 * Opacity of a layer at the playhead, including its fade window.
 *
 * The fade lives inside the layer's own range, so a layer is fully visible
 * before it starts leaving at `toMs - fadeMs`.
 *
 * @param layer - Layer with an optional `fadeMs`.
 * @param currentMs - Video or stage time in milliseconds.
 * @returns A value from 0 to 1.
 */
export function layerOpacity(layer: InteractionLayer, currentMs: number): number {
  if (layer.fadeMs <= 0) return 1;
  const entering = (currentMs - layer.fromMs) / layer.fadeMs;
  const leaving = layer.toMs === undefined ? 1 : (layer.toMs - currentMs) / layer.fadeMs;
  return Math.max(0, Math.min(1, entering, leaving));
}

/**
 * Creates an interaction runtime from a document and session.
 * No React required: draw the `layersAt` output with your own DOM.
 */
export function createInteractionRuntime(document: LernoDocument, session: LernoSession): InteractionRuntime {
  function layersAt(nodeId: string, currentMs: number): ResolvedLayer[] {
    const node = document.nodes.find((entry) => entry.id === nodeId);
    if (!node || node.type !== 'media') return [];

    const variables = session.getState().variables;
    return activeLayers(node.layers, currentMs, variables).map((layer) => ({
      layer,
      props: resolveLayerProps(layer.props, variables) as Record<string, unknown>,
      value: layer.bind.value ? variables[layer.bind.value] : undefined,
    }));
  }

  return {
    session,
    layersAt,
    change(layer, value) {
      if (!layer.bind.value) return;
      session.setVariable(layer.bind.value, value);
    },
    subscribe: (listener) => session.subscribe(listener),
  };
}
