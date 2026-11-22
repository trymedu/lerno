import type { LernoDocument } from '../content/schema';
import type { LernoSessionState } from '../runtime/session';

/**
 * Adapters the application injects into the core.
 * The core knows no concrete technology such as a database, message broker,
 * object store, xAPI, or language model; it only defines these interfaces. Every
 * default is a no-op or in-memory, so the core runs standalone.
 */

export interface TelemetryEvent {
  name: string;
  at: number;
  nodeId?: string;
  payload?: Record<string, unknown>;
}

/** Shape of `TelemetrySink`. */
export interface TelemetrySink {
  /**
   * Sends one telemetry event to every installed sink.
   * @param event - Event name, timestamp, node id, and payload.
   */
  emit(event: TelemetryEvent): void;
}

/** Shape of `SessionStorage`. */
export interface SessionStorage {
  /**
   * Reads a saved session for a document.
   * @param documentId - Document whose session is requested.
   * @returns The saved state, or undefined when nothing was stored.
   */
  load(documentId: string): LernoSessionState | undefined;
  /**
   * Stores a session for a document.
   * @param documentId - Document the session belongs to.
   * @param state - Session snapshot to persist.
   */
  save(documentId: string, state: LernoSessionState): void;
  /**
   * Deletes the saved session for a document.
   * @param documentId - Document whose session should be dropped.
   */
  clear(documentId: string): void;
  /**
   * Reads the saved playhead of a document, when the adapter keeps one.
   * @param documentId - Document whose playhead is requested.
   * @returns Time in milliseconds, or undefined when nothing was stored.
   */
  loadTime?(documentId: string): number | undefined;
  /**
   * Stores the playhead of a document.
   * @param documentId - Document the time belongs to.
   * @param timeMs - Playhead in milliseconds.
   */
  saveTime?(documentId: string, timeMs: number): void;
}

/** Shape of `MediaResolver`. */
export interface MediaResolver {
  /**
   * Maps an asset id to a playable URL.
   * @param assetId - Asset declared by the document.
   * @returns The URL, or undefined when the host does not know the asset.
   */
  resolve(assetId: string): string | undefined;
}

/** Shape of `RealtimeChannel`. */
export interface RealtimeChannel {
  /**
   * Publishes a payload on a topic.
   * @param topic - Channel name, typically the NATS subject.
   * @param payload - Data handed to subscribers unchanged.
   */
  publish(topic: string, payload: unknown): void;
  /**
   * Subscribes to a topic.
   * @param topic - Channel name to listen on.
   * @param handler - Called for every payload published on the topic.
   * @returns A function that unsubscribes the handler.
   */
  subscribe(topic: string, handler: (payload: unknown) => void): () => void;
}

/** Shape of `IdentityProvider`. */
export interface IdentityProvider {
  /**
   * Identifies the current learner for progress and telemetry.
   * @returns The identifier, or undefined in an anonymous session.
   */
  learnerId(): string | undefined;
}

/** Extension point that picks the next node when `flow.mode === 'adaptive'`. */
export type FlowResolver = (document: LernoDocument, state: LernoSessionState) => string | null;

/** Shape of `LernoHost`. */
export interface LernoHost {
  storage: SessionStorage;
  telemetry: TelemetrySink;
  media: MediaResolver;
  realtime: RealtimeChannel;
  identity?: IdentityProvider;
  flow?: FlowResolver;
  clock: () => number;
  random: () => number;
}

/**
 * Builds an in-memory storage adapter used when no persistence is configured.
 * @returns Storage that keeps sessions for the lifetime of the page.
 */
function createMemoryStorage(): SessionStorage {
  const store = new Map<string, LernoSessionState>();
  return {
    load: (documentId) => store.get(documentId),
    save: (documentId, state) => {
      store.set(documentId, state);
    },
    clear: (documentId) => {
      store.delete(documentId);
    },
  };
}

/**
 * Assembles a complete host from partial overrides.
 * Every missing capability falls back to a harmless default, so a host can be
 * built incrementally while an application wires its adapters.
 * @param partial - Overrides for any subset of host capabilities.
 * @returns A host ready for the player.
 */
export function createHost(partial: Partial<LernoHost> = {}): LernoHost {
  return {
    storage: partial.storage ?? createMemoryStorage(),
    telemetry: partial.telemetry ?? { emit: () => undefined },
    media: partial.media ?? { resolve: () => undefined },
    realtime: partial.realtime ?? { publish: () => undefined, subscribe: () => () => undefined },
    identity: partial.identity,
    flow: partial.flow,
    clock: partial.clock ?? (() => Date.now()),
    random: partial.random ?? (() => Math.random()),
  };
}
