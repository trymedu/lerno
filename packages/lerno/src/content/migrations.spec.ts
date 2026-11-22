import { migrateDocument, type DocumentMigration } from './migrations';
import { LERNO_SCHEMA_VERSION } from './schema';

const base = { id: 'doc', type: 'lesson', metadata: { title: 'Old' }, nodes: [] };

describe('migrateDocument', () => {
  it('leaves the current version unchanged', () => {
    const input = { ...base, schemaVersion: LERNO_SCHEMA_VERSION };
    expect(migrateDocument(input)).toBe(input);
  });

  it('treats a document without a version as current', () => {
    expect(migrateDocument(base)).toBe(base);
  });

  it('applies steps in order and stamps the version', () => {
    const steps: DocumentMigration[] = [{ from: 0, migrate: (doc) => ({ ...doc, renamed: true }) }];
    const result = migrateDocument({ ...base, schemaVersion: 0 }, steps) as Record<string, unknown>;

    expect(result.schemaVersion).toBe(LERNO_SCHEMA_VERSION);
    expect(result.renamed).toBe(true);
  });

  it('reports a missing step as an error', () => {
    expect(() => migrateDocument({ ...base, schemaVersion: 0 }, [])).toThrow('No migration defined for version 0');
  });

  it('rejects a future version', () => {
    expect(() => migrateDocument({ ...base, schemaVersion: LERNO_SCHEMA_VERSION + 1 })).toThrow('this runtime supports');
  });

  it('returns non-document input unchanged', () => {
    expect(migrateDocument('text')).toBe('text');
    expect(migrateDocument(null)).toBeNull();
  });
});
