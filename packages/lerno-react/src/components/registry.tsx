import type { ComponentType } from 'react';
import type { LernoDocument } from '@medu/lerno';
import type { LernoComponentMap, LernoComponentProps } from './component-types.js';
import { builtinComponents } from './ui.js';

/**
 * Application type ids → dynamic import map.
 * Data carries only types; the real module path lives here.
 */
export type LernoComponentLoader = () => Promise<{ default: ComponentType<LernoComponentProps> }>;

/** Runtime versions of the built-in set; the manifest is compared against them. */
export const builtinComponentVersions: Record<string, number> = {
  'ui.switch': 1,
  'ui.button': 1,
  'ui.select': 1,
  'ui.slider': 1,
  'lab.readout': 1,
};

/**
 * Adds application components on top of the built-in set.
 * The document carries only type ids; the real import map lives here.
 */
export function createComponentMap(overrides: LernoComponentMap = {}): LernoComponentMap {
  return { ...builtinComponents, ...overrides };
}

/**
 * Returns types declared by the document but not registered.
 * The player shows missing types in a visible card instead of crashing.
 */
export function missingComponentTypes(source: { components: readonly { type: string }[] }, components: LernoComponentMap): string[] {
  return source.components.map((entry) => entry.type).filter((type) => !components[type]);
}

/**
 * Compares the requested manifest version with the registered version.
 * Unregistered types pass silently here; `missingComponentTypes` reports them.
 * @returns A readable message per mismatch.
 */
export function componentVersionErrors(
  source: { components: readonly { type: string; version: number }[] },
  versions: Record<string, number> = builtinComponentVersions,
): string[] {
  return source.components.flatMap((entry) => {
    const registered = versions[entry.type];
    if (registered === undefined || registered === entry.version) return [];
    return [`${entry.type}@${entry.version} required, @${registered} registered`];
  });
}

/**
 * Loads only types declared by the document; each type is resolved once.
 * Unregistered types are skipped; the caller warns via `missingComponentTypes`.
 */
export async function preloadComponents(
  document: LernoDocument,
  loaders: Record<string, LernoComponentLoader>,
): Promise<LernoComponentMap> {
  const loaded: LernoComponentMap = {};
  const pending = new Map<string, Promise<{ default: ComponentType<LernoComponentProps> }>>();

  for (const entry of document.components) {
    const loader = loaders[entry.type];
    if (!loader || loaded[entry.type] || pending.has(entry.type)) continue;
    pending.set(entry.type, loader());
  }

  for (const [type, promise] of pending) {
    const module = await promise;
    loaded[type] = module.default;
  }
  return loaded;
}

