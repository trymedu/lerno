import { LERNO_SCHEMA_VERSION } from './schema';

/**
 * One upgrade step for a stored document.
 *
 * A step runs when the document declares `from` and the runtime is newer. It
 * receives the raw object, before schema validation, so it can rename fields
 * and reshape nodes that no longer match the current schema.
 */
export interface DocumentMigration {
  /** Version the step upgrades from. */
  from: number;
  /** Returns the document in the next version's shape. */
  migrate(document: Record<string, unknown>): Record<string, unknown>;
}

/**
 * Steps registered by the core as the schema changes.
 *
 * Empty while the schema is still version 1; an app can pass its own chain to
 * {@link migrateDocument} for a private schema fork.
 */
export const documentMigrations: DocumentMigration[] = [];

/**
 * Upgrades a document to the current schema version.
 *
 * Runs the registered steps in order, stamping `schemaVersion` after each one.
 * A missing step or a document from the future throws instead of being parsed
 * into a shape it does not match.
 *
 * @param input - Raw document, usually straight from storage.
 * @param migrations - Steps to apply; defaults to the core chain.
 * @returns The document at the current version.
 * @throws RangeError When a step is missing or the version is ahead of the runtime.
 */
export function migrateDocument(input: unknown, migrations: readonly DocumentMigration[] = documentMigrations): unknown {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return input;

  const record = input as Record<string, unknown>;
  const declared = typeof record.schemaVersion === 'number' ? record.schemaVersion : LERNO_SCHEMA_VERSION;

  if (declared > LERNO_SCHEMA_VERSION) {
    throw new RangeError(`Document schema version ${declared}; this runtime supports ${LERNO_SCHEMA_VERSION}.`);
  }

  let current = record;
  let version = declared;
  while (version < LERNO_SCHEMA_VERSION) {
    const step = migrations.find((entry) => entry.from === version);
    if (!step) {
      throw new RangeError(`No migration defined for version ${version}.`);
    }
    current = { ...step.migrate(current), schemaVersion: version + 1 };
    version += 1;
  }
  return current;
}
