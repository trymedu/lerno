'use client';

import { createHost, type LernoHost, type LernoSessionState, type SessionStorage } from '@medu/lerno';

/** Options accepted by `BrowserHost`. */
export interface BrowserHostOptions {
  /** Key prefix; two players on one origin can be separated with it. */
  prefix?: string;
  /** Storage to use; defaults to `window.localStorage` when available. */
  storage?: Storage;
}

interface StoredSession {
  version: 1;
  session: LernoSessionState;
}

function isStoredSession(value: unknown): value is StoredSession {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  if (record.version !== 1) return false;
  const session = record.session;
  if (!session || typeof session !== 'object') return false;
  const state = session as Record<string, unknown>;
  return (
    typeof state.documentId === 'string' &&
    typeof state.cursor === 'string' &&
    Array.isArray(state.visited) &&
    typeof state.answers === 'object' &&
    typeof state.variables === 'object'
  );
}

/**
 * Host with a `localStorage` session adapter.
 *
 * The stored session is discarded when its envelope version does not match, so
 * a format change resets progress instead of restoring a corrupt cursor. Time
 * is kept under its own key because the player saves it far more often than the
 * session.
 *
 * @param options - Key prefix and storage override.
 * @returns A host with persistence; all other capabilities stay at their defaults.
 */
export function createBrowserHost(options: BrowserHostOptions = {}): LernoHost {
  const prefix = options.prefix ?? 'lerno';
  const storage = options.storage ?? (typeof window === 'undefined' ? undefined : window.localStorage);
  const sessionKey = (documentId: string): string => `${prefix}:${documentId}:session`;
  const timeKey = (documentId: string): string => `${prefix}:${documentId}:time`;

  const disk: SessionStorage = {
    load(documentId) {
      if (!storage) return undefined;
      try {
        const raw = storage.getItem(sessionKey(documentId));
        if (!raw) return undefined;
        const parsed: unknown = JSON.parse(raw);
        return isStoredSession(parsed) ? parsed.session : undefined;
      } catch {
        return undefined;
      }
    },
    save(documentId, state) {
      if (!storage) return;
      try {
        storage.setItem(sessionKey(documentId), JSON.stringify({ version: 1, session: state }));
      } catch {
        // A full or blocked storage must not break playback.
      }
    },
    clear(documentId) {
      if (!storage) return;
      try {
        storage.removeItem(sessionKey(documentId));
        storage.removeItem(timeKey(documentId));
      } catch {
        // ignore
      }
    },
    loadTime(documentId) {
      if (!storage) return undefined;
      const raw = storage.getItem(timeKey(documentId));
      const value = raw === null ? Number.NaN : Number(raw);
      return Number.isFinite(value) && value >= 0 ? value : undefined;
    },
    saveTime(documentId, timeMs) {
      if (!storage) return;
      try {
        storage.setItem(timeKey(documentId), String(Math.round(timeMs)));
      } catch {
        // ignore
      }
    },
  };

  return createHost({ storage: disk });
}
